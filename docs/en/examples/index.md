# Examples

This section provides a series of practical examples to help you quickly understand and use the features of electron-infra-kit. Each example includes complete code and detailed explanations.

## Available Examples

### [Basic Setup](./basic-setup.md)

Learn how to configure an Electron application using electron-infra-kit from scratch. This example demonstrates the simplest project structure and configuration approach.

**Suitable for**:
- Getting started with electron-infra-kit
- Quickly building project prototypes
- Understanding basic initialization process

**Covers**:
- Main process initialization
- Preload script configuration
- Basic renderer process usage

---

### [Multi-Window Application](./multi-window.md)

Learn how to create and manage multiple windows, and how to communicate between windows. This example showcases the powerful features of WindowManager.

**Suitable for**:
- Developing multi-window applications (like IDEs, design tools)
- Managing complex window lifecycles
- Implementing data transfer between windows

**Covers**:
- Creating different types of windows
- Window state management
- Inter-window communication
- Window lifecycle hooks

---

### [IPC Communication](./ipc-communication.md)

Learn how to use IpcRouter to implement type-safe inter-process communication. This example shows how to define handlers, register routes, and invoke them from the renderer process.

**Suitable for**:
- Transferring data between main and renderer processes
- Implementing type-safe API calls
- Parameter validation and error handling

**Covers**:
- Defining IPC handlers
- Parameter validation (using Zod)
- Dependency injection
- Error handling
- Renderer process invocation

---

### [State Synchronization](./state-sync.md)

Learn how to use MessageBus to synchronize state across multiple windows. This example demonstrates how to implement cross-window data sharing and real-time updates.

**Suitable for**:
- Sharing state across multiple windows
- Implementing real-time data synchronization
- Managing global application state

**Covers**:
- Setting and getting shared data
- Watching data changes
- Permission control
- Cross-window state synchronization

---

### [Complete Application Example](./complete-app.md)

A complete application example that comprehensively uses all features of electron-infra-kit. This example shows how to organize code and use each module in a real project.

**Suitable for**:
- Needing a complete reference implementation
- Understanding best practices and code organization
- Learning how to integrate all features

**Covers**:
- Complete project structure
- Window management
- IPC communication
- State synchronization
- Configuration management
- Error handling
- Debug tools

---

## How to Use These Examples

1. **Read the code**: Each example contains complete, runnable code
2. **Understand concepts**: Understand the purpose of each feature through comments and explanations
3. **Practice**: Copy the code to your project and modify it
4. **Reference documentation**: Combine with [API Reference](/en/api/) to deeply understand each feature

## Need Help?

If you encounter problems using the examples:

- Check the [Getting Started Guide](/en/guide/getting-started.md)
- Read the [Core Concepts Documentation](/en/guide/core-concepts/window-manager.md)
- Visit [GitHub Issues](https://github.com/chunhaofen/electron-infra-kit/issues)
