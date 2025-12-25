# 多窗口应用示例

本示例展示如何使用 electron-infra-kit 的 WindowManager 创建和管理多个窗口，以及如何实现窗口间的通信。

## 应用场景

多窗口应用常见于：
- IDE 和代码编辑器（主窗口 + 多个编辑器窗口）
- 设计工具（主画布 + 工具面板 + 属性面板）
- 聊天应用（主窗口 + 多个聊天窗口）
- 文档编辑器（多文档界面）

## 主进程实现

```typescript
import { app, BrowserWindow } from 'electron';
import { createElectronToolkit } from 'electron-infra-kit';
import path from 'path';

const toolkit = createElectronToolkit({
  debug: true,
  logger: { level: 'info' },
});

const { windowManager, ipcRouter, messageBus, lifecycle } = toolkit;

// 定义窗口类型
type WindowType = 'main' | 'editor' | 'settings' | 'preview';

// 窗口配置映射
const windowConfigs: Record<
  WindowType,
  { width: number; height: number; title: string }
> = {
  main: {
    width: 1200,
    height: 800,
    title: 'Main Window',
  },
  editor: {
    width: 800,
    height: 600,
    title: 'Editor Window',
  },
  settings: {
    width: 600,
    height: 400,
    title: 'Settings',
  },
  preview: {
    width: 1000,
    height: 700,
    title: 'Preview',
  },
};

// 创建窗口的辅助函数
function createWindow(type: WindowType, id: string) {
  const config = windowConfigs[type];

  const window = windowManager.create({
    id,
    options: {
      width: config.width,
      height: config.height,
      title: config.title,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    },
    // 窗口元数据
    metadata: {
      type,
      createdAt: Date.now(),
    },
  });

  // 加载对应的页面
  if (process.env.NODE_ENV === 'development') {
    window.loadURL(`http://localhost:5173/${type}.html`);
  } else {
    window.loadFile(path.join(__dirname, `../renderer/${type}.html`));
  }

  return window;
}

// 应用启动
app.whenReady().then(() => {
  // 创建主窗口
  const mainWindow = createWindow('main', 'main');

  // 监听窗口生命周期事件
  lifecycle.on('window-created', (window) => {
    console.log(`Window created: ${window.id}`);
  });

  lifecycle.on('window-closed', (windowId) => {
    console.log(`Window closed: ${windowId}`);
  });

  // 注册 IPC 处理器：创建新窗口
  ipcRouter.handle('window:create', async (event, { type, id }) => {
    try {
      // 检查窗口是否已存在
      const existing = windowManager.get(id);
      if (existing) {
        existing.focus();
        return { success: true, windowId: id, existed: true };
      }

      // 创建新窗口
      const window = createWindow(type, id);
      return { success: true, windowId: id, existed: false };
    } catch (error) {
      console.error('Failed to create window:', error);
      return { success: false, error: error.message };
    }
  });

  // 注册 IPC 处理器：关闭窗口
  ipcRouter.handle('window:close', async (event, { windowId }) => {
    try {
      const window = windowManager.get(windowId);
      if (window) {
        window.close();
        return { success: true };
      }
      return { success: false, error: 'Window not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 注册 IPC 处理器：获取所有窗口
  ipcRouter.handle('window:list', async () => {
    const windows = windowManager.getAll();
    return windows.map((win) => ({
      id: win.id,
      title: win.getTitle(),
      bounds: win.getBounds(),
      metadata: windowManager.getMetadata(win.id),
    }));
  });

  // 注册 IPC 处理器：窗口间发送消息
  ipcRouter.handle('window:sendMessage', async (event, { targetId, message }) => {
    try {
      const targetWindow = windowManager.get(targetId);
      if (!targetWindow) {
        return { success: false, error: 'Target window not found' };
      }

      // 通过 MessageBus 发送消息
      await messageBus.setData(`window-message:${targetId}`, {
        from: event.sender.id,
        message,
        timestamp: Date.now(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

## 主窗口实现

`src/renderer/main.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Main Window</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        padding: 20px;
      }
      .window-list {
        margin: 20px 0;
      }
      .window-item {
        padding: 10px;
        margin: 5px 0;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      button {
        margin: 5px;
        padding: 8px 16px;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <h1>Multi-Window Manager</h1>

    <div>
      <h2>Create Windows</h2>
      <button id="createEditor">Create Editor Window</button>
      <button id="createSettings">Create Settings Window</button>
      <button id="createPreview">Create Preview Window</button>
    </div>

    <div>
      <h2>Active Windows</h2>
      <button id="refreshList">Refresh List</button>
      <div id="windowList" class="window-list"></div>
    </div>

    <div>
      <h2>Send Message</h2>
      <input id="targetWindowId" placeholder="Target Window ID" />
      <input id="messageText" placeholder="Message" />
      <button id="sendMessage">Send</button>
    </div>

    <div>
      <h2>Received Messages</h2>
      <div id="messages"></div>
    </div>

    <script src="./main.js"></script>
  </body>
</html>
```

`src/renderer/main.ts`:

```typescript
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

// 创建编辑器窗口
document.getElementById('createEditor')?.addEventListener('click', async () => {
  const id = `editor-${Date.now()}`;
  const result = await window.electronAPI.invoke('window:create', {
    type: 'editor',
    id,
  });
  console.log('Create editor result:', result);
  refreshWindowList();
});

// 创建设置窗口
document.getElementById('createSettings')?.addEventListener('click', async () => {
  const result = await window.electronAPI.invoke('window:create', {
    type: 'settings',
    id: 'settings',
  });
  console.log('Create settings result:', result);
  refreshWindowList();
});

// 创建预览窗口
document.getElementById('createPreview')?.addEventListener('click', async () => {
  const id = `preview-${Date.now()}`;
  const result = await window.electronAPI.invoke('window:create', {
    type: 'preview',
    id,
  });
  console.log('Create preview result:', result);
  refreshWindowList();
});

// 刷新窗口列表
async function refreshWindowList() {
  const windows = await window.electronAPI.invoke('window:list');
  const listElement = document.getElementById('windowList');

  if (listElement) {
    listElement.innerHTML = windows
      .map(
        (win: any) => `
        <div class="window-item">
          <strong>${win.title}</strong> (ID: ${win.id})
          <br>
          Size: ${win.bounds.width}x${win.bounds.height}
          <br>
          <button onclick="closeWindow('${win.id}')">Close</button>
        </div>
      `
      )
      .join('');
  }
}

// 关闭窗口
(window as any).closeWindow = async (windowId: string) => {
  await window.electronAPI.invoke('window:close', { windowId });
  refreshWindowList();
};

// 发送消息到其他窗口
document.getElementById('sendMessage')?.addEventListener('click', async () => {
  const targetId = (document.getElementById('targetWindowId') as HTMLInputElement)
    .value;
  const message = (document.getElementById('messageText') as HTMLInputElement)
    .value;

  if (!targetId || !message) {
    alert('Please enter target window ID and message');
    return;
  }

  const result = await window.electronAPI.invoke('window:sendMessage', {
    targetId,
    message,
  });

  if (result.success) {
    alert('Message sent successfully');
  } else {
    alert(`Failed to send message: ${result.error}`);
  }
});

// 监听接收到的消息
window.electronAPI.messageBus.watch('window-message:main', (data) => {
  const messagesDiv = document.getElementById('messages');
  if (messagesDiv) {
    const messageElement = document.createElement('div');
    messageElement.textContent = `From ${data.from}: ${data.message} (${new Date(
      data.timestamp
    ).toLocaleTimeString()})`;
    messagesDiv.appendChild(messageElement);
  }
});

// 刷新列表按钮
document.getElementById('refreshList')?.addEventListener('click', refreshWindowList);

// 初始加载
refreshWindowList();
```

## 编辑器窗口实现

`src/renderer/editor.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Editor Window</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        padding: 20px;
      }
      textarea {
        width: 100%;
        height: 400px;
        font-family: monospace;
        padding: 10px;
      }
    </style>
  </head>
  <body>
    <h1>Editor Window</h1>
    <textarea id="editor" placeholder="Start typing..."></textarea>
    <div>
      <button id="saveBtn">Save</button>
      <button id="sendToMain">Send to Main Window</button>
    </div>
    <div id="status"></div>
    <script src="./editor.js"></script>
  </body>
</html>
```

`src/renderer/editor.ts`:

```typescript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const editor = document.getElementById('editor') as HTMLTextAreaElement;
const statusDiv = document.getElementById('status');

// 保存内容到 MessageBus
document.getElementById('saveBtn')?.addEventListener('click', async () => {
  const content = editor.value;
  await window.electronAPI.messageBus.setData('editor-content', content);

  if (statusDiv) {
    statusDiv.textContent = 'Content saved!';
    setTimeout(() => {
      statusDiv.textContent = '';
    }, 2000);
  }
});

// 发送消息到主窗口
document.getElementById('sendToMain')?.addEventListener('click', async () => {
  const content = editor.value;
  await window.electronAPI.invoke('window:sendMessage', {
    targetId: 'main',
    message: `Editor content: ${content.substring(0, 50)}...`,
  });

  if (statusDiv) {
    statusDiv.textContent = 'Message sent to main window!';
    setTimeout(() => {
      statusDiv.textContent = '';
    }, 2000);
  }
});

// 监听共享内容的变化
window.electronAPI.messageBus.watch('editor-content', (content) => {
  console.log('Editor content updated from another window');
});
```

## 关键特性

### 1. 窗口类型管理

```typescript
type WindowType = 'main' | 'editor' | 'settings' | 'preview';

const windowConfigs: Record<WindowType, WindowConfig> = {
  // 为每种窗口类型定义配置
};
```

### 2. 窗口元数据

```typescript
windowManager.create({
  id: 'editor-1',
  metadata: {
    type: 'editor',
    createdAt: Date.now(),
    // 自定义元数据
  },
});
```

### 3. 窗口间通信

通过 MessageBus 实现窗口间的数据共享：

```typescript
// 发送方
await messageBus.setData(`window-message:${targetId}`, {
  from: senderId,
  message: 'Hello',
});

// 接收方
messageBus.watch(`window-message:${myId}`, (data) => {
  console.log('Received:', data);
});
```

### 4. 窗口生命周期管理

```typescript
lifecycle.on('window-created', (window) => {
  console.log('New window created');
});

lifecycle.on('window-closed', (windowId) => {
  console.log('Window closed');
});
```

## 最佳实践

### 1. 窗口 ID 命名规范

使用有意义的 ID 命名：
```typescript
const id = `${type}-${timestamp}`;  // 例如: editor-1234567890
```

### 2. 防止重复创建

在创建窗口前检查是否已存在：
```typescript
const existing = windowManager.get(id);
if (existing) {
  existing.focus();
  return;
}
```

### 3. 清理资源

窗口关闭时清理相关资源：
```typescript
lifecycle.on('window-closed', (windowId) => {
  // 清理该窗口的数据
  messageBus.removeData(`window-data:${windowId}`);
});
```

### 4. 错误处理

始终处理窗口操作可能出现的错误：
```typescript
try {
  const window = windowManager.create(config);
} catch (error) {
  console.error('Failed to create window:', error);
  // 显示错误提示
}
```

## 下一步

- 学习 [IPC 通信](./ipc-communication.md) 的详细用法
- 了解 [状态同步](./state-sync.md) 的实现方式
- 查看 [WindowManager API](/api/window-manager.md) 文档

## 常见问题

### Q: 如何限制窗口数量？

A: 在创建窗口前检查现有窗口数量：
```typescript
if (windowManager.getAll().length >= MAX_WINDOWS) {
  throw new Error('Maximum window limit reached');
}
```

### Q: 如何实现窗口的父子关系？

A: 使用 BrowserWindow 的 parent 选项：
```typescript
windowManager.create({
  id: 'child',
  options: {
    parent: parentWindow,
    modal: true,
  },
});
```

### Q: 如何保存和恢复窗口状态？

A: 使用 MessageBus 或配置管理器保存窗口的位置和大小，在重启时恢复。
