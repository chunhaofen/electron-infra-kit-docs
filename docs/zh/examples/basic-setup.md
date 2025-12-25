# 基础配置示例

本示例展示了如何从零开始配置一个使用 electron-infra-kit 的 Electron 应用。这是最简单的配置方式，适合快速上手和理解基本概念。

## 项目结构

```
my-electron-app/
├── src/
│   ├── main/
│   │   └── index.ts          # 主进程入口
│   ├── preload/
│   │   └── index.ts          # 预加载脚本
│   └── renderer/
│       ├── index.html        # 渲染进程 HTML
│       └── index.ts          # 渲染进程逻辑
├── package.json
└── tsconfig.json
```

## 安装依赖

首先安装必要的依赖：

```bash
npm install electron-infra-kit
npm install --save-dev electron typescript
```

## 主进程配置

创建 `src/main/index.ts` 文件：

```typescript
import { app, BrowserWindow } from 'electron';
import { createElectronToolkit } from 'electron-infra-kit';
import path from 'path';

// 创建 electron-infra-kit 实例
const toolkit = createElectronToolkit({
  // 配置选项
  debug: true, // 开启调试模式
  logger: {
    level: 'info',
    enableConsole: true,
  },
});

// 获取各个管理器
const { windowManager, ipcRouter, messageBus, lifecycle } = toolkit;

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
  // 创建主窗口
  const mainWindow = windowManager.create({
    id: 'main',
    options: {
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    },
  });

  // 加载页面
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // 打开开发者工具（开发模式）
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
});

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS 上点击 dock 图标时重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.create({
      id: 'main',
      options: {
        width: 1200,
        height: 800,
        webPreferences: {
          preload: path.join(__dirname, '../preload/index.js'),
        },
      },
    });
  }
});
```

## 预加载脚本配置

创建 `src/preload/index.ts` 文件：

```typescript
import { contextBridge } from 'electron';
import { IpcRendererBridge, setupMessageBus } from 'electron-infra-kit/preload';

// 创建 IPC 桥接
const ipcBridge = new IpcRendererBridge();

// 设置 MessageBus
const messageBus = setupMessageBus();

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // IPC 调用方法
  invoke: (channel: string, ...args: any[]) => {
    return ipcBridge.invoke(channel, ...args);
  },

  // MessageBus 方法
  messageBus: {
    getData: (key: string) => messageBus.getData(key),
    setData: (key: string, value: any) => messageBus.setData(key, value),
    watch: (key: string, callback: (value: any) => void) => {
      return messageBus.watch(key, callback);
    },
  },
});
```

## 渲染进程使用

创建 `src/renderer/index.html` 文件：

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>My Electron App</title>
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'"
    />
  </head>
  <body>
    <h1>Hello Electron with electron-infra-kit!</h1>
    <div id="app">
      <button id="testBtn">测试 IPC 调用</button>
      <div id="result"></div>
    </div>
    <script src="./index.js"></script>
  </body>
</html>
```

创建 `src/renderer/index.ts` 文件：

```typescript
// 类型定义
interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  messageBus: {
    getData: (key: string) => Promise<any>;
    setData: (key: string, value: any) => Promise<void>;
    watch: (key: string, callback: (value: any) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// 使用 API
document.getElementById('testBtn')?.addEventListener('click', async () => {
  try {
    // 示例：调用 IPC（需要在主进程中注册对应的处理器）
    const result = await window.electronAPI.invoke('test-channel', {
      message: 'Hello from renderer',
    });

    document.getElementById('result')!.textContent = JSON.stringify(
      result,
      null,
      2
    );
  } catch (error) {
    console.error('IPC call failed:', error);
    document.getElementById('result')!.textContent = `Error: ${error}`;
  }
});

// 监听共享数据变化
const unwatch = window.electronAPI.messageBus.watch('app-state', (value) => {
  console.log('App state changed:', value);
});

// 在组件卸载时取消监听
window.addEventListener('beforeunload', () => {
  unwatch();
});
```

## package.json 配置

```json
{
  "name": "my-electron-app",
  "version": "1.0.0",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "electron .",
    "build": "tsc",
    "start": "npm run build && electron ."
  },
  "dependencies": {
    "electron-infra-kit": "^1.0.0"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "typescript": "^5.0.0"
  }
}
```

## TypeScript 配置

创建 `tsconfig.json` 文件：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 运行应用

1. 编译 TypeScript 代码：

```bash
npm run build
```

2. 启动应用：

```bash
npm start
```

## 关键要点

### 1. 初始化 Toolkit

```typescript
const toolkit = createElectronToolkit({
  debug: true,
  logger: { level: 'info' },
});
```

这是使用 electron-infra-kit 的第一步，它会初始化所有核心模块。

### 2. 使用 WindowManager

```typescript
const mainWindow = windowManager.create({
  id: 'main',
  options: { width: 1200, height: 800 },
});
```

WindowManager 简化了窗口的创建和管理。

### 3. 配置预加载脚本

```typescript
const ipcBridge = new IpcRendererBridge();
const messageBus = setupMessageBus();
```

预加载脚本是连接主进程和渲染进程的桥梁。

### 4. 类型安全

通过 TypeScript 类型定义，确保 API 调用的类型安全。

## 下一步

- 学习 [多窗口应用](./multi-window.md) 示例
- 了解 [IPC 通信](./ipc-communication.md) 的详细用法
- 查看 [API 参考](/zh/api/) 了解更多功能

## 常见问题

### Q: 如何在开发模式下启用热重载？

A: 使用 Vite 或 Webpack 等构建工具配置开发服务器，然后在主进程中加载开发服务器的 URL。

### Q: 预加载脚本中可以使用 Node.js API 吗？

A: 可以，但建议只暴露必要的 API 到渲染进程，保持安全性。

### Q: 如何调试主进程代码？

A: 使用 `--inspect` 标志启动 Electron，然后使用 Chrome DevTools 或 VS Code 进行调试。
