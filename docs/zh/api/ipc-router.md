# IpcRouter API

IpcRouter 是 electron-infra-kit 的核心模块，提供类型安全的进程间通信（IPC）路由功能。

## 类定义

```typescript
class IpcRouter<
  Api extends Record<string, any> = Record<string, any>,
  Schema extends IpcSchema = Record<string, IpcDefinition>
>
```

## 构造函数

### `constructor(options?: { logger?: ILogger; defaultRateLimit?: RateLimitConfig })`

创建 IpcRouter 实例。

**参数：**

- `options.logger` - 可选的日志实例
- `options.defaultRateLimit` - 可选的默认限流配置

**示例：**

```typescript
import { IpcRouter } from 'electron-infra-kit';

const ipcRouter = new IpcRouter({
  logger: customLogger,
  defaultRateLimit: {
    maxRequests: 100,
    windowMs: 60000 // 1 minute
  }
});
```

## 核心方法

### 处理器管理

#### `addHandler<K extends keyof Schema>(handler: IpcHandler): void`

添加单个 IPC 处理器。

**参数：**

- `handler` - IPC 处理器实例

**示例：**

```typescript
import { IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';

// 定义处理器
const getUserHandler = new IpcHandler(
  'get-user',
  'get-user',
  (api, data: { id: string }) => {
    return api.userService.getUser(data.id);
  },
  z.object({
    id: z.string()
  })
);

// 添加处理器
ipcRouter.addHandler(getUserHandler);
```

#### `addHandlers(handlers: IpcHandler[]): void`

批量添加 IPC 处理器。

**参数：**

- `handlers` - IPC 处理器实例数组

**示例：**

```typescript
const handlers = [
  getUserHandler,
  updateUserHandler,
  deleteUserHandler
];

ipcRouter.addHandlers(handlers);
```

#### `removeHandler(name: string): void`

移除指定名称的 IPC 处理器。

**参数：**

- `name` - 处理器名称

**示例：**

```typescript
ipcRouter.removeHandler('get-user');
```

### 请求处理

#### `handle<K extends keyof Schema>(data: IpcRequest, senderId?: number | string): Promise<Response>`

处理 IPC 请求。

**参数：**

- `data` - IPC 请求对象，包含处理器名称和载荷
- `senderId` - 可选的发送者 ID（用于限流）

**返回值：**

- `Promise<Response>` - 处理器的返回值

**示例：**

```typescript
// 在主进程中处理请求
const result = await ipcRouter.handle({
  name: 'get-user',
  payload: { id: '123' }
});
```

### 依赖注入

#### `addApi(name: keyof Api, api: any): void`

注入单个 API 依赖。

**参数：**

- `name` - API 名称
- `api` - API 实例

**示例：**

```typescript
// 注入服务
ipcRouter.addApi('userService', userService);
ipcRouter.addApi('fileService', fileService);

// 在处理器中使用
const handler = new IpcHandler(
  'get-user',
  'get-user',
  (api, data) => {
    // api.userService 可用
    return api.userService.getUser(data.id);
  }
);
```

#### `addApis(apis: Partial<Api>): void`

批量注入 API 依赖。

**参数：**

- `apis` - 包含 API 实例的对象

**示例：**

```typescript
ipcRouter.addApis({
  userService,
  fileService,
  configService
});
```

### 限流控制

#### `setRateLimit(handlerName: keyof Schema, config: RateLimitConfig): void`

为特定处理器设置限流。

**参数：**

- `handlerName` - 处理器名称
- `config` - 限流配置

**示例：**

```typescript
// 限制每分钟最多 10 次请求
ipcRouter.setRateLimit('get-user', {
  maxRequests: 10,
  windowMs: 60000
});
```

#### RateLimitConfig

```typescript
interface RateLimitConfig {
  maxRequests: number;  // 最大请求数
  windowMs: number;     // 时间窗口（毫秒）
}
```

### 生命周期管理

#### `dispose(): void`

释放所有资源。

**示例：**

```typescript
app.on('will-quit', () => {
  ipcRouter.dispose();
});
```

## IpcHandler 类

### 构造函数

```typescript
new IpcHandler<Context, T, R>(
  name: string,
  event: string,
  callback: IpcHandlerCallback<Context, T, R>,
  schema?: ZodType<T>
)
```

**参数：**

- `name` - 处理器名称
- `event` - 事件名称
- `callback` - 回调函数
- `schema` - 可选的 Zod 验证模式

**示例：**

```typescript
import { IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';

const createUserHandler = new IpcHandler(
  'create-user',
  'create-user',
  async (api, data: { name: string; email: string }) => {
    // 处理逻辑
    const user = await api.userService.create(data);
    return { success: true, user };
  },
  // Zod 验证模式
  z.object({
    name: z.string().min(1),
    email: z.string().email()
  })
);
```

### 属性

#### `name: string`

处理器名称（只读）。

#### `event: string`

事件名称（只读）。

#### `callback: IpcHandlerCallback`

回调函数（只读）。

#### `schema: ZodType | undefined`

验证模式（只读）。

## 类型定义

### IpcRequest

```typescript
interface IpcRequest<T = any> {
  name: string;      // 处理器名称
  payload?: T;       // 请求载荷
}
```

### IpcHandlerCallback

```typescript
interface IpcHandlerCallback<Context, T, R> {
  (api: Context, data: T): R;
}
```

### IpcDefinition

```typescript
interface IpcDefinition<Payload = any, Response = any> {
  payload: Payload;
  response: Response;
}
```

### IpcSchema

```typescript
type IpcSchema = Record<string, IpcDefinition>;
```

## 完整示例

### 主进程

```typescript
import { app } from 'electron';
import { IpcRouter, IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';

// 创建服务
const userService = {
  async getUser(id: string) {
    // 从数据库获取用户
    return { id, name: 'John Doe', email: 'john@example.com' };
  },
  async createUser(data: { name: string; email: string }) {
    // 创建用户
    return { id: '123', ...data };
  },
  async updateUser(id: string, data: { name?: string; email?: string }) {
    // 更新用户
    return { id, ...data };
  }
};

// 创建 IpcRouter
const ipcRouter = new IpcRouter({
  defaultRateLimit: {
    maxRequests: 100,
    windowMs: 60000
  }
});

// 注入依赖
ipcRouter.addApi('userService', userService);

// 定义处理器
const getUserHandler = new IpcHandler(
  'get-user',
  'get-user',
  async (api, data: { id: string }) => {
    return await api.userService.getUser(data.id);
  },
  z.object({
    id: z.string()
  })
);

const createUserHandler = new IpcHandler(
  'create-user',
  'create-user',
  async (api, data: { name: string; email: string }) => {
    return await api.userService.createUser(data);
  },
  z.object({
    name: z.string().min(1),
    email: z.string().email()
  })
);

const updateUserHandler = new IpcHandler(
  'update-user',
  'update-user',
  async (api, data: { id: string; name?: string; email?: string }) => {
    return await api.userService.updateUser(data.id, data);
  },
  z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().email().optional()
  })
);

// 添加处理器
ipcRouter.addHandlers([
  getUserHandler,
  createUserHandler,
  updateUserHandler
]);

// 为敏感操作设置更严格的限流
ipcRouter.setRateLimit('create-user', {
  maxRequests: 10,
  windowMs: 60000
});

app.on('will-quit', () => {
  ipcRouter.dispose();
});
```

### 预加载脚本

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // 调用 IPC 处理器
  invoke: (name: string, payload?: any) => {
    return ipcRenderer.invoke('ipc-channel', { name, payload });
  }
});
```

### 渲染进程

```typescript
// 获取用户
const user = await window.api.invoke('get-user', { id: '123' });
console.log(user);

// 创建用户
const newUser = await window.api.invoke('create-user', {
  name: 'Jane Doe',
  email: 'jane@example.com'
});
console.log(newUser);

// 更新用户
const updatedUser = await window.api.invoke('update-user', {
  id: '123',
  name: 'Jane Smith'
});
console.log(updatedUser);
```

## 类型安全示例

使用 TypeScript 定义类型安全的 IPC Schema：

```typescript
import { IpcSchema, IpcDefinition } from 'electron-infra-kit';

// 定义 IPC Schema
interface MyIpcSchema extends IpcSchema {
  'get-user': IpcDefinition<
    { id: string },
    { id: string; name: string; email: string }
  >;
  'create-user': IpcDefinition<
    { name: string; email: string },
    { id: string; name: string; email: string }
  >;
  'update-user': IpcDefinition<
    { id: string; name?: string; email?: string },
    { id: string; name: string; email: string }
  >;
}

// 创建类型安全的 IpcRouter
const ipcRouter = new IpcRouter<MyApi, MyIpcSchema>();

// 现在所有的 handle 调用都是类型安全的
const user = await ipcRouter.handle({
  name: 'get-user',
  payload: { id: '123' }  // TypeScript 会验证 payload 类型
});
```

## 错误处理

IpcRouter 会自动处理错误并抛出 `IpcHandlerError`：

```typescript
import { IpcHandlerError } from 'electron-infra-kit';

try {
  const result = await ipcRouter.handle({
    name: 'get-user',
    payload: { id: '123' }
  });
} catch (error) {
  if (error instanceof IpcHandlerError) {
    console.error('Handler error:', error.handlerName, error.message);
  }
}
```

## 性能监控

IpcRouter 内置性能监控，可以通过 PerformanceMonitor 查看：

```typescript
import { PerformanceMonitor } from 'electron-infra-kit';

const perf = PerformanceMonitor.getInstance();
const measures = perf.getMeasures();

// 查看 IPC 调用的性能数据
measures.forEach(measure => {
  if (measure.name.startsWith('ipc-')) {
    console.log(`${measure.name}: ${measure.duration}ms`);
  }
});
```

## 最佳实践

### 1. 使用 Zod 验证

始终为处理器提供 Zod 验证模式：

```typescript
const handler = new IpcHandler(
  'create-user',
  'create-user',
  async (api, data) => {
    return await api.userService.create(data);
  },
  z.object({
    name: z.string().min(1),
    email: z.string().email()
  })
);
```

### 2. 依赖注入

使用依赖注入而不是直接导入服务：

```typescript
// ✅ 好的做法
ipcRouter.addApi('userService', userService);
const handler = new IpcHandler('get-user', 'get-user', (api, data) => {
  return api.userService.getUser(data.id);
});

// ❌ 不好的做法
const handler = new IpcHandler('get-user', 'get-user', (api, data) => {
  return userService.getUser(data.id);  // 直接导入
});
```

### 3. 限流保护

为敏感操作设置限流：

```typescript
ipcRouter.setRateLimit('delete-user', {
  maxRequests: 5,
  windowMs: 60000  // 每分钟最多 5 次
});
```

### 4. 错误处理

在处理器中正确处理错误：

```typescript
const handler = new IpcHandler(
  'get-user',
  'get-user',
  async (api, data) => {
    try {
      return await api.userService.getUser(data.id);
    } catch (error) {
      // 记录错误
      api.logger.error('Failed to get user:', error);
      // 抛出友好的错误消息
      throw new Error('Failed to retrieve user');
    }
  }
);
```

### 5. 类型安全

定义完整的 IPC Schema 以获得类型安全：

```typescript
interface MyIpcSchema extends IpcSchema {
  'get-user': IpcDefinition<{ id: string }, User>;
  'create-user': IpcDefinition<CreateUserDto, User>;
}

const ipcRouter = new IpcRouter<MyApi, MyIpcSchema>();
```

## 相关链接

- [快速开始](/zh/guide/getting-started)
- [IPC 路由指南](/zh/guide/core-concepts/ipc-router)
- [WindowManager API](./window-manager.md)
- [类型定义](./types.md)
