# API 参考

electron-infra-kit 提供了一套完整的 API 来管理 Electron 应用的窗口、进程间通信和状态同步。本节提供所有公开 API 的详细文档。

## 核心模块

### [WindowManager](./window-manager.md)

窗口生命周期管理器，提供窗口创建、管理和销毁的完整功能。

**主要功能：**
- 窗口创建和配置
- 窗口状态管理（显示、隐藏、最小化、最大化）
- 窗口分组管理
- 插件系统
- 性能监控

**常用方法：**
- `create()` - 创建新窗口
- `close()` - 关闭窗口
- `get()` / `find()` - 查找窗口
- `joinGroup()` / `leaveGroup()` - 窗口分组

### [IpcRouter](./ipc-router.md)

类型安全的进程间通信路由器，提供主进程和渲染进程之间的通信能力。

**主要功能：**
- 类型安全的 IPC 处理器
- 参数验证（Zod）
- 依赖注入
- 限流控制
- 性能监控

**常用方法：**
- `addHandler()` - 添加 IPC 处理器
- `handle()` - 处理 IPC 请求
- `addApi()` - 注入依赖

### [MessageBus](./message-bus.md)

跨窗口状态同步和消息传递系统。

**主要功能：**
- 跨窗口数据共享
- 实时数据同步
- 权限控制
- 事务支持
- 订阅/发布模式

**常用方法：**
- `setData()` - 设置数据
- `getData()` - 获取数据
- `watch()` - 监听数据变化
- `sendToWindow()` - 发送消息到指定窗口

### [LifecycleManager](./lifecycle.md)

应用生命周期管理器，协调各模块的启动和关闭。

**主要功能：**
- 模块初始化编排
- 优雅关闭
- 依赖管理

**常用方法：**
- `startup()` - 启动所有服务
- `shutdown()` - 关闭所有服务

## 基础设施模块

### [Logger](./logger.md)

日志记录系统，提供统一的日志接口。

**主要功能：**
- 多级别日志（info、warn、error、debug）
- 日志格式化
- 文件输出
- 共享日志实例

**常用方法：**
- `getSharedLogger()` - 获取共享日志实例
- `setSharedLogger()` - 设置共享日志实例

### [Config](./config.md)

配置管理系统，提供应用配置的读写和持久化。

**主要功能：**
- 配置读写
- 配置持久化
- 配置验证
- 默认值管理

### [Debug](./debug.md)

调试工具集，提供开发时的调试辅助功能。

**主要功能：**
- 调试模式控制
- 组件注册和查询
- 性能监控
- 增强调试助手

**常用方法：**
- `DebugHelper.enableDebugMode()` - 启用调试模式
- `DebugHelper.register()` - 注册组件
- `PerformanceMonitor` - 性能监控

## 预加载脚本 API

### [IpcRendererBridge](./preload.md#ipcrendererbridge)

渲染进程 IPC 桥接器，提供类型安全的 IPC 调用。

**主要功能：**
- 类型安全的 IPC 调用
- 自动错误处理
- Promise 支持

### [setupMessageBus](./preload.md#setupmessagebus)

渲染进程 MessageBus 设置函数。

**主要功能：**
- MessageBus 初始化
- 数据订阅
- 消息监听

## 类型定义

### [Types](./types.md)

所有公开的 TypeScript 类型定义。

**包含：**
- 窗口配置类型
- IPC 相关类型
- MessageBus 相关类型
- 事件类型
- 错误类型

## 快速导航

### 按使用场景

- **窗口管理**: [WindowManager](./window-manager.md)
- **进程通信**: [IpcRouter](./ipc-router.md) + [预加载脚本](./preload.md)
- **状态同步**: [MessageBus](./message-bus.md)
- **应用初始化**: [LifecycleManager](./lifecycle.md)
- **调试开发**: [Debug](./debug.md)

### 按进程

- **主进程**: WindowManager, IpcRouter, MessageBus, LifecycleManager
- **预加载脚本**: IpcRendererBridge, setupMessageBus
- **渲染进程**: 通过预加载脚本暴露的 API

## 版本兼容性

当前文档对应 electron-infra-kit v0.1.x 版本。

**依赖要求：**
- Electron >= 22.0.0
- TypeScript >= 5.0.0 (推荐)
- Node.js >= 16.0.0

## 下一步

- 查看 [快速开始指南](/guide/getting-started) 了解基本用法
- 查看 [示例](/examples/) 了解实际应用场景
- 查看 [最佳实践](/guide/best-practices) 了解推荐用法
