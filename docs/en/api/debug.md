# Debug API

Debug toolkit providing development-time debugging assistance.

## DebugHelper

### Static Methods

#### `enableDebugMode(): void`

Enables debug mode.

**Example:**

```typescript
import { DebugHelper } from 'electron-infra-kit';

DebugHelper.enableDebugMode();
```

#### `disableDebugMode(): void`

Disables debug mode.

#### `register(name: string, component: any): void`

Registers component to debug helper.

**Parameters:**

- `name` - Component name
- `component` - Component instance

**Example:**

```typescript
DebugHelper.register('windowManager', windowManager);
DebugHelper.register('ipcRouter', ipcRouter);
```

#### `get(name: string): any`

Gets registered component.

**Parameters:**

- `name` - Component name

**Returns:**

- `any` - Component instance

**Example:**

```typescript
const windowManager = DebugHelper.get('windowManager');
```

## PerformanceMonitor

Performance monitoring tool.

### Static Methods

#### `getInstance(): PerformanceMonitor`

Gets PerformanceMonitor singleton instance.

**Example:**

```typescript
import { PerformanceMonitor } from 'electron-infra-kit';

const perf = PerformanceMonitor.getInstance();
```

### Instance Methods

#### `startMeasure(id: string, name: string, metadata?: object): void`

Starts performance measurement.

**Parameters:**

- `id` - Measurement ID
- `name` - Measurement name
- `metadata` - Optional metadata

**Example:**

```typescript
perf.startMeasure('window-create-1', 'Window Creation', {
  name: 'main',
  width: 1200
});
```

#### `endMeasure(id: string, metadata?: object): void`

Ends performance measurement.

**Parameters:**

- `id` - Measurement ID
- `metadata` - Optional metadata

**Example:**

```typescript
perf.endMeasure('window-create-1', { status: 'success' });
```

#### `getMeasures(): PerformanceMeasure[]`

Gets all performance measurement results.

**Returns:**

- `PerformanceMeasure[]` - Array of performance measurements

**Example:**

```typescript
const measures = perf.getMeasures();
measures.forEach(measure => {
  console.log(`${measure.name}: ${measure.duration}ms`);
});
```

#### `clear(): void`

Clears all performance measurement data.

## EnhancedDebugHelper

Enhanced debug helper providing additional debugging features.

### Usage Example

```typescript
import { EnhancedDebugHelper } from 'electron-infra-kit';

// Access in developer tools
// window.__ELECTRON_TOOLKIT__
```

## Complete Example

```typescript
import { DebugHelper, PerformanceMonitor } from 'electron-infra-kit';

// Enable debug mode
if (process.env.NODE_ENV === 'development') {
  DebugHelper.enableDebugMode();
  
  // Register components
  DebugHelper.register('windowManager', windowManager);
  DebugHelper.register('ipcRouter', ipcRouter);
  DebugHelper.register('messageBus', messageBus);
}

// Performance monitoring
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

// View performance data
const measures = perf.getMeasures();
console.log('Performance measures:', measures);
```

## Related Links

- [Debugging Tips](/en/guide/advanced/debugging)
- [Performance Optimization](/en/guide/advanced/performance)
