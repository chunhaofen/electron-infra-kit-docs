# Type Safety Guide

## Overview

`electron-infra-kit` provides complete TypeScript type support and runtime validation to help you build type-safe Electron applications. This guide will show you how to fully leverage the toolkit's type system and avoid common type errors.

## TypeScript Type Definitions

### Core Types

The toolkit exports type definitions for all core modules:

```typescript
import type {
  WindowManagerConfig,
  WindowConfig,
  IpcRouterConfig,
  MessageBusConfig,
  ElectronToolkitConfig,
} from 'electron-infra-kit';
```

### Branded Types

Branded types are a TypeScript pattern that creates distinct types from primitive types, preventing accidental misuse:

```typescript
import { Types } from 'electron-infra-kit';

// Create branded types
const windowId: Types.WindowId = Types.createWindowId('main-window');
const eventName: Types.EventName = Types.createEventName('window-created');
const handlerName: Types.HandlerName = Types.createHandlerName('getUser');
const fieldKey: Types.FieldKey = Types.createFieldKey('theme');

// ✅ Type safe
windowManager.getWindowById(windowId);

// ❌ TypeScript error - can't pass plain string
windowManager.getWindowById('main-window');
```

**Why use branded types?**

```typescript
// Without branded types
function getWindow(id: string) {}
function getHandler(name: string) {}

const windowId = 'window-123';
const handlerName = 'getUser';

getWindow(handlerName); // ❌ Compiles but logically wrong!
getHandler(windowId);   // ❌ Compiles but logically wrong!

// With branded types
function getWindow(id: WindowId) {}
function getHandler(name: HandlerName) {}

const windowId: WindowId = createWindowId('window-123');
const handlerName: HandlerName = createHandlerName('getUser');

getWindow(handlerName); // ✅ TypeScript error!
getHandler(windowId);   // ✅ TypeScript error!
```

## Type-Safe IPC Communication

### Define Type-Safe Handlers

Create type-safe IPC handlers using generics and Zod validation:

```typescript
import { IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';

// Define input and output types
interface GetUserInput {
  id: string;
}

interface GetUserOutput {
  id: string;
  name: string;
  email: string;
}

// Define Zod validation schema
const getUserSchema = z.object({
  id: z.string().min(1),
});

// Create type-safe handler
const getUserHandler = new IpcHandler<
  { db: DatabaseAPI },  // Context type
  GetUserInput,         // Input type
  GetUserOutput         // Output type
>(
  'getUser',
  'user',
  async (context, payload) => {
    // TypeScript knows payload's type
    const user = await context.db.getUser(payload.id);
    
    // Return value must match GetUserOutput
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  },
  getUserSchema // Runtime validation
);

// Register handler
ipcRouter.addHandler(getUserHandler);
```

### Type-Safe Renderer Process Calls

Define type-safe API in preload script:

```typescript
// preload.ts
import { contextBridge } from 'electron';
import { IpcRendererBridge } from 'electron-infra-kit/preload';

// Define API types
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

Use in renderer process:

```typescript
// renderer.ts
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// ✅ Fully type safe
const user = await window.electronAPI.getUser('user-123');
console.log(user.name); // TypeScript knows user's type

// ❌ TypeScript error - parameter type mismatch
await window.electronAPI.getUser(123);
```

### Complex Data Type Validation

Use Zod for complex data validation:

```typescript
import { z } from 'zod';

// Nested object validation
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

// Union type validation
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

// Use validation schema
const handler = new IpcHandler(
  'createProject',
  'project',
  async (context, payload) => {
    // payload is already validated
    return await context.projectService.create(payload);
  },
  createProjectSchema
);
```

## Zod Validation Best Practices

### 1. Define Reusable Schemas

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

// Export types
export type User = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
```

### 2. Custom Validation Rules

```typescript
import { z } from 'zod';

// Custom validation function
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain special character');

// Custom refine
const dateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

// Async validation
const uniqueEmailSchema = z.string().email().refine(
  async (email) => {
    const exists = await checkEmailExists(email);
    return !exists;
  },
  {
    message: 'Email already in use',
  }
);
```

### 3. Error Handling

```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

try {
  const data = schema.parse(input);
  // Use validated data
} catch (error) {
  if (error instanceof z.ZodError) {
    // Format error messages
    const formattedErrors = error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));
    
    console.error('Validation failed:', formattedErrors);
  }
}

// Use safeParse to avoid throwing
const result = schema.safeParse(input);

if (result.success) {
  console.log('Validation succeeded:', result.data);
} else {
  console.error('Validation failed:', result.error.errors);
}
```

### 4. Transformations and Preprocessing

```typescript
import { z } from 'zod';

// Data transformation
const numberFromString = z.string().transform((val) => parseInt(val, 10));

// Preprocessing
const trimmedString = z.preprocess(
  (val) => (typeof val === 'string' ? val.trim() : val),
  z.string().min(1)
);

// Combined usage
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

## Type Guards

### Built-in Type Guards

```typescript
import { Types } from 'electron-infra-kit';

function processId(id: string) {
  if (Types.isWindowId(id)) {
    // TypeScript knows id is WindowId
    const window = windowManager.getWindowById(id);
  } else if (Types.isEventName(id)) {
    // TypeScript knows id is EventName
    emitter.emit(id, data);
  }
}
```

### Custom Type Guards

```typescript
// Type definitions
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

// Type guard
function isAdmin(account: Account): account is Admin {
  return account.type === 'admin';
}

// Usage
function processAccount(account: Account) {
  if (isAdmin(account)) {
    // TypeScript knows account is Admin
    console.log('Permissions:', account.permissions);
  } else {
    // TypeScript knows account is User
    console.log('Regular user:', account.name);
  }
}
```

## Practical Examples

### Example 1: Type-Safe Window Management

```typescript
import { Types } from 'electron-infra-kit';

// Define window ID constants
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

// Usage
const service = new WindowService();

// ✅ Type safe
await service.createWindow(WINDOW_IDS.MAIN, {
  name: 'main',
  width: 1024,
  height: 768,
});

// ❌ TypeScript error
await service.createWindow('main', config);
```

### Example 2: Type-Safe Event System

```typescript
import { Types } from 'electron-infra-kit';

// Define event types
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

// Usage
const emitter = new TypedEventEmitter();

// ✅ Type safe - TypeScript knows data's type
emitter.on('window-created', (data) => {
  console.log(`Window created: ${data.name}, ID: ${data.id}`);
});

// ❌ TypeScript error - data type mismatch
emitter.emit('window-created', { id: 'wrong-type' });
```

### Example 3: Type-Safe MessageBus

```typescript
import { Types } from 'electron-infra-kit';

// Define data field types
interface AppState {
  theme: 'light' | 'dark';
  language: string;
  userPreferences: {
    fontSize: number;
    autoSave: boolean;
  };
}

// Define field keys
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

// Usage
const typedBus = new TypedMessageBus(messageBus);

// ✅ Type safe
typedBus.setTheme('dark');

// ❌ TypeScript error
typedBus.setTheme('blue');
```

## Best Practices Summary

### 1. Always Use TypeScript Strict Mode

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

### 2. Define Branded Types for Constants

```typescript
// ✅ Good practice
export const WINDOW_IDS = {
  MAIN: createWindowId('main'),
  SETTINGS: createWindowId('settings'),
} as const;

// ❌ Bad practice
windowManager.getWindowById(createWindowId('main'));
```

### 3. Use Zod for Runtime Validation

```typescript
// ✅ Good practice - both types and runtime validation
const schema = z.object({
  name: z.string(),
  age: z.number(),
});

type User = z.infer<typeof schema>;

// ❌ Bad practice - only types, no runtime validation
interface User {
  name: string;
  age: number;
}
```

### 4. Create Helper Functions

```typescript
// Type conversion helper
export function toWindowId(value: unknown): Types.WindowId {
  if (typeof value !== 'string') {
    throw new Error('Window ID must be a string');
  }
  return Types.createWindowId(value);
}

// Validation helper
export function validateAndParse<T>(
  schema: z.ZodType<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
}
```

### 5. Document Type Expectations

```typescript
/**
 * Get window by ID
 * @param id - Window ID (use createWindowId to create)
 * @returns BrowserWindow instance or undefined
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

## Common Pitfalls

### Pitfall 1: Serializing Branded Types

```typescript
// Branded types are just strings at runtime
const windowId: WindowId = createWindowId('main');

// ✅ Can serialize normally
const json = JSON.stringify({ windowId });

// ⚠️ Need to recreate branded type when deserializing
const data = JSON.parse(json);
const id: WindowId = createWindowId(data.windowId);
```

### Pitfall 2: Interfacing with External APIs

```typescript
// External API expects plain string
declare function externalApi(id: string): void;

const windowId: WindowId = createWindowId('main');

// ✅ Branded types are compatible with string
externalApi(windowId);

// But need to convert when receiving
const receivedId: string = externalApi.getId();
const typedId: WindowId = createWindowId(receivedId);
```

### Pitfall 3: Overusing any

```typescript
// ❌ Bad practice
const handler = new IpcHandler('getData', 'data', async (ctx, payload: any) => {
  return payload.data; // Lost type safety
});

// ✅ Good practice
interface GetDataPayload {
  key: string;
}

const handler = new IpcHandler<Context, GetDataPayload, any>(
  'getData',
  'data',
  async (ctx, payload) => {
    // payload has type
    return ctx.store.get(payload.key);
  },
  z.object({ key: z.string() })
);
```

## Next Steps

- Check out [Performance Optimization Guide](./performance.md) to learn how to optimize application performance
- Check out [Error Handling Guide](./error-handling.md) to learn error handling best practices
- Check out [API Reference](/en/api/index.md) for complete API documentation
