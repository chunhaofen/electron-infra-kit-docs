# Basic Setup Example

This example demonstrates how to configure an Electron application using electron-infra-kit from scratch. This is the simplest configuration approach, suitable for quick start and understanding basic concepts.

## Project Structure

```
my-electron-app/
├── src/
│   ├── main/
│   │   └── index.ts          # Main process entry
│   ├── preload/
│   │   └── index.ts          # Preload script
│   └── renderer/
│       ├── index.html        # Renderer process HTML
│       └── index.ts          # Renderer process logic
├── package.json
└── tsconfig.json
```

## Install Dependencies

First, install the necessary dependencies:

```bash
npm install electron-infra-kit
npm install --save-dev electron typescript
```

## Main Process Configuration

Create `src/main/index.ts` file:

```typescript
import { app, BrowserWindow } from 'electron';
import { createElectronToolkit } from 'electron-infra-kit';
import path from 'path';

// Create electron-infra-kit instance
const toolkit = createElectronToolkit({
  // Configuration options
  debug: true, // Enable debug mode
  logger: {
    level: 'info',
    enableConsole: true,
  },
});

// Get managers
const { windowManager, ipcRouter, messageBus, lifecycle } = toolkit;

// Create window when app is ready
app.whenReady().then(() => {
  // Create main window
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

  // Load page
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Open DevTools (development mode)
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Recreate window when dock icon is clicked on macOS
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

## Preload Script Configuration

Create `src/preload/index.ts` file:

```typescript
import { contextBridge } from 'electron';
import { IpcRendererBridge, setupMessageBus } from 'electron-infra-kit/preload';

// Create IPC bridge
const ipcBridge = new IpcRendererBridge();

// Setup MessageBus
const messageBus = setupMessageBus();

// Expose API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // IPC invoke method
  invoke: (channel: string, ...args: any[]) => {
    return ipcBridge.invoke(channel, ...args);
  },

  // MessageBus methods
  messageBus: {
    getData: (key: string) => messageBus.getData(key),
    setData: (key: string, value: any) => messageBus.setData(key, value),
    watch: (key: string, callback: (value: any) => void) => {
      return messageBus.watch(key, callback);
    },
  },
});
```

## Renderer Process Usage

Create `src/renderer/index.html` file:

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
      <button id="testBtn">Test IPC Call</button>
      <div id="result"></div>
    </div>
    <script src="./index.js"></script>
  </body>
</html>
```

Create `src/renderer/index.ts` file:

```typescript
// Type definitions
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

// Use API
document.getElementById('testBtn')?.addEventListener('click', async () => {
  try {
    // Example: Call IPC (requires corresponding handler in main process)
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

// Watch shared data changes
const unwatch = window.electronAPI.messageBus.watch('app-state', (value) => {
  console.log('App state changed:', value);
});

// Unwatch when component unmounts
window.addEventListener('beforeunload', () => {
  unwatch();
});
```

## package.json Configuration

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

## TypeScript Configuration

Create `tsconfig.json` file:

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

## Run the Application

1. Compile TypeScript code:

```bash
npm run build
```

2. Start the application:

```bash
npm start
```

## Key Points

### 1. Initialize Toolkit

```typescript
const toolkit = createElectronToolkit({
  debug: true,
  logger: { level: 'info' },
});
```

This is the first step to use electron-infra-kit, which initializes all core modules.

### 2. Use WindowManager

```typescript
const mainWindow = windowManager.create({
  id: 'main',
  options: { width: 1200, height: 800 },
});
```

WindowManager simplifies window creation and management.

### 3. Configure Preload Script

```typescript
const ipcBridge = new IpcRendererBridge();
const messageBus = setupMessageBus();
```

The preload script is the bridge connecting the main process and renderer process.

### 4. Type Safety

Ensure type safety of API calls through TypeScript type definitions.

## Next Steps

- Learn the [Multi-Window Application](./multi-window.md) example
- Understand detailed usage of [IPC Communication](./ipc-communication.md)
- Check [API Reference](/en/api/) for more features

## FAQ

### Q: How to enable hot reload in development mode?

A: Use build tools like Vite or Webpack to configure a development server, then load the development server URL in the main process.

### Q: Can I use Node.js APIs in the preload script?

A: Yes, but it's recommended to only expose necessary APIs to the renderer process to maintain security.

### Q: How to debug main process code?

A: Start Electron with the `--inspect` flag, then use Chrome DevTools or VS Code for debugging.
