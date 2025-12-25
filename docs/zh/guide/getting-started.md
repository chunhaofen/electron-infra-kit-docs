# 快速开始

在 5 分钟内使用 `electron-infra-kit` 启动并运行您的 Electron 应用程序。

本指南将带您完成基本设置，让您快速体验 electron-infra-kit 的核心功能。


## 前提条件

在开始之前，请确保您的开发环境满足以下要求：

- **Electron** >= 22.0.0
- **TypeScript** >= 5.0.0
- **Node.js** >= 18.0.0

::: tip 提示
建议使用最新的稳定版本以获得最佳体验和性能。
:::


## 安装

使用您喜欢的包管理器安装 `electron-infra-kit`：

::: code-group

```bash [npm]
npm install electron-infra-kit
```

```bash [pnpm]
pnpm add electron-infra-kit
```

```bash [yarn]
yarn add electron-infra-kit
```

:::


## 主进程配置

在您的主进程入口文件（例如 `src/main.ts`）中初始化 electron-infra-kit。

```typescript
import { app } from 'electron';
import { createElectronToolkit } from 'electron-infra-kit';
import path from 'path';

app.whenReady().then(async () => {
  // 初始化工具包
  const { windowManager, ipcRouter, messageBus } = createElectronToolkit({
    // 开发模式配置
    isDevelopment: process.env.NODE_ENV === 'development',
    
    // IPC 路由配置
    ipc: { 
      autoInit: true  // 自动初始化 IPC 处理程序
    },
    
    // 默认窗口配置
    defaultConfig: {
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,      // 启用上下文隔离
        nodeIntegration: false,       // 禁用 Node 集成
      },
    },
  });

  // 等待初始化完成
  await windowManager.ready();

  // 创建主窗口
  const mainWindow = await windowManager.create({
    name: 'main',                    // 窗口唯一标识
    title: '我的应用',
    width: 1024,
    height: 768,
    loadUrl: 'http://localhost:5173', // 开发服务器地址
    // 或使用本地文件: loadFile: path.join(__dirname, '../renderer/index.html')
  });

  console.log('主窗口已创建:', mainWindow);
});

// 处理应用退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

### 配置选项说明

`createElectronToolkit` 接受以下配置选项：

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `isDevelopment` | `boolean` | `false` | 是否为开发模式，启用调试工具 |
| `ipc.autoInit` | `boolean` | `false` | 是否自动初始化 IPC 处理程序 |
| `defaultConfig` | `BrowserWindowConstructorOptions` | `{}` | 默认的窗口配置选项 |

### 窗口创建选项

`windowManager.create()` 支持以下主要选项：

| 选项 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 窗口的唯一标识符 |
| `title` | `string` | 否 | 窗口标题 |
| `width` | `number` | 否 | 窗口宽度 |
| `height` | `number` | 否 | 窗口高度 |
| `loadUrl` | `string` | 否 | 要加载的 URL |
| `loadFile` | `string` | 否 | 要加载的本地文件路径 |

::: tip 提示
`loadUrl` 和 `loadFile` 二选一。开发环境通常使用 `loadUrl` 连接到开发服务器，生产环境使用 `loadFile` 加载打包后的文件。
:::


## 预加载脚本配置

预加载脚本在渲染进程中运行，但可以访问 Node.js API。它负责将安全的 API 暴露给渲染进程。

在您的预加载脚本文件（例如 `src/preload.ts`）中：

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { IpcRendererBridge, setupMessageBus } from 'electron-infra-kit';

// 1. 暴露 IPC 路由 API
const ipcBridge = new IpcRendererBridge();
ipcBridge.exposeApi('ipcApi');  // 将 API 暴露为 window.ipcApi

// 2. 设置消息总线连接
setupMessageBus();  // 将消息总线暴露为 window.messageBus
```

### API 说明

#### IpcRendererBridge

`IpcRendererBridge` 提供了类型安全的 IPC 通信桥接：

- **`exposeApi(apiName: string)`**: 将 IPC API 暴露到渲染进程的 window 对象上
  - `apiName`: API 在 window 对象上的属性名，默认为 `'ipcApi'`

#### setupMessageBus

`setupMessageBus()` 建立消息总线连接，用于跨窗口状态同步：

- 自动连接到主进程的消息总线
- 将消息总线 API 暴露为 `window.messageBus`
- 支持数据的设置、获取和监听

::: warning 安全提示
预加载脚本应该只暴露必要的 API，避免直接暴露 Node.js 或 Electron 的完整 API。electron-infra-kit 已经为您处理了安全性问题。
:::

### TypeScript 类型定义

为了在渲染进程中获得完整的类型支持，在您的类型定义文件中添加：

```typescript
// src/types/window.d.ts
import type { IpcRendererApi, MessageBusApi } from 'electron-infra-kit';

declare global {
  interface Window {
    ipcApi: IpcRendererApi;
    messageBus: MessageBusApi;
  }
}
```


## 渲染进程使用

现在您可以在渲染进程（前端代码）中使用 electron-infra-kit 提供的 API。

### 使用 IPC 通信

通过 `window.ipcApi` 调用主进程的 IPC 处理程序：

```typescript
// 在您的 React/Vue/原生 JS 代码中

// 调用 IPC 处理程序
async function fetchUserData(userId: string) {
  try {
    const result = await window.ipcApi.invoke('getUser', { id: userId });
    console.log('用户数据:', result);
    return result;
  } catch (error) {
    console.error('获取用户数据失败:', error);
  }
}

// 调用文件操作
async function saveFile(content: string) {
  const result = await window.ipcApi.invoke('saveFile', {
    path: '/path/to/file.txt',
    content: content
  });
  
  if (result.success) {
    console.log('文件保存成功');
  }
}
```

::: tip 类型安全
如果您正确配置了 TypeScript 类型定义，编辑器会为 `invoke` 方法提供自动完成和类型检查。
:::

### 使用消息总线

消息总线用于跨窗口的状态同步：

```typescript
// 设置数据（会自动同步到所有窗口）
await window.messageBus.setData('theme', 'dark');
await window.messageBus.setData('user', {
  id: '123',
  name: '张三',
  role: 'admin'
});

// 获取数据
const theme = await window.messageBus.getData('theme');
console.log('当前主题:', theme); // 'dark'

// 监听数据变化
const unsubscribe = window.messageBus.watch('theme', (newValue, oldValue) => {
  console.log(`主题从 ${oldValue} 变更为 ${newValue}`);
  // 更新 UI
  document.body.className = newValue === 'dark' ? 'dark-mode' : 'light-mode';
});

// 在组件卸载时取消订阅
// unsubscribe();
```

### React 示例

在 React 组件中使用：

```tsx
import { useEffect, useState } from 'react';

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // 获取初始主题
    window.messageBus.getData('theme').then(setTheme);

    // 监听主题变化
    const unsubscribe = window.messageBus.watch('theme', (newTheme) => {
      setTheme(newTheme);
    });

    // 清理订阅
    return () => unsubscribe();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    await window.messageBus.setData('theme', newTheme);
  };

  return (
    <button onClick={toggleTheme}>
      当前主题: {theme}
    </button>
  );
}
```

### Vue 示例

在 Vue 组件中使用：

```vue
<template>
  <button @click="toggleTheme">
    当前主题: {{ theme }}
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const theme = ref<'light' | 'dark'>('light');
let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  // 获取初始主题
  theme.value = await window.messageBus.getData('theme');

  // 监听主题变化
  unsubscribe = window.messageBus.watch('theme', (newTheme) => {
    theme.value = newTheme;
  });
});

onUnmounted(() => {
  // 清理订阅
  unsubscribe?.();
});

const toggleTheme = async () => {
  const newTheme = theme.value === 'light' ? 'dark' : 'light';
  await window.messageBus.setData('theme', newTheme);
};
</script>
```

::: warning 重要提示
记得在组件卸载时取消订阅，避免内存泄漏！
:::


## 完整示例

恭喜！您已经完成了基本配置。现在您的应用拥有：

- ✅ 窗口管理和状态持久化
- ✅ 类型安全的 IPC 通信
- ✅ 跨窗口状态同步
- ✅ 性能监控（开发模式）

### 项目结构示例

```
my-electron-app/
├── src/
│   ├── main/
│   │   └── main.ts          # 主进程入口
│   ├── preload/
│   │   └── preload.ts       # 预加载脚本
│   ├── renderer/
│   │   ├── index.html       # 渲染进程 HTML
│   │   └── main.ts          # 渲染进程入口
│   └── types/
│       └── window.d.ts      # 类型定义
├── package.json
└── tsconfig.json
```

## 下一步

现在您已经掌握了基础知识，可以继续深入学习：

### 核心概念

- **[窗口管理器](/guide/core-concepts/window-manager)** - 深入了解窗口生命周期管理、插件系统
- **[IPC 路由](/guide/core-concepts/ipc-router)** - 学习如何定义类型安全的 IPC 处理程序
- **[消息总线](/guide/core-concepts/message-bus)** - 掌握跨窗口状态同步的高级用法
- **[生命周期管理](/guide/core-concepts/lifecycle)** - 了解应用生命周期钩子

### 实用示例

- **[基础配置](/examples/basic-setup)** - 完整的项目配置示例
- **[多窗口应用](/examples/multi-window)** - 创建和管理多个窗口
- **[IPC 通信](/examples/ipc-communication)** - 高级 IPC 通信模式
- **[状态同步](/examples/state-sync)** - 复杂的状态同步场景
- **[完整应用](/examples/complete-app)** - 综合使用所有功能的完整应用

### 进阶主题

- **[类型安全](/guide/advanced/type-safety)** - TypeScript 最佳实践
- **[性能优化](/guide/advanced/performance)** - 提升应用性能的技巧
- **[错误处理](/guide/advanced/error-handling)** - 健壮的错误处理策略
- **[调试技巧](/guide/advanced/debugging)** - 使用调试工具排查问题

### API 参考

- **[API 概览](/api/)** - 完整的 API 文档
- **[WindowManager API](/api/window-manager)** - 窗口管理器 API 详解
- **[IpcRouter API](/api/ipc-router)** - IPC 路由 API 详解
- **[MessageBus API](/api/message-bus)** - 消息总线 API 详解

## 需要帮助？

如果您遇到问题或有疑问：

- 📖 查看 [完整文档](/guide/introduction)
- 💬 在 [GitHub Issues](https://github.com/chunhaofen/electron-infra-kit/issues) 提问
- 🌟 给项目一个 [Star](https://github.com/chunhaofen/electron-infra-kit) 支持我们

祝您开发愉快！🚀
