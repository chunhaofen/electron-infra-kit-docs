# 调试技巧指南

## 概述

有效的调试技巧可以大大提高开发效率。本指南介绍如何调试使用 `electron-infra-kit` 构建的 Electron 应用，包括使用 DebugHelper、性能监控和常见问题的调试方法。

## DebugHelper 使用

### 1. 启用调试模式

在开发环境中启用调试模式：

```typescript
import { createElectronToolkit, DebugHelper } from 'electron-infra-kit';

const toolkit = createElectronToolkit({
  debug: true, // 启用调试模式
  logger: {
    level: 'debug', // 设置日志级别
    enableConsole: true,
    enableFile: true,
    filePath: path.join(app.getPath('userData'), 'logs'),
  },
});

// 获取 DebugHelper 实例
const debugHelper = toolkit.getDebugHelper();
```

### 2. 窗口调试

使用 DebugHelper 调试窗口相关问题：

```typescript
// 列出所有窗口
debugHelper.listWindows();
// 输出:
// Windows:
// - main (id: 1, visible: true, focused: true)
// - settings (id: 2, visible: false, focused: false)

// 获取窗口详细信息
const windowInfo = debugHelper.getWindowInfo('main');
console.log(windowInfo);
// {
//   id: 1,
//   name: 'main',
//   title: 'My App',
//   bounds: { x: 100, y: 100, width: 1024, height: 768 },
//   isVisible: true,
//   isFocused: true,
//   isMinimized: false,
//   isMaximized: false,
//   webContentsId: 1
// }

// 检查窗口状态
if (debugHelper.isWindowAlive('main')) {
  console.log('窗口存在且未销毁');
}

// 获取窗口性能指标
const metrics = debugHelper.getWindowMetrics('main');
console.log('内存使用:', metrics.memory);
console.log('CPU 使用:', metrics.cpu);
```

### 3. IPC 调试

调试 IPC 通信问题：

```typescript
// 启用 IPC 日志
debugHelper.enableIpcLogging();

// 列出所有注册的 IPC 处理器
const handlers = debugHelper.listIpcHandlers();
console.log('已注册的处理器:', handlers);
// ['getUser', 'updateUser', 'deleteUser', ...]

// 获取处理器详细信息
const handlerInfo = debugHelper.getIpcHandlerInfo('getUser');
console.log(handlerInfo);
// {
//   name: 'getUser',
//   namespace: 'user',
//   callCount: 42,
//   errorCount: 2,
//   avgDuration: 15.3,
//   lastCalled: '2024-01-15T10:30:00.000Z'
// }

// 监听 IPC 调用
debugHelper.onIpcCall((event) => {
  console.log('IPC 调用:', {
    handler: event.handler,
    payload: event.payload,
    duration: event.duration,
    success: event.success,
  });
});

// 模拟 IPC 调用（用于测试）
debugHelper.simulateIpcCall('getUser', { id: 'user-123' });
```

### 4. MessageBus 调试

调试消息总线问题：

```typescript
// 列出所有数据字段
const fields = debugHelper.listMessageBusFields();
console.log('MessageBus 字段:', fields);
// ['theme', 'language', 'user', 'settings', ...]

// 获取字段详细信息
const fieldInfo = debugHelper.getMessageBusFieldInfo('theme');
console.log(fieldInfo);
// {
//   key: 'theme',
//   value: 'dark',
//   subscriberCount: 3,
//   updateCount: 5,
//   lastUpdated: '2024-01-15T10:30:00.000Z'
// }

// 监听所有数据变化
debugHelper.watchAllMessageBusChanges((event) => {
  console.log('数据变化:', {
    key: event.key,
    oldValue: event.oldValue,
    newValue: event.newValue,
    timestamp: event.timestamp,
  });
});

// 获取订阅者信息
const subscribers = debugHelper.getMessageBusSubscribers('theme');
console.log('订阅者数量:', subscribers.length);
```

### 5. 性能分析

使用 DebugHelper 进行性能分析：

```typescript
// 开始性能分析
debugHelper.startProfiling('operation-name');

// 执行操作
await performOperation();

// 结束性能分析
const profile = debugHelper.stopProfiling('operation-name');
console.log('性能分析结果:', profile);
// {
//   name: 'operation-name',
//   duration: 123.45,
//   memory: { before: 50MB, after: 55MB, delta: 5MB },
//   cpu: { user: 100ms, system: 20ms }
// }

// 获取性能快照
const snapshot = debugHelper.getPerformanceSnapshot();
console.log('性能快照:', snapshot);
// {
//   timestamp: '2024-01-15T10:30:00.000Z',
//   memory: { rss: 100MB, heapTotal: 50MB, heapUsed: 30MB },
//   cpu: { user: 1000ms, system: 200ms },
//   windows: 3,
//   ipcHandlers: 15,
//   messageBusFields: 10
// }
```

## Chrome DevTools 调试

### 1. 主进程调试

使用 Chrome DevTools 调试主进程：

```bash
# 启动应用时启用调试
electron --inspect=5858 .

# 或在代码中启用
# main.ts
if (process.env.NODE_ENV === 'development') {
  require('electron').app.commandLine.appendSwitch('inspect', '5858');
}
```

在 Chrome 中打开 `chrome://inspect`，点击 "Configure" 添加 `localhost:5858`，然后点击 "inspect" 开始调试。

### 2. 渲染进程调试

打开渲染进程的开发者工具：

```typescript
// 主进程
const window = await windowManager.create({
  name: 'main',
  width: 1024,
  height: 768,
  webPreferences: {
    devTools: true, // 启用开发者工具
  },
});

// 自动打开开发者工具
if (process.env.NODE_ENV === 'development') {
  window.webContents.openDevTools();
}

// 或使用快捷键
// macOS: Cmd+Option+I
// Windows/Linux: Ctrl+Shift+I
```

### 3. 断点调试

在代码中设置断点：

```typescript
// 使用 debugger 语句
function processData(data: any) {
  debugger; // 执行到这里会暂停
  
  const result = transform(data);
  return result;
}

// 在 DevTools 中设置断点
// 1. 打开 Sources 面板
// 2. 找到对应的文件
// 3. 点击行号设置断点
```

### 4. 条件断点

设置条件断点只在特定条件下暂停：

```typescript
// 在 DevTools 中右键点击行号，选择 "Add conditional breakpoint"
// 输入条件，例如: userId === 'user-123'

function getUser(userId: string) {
  // 只在 userId === 'user-123' 时暂停
  const user = database.getUser(userId);
  return user;
}
```

## 日志调试

### 1. 结构化日志

使用结构化日志记录调试信息：

```typescript
import { Logger } from 'electron-infra-kit';

const logger = toolkit.getLogger();

// 不同级别的日志
logger.debug('调试信息', { userId: 'user-123', action: 'login' });
logger.info('信息日志', { event: 'window-created', windowId: 'main' });
logger.warn('警告信息', { message: 'Cache miss', key: 'user-data' });
logger.error('错误信息', { error: error.message, stack: error.stack });

// 使用命名空间
const userLogger = logger.child({ namespace: 'user' });
userLogger.info('用户登录', { userId: 'user-123' });

const windowLogger = logger.child({ namespace: 'window' });
windowLogger.debug('窗口创建', { name: 'main', width: 1024 });
```

### 2. 日志过滤

根据级别和命名空间过滤日志：

```typescript
// 只显示错误日志
logger.setLevel('error');

// 只显示特定命名空间的日志
logger.setFilter((log) => {
  return log.namespace === 'user' || log.namespace === 'window';
});

// 使用环境变量控制日志级别
// 启动时: DEBUG=* electron .
// 或: DEBUG=user,window electron .
```

### 3. 日志输出

配置日志输出目标：

```typescript
const toolkit = createElectronToolkit({
  logger: {
    level: 'debug',
    enableConsole: true, // 输出到控制台
    enableFile: true, // 输出到文件
    filePath: path.join(app.getPath('userData'), 'logs'),
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5, // 保留最近 5 个日志文件
  },
});

// 自定义日志格式
logger.setFormatter((log) => {
  return `[${log.timestamp}] [${log.level}] [${log.namespace}] ${log.message}`;
});
```

## 性能监控

### 1. 内存监控

监控应用的内存使用：

```typescript
class MemoryMonitor {
  private interval?: NodeJS.Timeout;

  start(intervalMs: number = 5000): void {
    this.interval = setInterval(() => {
      const usage = process.memoryUsage();
      
      console.log('内存使用情况:');
      console.log(`  RSS: ${this.formatBytes(usage.rss)}`);
      console.log(`  Heap Total: ${this.formatBytes(usage.heapTotal)}`);
      console.log(`  Heap Used: ${this.formatBytes(usage.heapUsed)}`);
      console.log(`  External: ${this.formatBytes(usage.external)}`);

      // 检测内存泄漏
      if (usage.heapUsed > 500 * 1024 * 1024) {
        console.warn('警告: 堆内存使用超过 500MB，可能存在内存泄漏');
        this.takeHeapSnapshot();
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private formatBytes(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  private takeHeapSnapshot(): void {
    // 生成堆快照用于分析
    const v8 = require('v8');
    const fs = require('fs');
    const path = require('path');

    const snapshotPath = path.join(
      app.getPath('userData'),
      `heap-${Date.now()}.heapsnapshot`
    );

    const snapshot = v8.writeHeapSnapshot(snapshotPath);
    console.log('堆快照已保存:', snapshot);
  }
}

// 使用
const memoryMonitor = new MemoryMonitor();
memoryMonitor.start();
```

### 2. CPU 监控

监控 CPU 使用情况：

```typescript
class CpuMonitor {
  private lastUsage = process.cpuUsage();
  private lastTime = Date.now();

  getCpuUsage(): { user: number; system: number; total: number } {
    const currentUsage = process.cpuUsage(this.lastUsage);
    const currentTime = Date.now();
    const elapsed = currentTime - this.lastTime;

    this.lastUsage = process.cpuUsage();
    this.lastTime = currentTime;

    // 转换为百分比
    const user = (currentUsage.user / 1000 / elapsed) * 100;
    const system = (currentUsage.system / 1000 / elapsed) * 100;

    return {
      user: Math.round(user * 100) / 100,
      system: Math.round(system * 100) / 100,
      total: Math.round((user + system) * 100) / 100,
    };
  }

  startMonitoring(intervalMs: number = 5000): NodeJS.Timeout {
    return setInterval(() => {
      const usage = this.getCpuUsage();
      console.log('CPU 使用率:', usage);

      if (usage.total > 80) {
        console.warn('警告: CPU 使用率超过 80%');
      }
    }, intervalMs);
  }
}

// 使用
const cpuMonitor = new CpuMonitor();
const timer = cpuMonitor.startMonitoring();
```

### 3. IPC 性能监控

监控 IPC 调用的性能：

```typescript
class IpcPerformanceMonitor {
  private metrics = new Map<string, IpcMetrics>();

  recordCall(handler: string, duration: number, success: boolean): void {
    if (!this.metrics.has(handler)) {
      this.metrics.set(handler, {
        handler,
        callCount: 0,
        successCount: 0,
        errorCount: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
      });
    }

    const metrics = this.metrics.get(handler)!;
    metrics.callCount++;
    metrics.totalDuration += duration;
    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);

    if (success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }

    // 检测慢速调用
    if (duration > 1000) {
      console.warn(`慢速 IPC 调用: ${handler} 耗时 ${duration.toFixed(2)}ms`);
    }
  }

  getMetrics(handler: string): IpcMetrics | undefined {
    return this.metrics.get(handler);
  }

  getAllMetrics(): IpcMetrics[] {
    return Array.from(this.metrics.values());
  }

  printReport(): void {
    console.log('\n=== IPC 性能报告 ===\n');
    
    const metrics = this.getAllMetrics().sort(
      (a, b) => b.callCount - a.callCount
    );

    console.table(
      metrics.map((m) => ({
        处理器: m.handler,
        调用次数: m.callCount,
        成功: m.successCount,
        失败: m.errorCount,
        平均耗时: `${(m.totalDuration / m.callCount).toFixed(2)}ms`,
        最小耗时: `${m.minDuration.toFixed(2)}ms`,
        最大耗时: `${m.maxDuration.toFixed(2)}ms`,
      }))
    );
  }

  reset(): void {
    this.metrics.clear();
  }
}

interface IpcMetrics {
  handler: string;
  callCount: number;
  successCount: number;
  errorCount: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
}

// 集成到 IPC 处理器
const monitor = new IpcPerformanceMonitor();

const getUserHandler = new IpcHandler(
  'getUser',
  'user',
  async (context, payload) => {
    const start = performance.now();
    let success = true;

    try {
      const result = await context.db.getUser(payload.id);
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - start;
      monitor.recordCall('getUser', duration, success);
    }
  },
  schema
);
```

## 常见问题调试

### 1. 窗口无法创建

```typescript
// 问题: 窗口创建失败
try {
  const window = await windowManager.create({
    name: 'main',
    width: 1024,
    height: 768,
  });
} catch (error) {
  console.error('窗口创建失败:', error);

  // 检查点 1: 窗口是否已存在
  const existing = windowManager.getWindowByName('main');
  if (existing) {
    console.log('窗口已存在，使用现有窗口');
    existing.show();
    return;
  }

  // 检查点 2: 检查配置是否有效
  console.log('窗口配置:', config);

  // 检查点 3: 检查是否有足够的系统资源
  const usage = process.memoryUsage();
  console.log('内存使用:', usage);

  // 检查点 4: 查看详细错误信息
  if (error.code === 'WINDOW_CREATION_FAILED') {
    console.error('创建失败原因:', error.details);
  }
}
```

### 2. IPC 调用超时

```typescript
// 问题: IPC 调用超时或无响应
async function debugIpcTimeout() {
  console.log('开始 IPC 调用...');

  // 添加超时处理
  const timeout = setTimeout(() => {
    console.error('IPC 调用超时');
    
    // 检查主进程是否响应
    console.log('检查主进程状态...');
    
    // 检查是否有未处理的 Promise
    console.log('检查 Promise 队列...');
  }, 5000);

  try {
    const result = await window.electronAPI.getUser('user-123');
    clearTimeout(timeout);
    console.log('IPC 调用成功:', result);
  } catch (error) {
    clearTimeout(timeout);
    console.error('IPC 调用失败:', error);

    // 检查点 1: 处理器是否已注册
    console.log('检查处理器注册状态...');

    // 检查点 2: 参数是否正确
    console.log('检查调用参数...');

    // 检查点 3: 网络或数据库连接
    console.log('检查外部依赖...');
  }
}
```

### 3. 内存泄漏

```typescript
// 问题: 应用内存持续增长
class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = [];

  takeSnapshot(): void {
    const usage = process.memoryUsage();
    this.snapshots.push({
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
    });

    // 只保留最近 10 个快照
    if (this.snapshots.length > 10) {
      this.snapshots.shift();
    }
  }

  detectLeak(): boolean {
    if (this.snapshots.length < 5) {
      return false;
    }

    // 检查内存是否持续增长
    const recent = this.snapshots.slice(-5);
    let increasing = true;

    for (let i = 1; i < recent.length; i++) {
      if (recent[i].heapUsed <= recent[i - 1].heapUsed) {
        increasing = false;
        break;
      }
    }

    if (increasing) {
      console.warn('检测到可能的内存泄漏');
      this.printReport();
      return true;
    }

    return false;
  }

  printReport(): void {
    console.log('\n=== 内存使用趋势 ===\n');
    this.snapshots.forEach((snapshot, index) => {
      const date = new Date(snapshot.timestamp);
      console.log(
        `${index + 1}. ${date.toLocaleTimeString()} - ` +
        `Heap: ${(snapshot.heapUsed / 1024 / 1024).toFixed(2)} MB`
      );
    });
  }

  // 常见内存泄漏原因
  checkCommonLeaks(): void {
    console.log('\n=== 检查常见内存泄漏 ===\n');

    // 1. 未取消的事件监听器
    console.log('1. 检查事件监听器...');
    // 使用 process.getMaxListeners() 检查

    // 2. 未清理的定时器
    console.log('2. 检查定时器...');
    // 确保所有 setTimeout/setInterval 都被清理

    // 3. 未关闭的窗口
    console.log('3. 检查窗口...');
    const windows = windowManager.getAllWindows();
    console.log(`当前窗口数量: ${windows.length}`);

    // 4. 缓存过大
    console.log('4. 检查缓存...');
    // 检查应用中的缓存大小
  }
}

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

// 使用
const detector = new MemoryLeakDetector();

// 定期检查
setInterval(() => {
  detector.takeSnapshot();
  detector.detectLeak();
}, 30000); // 每 30 秒检查一次
```

### 4. MessageBus 数据不同步

```typescript
// 问题: MessageBus 数据在不同窗口间不同步
function debugMessageBusSync() {
  // 检查点 1: 确认数据已设置
  const value = messageBus.getData('theme');
  console.log('当前主题值:', value);

  // 检查点 2: 确认订阅已建立
  const unsubscribe = messageBus.watch('theme', (newValue) => {
    console.log('主题变化:', newValue);
  });

  // 检查点 3: 测试数据更新
  messageBus.setData('theme', 'dark');

  // 检查点 4: 检查权限设置
  try {
    messageBus.setData('readonly-field', 'value');
  } catch (error) {
    console.log('权限检查:', error.message);
  }

  // 检查点 5: 检查序列化
  const complexData = { nested: { value: 123 } };
  messageBus.setData('complex', complexData);
  const retrieved = messageBus.getData('complex');
  console.log('序列化测试:', JSON.stringify(retrieved) === JSON.stringify(complexData));

  // 清理
  unsubscribe();
}
```

## 调试工具推荐

### 1. Electron DevTools Extension

安装 React/Vue DevTools：

```typescript
// main.ts
import { app } from 'electron';
import installExtension, { REACT_DEVELOPER_TOOLS, VUEJS_DEVTOOLS } from 'electron-devtools-installer';

app.whenReady().then(() => {
  if (process.env.NODE_ENV === 'development') {
    // 安装 React DevTools
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => console.log(`已安装: ${name}`))
      .catch((err) => console.log('安装失败:', err));

    // 或安装 Vue DevTools
    installExtension(VUEJS_DEVTOOLS)
      .then((name) => console.log(`已安装: ${name}`))
      .catch((err) => console.log('安装失败:', err));
  }
});
```

### 2. VS Code 调试配置

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Electron: Main",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "windows": {
        "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
      },
      "args": ["."],
      "outputCapture": "std",
      "sourceMaps": true,
      "resolveSourceMapLocations": [
        "${workspaceFolder}/**",
        "!**/node_modules/**"
      ]
    },
    {
      "name": "Electron: Renderer",
      "type": "chrome",
      "request": "attach",
      "port": 9223,
      "webRoot": "${workspaceFolder}",
      "timeout": 30000
    }
  ],
  "compounds": [
    {
      "name": "Electron: All",
      "configurations": ["Electron: Main", "Electron: Renderer"]
    }
  ]
}
```

### 3. 日志分析工具

使用日志分析工具查看日志：

```bash
# 使用 grep 过滤日志
grep "ERROR" app.log

# 使用 tail 实时查看日志
tail -f app.log

# 使用 jq 解析 JSON 日志
cat app.log | jq 'select(.level == "error")'
```

## 调试最佳实践

### 1. 使用断言

```typescript
import assert from 'assert';

function processUser(user: User) {
  // 断言用户对象有效
  assert(user, 'User cannot be null');
  assert(user.id, 'User must have an id');
  assert(user.email.includes('@'), 'Invalid email format');

  // 处理用户
  return transformUser(user);
}
```

### 2. 添加调试信息

```typescript
// 在关键位置添加调试日志
function complexOperation(data: any) {
  console.log('[DEBUG] 开始复杂操作', { data });

  const step1 = processStep1(data);
  console.log('[DEBUG] 步骤 1 完成', { step1 });

  const step2 = processStep2(step1);
  console.log('[DEBUG] 步骤 2 完成', { step2 });

  const result = processStep3(step2);
  console.log('[DEBUG] 操作完成', { result });

  return result;
}
```

### 3. 使用调试标志

```typescript
const DEBUG = process.env.DEBUG === 'true';

function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

// 使用
debugLog('用户登录', { userId: 'user-123' });
```

### 4. 错误边界

```typescript
// 在关键操作周围添加错误边界
async function safeOperation() {
  try {
    await riskyOperation();
  } catch (error) {
    console.error('操作失败:', error);
    
    // 记录详细信息
    logger.error('Risky operation failed', {
      error: error.message,
      stack: error.stack,
      context: getCurrentContext(),
    });

    // 尝试恢复
    await attemptRecovery();
  }
}
```

## 调试清单

### 开发环境
- [ ] 启用调试模式和详细日志
- [ ] 配置 VS Code 调试
- [ ] 安装开发者工具扩展
- [ ] 设置源码映射

### 问题排查
- [ ] 检查日志文件
- [ ] 使用 DebugHelper 检查状态
- [ ] 设置断点逐步调试
- [ ] 监控内存和 CPU 使用

### 性能问题
- [ ] 使用性能分析工具
- [ ] 检查慢速操作
- [ ] 监控内存泄漏
- [ ] 分析 IPC 调用性能

### 生产环境
- [ ] 启用错误报告
- [ ] 收集用户反馈
- [ ] 分析崩溃日志
- [ ] 监控应用性能

## 下一步

- 查看 [错误处理指南](./error-handling.md) 了解错误处理最佳实践
- 查看 [性能优化指南](./performance.md) 了解性能优化技巧
- 查看 [类型安全指南](./type-safety.md) 了解类型安全实践
