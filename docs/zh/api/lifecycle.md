# LifecycleManager API

LifecycleManager 负责协调 electron-infra-kit 各模块的启动和关闭。

## 类定义

```typescript
class LifecycleManager
```

## 构造函数

### `constructor(config?: LifecycleConfig)`

创建 LifecycleManager 实例。

**参数：**

- `config` - 可选的配置对象

**示例：**

```typescript
import { LifecycleManager } from 'electron-infra-kit';

const lifecycle = new LifecycleManager({
  autoStart: true,  // 自动启动
  isDevelopment: process.env.NODE_ENV === 'development'
});
```

## 配置选项

### LifecycleConfig

```typescript
interface LifecycleConfig extends WindowManagerConfig {
  autoStart?: boolean;           // 是否自动启动（默认：false）
  ipcRouter?: IpcRouter;         // 现有的 IpcRouter 实例
  windowManager?: WindowManager; // 现有的 WindowManager 实例
  messageBus?: MessageBus;       // 现有的 MessageBus 实例
}
```

## 核心方法

### `startup(): Promise<void>`

启动所有服务。

**返回值：**

- `Promise<void>` - 启动完成时 resolve

**示例：**

```typescript
await lifecycle.startup();
console.log('All services started');
```

### `shutdown(): Promise<void>`

优雅地关闭所有服务。

**返回值：**

- `Promise<void>` - 关闭完成时 resolve

**示例：**

```typescript
app.on('will-quit', async () => {
  await lifecycle.shutdown();
});
```

## 属性

### `windowManager?: WindowManager`

WindowManager 实例（只读）。

### `ipcRouter?: IpcRouter`

IpcRouter 实例（只读）。

### `messageBus?: MessageBus`

MessageBus 实例（只读）。

### `started: boolean`

是否已启动（只读）。

## 完整示例

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
  // 启动所有服务
  await lifecycle.startup();

  // 访问各个模块
  const { windowManager, ipcRouter, messageBus } = lifecycle;

  // 创建窗口
  await windowManager.create({
    name: 'main',
    loadFile: 'index.html'
  });
});

app.on('will-quit', async () => {
  await lifecycle.shutdown();
});
```

## 相关链接

- [快速开始](/guide/getting-started)
- [WindowManager API](./window-manager.md)
- [IpcRouter API](./ipc-router.md)
- [MessageBus API](./message-bus.md)
