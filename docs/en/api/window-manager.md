# WindowManager API

WindowManager is the core module of electron-infra-kit, responsible for managing the lifecycle of all windows in an Electron application.

## Class Definition

```typescript
class WindowManager extends TypedEmitter<WindowManagerEvents>
```

## Constructor

### `constructor(config?: WindowManagerConfig)`

Creates a WindowManager instance.

**Parameters:**

- `config` - Optional configuration object

**Example:**

```typescript
import { WindowManager } from 'electron-infra-kit';

const windowManager = new WindowManager({
  isDevelopment: process.env.NODE_ENV === 'development',
  defaultConfig: {
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  }
});
```

## Configuration Options

### WindowManagerConfig

```typescript
interface WindowManagerConfig {
  defaultConfig?: BrowserWindowConstructorOptions;
  isDevelopment?: boolean;
  logger?: ILogger;
  loggerOptions?: LoggerOptions;
  ipcRouter?: IpcRouter;
  ipcTransport?: IIpcTransport;
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
  contentLoader?: (window: BrowserWindow, options: WindowCreationOptions) => Promise<void> | void;
}
```

**Field Descriptions:**

- `defaultConfig` - Default BrowserWindow configuration options
- `isDevelopment` - Development mode flag, affects automatic DevTools opening
- `logger` - Custom logger instance
- `loggerOptions` - Logger configuration options
- `ipcRouter` - IpcRouter instance for dependency injection
- `messageBus` - MessageBus instance for dependency injection
- `ipc.autoInit` - Whether to automatically initialize IPC (default: true)
- `ipc.channel` - Async communication channel name (default: 'renderer-to-main')
- `ipc.syncChannel` - Sync communication channel name (default: 'renderer-to-main-sync')
- `preventExternalLinks` - Whether to prevent external links from opening in window (default: true)
- `plugins` - Plugin list
- `hooks` - Lifecycle hooks
- `store` - WindowStore configuration
- `contentLoader` - Global custom content loader

## Core Methods

### Window Creation

#### `create(config?: WindowCreationOptions): Promise<string>`

Creates a new window.

**Parameters:**

- `config` - Window creation options

**Returns:**

- `Promise<string>` - Window ID

**Example:**

```typescript
// Create basic window
const windowId = await windowManager.create({
  name: 'main',
  width: 1200,
  height: 800,
  loadUrl: 'https://example.com'
});

// Create window with custom configuration
const editorId = await windowManager.create({
  name: 'editor',
  width: 1600,
  height: 900,
  webPreferences: {
    preload: path.join(__dirname, 'editor-preload.js')
  },
  loadFile: path.join(__dirname, '../renderer/editor.html')
});
```

#### WindowCreationOptions

```typescript
interface WindowCreationOptions extends BrowserWindowConstructorOptions {
  windowId?: string;
  name?: string;
  isDevelopment?: boolean;
  defaultConfig?: BrowserWindowConstructorOptions;
  loadUrl?: string;
  loadFile?: string;
  loadWindowContent?: (window: BrowserWindow) => Promise<void> | void;
  enablePersistence?: boolean;
}
```

**Field Descriptions:**

- `windowId` - Custom window ID (auto-generated if not provided)
- `name` - Semantic window name
- `loadUrl` - URL to load immediately after window creation
- `loadFile` - Local file path to load immediately after window creation
- `loadWindowContent` - Custom content loading handler
- `enablePersistence` - Whether to enable state persistence

### Window Query

#### `getWindowById(windowId: string): BrowserWindow | undefined`

Gets window instance by ID.

**Parameters:**

- `windowId` - Window ID

**Returns:**

- `BrowserWindow | undefined` - Window instance or undefined

**Example:**

```typescript
const window = windowManager.getWindowById('main-window');
if (window) {
  console.log('Window found:', window.getTitle());
}
```

#### `getWindowByName(name: string): BrowserWindow | undefined`

Gets window instance by name.

**Parameters:**

- `name` - Window name

**Returns:**

- `BrowserWindow | undefined` - Window instance or undefined

**Example:**

```typescript
const mainWindow = windowManager.getWindowByName('main');
```

#### `hasById(windowId: string): boolean`

Checks if window with specified ID exists.

**Parameters:**

- `windowId` - Window ID

**Returns:**

- `boolean` - Whether window exists

#### `hasByName(name: string): boolean`

Checks if window with specified name exists.

**Parameters:**

- `name` - Window name

**Returns:**

- `boolean` - Whether window exists

#### `getAllWindows(): BrowserWindow[]`

Gets all window instances.

**Returns:**

- `BrowserWindow[]` - Array of all window instances

#### `getAllWindowKeys(): string[]`

Gets all window IDs.

**Returns:**

- `string[]` - Array of all window IDs

#### `getWindowCount(): number`

Gets current window count.

**Returns:**

- `number` - Window count

### Window State Management

#### `show(window: BrowserWindow, windowId?: string): void`

Shows window.

**Parameters:**

- `window` - BrowserWindow instance
- `windowId` - Optional window ID

#### `hide(windowId: string): void`

Hides window.

**Parameters:**

- `windowId` - Window ID

#### `minimize(windowId?: string): void`

Minimizes window.

**Parameters:**

- `windowId` - Optional window ID (minimizes main window if not provided)

#### `maximize(windowId: string): void`

Maximizes window.

**Parameters:**

- `windowId` - Window ID

#### `unmaximize(windowId: string): void`

Unmaximizes window.

**Parameters:**

- `windowId` - Window ID

#### `restore(windowId: string): void`

Restores window (from minimized or maximized state).

**Parameters:**

- `windowId` - Window ID

#### `fullScreen(windowId: string): void`

Toggles fullscreen state.

**Parameters:**

- `windowId` - Window ID

#### `focus(windowId: string): void`

Focuses window.

**Parameters:**

- `windowId` - Window ID

#### `close(windowId: string): void`

Closes window.

**Parameters:**

- `windowId` - Window ID

**Example:**

```typescript
// Show window
windowManager.show(window, windowId);

// Minimize window
windowManager.minimize(windowId);

// Maximize window
windowManager.maximize(windowId);

// Close window
windowManager.close(windowId);
```

### Window State Query

#### `isVisible(windowId: string): boolean`

Checks if window is visible.

#### `isMinimized(windowId: string): boolean`

Checks if window is minimized.

#### `isMaximized(windowId: string): boolean`

Checks if window is maximized.

#### `fullScreenState(windowId: string): boolean`

Gets window fullscreen state.

#### `isDestroyed(windowId: string): boolean`

Checks if window is destroyed.

### Window Group Management

#### `joinGroup(windowId: string, group: string): void`

Adds window to group.

**Parameters:**

- `windowId` - Window ID
- `group` - Group name

**Example:**

```typescript
windowManager.joinGroup('editor-1', 'editors');
windowManager.joinGroup('editor-2', 'editors');
```

#### `leaveGroup(windowId: string, group: string): void`

Removes window from group.

**Parameters:**

- `windowId` - Window ID
- `group` - Group name

#### `getGroup(group: string): string[]`

Gets all window IDs in group.

**Parameters:**

- `group` - Group name

**Returns:**

- `string[]` - Array of window IDs

#### `closeGroup(group: string): Promise<void>`

Closes all windows in group.

**Parameters:**

- `group` - Group name

#### `hideGroup(group: string): void`

Hides all windows in group.

**Parameters:**

- `group` - Group name

#### `showGroup(group: string): void`

Shows all windows in group.

**Parameters:**

- `group` - Group name

#### `focusGroup(group: string): void`

Focuses all windows in group.

**Parameters:**

- `group` - Group name

#### `sendToGroup(group: string, channel: string, data: any): number`

Sends message to all windows in group via MessageBus.

**Parameters:**

- `group` - Group name
- `channel` - Channel name
- `data` - Message data

**Returns:**

- `number` - Number of successful sends

**Example:**

```typescript
// Send message to editor group
const count = windowManager.sendToGroup('editors', 'theme-changed', {
  theme: 'dark'
});
console.log(`Message sent to ${count} windows`);
```

### Plugin System

#### `use(plugin: WindowManagerPlugin): this`

Registers plugin.

**Parameters:**

- `plugin` - Plugin instance

**Returns:**

- `this` - WindowManager instance (supports chaining)

**Example:**

```typescript
const myPlugin: WindowManagerPlugin = {
  name: 'my-plugin',
  onInit(windowManager) {
    console.log('Plugin initialized');
  },
  onDidCreate({ window, id, name }) {
    console.log(`Window created: ${name} (${id})`);
  }
};

windowManager.use(myPlugin);
```

#### WindowManagerPlugin

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

### IPC Setup

#### `setupIPC(options?: { channel?: string; syncChannel?: string }): void`

Sets up IPC communication.

**Parameters:**

- `options.channel` - Async communication channel name
- `options.syncChannel` - Sync communication channel name

**Example:**

```typescript
windowManager.setupIPC({
  channel: 'custom-channel',
  syncChannel: 'custom-sync-channel'
});
```

### Development Tools

#### `openDevTools(windowId: string): void`

Opens developer tools.

**Parameters:**

- `windowId` - Window ID

#### `closeDevTools(windowId: string): void`

Closes developer tools.

**Parameters:**

- `windowId` - Window ID

#### `isDevToolsOpened(windowId: string): boolean`

Checks if developer tools are open.

**Parameters:**

- `windowId` - Window ID

**Returns:**

- `boolean` - Whether developer tools are open

### Context Management

#### `saveWindowContext(windowId: string, context: any): Promise<void>`

Saves window context.

**Parameters:**

- `windowId` - Window ID
- `context` - Context data

#### `loadWindowContext(windowId: string): Promise<any>`

Loads window context.

**Parameters:**

- `windowId` - Window ID

**Returns:**

- `Promise<any>` - Context data

#### `clearWindowContext(windowId: string): Promise<void>`

Clears window context.

**Parameters:**

- `windowId` - Window ID

### Lifecycle Management

#### `ready(): Promise<void>`

Waits for WindowManager initialization to complete.

**Returns:**

- `Promise<void>` - Resolves when initialization is complete

**Example:**

```typescript
await windowManager.ready();
console.log('WindowManager is ready');
```

#### `dispose(): void`

Releases all resources.

**Example:**

```typescript
app.on('will-quit', () => {
  windowManager.dispose();
});
```

### Performance Monitoring

#### `getMetrics(): object`

Gets performance metrics.

**Returns:**

- `object` - Performance metrics object

**Example:**

```typescript
const metrics = windowManager.getMetrics();
console.log('Window count:', metrics.windowCount);
console.log('Average creation time:', metrics.avgCreationTime);
```

## Events

WindowManager extends TypedEmitter and supports the following events:

### `window-created`

Emitted after window is created.

**Callback Parameters:**

```typescript
{
  window: BrowserWindow;
  id: string;
  name: string;
}
```

**Example:**

```typescript
windowManager.on('window-created', ({ window, id, name }) => {
  console.log(`Window created: ${name} (${id})`);
});
```

### `window-will-be-destroyed`

Emitted before window is destroyed.

**Callback Parameters:**

- `id: string` - Window ID

**Example:**

```typescript
windowManager.on('window-will-be-destroyed', (id) => {
  console.log(`Window will be destroyed: ${id}`);
});
```

### `window-destroyed`

Emitted after window is destroyed.

**Callback Parameters:**

- `id: string` - Window ID

**Example:**

```typescript
windowManager.on('window-destroyed', (id) => {
  console.log(`Window destroyed: ${id}`);
});
```

### `error`

Emitted when an error occurs.

**Callback Parameters:**

- `error: Error` - Error object

**Example:**

```typescript
windowManager.on('error', (error) => {
  console.error('WindowManager error:', error);
});
```

## Properties

### `mainWindow: BrowserWindow | null`

Main window instance (read-only).

**Example:**

```typescript
const main = windowManager.mainWindow;
if (main) {
  console.log('Main window title:', main.getTitle());
}
```

### `initialized: boolean`

Whether WindowManager is initialized (read-only).

### `initializationError: Error | null`

Initialization error if any (read-only).

## Complete Example

```typescript
import { app, BrowserWindow } from 'electron';
import { WindowManager } from 'electron-infra-kit';
import path from 'path';

const windowManager = new WindowManager({
  isDevelopment: process.env.NODE_ENV === 'development',
  defaultConfig: {
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  }
});

// Listen to window creation events
windowManager.on('window-created', ({ window, id, name }) => {
  console.log(`Window created: ${name} (${id})`);
});

app.whenReady().then(async () => {
  // Wait for initialization
  await windowManager.ready();

  // Create main window
  const mainId = await windowManager.create({
    name: 'main',
    width: 1200,
    height: 800,
    loadFile: path.join(__dirname, '../renderer/index.html')
  });

  // Create editor window and join group
  const editorId = await windowManager.create({
    name: 'editor',
    width: 1600,
    height: 900,
    loadFile: path.join(__dirname, '../renderer/editor.html')
  });
  windowManager.joinGroup(editorId, 'editors');

  // Send message to editor group
  windowManager.sendToGroup('editors', 'init', { theme: 'dark' });
});

app.on('will-quit', () => {
  windowManager.dispose();
});
```

## Related Links

- [Getting Started](/en/guide/getting-started)
- [Window Manager Guide](/en/guide/core-concepts/window-manager)
- [IpcRouter API](./ipc-router.md)
- [MessageBus API](./message-bus.md)
