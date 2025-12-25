# Logger API

日志记录系统，提供统一的日志接口。

## 类定义

```typescript
class Logger implements ILogger
```

## 构造函数

### `constructor(options?: LoggerOptions)`

创建 Logger 实例。

**参数：**

- `options` - 可选的日志配置

**示例：**

```typescript
import { Logger } from 'electron-infra-kit';

const logger = new Logger({
  appName: 'MyApp',
  level: 'info'
});
```

## 配置选项

### LoggerOptions

```typescript
interface LoggerOptions {
  appName?: string;    // 应用名称
  level?: string;      // 日志级别
  file?: string;       // 日志文件路径
}
```

## 核心方法

### `info(message: string, ...args: any[]): void`

记录信息级别日志。

**示例：**

```typescript
logger.info('Application started');
logger.info('User logged in:', userId);
```

### `warn(message: string, ...args: any[]): void`

记录警告级别日志。

**示例：**

```typescript
logger.warn('Deprecated API used');
```

### `error(message: string, ...args: any[]): void`

记录错误级别日志。

**示例：**

```typescript
logger.error('Failed to load file:', error);
```

### `debug(message: string, ...args: any[]): void`

记录调试级别日志。

**示例：**

```typescript
logger.debug('Debug info:', data);
```

## 共享日志实例

### `getSharedLogger(options?: LoggerOptions): ILogger`

获取共享日志实例。

**示例：**

```typescript
import { getSharedLogger } from 'electron-infra-kit';

const logger = getSharedLogger({ appName: 'MyApp' });
```

### `setSharedLogger(logger: ILogger): void`

设置共享日志实例。

**示例：**

```typescript
import { setSharedLogger, Logger } from 'electron-infra-kit';

const customLogger = new Logger({ appName: 'MyApp' });
setSharedLogger(customLogger);
```

## 完整示例

```typescript
import { Logger, getSharedLogger } from 'electron-infra-kit';

// 创建自定义日志实例
const logger = new Logger({
  appName: 'MyApp',
  level: 'debug'
});

logger.info('Application starting...');
logger.debug('Debug mode enabled');

// 使用共享日志实例
const sharedLogger = getSharedLogger();
sharedLogger.info('Using shared logger');
```

## 相关链接

- [快速开始](/guide/getting-started)
- [调试技巧](/guide/advanced/debugging)
