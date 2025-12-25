# Getting Started

Get your Electron application up and running with `electron-infra-kit` in 5 minutes.

This guide will walk you through the basic setup to quickly experience the core features of electron-infra-kit.


## Prerequisites

Before you begin, ensure your development environment meets the following requirements:

- **Electron** >= 22.0.0
- **TypeScript** >= 5.0.0
- **Node.js** >= 18.0.0

::: tip
We recommend using the latest stable versions for the best experience and performance.
:::


## Installation

Install `electron-infra-kit` using your preferred package manager:

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


## Main Process Setup

Initialize electron-infra-kit in your main process entry file (e.g., `src/main.ts`).

```typescript
import { app } from 'electron';
import { createElectronToolkit } from 'electron-infra-kit';
import path from 'path';

app.whenReady().then(async () => {
  // Initialize the toolkit
  const { windowManager, ipcRouter, messageBus } = createElectronToolkit({
    // Development mode configuration
    isDevelopment: process.env.NODE_ENV === 'development',
    
    // IPC router configuration
    ipc: { 
      autoInit: true  // Automatically initialize IPC handlers
    },
    
    // Default window configuration
    defaultConfig: {
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,      // Enable context isolation
        nodeIntegration: false,       // Disable Node integration
      },
    },
  });

  // Wait for initialization to complete
  await windowManager.ready();

  // Create the main window
  const mainWindow = await windowManager.create({
    name: 'main',                    // Unique window identifier
    title: 'My App',
    width: 1024,
    height: 768,
    loadUrl: 'http://localhost:5173', // Development server URL
    // Or use local file: loadFile: path.join(__dirname, '../renderer/index.html')
  });

  console.log('Main window created:', mainWindow);
});

// Handle app quit
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

### Configuration Options

`createElectronToolkit` accepts the following configuration options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `isDevelopment` | `boolean` | `false` | Enable development mode with debugging tools |
| `ipc.autoInit` | `boolean` | `false` | Automatically initialize IPC handlers |
| `defaultConfig` | `BrowserWindowConstructorOptions` | `{}` | Default window configuration options |

### Window Creation Options

`windowManager.create()` supports the following main options:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | `string` | Yes | Unique identifier for the window |
| `title` | `string` | No | Window title |
| `width` | `number` | No | Window width |
| `height` | `number` | No | Window height |
| `loadUrl` | `string` | No | URL to load |
| `loadFile` | `string` | No | Local file path to load |

::: tip
Choose either `loadUrl` or `loadFile`. Development environments typically use `loadUrl` to connect to a dev server, while production uses `loadFile` to load bundled files.
:::


## Preload Script Setup

The preload script runs in the renderer process but has access to Node.js APIs. It's responsible for exposing safe APIs to the renderer process.

In your preload script file (e.g., `src/preload.ts`):

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { IpcRendererBridge, setupMessageBus } from 'electron-infra-kit';

// 1. Expose IPC Router API
const ipcBridge = new IpcRendererBridge();
ipcBridge.exposeApi('ipcApi');  // Expose API as window.ipcApi

// 2. Setup Message Bus connection
setupMessageBus();  // Expose message bus as window.messageBus
```

### API Description

#### IpcRendererBridge

`IpcRendererBridge` provides type-safe IPC communication bridging:

- **`exposeApi(apiName: string)`**: Exposes the IPC API to the renderer process's window object
  - `apiName`: Property name on the window object, defaults to `'ipcApi'`

#### setupMessageBus

`setupMessageBus()` establishes a message bus connection for cross-window state synchronization:

- Automatically connects to the main process message bus
- Exposes the message bus API as `window.messageBus`
- Supports data setting, getting, and watching

::: warning Security Note
Preload scripts should only expose necessary APIs. Avoid directly exposing the full Node.js or Electron API. electron-infra-kit handles security concerns for you.
:::

### TypeScript Type Definitions

For full type support in the renderer process, add to your type definition file:

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


## Renderer Process Usage

Now you can use the APIs provided by electron-infra-kit in your renderer process (frontend code).

### Using IPC Communication

Call main process IPC handlers through `window.ipcApi`:

```typescript
// In your React/Vue/vanilla JS code

// Call an IPC handler
async function fetchUserData(userId: string) {
  try {
    const result = await window.ipcApi.invoke('getUser', { id: userId });
    console.log('User data:', result);
    return result;
  } catch (error) {
    console.error('Failed to fetch user data:', error);
  }
}

// Call file operations
async function saveFile(content: string) {
  const result = await window.ipcApi.invoke('saveFile', {
    path: '/path/to/file.txt',
    content: content
  });
  
  if (result.success) {
    console.log('File saved successfully');
  }
}
```

::: tip Type Safety
If you've configured TypeScript type definitions correctly, your editor will provide autocomplete and type checking for the `invoke` method.
:::

### Using Message Bus

The message bus is used for cross-window state synchronization:

```typescript
// Set data (automatically syncs to all windows)
await window.messageBus.setData('theme', 'dark');
await window.messageBus.setData('user', {
  id: '123',
  name: 'John Doe',
  role: 'admin'
});

// Get data
const theme = await window.messageBus.getData('theme');
console.log('Current theme:', theme); // 'dark'

// Watch for data changes
const unsubscribe = window.messageBus.watch('theme', (newValue, oldValue) => {
  console.log(`Theme changed from ${oldValue} to ${newValue}`);
  // Update UI
  document.body.className = newValue === 'dark' ? 'dark-mode' : 'light-mode';
});

// Unsubscribe when component unmounts
// unsubscribe();
```

### React Example

Using in a React component:

```tsx
import { useEffect, useState } from 'react';

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Get initial theme
    window.messageBus.getData('theme').then(setTheme);

    // Watch for theme changes
    const unsubscribe = window.messageBus.watch('theme', (newTheme) => {
      setTheme(newTheme);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    await window.messageBus.setData('theme', newTheme);
  };

  return (
    <button onClick={toggleTheme}>
      Current theme: {theme}
    </button>
  );
}
```

### Vue Example

Using in a Vue component:

```vue
<template>
  <button @click="toggleTheme">
    Current theme: {{ theme }}
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const theme = ref<'light' | 'dark'>('light');
let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  // Get initial theme
  theme.value = await window.messageBus.getData('theme');

  // Watch for theme changes
  unsubscribe = window.messageBus.watch('theme', (newTheme) => {
    theme.value = newTheme;
  });
});

onUnmounted(() => {
  // Cleanup subscription
  unsubscribe?.();
});

const toggleTheme = async () => {
  const newTheme = theme.value === 'light' ? 'dark' : 'light';
  await window.messageBus.setData('theme', newTheme);
};
</script>
```

::: warning Important
Remember to unsubscribe when components unmount to avoid memory leaks!
:::


## Complete Example

Congratulations! You've completed the basic setup. Your application now has:

- ✅ Window management with state persistence
- ✅ Type-safe IPC communication
- ✅ Cross-window state synchronization
- ✅ Performance monitoring (in development mode)

### Example Project Structure

```
my-electron-app/
├── src/
│   ├── main/
│   │   └── main.ts          # Main process entry
│   ├── preload/
│   │   └── preload.ts       # Preload script
│   ├── renderer/
│   │   ├── index.html       # Renderer HTML
│   │   └── main.ts          # Renderer entry
│   └── types/
│       └── window.d.ts      # Type definitions
├── package.json
└── tsconfig.json
```

## Next Steps

Now that you've mastered the basics, continue learning:

### Core Concepts

- **[Window Manager](/en/guide/core-concepts/window-manager)** - Deep dive into window lifecycle management and plugin system
- **[IPC Router](/en/guide/core-concepts/ipc-router)** - Learn how to define type-safe IPC handlers
- **[Message Bus](/en/guide/core-concepts/message-bus)** - Master advanced cross-window state synchronization
- **[Lifecycle Manager](/en/guide/core-concepts/lifecycle)** - Understand application lifecycle hooks

### Practical Examples

- **[Basic Setup](/en/examples/basic-setup)** - Complete project configuration example
- **[Multi-Window App](/en/examples/multi-window)** - Create and manage multiple windows
- **[IPC Communication](/en/examples/ipc-communication)** - Advanced IPC communication patterns
- **[State Sync](/en/examples/state-sync)** - Complex state synchronization scenarios
- **[Complete App](/en/examples/complete-app)** - Full application using all features

### Advanced Topics

- **[Type Safety](/en/guide/advanced/type-safety)** - TypeScript best practices
- **[Performance](/en/guide/advanced/performance)** - Tips to improve application performance
- **[Error Handling](/en/guide/advanced/error-handling)** - Robust error handling strategies
- **[Debugging](/en/guide/advanced/debugging)** - Using debugging tools to troubleshoot issues

### API Reference

- **[API Overview](/en/api/)** - Complete API documentation
- **[WindowManager API](/en/api/window-manager)** - Window Manager API details
- **[IpcRouter API](/en/api/ipc-router)** - IPC Router API details
- **[MessageBus API](/en/api/message-bus)** - Message Bus API details

## Need Help?

If you encounter issues or have questions:

- 📖 Check the [complete documentation](/en/guide/introduction)
- 💬 Ask questions on [GitHub Issues](https://github.com/chunhaofen/electron-infra-kit/issues)
- 🌟 Give the project a [Star](https://github.com/chunhaofen/electron-infra-kit) to support us

Happy coding! 🚀
