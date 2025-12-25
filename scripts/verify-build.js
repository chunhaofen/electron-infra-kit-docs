import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../docs/.vitepress/dist');

console.log('🔍 Verifying Build Output\n');

const checks = [];
const passed = [];
const failed = [];

// Check 1: Dist directory exists
function checkDistExists() {
  const testName = 'Build output directory exists';
  if (fs.existsSync(distDir)) {
    passed.push(testName);
    return true;
  }
  failed.push({ name: testName, reason: 'Dist directory not found' });
  return false;
}

// Check 2: Essential files exist
function checkEssentialFiles() {
  const testName = 'Essential files exist';
  const essentialFiles = [
    'index.html',
    '404.html',
    'hashmap.json',
    'assets/style.DmIY29xq.css',
    'assets/app.C9mbDE2u.js'
  ];
  
  const missing = essentialFiles.filter(file => 
    !fs.existsSync(path.join(distDir, file))
  );
  
  if (missing.length === 0) {
    passed.push(testName);
    return true;
  }
  failed.push({ 
    name: testName, 
    reason: `Missing files: ${missing.join(', ')}` 
  });
  return false;
}

// Check 3: Language directories exist
function checkLanguageDirectories() {
  const testName = 'Language directories (zh/en)';
  const langDirs = ['zh', 'en'];
  
  const missing = langDirs.filter(lang => 
    !fs.existsSync(path.join(distDir, lang))
  );
  
  if (missing.length === 0) {
    passed.push(testName);
    return true;
  }
  failed.push({ 
    name: testName, 
    reason: `Missing directories: ${missing.join(', ')}` 
  });
  return false;
}

// Check 4: Home pages exist
function checkHomePages() {
  const testName = 'Home pages (zh/en)';
  const homePages = [
    'zh/index.html',
    'en/index.html'
  ];
  
  const missing = homePages.filter(page => 
    !fs.existsSync(path.join(distDir, page))
  );
  
  if (missing.length === 0) {
    passed.push(testName);
    return true;
  }
  failed.push({ 
    name: testName, 
    reason: `Missing pages: ${missing.join(', ')}` 
  });
  return false;
}

// Check 5: Guide pages exist
function checkGuidePages() {
  const testName = 'Guide pages structure';
  const guidePages = [
    'zh/guide/introduction.html',
    'zh/guide/getting-started.html',
    'en/guide/introduction.html',
    'en/guide/getting-started.html'
  ];
  
  const missing = guidePages.filter(page => 
    !fs.existsSync(path.join(distDir, page))
  );
  
  if (missing.length === 0) {
    passed.push(testName);
    return true;
  }
  failed.push({ 
    name: testName, 
    reason: `Missing pages: ${missing.join(', ')}` 
  });
  return false;
}

// Check 6: API pages exist
function checkAPIPages() {
  const testName = 'API reference pages';
  const apiPages = [
    'zh/api/index.html',
    'zh/api/window-manager.html',
    'en/api/index.html',
    'en/api/window-manager.html'
  ];
  
  const missing = apiPages.filter(page => 
    !fs.existsSync(path.join(distDir, page))
  );
  
  if (missing.length === 0) {
    passed.push(testName);
    return true;
  }
  failed.push({ 
    name: testName, 
    reason: `Missing pages: ${missing.join(', ')}` 
  });
  return false;
}

// Check 7: Example pages exist
function checkExamplePages() {
  const testName = 'Example pages';
  const examplePages = [
    'zh/examples/index.html',
    'zh/examples/basic-setup.html',
    'en/examples/index.html',
    'en/examples/basic-setup.html'
  ];
  
  const missing = examplePages.filter(page => 
    !fs.existsSync(path.join(distDir, page))
  );
  
  if (missing.length === 0) {
    passed.push(testName);
    return true;
  }
  failed.push({ 
    name: testName, 
    reason: `Missing pages: ${missing.join(', ')}` 
  });
  return false;
}

// Check 8: Assets directory
function checkAssets() {
  const testName = 'Assets directory';
  const assetsDir = path.join(distDir, 'assets');
  
  if (!fs.existsSync(assetsDir)) {
    failed.push({ name: testName, reason: 'Assets directory not found' });
    return false;
  }
  
  const files = fs.readdirSync(assetsDir);
  const jsFiles = files.filter(f => f.endsWith('.js')).length;
  const cssFiles = files.filter(f => f.endsWith('.css')).length;
  
  if (jsFiles > 0 && cssFiles > 0) {
    passed.push(`${testName} (${jsFiles} JS, ${cssFiles} CSS)`);
    return true;
  }
  
  failed.push({ 
    name: testName, 
    reason: `Insufficient assets: ${jsFiles} JS, ${cssFiles} CSS` 
  });
  return false;
}

// Check 9: Calculate total size
function checkBuildSize() {
  const testName = 'Build size';
  let totalSize = 0;
  
  function calculateSize(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        calculateSize(filePath);
      } else {
        totalSize += stat.size;
      }
    });
  }
  
  calculateSize(distDir);
  
  const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
  passed.push(`${testName}: ${sizeInMB} MB`);
  return true;
}

// Check 10: Count HTML pages
function countPages() {
  const testName = 'Total HTML pages';
  let pageCount = 0;
  
  function countHTML(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        countHTML(filePath);
      } else if (file.endsWith('.html')) {
        pageCount++;
      }
    });
  }
  
  countHTML(distDir);
  passed.push(`${testName}: ${pageCount}`);
  return true;
}

// Run all checks
console.log('Running verification checks...\n');

if (!checkDistExists()) {
  console.log('❌ Build output not found. Run "pnpm run build" first.\n');
  process.exit(1);
}

checkEssentialFiles();
checkLanguageDirectories();
checkHomePages();
checkGuidePages();
checkAPIPages();
checkExamplePages();
checkAssets();
checkBuildSize();
countPages();

// Report results
console.log('📊 Verification Results:\n');

if (passed.length > 0) {
  console.log(`✅ Passed (${passed.length}):`);
  passed.forEach(test => console.log(`   - ${test}`));
  console.log();
}

if (failed.length > 0) {
  console.log(`❌ Failed (${failed.length}):`);
  failed.forEach(test => {
    console.log(`   - ${test.name}`);
    console.log(`     Reason: ${test.reason}`);
  });
  console.log();
}

console.log(`📈 Summary: ${passed.length}/${passed.length + failed.length} checks passed\n`);

if (failed.length === 0) {
  console.log('✨ Build verification complete! All checks passed.\n');
  console.log('💡 Next steps:');
  console.log('   - Run "pnpm run preview" to preview the build locally');
  console.log('   - Deploy to your hosting platform\n');
} else {
  console.log('⚠️  Some checks failed. Please review and fix the issues.\n');
}

process.exit(failed.length === 0 ? 0 : 1);
