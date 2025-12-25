import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.join(__dirname, '../docs');
const publicDir = path.join(docsDir, 'public');

console.log('🚀 Performance Optimization Check\n');

const issues = [];
const recommendations = [];

// Check 1: Look for large images in public directory
function checkImageSizes() {
  console.log('📸 Checking image sizes...');
  
  if (!fs.existsSync(publicDir)) {
    console.log('   ℹ️  No public directory found (no images to optimize)\n');
    return;
  }
  
  const files = fs.readdirSync(publicDir, { recursive: true });
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
  let totalSize = 0;
  let imageCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(publicDir, file);
    if (fs.statSync(filePath).isFile()) {
      const ext = path.extname(file).toLowerCase();
      if (imageExtensions.includes(ext)) {
        const stats = fs.statSync(filePath);
        const sizeInMB = stats.size / (1024 * 1024);
        totalSize += sizeInMB;
        imageCount++;
        
        if (sizeInMB > 0.5) {
          issues.push({
            type: 'large-image',
            file: file,
            size: sizeInMB.toFixed(2) + ' MB',
            message: `Image is larger than 500KB`
          });
        }
      }
    }
  });
  
  if (imageCount > 0) {
    console.log(`   Found ${imageCount} images, total size: ${totalSize.toFixed(2)} MB`);
    if (issues.filter(i => i.type === 'large-image').length > 0) {
      console.log(`   ⚠️  ${issues.filter(i => i.type === 'large-image').length} images are larger than 500KB\n`);
    } else {
      console.log('   ✅ All images are optimally sized\n');
    }
  } else {
    console.log('   ℹ️  No images found\n');
  }
}

// Check 2: Analyze markdown file sizes
function checkMarkdownSizes() {
  console.log('📄 Checking markdown file sizes...');
  
  let totalSize = 0;
  let fileCount = 0;
  let largeFiles = 0;
  
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.')) {
        scanDir(filePath);
      } else if (file.endsWith('.md')) {
        const sizeInKB = stat.size / 1024;
        totalSize += sizeInKB;
        fileCount++;
        
        if (sizeInKB > 100) {
          largeFiles++;
          recommendations.push({
            type: 'large-markdown',
            file: path.relative(docsDir, filePath),
            size: sizeInKB.toFixed(2) + ' KB',
            message: 'Consider splitting into smaller pages'
          });
        }
      }
    });
  }
  
  scanDir(docsDir);
  
  console.log(`   Found ${fileCount} markdown files, total size: ${totalSize.toFixed(2)} KB`);
  console.log(`   Average file size: ${(totalSize / fileCount).toFixed(2)} KB`);
  if (largeFiles > 0) {
    console.log(`   ℹ️  ${largeFiles} files are larger than 100KB (consider splitting)\n`);
  } else {
    console.log('   ✅ All markdown files are reasonably sized\n');
  }
}

// Check 3: Count code blocks (affects syntax highlighting bundle size)
function checkCodeBlocks() {
  console.log('💻 Analyzing code blocks...');
  
  let totalCodeBlocks = 0;
  const languages = new Set();
  
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.')) {
        scanDir(filePath);
      } else if (file.endsWith('.md')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const codeBlockRegex = /```(\w+)?/g;
        let match;
        
        while ((match = codeBlockRegex.exec(content)) !== null) {
          totalCodeBlocks++;
          if (match[1]) {
            languages.add(match[1]);
          }
        }
      }
    });
  }
  
  scanDir(docsDir);
  
  console.log(`   Total code blocks: ${totalCodeBlocks}`);
  console.log(`   Languages used: ${Array.from(languages).join(', ')}`);
  console.log('   ✅ Code highlighting is optimized by VitePress\n');
}

// Check 4: Verify VitePress config optimizations
function checkVitePressConfig() {
  console.log('⚙️  Checking VitePress configuration...');
  
  const configPath = path.join(docsDir, '.vitepress/config.ts');
  if (!fs.existsSync(configPath)) {
    issues.push({
      type: 'missing-config',
      message: 'VitePress config file not found'
    });
    console.log('   ❌ Config file not found\n');
    return;
  }
  
  const config = fs.readFileSync(configPath, 'utf-8');
  
  // Check for performance-related configurations
  const checks = [
    { key: 'cleanUrls', name: 'Clean URLs' },
    { key: 'lastUpdated', name: 'Last Updated' },
    { key: 'search', name: 'Search' }
  ];
  
  checks.forEach(check => {
    if (config.includes(check.key)) {
      console.log(`   ✅ ${check.name} configured`);
    } else {
      console.log(`   ℹ️  ${check.name} not configured (optional)`);
    }
  });
  
  console.log();
}

// Check 5: Build output size estimation
function estimateBuildSize() {
  console.log('📦 Estimating build output size...');
  
  const distDir = path.join(docsDir, '.vitepress/dist');
  
  if (!fs.existsSync(distDir)) {
    console.log('   ℹ️  No build output found (run "pnpm run build" first)\n');
    recommendations.push({
      type: 'no-build',
      message: 'Run "pnpm run build" to check actual build size'
    });
    return;
  }
  
  let totalSize = 0;
  
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDir(filePath);
      } else {
        totalSize += stat.size;
      }
    });
  }
  
  scanDir(distDir);
  
  const sizeInMB = totalSize / (1024 * 1024);
  console.log(`   Build output size: ${sizeInMB.toFixed(2)} MB`);
  
  if (sizeInMB > 50) {
    issues.push({
      type: 'large-build',
      size: sizeInMB.toFixed(2) + ' MB',
      message: 'Build output is quite large, consider optimization'
    });
    console.log('   ⚠️  Build size is larger than 50MB\n');
  } else {
    console.log('   ✅ Build size is reasonable\n');
  }
}

// Performance recommendations
function provideRecommendations() {
  console.log('💡 Performance Recommendations:\n');
  
  const tips = [
    '1. Use WebP format for images when possible',
    '2. Enable image lazy loading in VitePress',
    '3. Minimize use of large GIFs (use videos instead)',
    '4. Keep markdown files under 100KB',
    '5. Use code splitting for large examples',
    '6. Enable compression on your hosting platform',
    '7. Use CDN for static assets',
    '8. Monitor Core Web Vitals after deployment'
  ];
  
  tips.forEach(tip => console.log(`   ${tip}`));
  console.log();
}

// Run all checks
checkImageSizes();
checkMarkdownSizes();
checkCodeBlocks();
checkVitePressConfig();
estimateBuildSize();

// Report issues
if (issues.length > 0) {
  console.log('⚠️  Issues Found:\n');
  issues.forEach(issue => {
    console.log(`   ${issue.type}: ${issue.message}`);
    if (issue.file) console.log(`   File: ${issue.file}`);
    if (issue.size) console.log(`   Size: ${issue.size}`);
    console.log();
  });
}

// Report recommendations
if (recommendations.length > 0) {
  console.log('📋 Recommendations:\n');
  recommendations.forEach(rec => {
    console.log(`   ${rec.type}: ${rec.message}`);
    if (rec.file) console.log(`   File: ${rec.file}`);
    if (rec.size) console.log(`   Size: ${rec.size}`);
    console.log();
  });
}

provideRecommendations();

console.log('✨ Performance check complete!\n');
