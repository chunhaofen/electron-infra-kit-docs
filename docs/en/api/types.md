# Type Definitions

All public TypeScript type definitions for electron-infra-kit.

## Window Management Types

### WindowManagerConfig

```typescript
interface WindowManagerConfig {
  defaultConfig?: BrowserWindowConstructorOptions;
  isDevelopment?: boolean;
  logger?: ILogger;
  ipcRouter?: IpcRouter;
  messageBus?: MessageBus;
  ipc?: {
    autoInit?: boolean;
    channel?: string;
    syncChannel?: string;
  };
  preventExternalLinks?: boolean;
  plugins?: WindowManagerPlugin[];
  hooks?: LifecycleHooks;
  store?: WindowStoreOptions;
}
```

### WindowCreationOptions

```typescript
interface WindowCreationOptions extends BrowserWindowConstructorOptions {
  windowId?: string;
  name?: string;
  isDevelopment?: boolean;
  loadUrl?: string;
  loadFile?: string;
  loadWindowContent?: (window: BrowserWindow) => Promise<void> | void;
  enablePersistence?: boolean;
}
```

### WindowManagerPlugin

```typescript
interface WindowManagerPlugin {
  name: string;
  onInit?(windowManager: WindowManager): void | Promise<void>;
  onWillCreate?(config: WindowCreationOptions): WindowCreationOptions | void | false;
  onDidCreate?(details: { window: BrowserWindow; id: string; name?: string }): void | Promise<void>;
  onWillDestroy?(windowId: string): void | Promise<void>;
  onDidDestroy?(windowId: string): void | Promise<void>;
}
```

### WindowManagerEvents

```typescript
interface WindowManagerEvents {
  error: (error: Error) => void;
  'window-created': (details: { window: BrowserWindow; id: string; name: string }) => void;
  'window-destroyed': (id: string) => void;
  'window-will-be-destroyed': (id: string) => void;
}
```

## IPC Types

### IpcRequest

```typescript
interface IpcRequest<T = any> {
  name: string;
  payload?: T;
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

## MessageBus Types

### MessageBusOptions

```typescript
interface MessageBusOptions {
  eventName?: string;
  logger?: ILogger;
  transportMode?: 'auto' | 'messageport' | 'ipc';
}
```

### DataChangeEvent

```typescript
type DataChangeEvent = SetEvent | DeleteEvent | ClearEvent | MessageEvent;

interface SetEvent {
  type: 'set';
  key: string;
  value: any;
  oldValue?: any;
  windowId?: string;
  timestamp?: number;
}

interface DeleteEvent {
  type: 'delete';
  key: string;
  oldValue?: any;
  windowId?: string;
  timestamp?: number;
}
```

### FieldPermission

```typescript
type FieldPermissionMode = 'read' | 'write' | 'read-write' | 'none';

interface FieldPermissionConfig {
  mode: FieldPermissionMode;
  readonly?: boolean;
  allowedWindows?: string[];
}

type FieldPermission = FieldPermissionMode | FieldPermissionConfig;
```

## Logger Types

### ILogger

```typescript
interface ILogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}
```

### LoggerOptions

```typescript
interface LoggerOptions {
  appName?: string;
  level?: string;
  file?: string;
}
```

## Error Types

### IpcHandlerError

```typescript
class IpcHandlerError extends Error {
  constructor(handlerName: string, originalError: Error);
  handlerName: string;
}
```

## Usage Examples

### Type-Safe IPC Schema

```typescript
import { IpcSchema, IpcDefinition } from 'electron-infra-kit';

interface User {
  id: string;
  name: string;
  email: string;
}

interface MyIpcSchema extends IpcSchema {
  'get-user': IpcDefinition<{ id: string }, User>;
  'create-user': IpcDefinition<Omit<User, 'id'>, User>;
  'update-user': IpcDefinition<Partial<User> & { id: string }, User>;
}

const ipcRouter = new IpcRouter<MyApi, MyIpcSchema>();
```

### Type-Safe Window Creation

```typescript
import { WindowCreationOptions } from 'electron-infra-kit';

const options: WindowCreationOptions = {
  name: 'main',
  width: 1200,
  height: 800,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true
  },
  loadFile: 'index.html'
};

await windowManager.create(options);
```

## Related Links

- [WindowManager API](./window-manager.md)
- [IpcRouter API](./ipc-router.md)
- [MessageBus API](./message-bus.md)
- [Getting Started](/en/guide/getting-started)
