# Electron Infra Kit - Documentation

[![Deploy Status](https://github.com/chunhaofen/electron-infra-kit-docs/workflows/Deploy%20VitePress%20site%20to%20Pages/badge.svg)](https://github.com/chunhaofen/electron-infra-kit-docs/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Official documentation site for [electron-infra-kit](https://github.com/chunhaofen/electron-infra-kit) - A comprehensive infrastructure toolkit for Electron applications.

English | [简体中文](./README.zh-CN.md)

## 📚 Documentation

Visit the live documentation at: **[Your GitHub Pages URL]**

## 🌟 Features

- 📖 **Comprehensive Guides** - From getting started to advanced topics
- 🔍 **Full API Reference** - Complete API documentation with examples
- 💡 **Practical Examples** - Real-world usage examples
- 🌐 **Bilingual Support** - Available in Chinese (简体中文) and English
- 🔎 **Full-text Search** - Quickly find what you need
- 🎨 **Beautiful UI** - Clean and modern design with dark mode support

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/chunhaofen/electron-infra-kit-docs.git
cd electron-infra-kit-docs

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

Visit `http://localhost:5173` to view the documentation.

## 📦 Available Scripts

### Development

```bash
# Start development server with hot reload
pnpm run dev
```

### Build

```bash
# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

### Quality Checks

```bash
# Check all internal and external links
pnpm run check:links

# Check content consistency between languages
pnpm run check:consistency

# Analyze performance metrics
pnpm run check:performance

# Test core functionality
pnpm run test:functionality

# Verify build output
pnpm run verify:build

# Run all checks
pnpm run check:all
```

## 🏗️ Project Structure

```
electron-infra-kit-docs/
├── docs/                          # Documentation source files
│   ├── .vitepress/               # VitePress configuration
│   │   ├── config.ts             # Main config
│   │   ├── config/               # Language-specific configs
│   │   │   ├── zh.ts            # Chinese config
│   │   │   └── en.ts            # English config
│   │   └── theme/               # Custom theme
│   │       ├── index.ts         # Theme entry
│   │       ├── NotFound.vue     # Custom 404 page
│   │       └── custom.css       # Custom styles
│   ├── zh/                       # Chinese documentation
│   │   ├── guide/               # Guides
│   │   ├── api/                 # API reference
│   │   └── examples/            # Examples
│   └── en/                       # English documentation
│       ├── guide/               # Guides
│       ├── api/                 # API reference
│       └── examples/            # Examples
├── scripts/                      # Utility scripts
│   ├── check-links.js           # Link validation
│   ├── check-consistency.js     # Content consistency check
│   ├── optimize-performance.js  # Performance analysis
│   ├── test-functionality.js    # Functionality tests
│   └── verify-build.js          # Build verification
├── .github/                      # GitHub configuration
│   └── workflows/
│       └── deploy.yml           # Auto-deployment workflow
└── package.json                  # Project configuration
```

## 🔧 Configuration

### Base URL

If deploying to a subdirectory, update the `base` in `docs/.vitepress/config.ts`:

```typescript
export default defineConfig({
  base: '/your-repo-name/', // e.g., '/electron-infra-kit-docs/'
  // ...
})
```

### GitHub Pages

1. Go to your repository settings
2. Navigate to Pages section
3. Set Source to "GitHub Actions"
4. Push to main branch to trigger deployment

### Custom Domain

To use a custom domain:

1. Add a `CNAME` file in `docs/public/` with your domain
2. Configure DNS settings with your domain provider
3. Update `base` in config to `/`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Documentation Guidelines

1. **Language Consistency**: Ensure both Chinese and English versions are updated
2. **Code Examples**: All code examples should be tested and working
3. **Links**: Use relative links for internal pages
4. **Style**: Follow the existing documentation style and structure

### Adding New Pages

1. Create markdown files in both `docs/zh/` and `docs/en/` directories
2. Update navigation in `docs/.vitepress/config/zh.ts` and `en.ts`
3. Run `pnpm run check:links` to verify all links work
4. Run `pnpm run check:consistency` to ensure structure matches

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details

## 🔗 Links

- **Main Project**: [electron-infra-kit](https://github.com/chunhaofen/electron-infra-kit)
- **Live Demo**: [electron-infra-showcase](https://github.com/chunhaofen/electron-infra-showcase)
- **npm Package**: [@electron-infra-kit](https://www.npmjs.com/package/electron-infra-kit)
- **Documentation**: [Your GitHub Pages URL]

## 💬 Support

- 📫 Issues: [GitHub Issues](https://github.com/chunhaofen/electron-infra-kit/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/chunhaofen/electron-infra-kit/discussions)

## 🙏 Acknowledgments

Built with:
- [VitePress](https://vitepress.dev/) - Static site generator
- [Vue 3](https://vuejs.org/) - Progressive JavaScript framework
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript

---

Made with ❤️ by [chunhaofen](https://github.com/chunhaofen)
