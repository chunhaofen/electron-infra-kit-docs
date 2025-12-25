# 类型安全指南

## 概述

`electron-infra-kit` 提供了完整的 TypeScript 类型支持和运行时验证，帮助你构建类型安全的 Electron 应用。本指南将介绍如何充分利用工具包的类型系统，避免常见的类型错误。

## TypeScript 类型定义

### 核心类型

工具包导出了所有核心模块的类型定义：

```typescript
import type {
  WindowManagerConfig,
  WindowConfig,
  IpcRouterConfig,
  MessageBusConfig,
  ElectronToolkitConfig,
} from 'electron-infra-kit';
```

### 品牌类型（Branded Types）

品牌类型是一种 TypeScript 模式，用于创建与原始类型不同的独特类型，防止意外误用：

```typescript
import { Types } from 'electron-infra-kit';

// 创建品牌类型
const windowId: Types.WindowId = Types.createWindowId('main-window');
const eventName: Types.EventName = Types.createEventName('window-created');
const handlerName: Types.HandlerName = Types.createHandlerName('getUser');
const fieldKey: Types.FieldKey = Types.createFieldKey('theme');

// ✅ 类型安全
windowManager.getWindowById(windowId);

// ❌ TypeScript 错误 - 不能传递普通字符串
windowManager.getWindowById('main-window');
```

**为什么使用品牌类型？**

```typescript
// 没有品牌类型
function getWindow(id: string) {}
function getHandler(name: string) {}

const windowId = 'window-123';
const handlerName = 'getUser';

getWindow(handlerName); // ❌ 编译通过但逻辑错误！
getHandler(windowId);   // ❌ 编译通过但逻辑错误！

// 使用品牌类型
function getWindow(id: WindowId) {}
function getHandler(name: HandlerName) {}

const windowId: WindowId = createWindowId('window-123');
const handlerName: HandlerName = createHandlerName('getUser');

getWindow(handlerName); // ✅ TypeScript 错误！
getHandler(windowId);   // ✅ TypeScript 错误！
```

## 类型安全的 IPC 通信

### 定义类型安全的处理器

使用泛型和 Zod 验证创建类型安全的 IPC 处理器：

```typescript
import { IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';

// 定义输入和输出类型
interface GetUserInput {
  id: string;
}

interface GetUserOutput {
  id: string;
  name: string;
  email: string;
}

// 定义 Zod 验证模式
const getUserSchema = z.object({
  id: z.string().min(1),
});

// 创建类型安全的处理器
const getUserHandler = new IpcHandler<
  { db: DatabaseAPI },  // Context 类型
  GetUserInput,         // 输入类型
  GetUserOutput         // 输出类型
>(
  'getUser',
  'user',
  async (context, payload) => {
    // TypeScript 知道 payload 的类型
    const user = await context.db.getUser(payload.id);
    
    // 返回值必须匹配 GetUserOutput
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  },
  getUserSchema // 运行时验证
);

// 注册处理器
ipcRouter.addHandler(getUserHandler);
```

### 渲染进程类型安全调用

在预加载脚本中定义类型安全的 API：

```typescript
// preload.ts
import { contextBridge } from 'electron';
import { IpcRendererBridge } from 'electron-infra-kit/preload';

// 定义 API 类型
interface ElectronAPI {
  getUser: (id: string) => Promise<GetUserOutput>;
  updateUser: (data: UpdateUserInput) => Promise<void>;
}

const bridge = new IpcRendererBridge();

const api: ElectronAPI = {
  getUser: (id) => bridge.invoke('getUser', { id }),
  updateUser: (data) => bridge.invoke('updateUser', data),
};

contextBridge.exposeInMainWorld('electronAPI', api);
```

在渲染进程中使用：

```typescript
// renderer.ts
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// ✅ 完全类型安全
const user = await window.electronAPI.getUser('user-123');
console.log(user.name); // TypeScript 知道 user 的类型

// ❌ TypeScript 错误 - 参数类型不匹配
await window.electronAPI.getUser(123);
```

### 复杂数据类型验证

使用 Zod 进行复杂的数据验证：

```typescript
import { z } from 'zod';

// 嵌套对象验证
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  settings: z.object({
    theme: z.enum(['light', 'dark']),
    language: z.string(),
    features: z.array(z.string()),
  }),
  metadata: z.record(z.string(), z.any()),
});

// 联合类型验证
const messageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    content: z.string(),
  }),
  z.object({
    type: z.literal('image'),
    url: z.string().url(),
    alt: z.string().optional(),
  }),
  z.object({
    type: z.literal('file'),
    path: z.string(),
    size: z.number(),
  }),
]);

// 使用验证模式
const handler = new IpcHandler(
  'createProject',
  'project',
  async (context, payload) => {
    // payload 已经通过验证
    return await context.projectService.create(payload);
  },
  createProjectSchema
);
```

## Zod 验证最佳实践

### 1. 定义可复用的模式

```typescript
// schemas/user.schema.ts
import { z } from 'zod';

export const UserIdSchema = z.string().uuid();

export const UserSchema = z.object({
  id: UserIdSchema,
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.date(),
});

export const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true });

export const UpdateUserSchema = UserSchema.partial().required({ id: true });

// 导出类型
export type User = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
```

### 2. 自定义验证规则

```typescript
import { z } from 'zod';

// 自定义验证函数
const passwordSchema = z
  .string()
  .min(8, '密码至少 8 个字符')
  .regex(/[A-Z]/, '密码必须包含大写字母')
  .regex(/[a-z]/, '密码必须包含小写字母')
  .regex(/[0-9]/, '密码必须包含数字')
  .regex(/[^A-Za-z0-9]/, '密码必须包含特殊字符');

// 自定义 refine
const dateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: '结束日期必须晚于开始日期',
    path: ['endDate'],
  });

// 异步验证
const uniqueEmailSchema = z.string().email().refine(
  async (email) => {
    const exists = await checkEmailExists(email);
    return !exists;
  },
  {
    message: '邮箱已被使用',
  }
);
```

### 3. 错误处理

```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

try {
  const data = schema.parse(input);
  // 使用验证后的数据
} catch (error) {
  if (error instanceof z.ZodError) {
    // 格式化错误信息
    const formattedErrors = error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));
    
    console.error('验证失败:', formattedErrors);
  }
}

// 使用 safeParse 避免抛出异常
const result = schema.safeParse(input);

if (result.success) {
  console.log('验证成功:', result.data);
} else {
  console.error('验证失败:', result.error.errors);
}
```

### 4. 转换和预处理

```typescript
import { z } from 'zod';

// 数据转换
const numberFromString = z.string().transform((val) => parseInt(val, 10));

// 预处理
const trimmedString = z.preprocess(
  (val) => (typeof val === 'string' ? val.trim() : val),
  z.string().min(1)
);

// 组合使用
const userInputSchema = z.object({
  name: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(1).max(100)
  ),
  age: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(0).max(150)
  ),
});
```

## 类型守卫（Type Guards）

### 内置类型守卫

```typescript
import { Types } from 'electron-infra-kit';

function processId(id: string) {
  if (Types.isWindowId(id)) {
    // TypeScript 知道 id 是 WindowId
    const window = windowManager.getWindowById(id);
  } else if (Types.isEventName(id)) {
    // TypeScript 知道 id 是 EventName
    emitter.emit(id, data);
  }
}
```

### 自定义类型守卫

```typescript
// 类型定义
interface User {
  type: 'user';
  id: string;
  name: string;
}

interface Admin {
  type: 'admin';
  id: string;
  name: string;
  permissions: string[];
}

type Account = User | Admin;

// 类型守卫
function isAdmin(account: Account): account is Admin {
  return account.type === 'admin';
}

// 使用
function processAccount(account: Account) {
  if (isAdmin(account)) {
    // TypeScript 知道 account 是 Admin
    console.log('权限:', account.permissions);
  } else {
    // TypeScript 知道 account 是 User
    console.log('普通用户:', account.name);
  }
}
```

## 实用示例

### 示例 1: 类型安全的窗口管理

```typescript
import { Types } from 'electron-infra-kit';

// 定义窗口 ID 常量
const WINDOW_IDS = {
  MAIN: Types.createWindowId('main'),
  SETTINGS: Types.createWindowId('settings'),
  ABOUT: Types.createWindowId('about'),
} as const;

class WindowService {
  private windows = new Map<Types.WindowId, BrowserWindow>();

  async createWindow(
    id: Types.WindowId,
    config: WindowConfig
  ): Promise<void> {
    const window = await windowManager.create(config);
    this.windows.set(id, window);
  }

  getWindow(id: Types.WindowId): BrowserWindow | undefined {
    return this.windows.get(id);
  }

  closeWindow(id: Types.WindowId): void {
    const window = this.windows.get(id);
    window?.close();
    this.windows.delete(id);
  }
}

// 使用
const service = new WindowService();

// ✅ 类型安全
await service.createWindow(WINDOW_IDS.MAIN, {
  name: 'main',
  width: 1024,
  height: 768,
});

// ❌ TypeScript 错误
await service.createWindow('main', config);
```

### 示例 2: 类型安全的事件系统

```typescript
import { Types } from 'electron-infra-kit';

// 定义事件类型
interface WindowEvents {
  'window-created': { id: Types.WindowId; name: string };
  'window-closed': { id: Types.WindowId };
  'data-updated': { key: string; value: any };
}

type EventName = keyof WindowEvents;

class TypedEventEmitter {
  private handlers = new Map<EventName, Function[]>();

  on<K extends EventName>(
    event: K,
    handler: (data: WindowEvents[K]) => void
  ): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  emit<K extends EventName>(event: K, data: WindowEvents[K]): void {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach((handler) => handler(data));
  }
}

// 使用
const emitter = new TypedEventEmitter();

// ✅ 类型安全 - TypeScript 知道 data 的类型
emitter.on('window-created', (data) => {
  console.log(`窗口创建: ${data.name}, ID: ${data.id}`);
});

// ❌ TypeScript 错误 - 数据类型不匹配
emitter.emit('window-created', { id: 'wrong-type' });
```

### 示例 3: 类型安全的 MessageBus

```typescript
import { Types } from 'electron-infra-kit';

// 定义数据字段类型
interface AppState {
  theme: 'light' | 'dark';
  language: string;
  userPreferences: {
    fontSize: number;
    autoSave: boolean;
  };
}

// 定义字段键
const FIELDS = {
  THEME: Types.createFieldKey<AppState['theme']>('theme'),
  LANGUAGE: Types.createFieldKey<AppState['language']>('language'),
  USER_PREFERENCES: Types.createFieldKey<AppState['userPreferences']>(
    'userPreferences'
  ),
} as const;

class TypedMessageBus {
  constructor(private messageBus: MessageBus) {}

  setTheme(theme: AppState['theme']): void {
    this.messageBus.setData(FIELDS.THEME, theme);
  }

  getTheme(): AppState['theme'] {
    return this.messageBus.getData(FIELDS.THEME) || 'light';
  }

  watchTheme(callback: (theme: AppState['theme']) => void): () => void {
    return this.messageBus.watch(FIELDS.THEME, callback);
  }
}

// 使用
const typedBus = new TypedMessageBus(messageBus);

// ✅ 类型安全
typedBus.setTheme('dark');

// ❌ TypeScript 错误
typedBus.setTheme('blue');
```

## 最佳实践总结

### 1. 始终使用 TypeScript 严格模式

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true,
    "noImplicitThis": true
  }
}
```

### 2. 为常量定义品牌类型

```typescript
// ✅ 好的做法
export const WINDOW_IDS = {
  MAIN: createWindowId('main'),
  SETTINGS: createWindowId('settings'),
} as const;

// ❌ 不好的做法
windowManager.getWindowById(createWindowId('main'));
```

### 3. 使用 Zod 进行运行时验证

```typescript
// ✅ 好的做法 - 同时有类型和运行时验证
const schema = z.object({
  name: z.string(),
  age: z.number(),
});

type User = z.infer<typeof schema>;

// ❌ 不好的做法 - 只有类型，没有运行时验证
interface User {
  name: string;
  age: number;
}
```

### 4. 创建辅助函数

```typescript
// 类型转换辅助函数
export function toWindowId(value: unknown): Types.WindowId {
  if (typeof value !== 'string') {
    throw new Error('Window ID 必须是字符串');
  }
  return Types.createWindowId(value);
}

// 验证辅助函数
export function validateAndParse<T>(
  schema: z.ZodType<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`验证失败: ${result.error.message}`);
  }
  return result.data;
}
```

### 5. 文档化类型期望

```typescript
/**
 * 根据 ID 获取窗口
 * @param id - 窗口 ID (使用 createWindowId 创建)
 * @returns BrowserWindow 实例或 undefined
 * @example
 * ```typescript
 * const id = createWindowId('main');
 * const window = getWindow(id);
 * ```
 */
function getWindow(id: Types.WindowId): BrowserWindow | undefined {
  return windows.get(id);
}
```

## 常见陷阱

### 陷阱 1: 品牌类型的序列化

```typescript
// 品牌类型在运行时只是字符串
const windowId: WindowId = createWindowId('main');

// ✅ 可以正常序列化
const json = JSON.stringify({ windowId });

// ⚠️ 反序列化时需要重新创建品牌类型
const data = JSON.parse(json);
const id: WindowId = createWindowId(data.windowId);
```

### 陷阱 2: 与外部 API 交互

```typescript
// 外部 API 期望普通字符串
declare function externalApi(id: string): void;

const windowId: WindowId = createWindowId('main');

// ✅ 品牌类型兼容字符串
externalApi(windowId);

// 但接收时需要转换
const receivedId: string = externalApi.getId();
const typedId: WindowId = createWindowId(receivedId);
```

### 陷阱 3: 过度使用 any

```typescript
// ❌ 不好的做法
const handler = new IpcHandler('getData', 'data', async (ctx, payload: any) => {
  return payload.data; // 失去类型安全
});

// ✅ 好的做法
interface GetDataPayload {
  key: string;
}

const handler = new IpcHandler<Context, GetDataPayload, any>(
  'getData',
  'data',
  async (ctx, payload) => {
    // payload 有类型
    return ctx.store.get(payload.key);
  },
  z.object({ key: z.string() })
);
```

## 下一步

- 查看 [性能优化指南](./performance.md) 了解如何优化应用性能
- 查看 [错误处理指南](./error-handling.md) 了解错误处理最佳实践
- 查看 [API 参考](/zh/api/index.md) 了解完整的 API 文档
