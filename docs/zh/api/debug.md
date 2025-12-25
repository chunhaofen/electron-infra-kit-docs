# Debug API

调试工具集，提供开发时的调试辅助功能。

## DebugHelper

### 静态方法

#### `enableDebugMode(): void`

启用调试模式。

**示例：**

```typescript
import { DebugHelper } from 'electron-infra-kit';

DebugHelper.enableDebugMode();
```

#### `disableDebugMode(): void`

禁用调试模式。

#### `register(name: string, component: any): void`

注册组件到调试助手。

**参数：**

- `name` - 组件名称
- `component` - 组件实例

**示例：**

```typescript
DebugHelper.register('windowManager', windowManager);
DebugHelper.register('ipcRouter', ipcRouter);
```

#### `get(name: string): any`

获取已注册的组件。

**参数：**

- `name` - 组件名称

**返回值：**

- `any` - 组件实例

**示例：**

```typescript
const windowManager = DebugHelper.get('windowManager');
```

## PerformanceMonitor

性能监控工具。

### 静态方法

#### `getInstance(): PerformanceMonitor`

获取 PerformanceMonitor 单例实例。

**示例：**

```typescript
import { PerformanceMonitor } from 'electron-infra-kit';

const perf = PerformanceMonitor.getInstance();
```

### 实例方法

#### `startMeasure(id: string, name: string, metadata?: object): void`

开始性能测量。

**参数：**

- `id` - 测量 ID
- `name` - 测量名称
- `metadata` - 可选的元数据

**示例：**

```typescript
perf.startMeasure('window-create-1', 'Window Creation', {
  name: 'main',
  width: 1200
});
```

#### `endMeasure(id: string, metadata?: object): void`

结束性能测量。

**参数：**

- `id` - 测量 ID
- `metadata` - 可选的元数据

**示例：**

```typescript
perf.endMeasure('window-create-1', { status: 'success' });
```

#### `getMeasures(): PerformanceMeasure[]`

获取所有性能测量结果。

**返回值：**

- `PerformanceMeasure[]` - 性能测量结果数组

**示例：**

```typescript
const measures = perf.getMeasures();
measures.forEach(measure => {
  console.log(`${measure.name}: ${measure.duration}ms`);
});
```

#### `clear(): void`

清除所有性能测量数据。

## EnhancedDebugHelper

增强调试助手，提供更多调试功能。

### 使用示例

```typescript
import { EnhancedDebugHelper } from 'electron-infra-kit';

// 在开发者工具中访问
// window.__ELECTRON_TOOLKIT__
```

## 完整示例

```typescript
import { DebugHelper, PerformanceMonitor } from 'electron-infra-kit';

// 启用调试模式
if (process.env.NODE_ENV === 'development') {
  DebugHelper.enableDebugMode();
  
  // 注册组件
  DebugHelper.register('windowManager', windowManager);
  DebugHelper.register('ipcRouter', ipcRouter);
  DebugHelper.register('messageBus', messageBus);
}

// 性能监控
const perf = PerformanceMonitor.getInstance();

async function createWindow() {
  const measureId = `window-create-${Date.now()}`;
  
  perf.startMeasure(measureId, 'Window Creation');
  
  try {
    const windowId = await windowManager.create({
      name: 'main',
      width: 1200,
      height: 800
    });
    
    perf.endMeasure(measureId, { status: 'success', windowId });
    return windowId;
  } catch (error) {
    perf.endMeasure(measureId, { status: 'error', error: error.message });
    throw error;
  }
}

// 查看性能数据
const measures = perf.getMeasures();
console.log('Performance measures:', measures);
```

## 相关链接

- [调试技巧](/guide/advanced/debugging)
- [性能优化](/guide/advanced/performance)
