# Preload API

预加载脚本 API，用于在渲染进程中安全地访问主进程功能。

## IpcRendererBridge

渲染进程 IPC 桥接器，提供类型安全的 IPC 调用。

### 使用方法

在预加载脚本中：

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

### 方法

#### `invoke(name: string, payload?: any): Promise<any>`

调用主进程 IPC 处理器。

**参数：**

- `name` - 处理器名称
- `payload` - 可选的载荷数据

**返回值：**

- `Promise<any>` - 处理器返回值

**示例：**

```typescript
// 在渲染进程中
const user = await window.api.invoke('get-user', { id: '123' });
```

## setupMessageBus

渲染进程 MessageBus 设置函数。

### 使用方法

在预加载脚本中：

```typescript
import { contextBridge } from 'electron';
import { setupMessageBus } from 'electron-infra-kit/preload';

const messageBusApi = setupMessageBus();

contextBridge.exposeInMainWorld('messageBus', messageBusApi);
```

### 返回的 API

#### `getData(key?: string): Promise<any>`

获取数据。

**示例：**

```typescript
const theme = await window.messageBus.getData('theme');
```

#### `setData(key: string, value: any): Promise<void>`

设置数据。

**示例：**

```typescript
await window.messageBus.setData('theme', 'dark');
```

#### `watch(key: string, callback: (newValue: any, oldValue: any) => void): () => void`

监听数据变化。

**示例：**

```typescript
const unsubscribe = window.messageBus.watch('theme', (newValue, oldValue) => {
  console.log(`Theme changed from ${oldValue} to ${newValue}`);
});

// 取消订阅
unsubscribe();
```

#### `onMessage(channel: string, callback: (data: any) => void): () => void`

监听消息。

**示例：**

```typescript
const unsubscribe = window.messageBus.onMessage('notification', (data) => {
  console.log('Notification:', data);
});
```

## 完整示例

### 预加载脚本

```typescript
import { contextBridge } from 'electron';
import { IpcRendererBridge, setupMessageBus } from 'electron-infra-kit/preload';

// IPC Bridge
const ipcBridge = new IpcRendererBridge({
  channel: 'renderer-to-main'
});

// MessageBus
const messageBusApi = setupMessageBus();

// 暴露到渲染进程
contextBridge.exposeInMainWorld('api', {
  // IPC 调用
  invoke: (name: string, payload?: any) => ipcBridge.invoke(name, payload),
  
  // MessageBus
  messageBus: messageBusApi
});
```

### 渲染进程

```typescript
// IPC 调用
const user = await window.api.invoke('get-user', { id: '123' });
console.log('User:', user);

// MessageBus - 获取数据
const theme = await window.api.messageBus.getData('theme');
console.log('Theme:', theme);

// MessageBus - 设置数据
await window.api.messageBus.setData('theme', 'dark');

// MessageBus - 监听数据变化
const unsubscribe = window.api.messageBus.watch('theme', (newValue) => {
  document.body.className = newValue;
});

// MessageBus - 监听消息
const unsubscribeMsg = window.api.messageBus.onMessage('notification', (data) => {
  showNotification(data);
});

// 清理
window.addEventListener('beforeunload', () => {
  unsubscribe();
  unsubscribeMsg();
});
```

### TypeScript 类型定义

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

## 安全注意事项

1. **始终使用 contextBridge**：不要直接暴露 Electron API 到渲染进程
2. **验证输入**：在主进程中验证所有来自渲染进程的输入
3. **最小权限原则**：只暴露必要的 API
4. **类型安全**：使用 TypeScript 确保类型安全

## 相关链接

- [快速开始](/guide/getting-started)
- [IPC 路由指南](/guide/core-concepts/ipc-router)
- [MessageBus 指南](/guide/core-concepts/message-bus)
- [类型安全](/guide/advanced/type-safety)
