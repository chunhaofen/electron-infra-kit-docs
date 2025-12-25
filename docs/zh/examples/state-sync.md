# 状态同步示例

本示例展示如何使用 electron-infra-kit 的 MessageBus 在多个窗口之间同步状态。我们将创建一个协作式待办事项应用，演示跨窗口的实时数据同步。

## 应用场景

状态同步适用于：
- 协作应用（多用户或多窗口编辑）
- 实时数据展示（仪表板、监控面板）
- 多窗口应用的状态共享
- 配置和设置的同步

## 主进程实现

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
// 数据模型定义
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

// 初始状态
const initialState: AppState = {
  todos: [],
  filter: 'all',
  theme: 'light',
};

// ============================================
// 初始化 MessageBus
// ============================================

app.whenReady().then(async () => {
  // 设置初始状态
  await messageBus.setData('app-state', initialState);

  // 配置数据权限
  messageBus.setPermissions('app-state', {
    read: true,  // 所有窗口可读
    write: true, // 所有窗口可写
  });

  // ============================================
  // IPC 处理器：待办事项操作
  // ============================================

  // 添加待办事项
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

  // 切换待办事项完成状态
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

  // 删除待办事项
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

  // 更新过滤器
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

  // 切换主题
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

  // 清除已完成的待办事项
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
  // 创建窗口
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

  // 创建主窗口
  createTodoWindow('main', 'Todo App - Main');

  // IPC 处理器：创建新窗口
  ipcRouter.handle('window:createTodo', async () => {
    const id = `todo-${Date.now()}`;
    createTodoWindow(id, `Todo App - ${id}`);
    return { success: true, windowId: id };
  });

  // 监听状态变化（用于日志）
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

## 预加载脚本

```typescript
import { contextBridge } from 'electron';
import { IpcRendererBridge, setupMessageBus } from 'electron-infra-kit/preload';

const ipcBridge = new IpcRendererBridge();
const messageBus = setupMessageBus();

// 定义类型
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
  // 待办事项操作
  addTodo: (title: string) => Promise<any>;
  toggleTodo: (id: string) => Promise<any>;
  deleteTodo: (id: string) => Promise<any>;
  clearCompleted: () => Promise<any>;

  // 过滤器操作
  setFilter: (filter: 'all' | 'active' | 'completed') => Promise<any>;

  // 主题操作
  toggleTheme: () => Promise<any>;

  // 窗口操作
  createNewWindow: () => Promise<any>;

  // 状态同步
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

## 渲染进程实现

`src/renderer/todo.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Todo App</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 20px;
        transition: background-color 0.3s, color 0.3s;
      }

      body.light {
        background-color: #f5f5f5;
        color: #333;
      }

      body.dark {
        background-color: #1e1e1e;
        color: #e0e0e0;
      }

      .container {
        max-width: 600px;
        margin: 0 auto;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      h1 {
        font-size: 2em;
      }

      .controls {
        display: flex;
        gap: 10px;
      }

      button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
      }

      .light button {
        background-color: #007bff;
        color: white;
      }

      .light button:hover {
        background-color: #0056b3;
      }

      .dark button {
        background-color: #0d6efd;
        color: white;
      }

      .dark button:hover {
        background-color: #0a58ca;
      }

      .input-group {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }

      input[type='text'] {
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }

      .dark input[type='text'] {
        background-color: #2d2d2d;
        border-color: #444;
        color: #e0e0e0;
      }

      .filters {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }

      .filter-btn {
        padding: 6px 12px;
        background-color: transparent;
        border: 1px solid #ddd;
      }

      .filter-btn.active {
        background-color: #007bff;
        color: white;
        border-color: #007bff;
      }

      .todo-list {
        list-style: none;
      }

      .todo-item {
        display: flex;
        align-items: center;
        padding: 12px;
        margin-bottom: 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
      }

      .light .todo-item {
        background-color: white;
        border: 1px solid #e0e0e0;
      }

      .dark .todo-item {
        background-color: #2d2d2d;
        border: 1px solid #444;
      }

      .todo-item:hover {
        opacity: 0.9;
      }

      .todo-item.completed {
        opacity: 0.6;
      }

      .todo-item.completed .todo-title {
        text-decoration: line-through;
      }

      .todo-checkbox {
        margin-right: 12px;
        width: 20px;
        height: 20px;
        cursor: pointer;
      }

      .todo-title {
        flex: 1;
        font-size: 16px;
      }

      .todo-delete {
        padding: 4px 8px;
        background-color: #dc3545;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }

      .todo-delete:hover {
        background-color: #c82333;
      }

      .stats {
        margin-top: 20px;
        padding: 12px;
        border-radius: 4px;
        font-size: 14px;
      }

      .light .stats {
        background-color: white;
        border: 1px solid #e0e0e0;
      }

      .dark .stats {
        background-color: #2d2d2d;
        border: 1px solid #444;
      }
    </style>
  </head>
  <body class="light">
    <div class="container">
      <div class="header">
        <h1>📝 Todo App</h1>
        <div class="controls">
          <button id="themeBtn">🌙 Toggle Theme</button>
          <button id="newWindowBtn">🪟 New Window</button>
        </div>
      </div>

      <div class="input-group">
        <input
          type="text"
          id="todoInput"
          placeholder="What needs to be done?"
        />
        <button id="addBtn">Add</button>
      </div>

      <div class="filters">
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="active">Active</button>
        <button class="filter-btn" data-filter="completed">Completed</button>
        <button id="clearCompletedBtn">Clear Completed</button>
      </div>

      <ul id="todoList" class="todo-list"></ul>

      <div class="stats" id="stats"></div>
    </div>

    <script src="./todo.js"></script>
  </body>
</html>
```

`src/renderer/todo.ts`:

```typescript
declare global {
  interface Window {
    todoAPI: TodoAPI;
  }
}

let currentState: AppState | null = null;

// ============================================
// 渲染函数
// ============================================

function renderTodos() {
  if (!currentState) return;

  const todoList = document.getElementById('todoList')!;
  const { todos, filter } = currentState;

  // 根据过滤器筛选待办事项
  let filteredTodos = todos;
  if (filter === 'active') {
    filteredTodos = todos.filter((todo) => !todo.completed);
  } else if (filter === 'completed') {
    filteredTodos = todos.filter((todo) => todo.completed);
  }

  // 渲染列表
  todoList.innerHTML = filteredTodos
    .map(
      (todo) => `
      <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
        <input
          type="checkbox"
          class="todo-checkbox"
          ${todo.completed ? 'checked' : ''}
          data-id="${todo.id}"
        />
        <span class="todo-title">${escapeHtml(todo.title)}</span>
        <button class="todo-delete" data-id="${todo.id}">Delete</button>
      </li>
    `
    )
    .join('');

  // 更新统计信息
  updateStats();
}

function updateStats() {
  if (!currentState) return;

  const { todos } = currentState;
  const total = todos.length;
  const active = todos.filter((todo) => !todo.completed).length;
  const completed = todos.filter((todo) => todo.completed).length;

  document.getElementById('stats')!.textContent =
    `Total: ${total} | Active: ${active} | Completed: ${completed}`;
}

function updateTheme() {
  if (!currentState) return;

  document.body.className = currentState.theme;
}

function updateFilterButtons() {
  if (!currentState) return;

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    const filter = btn.getAttribute('data-filter');
    if (filter === currentState.filter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// 事件处理
// ============================================

// 添加待办事项
document.getElementById('addBtn')?.addEventListener('click', async () => {
  const input = document.getElementById('todoInput') as HTMLInputElement;
  const title = input.value.trim();

  if (!title) {
    alert('Please enter a todo title');
    return;
  }

  const result = await window.todoAPI.addTodo(title);

  if (result.success) {
    input.value = '';
    input.focus();
  } else {
    alert(`Failed to add todo: ${result.error}`);
  }
});

// 回车添加
document.getElementById('todoInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('addBtn')?.click();
  }
});

// 切换完成状态
document.getElementById('todoList')?.addEventListener('change', async (e) => {
  const target = e.target as HTMLInputElement;
  if (target.classList.contains('todo-checkbox')) {
    const id = target.getAttribute('data-id')!;
    await window.todoAPI.toggleTodo(id);
  }
});

// 删除待办事项
document.getElementById('todoList')?.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('todo-delete')) {
    const id = target.getAttribute('data-id')!;
    await window.todoAPI.deleteTodo(id);
  }
});

// 过滤器按钮
document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const filter = btn.getAttribute('data-filter') as 'all' | 'active' | 'completed';
    await window.todoAPI.setFilter(filter);
  });
});

// 清除已完成
document.getElementById('clearCompletedBtn')?.addEventListener('click', async () => {
  if (confirm('Clear all completed todos?')) {
    await window.todoAPI.clearCompleted();
  }
});

// 切换主题
document.getElementById('themeBtn')?.addEventListener('click', async () => {
  await window.todoAPI.toggleTheme();
});

// 创建新窗口
document.getElementById('newWindowBtn')?.addEventListener('click', async () => {
  await window.todoAPI.createNewWindow();
});

// ============================================
// 初始化
// ============================================

async function init() {
  // 获取初始状态
  currentState = await window.todoAPI.getState();
  renderTodos();
  updateTheme();
  updateFilterButtons();

  // 监听状态变化
  window.todoAPI.watchState((state: AppState) => {
    console.log('State updated:', state);
    currentState = state;
    renderTodos();
    updateTheme();
    updateFilterButtons();
  });
}

init();
```

## 关键特性

### 1. 实时状态同步

所有窗口自动同步状态：

```typescript
// 主进程更新状态
await messageBus.setData('app-state', newState);

// 所有窗口自动接收更新
messageBus.watch('app-state', (state) => {
  // 更新 UI
});
```

### 2. 权限控制

配置数据访问权限：

```typescript
messageBus.setPermissions('app-state', {
  read: true,  // 所有窗口可读
  write: true, // 所有窗口可写
});
```

### 3. 类型安全

使用 TypeScript 确保类型安全：

```typescript
interface AppState {
  todos: TodoItem[];
  filter: 'all' | 'active' | 'completed';
  theme: 'light' | 'dark';
}

const state = await messageBus.getData<AppState>('app-state');
```

### 4. 响应式更新

UI 自动响应状态变化：

```typescript
window.todoAPI.watchState((state) => {
  currentState = state;
  renderTodos();
  updateTheme();
});
```

## 最佳实践

### 1. 不可变更新

使用不可变方式更新状态：

```typescript
const newState = {
  ...state,
  todos: [...state.todos, newTodo],
};
```

### 2. 批量更新

合并多个更新为一次操作：

```typescript
// 不好：多次更新
await messageBus.setData('todos', newTodos);
await messageBus.setData('filter', newFilter);

// 好：一次更新
await messageBus.setData('app-state', {
  todos: newTodos,
  filter: newFilter,
});
```

### 3. 清理监听器

组件卸载时清理监听器：

```typescript
const unwatch = messageBus.watch('app-state', callback);

// 清理
window.addEventListener('beforeunload', () => {
  unwatch();
});
```

### 4. 错误处理

处理状态更新失败：

```typescript
try {
  await messageBus.setData('app-state', newState);
} catch (error) {
  console.error('Failed to update state:', error);
  // 回滚或重试
}
```

## 下一步

- 查看 [完整应用示例](./complete-app.md)
- 了解 [MessageBus API](/api/message-bus.md)
- 学习 [性能优化](/guide/advanced/performance.md)

## 常见问题

### Q: 如何处理状态冲突？

A: 使用时间戳或版本号来解决冲突，或实现乐观锁机制。

### Q: 状态太大怎么办？

A: 将状态拆分为多个独立的数据键，只同步必要的部分。

### Q: 如何持久化状态？

A: 监听状态变化，将状态保存到文件或数据库。
