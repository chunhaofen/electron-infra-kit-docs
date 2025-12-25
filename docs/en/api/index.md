# API Reference

electron-infra-kit provides a complete set of APIs for managing Electron application windows, inter-process communication, and state synchronization. This section provides detailed documentation for all public APIs.

## Core Modules

### [WindowManager](./window-manager.md)

Window lifecycle manager providing complete functionality for window creation, management, and destruction.

**Key Features:**
- Window creation and configuration
- Window state management (show, hide, minimize, maximize)
- Window group management
- Plugin system
- Performance monitoring

**Common Methods:**
- `create()` - Create new window
- `close()` - Close window
- `get()` / `find()` - Find windows
- `joinGroup()` / `leaveGroup()` - Window grouping

### [IpcRouter](./ipc-router.md)

Type-safe inter-process communication router providing communication between main and renderer processes.

**Key Features:**
- Type-safe IPC handlers
- Parameter validation (Zod)
- Dependency injection
- Rate limiting
- Performance monitoring

**Common Methods:**
- `addHandler()` - Add IPC handler
- `handle()` - Handle IPC request
- `addApi()` - Inject dependencies

### [MessageBus](./message-bus.md)

Cross-window state synchronization and messaging system.

**Key Features:**
- Cross-window data sharing
- Real-time data synchronization
- Permission control
- Transaction support
- Pub/Sub pattern

**Common Methods:**
- `setData()` - Set data
- `getData()` - Get data
- `watch()` - Watch data changes
- `sendToWindow()` - Send message to specific window

### [LifecycleManager](./lifecycle.md)

Application lifecycle manager coordinating module startup and shutdown.

**Key Features:**
- Module initialization orchestration
- Graceful shutdown
- Dependency management

**Common Methods:**
- `startup()` - Start all services
- `shutdown()` - Shutdown all services

## Infrastructure Modules

### [Logger](./logger.md)

Logging system providing unified logging interface.

**Key Features:**
- Multi-level logging (info, warn, error, debug)
- Log formatting
- File output
- Shared logger instance

**Common Methods:**
- `getSharedLogger()` - Get shared logger instance
- `setSharedLogger()` - Set shared logger instance

### [Config](./config.md)

Configuration management system providing application configuration read/write and persistence.

**Key Features:**
- Configuration read/write
- Configuration persistence
- Configuration validation
- Default value management

### [Debug](./debug.md)

Debug toolkit providing development-time debugging assistance.

**Key Features:**
- Debug mode control
- Component registration and query
- Performance monitoring
- Enhanced debug helper

**Common Methods:**
- `DebugHelper.enableDebugMode()` - Enable debug mode
- `DebugHelper.register()` - Register component
- `PerformanceMonitor` - Performance monitoring

## Preload Script APIs

### [IpcRendererBridge](./preload.md#ipcrendererbridge)

Renderer process IPC bridge providing type-safe IPC calls.

**Key Features:**
- Type-safe IPC calls
- Automatic error handling
- Promise support

### [setupMessageBus](./preload.md#setupmessagebus)

Renderer process MessageBus setup function.

**Key Features:**
- MessageBus initialization
- Data subscription
- Message listening

## Type Definitions

### [Types](./types.md)

All public TypeScript type definitions.

**Includes:**
- Window configuration types
- IPC-related types
- MessageBus-related types
- Event types
- Error types

## Quick Navigation

### By Use Case

- **Window Management**: [WindowManager](./window-manager.md)
- **Process Communication**: [IpcRouter](./ipc-router.md) + [Preload Scripts](./preload.md)
- **State Synchronization**: [MessageBus](./message-bus.md)
- **App Initialization**: [LifecycleManager](./lifecycle.md)
- **Debug Development**: [Debug](./debug.md)

### By Process

- **Main Process**: WindowManager, IpcRouter, MessageBus, LifecycleManager
- **Preload Script**: IpcRendererBridge, setupMessageBus
- **Renderer Process**: APIs exposed through preload scripts

## Version Compatibility

Current documentation corresponds to electron-infra-kit v0.1.x.

**Requirements:**
- Electron >= 22.0.0
- TypeScript >= 5.0.0 (recommended)
- Node.js >= 16.0.0

## Next Steps

- Check [Getting Started Guide](/en/guide/getting-started) for basic usage
- Check [Examples](/en/examples/) for practical scenarios
- Check [Best Practices](/en/guide/best-practices) for recommended usage
