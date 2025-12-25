# 错误处理指南

## 概述

良好的错误处理是构建健壮 Electron 应用的关键。本指南介绍如何在使用 `electron-infra-kit` 时有效地处理错误，包括错误类型、处理策略和最佳实践。

## 错误类型

### 1. 窗口管理错误

窗口管理过程中可能出现的错误：

```typescript
import { WindowManager, WindowError } from 'electron-infra-kit';

try {
  const window = await windowManager.create({
    name: 'main',
    width: 1024,
    height: 768,
  });
} catch (error) {
  if (error instanceof WindowError) {
    switch (error.code) {
      case 'WINDOW_ALREADY_EXISTS':
        console.error('窗口已存在:', error.message);
        // 获取现有窗口
        const existing = windowManager.getWindowByName('main');
        break;

      case 'WINDOW_CREATION_FAILED':
        console.error('窗口创建失败:', error.message);
        // 显示错误提示给用户
        dialog.showErrorBox('错误', '无法创建窗口');
        break;

      case 'WINDOW_NOT_FOUND':
        console.error('窗口不存在:', error.message);
        break;

      default:
        console.error('未知窗口错误:', error);
    }
  }
}
```

### 2. IPC 通信错误

IPC 通信中的错误处理：

```typescript
import { IpcHandler, IpcError } from 'electron-infra-kit';
import { z } from 'zod';

// 主进程
const getUserHandler = new IpcHandler(
  'getUser',
  'user',
  async (context, payload: { id: string }) => {
    try {
      const user = await context.db.getUser(payload.id);

      if (!user) {
        throw new IpcError('USER_NOT_FOUND', `用户 ${payload.id} 不存在`);
      }

      return user;
    } catch (error) {
      if (error instanceof IpcError) {
        throw error; // 重新抛出 IPC 错误
      }

      // 包装其他错误
      throw new IpcError(
        'DATABASE_ERROR',
        '数据库查询失败',
        error as Error
      );
    }
  },
  z.object({ id: z.string() })
);

// 渲染进程
try {
  const user = await window.electronAPI.getUser('user-123');
  console.log('用户:', user);
} catch (error) {
  if (error.code === 'USER_NOT_FOUND') {
    console.error('用户不存在');
    // 显示友好的错误消息
  } else if (error.code === 'DATABASE_ERROR') {
    console.error('数据库错误');
    // 显示重试选项
  } else {
    console.error('未知错误:', error);
  }
}
```

### 3. 验证错误

Zod 验证失败的错误处理：

```typescript
import { z } from 'zod';
import { IpcHandler } from 'electron-infra-kit';

const createUserSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  email: z.string().email('无效的邮箱地址'),
  age: z.number().int().min(0, '年龄必须为正数').max(150, '年龄不合理'),
});

const createUserHandler = new IpcHandler(
  'createUser',
  'user',
  async (context, payload) => {
    // 如果验证失败，IpcHandler 会自动抛出验证错误
    return await context.db.createUser(payload);
  },
  createUserSchema
);

// 渲染进程处理验证错误
try {
  await window.electronAPI.createUser({
    name: '',
    email: 'invalid-email',
    age: -5,
  });
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    // 错误包含详细的验证失败信息
    const validationErrors = error.details;
    validationErrors.forEach((err) => {
      console.error(`${err.path}: ${err.message}`);
    });

    // 在 UI 中显示验证错误
    displayValidationErrors(validationErrors);
  }
}
```

### 4. MessageBus 错误

消息总线相关的错误：

```typescript
import { MessageBus, MessageBusError } from 'electron-infra-kit';

try {
  // 尝试设置只读数据
  messageBus.setData('readonly-field', 'new-value');
} catch (error) {
  if (error instanceof MessageBusError) {
    switch (error.code) {
      case 'PERMISSION_DENIED':
        console.error('权限不足:', error.message);
        break;

      case 'INVALID_KEY':
        console.error('无效的键:', error.message);
        break;

      case 'SERIALIZATION_ERROR':
        console.error('序列化失败:', error.message);
        break;

      default:
        console.error('MessageBus 错误:', error);
    }
  }
}
```

## 错误处理策略

### 1. 分层错误处理

在不同层级处理不同类型的错误：

```typescript
// 数据访问层
class UserRepository {
  async getUser(id: string): Promise<User> {
    try {
      const user = await this.db.query('SELECT * FROM users WHERE id = ?', [
        id,
      ]);
      return user;
    } catch (error) {
      // 转换为领域错误
      throw new RepositoryError('USER_QUERY_FAILED', '查询用户失败', error);
    }
  }
}

// 业务逻辑层
class UserService {
  constructor(private repository: UserRepository) {}

  async getUserProfile(id: string): Promise<UserProfile> {
    try {
      const user = await this.repository.getUser(id);

      if (!user) {
        throw new ServiceError('USER_NOT_FOUND', `用户 ${id} 不存在`);
      }

      return this.buildProfile(user);
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      // 包装底层错误
      throw new ServiceError(
        'PROFILE_LOAD_FAILED',
        '加载用户资料失败',
        error
      );
    }
  }

  private buildProfile(user: User): UserProfile {
    // 构建用户资料
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }
}

// IPC 处理层
const getUserProfileHandler = new IpcHandler(
  'getUserProfile',
  'user',
  async (context, payload: { id: string }) => {
    try {
      return await context.userService.getUserProfile(payload.id);
    } catch (error) {
      if (error instanceof ServiceError) {
        // 转换为 IPC 错误
        throw new IpcError(error.code, error.message, error);
      }

      throw new IpcError('INTERNAL_ERROR', '内部错误', error as Error);
    }
  },
  z.object({ id: z.string() })
);
```

### 2. 错误恢复

实现自动重试和降级策略：

```typescript
class ResilientIpcClient {
  private maxRetries = 3;
  private retryDelay = 1000;

  async callWithRetry<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0 && this.isRetryable(error)) {
        console.warn(`请求失败，${this.retryDelay}ms 后重试...`);
        await this.delay(this.retryDelay);
        return this.callWithRetry(fn, retries - 1);
      }

      throw error;
    }
  }

  private isRetryable(error: any): boolean {
    // 判断错误是否可重试
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'SERVICE_UNAVAILABLE',
    ];
    return retryableCodes.includes(error.code);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 使用示例
  async getUser(id: string): Promise<User> {
    return this.callWithRetry(() => window.electronAPI.getUser(id));
  }
}

// 降级策略
class FallbackIpcClient {
  async getUserWithFallback(id: string): Promise<User | null> {
    try {
      return await window.electronAPI.getUser(id);
    } catch (error) {
      console.error('获取用户失败，使用缓存数据:', error);

      // 尝试从缓存获取
      const cached = this.getCachedUser(id);
      if (cached) {
        return cached;
      }

      // 返回默认值
      return this.getDefaultUser();
    }
  }

  private getCachedUser(id: string): User | null {
    // 从缓存获取用户
    const cached = localStorage.getItem(`user:${id}`);
    return cached ? JSON.parse(cached) : null;
  }

  private getDefaultUser(): User {
    return {
      id: 'unknown',
      name: '未知用户',
      email: '',
    };
  }
}
```

### 3. 错误边界

在 UI 层实现错误边界：

```typescript
// React 错误边界示例
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误
    console.error('错误边界捕获错误:', error, errorInfo);

    // 发送错误报告
    window.electronAPI.reportError({
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>出错了</h1>
          <p>应用遇到了一个错误，请刷新页面重试。</p>
          <button onClick={() => window.location.reload()}>刷新页面</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 使用错误边界
function App() {
  return (
    <ErrorBoundary>
      <MainContent />
    </ErrorBoundary>
  );
}
```

### 4. 全局错误处理

设置全局错误处理器：

```typescript
// 主进程
import { app } from 'electron';

// 捕获未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
  // 记录错误
  logger.error('Unhandled rejection', { reason, promise });
});

// 捕获未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  // 记录错误
  logger.error('Uncaught exception', { error });

  // 显示错误对话框
  dialog.showErrorBox('严重错误', `应用遇到严重错误:\n${error.message}`);

  // 优雅退出
  app.quit();
});

// 渲染进程
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
  // 报告错误
  window.electronAPI.reportError({
    message: event.error.message,
    stack: event.error.stack,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的 Promise 拒绝:', event.reason);
  // 报告错误
  window.electronAPI.reportError({
    message: 'Unhandled Promise Rejection',
    reason: event.reason,
  });
});
```

## 错误日志

### 1. 结构化日志

使用结构化日志记录错误：

```typescript
import { Logger } from 'electron-infra-kit';

class ErrorLogger {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  logError(error: Error, context?: Record<string, any>): void {
    this.logger.error('Error occurred', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
    });
  }

  logIpcError(
    handlerName: string,
    error: Error,
    payload?: any
  ): void {
    this.logger.error('IPC handler error', {
      handler: handlerName,
      error: {
        message: error.message,
        stack: error.stack,
      },
      payload,
    });
  }

  logWindowError(
    windowName: string,
    operation: string,
    error: Error
  ): void {
    this.logger.error('Window operation error', {
      window: windowName,
      operation,
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
}

// 使用示例
const errorLogger = new ErrorLogger(logger);

try {
  await windowManager.create(config);
} catch (error) {
  errorLogger.logWindowError('main', 'create', error as Error);
  throw error;
}
```

### 2. 错误追踪

实现错误追踪和关联：

```typescript
class ErrorTracker {
  private errorId = 0;
  private errors = new Map<number, ErrorRecord>();

  trackError(error: Error, context?: Record<string, any>): number {
    const id = ++this.errorId;
    const record: ErrorRecord = {
      id,
      timestamp: new Date(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context,
    };

    this.errors.set(id, record);

    // 记录到日志
    logger.error('Error tracked', { errorId: id, ...record });

    return id;
  }

  getError(id: number): ErrorRecord | undefined {
    return this.errors.get(id);
  }

  getRecentErrors(count: number = 10): ErrorRecord[] {
    const allErrors = Array.from(this.errors.values());
    return allErrors.slice(-count);
  }

  clearOldErrors(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, record] of this.errors) {
      if (now - record.timestamp.getTime() > maxAge) {
        this.errors.delete(id);
      }
    }
  }
}

interface ErrorRecord {
  id: number;
  timestamp: Date;
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  context?: Record<string, any>;
}

// 使用示例
const tracker = new ErrorTracker();

try {
  await someOperation();
} catch (error) {
  const errorId = tracker.trackError(error as Error, {
    operation: 'someOperation',
    userId: currentUser.id,
  });

  console.error(`错误已记录，ID: ${errorId}`);
}
```

## 用户友好的错误消息

### 1. 错误消息映射

将技术错误转换为用户友好的消息：

```typescript
class ErrorMessageMapper {
  private messages: Record<string, string> = {
    USER_NOT_FOUND: '找不到该用户',
    INVALID_CREDENTIALS: '用户名或密码错误',
    NETWORK_ERROR: '网络连接失败，请检查网络设置',
    DATABASE_ERROR: '数据保存失败，请稍后重试',
    PERMISSION_DENIED: '您没有权限执行此操作',
    VALIDATION_ERROR: '输入的数据不正确',
    TIMEOUT: '操作超时，请重试',
  };

  getUserMessage(error: any): string {
    if (error.code && this.messages[error.code]) {
      return this.messages[error.code];
    }

    // 默认消息
    return '操作失败，请稍后重试';
  }

  getDetailedMessage(error: any): string {
    const userMessage = this.getUserMessage(error);

    if (error.details) {
      return `${userMessage}\n详细信息: ${error.details}`;
    }

    return userMessage;
  }
}

// 使用示例
const mapper = new ErrorMessageMapper();

try {
  await window.electronAPI.login(username, password);
} catch (error) {
  const message = mapper.getUserMessage(error);
  showNotification('error', message);
}
```

### 2. 错误通知

实现统一的错误通知系统：

```typescript
class ErrorNotifier {
  showError(error: any, options?: NotificationOptions): void {
    const message = this.getErrorMessage(error);

    // 显示通知
    this.showNotification({
      type: 'error',
      title: '错误',
      message,
      duration: options?.duration || 5000,
      actions: this.getErrorActions(error),
    });
  }

  private getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error.message) {
      return error.message;
    }

    return '发生未知错误';
  }

  private getErrorActions(error: any): NotificationAction[] {
    const actions: NotificationAction[] = [
      {
        label: '关闭',
        onClick: () => this.dismissNotification(),
      },
    ];

    // 对于可重试的错误，添加重试按钮
    if (this.isRetryable(error)) {
      actions.unshift({
        label: '重试',
        onClick: () => this.retryLastOperation(),
      });
    }

    return actions;
  }

  private isRetryable(error: any): boolean {
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE'];
    return retryableCodes.includes(error.code);
  }

  private showNotification(options: NotificationOptions): void {
    // 实现通知显示逻辑
  }

  private dismissNotification(): void {
    // 关闭通知
  }

  private retryLastOperation(): void {
    // 重试上次操作
  }
}

interface NotificationOptions {
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  onClick: () => void;
}
```

## 错误恢复最佳实践

### 1. 优雅降级

```typescript
class GracefulDegradation {
  async loadUserData(userId: string): Promise<UserData> {
    try {
      // 尝试从服务器加载
      return await this.loadFromServer(userId);
    } catch (error) {
      console.warn('从服务器加载失败，尝试缓存:', error);

      try {
        // 尝试从缓存加载
        return await this.loadFromCache(userId);
      } catch (cacheError) {
        console.warn('从缓存加载失败，使用默认数据:', cacheError);

        // 返回默认数据
        return this.getDefaultUserData();
      }
    }
  }

  private async loadFromServer(userId: string): Promise<UserData> {
    return await window.electronAPI.getUserData(userId);
  }

  private async loadFromCache(userId: string): Promise<UserData> {
    const cached = localStorage.getItem(`userData:${userId}`);
    if (!cached) {
      throw new Error('No cached data');
    }
    return JSON.parse(cached);
  }

  private getDefaultUserData(): UserData {
    return {
      id: 'unknown',
      name: '访客',
      preferences: {},
    };
  }
}
```

### 2. 事务性操作

```typescript
class TransactionalOperation {
  async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    // 保存原始状态
    const originalProfile = await this.getProfile(userId);

    try {
      // 执行更新
      await this.applyUpdates(userId, updates);

      // 验证更新
      await this.validateProfile(userId);

      // 提交更改
      await this.commitChanges(userId);
    } catch (error) {
      console.error('更新失败，回滚更改:', error);

      // 回滚到原始状态
      await this.rollback(userId, originalProfile);

      throw error;
    }
  }

  private async getProfile(userId: string): Promise<UserProfile> {
    return await window.electronAPI.getUserProfile(userId);
  }

  private async applyUpdates(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    await window.electronAPI.updateUserProfile(userId, updates);
  }

  private async validateProfile(userId: string): Promise<void> {
    const profile = await this.getProfile(userId);
    if (!this.isValidProfile(profile)) {
      throw new Error('Profile validation failed');
    }
  }

  private isValidProfile(profile: UserProfile): boolean {
    return profile.name.length > 0 && profile.email.includes('@');
  }

  private async commitChanges(userId: string): Promise<void> {
    await window.electronAPI.commitProfileChanges(userId);
  }

  private async rollback(
    userId: string,
    originalProfile: UserProfile
  ): Promise<void> {
    await window.electronAPI.updateUserProfile(userId, originalProfile);
  }
}
```

### 3. 断路器模式

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  private readonly failureThreshold = 5;
  private readonly timeout = 60000; // 1 分钟
  private readonly retryTimeout = 30000; // 30 秒

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.retryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      // 成功，重置计数器
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
      }
      this.failureCount = 0;

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        console.warn('Circuit breaker opened due to repeated failures');
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

// 使用示例
const breaker = new CircuitBreaker();

async function callExternalService(): Promise<Data> {
  return breaker.execute(() => window.electronAPI.fetchData());
}
```

## 错误处理清单

### 开发阶段
- [ ] 为所有异步操作添加错误处理
- [ ] 使用 TypeScript 严格模式捕获类型错误
- [ ] 实现输入验证和边界检查
- [ ] 添加详细的错误日志
- [ ] 编写错误场景的单元测试

### 生产阶段
- [ ] 实现全局错误处理器
- [ ] 设置错误监控和报告
- [ ] 提供用户友好的错误消息
- [ ] 实现错误恢复机制
- [ ] 定期审查错误日志

### 用户体验
- [ ] 避免显示技术性错误消息
- [ ] 提供明确的操作指引
- [ ] 实现自动重试机制
- [ ] 保存用户数据防止丢失
- [ ] 提供错误反馈渠道

## 下一步

- 查看 [调试技巧指南](./debugging.md) 了解调试方法
- 查看 [性能优化指南](./performance.md) 了解性能优化
- 查看 [类型安全指南](./type-safety.md) 了解类型安全实践
