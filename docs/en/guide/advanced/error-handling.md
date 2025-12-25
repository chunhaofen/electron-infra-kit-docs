# Error Handling Guide

## Overview

Good error handling is key to building robust Electron applications. This guide covers how to effectively handle errors when using `electron-infra-kit`, including error types, handling strategies, and best practices.

## Error Types

### 1. Window Management Errors

Errors that may occur during window management:

```typescript
import { WindowManager, WindowError } from 'electron-infra-kit';

try {
  const window = await windowManager.create({
    name: 'main',
    width: 1024,
    height: 768,
  });
} catch (error) {
  if (error instanceof WindowError) {
    switch (error.code) {
      case 'WINDOW_ALREADY_EXISTS':
        console.error('Window already exists:', error.message);
        // Get existing window
        const existing = windowManager.getWindowByName('main');
        break;

      case 'WINDOW_CREATION_FAILED':
        console.error('Window creation failed:', error.message);
        // Show error to user
        dialog.showErrorBox('Error', 'Failed to create window');
        break;

      case 'WINDOW_NOT_FOUND':
        console.error('Window not found:', error.message);
        break;

      default:
        console.error('Unknown window error:', error);
    }
  }
}
```

### 2. IPC Communication Errors

Error handling in IPC communication:

```typescript
import { IpcHandler, IpcError } from 'electron-infra-kit';
import { z } from 'zod';

// Main process
const getUserHandler = new IpcHandler(
  'getUser',
  'user',
  async (context, payload: { id: string }) => {
    try {
      const user = await context.db.getUser(payload.id);

      if (!user) {
        throw new IpcError('USER_NOT_FOUND', `User ${payload.id} not found`);
      }

      return user;
    } catch (error) {
      if (error instanceof IpcError) {
        throw error; // Re-throw IPC errors
      }

      // Wrap other errors
      throw new IpcError(
        'DATABASE_ERROR',
        'Database query failed',
        error as Error
      );
    }
  },
  z.object({ id: z.string() })
);

// Renderer process
try {
  const user = await window.electronAPI.getUser('user-123');
  console.log('User:', user);
} catch (error) {
  if (error.code === 'USER_NOT_FOUND') {
    console.error('User not found');
    // Show friendly error message
  } else if (error.code === 'DATABASE_ERROR') {
    console.error('Database error');
    // Show retry option
  } else {
    console.error('Unknown error:', error);
  }
}
```

### 3. Validation Errors

Handling Zod validation failures:

```typescript
import { z } from 'zod';
import { IpcHandler } from 'electron-infra-kit';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty'),
  email: z.string().email('Invalid email address'),
  age: z.number().int().min(0, 'Age must be positive').max(150, 'Age unreasonable'),
});

const createUserHandler = new IpcHandler(
  'createUser',
  'user',
  async (context, payload) => {
    // IpcHandler automatically throws validation error if validation fails
    return await context.db.createUser(payload);
  },
  createUserSchema
);

// Renderer process handling validation errors
try {
  await window.electronAPI.createUser({
    name: '',
    email: 'invalid-email',
    age: -5,
  });
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    // Error contains detailed validation failure information
    const validationErrors = error.details;
    validationErrors.forEach((err) => {
      console.error(`${err.path}: ${err.message}`);
    });

    // Display validation errors in UI
    displayValidationErrors(validationErrors);
  }
}
```

### 4. MessageBus Errors

Message bus related errors:

```typescript
import { MessageBus, MessageBusError } from 'electron-infra-kit';

try {
  // Try to set read-only data
  messageBus.setData('readonly-field', 'new-value');
} catch (error) {
  if (error instanceof MessageBusError) {
    switch (error.code) {
      case 'PERMISSION_DENIED':
        console.error('Permission denied:', error.message);
        break;

      case 'INVALID_KEY':
        console.error('Invalid key:', error.message);
        break;

      case 'SERIALIZATION_ERROR':
        console.error('Serialization failed:', error.message);
        break;

      default:
        console.error('MessageBus error:', error);
    }
  }
}
```

## Error Handling Strategies

### 1. Layered Error Handling

Handle different types of errors at different layers:

```typescript
// Data access layer
class UserRepository {
  async getUser(id: string): Promise<User> {
    try {
      const user = await this.db.query('SELECT * FROM users WHERE id = ?', [
        id,
      ]);
      return user;
    } catch (error) {
      // Convert to domain error
      throw new RepositoryError('USER_QUERY_FAILED', 'Failed to query user', error);
    }
  }
}

// Business logic layer
class UserService {
  constructor(private repository: UserRepository) {}

  async getUserProfile(id: string): Promise<UserProfile> {
    try {
      const user = await this.repository.getUser(id);

      if (!user) {
        throw new ServiceError('USER_NOT_FOUND', `User ${id} not found`);
      }

      return this.buildProfile(user);
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      // Wrap lower-level errors
      throw new ServiceError(
        'PROFILE_LOAD_FAILED',
        'Failed to load user profile',
        error
      );
    }
  }

  private buildProfile(user: User): UserProfile {
    // Build user profile
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }
}

// IPC handler layer
const getUserProfileHandler = new IpcHandler(
  'getUserProfile',
  'user',
  async (context, payload: { id: string }) => {
    try {
      return await context.userService.getUserProfile(payload.id);
    } catch (error) {
      if (error instanceof ServiceError) {
        // Convert to IPC error
        throw new IpcError(error.code, error.message, error);
      }

      throw new IpcError('INTERNAL_ERROR', 'Internal error', error as Error);
    }
  },
  z.object({ id: z.string() })
);
```

### 2. Error Recovery

Implement automatic retry and fallback strategies:

```typescript
class ResilientIpcClient {
  private maxRetries = 3;
  private retryDelay = 1000;

  async callWithRetry<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0 && this.isRetryable(error)) {
        console.warn(`Request failed, retrying in ${this.retryDelay}ms...`);
        await this.delay(this.retryDelay);
        return this.callWithRetry(fn, retries - 1);
      }

      throw error;
    }
  }

  private isRetryable(error: any): boolean {
    // Determine if error is retryable
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'SERVICE_UNAVAILABLE',
    ];
    return retryableCodes.includes(error.code);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Usage example
  async getUser(id: string): Promise<User> {
    return this.callWithRetry(() => window.electronAPI.getUser(id));
  }
}

// Fallback strategy
class FallbackIpcClient {
  async getUserWithFallback(id: string): Promise<User | null> {
    try {
      return await window.electronAPI.getUser(id);
    } catch (error) {
      console.error('Failed to get user, using cached data:', error);

      // Try to get from cache
      const cached = this.getCachedUser(id);
      if (cached) {
        return cached;
      }

      // Return default value
      return this.getDefaultUser();
    }
  }

  private getCachedUser(id: string): User | null {
    // Get user from cache
    const cached = localStorage.getItem(`user:${id}`);
    return cached ? JSON.parse(cached) : null;
  }

  private getDefaultUser(): User {
    return {
      id: 'unknown',
      name: 'Unknown User',
      email: '',
    };
  }
}
```

### 3. Error Boundaries

Implement error boundaries at the UI layer:

```typescript
// React error boundary example
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error
    console.error('Error boundary caught error:', error, errorInfo);

    // Send error report
    window.electronAPI.reportError({
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <p>The application encountered an error. Please refresh to try again.</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Use error boundary
function App() {
  return (
    <ErrorBoundary>
      <MainContent />
    </ErrorBoundary>
  );
}
```

### 4. Global Error Handling

Set up global error handlers:

```typescript
// Main process
import { app } from 'electron';

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection:', reason);
  // Log error
  logger.error('Unhandled rejection', { reason, promise });
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Log error
  logger.error('Uncaught exception', { error });

  // Show error dialog
  dialog.showErrorBox('Critical Error', `Application encountered a critical error:\n${error.message}`);

  // Graceful exit
  app.quit();
});

// Renderer process
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Report error
  window.electronAPI.reportError({
    message: event.error.message,
    stack: event.error.stack,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Report error
  window.electronAPI.reportError({
    message: 'Unhandled Promise Rejection',
    reason: event.reason,
  });
});
```

## Error Logging

### 1. Structured Logging

Use structured logging to record errors:

```typescript
import { Logger } from 'electron-infra-kit';

class ErrorLogger {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  logError(error: Error, context?: Record<string, any>): void {
    this.logger.error('Error occurred', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
    });
  }

  logIpcError(
    handlerName: string,
    error: Error,
    payload?: any
  ): void {
    this.logger.error('IPC handler error', {
      handler: handlerName,
      error: {
        message: error.message,
        stack: error.stack,
      },
      payload,
    });
  }

  logWindowError(
    windowName: string,
    operation: string,
    error: Error
  ): void {
    this.logger.error('Window operation error', {
      window: windowName,
      operation,
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
}

// Usage example
const errorLogger = new ErrorLogger(logger);

try {
  await windowManager.create(config);
} catch (error) {
  errorLogger.logWindowError('main', 'create', error as Error);
  throw error;
}
```

### 2. Error Tracking

Implement error tracking and correlation:

```typescript
class ErrorTracker {
  private errorId = 0;
  private errors = new Map<number, ErrorRecord>();

  trackError(error: Error, context?: Record<string, any>): number {
    const id = ++this.errorId;
    const record: ErrorRecord = {
      id,
      timestamp: new Date(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context,
    };

    this.errors.set(id, record);

    // Log to logger
    logger.error('Error tracked', { errorId: id, ...record });

    return id;
  }

  getError(id: number): ErrorRecord | undefined {
    return this.errors.get(id);
  }

  getRecentErrors(count: number = 10): ErrorRecord[] {
    const allErrors = Array.from(this.errors.values());
    return allErrors.slice(-count);
  }

  clearOldErrors(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, record] of this.errors) {
      if (now - record.timestamp.getTime() > maxAge) {
        this.errors.delete(id);
      }
    }
  }
}

interface ErrorRecord {
  id: number;
  timestamp: Date;
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  context?: Record<string, any>;
}

// Usage example
const tracker = new ErrorTracker();

try {
  await someOperation();
} catch (error) {
  const errorId = tracker.trackError(error as Error, {
    operation: 'someOperation',
    userId: currentUser.id,
  });

  console.error(`Error tracked, ID: ${errorId}`);
}
```

## User-Friendly Error Messages

### 1. Error Message Mapping

Convert technical errors to user-friendly messages:

```typescript
class ErrorMessageMapper {
  private messages: Record<string, string> = {
    USER_NOT_FOUND: 'User not found',
    INVALID_CREDENTIALS: 'Invalid username or password',
    NETWORK_ERROR: 'Network connection failed, please check your network settings',
    DATABASE_ERROR: 'Failed to save data, please try again later',
    PERMISSION_DENIED: 'You do not have permission to perform this action',
    VALIDATION_ERROR: 'The input data is incorrect',
    TIMEOUT: 'Operation timed out, please retry',
  };

  getUserMessage(error: any): string {
    if (error.code && this.messages[error.code]) {
      return this.messages[error.code];
    }

    // Default message
    return 'Operation failed, please try again later';
  }

  getDetailedMessage(error: any): string {
    const userMessage = this.getUserMessage(error);

    if (error.details) {
      return `${userMessage}\nDetails: ${error.details}`;
    }

    return userMessage;
  }
}

// Usage example
const mapper = new ErrorMessageMapper();

try {
  await window.electronAPI.login(username, password);
} catch (error) {
  const message = mapper.getUserMessage(error);
  showNotification('error', message);
}
```

### 2. Error Notifications

Implement a unified error notification system:

```typescript
class ErrorNotifier {
  showError(error: any, options?: NotificationOptions): void {
    const message = this.getErrorMessage(error);

    // Show notification
    this.showNotification({
      type: 'error',
      title: 'Error',
      message,
      duration: options?.duration || 5000,
      actions: this.getErrorActions(error),
    });
  }

  private getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error.message) {
      return error.message;
    }

    return 'An unknown error occurred';
  }

  private getErrorActions(error: any): NotificationAction[] {
    const actions: NotificationAction[] = [
      {
        label: 'Close',
        onClick: () => this.dismissNotification(),
      },
    ];

    // For retryable errors, add retry button
    if (this.isRetryable(error)) {
      actions.unshift({
        label: 'Retry',
        onClick: () => this.retryLastOperation(),
      });
    }

    return actions;
  }

  private isRetryable(error: any): boolean {
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE'];
    return retryableCodes.includes(error.code);
  }

  private showNotification(options: NotificationOptions): void {
    // Implement notification display logic
  }

  private dismissNotification(): void {
    // Dismiss notification
  }

  private retryLastOperation(): void {
    // Retry last operation
  }
}

interface NotificationOptions {
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  onClick: () => void;
}
```

## Error Recovery Best Practices

### 1. Graceful Degradation

```typescript
class GracefulDegradation {
  async loadUserData(userId: string): Promise<UserData> {
    try {
      // Try to load from server
      return await this.loadFromServer(userId);
    } catch (error) {
      console.warn('Failed to load from server, trying cache:', error);

      try {
        // Try to load from cache
        return await this.loadFromCache(userId);
      } catch (cacheError) {
        console.warn('Failed to load from cache, using default data:', cacheError);

        // Return default data
        return this.getDefaultUserData();
      }
    }
  }

  private async loadFromServer(userId: string): Promise<UserData> {
    return await window.electronAPI.getUserData(userId);
  }

  private async loadFromCache(userId: string): Promise<UserData> {
    const cached = localStorage.getItem(`userData:${userId}`);
    if (!cached) {
      throw new Error('No cached data');
    }
    return JSON.parse(cached);
  }

  private getDefaultUserData(): UserData {
    return {
      id: 'unknown',
      name: 'Guest',
      preferences: {},
    };
  }
}
```

### 2. Transactional Operations

```typescript
class TransactionalOperation {
  async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    // Save original state
    const originalProfile = await this.getProfile(userId);

    try {
      // Execute updates
      await this.applyUpdates(userId, updates);

      // Validate updates
      await this.validateProfile(userId);

      // Commit changes
      await this.commitChanges(userId);
    } catch (error) {
      console.error('Update failed, rolling back changes:', error);

      // Rollback to original state
      await this.rollback(userId, originalProfile);

      throw error;
    }
  }

  private async getProfile(userId: string): Promise<UserProfile> {
    return await window.electronAPI.getUserProfile(userId);
  }

  private async applyUpdates(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    await window.electronAPI.updateUserProfile(userId, updates);
  }

  private async validateProfile(userId: string): Promise<void> {
    const profile = await this.getProfile(userId);
    if (!this.isValidProfile(profile)) {
      throw new Error('Profile validation failed');
    }
  }

  private isValidProfile(profile: UserProfile): boolean {
    return profile.name.length > 0 && profile.email.includes('@');
  }

  private async commitChanges(userId: string): Promise<void> {
    await window.electronAPI.commitProfileChanges(userId);
  }

  private async rollback(
    userId: string,
    originalProfile: UserProfile
  ): Promise<void> {
    await window.electronAPI.updateUserProfile(userId, originalProfile);
  }
}
```

### 3. Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  private readonly failureThreshold = 5;
  private readonly timeout = 60000; // 1 minute
  private readonly retryTimeout = 30000; // 30 seconds

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.retryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      // Success, reset counter
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
      }
      this.failureCount = 0;

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        console.warn('Circuit breaker opened due to repeated failures');
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

// Usage example
const breaker = new CircuitBreaker();

async function callExternalService(): Promise<Data> {
  return breaker.execute(() => window.electronAPI.fetchData());
}
```

## Error Handling Checklist

### Development Phase
- [ ] Add error handling for all async operations
- [ ] Use TypeScript strict mode to catch type errors
- [ ] Implement input validation and boundary checks
- [ ] Add detailed error logging
- [ ] Write unit tests for error scenarios

### Production Phase
- [ ] Implement global error handlers
- [ ] Set up error monitoring and reporting
- [ ] Provide user-friendly error messages
- [ ] Implement error recovery mechanisms
- [ ] Review error logs regularly

### User Experience
- [ ] Avoid showing technical error messages
- [ ] Provide clear action guidance
- [ ] Implement automatic retry mechanisms
- [ ] Save user data to prevent loss
- [ ] Provide error feedback channels

## Next Steps

- Check out [Debugging Guide](./debugging.md) for debugging techniques
- Check out [Performance Optimization Guide](./performance.md) for performance optimization
- Check out [Type Safety Guide](./type-safety.md) for type safety practices
