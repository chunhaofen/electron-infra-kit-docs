# Logger API

Logging system providing unified logging interface.

## Class Definition

```typescript
class Logger implements ILogger
```

## Constructor

### `constructor(options?: LoggerOptions)`

Creates a Logger instance.

**Parameters:**

- `options` - Optional logger configuration

**Example:**

```typescript
import { Logger } from 'electron-infra-kit';

const logger = new Logger({
  appName: 'MyApp',
  level: 'info'
});
```

## Configuration Options

### LoggerOptions

```typescript
interface LoggerOptions {
  appName?: string;    // Application name
  level?: string;      // Log level
  file?: string;       // Log file path
}
```

## Core Methods

### `info(message: string, ...args: any[]): void`

Logs info level message.

**Example:**

```typescript
logger.info('Application started');
logger.info('User logged in:', userId);
```

### `warn(message: string, ...args: any[]): void`

Logs warning level message.

**Example:**

```typescript
logger.warn('Deprecated API used');
```

### `error(message: string, ...args: any[]): void`

Logs error level message.

**Example:**

```typescript
logger.error('Failed to load file:', error);
```

### `debug(message: string, ...args: any[]): void`

Logs debug level message.

**Example:**

```typescript
logger.debug('Debug info:', data);
```

## Shared Logger Instance

### `getSharedLogger(options?: LoggerOptions): ILogger`

Gets shared logger instance.

**Example:**

```typescript
import { getSharedLogger } from 'electron-infra-kit';

const logger = getSharedLogger({ appName: 'MyApp' });
```

### `setSharedLogger(logger: ILogger): void`

Sets shared logger instance.

**Example:**

```typescript
import { setSharedLogger, Logger } from 'electron-infra-kit';

const customLogger = new Logger({ appName: 'MyApp' });
setSharedLogger(customLogger);
```

## Complete Example

```typescript
import { Logger, getSharedLogger } from 'electron-infra-kit';

// Create custom logger instance
const logger = new Logger({
  appName: 'MyApp',
  level: 'debug'
});

logger.info('Application starting...');
logger.debug('Debug mode enabled');

// Use shared logger instance
const sharedLogger = getSharedLogger();
sharedLogger.info('Using shared logger');
```

## Related Links

- [Getting Started](/en/guide/getting-started)
- [Debugging Tips](/en/guide/advanced/debugging)
