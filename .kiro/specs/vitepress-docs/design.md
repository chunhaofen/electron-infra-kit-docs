# Design Document

## Overview

本设计文档描述了为 electron-infra-kit 创建 VitePress 文档网站的技术方案。该文档网站将采用 VitePress 作为静态站点生成器，提供清晰、易用的中英文双语文档，帮助开发者快速上手和深入使用 electron-infra-kit 工具包。

文档网站将包含以下核心内容：
- 项目介绍和特性展示
- 快速开始指南
- 核心模块详细文档（Window Manager、IPC Router、Message Bus）
- 完整的 API 参考
- 实用示例和最佳实践
- 中英文双语支持

## Architecture

### 整体架构

```
electron-infra-kit-VitePress/
├── docs/                          # 文档源文件
│   ├── .vitepress/                # VitePress 配置
│   │   ├── config.ts              # 主配置文件
│   │   ├── config/                # 配置模块
│   │   │   ├── zh.ts              # 中文配置
│   │   │   └── en.ts              # 英文配置
│   │   └── theme/                 # 自定义主题
│   │       └── index.ts           # 主题入口
│   ├── en/                        # 英文文档
│   │   ├── index.md               # 英文首页
│   │   ├── guide/                 # 指南
│   │   ├── api/                   # API 参考
│   │   └── examples/              # 示例
│   ├── zh/                        # 中文文档
│   │   ├── index.md               # 中文首页
│   │   ├── guide/                 # 指南
│   │   ├── api/                   # API 参考
│   │   └── examples/              # 示例
│   └── public/                    # 静态资源
├── package.json                   # 项目配置
└── pnpm-lock.yaml                 # 依赖锁定
```

### 技术栈

- **VitePress**: 静态站点生成器（最新稳定版）
- **Vue 3**: VitePress 底层框架
- **TypeScript**: 配置文件类型支持
- **Markdown**: 文档编写格式
- **Mermaid**: 图表渲染支持

## Components and Interfaces

### 1. VitePress 配置模块

#### 主配置文件 (config.ts)

```typescript
interface SiteConfig {
  title: string;
  description: string;
  lang: string;
  themeConfig: ThemeConfig;
  locales: LocaleConfig;
  markdown: MarkdownConfig;
}
```

**职责**：
- 定义站点的全局配置
- 配置多语言支持
- 配置主题和导航
- 配置 Markdown 扩展

#### 语言配置模块 (zh.ts / en.ts)

```typescript
interface LocaleConfig {
  label: string;
  lang: string;
  link: string;
  themeConfig: {
    nav: NavItem[];
    sidebar: SidebarConfig;
    footer: FooterConfig;
  };
}
```

**职责**：
- 定义特定语言的导航结构
- 配置侧边栏菜单
- 配置页脚信息

### 2. 文档内容模块

#### 首页组件

**文件**: `index.md`

**内容结构**：
- Hero 区域：项目标题、描述、快速开始按钮
- Features 区域：核心特性展示（6-8个特性卡片）
- 快速预览：代码示例展示

#### 指南模块

**目录结构**：
```
guide/
├── introduction.md          # 项目介绍
├── getting-started.md       # 快速开始
├── core-concepts/           # 核心概念
│   ├── window-manager.md    # 窗口管理器
│   ├── ipc-router.md        # IPC 路由
│   ├── message-bus.md       # 消息总线
│   └── lifecycle.md         # 生命周期管理
├── advanced/                # 进阶主题
│   ├── type-safety.md       # 类型安全
│   ├── performance.md       # 性能优化
│   ├── error-handling.md    # 错误处理
│   └── debugging.md         # 调试技巧
└── best-practices.md        # 最佳实践
```

#### API 参考模块

**目录结构**：
```
api/
├── index.md                 # API 概览
├── window-manager.md        # WindowManager API
├── ipc-router.md            # IpcRouter API
├── message-bus.md           # MessageBus API
├── lifecycle.md             # LifecycleManager API
├── config.md                # Config API
├── logger.md                # Logger API
├── debug.md                 # Debug API
└── types.md                 # 类型定义
```

#### 示例模块

**目录结构**：
```
examples/
├── index.md                 # 示例概览
├── basic-setup.md           # 基础配置
├── multi-window.md          # 多窗口应用
├── ipc-communication.md     # IPC 通信
├── state-sync.md            # 状态同步
└── complete-app.md          # 完整应用示例
```

### 3. 导航结构

#### 顶部导航

```typescript
const nav: NavItem[] = [
  { text: '指南', link: '/guide/introduction' },
  { text: 'API 参考', link: '/api/' },
  { text: '示例', link: '/examples/' },
  {
    text: '链接',
    items: [
      { text: 'GitHub', link: 'https://github.com/chunhaofen/electron-infra-kit' },
      { text: 'npm', link: 'https://www.npmjs.com/package/electron-infra-kit' },
      { text: '更新日志', link: '/changelog' },
    ],
  },
];
```

#### 侧边栏导航

```typescript
const sidebar: SidebarConfig = {
  '/guide/': [
    {
      text: '开始',
      items: [
        { text: '介绍', link: '/guide/introduction' },
        { text: '快速开始', link: '/guide/getting-started' },
      ],
    },
    {
      text: '核心概念',
      items: [
        { text: '窗口管理器', link: '/guide/core-concepts/window-manager' },
        { text: 'IPC 路由', link: '/guide/core-concepts/ipc-router' },
        { text: '消息总线', link: '/guide/core-concepts/message-bus' },
        { text: '生命周期管理', link: '/guide/core-concepts/lifecycle' },
      ],
    },
    {
      text: '进阶主题',
      items: [
        { text: '类型安全', link: '/guide/advanced/type-safety' },
        { text: '性能优化', link: '/guide/advanced/performance' },
        { text: '错误处理', link: '/guide/advanced/error-handling' },
        { text: '调试技巧', link: '/guide/advanced/debugging' },
      ],
    },
  ],
  '/api/': [
    {
      text: 'API 参考',
      items: [
        { text: '概览', link: '/api/' },
        { text: 'WindowManager', link: '/api/window-manager' },
        { text: 'IpcRouter', link: '/api/ipc-router' },
        { text: 'MessageBus', link: '/api/message-bus' },
        { text: 'LifecycleManager', link: '/api/lifecycle' },
        { text: 'Config', link: '/api/config' },
        { text: 'Logger', link: '/api/logger' },
        { text: 'Debug', link: '/api/debug' },
        { text: '类型定义', link: '/api/types' },
      ],
    },
  ],
  '/examples/': [
    {
      text: '示例',
      items: [
        { text: '概览', link: '/examples/' },
        { text: '基础配置', link: '/examples/basic-setup' },
        { text: '多窗口应用', link: '/examples/multi-window' },
        { text: 'IPC 通信', link: '/examples/ipc-communication' },
        { text: '状态同步', link: '/examples/state-sync' },
        { text: '完整应用', link: '/examples/complete-app' },
      ],
    },
  ],
};
```

## Data Models

### 配置数据模型

```typescript
// VitePress 站点配置
interface VitePressConfig {
  title: string;
  description: string;
  base: string;
  lang: string;
  head: HeadConfig[];
  themeConfig: ThemeConfig;
  locales: Record<string, LocaleConfig>;
  markdown: MarkdownOptions;
}

// 主题配置
interface ThemeConfig {
  logo: string;
  nav: NavItem[];
  sidebar: SidebarConfig;
  socialLinks: SocialLink[];
  footer: FooterConfig;
  search: SearchOptions;
  editLink: EditLinkConfig;
}

// 导航项
interface NavItem {
  text: string;
  link?: string;
  items?: NavItem[];
  activeMatch?: string;
}

// 侧边栏配置
type SidebarConfig = Record<string, SidebarGroup[]>;

interface SidebarGroup {
  text: string;
  items: SidebarItem[];
  collapsed?: boolean;
}

interface SidebarItem {
  text: string;
  link: string;
}

// 搜索配置
interface SearchOptions {
  provider: 'local' | 'algolia';
  options?: LocalSearchOptions | AlgoliaSearchOptions;
}

// 社交链接
interface SocialLink {
  icon: string;
  link: string;
}
```

### 文档内容模型

```typescript
// Markdown 文档前置元数据
interface FrontMatter {
  title: string;
  description?: string;
  layout?: 'home' | 'doc' | 'page';
  hero?: HeroConfig;
  features?: FeatureConfig[];
  sidebar?: boolean;
  outline?: number | [number, number] | 'deep' | false;
}

// 首页 Hero 配置
interface HeroConfig {
  name: string;
  text: string;
  tagline: string;
  image?: string | { src: string; alt: string };
  actions: ActionConfig[];
}

interface ActionConfig {
  theme: 'brand' | 'alt';
  text: string;
  link: string;
}

// 特性配置
interface FeatureConfig {
  icon: string;
  title: string;
  details: string;
  link?: string;
}
```

## Data Models

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 双语内容一致性

*For any* 文档页面，中文版本和英文版本应该包含相同的信息结构和内容要点，只是语言不同。

**Validates: Requirements 6.2**

### Property 2: 导航链接有效性

*For any* 导航链接（包括顶部导航、侧边栏、页面内链接），点击后应该能够正确跳转到对应的文档页面，不应出现 404 错误。

**Validates: Requirements 2.2, 3.4**

### Property 3: 代码示例可执行性

*For any* 文档中的代码示例，应该是语法正确且可以在对应的环境中执行的完整代码片段。

**Validates: Requirements 8.1**

### Property 4: API 文档完整性

*For any* electron-infra-kit 导出的公开 API，应该在 API 参考文档中有对应的说明，包括参数、返回值和使用示例。

**Validates: Requirements 5.1, 5.2**

### Property 5: 搜索结果准确性

*For any* 搜索关键词，返回的搜索结果应该包含该关键词，并且结果应该按相关性排序。

**Validates: Requirements 7.2, 7.3**

### Property 6: 语言切换状态保持

*For any* 文档页面，当用户切换语言时，应该跳转到相同内容的另一语言版本，而不是跳转到首页。

**Validates: Requirements 6.1**

## Error Handling

### 1. 构建错误处理

**场景**: VitePress 构建过程中的错误

**处理策略**：
- 配置文件语法错误：提供清晰的错误信息和行号
- Markdown 解析错误：标识出错的文件和位置
- 链接检查错误：列出所有无效链接

### 2. 开发服务器错误

**场景**: 本地开发时的热重载错误

**处理策略**：
- 文件监听错误：自动重试或提示用户手动刷新
- 端口占用：自动尝试其他端口或提示用户
- 模块加载错误：显示详细的错误堆栈

### 3. 内容错误处理

**场景**: 文档内容相关的错误

**处理策略**：
- 缺失的图片：显示占位符和错误提示
- 无效的内部链接：在构建时警告
- 代码块语法错误：高亮显示但不中断构建

### 4. 用户体验错误

**场景**: 用户访问时的错误

**处理策略**：
- 404 页面：提供友好的错误页面和返回首页的链接
- 搜索无结果：提供搜索建议或热门文档链接
- 加载失败：提供重试按钮

## Testing Strategy

### 单元测试

由于这是一个文档项目，传统的单元测试不太适用。但我们可以进行以下验证：

1. **配置验证测试**
   - 验证 VitePress 配置文件的语法正确性
   - 验证导航和侧边栏配置的结构完整性

2. **链接验证测试**
   - 检查所有内部链接的有效性
   - 检查外部链接的可访问性

3. **Markdown 语法测试**
   - 验证所有 Markdown 文件的语法正确性
   - 检查代码块的语言标识符

### 集成测试

1. **构建测试**
   - 验证项目可以成功构建
   - 检查构建输出的完整性

2. **多语言测试**
   - 验证中英文切换功能
   - 检查语言特定的内容是否正确显示

3. **搜索功能测试**
   - 验证搜索索引的生成
   - 测试搜索结果的准确性

### 手动测试清单

1. **视觉测试**
   - 检查页面布局和样式
   - 验证响应式设计在不同设备上的表现
   - 检查代码高亮和图表渲染

2. **功能测试**
   - 测试所有导航链接
   - 测试搜索功能
   - 测试语言切换
   - 测试代码复制功能

3. **内容测试**
   - 检查文档内容的准确性
   - 验证代码示例的正确性
   - 检查图表和图片的显示

### 自动化检查

使用以下工具进行自动化检查：

1. **Markdown Linter**: 检查 Markdown 语法和风格
2. **Link Checker**: 自动检查链接有效性
3. **Spell Checker**: 检查拼写错误
4. **Build CI**: 在 CI/CD 中自动构建和部署

## Implementation Notes

### 1. 项目初始化

使用 pnpm 初始化 VitePress 项目：

```bash
cd electron-infra-kit-VitePress
pnpm init
pnpm add -D vitepress vue
```

### 2. 目录结构创建

创建标准的 VitePress 目录结构，包括中英文文档目录。

### 3. 配置文件编写

- 主配置文件：定义全局设置
- 语言配置：分别配置中英文导航和侧边栏
- 主题配置：自定义样式和组件

### 4. 内容迁移

从 electron-infra-kit 项目中迁移现有文档：
- README.md → index.md (首页)
- QUICKSTART.md → guide/getting-started.md
- guides/ → guide/ (重新组织结构)

### 5. 文档编写

按照设计的结构编写新的文档内容：
- 核心概念详细说明
- API 参考文档
- 实用示例和最佳实践

### 6. 样式定制

根据 electron-infra-kit 的品牌风格定制主题：
- 颜色方案
- 字体选择
- 组件样式

### 7. 搜索配置

配置本地搜索或 Algolia 搜索：
- 设置搜索索引
- 配置搜索选项
- 优化搜索体验

### 8. 部署配置

配置自动部署：
- GitHub Pages
- Vercel
- Netlify

## Performance Considerations

### 1. 构建性能

- 使用 Vite 的快速构建能力
- 合理组织文档结构，避免过深的嵌套
- 优化图片大小和格式

### 2. 加载性能

- 启用代码分割
- 使用懒加载加载图片
- 压缩静态资源

### 3. 搜索性能

- 使用本地搜索以减少外部依赖
- 优化搜索索引大小
- 实现搜索结果缓存

### 4. 用户体验

- 实现快速的页面切换
- 优化首屏加载时间
- 提供加载状态反馈

## Accessibility

### 1. 语义化 HTML

- 使用正确的标题层级
- 提供有意义的链接文本
- 使用语义化的 HTML 标签

### 2. 键盘导航

- 确保所有交互元素可以通过键盘访问
- 提供清晰的焦点指示器
- 支持快捷键导航

### 3. 屏幕阅读器支持

- 提供替代文本
- 使用 ARIA 标签
- 确保内容的逻辑顺序

### 4. 颜色对比度

- 确保文本和背景有足够的对比度
- 不仅依赖颜色传达信息
- 提供暗色模式支持

## Maintenance and Updates

### 1. 文档更新流程

- 跟踪 electron-infra-kit 的版本更新
- 及时更新 API 文档
- 添加新功能的使用指南

### 2. 内容审查

- 定期审查文档的准确性
- 更新过时的信息
- 改进不清晰的说明

### 3. 用户反馈

- 提供反馈渠道
- 收集用户建议
- 根据反馈改进文档

### 4. 版本管理

- 为不同版本的 electron-infra-kit 维护对应的文档
- 提供版本切换功能
- 保留历史版本的文档
