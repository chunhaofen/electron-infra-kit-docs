# LifecycleManager API

LifecycleManager coordinates the startup and shutdown of electron-infra-kit modules.

## Class Definition

```typescript
class LifecycleManager
```

## Constructor

### `constructor(config?: LifecycleConfig)`

Creates a LifecycleManager instance.

**Parameters:**

- `config` - Optional configuration object

**Example:**

```typescript
import { LifecycleManager } from 'electron-infra-kit';

const lifecycle = new LifecycleManager({
  autoStart: true,  // Auto start
  isDevelopment: process.env.NODE_ENV === 'development'
});
```

## Configuration Options

### LifecycleConfig

```typescript
interface LifecycleConfig extends WindowManagerConfig {
  autoStart?: boolean;           // Whether to auto start (default: false)
  ipcRouter?: IpcRouter;         // Existing IpcRouter instance
  windowManager?: WindowManager; // Existing WindowManager instance
  messageBus?: MessageBus;       // Existing MessageBus instance
}
```

## Core Methods

### `startup(): Promise<void>`

Starts all services.

**Returns:**

- `Promise<void>` - Resolves when startup is complete

**Example:**

```typescript
await lifecycle.startup();
console.log('All services started');
```

### `shutdown(): Promise<void>`

Gracefully shuts down all services.

**Returns:**

- `Promise<void>` - Resolves when shutdown is complete

**Example:**

```typescript
app.on('will-quit', async () => {
  await lifecycle.shutdown();
});
```

## Properties

### `windowManager?: WindowManager`

WindowManager instance (read-only).

### `ipcRouter?: IpcRouter`

IpcRouter instance (read-only).

### `messageBus?: MessageBus`

MessageBus instance (read-only).

### `started: boolean`

Whether started (read-only).

## Complete Example

```typescript
import { app } from 'electron';
import { LifecycleManager } from 'electron-infra-kit';

const lifecycle = new LifecycleManager({
  isDevelopment: process.env.NODE_ENV === 'development',
  defaultConfig: {
    width: 1200,
    height: 800
  }
});

app.whenReady().then(async () => {
  // Start all services
  await lifecycle.startup();

  // Access modules
  const { windowManager, ipcRouter, messageBus } = lifecycle;

  // Create window
  await windowManager.create({
    name: 'main',
    loadFile: 'index.html'
  });
});

app.on('will-quit', async () => {
  await lifecycle.shutdown();
});
```

## Related Links

- [Getting Started](/en/guide/getting-started)
- [WindowManager API](./window-manager.md)
- [IpcRouter API](./ipc-router.md)
- [MessageBus API](./message-bus.md)
