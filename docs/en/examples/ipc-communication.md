# IPC Communication Example

This example demonstrates how to use electron-infra-kit's IpcRouter to implement type-safe inter-process communication (IPC). We'll create a file management application to demonstrate various IPC communication patterns.

## Use Cases

IPC communication is suitable for:
- File system operations (read, write, delete files)
- Database operations
- System API calls
- Background task execution
- Operations requiring Node.js permissions

## Main Process - Define IPC Handlers

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
// 1. Simple Request-Response Pattern
// ============================================

// Define handler to get app version
const getAppVersionHandler = new IpcHandler({
  channel: 'app:getVersion',
  // No parameter validation needed
  handler: async () => {
    return {
      version: app.getVersion(),
      name: app.getName(),
      platform: process.platform,
    };
  },
});

// ============================================
// 2. Handler with Parameter Validation
// ============================================

// Define file read handler
const readFileHandler = new IpcHandler({
  channel: 'file:read',
  // Validate parameters using Zod
  validator: z.object({
    filePath: z.string().min(1),
    encoding: z.enum(['utf8', 'base64']).default('utf8'),
  }),
  handler: async ({ filePath, encoding }) => {
    try {
      // Security check: ensure path is within allowed directory
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

// Define file write handler
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
// 3. List Operation Handler
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
// 4. Complex Operation - File Search
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

          // Recursively search subdirectories
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
// 5. Dependency Injection Example
// ============================================

// Create a service class
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

// Register service to DI container
const fileService = new FileService();
ipcRouter.registerService('fileService', fileService);

// Handler using dependency injection
const getFileInfoHandler = new IpcHandler({
  channel: 'file:info',
  validator: z.object({
    filePath: z.string().min(1),
  }),
  handler: async ({ filePath }, context) => {
    try {
      // Get service from context
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
// Register All Handlers
// ============================================

app.whenReady().then(() => {
  // Register handlers
  ipcRouter.addHandler(getAppVersionHandler);
  ipcRouter.addHandler(readFileHandler);
  ipcRouter.addHandler(writeFileHandler);
  ipcRouter.addHandler(listFilesHandler);
  ipcRouter.addHandler(searchFilesHandler);
  ipcRouter.addHandler(getFileInfoHandler);

  // Create main window
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

## Preload Script

```typescript
import { contextBridge } from 'electron';
import { IpcRendererBridge } from 'electron-infra-kit/preload';

const ipcBridge = new IpcRendererBridge();

// Define type-safe API
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

## Renderer Process Usage

```typescript
declare global {
  interface Window {
    fileAPI: FileAPI;
  }
}

// ============================================
// 1. Get App Version
// ============================================

async function displayAppInfo() {
  const info = await window.fileAPI.getAppVersion();
  console.log('App Info:', info);
  document.getElementById('appInfo')!.textContent = `${info.name} v${info.version} (${info.platform})`;
}

// ============================================
// 2. Read File
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
// 3. Write File
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
// 4. List Files
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
// 5. Search Files
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
// Helper Functions
// ============================================

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Bind events
document.getElementById('readBtn')?.addEventListener('click', readFile);
document.getElementById('writeBtn')?.addEventListener('click', writeFile);
document.getElementById('listBtn')?.addEventListener('click', listFiles);
document.getElementById('searchBtn')?.addEventListener('click', searchFiles);

// Initialize
displayAppInfo();
```

## Key Features

### 1. Type Safety

Ensure type safety through TypeScript and Zod:

```typescript
// Main process
validator: z.object({
  filePath: z.string().min(1),
  encoding: z.enum(['utf8', 'base64']).default('utf8'),
})

// Preload script
interface FileAPI {
  readFile: (params: { filePath: string; encoding?: 'utf8' | 'base64' }) => Promise<any>;
}
```

### 2. Parameter Validation

Zod automatically validates parameters:

```typescript
validator: z.object({
  query: z.string().min(1),  // Must be at least 1 character
  caseSensitive: z.boolean().default(false),  // Default value
})
```

### 3. Error Handling

Unified error handling pattern:

```typescript
try {
  // Operation
  return { success: true, data };
} catch (error) {
  return { success: false, error: error.message };
}
```

### 4. Dependency Injection

Manage services through DI container:

```typescript
// Register service
ipcRouter.registerService('fileService', fileService);

// Use service
const service = context.getService<FileService>('fileService');
```

## Best Practices

### 1. Security

Always validate file paths to prevent path traversal attacks:

```typescript
const allowedDir = app.getPath('documents');
const fullPath = path.resolve(allowedDir, filePath);

if (!fullPath.startsWith(allowedDir)) {
  throw new Error('Access denied');
}
```

### 2. Error Handling

Provide detailed error information:

```typescript
catch (error) {
  return {
    success: false,
    error: error.message,
    code: error.code,  // Error code
  };
}
```

### 3. Performance Optimization

For large amounts of data, consider pagination or streaming:

```typescript
// Limit result count
if (results.length >= 100) {
  break;
}
```

### 4. Logging

Log important operations:

```typescript
handler: async (params) => {
  console.log('IPC call:', channel, params);
  // Handler logic
}
```

## Next Steps

- Learn the [State Synchronization](./state-sync.md) example
- Check [IpcRouter API](/en/api/ipc-router.md) documentation
- Understand [Error Handling](/en/guide/advanced/error-handling.md) best practices

## FAQ

### Q: How to handle large file transfers?

A: Use streaming or chunked transfer to avoid loading the entire file into memory at once.

### Q: What if IPC calls timeout?

A: Provide progress feedback for long-running operations, or use asynchronous notification patterns.

### Q: How to debug IPC communication?

A: Enable debug mode to view detailed IPC call logs.
