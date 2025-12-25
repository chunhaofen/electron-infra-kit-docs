# State Synchronization Example

This example demonstrates how to use electron-infra-kit's MessageBus to synchronize state across multiple windows. We'll create a collaborative todo application to demonstrate real-time data synchronization across windows.

## Use Cases

State synchronization is suitable for:
- Collaborative applications (multi-user or multi-window editing)
- Real-time data display (dashboards, monitoring panels)
- State sharing in multi-window applications
- Configuration and settings synchronization

## Main Process Implementation

```typescript
import { app, BrowserWindow } from 'electron';
import { createElectronToolkit } from 'electron-infra-kit';
import path from 'path';

const toolkit = createElectronToolkit({
  debug: true,
  logger: { level: 'info' },
});

const { windowManager, messageBus, ipcRouter } = toolkit;

// ============================================
// Data Model Definition
// ============================================

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

interface AppState {
  todos: TodoItem[];
  filter: 'all' | 'active' | 'completed';
  theme: 'light' | 'dark';
}

// Initial state
const initialState: AppState = {
  todos: [],
  filter: 'all',
  theme: 'light',
};

// ============================================
// Initialize MessageBus
// ============================================

app.whenReady().then(async () => {
  // Set initial state
  await messageBus.setData('app-state', initialState);

  // Configure data permissions
  messageBus.setPermissions('app-state', {
    read: true,  // All windows can read
    write: true, // All windows can write
  });

  // ============================================
  // IPC Handlers: Todo Operations
  // ============================================

  // Add todo
  ipcRouter.handle('todo:add', async (event, { title }) => {
    try {
      const state = await messageBus.getData<AppState>('app-state');

      const newTodo: TodoItem = {
        id: `todo-${Date.now()}`,
        title,
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const newState = {
        ...state,
        todos: [...state.todos, newTodo],
      };

      await messageBus.setData('app-state', newState);

      return { success: true, todo: newTodo };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Toggle todo completion
  ipcRouter.handle('todo:toggle', async (event, { id }) => {
    try {
      const state = await messageBus.getData<AppState>('app-state');

      const newState = {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === id
            ? { ...todo, completed: !todo.completed, updatedAt: Date.now() }
            : todo
        ),
      };

      await messageBus.setData('app-state', newState);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Delete todo
  ipcRouter.handle('todo:delete', async (event, { id }) => {
    try {
      const state = await messageBus.getData<AppState>('app-state');

      const newState = {
        ...state,
        todos: state.todos.filter((todo) => todo.id !== id),
      };

      await messageBus.setData('app-state', newState);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Update filter
  ipcRouter.handle('filter:set', async (event, { filter }) => {
    try {
      const state = await messageBus.getData<AppState>('app-state');

      const newState = {
        ...state,
        filter,
      };

      await messageBus.setData('app-state', newState);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Toggle theme
  ipcRouter.handle('theme:toggle', async () => {
    try {
      const state = await messageBus.getData<AppState>('app-state');

      const newState = {
        ...state,
        theme: state.theme === 'light' ? 'dark' : 'light',
      };

      await messageBus.setData('app-state', newState);

      return { success: true, theme: newState.theme };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Clear completed todos
  ipcRouter.handle('todo:clearCompleted', async () => {
    try {
      const state = await messageBus.getData<AppState>('app-state');

      const newState = {
        ...state,
        todos: state.todos.filter((todo) => !todo.completed),
      };

      await messageBus.setData('app-state', newState);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // Create Windows
  // ============================================

  function createTodoWindow(id: string, title: string) {
    const window = windowManager.create({
      id,
      options: {
        width: 800,
        height: 600,
        title,
        webPreferences: {
          preload: path.join(__dirname, '../preload/index.js'),
          contextIsolation: true,
          nodeIntegration: false,
        },
      },
    });

    if (process.env.NODE_ENV === 'development') {
      window.loadURL('http://localhost:5173/todo.html');
    } else {
      window.loadFile(path.join(__dirname, '../renderer/todo.html'));
    }

    return window;
  }

  // Create main window
  createTodoWindow('main', 'Todo App - Main');

  // IPC handler: create new window
  ipcRouter.handle('window:createTodo', async () => {
    const id = `todo-${Date.now()}`;
    createTodoWindow(id, `Todo App - ${id}`);
    return { success: true, windowId: id };
  });

  // Watch state changes (for logging)
  messageBus.watch('app-state', (state: AppState) => {
    console.log('App state updated:', {
      todoCount: state.todos.length,
      filter: state.filter,
      theme: state.theme,
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

## Preload Script

```typescript
import { contextBridge } from 'electron';
import { IpcRendererBridge, setupMessageBus } from 'electron-infra-kit/preload';

const ipcBridge = new IpcRendererBridge();
const messageBus = setupMessageBus();

// Define types
interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

interface AppState {
  todos: TodoItem[];
  filter: 'all' | 'active' | 'completed';
  theme: 'light' | 'dark';
}

interface TodoAPI {
  // Todo operations
  addTodo: (title: string) => Promise<any>;
  toggleTodo: (id: string) => Promise<any>;
  deleteTodo: (id: string) => Promise<any>;
  clearCompleted: () => Promise<any>;

  // Filter operations
  setFilter: (filter: 'all' | 'active' | 'completed') => Promise<any>;

  // Theme operations
  toggleTheme: () => Promise<any>;

  // Window operations
  createNewWindow: () => Promise<any>;

  // State synchronization
  getState: () => Promise<AppState>;
  watchState: (callback: (state: AppState) => void) => () => void;
}

const todoAPI: TodoAPI = {
  addTodo: (title) => ipcBridge.invoke('todo:add', { title }),
  toggleTodo: (id) => ipcBridge.invoke('todo:toggle', { id }),
  deleteTodo: (id) => ipcBridge.invoke('todo:delete', { id }),
  clearCompleted: () => ipcBridge.invoke('todo:clearCompleted'),
  setFilter: (filter) => ipcBridge.invoke('filter:set', { filter }),
  toggleTheme: () => ipcBridge.invoke('theme:toggle'),
  createNewWindow: () => ipcBridge.invoke('window:createTodo'),
  getState: () => messageBus.getData('app-state'),
  watchState: (callback) => messageBus.watch('app-state', callback),
};

contextBridge.exposeInMainWorld('todoAPI', todoAPI);
```

## Renderer Process Implementation

The HTML and TypeScript implementation is similar to the Chinese version, with the same structure for managing todos, filters, and theme synchronization across windows.

Key implementation points in `src/renderer/todo.ts`:

```typescript
declare global {
  interface Window {
    todoAPI: TodoAPI;
  }
}

let currentState: AppState | null = null;

// Render functions
function renderTodos() {
  if (!currentState) return;
  // Filter and render todos based on current state
}

function updateTheme() {
  if (!currentState) return;
  document.body.className = currentState.theme;
}

// Event handlers
document.getElementById('addBtn')?.addEventListener('click', async () => {
  const input = document.getElementById('todoInput') as HTMLInputElement;
  const title = input.value.trim();
  if (title) {
    await window.todoAPI.addTodo(title);
    input.value = '';
  }
});

// Initialize and watch state
async function init() {
  currentState = await window.todoAPI.getState();
  renderTodos();
  updateTheme();

  // Watch for state changes
  window.todoAPI.watchState((state: AppState) => {
    console.log('State updated:', state);
    currentState = state;
    renderTodos();
    updateTheme();
  });
}

init();
```

## Key Features

### 1. Real-time State Synchronization

All windows automatically sync state:

```typescript
// Main process updates state
await messageBus.setData('app-state', newState);

// All windows automatically receive updates
messageBus.watch('app-state', (state) => {
  // Update UI
});
```

### 2. Permission Control

Configure data access permissions:

```typescript
messageBus.setPermissions('app-state', {
  read: true,  // All windows can read
  write: true, // All windows can write
});
```

### 3. Type Safety

Use TypeScript to ensure type safety:

```typescript
interface AppState {
  todos: TodoItem[];
  filter: 'all' | 'active' | 'completed';
  theme: 'light' | 'dark';
}

const state = await messageBus.getData<AppState>('app-state');
```

### 4. Reactive Updates

UI automatically responds to state changes:

```typescript
window.todoAPI.watchState((state) => {
  currentState = state;
  renderTodos();
  updateTheme();
});
```

## Best Practices

### 1. Immutable Updates

Update state immutably:

```typescript
const newState = {
  ...state,
  todos: [...state.todos, newTodo],
};
```

### 2. Batch Updates

Combine multiple updates into one operation:

```typescript
// Bad: Multiple updates
await messageBus.setData('todos', newTodos);
await messageBus.setData('filter', newFilter);

// Good: Single update
await messageBus.setData('app-state', {
  todos: newTodos,
  filter: newFilter,
});
```

### 3. Clean Up Listeners

Clean up listeners when component unmounts:

```typescript
const unwatch = messageBus.watch('app-state', callback);

// Clean up
window.addEventListener('beforeunload', () => {
  unwatch();
});
```

### 4. Error Handling

Handle state update failures:

```typescript
try {
  await messageBus.setData('app-state', newState);
} catch (error) {
  console.error('Failed to update state:', error);
  // Rollback or retry
}
```

## Next Steps

- Check [Complete Application Example](./complete-app.md)
- Learn about [MessageBus API](/en/api/message-bus.md)
- Study [Performance Optimization](/en/guide/advanced/performance.md)

## FAQ

### Q: How to handle state conflicts?

A: Use timestamps or version numbers to resolve conflicts, or implement optimistic locking.

### Q: What if the state is too large?

A: Split state into multiple independent data keys, only sync necessary parts.

### Q: How to persist state?

A: Watch state changes and save state to file or database.
