---
layout: home

hero:
  name: Electron Infra Kit
  text: 企业级 Electron 基础设施工具包
  tagline: 为 Electron 应用提供窗口管理、IPC 路由和状态同步能力
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 查看 GitHub
      link: https://github.com/chunhaofen/electron-infra-kit
    - theme: alt
      text: 在线示例
      link: https://github.com/chunhaofen/electron-infra-showcase

features:
  - icon: 🪟
    title: 窗口管理器
    details: 完整的窗口生命周期管理，支持状态持久化、插件系统和灵活的配置选项
    link: /guide/core-concepts/window-manager
  
  - icon: 🔌
    title: IPC 路由
    details: 类型安全的进程间通信，内置依赖注入和 Zod 参数验证，让 IPC 调用更可靠
    link: /guide/core-concepts/ipc-router
  
  - icon: 🌉
    title: 消息总线
    details: 基于 MessageChannel 的跨窗口状态同步，实现实时数据共享和响应式更新
    link: /guide/core-concepts/message-bus
  
  - icon: ⚙️
    title: 配置管理器
    details: 持久化配置管理，支持 Zod 验证和类型安全的配置读写
    link: /api/config
  
  - icon: 🐛
    title: 调试工具
    details: 内置性能监控和开发工具，帮助快速定位和解决问题
    link: /guide/advanced/debugging
  
  - icon: 📋
    title: 类型安全
    details: 完整的 TypeScript 支持，运行时验证确保类型安全
    link: /guide/advanced/type-safety
---

## 快速预览

只需几行代码，即可启动一个功能完整的 Electron 应用：

```typescript
import { app } from 'electron';
import { createElectronToolkit } from 'electron-infra-kit';

app.whenReady().then(async () => {
  // 初始化工具包
  const { windowManager, ipcRouter, messageBus } = createElectronToolkit({
    isDevelopment: process.env.NODE_ENV === 'development',
  });

  // 等待初始化完成
  await windowManager.ready();

  // 创建窗口
  await windowManager.create({
    name: 'main',
    title: '我的应用',
    width: 1024,
    height: 768,
  });
});
```

**就是这样！** 你现在拥有：

- ✅ 带状态持久化的窗口管理
- ✅ 类型安全的 IPC 通信
- ✅ 跨窗口状态同步
- ✅ 性能监控（开发模式）

## 核心特性详解

### 🪟 强大的窗口管理

```typescript
// 创建窗口
const window = await windowManager.create({
  name: 'editor',
  title: '代码编辑器',
  width: 1200,
  height: 800,
  // 自动保存窗口位置和大小
  saveState: true
});

// 窗口分组管理
await windowManager.joinGroup('editor', 'workspace-1');

// 批量操作
await windowManager.closeGroup('workspace-1');
```

### 🔌 类型安全的 IPC 通信

```typescript
// 定义处理器
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

// 注册处理器
ipcRouter.addHandler(saveFileHandler);

// 渲染进程调用（完全类型安全）
const result = await window.api.invoke('file:save', {
  path: '/path/to/file',
  content: 'Hello World'
});
```

### 🌉 实时状态同步

```typescript
// 主进程设置数据
await messageBus.setData('theme', { mode: 'dark', color: 'blue' });

// 所有窗口自动接收更新
messageBus.watch('theme', (theme) => {
  console.log('主题已更新:', theme);
  applyTheme(theme);
});
```

## 为什么选择 Electron Infra Kit？

<div class="vp-doc">

### 🎯 关注点分离

每个模块都有明确的职责，代码结构清晰，易于维护和扩展。窗口管理、进程通信、状态同步各司其职，互不干扰。

### 🔒 类型安全优先

完整的 TypeScript 支持，配合运行时验证，确保代码的可靠性。从编译时到运行时，全方位保障类型安全。

### ⚡ 性能优化

基于 MessageChannel 的通信机制，提供高效的跨窗口数据传输。相比传统的 IPC 通信，性能提升显著。

### 🔌 可扩展性

灵活的插件系统，支持自定义功能扩展。可以轻松添加自定义的窗口行为、IPC 处理器和消息总线中间件。

### 📦 开箱即用

零配置启动，提供合理的默认值。同时支持深度定制，满足各种复杂场景需求。

### 🛡️ 生产就绪

经过实际项目验证，稳定可靠。内置错误处理、日志记录和性能监控，助力快速定位问题。

</div>

## 适用场景

<div class="vp-doc">

### 💻 多窗口 IDE

适合构建代码编辑器、多面板开发工具等需要复杂窗口管理的应用。

**典型功能：**
- 多编辑器窗口
- 独立的调试面板
- 可拖拽的工具栏
- 窗口状态持久化

### 🎨 设计工具

适合画布、属性面板、工具栏分离的专业设计应用。

**典型功能：**
- 主画布窗口
- 浮动工具面板
- 实时预览窗口
- 跨窗口拖拽

### 👥 协作应用

适合需要实时状态同步的多用户、多窗口协作应用。

**典型功能：**
- 实时数据同步
- 多窗口协同编辑
- 状态广播
- 权限控制

### 🏢 企业应用

适合复杂工作流的大型企业级应用程序。

**典型功能：**
- 模块化架构
- 插件系统
- 配置管理
- 审计日志

</div>

## 技术亮点

<div class="vp-doc">

### 🔥 现代化技术栈

- **TypeScript** - 完整的类型支持
- **Zod** - 运行时类型验证
- **MessageChannel** - 高性能通信
- **依赖注入** - 灵活的架构设计

### 📊 性能指标

- **启动时间** - < 100ms
- **IPC 延迟** - < 1ms
- **内存占用** - 最小化设计
- **窗口创建** - 异步非阻塞

### 🧪 测试覆盖

- 单元测试覆盖率 > 90%
- 集成测试完整
- 端到端测试场景丰富
- 持续集成保障质量

</div>

## 社区与生态

<div class="vp-doc">

### 📚 丰富的文档

- [快速开始指南](/guide/getting-started) - 5 分钟上手
- [核心概念](/guide/core-concepts/window-manager) - 深入理解
- [API 参考](/api/) - 完整的 API 文档
- [实用示例](/examples/) - 真实场景案例

### 🎯 活跃的社区

- [GitHub Discussions](https://github.com/chunhaofen/electron-infra-kit/discussions) - 技术讨论
- [GitHub Issues](https://github.com/chunhaofen/electron-infra-kit/issues) - 问题反馈
- [在线示例](https://github.com/chunhaofen/electron-infra-showcase) - 完整示例项目

### 🔄 持续更新

- 定期发布新版本
- 及时修复问题
- 持续优化性能
- 积极响应社区反馈

</div>

## 快速开始

<div class="vp-doc" style="margin-top: 2rem;">

### 安装

```bash
npm install electron-infra-kit
# 或
pnpm add electron-infra-kit
# 或
yarn add electron-infra-kit
```

### 环境要求

- **Electron** >= 22.0.0
- **TypeScript** >= 5.0.0
- **Node.js** >= 18.0.0

### 下一步

1. 📖 阅读[快速开始指南](/guide/getting-started)
2. 🎯 查看[核心概念](/guide/core-concepts/window-manager)
3. 💡 浏览[示例代码](/examples/)
4. 🚀 开始构建你的应用

</div>

## 获取帮助

<div class="vp-doc">

遇到问题？我们随时为你提供帮助：

- 💬 [GitHub Discussions](https://github.com/chunhaofen/electron-infra-kit/discussions) - 提问和讨论
- 🐛 [GitHub Issues](https://github.com/chunhaofen/electron-infra-kit/issues) - 报告 Bug
- 📧 联系维护者 - 通过 GitHub 联系
- 📚 查看文档 - 大多数问题都能在文档中找到答案

</div>
