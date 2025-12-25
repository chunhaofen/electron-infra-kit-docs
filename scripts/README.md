# 📜 Scripts 说明文档

本目录包含用于维护和验证文档质量的实用脚本。

## 📋 脚本列表

### 1. check-links.js - 链接验证器

**作用：** 检查文档中所有内部和外部链接的有效性

**功能：**
- ✅ 扫描所有 markdown 文件
- ✅ 提取所有链接（内部链接和外部链接）
- ✅ 验证内部链接指向的文件是否存在
- ✅ 检查外部链接的 URL 格式是否正确
- ✅ 生成详细的错误报告

**使用方法：**
```bash
# 直接运行
node scripts/check-links.js

# 或使用 npm 脚本
pnpm run check:links
```

**输出示例：**
```
🔍 Checking links in documentation...

Found 59 markdown files

📊 Statistics:
   Total links: 250
   Internal links: 230
   External links: 20

✅ No broken internal links found!
```

**何时使用：**
- 添加新页面后
- 修改链接后
- 重构文档结构后
- 提交 PR 前

---

### 2. check-consistency.js - 内容一致性检查器

**作用：** 验证中英文文档的结构一致性

**功能：**
- ✅ 比较中英文文件数量
- ✅ 检查标题层级是否匹配
- ✅ 验证代码块数量是否一致
- ✅ 检查 Mermaid 图表数量
- ✅ 验证图片数量
- ✅ 检查代码块是否正确闭合

**使用方法：**
```bash
# 直接运行
node scripts/check-consistency.js

# 或使用 npm 脚本
pnpm run check:consistency
```

**输出示例：**
```
🔍 Checking content consistency...

📊 Statistics:
   Chinese files: 29
   English files: 29

✅ No critical errors found!

⚠️  Found 2 warnings:
   examples\complete-app.md
   → Code block count mismatch: ZH has 10, EN has 5
```

**何时使用：**
- 更新文档内容后
- 添加代码示例后
- 翻译文档后
- 提交 PR 前

---

### 3. optimize-performance.js - 性能分析器

**作用：** 分析文档的性能指标和优化建议

**功能：**
- ✅ 检查图片大小（标记 > 500KB 的图片）
- ✅ 分析 markdown 文件大小
- ✅ 统计代码块数量和使用的语言
- ✅ 验证 VitePress 配置
- ✅ 估算构建输出大小
- ✅ 提供性能优化建议

**使用方法：**
```bash
# 直接运行
node scripts/optimize-performance.js

# 或使用 npm 脚本
pnpm run check:performance
```

**输出示例：**
```
🚀 Performance Optimization Check

📸 Checking image sizes...
   ℹ️  No images found

📄 Checking markdown file sizes...
   Found 59 markdown files, total size: 762.28 KB
   Average file size: 12.92 KB
   ✅ All markdown files are reasonably sized

💻 Analyzing code blocks...
   Total code blocks: 1768
   Languages used: typescript, bash, html, json, mermaid, vue, tsx
   ✅ Code highlighting is optimized by VitePress

💡 Performance Recommendations:
   1. Use WebP format for images when possible
   2. Enable image lazy loading in VitePress
   3. Keep markdown files under 100KB
   ...
```

**何时使用：**
- 添加大量图片后
- 文档变得很大时
- 构建时间变长时
- 定期性能审查

---

### 4. test-functionality.js - 功能测试器

**作用：** 测试 VitePress 文档站点的核心功能

**功能：**
- ✅ 验证配置文件存在且有效
- ✅ 检查语言配置（中英文）
- ✅ 验证导航结构
- ✅ 检查侧边栏配置
- ✅ 验证搜索配置
- ✅ 检查首页存在
- ✅ 验证指南页面
- ✅ 检查 API 页面
- ✅ 验证示例页面
- ✅ 检查响应式布局配置

**使用方法：**
```bash
# 直接运行
node scripts/test-functionality.js

# 或使用 npm 脚本
pnpm run test:functionality
```

**输出示例：**
```
🧪 Testing VitePress Documentation Functionality

Running tests...

📊 Test Results:

✅ Passed: 10
   - Config file exists
   - Language configuration (zh/en)
   - Navigation structure
   - Sidebar configuration
   - Search configuration
   - Home pages (zh/en)
   - Guide pages structure
   - API reference pages
   - Example pages
   - Responsive layout configuration

📈 Total: 10/10 tests passed

📝 Manual Testing Checklist:
Please verify the following manually in the browser:
  [ ] Search functionality works
  [ ] Language switching works
  [ ] Navigation links work correctly
  ...
```

**何时使用：**
- 修改配置后
- 重构项目结构后
- 添加新功能后
- 部署前验证

---

### 5. verify-build.js - 构建验证器

**作用：** 验证构建输出的完整性和正确性

**功能：**
- ✅ 检查构建目录是否存在
- ✅ 验证必要文件（index.html、404.html 等）
- ✅ 检查语言目录（zh/en）
- ✅ 验证首页生成
- ✅ 检查指南页面生成
- ✅ 验证 API 页面生成
- ✅ 检查示例页面生成
- ✅ 验证资源文件（JS、CSS）
- ✅ 计算构建大小
- ✅ 统计生成的 HTML 页面数量

**使用方法：**
```bash
# 先构建项目
pnpm run build

# 然后验证构建
node scripts/verify-build.js

# 或使用 npm 脚本
pnpm run verify:build
```

**输出示例：**
```
🔍 Verifying Build Output

Running verification checks...

📊 Verification Results:

✅ Passed (10):
   - Build output directory exists
   - Essential files exist
   - Language directories (zh/en)
   - Home pages (zh/en)
   - Guide pages structure
   - API reference pages
   - Example pages
   - Assets directory (119 JS, 1 CSS)
   - Build size: 16.49 MB
   - Total HTML pages: 60

📈 Summary: 10/10 checks passed

✨ Build verification complete! All checks passed.

💡 Next steps:
   - Run "pnpm run preview" to preview the build locally
   - Deploy to your hosting platform
```

**何时使用：**
- 构建后验证
- 部署前检查
- CI/CD 流程中
- 排查构建问题时

---

## 🔄 工作流建议

### 日常开发

```bash
# 1. 修改文档
# 2. 检查链接
pnpm run check:links

# 3. 检查一致性
pnpm run check:consistency
```

### 提交前检查

```bash
# 运行所有检查
pnpm run check:all
```

### 部署前验证

```bash
# 1. 构建
pnpm run build

# 2. 验证构建
pnpm run verify:build

# 3. 预览
pnpm run preview
```

### 定期维护

```bash
# 每周运行一次完整检查
pnpm run check:all
pnpm run check:performance
```

---

## 🛠️ 自定义脚本

如果需要添加新的检查脚本：

1. 在 `scripts/` 目录创建新的 `.js` 文件
2. 使用 ES6 模块语法（`import/export`）
3. 在 `package.json` 中添加对应的 npm 脚本
4. 更新本 README 文档

**模板：**
```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Running custom check...\n');

// 你的检查逻辑

console.log('✅ Check complete!\n');
process.exit(0);
```

---

## 📊 脚本对比

| 脚本 | 检查内容 | 运行时间 | 何时使用 |
|------|---------|---------|---------|
| check-links | 链接有效性 | ~2秒 | 修改链接后 |
| check-consistency | 中英文一致性 | ~1秒 | 更新内容后 |
| optimize-performance | 性能指标 | ~1秒 | 添加资源后 |
| test-functionality | 功能完整性 | ~1秒 | 修改配置后 |
| verify-build | 构建输出 | ~1秒 | 构建后 |

---

## 🐛 故障排除

### 脚本运行失败

**问题：** `Error: Cannot find module`

**解决：**
```bash
# 确保依赖已安装
pnpm install
```

---

### 链接检查误报

**问题：** 报告有效链接为无效

**原因：** 可能是相对路径问题

**解决：** 检查链接格式，确保使用正确的相对路径

---

### 一致性检查警告

**问题：** 中英文代码块数量不匹配

**原因：** 可能是有意的（不同详细程度）

**解决：** 如果是有意的差异，可以忽略警告

---

## 💡 最佳实践

1. **定期运行** - 每次修改后运行相关脚本
2. **CI 集成** - 在 CI/CD 中运行这些脚本
3. **提交前检查** - 使用 `check:all` 确保质量
4. **监控趋势** - 关注性能指标的变化
5. **及时修复** - 不要积累问题

---
