# IpcRouter API

IpcRouter is a core module of electron-infra-kit that provides type-safe inter-process communication (IPC) routing functionality.

## Class Definition

```typescript
class IpcRouter<
  Api extends Record<string, any> = Record<string, any>,
  Schema extends IpcSchema = Record<string, IpcDefinition>
>
```

## Constructor

### `constructor(options?: { logger?: ILogger; defaultRateLimit?: RateLimitConfig })`

Creates an IpcRouter instance.

**Parameters:**

- `options.logger` - Optional logger instance
- `options.defaultRateLimit` - Optional default rate limit configuration

**Example:**

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

## Core Methods

### Handler Management

#### `addHandler<K extends keyof Schema>(handler: IpcHandler): void`

Adds a single IPC handler.

**Parameters:**

- `handler` - IPC handler instance

**Example:**

```typescript
import { IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';

// Define handler
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

// Add handler
ipcRouter.addHandler(getUserHandler);
```

#### `addHandlers(handlers: IpcHandler[]): void`

Adds multiple IPC handlers in batch.

**Parameters:**

- `handlers` - Array of IPC handler instances

**Example:**

```typescript
const handlers = [
  getUserHandler,
  updateUserHandler,
  deleteUserHandler
];

ipcRouter.addHandlers(handlers);
```

#### `removeHandler(name: string): void`

Removes IPC handler by name.

**Parameters:**

- `name` - Handler name

**Example:**

```typescript
ipcRouter.removeHandler('get-user');
```

### Request Handling

#### `handle<K extends keyof Schema>(data: IpcRequest, senderId?: number | string): Promise<Response>`

Handles IPC request.

**Parameters:**

- `data` - IPC request object containing handler name and payload
- `senderId` - Optional sender ID (for rate limiting)

**Returns:**

- `Promise<Response>` - Handler return value

**Example:**

```typescript
// Handle request in main process
const result = await ipcRouter.handle({
  name: 'get-user',
  payload: { id: '123' }
});
```

### Dependency Injection

#### `addApi(name: keyof Api, api: any): void`

Injects a single API dependency.

**Parameters:**

- `name` - API name
- `api` - API instance

**Example:**

```typescript
// Inject services
ipcRouter.addApi('userService', userService);
ipcRouter.addApi('fileService', fileService);

// Use in handler
const handler = new IpcHandler(
  'get-user',
  'get-user',
  (api, data) => {
    // api.userService is available
    return api.userService.getUser(data.id);
  }
);
```

#### `addApis(apis: Partial<Api>): void`

Injects multiple API dependencies in batch.

**Parameters:**

- `apis` - Object containing API instances

**Example:**

```typescript
ipcRouter.addApis({
  userService,
  fileService,
  configService
});
```

### Rate Limiting

#### `setRateLimit(handlerName: keyof Schema, config: RateLimitConfig): void`

Sets rate limit for specific handler.

**Parameters:**

- `handlerName` - Handler name
- `config` - Rate limit configuration

**Example:**

```typescript
// Limit to 10 requests per minute
ipcRouter.setRateLimit('get-user', {
  maxRequests: 10,
  windowMs: 60000
});
```

#### RateLimitConfig

```typescript
interface RateLimitConfig {
  maxRequests: number;  // Maximum number of requests
  windowMs: number;     // Time window in milliseconds
}
```

### Lifecycle Management

#### `dispose(): void`

Releases all resources.

**Example:**

```typescript
app.on('will-quit', () => {
  ipcRouter.dispose();
});
```

## IpcHandler Class

### Constructor

```typescript
new IpcHandler<Context, T, R>(
  name: string,
  event: string,
  callback: IpcHandlerCallback<Context, T, R>,
  schema?: ZodType<T>
)
```

**Parameters:**

- `name` - Handler name
- `event` - Event name
- `callback` - Callback function
- `schema` - Optional Zod validation schema

**Example:**

```typescript
import { IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';

const createUserHandler = new IpcHandler(
  'create-user',
  'create-user',
  async (api, data: { name: string; email: string }) => {
    // Handler logic
    const user = await api.userService.create(data);
    return { success: true, user };
  },
  // Zod validation schema
  z.object({
    name: z.string().min(1),
    email: z.string().email()
  })
);
```

### Properties

#### `name: string`

Handler name (read-only).

#### `event: string`

Event name (read-only).

#### `callback: IpcHandlerCallback`

Callback function (read-only).

#### `schema: ZodType | undefined`

Validation schema (read-only).

## Type Definitions

### IpcRequest

```typescript
interface IpcRequest<T = any> {
  name: string;      // Handler name
  payload?: T;       // Request payload
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

## Complete Example

### Main Process

```typescript
import { app } from 'electron';
import { IpcRouter, IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';

// Create service
const userService = {
  async getUser(id: string) {
    // Get user from database
    return { id, name: 'John Doe', email: 'john@example.com' };
  },
  async createUser(data: { name: string; email: string }) {
    // Create user
    return { id: '123', ...data };
  },
  async updateUser(id: string, data: { name?: string; email?: string }) {
    // Update user
    return { id, ...data };
  }
};

// Create IpcRouter
const ipcRouter = new IpcRouter({
  defaultRateLimit: {
    maxRequests: 100,
    windowMs: 60000
  }
});

// Inject dependencies
ipcRouter.addApi('userService', userService);

// Define handlers
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

// Add handlers
ipcRouter.addHandlers([
  getUserHandler,
  createUserHandler,
  updateUserHandler
]);

// Set stricter rate limit for sensitive operations
ipcRouter.setRateLimit('create-user', {
  maxRequests: 10,
  windowMs: 60000
});

app.on('will-quit', () => {
  ipcRouter.dispose();
});
```

### Preload Script

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Call IPC handler
  invoke: (name: string, payload?: any) => {
    return ipcRenderer.invoke('ipc-channel', { name, payload });
  }
});
```

### Renderer Process

```typescript
// Get user
const user = await window.api.invoke('get-user', { id: '123' });
console.log(user);

// Create user
const newUser = await window.api.invoke('create-user', {
  name: 'Jane Doe',
  email: 'jane@example.com'
});
console.log(newUser);

// Update user
const updatedUser = await window.api.invoke('update-user', {
  id: '123',
  name: 'Jane Smith'
});
console.log(updatedUser);
```

## Type Safety Example

Define type-safe IPC Schema using TypeScript:

```typescript
import { IpcSchema, IpcDefinition } from 'electron-infra-kit';

// Define IPC Schema
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

// Create type-safe IpcRouter
const ipcRouter = new IpcRouter<MyApi, MyIpcSchema>();

// Now all handle calls are type-safe
const user = await ipcRouter.handle({
  name: 'get-user',
  payload: { id: '123' }  // TypeScript validates payload type
});
```

## Error Handling

IpcRouter automatically handles errors and throws `IpcHandlerError`:

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

## Performance Monitoring

IpcRouter has built-in performance monitoring accessible via PerformanceMonitor:

```typescript
import { PerformanceMonitor } from 'electron-infra-kit';

const perf = PerformanceMonitor.getInstance();
const measures = perf.getMeasures();

// View IPC call performance data
measures.forEach(measure => {
  if (measure.name.startsWith('ipc-')) {
    console.log(`${measure.name}: ${measure.duration}ms`);
  }
});
```

## Best Practices

### 1. Use Zod Validation

Always provide Zod validation schema for handlers:

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

### 2. Dependency Injection

Use dependency injection instead of direct imports:

```typescript
// ✅ Good practice
ipcRouter.addApi('userService', userService);
const handler = new IpcHandler('get-user', 'get-user', (api, data) => {
  return api.userService.getUser(data.id);
});

// ❌ Bad practice
const handler = new IpcHandler('get-user', 'get-user', (api, data) => {
  return userService.getUser(data.id);  // Direct import
});
```

### 3. Rate Limiting

Set rate limits for sensitive operations:

```typescript
ipcRouter.setRateLimit('delete-user', {
  maxRequests: 5,
  windowMs: 60000  // Max 5 times per minute
});
```

### 4. Error Handling

Handle errors properly in handlers:

```typescript
const handler = new IpcHandler(
  'get-user',
  'get-user',
  async (api, data) => {
    try {
      return await api.userService.getUser(data.id);
    } catch (error) {
      // Log error
      api.logger.error('Failed to get user:', error);
      // Throw friendly error message
      throw new Error('Failed to retrieve user');
    }
  }
);
```

### 5. Type Safety

Define complete IPC Schema for type safety:

```typescript
interface MyIpcSchema extends IpcSchema {
  'get-user': IpcDefinition<{ id: string }, User>;
  'create-user': IpcDefinition<CreateUserDto, User>;
}

const ipcRouter = new IpcRouter<MyApi, MyIpcSchema>();
```

## Related Links

- [Getting Started](/en/guide/getting-started)
- [IPC Router Guide](/en/guide/core-concepts/ipc-router)
- [WindowManager API](./window-manager.md)
- [Type Definitions](./types.md)
