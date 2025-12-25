# Electron Infra Kit - 文档站点

[![部署状态](https://github.com/chunhaofen/electron-infra-kit-docs/workflows/Deploy%20VitePress%20site%20to%20Pages/badge.svg)](https://github.com/chunhaofen/electron-infra-kit-docs/actions)
[![许可证: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[electron-infra-kit](https://github.com/chunhaofen/electron-infra-kit) 的官方文档站点 - 为 Electron 应用提供全面的基础设施工具包。

[English](./README.md) | 简体中文

## 📚 文档

访问在线文档：**[您的 GitHub Pages URL]**

## 🌟 特性

- 📖 **全面的指南** - 从入门到进阶主题
- 🔍 **完整的 API 参考** - 包含示例的完整 API 文档
- 💡 **实用示例** - 真实场景的使用案例
- 🌐 **双语支持** - 提供简体中文和英文版本
- 🔎 **全文搜索** - 快速找到所需内容
- 🎨 **精美界面** - 简洁现代的设计，支持暗色模式

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装

```bash
# 克隆仓库
git clone https://github.com/chunhaofen/electron-infra-kit-docs.git
cd electron-infra-kit-docs

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

访问 `http://localhost:5173` 查看文档。

## 📦 可用脚本

### 开发

```bash
# 启动开发服务器（支持热重载）
pnpm run dev
```

### 构建

```bash
# 构建生产版本
pnpm run build

# 预览生产构建
pnpm run preview
```

### 质量检查

```bash
# 检查所有内部和外部链接
pnpm run check:links

# 检查中英文内容一致性
pnpm run check:consistency

# 分析性能指标
pnpm run check:performance

# 测试核心功能
pnpm run test:functionality

# 验证构建输出
pnpm run verify:build

# 运行所有检查
pnpm run check:all
```

## 🏗️ 项目结构

```
electron-infra-kit-docs/
├── docs/                          # 文档源文件
│   ├── .vitepress/               # VitePress 配置
│   │   ├── config.ts             # 主配置文件
│   │   ├── config/               # 语言特定配置
│   │   │   ├── zh.ts            # 中文配置
│   │   │   └── en.ts            # 英文配置
│   │   └── theme/               # 自定义主题
│   │       ├── index.ts         # 主题入口
│   │       ├── NotFound.vue     # 自定义 404 页面
│   │       └── custom.css       # 自定义样式
│   ├── zh/                       # 中文文档
│   │   ├── guide/               # 指南
│   │   ├── api/                 # API 参考
│   │   └── examples/            # 示例
│   └── en/                       # 英文文档
│       ├── guide/               # 指南
│       ├── api/                 # API 参考
│       └── examples/            # 示例
├── scripts/                      # 实用脚本
│   ├── check-links.js           # 链接验证
│   ├── check-consistency.js     # 内容一致性检查
│   ├── optimize-performance.js  # 性能分析
│   ├── test-functionality.js    # 功能测试
│   └── verify-build.js          # 构建验证
├── .github/                      # GitHub 配置
│   └── workflows/
│       └── deploy.yml           # 自动部署工作流
└── package.json                  # 项目配置
```

## 🔧 配置

### Base URL

如果部署到子目录，需要更新 `docs/.vitepress/config.ts` 中的 `base`：

```typescript
export default defineConfig({
  base: '/your-repo-name/', // 例如：'/electron-infra-kit-docs/'
  // ...
})
```

### GitHub Pages

1. 进入仓库设置
2. 导航到 Pages 部分
3. 将 Source 设置为 "GitHub Actions"
4. 推送到 main 分支触发部署

### 自定义域名

使用自定义域名：

1. 在 `docs/public/` 中添加包含域名的 `CNAME` 文件
2. 在域名提供商处配置 DNS 设置
3. 将配置中的 `base` 更新为 `/`

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

### 文档指南

1. **语言一致性**：确保中英文版本都已更新
2. **代码示例**：所有代码示例都应经过测试且可运行
3. **链接**：内部页面使用相对链接
4. **风格**：遵循现有的文档风格和结构

### 添加新页面

1. 在 `docs/zh/` 和 `docs/en/` 目录中创建 markdown 文件
2. 在 `docs/.vitepress/config/zh.ts` 和 `en.ts` 中更新导航
3. 运行 `pnpm run check:links` 验证所有链接
4. 运行 `pnpm run check:consistency` 确保结构匹配

## 📝 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- **主项目**：[electron-infra-kit](https://github.com/chunhaofen/electron-infra-kit)
- **在线示例**：[electron-infra-showcase](https://github.com/chunhaofen/electron-infra-showcase)
- **npm 包**：[@electron-infra-kit](https://www.npmjs.com/package/electron-infra-kit)
- **文档站点**：[您的 GitHub Pages URL]

## 💬 支持

- 📫 问题反馈：[GitHub Issues](https://github.com/chunhaofen/electron-infra-kit/issues)
- 💬 讨论交流：[GitHub Discussions](https://github.com/chunhaofen/electron-infra-kit/discussions)

## 🙏 致谢

构建工具：
- [VitePress](https://vitepress.dev/) - 静态站点生成器
- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型化的 JavaScript

---

用 ❤️ 制作，作者 [chunhaofen](https://github.com/chunhaofen)
