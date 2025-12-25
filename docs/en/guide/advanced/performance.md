# Performance Optimization Guide

## Overview

This guide covers how to optimize the performance of Electron applications built with `electron-infra-kit`. We'll cover performance optimization techniques for window management, IPC communication, and message bus to help you build fast, responsive applications.

## Window Management Performance

### 1. Lazy Load Windows

Avoid creating all windows at application startup; create them only when needed:

```typescript
import { WindowManager } from 'electron-infra-kit';

class AppWindowManager {
  private windowManager: WindowManager;
  private settingsWindow?: BrowserWindow;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  // ✅ Good practice - lazy creation
  async showSettings(): Promise<void> {
    if (!this.settingsWindow || this.settingsWindow.isDestroyed()) {
      this.settingsWindow = await this.windowManager.create({
        name: 'settings',
        width: 600,
        height: 400,
        show: false, // Don't show yet, wait for content to load
      });

      // Show after content is loaded
      this.settingsWindow.once('ready-to-show', () => {
        this.settingsWindow?.show();
      });
    } else {
      this.settingsWindow.show();
      this.settingsWindow.focus();
    }
  }
}
```

### 2. Reuse Window Instances

For frequently opened and closed windows, consider hiding instead of destroying:

```typescript
class WindowPool {
  private windows = new Map<string, BrowserWindow>();

  async getOrCreate(
    name: string,
    config: WindowConfig
  ): Promise<BrowserWindow> {
    let window = this.windows.get(name);

    if (!window || window.isDestroyed()) {
      window = await windowManager.create(config);
      this.windows.set(name, window);

      // Hide instead of destroy on close
      window.on('close', (e) => {
        if (!app.isQuitting) {
          e.preventDefault();
          window?.hide();
        }
      });
    }

    return window;
  }

  show(name: string): void {
    const window = this.windows.get(name);
    if (window && !window.isDestroyed()) {
      window.show();
      window.focus();
    }
  }

  hide(name: string): void {
    const window = this.windows.get(name);
    if (window && !window.isDestroyed()) {
      window.hide();
    }
  }

  // Actually destroy window
  destroy(name: string): void {
    const window = this.windows.get(name);
    if (window && !window.isDestroyed()) {
      window.destroy();
    }
    this.windows.delete(name);
  }
}
```

### 3. Optimize Window Configuration

Use appropriate window configuration options to improve performance:

```typescript
const optimizedConfig: WindowConfig = {
  name: 'main',
  width: 1024,
  height: 768,
  show: false, // Wait for ready-to-show event
  webPreferences: {
    // Enable hardware acceleration
    enableWebGL: true,
    
    // Disable unnecessary features
    nodeIntegration: false,
    contextIsolation: true,
    
    // Use preload script instead of remote module
    preload: path.join(__dirname, 'preload.js'),
    
    // Enable background throttling
    backgroundThrottling: true,
  },
};

const window = await windowManager.create(optimizedConfig);

// Show after content is loaded
window.once('ready-to-show', () => {
  window.show();
});
```

### 4. Batch Window Operations

When operating on multiple windows, use batch operations:

```typescript
class BatchWindowOperations {
  // ❌ Bad practice - operate one by one
  async closeAllWindowsSlowly(): Promise<void> {
    const windows = windowManager.getAllWindows();
    for (const window of windows) {
      await windowManager.close(window.id);
    }
  }

  // ✅ Good practice - parallel operations
  async closeAllWindowsFast(): Promise<void> {
    const windows = windowManager.getAllWindows();
    await Promise.all(
      windows.map((window) => windowManager.close(window.id))
    );
  }

  // Batch update window states
  async minimizeAll(): Promise<void> {
    const windows = windowManager.getAllWindows();
    windows.forEach((window) => {
      if (!window.isMinimized()) {
        window.minimize();
      }
    });
  }
}
```

### 5. Memory Management

Clean up unused window resources promptly:

```typescript
class WindowLifecycleManager {
  private windows = new Map<string, BrowserWindow>();
  private timers = new Map<string, NodeJS.Timeout>();

  async create(name: string, config: WindowConfig): Promise<BrowserWindow> {
    const window = await windowManager.create(config);
    this.windows.set(name, window);

    // Set up auto-cleanup timer
    window.on('hide', () => {
      this.scheduleCleanup(name);
    });

    window.on('show', () => {
      this.cancelCleanup(name);
    });

    window.on('closed', () => {
      this.cleanup(name);
    });

    return window;
  }

  private scheduleCleanup(name: string): void {
    // Auto cleanup after window is hidden for 5 minutes
    const timer = setTimeout(() => {
      const window = this.windows.get(name);
      if (window && !window.isDestroyed() && !window.isVisible()) {
        window.destroy();
      }
    }, 5 * 60 * 1000);

    this.timers.set(name, timer);
  }

  private cancelCleanup(name: string): void {
    const timer = this.timers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(name);
    }
  }

  private cleanup(name: string): void {
    this.cancelCleanup(name);
    this.windows.delete(name);
  }
}
```

## IPC Communication Performance

### 1. Reduce IPC Call Frequency

Use debouncing and throttling to reduce frequent IPC calls:

```typescript
// Renderer process
class OptimizedIpcClient {
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  // Debounce - delay execution, only execute the last call
  debounce<T>(
    key: string,
    fn: () => Promise<T>,
    delay: number = 300
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.debounceTimers.delete(key);
        }
      }, delay);

      this.debounceTimers.set(key, timer);
    });
  }

  // Usage example
  async saveSettings(settings: Settings): Promise<void> {
    return this.debounce(
      'save-settings',
      () => window.electronAPI.saveSettings(settings),
      500
    );
  }
}

// Throttle - limit execution frequency
class ThrottledIpcClient {
  private lastCall = new Map<string, number>();
  private throttleDelay = 1000; // 1 second

  async throttle<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
    const now = Date.now();
    const last = this.lastCall.get(key) || 0;

    if (now - last < this.throttleDelay) {
      return null; // Skip this call
    }

    this.lastCall.set(key, now);
    return await fn();
  }

  // Usage example
  async updateProgress(progress: number): Promise<void> {
    await this.throttle('update-progress', () =>
      window.electronAPI.updateProgress(progress)
    );
  }
}
```

### 2. Batch Process Data

Combine multiple small IPC calls into one large call:

```typescript
// Main process
const batchUpdateHandler = new IpcHandler(
  'batchUpdate',
  'data',
  async (context, payload: { operations: Operation[] }) => {
    // Batch process all operations
    const results = await Promise.all(
      payload.operations.map((op) => processOperation(op))
    );
    return results;
  },
  z.object({
    operations: z.array(
      z.object({
        type: z.string(),
        data: z.any(),
      })
    ),
  })
);

// Renderer process
class BatchIpcClient {
  private queue: Operation[] = [];
  private flushTimer?: NodeJS.Timeout;

  addOperation(operation: Operation): void {
    this.queue.push(operation);

    // Delay batch send
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => this.flush(), 100);
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const operations = [...this.queue];
    this.queue = [];

    try {
      await window.electronAPI.batchUpdate({ operations });
    } catch (error) {
      console.error('Batch update failed:', error);
      // Can choose to retry or log failed operations
    }
  }

  // Manual flush
  async flushNow(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    await this.flush();
  }
}
```

### 3. Use Streaming for Large Data

For large amounts of data, use streaming instead of one-time transfer:

```typescript
// Main process
import { Readable } from 'stream';

const streamDataHandler = new IpcHandler(
  'streamData',
  'data',
  async (context, payload: { query: string }) => {
    const stream = context.db.queryStream(payload.query);
    const chunks: any[] = [];

    // Send data in chunks
    for await (const chunk of stream) {
      chunks.push(chunk);

      // Send every 100 records
      if (chunks.length >= 100) {
        context.window.webContents.send('data-chunk', chunks);
        chunks.length = 0;
      }
    }

    // Send remaining data
    if (chunks.length > 0) {
      context.window.webContents.send('data-chunk', chunks);
    }

    // Send completion signal
    context.window.webContents.send('data-complete');
  },
  z.object({ query: z.string() })
);

// Renderer process
class StreamDataClient {
  async loadData(query: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const allData: any[] = [];

      // Listen for data chunks
      const handleChunk = (chunk: any[]) => {
        allData.push(...chunk);
        // Can update UI here
        this.updateUI(allData.length);
      };

      // Listen for completion
      const handleComplete = () => {
        cleanup();
        resolve(allData);
      };

      // Listen for errors
      const handleError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        window.electronAPI.off('data-chunk', handleChunk);
        window.electronAPI.off('data-complete', handleComplete);
        window.electronAPI.off('data-error', handleError);
      };

      window.electronAPI.on('data-chunk', handleChunk);
      window.electronAPI.on('data-complete', handleComplete);
      window.electronAPI.on('data-error', handleError);

      // Start loading
      window.electronAPI.streamData({ query });
    });
  }

  private updateUI(count: number): void {
    // Update progress display
    console.log(`Loaded ${count} records`);
  }
}
```

### 4. Cache IPC Results

For data that doesn't change frequently, use caching to reduce IPC calls:

```typescript
class CachedIpcClient {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    duration?: number
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Check if cache is valid
    if (cached && now - cached.timestamp < (duration || this.cacheDuration)) {
      return cached.data as T;
    }

    // Fetch new data
    const data = await fetcher();

    // Update cache
    this.cache.set(key, { data, timestamp: now });

    return data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  // Usage example
  async getUserSettings(): Promise<Settings> {
    return this.get(
      'user-settings',
      () => window.electronAPI.getSettings(),
      10 * 60 * 1000 // 10 minute cache
    );
  }
}
```

### 5. Async Processing and Parallel Requests

Fully utilize async features and process multiple requests in parallel:

```typescript
class ParallelIpcClient {
  // ❌ Bad practice - serial requests
  async loadDataSlowly(): Promise<void> {
    const user = await window.electronAPI.getUser();
    const settings = await window.electronAPI.getSettings();
    const projects = await window.electronAPI.getProjects();

    this.render({ user, settings, projects });
  }

  // ✅ Good practice - parallel requests
  async loadDataFast(): Promise<void> {
    const [user, settings, projects] = await Promise.all([
      window.electronAPI.getUser(),
      window.electronAPI.getSettings(),
      window.electronAPI.getProjects(),
    ]);

    this.render({ user, settings, projects });
  }

  // Handle partial failures
  async loadDataWithFallback(): Promise<void> {
    const results = await Promise.allSettled([
      window.electronAPI.getUser(),
      window.electronAPI.getSettings(),
      window.electronAPI.getProjects(),
    ]);

    const [userResult, settingsResult, projectsResult] = results;

    const data = {
      user: userResult.status === 'fulfilled' ? userResult.value : null,
      settings:
        settingsResult.status === 'fulfilled'
          ? settingsResult.value
          : this.getDefaultSettings(),
      projects:
        projectsResult.status === 'fulfilled' ? projectsResult.value : [],
    };

    this.render(data);
  }

  private render(data: any): void {
    // Render data
  }

  private getDefaultSettings(): Settings {
    return { theme: 'light', language: 'en' };
  }
}
```

## MessageBus Performance

### 1. Reduce Unnecessary Subscriptions

Only subscribe to data changes you actually need:

```typescript
class OptimizedMessageBusClient {
  private unsubscribers: (() => void)[] = [];

  subscribeToTheme(callback: (theme: string) => void): void {
    const unsubscribe = messageBus.watch('theme', callback);
    this.unsubscribers.push(unsubscribe);
  }

  // Unsubscribe on component unmount
  cleanup(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }

  // ✅ Good practice - conditional subscription
  subscribeConditionally(condition: boolean): void {
    if (condition) {
      const unsubscribe = messageBus.watch('data', (data) => {
        this.handleData(data);
      });
      this.unsubscribers.push(unsubscribe);
    }
  }

  private handleData(data: any): void {
    // Handle data
  }
}
```

### 2. Batch Update Data

Combine multiple data updates into one operation:

```typescript
class BatchMessageBusUpdater {
  private pendingUpdates = new Map<string, any>();
  private flushTimer?: NodeJS.Timeout;

  // Queue data to update
  queueUpdate(key: string, value: any): void {
    this.pendingUpdates.set(key, value);

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // Delay batch update
    this.flushTimer = setTimeout(() => this.flush(), 50);
  }

  private flush(): void {
    if (this.pendingUpdates.size === 0) return;

    // Batch update all data
    for (const [key, value] of this.pendingUpdates) {
      messageBus.setData(key, value);
    }

    this.pendingUpdates.clear();
  }

  // Flush immediately
  flushNow(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    this.flush();
  }
}
```

### 3. Use Selectors to Reduce Re-renders

Only trigger updates when data you care about actually changes:

```typescript
class SelectiveMessageBusClient {
  private lastValue: any = null;

  // Use selector function
  watchWithSelector<T, R>(
    key: string,
    selector: (value: T) => R,
    callback: (selected: R) => void
  ): () => void {
    return messageBus.watch(key, (value: T) => {
      const selected = selector(value);

      // Only call callback when selected value changes
      if (!this.isEqual(selected, this.lastValue)) {
        this.lastValue = selected;
        callback(selected);
      }
    });
  }

  private isEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  // Usage example
  subscribeToUserName(callback: (name: string) => void): () => void {
    return this.watchWithSelector(
      'user',
      (user: User) => user.name, // Only care about name field
      callback
    );
  }
}
```

### 4. Lazy Initialization

Only initialize MessageBus subscriptions when needed:

```typescript
class LazyMessageBusClient {
  private initialized = false;
  private subscriptions: (() => void)[] = [];

  // Lazy initialization
  init(): void {
    if (this.initialized) return;

    this.subscriptions.push(
      messageBus.watch('theme', (theme) => this.handleTheme(theme)),
      messageBus.watch('language', (lang) => this.handleLanguage(lang))
    );

    this.initialized = true;
  }

  cleanup(): void {
    if (!this.initialized) return;

    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions = [];
    this.initialized = false;
  }

  private handleTheme(theme: string): void {
    // Handle theme change
  }

  private handleLanguage(lang: string): void {
    // Handle language change
  }
}
```

### 5. Data Sharding

For large data structures, use sharded storage and subscriptions:

```typescript
class ShardedMessageBus {
  // ❌ Bad practice - store entire large object
  updateUserBadly(user: LargeUser): void {
    messageBus.setData('user', user); // Transfer entire object every time
  }

  // ✅ Good practice - sharded storage
  updateUserWell(user: LargeUser): void {
    messageBus.setData('user:id', user.id);
    messageBus.setData('user:name', user.name);
    messageBus.setData('user:email', user.email);
    messageBus.setData('user:preferences', user.preferences);
  }

  // Subscribe only to needed shards
  watchUserName(callback: (name: string) => void): () => void {
    return messageBus.watch('user:name', callback);
  }

  watchUserPreferences(
    callback: (prefs: Preferences) => void
  ): () => void {
    return messageBus.watch('user:preferences', callback);
  }
}
```

## Performance Monitoring

### 1. Measure IPC Call Performance

```typescript
class IpcPerformanceMonitor {
  private metrics = new Map<string, number[]>();

  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - start;

      this.recordMetric(name, duration);

      if (duration > 1000) {
        console.warn(`Slow IPC call: ${name} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      throw error;
    }
  }

  private recordMetric(name: string, duration: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);
  }

  getStats(name: string): { avg: number; min: number; max: number } | null {
    const durations = this.metrics.get(name);
    if (!durations || durations.length === 0) return null;

    return {
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
    };
  }

  printStats(): void {
    console.table(
      Array.from(this.metrics.entries()).map(([name, durations]) => ({
        name,
        calls: durations.length,
        avg: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(
          2
        ),
        min: Math.min(...durations).toFixed(2),
        max: Math.max(...durations).toFixed(2),
      }))
    );
  }
}

// Usage example
const monitor = new IpcPerformanceMonitor();

const user = await monitor.measure('getUser', () =>
  window.electronAPI.getUser()
);
```

### 2. Memory Usage Monitoring

```typescript
class MemoryMonitor {
  startMonitoring(interval: number = 5000): NodeJS.Timeout {
    return setInterval(() => {
      if (process.memoryUsage) {
        const usage = process.memoryUsage();
        console.log('Memory usage:', {
          rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
        });

        // Warn on high memory usage
        if (usage.heapUsed > 500 * 1024 * 1024) {
          console.warn('Warning: Heap memory usage exceeds 500MB');
        }
      }
    }, interval);
  }

  // Manually trigger garbage collection (requires --expose-gc flag)
  forceGC(): void {
    if (global.gc) {
      console.log('Triggering garbage collection...');
      global.gc();
    } else {
      console.warn('Garbage collection not available. Start app with --expose-gc flag.');
    }
  }
}
```

## Performance Optimization Checklist

### Window Management
- [ ] Use lazy loading, create windows only when needed
- [ ] Reuse window instances, hide instead of destroy
- [ ] Use `show: false` and `ready-to-show` event
- [ ] Enable background throttling (`backgroundThrottling: true`)
- [ ] Clean up unused windows promptly

### IPC Communication
- [ ] Use debouncing and throttling to reduce call frequency
- [ ] Batch process multiple operations
- [ ] Use streaming for large data
- [ ] Cache infrequently changing data
- [ ] Process multiple requests in parallel

### MessageBus
- [ ] Only subscribe to data you actually need
- [ ] Unsubscribe on component unmount
- [ ] Batch update data
- [ ] Use selectors to reduce re-renders
- [ ] Use sharded storage for large objects

### Monitoring
- [ ] Measure performance of critical operations
- [ ] Monitor memory usage
- [ ] Log slow operations
- [ ] Review performance metrics regularly

## Next Steps

- Check out [Error Handling Guide](./error-handling.md) for error handling best practices
- Check out [Debugging Guide](./debugging.md) for debugging techniques
- Check out [Type Safety Guide](./type-safety.md) for type safety practices
