import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.join(__dirname, '../docs');
const configPath = path.join(docsDir, '.vitepress/config.ts');

console.log('🧪 Testing VitePress Documentation Functionality\n');

const tests = [];
const passed = [];
const failed = [];

// Test 1: Check if config file exists and is valid
function testConfigExists() {
  const testName = 'Config file exists';
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      if (content.includes('defineConfig') && content.includes('locales')) {
        passed.push(testName);
        return true;
      }
    }
    failed.push({ name: testName, reason: 'Config file missing or invalid' });
    return false;
  } catch (e) {
    failed.push({ name: testName, reason: e.message });
    return false;
  }
}

// Test 2: Check language configuration
function testLanguageConfig() {
  const testName = 'Language configuration (zh/en)';
  try {
    const zhConfigPath = path.join(docsDir, '.vitepress/config/zh.ts');
    const enConfigPath = path.join(docsDir, '.vitepress/config/en.ts');
    
    if (fs.existsSync(zhConfigPath) && fs.existsSync(enConfigPath)) {
      const zhContent = fs.readFileSync(zhConfigPath, 'utf-8');
      const enContent = fs.readFileSync(enConfigPath, 'utf-8');
      
      if (zhContent.includes('nav') && zhContent.includes('sidebar') &&
          enContent.includes('nav') && enContent.includes('sidebar')) {
        passed.push(testName);
        return true;
      }
    }
    failed.push({ name: testName, reason: 'Language config files missing or incomplete' });
    return false;
  } catch (e) {
    failed.push({ name: testName, reason: e.message });
    return false;
  }
}

// Test 3: Check navigation structure
function testNavigationStructure() {
  const testName = 'Navigation structure';
  try {
    const zhConfig = fs.readFileSync(path.join(docsDir, '.vitepress/config/zh.ts'), 'utf-8');
    const enConfig = fs.readFileSync(path.join(docsDir, '.vitepress/config/en.ts'), 'utf-8');
    
    // Check for key navigation items
    const requiredNavItems = ['guide', 'api', 'examples'];
    const zhHasNav = requiredNavItems.every(item => 
      zhConfig.toLowerCase().includes(item)
    );
    const enHasNav = requiredNavItems.every(item => 
      enConfig.toLowerCase().includes(item)
    );
    
    if (zhHasNav && enHasNav) {
      passed.push(testName);
      return true;
    }
    failed.push({ name: testName, reason: 'Missing required navigation items' });
    return false;
  } catch (e) {
    failed.push({ name: testName, reason: e.message });
    return false;
  }
}

// Test 4: Check sidebar configuration
function testSidebarConfig() {
  const testName = 'Sidebar configuration';
  try {
    const zhConfig = fs.readFileSync(path.join(docsDir, '.vitepress/config/zh.ts'), 'utf-8');
    const enConfig = fs.readFileSync(path.join(docsDir, '.vitepress/config/en.ts'), 'utf-8');
    
    // Check for sidebar sections
    const requiredSections = ['/guide/', '/api/', '/examples/'];
    const zhHasSidebar = requiredSections.every(section => 
      zhConfig.includes(section)
    );
    const enHasSidebar = requiredSections.every(section => 
      enConfig.includes(section)
    );
    
    if (zhHasSidebar && enHasSidebar) {
      passed.push(testName);
      return true;
    }
    failed.push({ name: testName, reason: 'Missing required sidebar sections' });
    return false;
  } catch (e) {
    failed.push({ name: testName, reason: e.message });
    return false;
  }
}

// Test 5: Check search configuration
function testSearchConfig() {
  const testName = 'Search configuration';
  try {
    const config = fs.readFileSync(configPath, 'utf-8');
    
    if (config.includes('search') && config.includes('provider')) {
      passed.push(testName);
      return true;
    }
    failed.push({ name: testName, reason: 'Search configuration missing' });
    return false;
  } catch (e) {
    failed.push({ name: testName, reason: e.message });
    return false;
  }
}

// Test 6: Check home pages exist
function testHomePages() {
  const testName = 'Home pages (zh/en)';
  try {
    const zhHome = path.join(docsDir, 'zh/index.md');
    const enHome = path.join(docsDir, 'en/index.md');
    
    if (fs.existsSync(zhHome) && fs.existsSync(enHome)) {
      const zhContent = fs.readFileSync(zhHome, 'utf-8');
      const enContent = fs.readFileSync(enHome, 'utf-8');
      
      // Check for hero and features sections
      if (zhContent.includes('hero:') && zhContent.includes('features:') &&
          enContent.includes('hero:') && enContent.includes('features:')) {
        passed.push(testName);
        return true;
      }
    }
    failed.push({ name: testName, reason: 'Home pages missing or incomplete' });
    return false;
  } catch (e) {
    failed.push({ name: testName, reason: e.message });
    return false;
  }
}

// Test 7: Check guide pages exist
function testGuidePages() {
  const testName = 'Guide pages structure';
  try {
    const requiredGuides = [
      'zh/guide/introduction.md',
      'zh/guide/getting-started.md',
      'en/guide/introduction.md',
      'en/guide/getting-started.md'
    ];
    
    const allExist = requiredGuides.every(guide => 
      fs.existsSync(path.join(docsDir, guide))
    );
    
    if (allExist) {
      passed.push(testName);
      return true;
    }
    failed.push({ name: testName, reason: 'Some guide pages are missing' });
    return false;
  } catch (e) {
    failed.push({ name: testName, reason: e.message });
    return false;
  }
}

// Test 8: Check API pages exist
function testAPIPages() {
  const testName = 'API reference pages';
  try {
    const requiredAPIs = [
      'zh/api/index.md',
      'zh/api/window-manager.md',
      'zh/api/ipc-router.md',
      'zh/api/message-bus.md',
      'en/api/index.md',
      'en/api/window-manager.md',
      'en/api/ipc-router.md',
      'en/api/message-bus.md'
    ];
    
    const allExist = requiredAPIs.every(api => 
      fs.existsSync(path.join(docsDir, api))
    );
    
    if (allExist) {
      passed.push(testName);
      return true;
    }
    failed.push({ name: testName, reason: 'Some API pages are missing' });
    return false;
  } catch (e) {
    failed.push({ name: testName, reason: e.message });
    return false;
  }
}

// Test 9: Check example pages exist
function testExamplePages() {
  const testName = 'Example pages';
  try {
    const requiredExamples = [
      'zh/examples/index.md',
      'zh/examples/basic-setup.md',
      'en/examples/index.md',
      'en/examples/basic-setup.md'
    ];
    
    const allExist = requiredExamples.every(example => 
      fs.existsSync(path.join(docsDir, example))
    );
    
    if (allExist) {
      passed.push(testName);
      return true;
    }
    failed.push({ name: testName, reason: 'Some example pages are missing' });
    return false;
  } catch (e) {
    failed.push({ name: testName, reason: e.message });
    return false;
  }
}

// Test 10: Check responsive layout configuration
function testResponsiveConfig() {
  const testName = 'Responsive layout configuration';
  try {
    const config = fs.readFileSync(configPath, 'utf-8');
    
    // VitePress has responsive layout by default, check if theme config exists
    if (config.includes('themeConfig')) {
      passed.push(testName);
      return true;
    }
    failed.push({ name: testName, reason: 'Theme configuration missing' });
    return false;
  } catch (e) {
    failed.push({ name: testName, reason: e.message });
    return false;
  }
}

// Run all tests
console.log('Running tests...\n');

testConfigExists();
testLanguageConfig();
testNavigationStructure();
testSidebarConfig();
testSearchConfig();
testHomePages();
testGuidePages();
testAPIPages();
testExamplePages();
testResponsiveConfig();

// Report results
console.log('📊 Test Results:\n');
console.log(`✅ Passed: ${passed.length}`);
passed.forEach(test => console.log(`   - ${test}`));

if (failed.length > 0) {
  console.log(`\n❌ Failed: ${failed.length}`);
  failed.forEach(test => console.log(`   - ${test.name}: ${test.reason}`));
}

console.log(`\n📈 Total: ${passed.length}/${passed.length + failed.length} tests passed\n`);

// Additional manual testing notes
console.log('📝 Manual Testing Checklist:\n');
console.log('Please verify the following manually in the browser (http://localhost:5173):');
console.log('  [ ] Search functionality works (try searching for "window")');
console.log('  [ ] Language switching works (toggle between 中文/English)');
console.log('  [ ] Navigation links work correctly');
console.log('  [ ] Sidebar navigation works');
console.log('  [ ] Code blocks are properly highlighted');
console.log('  [ ] Mermaid diagrams render correctly');
console.log('  [ ] Responsive layout works on mobile/tablet/desktop');
console.log('  [ ] Dark/light theme toggle works\n');

process.exit(failed.length === 0 ? 0 : 1);
