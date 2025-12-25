# MessageBus API

MessageBus 是 electron-infra-kit 的核心模块，提供跨窗口状态同步和消息传递功能。

## 类定义

```typescript
class MessageBus extends EventEmitter
```

## 构造函数

### `constructor(options?: MessageBusOptions)`

创建 MessageBus 实例。

**参数：**

- `options` - 可选的配置对象

**示例：**

```typescript
import { MessageBus } from 'electron-infra-kit';

const messageBus = new MessageBus({
  logger: customLogger,
  transportMode: 'messageport',  // 或 'ipc' 或 'auto'
  eventName: 'custom-state-changed'
});
```

## 配置选项

### MessageBusOptions

```typescript
interface MessageBusOptions {
  eventName?: string;           // 自定义状态变更事件名称（默认：'window-state-changed'）
  logger?: ILogger;             // 日志实例
  transportMode?: 'auto' | 'messageport' | 'ipc';  // 传输模式（默认：'auto'）
}
```

**字段说明：**

- `eventName` - 自定义状态变更事件名称
- `logger` - 自定义日志实例
- `transportMode` - 传输模式：
  - `'auto'` - 自动选择（优先使用 MessagePort）
  - `'messageport'` - 使用 MessagePort 传输
  - `'ipc'` - 使用 IPC 传输

## 核心方法

### 窗口注册

#### `registerWindow(windowId: string, window: BrowserWindow): void`

注册窗口到 MessageBus。

**参数：**

- `windowId` - 窗口 ID
- `window` - BrowserWindow 实例

**示例：**

```typescript
messageBus.registerWindow('main-window', mainWindow);
```

#### `unregisterWindow(windowId: string): void`

从 MessageBus 注销窗口。

**参数：**

- `windowId` - 窗口 ID

**示例：**

```typescript
messageBus.unregisterWindow('main-window');
```

#### `autoRegisterWindows(windowManager: WindowManager): void`

自动注册/注销窗口与 WindowManager。

**参数：**

- `windowManager` - WindowManager 实例

**示例：**

```typescript
messageBus.autoRegisterWindows(windowManager);
```

### 数据管理

#### `getData(key?: string): any`

获取数据。

**参数：**

- `key` - 可选的数据键，不传则返回所有数据

**返回值：**

- `any` - 数据值或所有数据

**示例：**

```typescript
// 获取特定键的数据
const user = messageBus.getData('user');

// 获取所有数据
const allData = messageBus.getData();
```

#### `setData(key: string, value: any, windowId?: string, eventName?: string): { success: boolean; error?: string }`

设置数据。

**参数：**

- `key` - 数据键
- `value` - 数据值
- `windowId` - 可选的操作窗口 ID
- `eventName` - 可选的事件名称

**返回值：**

- `{ success: boolean; error?: string }` - 操作结果

**示例：**

```typescript
// 设置数据
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

删除数据。

**参数：**

- `key` - 数据键
- `windowId` - 可选的操作窗口 ID
- `eventName` - 可选的事件名称

**返回值：**

- `{ success: boolean; error?: string }` - 操作结果

**示例：**

```typescript
const result = messageBus.deleteData('user');
```

#### `updateData(key: string, updater: (oldVal: any) => any, windowId?: string): { success: boolean; error?: string }`

原子更新数据。

**参数：**

- `key` - 数据键
- `updater` - 更新函数或新值
- `windowId` - 可选的窗口 ID

**返回值：**

- `{ success: boolean; error?: string }` - 操作结果

**示例：**

```typescript
// 使用更新函数
messageBus.updateData('counter', (oldValue) => (oldValue || 0) + 1);

// 直接设置新值
messageBus.updateData('user', { id: '123', name: 'Jane Doe' });
```

### 数据监听

#### `watch(key: string, callback: (newValue: any, oldValue: any) => void, windowId?: string): () => void`

监听数据变化（主进程）。

**参数：**

- `key` - 要监听的数据键
- `callback` - 回调函数
- `windowId` - 可选的窗口 ID，用于绑定生命周期

**返回值：**

- `() => void` - 取消订阅函数

**⚠️ 重要：** 必须调用返回的取消订阅函数以防止内存泄漏。

**示例：**

```typescript
// 监听用户数据变化
const unsubscribe = messageBus.watch('user', (newValue, oldValue) => {
  console.log('User changed:', oldValue, '->', newValue);
});

// 稍后取消订阅
unsubscribe();

// 绑定到窗口生命周期
const unsubscribe2 = messageBus.watch('theme', (newValue) => {
  console.log('Theme changed:', newValue);
}, 'main-window');  // 窗口销毁时自动取消订阅
```

### 权限控制

#### `setFieldPermission(key: string, permission: FieldPermission): void`

设置字段权限。

**参数：**

- `key` - 数据键
- `permission` - 权限配置

**示例：**

```typescript
// 简单权限模式
messageBus.setFieldPermission('config', 'read');  // 只读

// 详细权限配置
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

### 事务支持

#### `startTransaction(windowId: string): void`

开启事务。

**参数：**

- `windowId` - 窗口 ID

**示例：**

```typescript
messageBus.startTransaction('main-window');
```

#### `commitTransaction(windowId: string): void`

提交事务。

**参数：**

- `windowId` - 窗口 ID

**示例：**

```typescript
messageBus.commitTransaction('main-window');
```

#### `rollbackTransaction(windowId: string): void`

回滚事务。

**参数：**

- `windowId` - 窗口 ID

**示例：**

```typescript
messageBus.rollbackTransaction('main-window');
```

**完整事务示例：**

```typescript
const windowId = 'main-window';

try {
  // 开启事务
  messageBus.startTransaction(windowId);
  
  // 执行多个操作
  messageBus.setData('user.name', 'John', windowId);
  messageBus.setData('user.email', 'john@example.com', windowId);
  messageBus.setData('user.age', 30, windowId);
  
  // 提交事务
  messageBus.commitTransaction(windowId);
} catch (error) {
  // 发生错误时回滚
  messageBus.rollbackTransaction(windowId);
  console.error('Transaction failed:', error);
}
```

### 订阅管理

#### `subscribe(windowId: string, keys: string[]): void`

订阅特定的 key。

**参数：**

- `windowId` - 窗口 ID
- `keys` - 要订阅的 key 列表

**示例：**

```typescript
messageBus.subscribe('main-window', ['user', 'theme', 'config']);
```

#### `unsubscribe(windowId: string, keys: string[]): void`

取消订阅特定的 key。

**参数：**

- `windowId` - 窗口 ID
- `keys` - 要取消订阅的 key 列表

**示例：**

```typescript
messageBus.unsubscribe('main-window', ['theme']);
```

### 消息传递

#### `sendToWindow(windowId: string, channel: string, data: any): boolean`

发送消息到指定窗口。

**参数：**

- `windowId` - 目标窗口 ID
- `channel` - 频道名称
- `data` - 消息数据

**返回值：**

- `boolean` - 是否成功

**示例：**

```typescript
const success = messageBus.sendToWindow('editor-window', 'file-opened', {
  path: '/path/to/file.txt',
  content: 'File content'
});
```

#### `sendToGroup(group: string, channel: string, data: any): number`

发送消息到一组窗口。

**参数：**

- `group` - 组名
- `channel` - 频道名称
- `data` - 消息数据

**返回值：**

- `number` - 成功发送的数量

**示例：**

```typescript
const count = messageBus.sendToGroup('editors', 'theme-changed', {
  theme: 'dark'
});
console.log(`Message sent to ${count} windows`);
```

#### `broadcastToWindows(windowIds: string[], channel: string, data: any): number`

广播消息到指定的一组窗口。

**参数：**

- `windowIds` - 目标窗口 ID 列表
- `channel` - 频道名称
- `data` - 消息数据

**返回值：**

- `number` - 成功发送的数量

**示例：**

```typescript
const windowIds = ['window-1', 'window-2', 'window-3'];
const count = messageBus.broadcastToWindows(windowIds, 'update', {
  version: '1.0.0'
});
```

### 事件处理

#### `registerHandler(handler: MessageBusHandler): void`

注册单个事件处理器。

**参数：**

- `handler` - 事件处理器

**示例：**

```typescript
messageBus.registerHandler({
  eventName: 'window-state-changed',
  callback: (event) => {
    console.log('State changed:', event);
  }
});
```

#### `registerHandlers(handlers: MessageBusHandler[]): void`

批量注册事件处理器。

**参数：**

- `handlers` - 事件处理器数组

#### `unregisterHandler(handler: MessageBusHandler): void`

注销单个事件处理器。

**参数：**

- `handler` - 事件处理器

#### `unregisterHandlers(handlers: MessageBusHandler[]): void`

批量注销事件处理器。

**参数：**

- `handlers` - 事件处理器数组

### 工具方法

#### `getRegisteredWindows(): string[]`

获取已注册的窗口列表。

**返回值：**

- `string[]` - 已注册的窗口 ID 数组

**示例：**

```typescript
const windows = messageBus.getRegisteredWindows();
console.log('Registered windows:', windows);
```

#### `setGroupResolver(resolver: (group: string) => string[]): void`

设置分组解析器。

**参数：**

- `resolver` - 分组解析函数

**示例：**

```typescript
messageBus.setGroupResolver((group) => {
  // 返回组内的窗口 ID 列表
  return windowManager.getGroup(group);
});
```

#### `dispose(): void`

释放所有资源。

**示例：**

```typescript
app.on('will-quit', () => {
  messageBus.dispose();
});
```

## 事件

MessageBus 继承自 EventEmitter，支持以下事件：

### `window-state-changed`

数据变化时触发（默认事件名，可通过配置修改）。

**回调参数：**

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

**示例：**

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

发生错误时触发。

**回调参数：**

- `error: Error` - 错误对象

**示例：**

```typescript
messageBus.on('error', (error) => {
  console.error('MessageBus error:', error);
});
```

## 完整示例

### 主进程

```typescript
import { app } from 'electron';
import { WindowManager, MessageBus } from 'electron-infra-kit';

const windowManager = new WindowManager();
const messageBus = new MessageBus();

// 自动注册窗口
messageBus.autoRegisterWindows(windowManager);

// 设置分组解析器
messageBus.setGroupResolver((group) => windowManager.getGroup(group));

app.whenReady().then(async () => {
  // 创建主窗口
  const mainId = await windowManager.create({
    name: 'main',
    loadFile: 'index.html'
  });

  // 创建编辑器窗口
  const editorId = await windowManager.create({
    name: 'editor',
    loadFile: 'editor.html'
  });
  windowManager.joinGroup(editorId, 'editors');

  // 设置初始数据
  messageBus.setData('theme', 'light');
  messageBus.setData('user', {
    id: '123',
    name: 'John Doe'
  });

  // 监听数据变化
  const unsubscribe = messageBus.watch('theme', (newValue, oldValue) => {
    console.log(`Theme changed from ${oldValue} to ${newValue}`);
    
    // 通知所有编辑器窗口
    messageBus.sendToGroup('editors', 'theme-changed', { theme: newValue });
  });

  // 设置权限
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

### 预加载脚本

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('messageBus', {
  // 获取数据
  getData: (key?: string) => {
    return ipcRenderer.invoke('message-bus-invoke', {
      name: 'get',
      data: { key }
    });
  },
  
  // 设置数据
  setData: (key: string, value: any) => {
    return ipcRenderer.invoke('message-bus-invoke', {
      name: 'set',
      data: { key, value }
    });
  },
  
  // 监听数据变化
  watch: (key: string, callback: (newValue: any, oldValue: any) => void) => {
    const handler = (_event: any, data: any) => {
      if (data.key === key && data.type === 'set') {
        callback(data.value, data.oldValue);
      }
    };
    
    ipcRenderer.on('message-bus-update', handler);
    
    // 返回取消订阅函数
    return () => {
      ipcRenderer.removeListener('message-bus-update', handler);
    };
  },
  
  // 监听消息
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

### 渲染进程

```typescript
// 获取数据
const theme = await window.messageBus.getData('theme');
console.log('Current theme:', theme);

// 设置数据
await window.messageBus.setData('theme', 'dark');

// 监听数据变化
const unsubscribe = window.messageBus.watch('theme', (newValue, oldValue) => {
  console.log(`Theme changed from ${oldValue} to ${newValue}`);
  document.body.className = newValue;
});

// 监听消息
const unsubscribeMsg = window.messageBus.onMessage('theme-changed', (data) => {
  console.log('Theme changed message:', data);
});

// 清理
window.addEventListener('beforeunload', () => {
  unsubscribe();
  unsubscribeMsg();
});
```

## 最佳实践

### 1. 始终取消订阅

```typescript
// ✅ 好的做法
const unsubscribe = messageBus.watch('user', callback);
// 稍后
unsubscribe();

// ❌ 不好的做法
messageBus.watch('user', callback);  // 没有取消订阅，会导致内存泄漏
```

### 2. 使用窗口生命周期绑定

```typescript
// 窗口销毁时自动取消订阅
const unsubscribe = messageBus.watch('theme', callback, windowId);
```

### 3. 使用事务处理批量操作

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

### 4. 设置适当的权限

```typescript
// 敏感数据设置为只读
messageBus.setFieldPermission('config', 'read');

// 限制特定窗口的写入权限
messageBus.setFieldPermission('user', {
  mode: 'read-write',
  allowedWindows: ['main-window']
});
```

### 5. 使用订阅优化性能

```typescript
// 只订阅需要的 key
messageBus.subscribe(windowId, ['user', 'theme']);
```

## 相关链接

- [快速开始](/guide/getting-started)
- [MessageBus 指南](/guide/core-concepts/message-bus)
- [WindowManager API](./window-manager.md)
- [类型定义](./types.md)
