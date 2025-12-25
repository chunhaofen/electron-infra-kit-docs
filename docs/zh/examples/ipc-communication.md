# IPC 通信示例

本示例展示如何使用 electron-infra-kit 的 IpcRouter 实现类型安全的进程间通信（IPC）。我们将创建一个文件管理应用，演示各种 IPC 通信模式。

## 应用场景

IPC 通信适用于：
- 文件系统操作（读取、写入、删除文件）
- 数据库操作
- 系统 API 调用
- 后台任务执行
- 需要 Node.js 权限的操作

## 主进程 - 定义 IPC 处理器

```typescript
import { app } from 'electron';
import { createElectronToolkit, IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

const toolkit = createElectronToolkit({
  debug: true,
  logger: { level: 'info' },
});

const { ipcRouter, windowManager } = toolkit;

// ============================================
// 1. 简单的请求-响应模式
// ============================================

// 定义获取应用版本的处理器
const getAppVersionHandler = new IpcHandler({
  channel: 'app:getVersion',
  // 无需参数验证
  handler: async () => {
    return {
      version: app.getVersion(),
      name: app.getName(),
      platform: process.platform,
    };
  },
});

// ============================================
// 2. 带参数验证的处理器
// ============================================

// 定义文件读取处理器
const readFileHandler = new IpcHandler({
  channel: 'file:read',
  // 使用 Zod 验证参数
  validator: z.object({
    filePath: z.string().min(1),
    encoding: z.enum(['utf8', 'base64']).default('utf8'),
  }),
  handler: async ({ filePath, encoding }) => {
    try {
      // 安全检查：确保路径在允许的目录内
      const allowedDir = app.getPath('documents');
      const fullPath = path.resolve(allowedDir, filePath);

      if (!fullPath.startsWith(allowedDir)) {
        throw new Error('Access denied: Path outside allowed directory');
      }

      const content = await fs.readFile(fullPath, encoding as BufferEncoding);
      return {
        success: true,
        content,
        path: fullPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// 定义文件写入处理器
const writeFileHandler = new IpcHandler({
  channel: 'file:write',
  validator: z.object({
    filePath: z.string().min(1),
    content: z.string(),
    encoding: z.enum(['utf8', 'base64']).default('utf8'),
  }),
  handler: async ({ filePath, content, encoding }) => {
    try {
      const allowedDir = app.getPath('documents');
      const fullPath = path.resolve(allowedDir, filePath);

      if (!fullPath.startsWith(allowedDir)) {
        throw new Error('Access denied: Path outside allowed directory');
      }

      await fs.writeFile(fullPath, content, encoding as BufferEncoding);
      return {
        success: true,
        path: fullPath,
        size: Buffer.byteLength(content, encoding as BufferEncoding),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// ============================================
// 3. 列表操作处理器
// ============================================

const listFilesHandler = new IpcHandler({
  channel: 'file:list',
  validator: z.object({
    directory: z.string().default('.'),
  }),
  handler: async ({ directory }) => {
    try {
      const allowedDir = app.getPath('documents');
      const fullPath = path.resolve(allowedDir, directory);

      if (!fullPath.startsWith(allowedDir)) {
        throw new Error('Access denied: Path outside allowed directory');
      }

      const files = await fs.readdir(fullPath, { withFileTypes: true });

      const fileList = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(fullPath, file.name);
          const stats = await fs.stat(filePath);

          return {
            name: file.name,
            isDirectory: file.isDirectory(),
            size: stats.size,
            modified: stats.mtime.toISOString(),
            created: stats.birthtime.toISOString(),
          };
        })
      );

      return {
        success: true,
        files: fileList,
        path: fullPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// ============================================
// 4. 复杂操作 - 文件搜索
// ============================================

const searchFilesHandler = new IpcHandler({
  channel: 'file:search',
  validator: z.object({
    query: z.string().min(1),
    directory: z.string().default('.'),
    caseSensitive: z.boolean().default(false),
  }),
  handler: async ({ query, directory, caseSensitive }) => {
    try {
      const allowedDir = app.getPath('documents');
      const fullPath = path.resolve(allowedDir, directory);

      if (!fullPath.startsWith(allowedDir)) {
        throw new Error('Access denied: Path outside allowed directory');
      }

      const results: any[] = [];

      async function searchDirectory(dir: string) {
        const files = await fs.readdir(dir, { withFileTypes: true });

        for (const file of files) {
          const filePath = path.join(dir, file.name);
          const fileName = caseSensitive ? file.name : file.name.toLowerCase();
          const searchQuery = caseSensitive ? query : query.toLowerCase();

          if (fileName.includes(searchQuery)) {
            const stats = await fs.stat(filePath);
            results.push({
              name: file.name,
              path: filePath,
              isDirectory: file.isDirectory(),
              size: stats.size,
              modified: stats.mtime.toISOString(),
            });
          }

          // 递归搜索子目录
          if (file.isDirectory() && results.length < 100) {
            await searchDirectory(filePath);
          }
        }
      }

      await searchDirectory(fullPath);

      return {
        success: true,
        results,
        count: results.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// ============================================
// 5. 依赖注入示例
// ============================================

// 创建一个服务类
class FileService {
  async getFileInfo(filePath: string) {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  }

  async deleteFile(filePath: string) {
    await fs.unlink(filePath);
  }
}

// 注册服务到 DI 容器
const fileService = new FileService();
ipcRouter.registerService('fileService', fileService);

// 使用依赖注入的处理器
const getFileInfoHandler = new IpcHandler({
  channel: 'file:info',
  validator: z.object({
    filePath: z.string().min(1),
  }),
  handler: async ({ filePath }, context) => {
    try {
      // 从上下文中获取服务
      const fileService = context.getService<FileService>('fileService');

      const allowedDir = app.getPath('documents');
      const fullPath = path.resolve(allowedDir, filePath);

      if (!fullPath.startsWith(allowedDir)) {
        throw new Error('Access denied');
      }

      const info = await fileService.getFileInfo(fullPath);

      return {
        success: true,
        info,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// ============================================
// 注册所有处理器
// ============================================

app.whenReady().then(() => {
  // 注册处理器
  ipcRouter.addHandler(getAppVersionHandler);
  ipcRouter.addHandler(readFileHandler);
  ipcRouter.addHandler(writeFileHandler);
  ipcRouter.addHandler(listFilesHandler);
  ipcRouter.addHandler(searchFilesHandler);
  ipcRouter.addHandler(getFileInfoHandler);

  // 创建主窗口
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

  console.log('IPC handlers registered:', ipcRouter.getRegisteredChannels());
});
```

## 预加载脚本

```typescript
import { contextBridge } from 'electron';
import { IpcRendererBridge } from 'electron-infra-kit/preload';

const ipcBridge = new IpcRendererBridge();

// 定义类型安全的 API
interface FileAPI {
  getAppVersion: () => Promise<{
    version: string;
    name: string;
    platform: string;
  }>;
  readFile: (params: {
    filePath: string;
    encoding?: 'utf8' | 'base64';
  }) => Promise<any>;
  writeFile: (params: {
    filePath: string;
    content: string;
    encoding?: 'utf8' | 'base64';
  }) => Promise<any>;
  listFiles: (params: { directory?: string }) => Promise<any>;
  searchFiles: (params: {
    query: string;
    directory?: string;
    caseSensitive?: boolean;
  }) => Promise<any>;
  getFileInfo: (params: { filePath: string }) => Promise<any>;
}

const fileAPI: FileAPI = {
  getAppVersion: () => ipcBridge.invoke('app:getVersion'),
  readFile: (params) => ipcBridge.invoke('file:read', params),
  writeFile: (params) => ipcBridge.invoke('file:write', params),
  listFiles: (params) => ipcBridge.invoke('file:list', params),
  searchFiles: (params) => ipcBridge.invoke('file:search', params),
  getFileInfo: (params) => ipcBridge.invoke('file:info', params),
};

contextBridge.exposeInMainWorld('fileAPI', fileAPI);
```

## 渲染进程使用

```typescript
declare global {
  interface Window {
    fileAPI: FileAPI;
  }
}

// ============================================
// 1. 获取应用版本
// ============================================

async function displayAppInfo() {
  const info = await window.fileAPI.getAppVersion();
  console.log('App Info:', info);
  document.getElementById('appInfo')!.textContent = `${info.name} v${info.version} (${info.platform})`;
}

// ============================================
// 2. 读取文件
// ============================================

async function readFile() {
  const filePath = (document.getElementById('filePath') as HTMLInputElement).value;

  try {
    const result = await window.fileAPI.readFile({
      filePath,
      encoding: 'utf8',
    });

    if (result.success) {
      document.getElementById('fileContent')!.textContent = result.content;
      console.log('File read successfully:', result.path);
    } else {
      alert(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Failed to read file:', error);
    alert(`Failed to read file: ${error}`);
  }
}

// ============================================
// 3. 写入文件
// ============================================

async function writeFile() {
  const filePath = (document.getElementById('filePath') as HTMLInputElement).value;
  const content = (document.getElementById('fileContent') as HTMLTextAreaElement)
    .value;

  try {
    const result = await window.fileAPI.writeFile({
      filePath,
      content,
      encoding: 'utf8',
    });

    if (result.success) {
      alert(`File saved successfully!\nPath: ${result.path}\nSize: ${result.size} bytes`);
    } else {
      alert(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Failed to write file:', error);
    alert(`Failed to write file: ${error}`);
  }
}

// ============================================
// 4. 列出文件
// ============================================

async function listFiles() {
  const directory = (document.getElementById('directory') as HTMLInputElement)
    .value;

  try {
    const result = await window.fileAPI.listFiles({ directory });

    if (result.success) {
      const fileList = document.getElementById('fileList')!;
      fileList.innerHTML = result.files
        .map(
          (file: any) => `
          <div class="file-item">
            <span class="file-icon">${file.isDirectory ? '📁' : '📄'}</span>
            <span class="file-name">${file.name}</span>
            <span class="file-size">${formatSize(file.size)}</span>
            <span class="file-date">${new Date(file.modified).toLocaleString()}</span>
          </div>
        `
        )
        .join('');
    } else {
      alert(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Failed to list files:', error);
    alert(`Failed to list files: ${error}`);
  }
}

// ============================================
// 5. 搜索文件
// ============================================

async function searchFiles() {
  const query = (document.getElementById('searchQuery') as HTMLInputElement).value;
  const directory = (document.getElementById('searchDir') as HTMLInputElement)
    .value;

  if (!query) {
    alert('Please enter a search query');
    return;
  }

  try {
    const result = await window.fileAPI.searchFiles({
      query,
      directory,
      caseSensitive: false,
    });

    if (result.success) {
      const searchResults = document.getElementById('searchResults')!;
      searchResults.innerHTML = `
        <p>Found ${result.count} results:</p>
        ${result.results
          .map(
            (file: any) => `
          <div class="search-result">
            <strong>${file.name}</strong>
            <br>
            <small>${file.path}</small>
            <br>
            <small>${formatSize(file.size)} - ${new Date(file.modified).toLocaleString()}</small>
          </div>
        `
          )
          .join('')}
      `;
    } else {
      alert(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Search failed:', error);
    alert(`Search failed: ${error}`);
  }
}

// ============================================
// 辅助函数
// ============================================

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// 绑定事件
document.getElementById('readBtn')?.addEventListener('click', readFile);
document.getElementById('writeBtn')?.addEventListener('click', writeFile);
document.getElementById('listBtn')?.addEventListener('click', listFiles);
document.getElementById('searchBtn')?.addEventListener('click', searchFiles);

// 初始化
displayAppInfo();
```

## 关键特性

### 1. 类型安全

通过 TypeScript 和 Zod 确保类型安全：

```typescript
// 主进程
validator: z.object({
  filePath: z.string().min(1),
  encoding: z.enum(['utf8', 'base64']).default('utf8'),
})

// 预加载脚本
interface FileAPI {
  readFile: (params: { filePath: string; encoding?: 'utf8' | 'base64' }) => Promise<any>;
}
```

### 2. 参数验证

Zod 自动验证参数：

```typescript
validator: z.object({
  query: z.string().min(1),  // 必须至少 1 个字符
  caseSensitive: z.boolean().default(false),  // 默认值
})
```

### 3. 错误处理

统一的错误处理模式：

```typescript
try {
  // 操作
  return { success: true, data };
} catch (error) {
  return { success: false, error: error.message };
}
```

### 4. 依赖注入

通过 DI 容器管理服务：

```typescript
// 注册服务
ipcRouter.registerService('fileService', fileService);

// 使用服务
const service = context.getService<FileService>('fileService');
```

## 最佳实践

### 1. 安全性

始终验证文件路径，防止路径遍历攻击：

```typescript
const allowedDir = app.getPath('documents');
const fullPath = path.resolve(allowedDir, filePath);

if (!fullPath.startsWith(allowedDir)) {
  throw new Error('Access denied');
}
```

### 2. 错误处理

提供详细的错误信息：

```typescript
catch (error) {
  return {
    success: false,
    error: error.message,
    code: error.code,  // 错误代码
  };
}
```

### 3. 性能优化

对于大量数据，考虑分页或流式传输：

```typescript
// 限制结果数量
if (results.length >= 100) {
  break;
}
```

### 4. 日志记录

记录重要操作：

```typescript
handler: async (params) => {
  console.log('IPC call:', channel, params);
  // 处理逻辑
}
```

## 下一步

- 学习 [状态同步](./state-sync.md) 示例
- 查看 [IpcRouter API](/api/ipc-router.md) 文档
- 了解 [错误处理](/guide/advanced/error-handling.md) 最佳实践

## 常见问题

### Q: 如何处理大文件传输？

A: 使用流式传输或分块传输，避免一次性加载整个文件到内存。

### Q: IPC 调用超时怎么办？

A: 为长时间运行的操作提供进度反馈，或使用异步通知模式。

### Q: 如何调试 IPC 通信？

A: 启用 debug 模式，查看详细的 IPC 调用日志。
