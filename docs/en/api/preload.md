# Preload API

Preload script APIs for safely accessing main process functionality in the renderer process.

## IpcRendererBridge

Renderer process IPC bridge providing type-safe IPC calls.

### Usage

In preload script:

```typescript
import { contextBridge } from 'electron';
import { IpcRendererBridge } from 'electron-infra-kit/preload';

const bridge = new IpcRendererBridge({
  channel: 'renderer-to-main'
});

contextBridge.exposeInMainWorld('api', {
  invoke: (name: string, payload?: any) => bridge.invoke(name, payload)
});
```

### Methods

#### `invoke(name: string, payload?: any): Promise<any>`

Invokes main process IPC handler.

**Parameters:**

- `name` - Handler name
- `payload` - Optional payload data

**Returns:**

- `Promise<any>` - Handler return value

**Example:**

```typescript
// In renderer process
const user = await window.api.invoke('get-user', { id: '123' });
```

## setupMessageBus

Renderer process MessageBus setup function.

### Usage

In preload script:

```typescript
import { contextBridge } from 'electron';
import { setupMessageBus } from 'electron-infra-kit/preload';

const messageBusApi = setupMessageBus();

contextBridge.exposeInMainWorld('messageBus', messageBusApi);
```

### Returned API

#### `getData(key?: string): Promise<any>`

Gets data.

**Example:**

```typescript
const theme = await window.messageBus.getData('theme');
```

#### `setData(key: string, value: any): Promise<void>`

Sets data.

**Example:**

```typescript
await window.messageBus.setData('theme', 'dark');
```

#### `watch(key: string, callback: (newValue: any, oldValue: any) => void): () => void`

Watches data changes.

**Example:**

```typescript
const unsubscribe = window.messageBus.watch('theme', (newValue, oldValue) => {
  console.log(`Theme changed from ${oldValue} to ${newValue}`);
});

// Unsubscribe
unsubscribe();
```

#### `onMessage(channel: string, callback: (data: any) => void): () => void`

Listens to messages.

**Example:**

```typescript
const unsubscribe = window.messageBus.onMessage('notification', (data) => {
  console.log('Notification:', data);
});
```

## Complete Example

### Preload Script

```typescript
import { contextBridge } from 'electron';
import { IpcRendererBridge, setupMessageBus } from 'electron-infra-kit/preload';

// IPC Bridge
const ipcBridge = new IpcRendererBridge({
  channel: 'renderer-to-main'
});

// MessageBus
const messageBusApi = setupMessageBus();

// Expose to renderer process
contextBridge.exposeInMainWorld('api', {
  // IPC calls
  invoke: (name: string, payload?: any) => ipcBridge.invoke(name, payload),
  
  // MessageBus
  messageBus: messageBusApi
});
```

### Renderer Process

```typescript
// IPC call
const user = await window.api.invoke('get-user', { id: '123' });
console.log('User:', user);

// MessageBus - Get data
const theme = await window.api.messageBus.getData('theme');
console.log('Theme:', theme);

// MessageBus - Set data
await window.api.messageBus.setData('theme', 'dark');

// MessageBus - Watch data changes
const unsubscribe = window.api.messageBus.watch('theme', (newValue) => {
  document.body.className = newValue;
});

// MessageBus - Listen to messages
const unsubscribeMsg = window.api.messageBus.onMessage('notification', (data) => {
  showNotification(data);
});

// Cleanup
window.addEventListener('beforeunload', () => {
  unsubscribe();
  unsubscribeMsg();
});
```

### TypeScript Type Definitions

```typescript
// global.d.ts
interface Window {
  api: {
    invoke: (name: string, payload?: any) => Promise<any>;
    messageBus: {
      getData: (key?: string) => Promise<any>;
      setData: (key: string, value: any) => Promise<void>;
      watch: (key: string, callback: (newValue: any, oldValue: any) => void) => () => void;
      onMessage: (channel: string, callback: (data: any) => void) => () => void;
    };
  };
}
```

## Security Considerations

1. **Always use contextBridge**: Don't directly expose Electron APIs to renderer process
2. **Validate input**: Validate all input from renderer process in main process
3. **Principle of least privilege**: Only expose necessary APIs
4. **Type safety**: Use TypeScript to ensure type safety

## Related Links

- [Getting Started](/en/guide/getting-started)
- [IPC Router Guide](/en/guide/core-concepts/ipc-router)
- [MessageBus Guide](/en/guide/core-concepts/message-bus)
- [Type Safety](/en/guide/advanced/type-safety)
