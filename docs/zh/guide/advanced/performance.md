# 性能优化指南

## 概述

本指南介绍如何优化使用 `electron-infra-kit` 构建的 Electron 应用的性能。我们将涵盖窗口管理、IPC 通信和消息总线的性能优化技巧，帮助你构建快速、响应迅速的应用。

## 窗口管理性能优化

### 1. 延迟加载窗口

避免在应用启动时创建所有窗口，而是在需要时才创建：

```typescript
import { WindowManager } from 'electron-infra-kit';

class AppWindowManager {
  private windowManager: WindowManager;
  private settingsWindow?: BrowserWindow;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  // ✅ 好的做法 - 延迟创建
  async showSettings(): Promise<void> {
    if (!this.settingsWindow || this.settingsWindow.isDestroyed()) {
      this.settingsWindow = await this.windowManager.create({
        name: 'settings',
        width: 600,
        height: 400,
        show: false, // 先不显示，等加载完成
      });

      // 等待内容加载完成再显示
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

### 2. 复用窗口实例

对于频繁打开和关闭的窗口，考虑隐藏而不是销毁：

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

      // 关闭时隐藏而不是销毁
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

  // 真正销毁窗口
  destroy(name: string): void {
    const window = this.windows.get(name);
    if (window && !window.isDestroyed()) {
      window.destroy();
    }
    this.windows.delete(name);
  }
}
```

### 3. 优化窗口配置

使用合适的窗口配置选项来提升性能：

```typescript
const optimizedConfig: WindowConfig = {
  name: 'main',
  width: 1024,
  height: 768,
  show: false, // 等待 ready-to-show 事件
  webPreferences: {
    // 启用硬件加速
    enableWebGL: true,
    
    // 禁用不需要的功能
    nodeIntegration: false,
    contextIsolation: true,
    
    // 使用预加载脚本而不是 remote 模块
    preload: path.join(__dirname, 'preload.js'),
    
    // 启用背景节流
    backgroundThrottling: true,
  },
};

const window = await windowManager.create(optimizedConfig);

// 等待内容加载完成再显示
window.once('ready-to-show', () => {
  window.show();
});
```

### 4. 批量窗口操作

当需要操作多个窗口时，使用批量操作：

```typescript
class BatchWindowOperations {
  // ❌ 不好的做法 - 逐个操作
  async closeAllWindowsSlowly(): Promise<void> {
    const windows = windowManager.getAllWindows();
    for (const window of windows) {
      await windowManager.close(window.id);
    }
  }

  // ✅ 好的做法 - 并行操作
  async closeAllWindowsFast(): Promise<void> {
    const windows = windowManager.getAllWindows();
    await Promise.all(
      windows.map((window) => windowManager.close(window.id))
    );
  }

  // 批量更新窗口状态
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

### 5. 内存管理

及时清理不再使用的窗口资源：

```typescript
class WindowLifecycleManager {
  private windows = new Map<string, BrowserWindow>();
  private timers = new Map<string, NodeJS.Timeout>();

  async create(name: string, config: WindowConfig): Promise<BrowserWindow> {
    const window = await windowManager.create(config);
    this.windows.set(name, window);

    // 设置自动清理定时器
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
    // 窗口隐藏 5 分钟后自动清理
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

## IPC 通信性能优化

### 1. 减少 IPC 调用频率

使用防抖和节流来减少频繁的 IPC 调用：

```typescript
// 渲染进程
class OptimizedIpcClient {
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  // 防抖 - 延迟执行，只执行最后一次
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

  // 使用示例
  async saveSettings(settings: Settings): Promise<void> {
    return this.debounce(
      'save-settings',
      () => window.electronAPI.saveSettings(settings),
      500
    );
  }
}

// 节流 - 限制执行频率
class ThrottledIpcClient {
  private lastCall = new Map<string, number>();
  private throttleDelay = 1000; // 1 秒

  async throttle<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
    const now = Date.now();
    const last = this.lastCall.get(key) || 0;

    if (now - last < this.throttleDelay) {
      return null; // 跳过此次调用
    }

    this.lastCall.set(key, now);
    return await fn();
  }

  // 使用示例
  async updateProgress(progress: number): Promise<void> {
    await this.throttle('update-progress', () =>
      window.electronAPI.updateProgress(progress)
    );
  }
}
```

### 2. 批量处理数据

将多个小的 IPC 调用合并为一个大的调用：

```typescript
// 主进程
const batchUpdateHandler = new IpcHandler(
  'batchUpdate',
  'data',
  async (context, payload: { operations: Operation[] }) => {
    // 批量处理所有操作
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

// 渲染进程
class BatchIpcClient {
  private queue: Operation[] = [];
  private flushTimer?: NodeJS.Timeout;

  addOperation(operation: Operation): void {
    this.queue.push(operation);

    // 延迟批量发送
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
      // 可以选择重试或记录失败的操作
    }
  }

  // 手动刷新
  async flushNow(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    await this.flush();
  }
}
```

### 3. 使用流式传输处理大数据

对于大量数据，使用流式传输而不是一次性传输：

```typescript
// 主进程
import { Readable } from 'stream';

const streamDataHandler = new IpcHandler(
  'streamData',
  'data',
  async (context, payload: { query: string }) => {
    const stream = context.db.queryStream(payload.query);
    const chunks: any[] = [];

    // 分块发送数据
    for await (const chunk of stream) {
      chunks.push(chunk);

      // 每 100 条记录发送一次
      if (chunks.length >= 100) {
        context.window.webContents.send('data-chunk', chunks);
        chunks.length = 0;
      }
    }

    // 发送剩余数据
    if (chunks.length > 0) {
      context.window.webContents.send('data-chunk', chunks);
    }

    // 发送完成信号
    context.window.webContents.send('data-complete');
  },
  z.object({ query: z.string() })
);

// 渲染进程
class StreamDataClient {
  async loadData(query: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const allData: any[] = [];

      // 监听数据块
      const handleChunk = (chunk: any[]) => {
        allData.push(...chunk);
        // 可以在这里更新 UI
        this.updateUI(allData.length);
      };

      // 监听完成
      const handleComplete = () => {
        cleanup();
        resolve(allData);
      };

      // 监听错误
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

      // 开始加载
      window.electronAPI.streamData({ query });
    });
  }

  private updateUI(count: number): void {
    // 更新进度显示
    console.log(`已加载 ${count} 条记录`);
  }
}
```

### 4. 缓存 IPC 结果

对于不经常变化的数据，使用缓存减少 IPC 调用：

```typescript
class CachedIpcClient {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheDuration = 5 * 60 * 1000; // 5 分钟

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    duration?: number
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    // 检查缓存是否有效
    if (cached && now - cached.timestamp < (duration || this.cacheDuration)) {
      return cached.data as T;
    }

    // 获取新数据
    const data = await fetcher();

    // 更新缓存
    this.cache.set(key, { data, timestamp: now });

    return data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  // 使用示例
  async getUserSettings(): Promise<Settings> {
    return this.get(
      'user-settings',
      () => window.electronAPI.getSettings(),
      10 * 60 * 1000 // 10 分钟缓存
    );
  }
}
```

### 5. 异步处理和并行请求

充分利用异步特性，并行处理多个请求：

```typescript
class ParallelIpcClient {
  // ❌ 不好的做法 - 串行请求
  async loadDataSlowly(): Promise<void> {
    const user = await window.electronAPI.getUser();
    const settings = await window.electronAPI.getSettings();
    const projects = await window.electronAPI.getProjects();

    this.render({ user, settings, projects });
  }

  // ✅ 好的做法 - 并行请求
  async loadDataFast(): Promise<void> {
    const [user, settings, projects] = await Promise.all([
      window.electronAPI.getUser(),
      window.electronAPI.getSettings(),
      window.electronAPI.getProjects(),
    ]);

    this.render({ user, settings, projects });
  }

  // 处理部分失败
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
    // 渲染数据
  }

  private getDefaultSettings(): Settings {
    return { theme: 'light', language: 'en' };
  }
}
```

## MessageBus 性能优化

### 1. 减少不必要的订阅

只订阅真正需要的数据变化：

```typescript
class OptimizedMessageBusClient {
  private unsubscribers: (() => void)[] = [];

  subscribeToTheme(callback: (theme: string) => void): void {
    const unsubscribe = messageBus.watch('theme', callback);
    this.unsubscribers.push(unsubscribe);
  }

  // 组件卸载时取消订阅
  cleanup(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }

  // ✅ 好的做法 - 使用条件订阅
  subscribeConditionally(condition: boolean): void {
    if (condition) {
      const unsubscribe = messageBus.watch('data', (data) => {
        this.handleData(data);
      });
      this.unsubscribers.push(unsubscribe);
    }
  }

  private handleData(data: any): void {
    // 处理数据
  }
}
```

### 2. 批量更新数据

将多个数据更新合并为一次操作：

```typescript
class BatchMessageBusUpdater {
  private pendingUpdates = new Map<string, any>();
  private flushTimer?: NodeJS.Timeout;

  // 添加待更新的数据
  queueUpdate(key: string, value: any): void {
    this.pendingUpdates.set(key, value);

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // 延迟批量更新
    this.flushTimer = setTimeout(() => this.flush(), 50);
  }

  private flush(): void {
    if (this.pendingUpdates.size === 0) return;

    // 批量更新所有数据
    for (const [key, value] of this.pendingUpdates) {
      messageBus.setData(key, value);
    }

    this.pendingUpdates.clear();
  }

  // 立即刷新
  flushNow(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    this.flush();
  }
}
```

### 3. 使用选择器减少重渲染

只在真正需要的数据变化时才触发更新：

```typescript
class SelectiveMessageBusClient {
  private lastValue: any = null;

  // 使用选择器函数
  watchWithSelector<T, R>(
    key: string,
    selector: (value: T) => R,
    callback: (selected: R) => void
  ): () => void {
    return messageBus.watch(key, (value: T) => {
      const selected = selector(value);

      // 只在选择的值变化时才调用回调
      if (!this.isEqual(selected, this.lastValue)) {
        this.lastValue = selected;
        callback(selected);
      }
    });
  }

  private isEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  // 使用示例
  subscribeToUserName(callback: (name: string) => void): () => void {
    return this.watchWithSelector(
      'user',
      (user: User) => user.name, // 只关注 name 字段
      callback
    );
  }
}
```

### 4. 延迟初始化

只在需要时才初始化 MessageBus 订阅：

```typescript
class LazyMessageBusClient {
  private initialized = false;
  private subscriptions: (() => void)[] = [];

  // 延迟初始化
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
    // 处理主题变化
  }

  private handleLanguage(lang: string): void {
    // 处理语言变化
  }
}
```

### 5. 数据分片

对于大型数据结构，使用分片存储和订阅：

```typescript
class ShardedMessageBus {
  // ❌ 不好的做法 - 存储整个大对象
  updateUserBadly(user: LargeUser): void {
    messageBus.setData('user', user); // 每次都传输整个对象
  }

  // ✅ 好的做法 - 分片存储
  updateUserWell(user: LargeUser): void {
    messageBus.setData('user:id', user.id);
    messageBus.setData('user:name', user.name);
    messageBus.setData('user:email', user.email);
    messageBus.setData('user:preferences', user.preferences);
  }

  // 只订阅需要的分片
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

## 性能监控

### 1. 测量 IPC 调用性能

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
        console.warn(`慢速 IPC 调用: ${name} 耗时 ${duration.toFixed(2)}ms`);
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

// 使用示例
const monitor = new IpcPerformanceMonitor();

const user = await monitor.measure('getUser', () =>
  window.electronAPI.getUser()
);
```

### 2. 内存使用监控

```typescript
class MemoryMonitor {
  startMonitoring(interval: number = 5000): NodeJS.Timeout {
    return setInterval(() => {
      if (process.memoryUsage) {
        const usage = process.memoryUsage();
        console.log('内存使用:', {
          rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
        });

        // 警告高内存使用
        if (usage.heapUsed > 500 * 1024 * 1024) {
          console.warn('警告: 堆内存使用超过 500MB');
        }
      }
    }, interval);
  }

  // 手动触发垃圾回收（需要 --expose-gc 标志）
  forceGC(): void {
    if (global.gc) {
      console.log('触发垃圾回收...');
      global.gc();
    } else {
      console.warn('垃圾回收不可用。使用 --expose-gc 标志启动应用。');
    }
  }
}
```

## 性能优化清单

### 窗口管理
- [ ] 使用延迟加载，只在需要时创建窗口
- [ ] 复用窗口实例，隐藏而不是销毁
- [ ] 使用 `show: false` 和 `ready-to-show` 事件
- [ ] 启用背景节流 (`backgroundThrottling: true`)
- [ ] 及时清理不再使用的窗口

### IPC 通信
- [ ] 使用防抖和节流减少调用频率
- [ ] 批量处理多个操作
- [ ] 对大数据使用流式传输
- [ ] 缓存不经常变化的数据
- [ ] 并行处理多个请求

### MessageBus
- [ ] 只订阅真正需要的数据
- [ ] 组件卸载时取消订阅
- [ ] 批量更新数据
- [ ] 使用选择器减少重渲染
- [ ] 对大对象使用分片存储

### 监控
- [ ] 测量关键操作的性能
- [ ] 监控内存使用
- [ ] 记录慢速操作
- [ ] 定期审查性能指标

## 下一步

- 查看 [错误处理指南](./error-handling.md) 了解错误处理最佳实践
- 查看 [调试技巧指南](./debugging.md) 了解调试方法
- 查看 [类型安全指南](./type-safety.md) 了解类型安全实践
