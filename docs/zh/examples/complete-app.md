# 完整应用示例

本示例展示一个综合使用 electron-infra-kit 所有功能的完整应用。我们将创建一个简单的笔记应用，包含多窗口管理、IPC 通信、状态同步、配置管理和调试工具。

## 应用功能

- 📝 创建和编辑笔记
- 🪟 多窗口支持（主窗口、编辑器窗口、设置窗口）
- 🔄 跨窗口状态同步
- 💾 自动保存和持久化
- 🎨 主题切换（亮色/暗色）
- ⚙️ 配置管理
- 🐛 调试工具集成

## 项目结构

```
note-app/
├── src/
│   ├── main/
│   │   ├── index.ts              # 主进程入口
│   │   ├── services/             # 业务服务
│   │   │   ├── NoteService.ts    # 笔记服务
│   │   │   └── ConfigService.ts  # 配置服务
│   │   └── handlers/             # IPC 处理器
│   │       ├── noteHandlers.ts   # 笔记相关处理器
│   │       └── configHandlers.ts # 配置相关处理器
│   ├── preload/
│   │   └── index.ts              # 预加载脚本
│   ├── renderer/
│   │   ├── main/                 # 主窗口
│   │   │   ├── index.html
│   │   │   └── index.ts
│   │   ├── editor/               # 编辑器窗口
│   │   │   ├── index.html
│   │   │   └── index.ts
│   │   └── settings/             # 设置窗口
│   │       ├── index.html
│   │       └── index.ts
│   └── shared/
│       └── types.ts              # 共享类型定义
├── package.json
└── tsconfig.json
```

## 共享类型定义

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
  autoSaveInterval: number; // 毫秒
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

## 主进程实现

`src/main/services/NoteService.ts`:

```typescript
import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { Note } from '../../shared/types';

export class NoteService {
  private notesDir: string;

  constructor() {
    this.notesDir = path.join(app.getPath('userData'), 'notes');
  }

  async initialize() {
    try {
      await fs.mkdir(this.notesDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create notes directory:', error);
    }
  }

  async loadNotes(): Promise<Note[]> {
    try {
      const files = await fs.readdir(this.notesDir);
      const notes: Note[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.notesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          notes.push(JSON.parse(content));
        }
      }

      return notes.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Failed to load notes:', error);
      return [];
    }
  }

  async saveNote(note: Note): Promise<void> {
    try {
      const filePath = path.join(this.notesDir, `${note.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(note, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save note:', error);
      throw error;
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    try {
      const filePath = path.join(this.notesDir, `${noteId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw error;
    }
  }

  async searchNotes(query: string): Promise<Note[]> {
    const notes = await this.loadNotes();
    const lowerQuery = query.toLowerCase();

    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(lowerQuery) ||
        note.content.toLowerCase().includes(lowerQuery) ||
        note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }
}
```

`src/main/services/ConfigService.ts`:

```typescript
import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { AppConfig, DEFAULT_CONFIG } from '../../shared/types';

export class ConfigService {
  private configPath: string;

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'config.json');
  }

  async loadConfig(): Promise<AppConfig> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    } catch (error) {
      return DEFAULT_CONFIG;
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }
}
```

`src/main/handlers/noteHandlers.ts`:

```typescript
import { IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';
import { Note } from '../../shared/types';
import { NoteService } from '../services/NoteService';

export function createNoteHandlers(noteService: NoteService) {
  const loadNotesHandler = new IpcHandler({
    channel: 'notes:load',
    handler: async () => {
      try {
        const notes = await noteService.loadNotes();
        return { success: true, notes };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  });

  const createNoteHandler = new IpcHandler({
    channel: 'notes:create',
    validator: z.object({
      title: z.string().min(1),
      content: z.string().default(''),
      tags: z.array(z.string()).default([]),
    }),
    handler: async ({ title, content, tags }) => {
      try {
        const note: Note = {
          id: `note-${Date.now()}`,
          title,
          content,
          tags,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await noteService.saveNote(note);
        return { success: true, note };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  });

  const updateNoteHandler = new IpcHandler({
    channel: 'notes:update',
    validator: z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
    handler: async ({ id, title, content, tags }, context) => {
      try {
        const notes = await noteService.loadNotes();
        const note = notes.find((n) => n.id === id);

        if (!note) {
          return { success: false, error: 'Note not found' };
        }

        const updatedNote: Note = {
          ...note,
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
          ...(tags !== undefined && { tags }),
          updatedAt: Date.now(),
        };

        await noteService.saveNote(updatedNote);
        return { success: true, note: updatedNote };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  });

  const deleteNoteHandler = new IpcHandler({
    channel: 'notes:delete',
    validator: z.object({
      id: z.string(),
    }),
    handler: async ({ id }) => {
      try {
        await noteService.deleteNote(id);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  });

  const searchNotesHandler = new IpcHandler({
    channel: 'notes:search',
    validator: z.object({
      query: z.string(),
    }),
    handler: async ({ query }) => {
      try {
        const notes = await noteService.searchNotes(query);
        return { success: true, notes };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  });

  return [
    loadNotesHandler,
    createNoteHandler,
    updateNoteHandler,
    deleteNoteHandler,
    searchNotesHandler,
  ];
}
```

`src/main/index.ts`:

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

// 创建服务实例
const noteService = new NoteService();
const configService = new ConfigService();

// 注册服务到 DI 容器
ipcRouter.registerService('noteService', noteService);
ipcRouter.registerService('configService', configService);

app.whenReady().then(async () => {
  // 初始化服务
  await noteService.initialize();

  // 加载配置和笔记
  const config = await configService.loadConfig();
  const notes = await noteService.loadNotes();

  // 初始化应用状态
  const initialState: AppState = {
    notes,
    selectedNoteId: null,
    config,
  };

  await messageBus.setData('app-state', initialState);

  // 配置权限
  messageBus.setPermissions('app-state', {
    read: true,
    write: true,
  });

  // 注册 IPC 处理器
  const noteHandlers = createNoteHandlers(noteService);
  noteHandlers.forEach((handler) => ipcRouter.addHandler(handler));

  // 配置处理器
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

  // 窗口创建处理器
  ipcRouter.handle('window:create', async (event, { type, noteId }) => {
    try {
      const id = `${type}-${Date.now()}`;
      const window = createWindow(type, id, noteId);
      return { success: true, windowId: id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 创建主窗口
  createWindow('main', 'main');

  // 监听生命周期事件
  lifecycle.on('window-created', (window) => {
    console.log(`Window created: ${window.id}`);
    debugHelper.logWindowInfo(window.id);
  });

  lifecycle.on('window-closed', (windowId) => {
    console.log(`Window closed: ${windowId}`);
  });

  // 自动保存功能
  let autoSaveTimer: NodeJS.Timeout;

  messageBus.watch('app-state', async (state: AppState) => {
    if (state.config.autoSave) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(async () => {
        // 保存所有笔记
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

## 预加载脚本

`src/preload/index.ts`:

```typescript
import { contextBridge } from 'electron';
import { IpcRendererBridge, setupMessageBus } from 'electron-infra-kit/preload';
import { Note, AppConfig, AppState } from '../shared/types';

const ipcBridge = new IpcRendererBridge();
const messageBus = setupMessageBus();

interface NoteAPI {
  // 笔记操作
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

  // 配置操作
  updateConfig: (config: AppConfig) => Promise<any>;

  // 窗口操作
  createWindow: (type: string, noteId?: string) => Promise<any>;

  // 状态同步
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

## 主窗口实现

`src/renderer/main/index.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Note App</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
          sans-serif;
        height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .header {
        padding: 16px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .search-bar {
        flex: 1;
        max-width: 400px;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin: 0 16px;
      }

      .main-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      .note-list {
        width: 300px;
        border-right: 1px solid #e0e0e0;
        overflow-y: auto;
      }

      .note-item {
        padding: 16px;
        border-bottom: 1px solid #e0e0e0;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .note-item:hover {
        background-color: #f5f5f5;
      }

      .note-item.selected {
        background-color: #e3f2fd;
      }

      .note-preview {
        flex: 1;
        padding: 24px;
        overflow-y: auto;
      }

      button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        background-color: #007bff;
        color: white;
        cursor: pointer;
      }

      button:hover {
        background-color: #0056b3;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>📝 Note App</h1>
      <input
        type="text"
        class="search-bar"
        id="searchInput"
        placeholder="Search notes..."
      />
      <div>
        <button id="newNoteBtn">New Note</button>
        <button id="settingsBtn">Settings</button>
      </div>
    </div>

    <div class="main-content">
      <div class="note-list" id="noteList"></div>
      <div class="note-preview" id="notePreview">
        <p>Select a note to view</p>
      </div>
    </div>

    <script src="./index.js"></script>
  </body>
</html>
```

`src/renderer/main/index.ts`:

```typescript
import { AppState, Note } from '../../shared/types';

declare global {
  interface Window {
    noteAPI: NoteAPI;
  }
}

let currentState: AppState | null = null;

async function init() {
  // 加载初始状态
  currentState = await window.noteAPI.getState();
  renderNoteList();

  // 监听状态变化
  window.noteAPI.watchState((state) => {
    currentState = state;
    renderNoteList();
    applyTheme();
  });

  applyTheme();
}

function renderNoteList() {
  if (!currentState) return;

  const noteList = document.getElementById('noteList')!;
  noteList.innerHTML = currentState.notes
    .map(
      (note) => `
      <div class="note-item ${note.id === currentState.selectedNoteId ? 'selected' : ''}"
           data-id="${note.id}">
        <h3>${escapeHtml(note.title)}</h3>
        <p>${escapeHtml(note.content.substring(0, 100))}...</p>
        <small>${new Date(note.updatedAt).toLocaleString()}</small>
      </div>
    `
    )
    .join('');
}

function applyTheme() {
  if (!currentState) return;
  document.body.className = currentState.config.theme;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 事件监听
document.getElementById('newNoteBtn')?.addEventListener('click', async () => {
  const result = await window.noteAPI.createNote({
    title: 'New Note',
    content: '',
  });

  if (result.success) {
    await window.noteAPI.createWindow('editor', result.note.id);
  }
});

document.getElementById('settingsBtn')?.addEventListener('click', async () => {
  await window.noteAPI.createWindow('settings');
});

document.getElementById('noteList')?.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  const noteItem = target.closest('.note-item') as HTMLElement;

  if (noteItem) {
    const noteId = noteItem.getAttribute('data-id')!;
    await window.noteAPI.createWindow('editor', noteId);
  }
});

let searchTimeout: NodeJS.Timeout;
document.getElementById('searchInput')?.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  const query = (e.target as HTMLInputElement).value;

  searchTimeout = setTimeout(async () => {
    if (query) {
      const result = await window.noteAPI.searchNotes(query);
      // 更新显示搜索结果
    } else {
      renderNoteList();
    }
  }, 300);
});

init();
```

## 关键特性总结

### 1. 模块化架构
- 服务层（NoteService、ConfigService）
- 处理器层（noteHandlers、configHandlers）
- 清晰的职责分离

### 2. 类型安全
- 共享类型定义
- TypeScript 全栈类型检查
- Zod 运行时验证

### 3. 状态管理
- 集中式状态（AppState）
- 跨窗口同步
- 响应式更新

### 4. 持久化
- 文件系统存储
- 自动保存
- 配置管理

### 5. 调试支持
- Debug Helper 集成
- 生命周期日志
- 开发者工具

## 运行应用

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 启动
npm start
```

## 下一步

- 查看 [API 参考](/api/) 了解更多功能
- 学习 [最佳实践](/guide/best-practices.md)
- 探索 [进阶主题](/guide/advanced/type-safety.md)

## 扩展建议

1. **添加更多功能**
   - 笔记分类和标签
   - 富文本编辑器
   - 导出功能（PDF、Markdown）

2. **性能优化**
   - 虚拟滚动
   - 懒加载
   - 缓存策略

3. **用户体验**
   - 快捷键支持
   - 拖拽排序
   - 撤销/重做

4. **数据安全**
   - 加密存储
   - 备份功能
   - 云同步
