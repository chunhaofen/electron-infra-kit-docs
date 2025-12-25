# Multi-Window Application Example

This example demonstrates how to use electron-infra-kit's WindowManager to create and manage multiple windows, and how to implement inter-window communication.

## Use Cases

Multi-window applications are common in:
- IDEs and code editors (main window + multiple editor windows)
- Design tools (main canvas + tool panels + property panels)
- Chat applications (main window + multiple chat windows)
- Document editors (multi-document interface)

## Main Process Implementation

```typescript
import { app, BrowserWindow } from 'electron';
import { createElectronToolkit } from 'electron-infra-kit';
import path from 'path';

const toolkit = createElectronToolkit({
  debug: true,
  logger: { level: 'info' },
});

const { windowManager, ipcRouter, messageBus, lifecycle } = toolkit;

// Define window types
type WindowType = 'main' | 'editor' | 'settings' | 'preview';

// Window configuration mapping
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

// Helper function to create windows
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
    // Window metadata
    metadata: {
      type,
      createdAt: Date.now(),
    },
  });

  // Load corresponding page
  if (process.env.NODE_ENV === 'development') {
    window.loadURL(`http://localhost:5173/${type}.html`);
  } else {
    window.loadFile(path.join(__dirname, `../renderer/${type}.html`));
  }

  return window;
}

// App startup
app.whenReady().then(() => {
  // Create main window
  const mainWindow = createWindow('main', 'main');

  // Listen to window lifecycle events
  lifecycle.on('window-created', (window) => {
    console.log(`Window created: ${window.id}`);
  });

  lifecycle.on('window-closed', (windowId) => {
    console.log(`Window closed: ${windowId}`);
  });

  // Register IPC handler: create new window
  ipcRouter.handle('window:create', async (event, { type, id }) => {
    try {
      // Check if window already exists
      const existing = windowManager.get(id);
      if (existing) {
        existing.focus();
        return { success: true, windowId: id, existed: true };
      }

      // Create new window
      const window = createWindow(type, id);
      return { success: true, windowId: id, existed: false };
    } catch (error) {
      console.error('Failed to create window:', error);
      return { success: false, error: error.message };
    }
  });

  // Register IPC handler: close window
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

  // Register IPC handler: get all windows
  ipcRouter.handle('window:list', async () => {
    const windows = windowManager.getAll();
    return windows.map((win) => ({
      id: win.id,
      title: win.getTitle(),
      bounds: win.getBounds(),
      metadata: windowManager.getMetadata(win.id),
    }));
  });

  // Register IPC handler: send message between windows
  ipcRouter.handle('window:sendMessage', async (event, { targetId, message }) => {
    try {
      const targetWindow = windowManager.get(targetId);
      if (!targetWindow) {
        return { success: false, error: 'Target window not found' };
      }

      // Send message via MessageBus
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

## Main Window Implementation

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

// Create editor window
document.getElementById('createEditor')?.addEventListener('click', async () => {
  const id = `editor-${Date.now()}`;
  const result = await window.electronAPI.invoke('window:create', {
    type: 'editor',
    id,
  });
  console.log('Create editor result:', result);
  refreshWindowList();
});

// Create settings window
document.getElementById('createSettings')?.addEventListener('click', async () => {
  const result = await window.electronAPI.invoke('window:create', {
    type: 'settings',
    id: 'settings',
  });
  console.log('Create settings result:', result);
  refreshWindowList();
});

// Create preview window
document.getElementById('createPreview')?.addEventListener('click', async () => {
  const id = `preview-${Date.now()}`;
  const result = await window.electronAPI.invoke('window:create', {
    type: 'preview',
    id,
  });
  console.log('Create preview result:', result);
  refreshWindowList();
});

// Refresh window list
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

// Close window
(window as any).closeWindow = async (windowId: string) => {
  await window.electronAPI.invoke('window:close', { windowId });
  refreshWindowList();
};

// Send message to other windows
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

// Listen for received messages
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

// Refresh list button
document.getElementById('refreshList')?.addEventListener('click', refreshWindowList);

// Initial load
refreshWindowList();
```

## Editor Window Implementation

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

// Save content to MessageBus
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

// Send message to main window
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

// Watch for shared content changes
window.electronAPI.messageBus.watch('editor-content', (content) => {
  console.log('Editor content updated from another window');
});
```

## Key Features

### 1. Window Type Management

```typescript
type WindowType = 'main' | 'editor' | 'settings' | 'preview';

const windowConfigs: Record<WindowType, WindowConfig> = {
  // Define configuration for each window type
};
```

### 2. Window Metadata

```typescript
windowManager.create({
  id: 'editor-1',
  metadata: {
    type: 'editor',
    createdAt: Date.now(),
    // Custom metadata
  },
});
```

### 3. Inter-Window Communication

Implement data sharing between windows via MessageBus:

```typescript
// Sender
await messageBus.setData(`window-message:${targetId}`, {
  from: senderId,
  message: 'Hello',
});

// Receiver
messageBus.watch(`window-message:${myId}`, (data) => {
  console.log('Received:', data);
});
```

### 4. Window Lifecycle Management

```typescript
lifecycle.on('window-created', (window) => {
  console.log('New window created');
});

lifecycle.on('window-closed', (windowId) => {
  console.log('Window closed');
});
```

## Best Practices

### 1. Window ID Naming Convention

Use meaningful ID naming:
```typescript
const id = `${type}-${timestamp}`;  // e.g., editor-1234567890
```

### 2. Prevent Duplicate Creation

Check if window exists before creating:
```typescript
const existing = windowManager.get(id);
if (existing) {
  existing.focus();
  return;
}
```

### 3. Clean Up Resources

Clean up related resources when window closes:
```typescript
lifecycle.on('window-closed', (windowId) => {
  // Clean up window data
  messageBus.removeData(`window-data:${windowId}`);
});
```

### 4. Error Handling

Always handle potential errors in window operations:
```typescript
try {
  const window = windowManager.create(config);
} catch (error) {
  console.error('Failed to create window:', error);
  // Show error notification
}
```

## Next Steps

- Learn detailed usage of [IPC Communication](./ipc-communication.md)
- Understand implementation of [State Synchronization](./state-sync.md)
- Check [WindowManager API](/en/api/window-manager.md) documentation

## FAQ

### Q: How to limit the number of windows?

A: Check the number of existing windows before creating:
```typescript
if (windowManager.getAll().length >= MAX_WINDOWS) {
  throw new Error('Maximum window limit reached');
}
```

### Q: How to implement parent-child window relationships?

A: Use BrowserWindow's parent option:
```typescript
windowManager.create({
  id: 'child',
  options: {
    parent: parentWindow,
    modal: true,
  },
});
```

### Q: How to save and restore window state?

A: Use MessageBus or configuration manager to save window position and size, then restore on restart.
