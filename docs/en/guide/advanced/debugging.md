# Debugging Guide

## Overview

Effective debugging techniques can greatly improve development efficiency. This guide covers how to debug Electron applications built with `electron-infra-kit`, including using DebugHelper, performance monitoring, and debugging common issues.

## Using DebugHelper

### 1. Enable Debug Mode

Enable debug mode in development environment:

```typescript
import { createElectronToolkit, DebugHelper } from 'electron-infra-kit';

const toolkit = createElectronToolkit({
  debug: true, // Enable debug mode
  logger: {
    level: 'debug', // Set log level
    enableConsole: true,
    enableFile: true,
    filePath: path.join(app.getPath('userData'), 'logs'),
  },
});

// Get DebugHelper instance
const debugHelper = toolkit.getDebugHelper();
```

### 2. Window Debugging

Use DebugHelper to debug window-related issues:

```typescript
// List all windows
debugHelper.listWindows();
// Output:
// Windows:
// - main (id: 1, visible: true, focused: true)
// - settings (id: 2, visible: false, focused: false)

// Get window details
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

// Check window state
if (debugHelper.isWindowAlive('main')) {
  console.log('Window exists and is not destroyed');
}

// Get window performance metrics
const metrics = debugHelper.getWindowMetrics('main');
console.log('Memory usage:', metrics.memory);
console.log('CPU usage:', metrics.cpu);
```

### 3. IPC Debugging

Debug IPC communication issues:

```typescript
// Enable IPC logging
debugHelper.enableIpcLogging();

// List all registered IPC handlers
const handlers = debugHelper.listIpcHandlers();
console.log('Registered handlers:', handlers);
// ['getUser', 'updateUser', 'deleteUser', ...]

// Get handler details
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

// Listen for IPC calls
debugHelper.onIpcCall((event) => {
  console.log('IPC call:', {
    handler: event.handler,
    payload: event.payload,
    duration: event.duration,
    success: event.success,
  });
});

// Simulate IPC call (for testing)
debugHelper.simulateIpcCall('getUser', { id: 'user-123' });
```

### 4. MessageBus Debugging

Debug message bus issues:

```typescript
// List all data fields
const fields = debugHelper.listMessageBusFields();
console.log('MessageBus fields:', fields);
// ['theme', 'language', 'user', 'settings', ...]

// Get field details
const fieldInfo = debugHelper.getMessageBusFieldInfo('theme');
console.log(fieldInfo);
// {
//   key: 'theme',
//   value: 'dark',
//   subscriberCount: 3,
//   updateCount: 5,
//   lastUpdated: '2024-01-15T10:30:00.000Z'
// }

// Watch all data changes
debugHelper.watchAllMessageBusChanges((event) => {
  console.log('Data change:', {
    key: event.key,
    oldValue: event.oldValue,
    newValue: event.newValue,
    timestamp: event.timestamp,
  });
});

// Get subscriber information
const subscribers = debugHelper.getMessageBusSubscribers('theme');
console.log('Subscriber count:', subscribers.length);
```

### 5. Performance Profiling

Use DebugHelper for performance profiling:

```typescript
// Start profiling
debugHelper.startProfiling('operation-name');

// Perform operation
await performOperation();

// Stop profiling
const profile = debugHelper.stopProfiling('operation-name');
console.log('Profiling result:', profile);
// {
//   name: 'operation-name',
//   duration: 123.45,
//   memory: { before: 50MB, after: 55MB, delta: 5MB },
//   cpu: { user: 100ms, system: 20ms }
// }

// Get performance snapshot
const snapshot = debugHelper.getPerformanceSnapshot();
console.log('Performance snapshot:', snapshot);
// {
//   timestamp: '2024-01-15T10:30:00.000Z',
//   memory: { rss: 100MB, heapTotal: 50MB, heapUsed: 30MB },
//   cpu: { user: 1000ms, system: 200ms },
//   windows: 3,
//   ipcHandlers: 15,
//   messageBusFields: 10
// }
```

## Chrome DevTools Debugging

### 1. Main Process Debugging

Use Chrome DevTools to debug main process:

```bash
# Enable debugging when starting app
electron --inspect=5858 .

# Or enable in code
# main.ts
if (process.env.NODE_ENV === 'development') {
  require('electron').app.commandLine.appendSwitch('inspect', '5858');
}
```

Open `chrome://inspect` in Chrome, click "Configure" to add `localhost:5858`, then click "inspect" to start debugging.

### 2. Renderer Process Debugging

Open developer tools for renderer process:

```typescript
// Main process
const window = await windowManager.create({
  name: 'main',
  width: 1024,
  height: 768,
  webPreferences: {
    devTools: true, // Enable developer tools
  },
});

// Automatically open developer tools
if (process.env.NODE_ENV === 'development') {
  window.webContents.openDevTools();
}

// Or use keyboard shortcut
// macOS: Cmd+Option+I
// Windows/Linux: Ctrl+Shift+I
```

### 3. Breakpoint Debugging

Set breakpoints in code:

```typescript
// Use debugger statement
function processData(data: any) {
  debugger; // Execution will pause here
  
  const result = transform(data);
  return result;
}

// Set breakpoint in DevTools
// 1. Open Sources panel
// 2. Find the corresponding file
// 3. Click line number to set breakpoint
```

### 4. Conditional Breakpoints

Set conditional breakpoints to pause only under specific conditions:

```typescript
// In DevTools, right-click line number and select "Add conditional breakpoint"
// Enter condition, e.g.: userId === 'user-123'

function getUser(userId: string) {
  // Will only pause when userId === 'user-123'
  const user = database.getUser(userId);
  return user;
}
```

## Log Debugging

### 1. Structured Logging

Use structured logging to record debug information:

```typescript
import { Logger } from 'electron-infra-kit';

const logger = toolkit.getLogger();

// Different log levels
logger.debug('Debug info', { userId: 'user-123', action: 'login' });
logger.info('Info log', { event: 'window-created', windowId: 'main' });
logger.warn('Warning', { message: 'Cache miss', key: 'user-data' });
logger.error('Error', { error: error.message, stack: error.stack });

// Use namespaces
const userLogger = logger.child({ namespace: 'user' });
userLogger.info('User login', { userId: 'user-123' });

const windowLogger = logger.child({ namespace: 'window' });
windowLogger.debug('Window created', { name: 'main', width: 1024 });
```

### 2. Log Filtering

Filter logs by level and namespace:

```typescript
// Only show error logs
logger.setLevel('error');

// Only show logs from specific namespaces
logger.setFilter((log) => {
  return log.namespace === 'user' || log.namespace === 'window';
});

// Use environment variables to control log level
// At startup: DEBUG=* electron .
// Or: DEBUG=user,window electron .
```

### 3. Log Output

Configure log output targets:

```typescript
const toolkit = createElectronToolkit({
  logger: {
    level: 'debug',
    enableConsole: true, // Output to console
    enableFile: true, // Output to file
    filePath: path.join(app.getPath('userData'), 'logs'),
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5, // Keep last 5 log files
  },
});

// Custom log format
logger.setFormatter((log) => {
  return `[${log.timestamp}] [${log.level}] [${log.namespace}] ${log.message}`;
});
```

## Performance Monitoring

### 1. Memory Monitoring

Monitor application memory usage:

```typescript
class MemoryMonitor {
  private interval?: NodeJS.Timeout;

  start(intervalMs: number = 5000): void {
    this.interval = setInterval(() => {
      const usage = process.memoryUsage();
      
      console.log('Memory usage:');
      console.log(`  RSS: ${this.formatBytes(usage.rss)}`);
      console.log(`  Heap Total: ${this.formatBytes(usage.heapTotal)}`);
      console.log(`  Heap Used: ${this.formatBytes(usage.heapUsed)}`);
      console.log(`  External: ${this.formatBytes(usage.external)}`);

      // Detect memory leaks
      if (usage.heapUsed > 500 * 1024 * 1024) {
        console.warn('Warning: Heap memory usage exceeds 500MB, possible memory leak');
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
    // Generate heap snapshot for analysis
    const v8 = require('v8');
    const fs = require('fs');
    const path = require('path');

    const snapshotPath = path.join(
      app.getPath('userData'),
      `heap-${Date.now()}.heapsnapshot`
    );

    const snapshot = v8.writeHeapSnapshot(snapshotPath);
    console.log('Heap snapshot saved:', snapshot);
  }
}

// Usage
const memoryMonitor = new MemoryMonitor();
memoryMonitor.start();
```

### 2. CPU Monitoring

Monitor CPU usage:

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

    // Convert to percentage
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
      console.log('CPU usage:', usage);

      if (usage.total > 80) {
        console.warn('Warning: CPU usage exceeds 80%');
      }
    }, intervalMs);
  }
}

// Usage
const cpuMonitor = new CpuMonitor();
const timer = cpuMonitor.startMonitoring();
```

### 3. IPC Performance Monitoring

Monitor IPC call performance:

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

    // Detect slow calls
    if (duration > 1000) {
      console.warn(`Slow IPC call: ${handler} took ${duration.toFixed(2)}ms`);
    }
  }

  getMetrics(handler: string): IpcMetrics | undefined {
    return this.metrics.get(handler);
  }

  getAllMetrics(): IpcMetrics[] {
    return Array.from(this.metrics.values());
  }

  printReport(): void {
    console.log('\n=== IPC Performance Report ===\n');
    
    const metrics = this.getAllMetrics().sort(
      (a, b) => b.callCount - a.callCount
    );

    console.table(
      metrics.map((m) => ({
        Handler: m.handler,
        Calls: m.callCount,
        Success: m.successCount,
        Errors: m.errorCount,
        'Avg Duration': `${(m.totalDuration / m.callCount).toFixed(2)}ms`,
        'Min Duration': `${m.minDuration.toFixed(2)}ms`,
        'Max Duration': `${m.maxDuration.toFixed(2)}ms`,
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

// Integrate into IPC handler
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

## Debugging Common Issues

### 1. Window Creation Failure

```typescript
// Issue: Window creation fails
try {
  const window = await windowManager.create({
    name: 'main',
    width: 1024,
    height: 768,
  });
} catch (error) {
  console.error('Window creation failed:', error);

  // Checkpoint 1: Check if window already exists
  const existing = windowManager.getWindowByName('main');
  if (existing) {
    console.log('Window already exists, using existing window');
    existing.show();
    return;
  }

  // Checkpoint 2: Check if configuration is valid
  console.log('Window config:', config);

  // Checkpoint 3: Check if there are enough system resources
  const usage = process.memoryUsage();
  console.log('Memory usage:', usage);

  // Checkpoint 4: View detailed error information
  if (error.code === 'WINDOW_CREATION_FAILED') {
    console.error('Creation failure reason:', error.details);
  }
}
```

### 2. IPC Call Timeout

```typescript
// Issue: IPC call timeout or no response
async function debugIpcTimeout() {
  console.log('Starting IPC call...');

  // Add timeout handling
  const timeout = setTimeout(() => {
    console.error('IPC call timeout');
    
    // Check if main process is responding
    console.log('Checking main process status...');
    
    // Check for unhandled Promises
    console.log('Checking Promise queue...');
  }, 5000);

  try {
    const result = await window.electronAPI.getUser('user-123');
    clearTimeout(timeout);
    console.log('IPC call succeeded:', result);
  } catch (error) {
    clearTimeout(timeout);
    console.error('IPC call failed:', error);

    // Checkpoint 1: Check if handler is registered
    console.log('Checking handler registration status...');

    // Checkpoint 2: Check if parameters are correct
    console.log('Checking call parameters...');

    // Checkpoint 3: Network or database connection
    console.log('Checking external dependencies...');
  }
}
```

### 3. Memory Leak

```typescript
// Issue: Application memory continuously grows
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

    // Keep only last 10 snapshots
    if (this.snapshots.length > 10) {
      this.snapshots.shift();
    }
  }

  detectLeak(): boolean {
    if (this.snapshots.length < 5) {
      return false;
    }

    // Check if memory is continuously growing
    const recent = this.snapshots.slice(-5);
    let increasing = true;

    for (let i = 1; i < recent.length; i++) {
      if (recent[i].heapUsed <= recent[i - 1].heapUsed) {
        increasing = false;
        break;
      }
    }

    if (increasing) {
      console.warn('Possible memory leak detected');
      this.printReport();
      return true;
    }

    return false;
  }

  printReport(): void {
    console.log('\n=== Memory Usage Trend ===\n');
    this.snapshots.forEach((snapshot, index) => {
      const date = new Date(snapshot.timestamp);
      console.log(
        `${index + 1}. ${date.toLocaleTimeString()} - ` +
        `Heap: ${(snapshot.heapUsed / 1024 / 1024).toFixed(2)} MB`
      );
    });
  }

  // Common memory leak causes
  checkCommonLeaks(): void {
    console.log('\n=== Checking Common Memory Leaks ===\n');

    // 1. Uncanceled event listeners
    console.log('1. Checking event listeners...');
    // Use process.getMaxListeners() to check

    // 2. Uncleaned timers
    console.log('2. Checking timers...');
    // Ensure all setTimeout/setInterval are cleaned up

    // 3. Unclosed windows
    console.log('3. Checking windows...');
    const windows = windowManager.getAllWindows();
    console.log(`Current window count: ${windows.length}`);

    // 4. Cache too large
    console.log('4. Checking cache...');
    // Check cache size in application
  }
}

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

// Usage
const detector = new MemoryLeakDetector();

// Periodic check
setInterval(() => {
  detector.takeSnapshot();
  detector.detectLeak();
}, 30000); // Check every 30 seconds
```

### 4. MessageBus Data Not Syncing

```typescript
// Issue: MessageBus data not syncing between windows
function debugMessageBusSync() {
  // Checkpoint 1: Confirm data is set
  const value = messageBus.getData('theme');
  console.log('Current theme value:', value);

  // Checkpoint 2: Confirm subscription is established
  const unsubscribe = messageBus.watch('theme', (newValue) => {
    console.log('Theme changed:', newValue);
  });

  // Checkpoint 3: Test data update
  messageBus.setData('theme', 'dark');

  // Checkpoint 4: Check permission settings
  try {
    messageBus.setData('readonly-field', 'value');
  } catch (error) {
    console.log('Permission check:', error.message);
  }

  // Checkpoint 5: Check serialization
  const complexData = { nested: { value: 123 } };
  messageBus.setData('complex', complexData);
  const retrieved = messageBus.getData('complex');
  console.log('Serialization test:', JSON.stringify(retrieved) === JSON.stringify(complexData));

  // Cleanup
  unsubscribe();
}
```

## Recommended Debugging Tools

### 1. Electron DevTools Extension

Install React/Vue DevTools:

```typescript
// main.ts
import { app } from 'electron';
import installExtension, { REACT_DEVELOPER_TOOLS, VUEJS_DEVTOOLS } from 'electron-devtools-installer';

app.whenReady().then(() => {
  if (process.env.NODE_ENV === 'development') {
    // Install React DevTools
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => console.log(`Installed: ${name}`))
      .catch((err) => console.log('Installation failed:', err));

    // Or install Vue DevTools
    installExtension(VUEJS_DEVTOOLS)
      .then((name) => console.log(`Installed: ${name}`))
      .catch((err) => console.log('Installation failed:', err));
  }
});
```

### 2. VS Code Debug Configuration

Create `.vscode/launch.json`:

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

### 3. Log Analysis Tools

Use log analysis tools to view logs:

```bash
# Use grep to filter logs
grep "ERROR" app.log

# Use tail to view logs in real-time
tail -f app.log

# Use jq to parse JSON logs
cat app.log | jq 'select(.level == "error")'
```

## Debugging Best Practices

### 1. Use Assertions

```typescript
import assert from 'assert';

function processUser(user: User) {
  // Assert user object is valid
  assert(user, 'User cannot be null');
  assert(user.id, 'User must have an id');
  assert(user.email.includes('@'), 'Invalid email format');

  // Process user
  return transformUser(user);
}
```

### 2. Add Debug Information

```typescript
// Add debug logs at key locations
function complexOperation(data: any) {
  console.log('[DEBUG] Starting complex operation', { data });

  const step1 = processStep1(data);
  console.log('[DEBUG] Step 1 complete', { step1 });

  const step2 = processStep2(step1);
  console.log('[DEBUG] Step 2 complete', { step2 });

  const result = processStep3(step2);
  console.log('[DEBUG] Operation complete', { result });

  return result;
}
```

### 3. Use Debug Flags

```typescript
const DEBUG = process.env.DEBUG === 'true';

function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

// Usage
debugLog('User login', { userId: 'user-123' });
```

### 4. Error Boundaries

```typescript
// Add error boundaries around critical operations
async function safeOperation() {
  try {
    await riskyOperation();
  } catch (error) {
    console.error('Operation failed:', error);
    
    // Log detailed information
    logger.error('Risky operation failed', {
      error: error.message,
      stack: error.stack,
      context: getCurrentContext(),
    });

    // Attempt recovery
    await attemptRecovery();
  }
}
```

## Debugging Checklist

### Development Environment
- [ ] Enable debug mode and verbose logging
- [ ] Configure VS Code debugging
- [ ] Install developer tools extensions
- [ ] Set up source maps

### Troubleshooting
- [ ] Check log files
- [ ] Use DebugHelper to check state
- [ ] Set breakpoints for step-by-step debugging
- [ ] Monitor memory and CPU usage

### Performance Issues
- [ ] Use performance profiling tools
- [ ] Check for slow operations
- [ ] Monitor memory leaks
- [ ] Analyze IPC call performance

### Production Environment
- [ ] Enable error reporting
- [ ] Collect user feedback
- [ ] Analyze crash logs
- [ ] Monitor application performance

## Next Steps

- Check out [Error Handling Guide](./error-handling.md) for error handling best practices
- Check out [Performance Optimization Guide](./performance.md) for performance optimization techniques
- Check out [Type Safety Guide](./type-safety.md) for type safety practices
