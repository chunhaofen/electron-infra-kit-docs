# WindowManager API

WindowManager 是 electron-infra-kit 的核心模块，负责管理 Electron 应用中所有窗口的生命周期。

## 类定义

```typescript
class WindowManager extends TypedEmitter<WindowManagerEvents>
```

## 构造函数

### `constructor(config?: WindowManagerConfig)`

创建 WindowManager 实例。

**参数：**

- `config` - 可选的配置对象

**示例：**

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

## 配置选项

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

**字段说明：**

- `defaultConfig` - 默认的 BrowserWindow 配置选项
- `isDevelopment` - 是否为开发模式，影响 DevTools 的自动打开
- `logger` - 自定义日志实例
- `loggerOptions` - 日志配置选项
- `ipcRouter` - IpcRouter 实例，用于依赖注入
- `messageBus` - MessageBus 实例，用于依赖注入
- `ipc.autoInit` - 是否自动初始化 IPC（默认：true）
- `ipc.channel` - 异步通信频道名称（默认：'renderer-to-main'）
- `ipc.syncChannel` - 同步通信频道名称（默认：'renderer-to-main-sync'）
- `preventExternalLinks` - 是否阻止外部链接在窗口中打开（默认：true）
- `plugins` - 插件列表
- `hooks` - 生命周期钩子
- `store` - WindowStore 配置
- `contentLoader` - 全局自定义内容加载器

## 核心方法

### 窗口创建

#### `create(config?: WindowCreationOptions): Promise<string>`

创建一个新窗口。

**参数：**

- `config` - 窗口创建选项

**返回值：**

- `Promise<string>` - 窗口 ID

**示例：**

```typescript
// 创建基本窗口
const windowId = await windowManager.create({
  name: 'main',
  width: 1200,
  height: 800,
  loadUrl: 'https://example.com'
});

// 创建带自定义配置的窗口
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

**字段说明：**

- `windowId` - 自定义窗口 ID（不提供则自动生成）
- `name` - 窗口语义化名称
- `loadUrl` - 窗口创建后立即加载的 URL
- `loadFile` - 窗口创建后立即加载的本地文件路径
- `loadWindowContent` - 自定义内容加载处理程序
- `enablePersistence` - 是否启用状态持久化

### 窗口查询

#### `getWindowById(windowId: string): BrowserWindow | undefined`

根据 ID 获取窗口实例。

**参数：**

- `windowId` - 窗口 ID

**返回值：**

- `BrowserWindow | undefined` - 窗口实例或 undefined

**示例：**

```typescript
const window = windowManager.getWindowById('main-window');
if (window) {
  console.log('Window found:', window.getTitle());
}
```

#### `getWindowByName(name: string): BrowserWindow | undefined`

根据名称获取窗口实例。

**参数：**

- `name` - 窗口名称

**返回值：**

- `BrowserWindow | undefined` - 窗口实例或 undefined

**示例：**

```typescript
const mainWindow = windowManager.getWindowByName('main');
```

#### `hasById(windowId: string): boolean`

检查指定 ID 的窗口是否存在。

**参数：**

- `windowId` - 窗口 ID

**返回值：**

- `boolean` - 窗口是否存在

#### `hasByName(name: string): boolean`

检查指定名称的窗口是否存在。

**参数：**

- `name` - 窗口名称

**返回值：**

- `boolean` - 窗口是否存在

#### `getAllWindows(): BrowserWindow[]`

获取所有窗口实例。

**返回值：**

- `BrowserWindow[]` - 所有窗口实例数组

#### `getAllWindowKeys(): string[]`

获取所有窗口 ID。

**返回值：**

- `string[]` - 所有窗口 ID 数组

#### `getWindowCount(): number`

获取当前窗口数量。

**返回值：**

- `number` - 窗口数量

### 窗口状态管理

#### `show(window: BrowserWindow, windowId?: string): void`

显示窗口。

**参数：**

- `window` - BrowserWindow 实例
- `windowId` - 可选的窗口 ID

#### `hide(windowId: string): void`

隐藏窗口。

**参数：**

- `windowId` - 窗口 ID

#### `minimize(windowId?: string): void`

最小化窗口。

**参数：**

- `windowId` - 可选的窗口 ID（不提供则最小化主窗口）

#### `maximize(windowId: string): void`

最大化窗口。

**参数：**

- `windowId` - 窗口 ID

#### `unmaximize(windowId: string): void`

取消最大化窗口。

**参数：**

- `windowId` - 窗口 ID

#### `restore(windowId: string): void`

恢复窗口（从最小化或最大化状态）。

**参数：**

- `windowId` - 窗口 ID

#### `fullScreen(windowId: string): void`

切换全屏状态。

**参数：**

- `windowId` - 窗口 ID

#### `focus(windowId: string): void`

聚焦窗口。

**参数：**

- `windowId` - 窗口 ID

#### `close(windowId: string): void`

关闭窗口。

**参数：**

- `windowId` - 窗口 ID

**示例：**

```typescript
// 显示窗口
windowManager.show(window, windowId);

// 最小化窗口
windowManager.minimize(windowId);

// 最大化窗口
windowManager.maximize(windowId);

// 关闭窗口
windowManager.close(windowId);
```

### 窗口状态查询

#### `isVisible(windowId: string): boolean`

检查窗口是否可见。

#### `isMinimized(windowId: string): boolean`

检查窗口是否最小化。

#### `isMaximized(windowId: string): boolean`

检查窗口是否最大化。

#### `fullScreenState(windowId: string): boolean`

获取窗口全屏状态。

#### `isDestroyed(windowId: string): boolean`

检查窗口是否已销毁。

### 窗口分组管理

#### `joinGroup(windowId: string, group: string): void`

将窗口加入组。

**参数：**

- `windowId` - 窗口 ID
- `group` - 组名

**示例：**

```typescript
windowManager.joinGroup('editor-1', 'editors');
windowManager.joinGroup('editor-2', 'editors');
```

#### `leaveGroup(windowId: string, group: string): void`

将窗口移出组。

**参数：**

- `windowId` - 窗口 ID
- `group` - 组名

#### `getGroup(group: string): string[]`

获取组内所有窗口 ID。

**参数：**

- `group` - 组名

**返回值：**

- `string[]` - 窗口 ID 数组

#### `closeGroup(group: string): Promise<void>`

关闭组内所有窗口。

**参数：**

- `group` - 组名

#### `hideGroup(group: string): void`

隐藏组内所有窗口。

**参数：**

- `group` - 组名

#### `showGroup(group: string): void`

显示组内所有窗口。

**参数：**

- `group` - 组名

#### `focusGroup(group: string): void`

聚焦组内所有窗口。

**参数：**

- `group` - 组名

#### `sendToGroup(group: string, channel: string, data: any): number`

通过 MessageBus 向组内所有窗口发送消息。

**参数：**

- `group` - 组名
- `channel` - 频道名称
- `data` - 消息数据

**返回值：**

- `number` - 成功发送的数量

**示例：**

```typescript
// 向编辑器组发送消息
const count = windowManager.sendToGroup('editors', 'theme-changed', {
  theme: 'dark'
});
console.log(`Message sent to ${count} windows`);
```

### 插件系统

#### `use(plugin: WindowManagerPlugin): this`

注册插件。

**参数：**

- `plugin` - 插件实例

**返回值：**

- `this` - WindowManager 实例（支持链式调用）

**示例：**

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

### IPC 设置

#### `setupIPC(options?: { channel?: string; syncChannel?: string }): void`

设置 IPC 通信。

**参数：**

- `options.channel` - 异步通信频道名称
- `options.syncChannel` - 同步通信频道名称

**示例：**

```typescript
windowManager.setupIPC({
  channel: 'custom-channel',
  syncChannel: 'custom-sync-channel'
});
```

### 开发工具

#### `openDevTools(windowId: string): void`

打开开发者工具。

**参数：**

- `windowId` - 窗口 ID

#### `closeDevTools(windowId: string): void`

关闭开发者工具。

**参数：**

- `windowId` - 窗口 ID

#### `isDevToolsOpened(windowId: string): boolean`

检查开发者工具是否打开。

**参数：**

- `windowId` - 窗口 ID

**返回值：**

- `boolean` - 开发者工具是否打开

### 上下文管理

#### `saveWindowContext(windowId: string, context: any): Promise<void>`

保存窗口上下文。

**参数：**

- `windowId` - 窗口 ID
- `context` - 上下文数据

#### `loadWindowContext(windowId: string): Promise<any>`

加载窗口上下文。

**参数：**

- `windowId` - 窗口 ID

**返回值：**

- `Promise<any>` - 上下文数据

#### `clearWindowContext(windowId: string): Promise<void>`

清除窗口上下文。

**参数：**

- `windowId` - 窗口 ID

### 生命周期管理

#### `ready(): Promise<void>`

等待 WindowManager 初始化完成。

**返回值：**

- `Promise<void>` - 初始化完成时 resolve

**示例：**

```typescript
await windowManager.ready();
console.log('WindowManager is ready');
```

#### `dispose(): void`

释放所有资源。

**示例：**

```typescript
app.on('will-quit', () => {
  windowManager.dispose();
});
```

### 性能监控

#### `getMetrics(): object`

获取性能指标。

**返回值：**

- `object` - 性能指标对象

**示例：**

```typescript
const metrics = windowManager.getMetrics();
console.log('Window count:', metrics.windowCount);
console.log('Average creation time:', metrics.avgCreationTime);
```

## 事件

WindowManager 继承自 TypedEmitter，支持以下事件：

### `window-created`

窗口创建后触发。

**回调参数：**

```typescript
{
  window: BrowserWindow;
  id: string;
  name: string;
}
```

**示例：**

```typescript
windowManager.on('window-created', ({ window, id, name }) => {
  console.log(`Window created: ${name} (${id})`);
});
```

### `window-will-be-destroyed`

窗口销毁前触发。

**回调参数：**

- `id: string` - 窗口 ID

**示例：**

```typescript
windowManager.on('window-will-be-destroyed', (id) => {
  console.log(`Window will be destroyed: ${id}`);
});
```

### `window-destroyed`

窗口销毁后触发。

**回调参数：**

- `id: string` - 窗口 ID

**示例：**

```typescript
windowManager.on('window-destroyed', (id) => {
  console.log(`Window destroyed: ${id}`);
});
```

### `error`

发生错误时触发。

**回调参数：**

- `error: Error` - 错误对象

**示例：**

```typescript
windowManager.on('error', (error) => {
  console.error('WindowManager error:', error);
});
```

## 属性

### `mainWindow: BrowserWindow | null`

主窗口实例（只读）。

**示例：**

```typescript
const main = windowManager.mainWindow;
if (main) {
  console.log('Main window title:', main.getTitle());
}
```

### `initialized: boolean`

WindowManager 是否已初始化（只读）。

### `initializationError: Error | null`

初始化错误（如果有）（只读）。

## 完整示例

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

// 监听窗口创建事件
windowManager.on('window-created', ({ window, id, name }) => {
  console.log(`Window created: ${name} (${id})`);
});

app.whenReady().then(async () => {
  // 等待初始化完成
  await windowManager.ready();

  // 创建主窗口
  const mainId = await windowManager.create({
    name: 'main',
    width: 1200,
    height: 800,
    loadFile: path.join(__dirname, '../renderer/index.html')
  });

  // 创建编辑器窗口并加入组
  const editorId = await windowManager.create({
    name: 'editor',
    width: 1600,
    height: 900,
    loadFile: path.join(__dirname, '../renderer/editor.html')
  });
  windowManager.joinGroup(editorId, 'editors');

  // 向编辑器组发送消息
  windowManager.sendToGroup('editors', 'init', { theme: 'dark' });
});

app.on('will-quit', () => {
  windowManager.dispose();
});
```

## 相关链接

- [快速开始](/guide/getting-started)
- [窗口管理器指南](/guide/core-concepts/window-manager)
- [IpcRouter API](./ipc-router.md)
- [MessageBus API](./message-bus.md)
