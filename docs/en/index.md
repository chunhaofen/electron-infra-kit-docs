---
layout: home

hero:
  name: Electron Infra Kit
  text: Enterprise-Grade Electron Infrastructure
  tagline: Comprehensive infrastructure for Electron applications with window management, IPC routing, and state synchronization
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/chunhaofen/electron-infra-kit
    - theme: alt
      text: Live Demo
      link: https://github.com/chunhaofen/electron-infra-showcase

features:
  - icon: 🪟
    title: Window Manager
    details: Complete window lifecycle management with state persistence, plugin system, and flexible configuration options
    link: /en/guide/core-concepts/window-manager
  
  - icon: 🔌
    title: IPC Router
    details: Type-safe inter-process communication with built-in dependency injection and Zod parameter validation
    link: /en/guide/core-concepts/ipc-router
  
  - icon: 🌉
    title: Message Bus
    details: MessageChannel-based cross-window state synchronization for real-time data sharing and reactive updates
    link: /en/guide/core-concepts/message-bus
  
  - icon: ⚙️
    title: Config Manager
    details: Persistent configuration management with Zod validation and type-safe configuration read/write
    link: /en/api/config
  
  - icon: 🐛
    title: Debug Tools
    details: Built-in performance monitoring and development tools to quickly identify and resolve issues
    link: /en/guide/advanced/debugging
  
  - icon: 📋
    title: Type Safety
    details: Full TypeScript support with runtime validation ensuring type safety throughout
    link: /en/guide/advanced/type-safety
---

## Quick Preview

Launch a fully functional Electron application with just a few lines of code:

```typescript
import { app } from 'electron';
import { createElectronToolkit } from 'electron-infra-kit';

app.whenReady().then(async () => {
  // Initialize the toolkit
  const { windowManager, ipcRouter, messageBus } = createElectronToolkit({
    isDevelopment: process.env.NODE_ENV === 'development',
  });

  // Wait for initialization
  await windowManager.ready();

  // Create a window
  await windowManager.create({
    name: 'main',
    title: 'My Application',
    width: 1024,
    height: 768,
  });
});
```

**That's it!** You now have:

- ✅ Window management with state persistence
- ✅ Type-safe IPC communication
- ✅ Cross-window state synchronization
- ✅ Performance monitoring (development mode)

## Core Features in Detail

### 🪟 Powerful Window Management

```typescript
// Create windows
const window = await windowManager.create({
  name: 'editor',
  title: 'Code Editor',
  width: 1200,
  height: 800,
  // Automatically save window position and size
  saveState: true
});

// Window grouping
await windowManager.joinGroup('editor', 'workspace-1');

// Batch operations
await windowManager.closeGroup('workspace-1');
```

### 🔌 Type-Safe IPC Communication

```typescript
// Define handler
const saveFileHandler = new IpcHandler({
  channel: 'file:save',
  schema: z.object({
    path: z.string(),
    content: z.string()
  }),
  handler: async ({ path, content }) => {
    await fs.writeFile(path, content);
    return { success: true };
  }
});

// Register handler
ipcRouter.addHandler(saveFileHandler);

// Renderer process invocation (fully type-safe)
const result = await window.api.invoke('file:save', {
  path: '/path/to/file',
  content: 'Hello World'
});
```

### 🌉 Real-time State Synchronization

```typescript
// Main process sets data
await messageBus.setData('theme', { mode: 'dark', color: 'blue' });

// All windows automatically receive updates
messageBus.watch('theme', (theme) => {
  console.log('Theme updated:', theme);
  applyTheme(theme);
});
```

## Why Choose Electron Infra Kit?

<div class="vp-doc">

### 🎯 Separation of Concerns

Each module has a clear responsibility, with clean code structure that's easy to maintain and extend. Window management, process communication, and state synchronization each handle their own domain without interference.

### 🔒 Type Safety First

Complete TypeScript support combined with runtime validation ensures code reliability. From compile-time to runtime, comprehensive type safety guarantees.

### ⚡ Performance Optimized

MessageChannel-based communication mechanism provides efficient cross-window data transfer. Significant performance improvements compared to traditional IPC communication.

### 🔌 Extensibility

Flexible plugin system supporting custom functionality extensions. Easily add custom window behaviors, IPC handlers, and message bus middleware.

### 📦 Ready to Use

Zero-configuration startup with sensible defaults. Also supports deep customization to meet various complex scenario requirements.

### 🛡️ Production Ready

Validated in real projects, stable and reliable. Built-in error handling, logging, and performance monitoring help quickly identify issues.

</div>

## Use Cases

<div class="vp-doc">

### 💻 Multi-Window IDEs

Perfect for building code editors, multi-panel development tools requiring complex window management.

**Typical Features:**
- Multiple editor windows
- Independent debug panels
- Draggable toolbars
- Window state persistence

### 🎨 Design Tools

Ideal for professional design applications with separated canvas, property panels, and toolbars.

**Typical Features:**
- Main canvas window
- Floating tool panels
- Real-time preview windows
- Cross-window drag and drop

### 👥 Collaborative Applications

Suitable for multi-user, multi-window collaborative applications requiring real-time state synchronization.

**Typical Features:**
- Real-time data sync
- Multi-window collaborative editing
- State broadcasting
- Permission control

### 🏢 Enterprise Applications

Perfect for large-scale enterprise applications with complex workflows.

**Typical Features:**
- Modular architecture
- Plugin system
- Configuration management
- Audit logging

</div>

## Technical Highlights

<div class="vp-doc">

### 🔥 Modern Tech Stack

- **TypeScript** - Complete type support
- **Zod** - Runtime type validation
- **MessageChannel** - High-performance communication
- **Dependency Injection** - Flexible architecture design

### 📊 Performance Metrics

- **Startup Time** - < 100ms
- **IPC Latency** - < 1ms
- **Memory Footprint** - Minimized design
- **Window Creation** - Async non-blocking

### 🧪 Test Coverage

- Unit test coverage > 90%
- Complete integration tests
- Rich end-to-end test scenarios
- Continuous integration quality assurance

</div>

## Community & Ecosystem

<div class="vp-doc">

### 📚 Rich Documentation

- [Getting Started Guide](/en/guide/getting-started) - Get up and running in 5 minutes
- [Core Concepts](/en/guide/core-concepts/window-manager) - Deep understanding
- [API Reference](/en/api/) - Complete API documentation
- [Practical Examples](/en/examples/) - Real-world use cases

### 🎯 Active Community

- [GitHub Discussions](https://github.com/chunhaofen/electron-infra-kit/discussions) - Technical discussions
- [GitHub Issues](https://github.com/chunhaofen/electron-infra-kit/issues) - Bug reports
- [Live Demo](https://github.com/chunhaofen/electron-infra-showcase) - Complete example project

### 🔄 Continuous Updates

- Regular new releases
- Timely bug fixes
- Continuous performance optimization
- Active community feedback response

</div>

## Getting Started

<div class="vp-doc" style="margin-top: 2rem;">

### Installation

```bash
npm install electron-infra-kit
# or
pnpm add electron-infra-kit
# or
yarn add electron-infra-kit
```

### Requirements

- **Electron** >= 22.0.0
- **TypeScript** >= 5.0.0
- **Node.js** >= 18.0.0

### Next Steps

1. 📖 Read the [Getting Started Guide](/en/guide/getting-started)
2. 🎯 Check out [Core Concepts](/en/guide/core-concepts/window-manager)
3. 💡 Browse [Example Code](/en/examples/)
4. 🚀 Start building your application

</div>

## Get Help

<div class="vp-doc">

Need help? We're here for you:

- 💬 [GitHub Discussions](https://github.com/chunhaofen/electron-infra-kit/discussions) - Ask questions and discuss
- 🐛 [GitHub Issues](https://github.com/chunhaofen/electron-infra-kit/issues) - Report bugs
- 📧 Contact maintainers - Reach out via GitHub
- 📚 Check the docs - Most questions can be answered in the documentation

</div>
