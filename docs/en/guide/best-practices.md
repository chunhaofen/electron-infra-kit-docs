# Best Practices

## Overview

This guide summarizes best practices for developing Electron applications with `electron-infra-kit`. These practices cover window management, IPC communication, state management, error handling, and debugging, helping you build high-quality, maintainable applications.

## Window Management Best Practices

### 1. Properly Organize Window Lifecycle

**✅ Recommended Approach**

```typescript
import { WindowManager } from 'electron-infra-kit';

class AppWindowManager {
  private windowManager: WindowManager;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  async createMainWindow(): Promise<BrowserWindow> {
    const window = await this.windowManager.create({
      name: 'main',
      width: 1200,
      height: 800,
      show: false, // Wait for content to load
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    // Show window after content is loaded
    window.once('ready-to-show', () => {
      window.show();
    });

    // Handle window close
    window.on('close', (e) => {
      if (!this.canClose()) {
        e.preventDefault();
        this.confirmClose(window);
      }
    });

    return window;
  }

  private canClose(): boolean {
    // Check for unsaved changes
    return !this.hasUnsavedChanges();
  }

  private async confirmClose(window: BrowserWindow): Promise<void> {
    const { response } = await dialog.showMessageBox(window, {
      type: 'question',
      buttons: ['Cancel', 'Don\'t Save', 'Save'],
      defaultId: 2,
      message: 'Do you want to save changes?',
    });

    if (response === 1) {
      window.destroy();
    } else if (response === 2) {
      await this.saveChanges();
      window.destroy();
    }
  }

  private hasUnsavedChanges(): boolean {
    // Implement check logic
    return false;
  }

  private async saveChanges(): Promise<void> {
    // Implement save logic
  }
}
```

**❌ Not Recommended**

```typescript
// Don't show window immediately, may cause white flash
const window = await windowManager.create({
  name: 'main',
  show: true, // ❌ Show immediately
});

// Don't forget to handle window close events
// ❌ No handling of unsaved changes
```

### 2. Use Window Pool for Frequently Created Windows

For windows that are frequently opened and closed (like settings, about), use a window pool to improve performance:

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
    } else {
      window.show();
      window.focus();
    }

    return window;
  }

  destroyAll(): void {
    this.windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.destroy();
      }
    });
    this.windows.clear();
  }
}
```

### 3. Implement Window State Persistence

Save and restore window position, size, and other states:

```typescript
import { WindowManager } from 'electron-infra-kit';
import Store from 'electron-store';

class WindowStateManager {
  private store = new Store();

  async createWithState(
    name: string,
    defaultConfig: WindowConfig
  ): Promise<BrowserWindow> {
    // Load saved state
    const savedState = this.store.get(`windowState.${name}`) as WindowState;

    const config = {
      ...defaultConfig,
      ...savedState,
    };

    const window = await windowManager.create(config);

    // Save state changes
    const saveState = () => {
      if (!window.isDestroyed()) {
        const bounds = window.getBounds();
        this.store.set(`windowState.${name}`, {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized: window.isMaximized(),
        });
      }
    };

    window.on('resize', saveState);
    window.on('move', saveState);
    window.on('maximize', saveState);
    window.on('unmaximize', saveState);

    // Restore maximized state
    if (savedState?.isMaximized) {
      window.maximize();
    }

    return window;
  }
}

interface WindowState {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  isMaximized?: boolean;
}
```

### 4. Use Plugins to Extend Window Functionality

Leverage the window manager's plugin system to add common functionality:

```typescript
import { WindowPlugin } from 'electron-infra-kit';

// Window analytics plugin
class WindowAnalyticsPlugin implements WindowPlugin {
  name = 'analytics';

  onCreate(window: BrowserWindow, config: WindowConfig): void {
    console.log(`Window created: ${config.name}`);
    this.trackEvent('window_created', { name: config.name });
  }

  onClose(window: BrowserWindow): void {
    console.log('Window closed');
    this.trackEvent('window_closed');
  }

  private trackEvent(event: string, data?: any): void {
    // Send analytics data
  }
}

// Window shortcuts plugin
class WindowShortcutsPlugin implements WindowPlugin {
  name = 'shortcuts';

  onCreate(window: BrowserWindow): void {
    // Register shortcuts
    window.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.key === 'w') {
        window.close();
        event.preventDefault();
      }
    });
  }
}

// Register plugins
windowManager.use(new WindowAnalyticsPlugin());
windowManager.use(new WindowShortcutsPlugin());
```

## IPC Communication Best Practices

### 1. Use Type-Safe IPC Handlers

Always use Zod validation for input parameters to ensure type safety:

```typescript
import { IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';

// ✅ Recommended: Use Zod validation
const getUserHandler = new IpcHandler(
  'getUser',
  'user',
  async (context, payload: { id: string }) => {
    const user = await context.db.getUser(payload.id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  },
  z.object({
    id: z.string().uuid('Invalid user ID format'),
  })
);

// ❌ Not recommended: No validation
const badHandler = new IpcHandler(
  'getUser',
  'user',
  async (context, payload: any) => {
    // payload can be any type, unsafe
    return await context.db.getUser(payload.id);
  }
);
```

### 2. Organize IPC Handlers Properly

Organize handlers by functional modules using namespaces:

```typescript
// handlers/user.ts
export const userHandlers = [
  new IpcHandler(
    'getUser',
    'user',
    async (context, payload) => {
      return await context.userService.getUser(payload.id);
    },
    z.object({ id: z.string() })
  ),

  new IpcHandler(
    'updateUser',
    'user',
    async (context, payload) => {
      return await context.userService.updateUser(payload.id, payload.data);
    },
    z.object({
      id: z.string(),
      data: z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
      }),
    })
  ),

  new IpcHandler(
    'deleteUser',
    'user',
    async (context, payload) => {
      await context.userService.deleteUser(payload.id);
    },
    z.object({ id: z.string() })
  ),
];

// handlers/project.ts
export const projectHandlers = [
  // Project-related handlers
];

// main.ts
import { userHandlers } from './handlers/user';
import { projectHandlers } from './handlers/project';

userHandlers.forEach((handler) => ipcRouter.addHandler(handler));
projectHandlers.forEach((handler) => ipcRouter.addHandler(handler));
```

### 3. Implement Request Cancellation

Provide cancellation functionality for long-running operations:

```typescript
// Main process
class CancellableOperations {
  private operations = new Map<string, AbortController>();

  async startOperation(
    operationId: string,
    operation: (signal: AbortSignal) => Promise<any>
  ): Promise<any> {
    const controller = new AbortController();
    this.operations.set(operationId, controller);

    try {
      const result = await operation(controller.signal);
      return result;
    } finally {
      this.operations.delete(operationId);
    }
  }

  cancelOperation(operationId: string): void {
    const controller = this.operations.get(operationId);
    if (controller) {
      controller.abort();
      this.operations.delete(operationId);
    }
  }
}

const cancellableOps = new CancellableOperations();

const longRunningHandler = new IpcHandler(
  'longRunning',
  'operation',
  async (context, payload: { operationId: string; data: any }) => {
    return await cancellableOps.startOperation(
      payload.operationId,
      async (signal) => {
        // Execute long operation, periodically check signal.aborted
        for (let i = 0; i < 100; i++) {
          if (signal.aborted) {
            throw new Error('Operation cancelled');
          }
          await processChunk(i);
        }
        return 'completed';
      }
    );
  },
  z.object({
    operationId: z.string(),
    data: z.any(),
  })
);

const cancelHandler = new IpcHandler(
  'cancelOperation',
  'operation',
  async (context, payload: { operationId: string }) => {
    cancellableOps.cancelOperation(payload.operationId);
  },
  z.object({ operationId: z.string() })
);

// Renderer process
class OperationManager {
  async startLongRunning(data: any): Promise<void> {
    const operationId = generateId();

    try {
      const result = await window.electronAPI.longRunning({
        operationId,
        data,
      });
      console.log('Operation completed:', result);
    } catch (error) {
      if (error.message === 'Operation cancelled') {
        console.log('Operation cancelled');
      } else {
        console.error('Operation failed:', error);
      }
    }
  }

  async cancel(operationId: string): Promise<void> {
    await window.electronAPI.cancelOperation({ operationId });
  }
}
```

### 4. Use Dependency Injection for Context Management

Manage services and resources through dependency injection container:

```typescript
import { DIContainer } from 'electron-infra-kit';

// Define services
class UserService {
  constructor(private db: Database) {}

  async getUser(id: string): Promise<User> {
    return await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}

class ProjectService {
  constructor(
    private db: Database,
    private userService: UserService
  ) {}

  async getProject(id: string): Promise<Project> {
    const project = await this.db.query(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );
    project.owner = await this.userService.getUser(project.ownerId);
    return project;
  }
}

// Configure DI container
const container = new DIContainer();
container.register('db', () => new Database());
container.register('userService', (c) => new UserService(c.get('db')));
container.register(
  'projectService',
  (c) => new ProjectService(c.get('db'), c.get('userService'))
);

// Use in handlers
const getProjectHandler = new IpcHandler(
  'getProject',
  'project',
  async (context, payload: { id: string }) => {
    return await context.projectService.getProject(payload.id);
  },
  z.object({ id: z.string() })
);
```

### 5. Implement Request Retry and Timeout

Add retry and timeout mechanisms for IPC calls:

```typescript
// Renderer process
class ResilientIpcClient {
  private maxRetries = 3;
  private timeout = 5000;

  async callWithRetry<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await this.withTimeout(fn(), this.timeout);
    } catch (error) {
      if (retries > 0 && this.isRetryable(error)) {
        console.warn(`Request failed, retrying... (${retries} left)`);
        await this.delay(1000);
        return this.callWithRetry(fn, retries - 1);
      }
      throw error;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), ms)
      ),
    ]);
  }

  private isRetryable(error: any): boolean {
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE'];
    return retryableCodes.includes(error.code);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Usage example
  async getUser(id: string): Promise<User> {
    return this.callWithRetry(() => window.electronAPI.getUser({ id }));
  }
}
```

## State Management Best Practices

### 1. Design Data Structure Properly

Use flat data structures, avoid deep nesting:

```typescript
// ✅ Recommended: Flat structure
interface AppState {
  'user:id': string;
  'user:name': string;
  'user:email': string;
  'theme': string;
  'language': string;
  'projects:ids': string[];
  'projects:byId': Record<string, Project>;
}

// Set data
messageBus.setData('user:id', '123');
messageBus.setData('user:name', 'John');
messageBus.setData('theme', 'dark');

// Subscribe to specific fields
messageBus.watch('theme', (theme) => {
  applyTheme(theme);
});

// ❌ Not recommended: Deep nesting
interface BadAppState {
  user: {
    profile: {
      personal: {
        name: string;
        email: string;
      };
    };
  };
}

// Every update requires transferring entire object
messageBus.setData('user', entireUserObject);
```

### 2. Implement Selector Pattern

Use selectors to derive and cache computed results:

```typescript
class StateSelectors {
  private cache = new Map<string, any>();

  // Selector: Get current user
  selectCurrentUser(): User | null {
    const userId = messageBus.getData('user:id');
    if (!userId) return null;

    return {
      id: userId,
      name: messageBus.getData('user:name'),
      email: messageBus.getData('user:email'),
    };
  }

  // Selector: Get completed projects
  selectCompletedProjects(): Project[] {
    const cacheKey = 'completedProjects';
    const cached = this.cache.get(cacheKey);

    if (cached) return cached;

    const projectIds = messageBus.getData('projects:ids') || [];
    const projectsById = messageBus.getData('projects:byId') || {};

    const completed = projectIds
      .map((id) => projectsById[id])
      .filter((project) => project?.status === 'completed');

    this.cache.set(cacheKey, completed);
    return completed;
  }

  // Clear cache
  invalidateCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

// Use selectors
const selectors = new StateSelectors();

// Watch project changes, clear cache
messageBus.watch('projects:byId', () => {
  selectors.invalidateCache('completedProjects');
});

// Get data
const completedProjects = selectors.selectCompletedProjects();
```

### 3. Implement State Persistence

Automatically save and restore application state:

```typescript
import Store from 'electron-store';

class StatePersistence {
  private store = new Store();
  private persistKeys: string[] = ['theme', 'language', 'user:preferences'];

  init(): void {
    // Restore saved state
    this.restore();

    // Watch changes and save
    this.persistKeys.forEach((key) => {
      messageBus.watch(key, (value) => {
        this.store.set(key, value);
      });
    });
  }

  private restore(): void {
    this.persistKeys.forEach((key) => {
      const value = this.store.get(key);
      if (value !== undefined) {
        messageBus.setData(key, value);
      }
    });
  }

  clear(): void {
    this.persistKeys.forEach((key) => {
      this.store.delete(key);
    });
  }
}

// Initialize persistence
const persistence = new StatePersistence();
persistence.init();
```

### 4. Implement State Sync Strategy

Synchronize state in multi-window applications:

```typescript
class StateSyncManager {
  private syncKeys: string[] = ['theme', 'language'];

  init(): void {
    // Watch keys that need syncing
    this.syncKeys.forEach((key) => {
      messageBus.watch(key, (value) => {
        // Broadcast to all windows
        this.broadcastToAllWindows(key, value);
      });
    });
  }

  private broadcastToAllWindows(key: string, value: any): void {
    const windows = windowManager.getAllWindows();
    windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('state-update', { key, value });
      }
    });
  }
}

// Renderer process receives updates
window.electronAPI.on('state-update', ({ key, value }) => {
  messageBus.setData(key, value);
});
```

### 5. Use Middleware Pattern

Implement middleware for state changes:

```typescript
type Middleware = (key: string, value: any, next: () => void) => void;

class MessageBusWithMiddleware {
  private middlewares: Middleware[] = [];

  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  setData(key: string, value: any): void {
    let index = 0;

    const next = () => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        middleware(key, value, next);
      } else {
        // Finally set data
        messageBus.setData(key, value);
      }
    };

    next();
  }
}

// Logging middleware
const loggingMiddleware: Middleware = (key, value, next) => {
  console.log(`Setting data: ${key} =`, value);
  next();
};

// Validation middleware
const validationMiddleware: Middleware = (key, value, next) => {
  if (key === 'theme' && !['light', 'dark'].includes(value)) {
    throw new Error('Invalid theme value');
  }
  next();
};

// Use middleware
const bus = new MessageBusWithMiddleware();
bus.use(loggingMiddleware);
bus.use(validationMiddleware);
```

## Error Handling and Debugging Best Practices

### 1. Implement Unified Error Handling

Create a unified error handling mechanism:

```typescript
// Custom error class
class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Error handler
class ErrorHandler {
  handle(error: Error, context?: string): void {
    // Log error
    logger.error('Error occurred', {
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });

    // Show user-friendly error message
    if (error instanceof AppError) {
      this.showUserError(error);
    } else {
      this.showGenericError();
    }

    // Send error report
    this.reportError(error, context);
  }

  private showUserError(error: AppError): void {
    const messages: Record<string, string> = {
      USER_NOT_FOUND: 'User not found',
      NETWORK_ERROR: 'Network connection failed',
      PERMISSION_DENIED: 'Permission denied',
    };

    const message = messages[error.code] || error.message;
    this.showNotification('error', message);
  }

  private showGenericError(): void {
    this.showNotification('error', 'Operation failed, please try again later');
  }

  private showNotification(type: string, message: string): void {
    // Show notification
  }

  private reportError(error: Error, context?: string): void {
    // Send to error tracking service
  }
}

// Global error handler
const errorHandler = new ErrorHandler();

// Main process
process.on('uncaughtException', (error) => {
  errorHandler.handle(error, 'main-process');
});

process.on('unhandledRejection', (reason) => {
  errorHandler.handle(reason as Error, 'main-process-promise');
});

// Renderer process
window.addEventListener('error', (event) => {
  errorHandler.handle(event.error, 'renderer-process');
});

window.addEventListener('unhandledrejection', (event) => {
  errorHandler.handle(event.reason, 'renderer-process-promise');
});
```

### 2. Use Structured Logging

Implement structured logging:

```typescript
import { Logger } from 'electron-infra-kit';

class StructuredLogger {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  logOperation(
    operation: string,
    data: any,
    duration?: number
  ): void {
    this.logger.info('Operation completed', {
      operation,
      data,
      duration,
      timestamp: new Date().toISOString(),
    });
  }

  logError(
    error: Error,
    context: string,
    additionalData?: any
  ): void {
    this.logger.error('Error occurred', {
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...additionalData,
      timestamp: new Date().toISOString(),
    });
  }

  logPerformance(
    operation: string,
    startTime: number,
    endTime: number
  ): void {
    const duration = endTime - startTime;
    this.logger.info('Performance metric', {
      operation,
      duration,
      startTime,
      endTime,
      timestamp: new Date().toISOString(),
    });

    if (duration > 1000) {
      this.logger.warn('Slow operation detected', {
        operation,
        duration,
      });
    }
  }
}

// Usage example
const structuredLogger = new StructuredLogger(logger);

async function performOperation(): Promise<void> {
  const startTime = performance.now();

  try {
    const result = await someOperation();
    structuredLogger.logOperation('someOperation', result);
  } catch (error) {
    structuredLogger.logError(error as Error, 'performOperation', {
      userId: currentUser.id,
    });
    throw error;
  } finally {
    const endTime = performance.now();
    structuredLogger.logPerformance('someOperation', startTime, endTime);
  }
}
```

### 3. Implement Debug Tools

Create debugging utilities:

```typescript
import { DebugHelper } from 'electron-infra-kit';

class AppDebugger {
  private debugHelper: DebugHelper;
  private enabled: boolean = process.env.NODE_ENV === 'development';

  constructor(debugHelper: DebugHelper) {
    this.debugHelper = debugHelper;
  }

  enable(): void {
    this.enabled = true;
    this.setupDebugTools();
  }

  disable(): void {
    this.enabled = false;
  }

  private setupDebugTools(): void {
    // Add global debug object
    if (this.enabled) {
      (global as any).__DEBUG__ = {
        windows: () => this.debugHelper.getWindowsInfo(),
        ipc: () => this.debugHelper.getIpcStats(),
        messageBus: () => this.debugHelper.getMessageBusState(),
        performance: () => this.debugHelper.getPerformanceMetrics(),
      };

      console.log('Debug tools enabled. Use __DEBUG__ to access debug info.');
    }
  }

  logState(label: string): void {
    if (!this.enabled) return;

    console.group(`[DEBUG] ${label}`);
    console.log('Windows:', this.debugHelper.getWindowsInfo());
    console.log('IPC Stats:', this.debugHelper.getIpcStats());
    console.log('MessageBus:', this.debugHelper.getMessageBusState());
    console.groupEnd();
  }

  measurePerformance<T>(
    label: string,
    fn: () => T
  ): T {
    if (!this.enabled) return fn();

    console.time(label);
    try {
      return fn();
    } finally {
      console.timeEnd(label);
    }
  }

  async measureAsync<T>(
    label: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.enabled) return fn();

    console.time(label);
    try {
      return await fn();
    } finally {
      console.timeEnd(label);
    }
  }
}

// Usage example
const debugger = new AppDebugger(debugHelper);

if (process.env.NODE_ENV === 'development') {
  debugger.enable();
}

// Measure performance
const result = await debugger.measureAsync('loadUserData', async () => {
  return await window.electronAPI.getUserData();
});

// Log state
debugger.logState('After user login');
```

### 4. Implement DevTools Integration

Integrate Chrome DevTools and other debugging tools:

```typescript
class DevToolsManager {
  enableDevTools(window: BrowserWindow): void {
    if (process.env.NODE_ENV === 'development') {
      // Open DevTools
      window.webContents.openDevTools({ mode: 'detach' });

      // Install React DevTools and other extensions
      this.installExtensions();

      // Enable hot reload
      this.enableHotReload(window);
    }
  }

  private async installExtensions(): Promise<void> {
    const {
      default: installExtension,
      REACT_DEVELOPER_TOOLS,
      REDUX_DEVTOOLS,
    } = require('electron-devtools-installer');

    try {
      await installExtension([REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS]);
      console.log('DevTools extensions installed');
    } catch (error) {
      console.error('Failed to install extensions:', error);
    }
  }

  private enableHotReload(window: BrowserWindow): void {
    // Watch file changes
    require('electron-reload')(__dirname, {
      electron: require('electron'),
      hardResetMethod: 'exit',
    });
  }

  disableDevTools(window: BrowserWindow): void {
    window.webContents.closeDevTools();
  }
}
```

### 5. Implement Performance Monitoring

Monitor application performance metrics:

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  startMeasure(label: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);

      if (duration > 1000) {
        console.warn(`Slow operation: ${label} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  private recordMetric(label: string, duration: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);
  }

  getStats(label: string): PerformanceStats | null {
    const durations = this.metrics.get(label);
    if (!durations || durations.length === 0) return null;

    const sorted = [...durations].sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count: durations.length,
      avg: sum / durations.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  printReport(): void {
    console.table(
      Array.from(this.metrics.keys()).map((label) => ({
        operation: label,
        ...this.getStats(label),
      }))
    );
  }

  reset(): void {
    this.metrics.clear();
  }
}

interface PerformanceStats {
  count: number;
  avg: number;
  min: number;
  max: number;
  median: number;
  p95: number;
  p99: number;
}

// Usage example
const monitor = new PerformanceMonitor();

async function loadData(): Promise<void> {
  const endMeasure = monitor.startMeasure('loadData');

  try {
    await window.electronAPI.getData();
  } finally {
    endMeasure();
  }
}

// Print report periodically
setInterval(() => {
  monitor.printReport();
}, 60000); // Every minute
```

## Code Organization Best Practices

### 1. Use Clear Project Structure

```
src/
├── main/                    # Main process code
│   ├── index.ts            # Main process entry
│   ├── windows/            # Window management
│   │   ├── manager.ts
│   │   └── plugins/
│   ├── ipc/                # IPC handlers
│   │   ├── handlers/
│   │   │   ├── user.ts
│   │   │   ├── project.ts
│   │   │   └── index.ts
│   │   └── router.ts
│   ├── services/           # Business logic
│   │   ├── user.service.ts
│   │   └── project.service.ts
│   ├── repositories/       # Data access
│   │   ├── user.repository.ts
│   │   └── project.repository.ts
│   └── utils/              # Utility functions
├── preload/                # Preload scripts
│   └── index.ts
├── renderer/               # Renderer process code
│   ├── index.tsx
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── utils/
└── shared/                 # Shared code
    ├── types/
    ├── constants/
    └── utils/
```

### 2. Use TypeScript Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 3. Write Testable Code

```typescript
// ✅ Recommended: Dependency injection, easy to test
class UserService {
  constructor(
    private repository: UserRepository,
    private logger: Logger
  ) {}

  async getUser(id: string): Promise<User> {
    this.logger.info('Getting user', { id });
    return await this.repository.getUser(id);
  }
}

// Test
describe('UserService', () => {
  it('should get user', async () => {
    const mockRepository = {
      getUser: jest.fn().mockResolvedValue({ id: '1', name: 'John' }),
    };
    const mockLogger = {
      info: jest.fn(),
    };

    const service = new UserService(mockRepository, mockLogger);
    const user = await service.getUser('1');

    expect(user).toEqual({ id: '1', name: 'John' });
    expect(mockLogger.info).toHaveBeenCalled();
  });
});

// ❌ Not recommended: Hard-coded dependencies, hard to test
class BadUserService {
  async getUser(id: string): Promise<User> {
    const repository = new UserRepository(); // Hard-coded
    return await repository.getUser(id);
  }
}
```

## Security Best Practices

### 1. Enable Context Isolation

```typescript
const window = await windowManager.create({
  name: 'main',
  webPreferences: {
    nodeIntegration: false, // ✅ Disable Node integration
    contextIsolation: true, // ✅ Enable context isolation
    preload: path.join(__dirname, 'preload.js'),
    sandbox: true, // ✅ Enable sandbox
  },
});
```

### 2. Validate All Inputs

```typescript
// Use Zod to validate all IPC inputs
const createUserHandler = new IpcHandler(
  'createUser',
  'user',
  async (context, payload) => {
    // payload is already validated by Zod
    return await context.userService.createUser(payload);
  },
  z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    age: z.number().int().min(0).max(150),
  })
);
```

### 3. Limit Permissions

```typescript
// Use MessageBus permission control
messageBus.setData('sensitiveData', data, {
  readonly: true, // Read-only
  allowedWindows: ['main'], // Only allow main window access
});
```

## Performance Optimization Checklist

### Development Phase
- [ ] Use TypeScript strict mode
- [ ] Implement code splitting and lazy loading
- [ ] Use React.memo and useMemo to optimize rendering
- [ ] Avoid creating new objects in render loops
- [ ] Use virtual lists for large datasets

### Window Management
- [ ] Lazy create windows
- [ ] Reuse window instances
- [ ] Use `show: false` and `ready-to-show`
- [ ] Enable background throttling
- [ ] Clean up unused windows promptly

### IPC Communication
- [ ] Use debounce and throttle
- [ ] Batch operations
- [ ] Cache unchanging data
- [ ] Process requests in parallel
- [ ] Use streaming for large data

### State Management
- [ ] Use flat data structures
- [ ] Only subscribe to needed data
- [ ] Unsubscribe promptly
- [ ] Use selectors to cache computations
- [ ] Batch data updates

## Summary

Following these best practices helps you:

1. **Improve Code Quality**: Through type safety, error handling, and testing
2. **Enhance Performance**: Through optimizing window management, IPC communication, and state management
3. **Increase Maintainability**: Through clear code organization and documentation
4. **Ensure Security**: Through context isolation, input validation, and permission control
5. **Improve Developer Experience**: Through debugging tools and performance monitoring

## Next Steps

- Check out [Window Manager Documentation](./core-concepts/window-manager.md) for window management details
- Check out [IPC Router Documentation](./core-concepts/ipc-router.md) for IPC communication details
- Check out [Message Bus Documentation](./core-concepts/message-bus.md) for state management details
- Check out [Error Handling Guide](./advanced/error-handling.md) for error handling
- Check out [Performance Optimization Guide](./advanced/performance.md) for performance optimization
- Check out [Debugging Guide](./advanced/debugging.md) for debugging techniques
