# MessageBus API

MessageBus is a core module of electron-infra-kit that provides cross-window state synchronization and messaging functionality.

## Class Definition

```typescript
class MessageBus extends EventEmitter
```

## Constructor

### `constructor(options?: MessageBusOptions)`

Creates a MessageBus instance.

**Parameters:**

- `options` - Optional configuration object

**Example:**

```typescript
import { MessageBus } from 'electron-infra-kit';

const messageBus = new MessageBus({
  logger: customLogger,
  transportMode: 'messageport',  // or 'ipc' or 'auto'
  eventName: 'custom-state-changed'
});
```

## Configuration Options

### MessageBusOptions

```typescript
interface MessageBusOptions {
  eventName?: string;           // Custom state change event name (default: 'window-state-changed')
  logger?: ILogger;             // Logger instance
  transportMode?: 'auto' | 'messageport' | 'ipc';  // Transport mode (default: 'auto')
}
```

**Field Descriptions:**

- `eventName` - Custom state change event name
- `logger` - Custom logger instance
- `transportMode` - Transport mode:
  - `'auto'` - Auto select (prefers MessagePort)
  - `'messageport'` - Use MessagePort transport
  - `'ipc'` - Use IPC transport

## Core Methods

### Window Registration

#### `registerWindow(windowId: string, window: BrowserWindow): void`

Registers window to MessageBus.

**Parameters:**

- `windowId` - Window ID
- `window` - BrowserWindow instance

**Example:**

```typescript
messageBus.registerWindow('main-window', mainWindow);
```

#### `unregisterWindow(windowId: string): void`

Unregisters window from MessageBus.

**Parameters:**

- `windowId` - Window ID

**Example:**

```typescript
messageBus.unregisterWindow('main-window');
```

#### `autoRegisterWindows(windowManager: WindowManager): void`

Automatically registers/unregisters windows with WindowManager.

**Parameters:**

- `windowManager` - WindowManager instance

**Example:**

```typescript
messageBus.autoRegisterWindows(windowManager);
```

### Data Management

#### `getData(key?: string): any`

Gets data.

**Parameters:**

- `key` - Optional data key, returns all data if not provided

**Returns:**

- `any` - Data value or all data

**Example:**

```typescript
// Get specific key data
const user = messageBus.getData('user');

// Get all data
const allData = messageBus.getData();
```

#### `setData(key: string, value: any, windowId?: string, eventName?: string): { success: boolean; error?: string }`

Sets data.

**Parameters:**

- `key` - Data key
- `value` - Data value
- `windowId` - Optional operation window ID
- `eventName` - Optional event name

**Returns:**

- `{ success: boolean; error?: string }` - Operation result

**Example:**

```typescript
// Set data
const result = messageBus.setData('user', {
  id: '123',
  name: 'John Doe'
});

if (result.success) {
  console.log('Data set successfully');
} else {
  console.error('Failed to set data:', result.error);
}
```

#### `deleteData(key: string, windowId?: string, eventName?: string): { success: boolean; error?: string }`

Deletes data.

**Parameters:**

- `key` - Data key
- `windowId` - Optional operation window ID
- `eventName` - Optional event name

**Returns:**

- `{ success: boolean; error?: string }` - Operation result

**Example:**

```typescript
const result = messageBus.deleteData('user');
```

#### `updateData(key: string, updater: (oldVal: any) => any, windowId?: string): { success: boolean; error?: string }`

Atomically updates data.

**Parameters:**

- `key` - Data key
- `updater` - Update function or new value
- `windowId` - Optional window ID

**Returns:**

- `{ success: boolean; error?: string }` - Operation result

**Example:**

```typescript
// Using update function
messageBus.updateData('counter', (oldValue) => (oldValue || 0) + 1);

// Direct new value
messageBus.updateData('user', { id: '123', name: 'Jane Doe' });
```

### Data Watching

#### `watch(key: string, callback: (newValue: any, oldValue: any) => void, windowId?: string): () => void`

Watches data changes (main process).

**Parameters:**

- `key` - Data key to watch
- `callback` - Callback function
- `windowId` - Optional window ID for lifecycle binding

**Returns:**

- `() => void` - Unsubscribe function

**⚠️ Important:** Must call the returned unsubscribe function to prevent memory leaks.

**Example:**

```typescript
// Watch user data changes
const unsubscribe = messageBus.watch('user', (newValue, oldValue) => {
  console.log('User changed:', oldValue, '->', newValue);
});

// Later unsubscribe
unsubscribe();

// Bind to window lifecycle
const unsubscribe2 = messageBus.watch('theme', (newValue) => {
  console.log('Theme changed:', newValue);
}, 'main-window');  // Auto unsubscribe when window is destroyed
```

### Permission Control

#### `setFieldPermission(key: string, permission: FieldPermission): void`

Sets field permission.

**Parameters:**

- `key` - Data key
- `permission` - Permission configuration

**Example:**

```typescript
// Simple permission mode
messageBus.setFieldPermission('config', 'read');  // Read-only

// Detailed permission config
messageBus.setFieldPermission('user', {
  mode: 'read-write',
  allowedWindows: ['main-window', 'settings-window']
});
```

#### FieldPermission

```typescript
type FieldPermissionMode = 'read' | 'write' | 'read-write' | 'none';

interface FieldPermissionConfig {
  mode: FieldPermissionMode;
  readonly?: boolean;
  allowedWindows?: string[];
}

type FieldPermission = FieldPermissionMode | FieldPermissionConfig;
```

### Transaction Support

#### `startTransaction(windowId: string): void`

Starts a transaction.

**Parameters:**

- `windowId` - Window ID

**Example:**

```typescript
messageBus.startTransaction('main-window');
```

#### `commitTransaction(windowId: string): void`

Commits a transaction.

**Parameters:**

- `windowId` - Window ID

**Example:**

```typescript
messageBus.commitTransaction('main-window');
```

#### `rollbackTransaction(windowId: string): void`

Rolls back a transaction.

**Parameters:**

- `windowId` - Window ID

**Example:**

```typescript
messageBus.rollbackTransaction('main-window');
```

**Complete Transaction Example:**

```typescript
const windowId = 'main-window';

try {
  // Start transaction
  messageBus.startTransaction(windowId);
  
  // Perform multiple operations
  messageBus.setData('user.name', 'John', windowId);
  messageBus.setData('user.email', 'john@example.com', windowId);
  messageBus.setData('user.age', 30, windowId);
  
  // Commit transaction
  messageBus.commitTransaction(windowId);
} catch (error) {
  // Rollback on error
  messageBus.rollbackTransaction(windowId);
  console.error('Transaction failed:', error);
}
```

### Subscription Management

#### `subscribe(windowId: string, keys: string[]): void`

Subscribes to specific keys.

**Parameters:**

- `windowId` - Window ID
- `keys` - Keys to subscribe to

**Example:**

```typescript
messageBus.subscribe('main-window', ['user', 'theme', 'config']);
```

#### `unsubscribe(windowId: string, keys: string[]): void`

Unsubscribes from specific keys.

**Parameters:**

- `windowId` - Window ID
- `keys` - Keys to unsubscribe from

**Example:**

```typescript
messageBus.unsubscribe('main-window', ['theme']);
```

### Messaging

#### `sendToWindow(windowId: string, channel: string, data: any): boolean`

Sends message to specific window.

**Parameters:**

- `windowId` - Target window ID
- `channel` - Channel name
- `data` - Message data

**Returns:**

- `boolean` - Whether successful

**Example:**

```typescript
const success = messageBus.sendToWindow('editor-window', 'file-opened', {
  path: '/path/to/file.txt',
  content: 'File content'
});
```

#### `sendToGroup(group: string, channel: string, data: any): number`

Sends message to a group of windows.

**Parameters:**

- `group` - Group name
- `channel` - Channel name
- `data` - Message data

**Returns:**

- `number` - Number of successful sends

**Example:**

```typescript
const count = messageBus.sendToGroup('editors', 'theme-changed', {
  theme: 'dark'
});
console.log(`Message sent to ${count} windows`);
```

#### `broadcastToWindows(windowIds: string[], channel: string, data: any): number`

Broadcasts message to specific windows.

**Parameters:**

- `windowIds` - Target window ID list
- `channel` - Channel name
- `data` - Message data

**Returns:**

- `number` - Number of successful sends

**Example:**

```typescript
const windowIds = ['window-1', 'window-2', 'window-3'];
const count = messageBus.broadcastToWindows(windowIds, 'update', {
  version: '1.0.0'
});
```

### Event Handling

#### `registerHandler(handler: MessageBusHandler): void`

Registers a single event handler.

**Parameters:**

- `handler` - Event handler

**Example:**

```typescript
messageBus.registerHandler({
  eventName: 'window-state-changed',
  callback: (event) => {
    console.log('State changed:', event);
  }
});
```

#### `registerHandlers(handlers: MessageBusHandler[]): void`

Registers multiple event handlers in batch.

**Parameters:**

- `handlers` - Array of event handlers

#### `unregisterHandler(handler: MessageBusHandler): void`

Unregisters a single event handler.

**Parameters:**

- `handler` - Event handler

#### `unregisterHandlers(handlers: MessageBusHandler[]): void`

Unregisters multiple event handlers in batch.

**Parameters:**

- `handlers` - Array of event handlers

### Utility Methods

#### `getRegisteredWindows(): string[]`

Gets list of registered windows.

**Returns:**

- `string[]` - Array of registered window IDs

**Example:**

```typescript
const windows = messageBus.getRegisteredWindows();
console.log('Registered windows:', windows);
```

#### `setGroupResolver(resolver: (group: string) => string[]): void`

Sets group resolver.

**Parameters:**

- `resolver` - Group resolver function

**Example:**

```typescript
messageBus.setGroupResolver((group) => {
  // Return window IDs in the group
  return windowManager.getGroup(group);
});
```

#### `dispose(): void`

Releases all resources.

**Example:**

```typescript
app.on('will-quit', () => {
  messageBus.dispose();
});
```

## Events

MessageBus extends EventEmitter and supports the following events:

### `window-state-changed`

Emitted when data changes (default event name, configurable).

**Callback Parameters:**

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

**Example:**

```typescript
messageBus.on('window-state-changed', (event) => {
  if (event.type === 'set') {
    console.log(`${event.key} changed from ${event.oldValue} to ${event.value}`);
  } else if (event.type === 'delete') {
    console.log(`${event.key} deleted`);
  }
});
```

### `error`

Emitted when an error occurs.

**Callback Parameters:**

- `error: Error` - Error object

**Example:**

```typescript
messageBus.on('error', (error) => {
  console.error('MessageBus error:', error);
});
```

## Complete Example

### Main Process

```typescript
import { app } from 'electron';
import { WindowManager, MessageBus } from 'electron-infra-kit';

const windowManager = new WindowManager();
const messageBus = new MessageBus();

// Auto register windows
messageBus.autoRegisterWindows(windowManager);

// Set group resolver
messageBus.setGroupResolver((group) => windowManager.getGroup(group));

app.whenReady().then(async () => {
  // Create main window
  const mainId = await windowManager.create({
    name: 'main',
    loadFile: 'index.html'
  });

  // Create editor window
  const editorId = await windowManager.create({
    name: 'editor',
    loadFile: 'editor.html'
  });
  windowManager.joinGroup(editorId, 'editors');

  // Set initial data
  messageBus.setData('theme', 'light');
  messageBus.setData('user', {
    id: '123',
    name: 'John Doe'
  });

  // Watch data changes
  const unsubscribe = messageBus.watch('theme', (newValue, oldValue) => {
    console.log(`Theme changed from ${oldValue} to ${newValue}`);
    
    // Notify all editor windows
    messageBus.sendToGroup('editors', 'theme-changed', { theme: newValue });
  });

  // Set permissions
  messageBus.setFieldPermission('config', {
    mode: 'read-write',
    allowedWindows: ['main']
  });
});

app.on('will-quit', () => {
  messageBus.dispose();
  windowManager.dispose();
});
```

### Preload Script

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('messageBus', {
  // Get data
  getData: (key?: string) => {
    return ipcRenderer.invoke('message-bus-invoke', {
      name: 'get',
      data: { key }
    });
  },
  
  // Set data
  setData: (key: string, value: any) => {
    return ipcRenderer.invoke('message-bus-invoke', {
      name: 'set',
      data: { key, value }
    });
  },
  
  // Watch data changes
  watch: (key: string, callback: (newValue: any, oldValue: any) => void) => {
    const handler = (_event: any, data: any) => {
      if (data.key === key && data.type === 'set') {
        callback(data.value, data.oldValue);
      }
    };
    
    ipcRenderer.on('message-bus-update', handler);
    
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('message-bus-update', handler);
    };
  },
  
  // Listen to messages
  onMessage: (channel: string, callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => {
      if (data.type === 'message' && data.channel === channel) {
        callback(data.value);
      }
    };
    
    ipcRenderer.on('message-bus-update', handler);
    
    return () => {
      ipcRenderer.removeListener('message-bus-update', handler);
    };
  }
});
```

### Renderer Process

```typescript
// Get data
const theme = await window.messageBus.getData('theme');
console.log('Current theme:', theme);

// Set data
await window.messageBus.setData('theme', 'dark');

// Watch data changes
const unsubscribe = window.messageBus.watch('theme', (newValue, oldValue) => {
  console.log(`Theme changed from ${oldValue} to ${newValue}`);
  document.body.className = newValue;
});

// Listen to messages
const unsubscribeMsg = window.messageBus.onMessage('theme-changed', (data) => {
  console.log('Theme changed message:', data);
});

// Cleanup
window.addEventListener('beforeunload', () => {
  unsubscribe();
  unsubscribeMsg();
});
```

## Best Practices

### 1. Always Unsubscribe

```typescript
// ✅ Good practice
const unsubscribe = messageBus.watch('user', callback);
// Later
unsubscribe();

// ❌ Bad practice
messageBus.watch('user', callback);  // No unsubscribe, causes memory leak
```

### 2. Use Window Lifecycle Binding

```typescript
// Auto unsubscribe when window is destroyed
const unsubscribe = messageBus.watch('theme', callback, windowId);
```

### 3. Use Transactions for Batch Operations

```typescript
messageBus.startTransaction(windowId);
try {
  messageBus.setData('user.name', 'John', windowId);
  messageBus.setData('user.email', 'john@example.com', windowId);
  messageBus.commitTransaction(windowId);
} catch (error) {
  messageBus.rollbackTransaction(windowId);
}
```

### 4. Set Appropriate Permissions

```typescript
// Set sensitive data as read-only
messageBus.setFieldPermission('config', 'read');

// Restrict write permissions to specific windows
messageBus.setFieldPermission('user', {
  mode: 'read-write',
  allowedWindows: ['main-window']
});
```

### 5. Use Subscriptions to Optimize Performance

```typescript
// Only subscribe to needed keys
messageBus.subscribe(windowId, ['user', 'theme']);
```

## Related Links

- [Getting Started](/en/guide/getting-started)
- [MessageBus Guide](/en/guide/core-concepts/message-bus)
- [WindowManager API](./window-manager.md)
- [Type Definitions](./types.md)
