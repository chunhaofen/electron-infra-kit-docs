# 最佳实践

## 概述

本指南总结了使用 `electron-infra-kit` 开发 Electron 应用的最佳实践。这些实践涵盖窗口管理、IPC 通信、状态管理、错误处理和调试等方面，帮助你构建高质量、可维护的应用。

## 窗口管理最佳实践

### 1. 合理组织窗口生命周期

**✅ 推荐做法**

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
      show: false, // 等待内容加载完成
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    // 等待内容加载完成再显示
    window.once('ready-to-show', () => {
      window.show();
    });

    // 处理窗口关闭
    window.on('close', (e) => {
      if (!this.canClose()) {
        e.preventDefault();
        this.confirmClose(window);
      }
    });

    return window;
  }

  private canClose(): boolean {
    // 检查是否有未保存的更改
    return !this.hasUnsavedChanges();
  }

  private async confirmClose(window: BrowserWindow): Promise<void> {
    const { response } = await dialog.showMessageBox(window, {
      type: 'question',
      buttons: ['取消', '不保存', '保存'],
      defaultId: 2,
      message: '是否保存更改？',
    });

    if (response === 1) {
      window.destroy();
    } else if (response === 2) {
      await this.saveChanges();
      window.destroy();
    }
  }

  private hasUnsavedChanges(): boolean {
    // 实现检查逻辑
    return false;
  }

  private async saveChanges(): Promise<void> {
    // 实现保存逻辑
  }
}
```

**❌ 不推荐做法**

```typescript
// 不要直接显示窗口，可能会出现白屏
const window = await windowManager.create({
  name: 'main',
  show: true, // ❌ 立即显示
});

// 不要忘记处理窗口关闭事件
// ❌ 没有处理未保存的更改
```

### 2. 使用窗口池管理频繁创建的窗口

对于需要频繁打开和关闭的窗口（如设置窗口、关于窗口），使用窗口池来提升性能：

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

### 3. 实现窗口状态持久化

保存和恢复窗口的位置、大小等状态：

```typescript
import { WindowManager } from 'electron-infra-kit';
import Store from 'electron-store';

class WindowStateManager {
  private store = new Store();

  async createWithState(
    name: string,
    defaultConfig: WindowConfig
  ): Promise<BrowserWindow> {
    // 加载保存的状态
    const savedState = this.store.get(`windowState.${name}`) as WindowState;

    const config = {
      ...defaultConfig,
      ...savedState,
    };

    const window = await windowManager.create(config);

    // 保存状态变化
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

    // 恢复最大化状态
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

### 4. 使用插件扩展窗口功能

利用窗口管理器的插件系统来添加通用功能：

```typescript
import { WindowPlugin } from 'electron-infra-kit';

// 窗口分析插件
class WindowAnalyticsPlugin implements WindowPlugin {
  name = 'analytics';

  onCreate(window: BrowserWindow, config: WindowConfig): void {
    console.log(`窗口创建: ${config.name}`);
    this.trackEvent('window_created', { name: config.name });
  }

  onClose(window: BrowserWindow): void {
    console.log('窗口关闭');
    this.trackEvent('window_closed');
  }

  private trackEvent(event: string, data?: any): void {
    // 发送分析数据
  }
}

// 窗口快捷键插件
class WindowShortcutsPlugin implements WindowPlugin {
  name = 'shortcuts';

  onCreate(window: BrowserWindow): void {
    // 注册快捷键
    window.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.key === 'w') {
        window.close();
        event.preventDefault();
      }
    });
  }
}

// 注册插件
windowManager.use(new WindowAnalyticsPlugin());
windowManager.use(new WindowShortcutsPlugin());
```

## IPC 通信最佳实践

### 1. 使用类型安全的 IPC 处理器

始终使用 Zod 验证输入参数，确保类型安全：

```typescript
import { IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';

// ✅ 推荐：使用 Zod 验证
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

// ❌ 不推荐：没有验证
const badHandler = new IpcHandler(
  'getUser',
  'user',
  async (context, payload: any) => {
    // payload 可能是任何类型，不安全
    return await context.db.getUser(payload.id);
  }
);
```

### 2. 合理组织 IPC 处理器

按功能模块组织处理器，使用命名空间：

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
  // 项目相关的处理器
];

// main.ts
import { userHandlers } from './handlers/user';
import { projectHandlers } from './handlers/project';

userHandlers.forEach((handler) => ipcRouter.addHandler(handler));
projectHandlers.forEach((handler) => ipcRouter.addHandler(handler));
```

### 3. 实现请求取消机制

对于长时间运行的操作，提供取消功能：

```typescript
// 主进程
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
        // 执行长时间操作，定期检查 signal.aborted
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

// 渲染进程
class OperationManager {
  async startLongRunning(data: any): Promise<void> {
    const operationId = generateId();

    try {
      const result = await window.electronAPI.longRunning({
        operationId,
        data,
      });
      console.log('操作完成:', result);
    } catch (error) {
      if (error.message === 'Operation cancelled') {
        console.log('操作已取消');
      } else {
        console.error('操作失败:', error);
      }
    }
  }

  async cancel(operationId: string): Promise<void> {
    await window.electronAPI.cancelOperation({ operationId });
  }
}
```

### 4. 使用依赖注入管理上下文

通过依赖注入容器管理服务和资源：

```typescript
import { DIContainer } from 'electron-infra-kit';

// 定义服务
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

// 配置 DI 容器
const container = new DIContainer();
container.register('db', () => new Database());
container.register('userService', (c) => new UserService(c.get('db')));
container.register(
  'projectService',
  (c) => new ProjectService(c.get('db'), c.get('userService'))
);

// 在处理器中使用
const getProjectHandler = new IpcHandler(
  'getProject',
  'project',
  async (context, payload: { id: string }) => {
    return await context.projectService.getProject(payload.id);
  },
  z.object({ id: z.string() })
);
```

### 5. 实现请求重试和超时

为 IPC 调用添加重试和超时机制：

```typescript
// 渲染进程
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
        console.warn(`请求失败，重试中... (剩余 ${retries} 次)`);
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

  // 使用示例
  async getUser(id: string): Promise<User> {
    return this.callWithRetry(() => window.electronAPI.getUser({ id }));
  }
}
```

## 状态管理最佳实践

### 1. 合理设计数据结构

使用扁平化的数据结构，避免深层嵌套：

```typescript
// ✅ 推荐：扁平化结构
interface AppState {
  'user:id': string;
  'user:name': string;
  'user:email': string;
  'theme': string;
  'language': string;
  'projects:ids': string[];
  'projects:byId': Record<string, Project>;
}

// 设置数据
messageBus.setData('user:id', '123');
messageBus.setData('user:name', 'John');
messageBus.setData('theme', 'dark');

// 订阅特定字段
messageBus.watch('theme', (theme) => {
  applyTheme(theme);
});

// ❌ 不推荐：深层嵌套
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

// 每次更新都需要传输整个对象
messageBus.setData('user', entireUserObject);
```

### 2. 实现选择器模式

使用选择器来派生和缓存计算结果：

```typescript
class StateSelectors {
  private cache = new Map<string, any>();

  // 选择器：获取当前用户
  selectCurrentUser(): User | null {
    const userId = messageBus.getData('user:id');
    if (!userId) return null;

    return {
      id: userId,
      name: messageBus.getData('user:name'),
      email: messageBus.getData('user:email'),
    };
  }

  // 选择器：获取已完成的项目
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

  // 清除缓存
  invalidateCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

// 使用选择器
const selectors = new StateSelectors();

// 监听项目变化，清除缓存
messageBus.watch('projects:byId', () => {
  selectors.invalidateCache('completedProjects');
});

// 获取数据
const completedProjects = selectors.selectCompletedProjects();
```

### 3. 实现状态持久化

自动保存和恢复应用状态：

```typescript
import Store from 'electron-store';

class StatePersistence {
  private store = new Store();
  private persistKeys: string[] = ['theme', 'language', 'user:preferences'];

  init(): void {
    // 恢复保存的状态
    this.restore();

    // 监听变化并保存
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

// 初始化持久化
const persistence = new StatePersistence();
persistence.init();
```

### 4. 实现状态同步策略

在多窗口应用中同步状态：

```typescript
class StateSyncManager {
  private syncKeys: string[] = ['theme', 'language'];

  init(): void {
    // 监听需要同步的键
    this.syncKeys.forEach((key) => {
      messageBus.watch(key, (value) => {
        // 广播到所有窗口
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

// 渲染进程接收更新
window.electronAPI.on('state-update', ({ key, value }) => {
  messageBus.setData(key, value);
});
```

### 5. 使用中间件模式

实现状态变化的中间件处理：

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
        // 最终设置数据
        messageBus.setData(key, value);
      }
    };

    next();
  }
}

// 日志中间件
const loggingMiddleware: Middleware = (key, value, next) => {
  console.log(`设置数据: ${key} =`, value);
  next();
};

// 验证中间件
const validationMiddleware: Middleware = (key, value, next) => {
  if (key === 'theme' && !['light', 'dark'].includes(value)) {
    throw new Error('Invalid theme value');
  }
  next();
};

// 使用中间件
const bus = new MessageBusWithMiddleware();
bus.use(loggingMiddleware);
bus.use(validationMiddleware);
```

## 错误处理和调试最佳实践

### 1. 实现统一的错误处理

创建统一的错误处理机制：

```typescript
// 自定义错误类
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

// 错误处理器
class ErrorHandler {
  handle(error: Error, context?: string): void {
    // 记录错误
    logger.error('Error occurred', {
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });

    // 显示用户友好的错误消息
    if (error instanceof AppError) {
      this.showUserError(error);
    } else {
      this.showGenericError();
    }

    // 发送错误报告
    this.reportError(error, context);
  }

  private showUserError(error: AppError): void {
    const messages: Record<string, string> = {
      USER_NOT_FOUND: '找不到该用户',
      NETWORK_ERROR: '网络连接失败',
      PERMISSION_DENIED: '权限不足',
    };

    const message = messages[error.code] || error.message;
    this.showNotification('error', message);
  }

  private showGenericError(): void {
    this.showNotification('error', '操作失败，请稍后重试');
  }

  private showNotification(type: string, message: string): void {
    // 显示通知
  }

  private reportError(error: Error, context?: string): void {
    // 发送到错误追踪服务
  }
}

// 全局错误处理器
const errorHandler = new ErrorHandler();

// 主进程
process.on('uncaughtException', (error) => {
  errorHandler.handle(error, 'main-process');
});

process.on('unhandledRejection', (reason) => {
  errorHandler.handle(reason as Error, 'main-process-promise');
});

// 渲染进程
window.addEventListener('error', (event) => {
  errorHandler.handle(event.error, 'renderer-process');
});

window.addEventListener('unhandledrejection', (event) => {
  errorHandler.handle(event.reason, 'renderer-process-promise');
});
```

### 2. 使用结构化日志

实现结构化的日志记录：

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

// 使用示例
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

### 3. 实现调试工具

创建调试辅助工具：

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
    // 添加全局调试对象
    if (this.enabled) {
      (global as any).__DEBUG__ = {
        windows: () => this.debugHelper.getWindowsInfo(),
        ipc: () => this.debugHelper.getIpcStats(),
        messageBus: () => this.debugHelper.getMessageBusState(),
        performance: () => this.debugHelper.getPerformanceMetrics(),
      };

      console.log('调试工具已启用。使用 __DEBUG__ 访问调试信息。');
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

// 使用示例
const debugger = new AppDebugger(debugHelper);

if (process.env.NODE_ENV === 'development') {
  debugger.enable();
}

// 测量性能
const result = await debugger.measureAsync('loadUserData', async () => {
  return await window.electronAPI.getUserData();
});

// 记录状态
debugger.logState('After user login');
```

### 4. 实现开发者工具集成

集成 Chrome DevTools 和其他调试工具：

```typescript
class DevToolsManager {
  enableDevTools(window: BrowserWindow): void {
    if (process.env.NODE_ENV === 'development') {
      // 打开开发者工具
      window.webContents.openDevTools({ mode: 'detach' });

      // 安装 React DevTools 等扩展
      this.installExtensions();

      // 启用热重载
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
      console.log('开发者工具扩展已安装');
    } catch (error) {
      console.error('安装扩展失败:', error);
    }
  }

  private enableHotReload(window: BrowserWindow): void {
    // 监听文件变化
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

### 5. 实现性能监控

监控应用性能指标：

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  startMeasure(label: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);

      if (duration > 1000) {
        console.warn(`慢速操作: ${label} 耗时 ${duration.toFixed(2)}ms`);
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

// 使用示例
const monitor = new PerformanceMonitor();

async function loadData(): Promise<void> {
  const endMeasure = monitor.startMeasure('loadData');

  try {
    await window.electronAPI.getData();
  } finally {
    endMeasure();
  }
}

// 定期打印报告
setInterval(() => {
  monitor.printReport();
}, 60000); // 每分钟
```

## 代码组织最佳实践

### 1. 使用清晰的项目结构

```
src/
├── main/                    # 主进程代码
│   ├── index.ts            # 主进程入口
│   ├── windows/            # 窗口管理
│   │   ├── manager.ts
│   │   └── plugins/
│   ├── ipc/                # IPC 处理器
│   │   ├── handlers/
│   │   │   ├── user.ts
│   │   │   ├── project.ts
│   │   │   └── index.ts
│   │   └── router.ts
│   ├── services/           # 业务逻辑
│   │   ├── user.service.ts
│   │   └── project.service.ts
│   ├── repositories/       # 数据访问
│   │   ├── user.repository.ts
│   │   └── project.repository.ts
│   └── utils/              # 工具函数
├── preload/                # 预加载脚本
│   └── index.ts
├── renderer/               # 渲染进程代码
│   ├── index.tsx
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── utils/
└── shared/                 # 共享代码
    ├── types/
    ├── constants/
    └── utils/
```

### 2. 使用 TypeScript 严格模式

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

### 3. 编写可测试的代码

```typescript
// ✅ 推荐：依赖注入，易于测试
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

// 测试
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

// ❌ 不推荐：硬编码依赖，难以测试
class BadUserService {
  async getUser(id: string): Promise<User> {
    const repository = new UserRepository(); // 硬编码
    return await repository.getUser(id);
  }
}
```

## 安全最佳实践

### 1. 启用上下文隔离

```typescript
const window = await windowManager.create({
  name: 'main',
  webPreferences: {
    nodeIntegration: false, // ✅ 禁用 Node 集成
    contextIsolation: true, // ✅ 启用上下文隔离
    preload: path.join(__dirname, 'preload.js'),
    sandbox: true, // ✅ 启用沙箱
  },
});
```

### 2. 验证所有输入

```typescript
// 使用 Zod 验证所有 IPC 输入
const createUserHandler = new IpcHandler(
  'createUser',
  'user',
  async (context, payload) => {
    // payload 已经通过 Zod 验证
    return await context.userService.createUser(payload);
  },
  z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    age: z.number().int().min(0).max(150),
  })
);
```

### 3. 限制权限

```typescript
// 使用 MessageBus 权限控制
messageBus.setData('sensitiveData', data, {
  readonly: true, // 只读
  allowedWindows: ['main'], // 只允许主窗口访问
});
```

## 性能优化清单

### 开发阶段
- [ ] 使用 TypeScript 严格模式
- [ ] 实现代码分割和懒加载
- [ ] 使用 React.memo 和 useMemo 优化渲染
- [ ] 避免在渲染循环中创建新对象
- [ ] 使用虚拟列表处理大量数据

### 窗口管理
- [ ] 延迟创建窗口
- [ ] 复用窗口实例
- [ ] 使用 `show: false` 和 `ready-to-show`
- [ ] 启用背景节流
- [ ] 及时清理不用的窗口

### IPC 通信
- [ ] 使用防抖和节流
- [ ] 批量处理操作
- [ ] 缓存不变的数据
- [ ] 并行处理请求
- [ ] 使用流式传输处理大数据

### 状态管理
- [ ] 使用扁平化数据结构
- [ ] 只订阅需要的数据
- [ ] 及时取消订阅
- [ ] 使用选择器缓存计算
- [ ] 批量更新数据

## 总结

遵循这些最佳实践可以帮助你：

1. **提高代码质量**：通过类型安全、错误处理和测试
2. **提升性能**：通过优化窗口管理、IPC 通信和状态管理
3. **增强可维护性**：通过清晰的代码组织和文档
4. **保证安全性**：通过上下文隔离、输入验证和权限控制
5. **改善开发体验**：通过调试工具和性能监控

## 下一步

- 查看 [窗口管理器文档](./core-concepts/window-manager.md) 了解窗口管理详情
- 查看 [IPC 路由文档](./core-concepts/ipc-router.md) 了解 IPC 通信详情
- 查看 [消息总线文档](./core-concepts/message-bus.md) 了解状态管理详情
- 查看 [错误处理指南](./advanced/error-handling.md) 了解错误处理
- 查看 [性能优化指南](./advanced/performance.md) 了解性能优化
- 查看 [调试技巧指南](./advanced/debugging.md) 了解调试方法
