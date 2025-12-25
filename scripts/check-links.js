import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.join(__dirname, '../docs');
const errors = [];
const warnings = [];

// Get all markdown files
function getAllMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        getAllMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Extract links from markdown content
function extractLinks(content, filePath) {
  const links = [];
  
  // Match markdown links [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
      line: content.substring(0, match.index).split('\n').length,
      file: filePath
    });
  }
  
  return links;
}

// Check if internal link exists
function checkInternalLink(link, sourceFile) {
  const { url, file, line } = link;
  
  // Skip anchors for now (would need to parse headers)
  const urlWithoutAnchor = url.split('#')[0];
  if (!urlWithoutAnchor) return; // Pure anchor link
  
  // Resolve relative path
  const sourceDir = path.dirname(file);
  let targetPath;
  
  if (urlWithoutAnchor.startsWith('/')) {
    // Absolute path from docs root
    targetPath = path.join(docsDir, urlWithoutAnchor);
  } else {
    // Relative path
    targetPath = path.join(sourceDir, urlWithoutAnchor);
  }
  
  // Add .md if not present and not a directory
  if (!targetPath.endsWith('.md') && !targetPath.endsWith('/')) {
    targetPath += '.md';
  }
  
  // Check if file exists
  if (!fs.existsSync(targetPath)) {
    // Try without .md (might be a directory with index.md)
    const dirPath = targetPath.replace(/\.md$/, '');
    const indexPath = path.join(dirPath, 'index.md');
    
    if (!fs.existsSync(indexPath)) {
      errors.push({
        type: 'broken-internal-link',
        file: path.relative(docsDir, file),
        line,
        url,
        message: `Broken internal link: ${url}`
      });
    }
  }
}

// Check external link (basic validation)
function checkExternalLink(link) {
  const { url, file, line } = link;
  
  // Basic URL validation
  try {
    new URL(url);
  } catch (e) {
    warnings.push({
      type: 'invalid-url',
      file: path.relative(docsDir, file),
      line,
      url,
      message: `Invalid URL format: ${url}`
    });
  }
}

// Main check function
function checkLinks() {
  console.log('🔍 Checking links in documentation...\n');
  
  const markdownFiles = getAllMarkdownFiles(docsDir);
  console.log(`Found ${markdownFiles.length} markdown files\n`);
  
  let totalLinks = 0;
  let internalLinks = 0;
  let externalLinks = 0;
  
  markdownFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const links = extractLinks(content, file);
    
    links.forEach(link => {
      totalLinks++;
      
      if (link.url.startsWith('http://') || link.url.startsWith('https://')) {
        externalLinks++;
        checkExternalLink(link);
      } else if (!link.url.startsWith('mailto:')) {
        internalLinks++;
        checkInternalLink(link);
      }
    });
  });
  
  console.log(`📊 Statistics:`);
  console.log(`   Total links: ${totalLinks}`);
  console.log(`   Internal links: ${internalLinks}`);
  console.log(`   External links: ${externalLinks}\n`);
  
  // Report errors
  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} broken links:\n`);
    errors.forEach(error => {
      console.log(`   ${error.file}:${error.line}`);
      console.log(`   → ${error.message}\n`);
    });
  } else {
    console.log('✅ No broken internal links found!\n');
  }
  
  // Report warnings
  if (warnings.length > 0) {
    console.log(`⚠️  Found ${warnings.length} warnings:\n`);
    warnings.forEach(warning => {
      console.log(`   ${warning.file}:${warning.line}`);
      console.log(`   → ${warning.message}\n`);
    });
  }
  
  return errors.length === 0;
}

// Run the check
const success = checkLinks();
process.exit(success ? 0 : 1);
