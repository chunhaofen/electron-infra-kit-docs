# Complete Application Example

This example demonstrates a complete application that comprehensively uses all features of electron-infra-kit. We'll create a simple note-taking application that includes multi-window management, IPC communication, state synchronization, configuration management, and debugging tools.

## Application Features

- 📝 Create and edit notes
- 🪟 Multi-window support (main window, editor window, settings window)
- 🔄 Cross-window state synchronization
- 💾 Auto-save and persistence
- 🎨 Theme switching (light/dark)
- ⚙️ Configuration management
- 🐛 Debug tools integration

## Project Structure

```
note-app/
├── src/
│   ├── main/
│   │   ├── index.ts              # Main process entry
│   │   ├── services/             # Business services
│   │   │   ├── NoteService.ts    # Note service
│   │   │   └── ConfigService.ts  # Config service
│   │   └── handlers/             # IPC handlers
│   │       ├── noteHandlers.ts   # Note-related handlers
│   │       └── configHandlers.ts # Config-related handlers
│   ├── preload/
│   │   └── index.ts              # Preload script
│   ├── renderer/
│   │   ├── main/                 # Main window
│   │   │   ├── index.html
│   │   │   └── index.ts
│   │   ├── editor/               # Editor window
│   │   │   ├── index.html
│   │   │   └── index.ts
│   │   └── settings/             # Settings window
│   │       ├── index.html
│   │       └── index.ts
│   └── shared/
│       └── types.ts              # Shared type definitions
├── package.json
└── tsconfig.json
```

## Shared Type Definitions

`src/shared/types.ts`:

```typescript
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface AppConfig {
  theme: 'light' | 'dark';
  autoSave: boolean;
  autoSaveInterval: number; // milliseconds
  fontSize: number;
  fontFamily: string;
}

export interface AppState {
  notes: Note[];
  selectedNoteId: string | null;
  config: AppConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
  theme: 'light',
  autoSave: true,
  autoSaveInterval: 5000,
  fontSize: 14,
  fontFamily: 'monospace',
};
```

## Main Process Implementation

The main process implementation includes:

1. **NoteService** - Handles note CRUD operations and file system persistence
2. **ConfigService** - Manages application configuration
3. **IPC Handlers** - Define handlers for note and config operations
4. **Window Management** - Creates and manages different window types
5. **State Synchronization** - Uses MessageBus for cross-window state sync
6. **Auto-save** - Implements automatic saving based on configuration

Key implementation in `src/main/index.ts`:

```typescript
import { app, BrowserWindow } from 'electron';
import { createElectronToolkit } from 'electron-infra-kit';
import path from 'path';
import { NoteService } from './services/NoteService';
import { ConfigService } from './services/ConfigService';
import { createNoteHandlers } from './handlers/noteHandlers';
import { AppState, DEFAULT_CONFIG } from '../shared/types';

const toolkit = createElectronToolkit({
  debug: process.env.NODE_ENV === 'development',
  logger: {
    level: 'info',
    enableConsole: true,
  },
});

const { windowManager, ipcRouter, messageBus, lifecycle, debugHelper } = toolkit;

// Create service instances
const noteService = new NoteService();
const configService = new ConfigService();

// Register services to DI container
ipcRouter.registerService('noteService', noteService);
ipcRouter.registerService('configService', configService);

app.whenReady().then(async () => {
  // Initialize services
  await noteService.initialize();

  // Load config and notes
  const config = await configService.loadConfig();
  const notes = await noteService.loadNotes();

  // Initialize app state
  const initialState: AppState = {
    notes,
    selectedNoteId: null,
    config,
  };

  await messageBus.setData('app-state', initialState);

  // Configure permissions
  messageBus.setPermissions('app-state', {
    read: true,
    write: true,
  });

  // Register IPC handlers
  const noteHandlers = createNoteHandlers(noteService);
  noteHandlers.forEach((handler) => ipcRouter.addHandler(handler));

  // Config handler
  ipcRouter.handle('config:update', async (event, { config }) => {
    try {
      await configService.saveConfig(config);
      const state = await messageBus.getData<AppState>('app-state');
      await messageBus.setData('app-state', { ...state, config });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Window creation handler
  ipcRouter.handle('window:create', async (event, { type, noteId }) => {
    try {
      const id = `${type}-${Date.now()}`;
      const window = createWindow(type, id, noteId);
      return { success: true, windowId: id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Create main window
  createWindow('main', 'main');

  // Listen to lifecycle events
  lifecycle.on('window-created', (window) => {
    console.log(`Window created: ${window.id}`);
    debugHelper.logWindowInfo(window.id);
  });

  lifecycle.on('window-closed', (windowId) => {
    console.log(`Window closed: ${windowId}`);
  });

  // Auto-save functionality
  let autoSaveTimer: NodeJS.Timeout;

  messageBus.watch('app-state', async (state: AppState) => {
    if (state.config.autoSave) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(async () => {
        // Save all notes
        for (const note of state.notes) {
          await noteService.saveNote(note);
        }
        console.log('Auto-saved notes');
      }, state.config.autoSaveInterval);
    }
  });
});

function createWindow(
  type: 'main' | 'editor' | 'settings',
  id: string,
  noteId?: string
) {
  const configs = {
    main: { width: 1200, height: 800, title: 'Note App' },
    editor: { width: 900, height: 700, title: 'Editor' },
    settings: { width: 600, height: 500, title: 'Settings' },
  };

  const config = configs[type];

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
    metadata: { type, noteId },
  });

  if (process.env.NODE_ENV === 'development') {
    window.loadURL(`http://localhost:5173/${type}.html`);
    window.webContents.openDevTools();
  } else {
    window.loadFile(path.join(__dirname, `../renderer/${type}/index.html`));
  }

  return window;
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow('main', 'main');
  }
});
```

## Preload Script

`src/preload/index.ts`:

```typescript
import { contextBridge } from 'electron';
import { IpcRendererBridge, setupMessageBus } from 'electron-infra-kit/preload';
import { Note, AppConfig, AppState } from '../shared/types';

const ipcBridge = new IpcRendererBridge();
const messageBus = setupMessageBus();

interface NoteAPI {
  // Note operations
  loadNotes: () => Promise<any>;
  createNote: (params: {
    title: string;
    content?: string;
    tags?: string[];
  }) => Promise<any>;
  updateNote: (params: {
    id: string;
    title?: string;
    content?: string;
    tags?: string[];
  }) => Promise<any>;
  deleteNote: (id: string) => Promise<any>;
  searchNotes: (query: string) => Promise<any>;

  // Config operations
  updateConfig: (config: AppConfig) => Promise<any>;

  // Window operations
  createWindow: (type: string, noteId?: string) => Promise<any>;

  // State synchronization
  getState: () => Promise<AppState>;
  watchState: (callback: (state: AppState) => void) => () => void;
}

const noteAPI: NoteAPI = {
  loadNotes: () => ipcBridge.invoke('notes:load'),
  createNote: (params) => ipcBridge.invoke('notes:create', params),
  updateNote: (params) => ipcBridge.invoke('notes:update', params),
  deleteNote: (id) => ipcBridge.invoke('notes:delete', { id }),
  searchNotes: (query) => ipcBridge.invoke('notes:search', { query }),
  updateConfig: (config) => ipcBridge.invoke('config:update', { config }),
  createWindow: (type, noteId) =>
    ipcBridge.invoke('window:create', { type, noteId }),
  getState: () => messageBus.getData('app-state'),
  watchState: (callback) => messageBus.watch('app-state', callback),
};

contextBridge.exposeInMainWorld('noteAPI', noteAPI);
```

## Renderer Process Implementation

The renderer process includes three main windows:

1. **Main Window** - Displays note list and search functionality
2. **Editor Window** - Allows editing individual notes
3. **Settings Window** - Manages application configuration

Each window:
- Loads initial state from MessageBus
- Watches for state changes
- Updates UI reactively
- Applies theme based on configuration

## Key Features Summary

### 1. Modular Architecture
- Service layer (NoteService, ConfigService)
- Handler layer (noteHandlers, configHandlers)
- Clear separation of concerns

### 2. Type Safety
- Shared type definitions
- Full-stack TypeScript type checking
- Zod runtime validation

### 3. State Management
- Centralized state (AppState)
- Cross-window synchronization
- Reactive updates

### 4. Persistence
- File system storage
- Auto-save functionality
- Configuration management

### 5. Debug Support
- Debug Helper integration
- Lifecycle logging
- Developer tools

## Running the Application

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Start
npm start
```

## Next Steps

- Check [API Reference](/en/api/) for more features
- Learn [Best Practices](/en/guide/best-practices.md)
- Explore [Advanced Topics](/en/guide/advanced/type-safety.md)

## Extension Suggestions

1. **Add More Features**
   - Note categories and tags
   - Rich text editor
   - Export functionality (PDF, Markdown)

2. **Performance Optimization**
   - Virtual scrolling
   - Lazy loading
   - Caching strategies

3. **User Experience**
   - Keyboard shortcuts
   - Drag-and-drop sorting
   - Undo/redo

4. **Data Security**
   - Encrypted storage
   - Backup functionality
   - Cloud synchronization
