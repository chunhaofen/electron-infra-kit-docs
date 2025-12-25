import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.join(__dirname, '../docs');
const errors = [];
const warnings = [];

// Get all markdown files in a language directory
function getMarkdownFiles(langDir, baseDir = langDir, fileList = []) {
  const files = fs.readdirSync(langDir);
  
  files.forEach(file => {
    const filePath = path.join(langDir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.startsWith('.')) {
        getMarkdownFiles(filePath, baseDir, fileList);
      }
    } else if (file.endsWith('.md')) {
      const relativePath = path.relative(baseDir, filePath);
      fileList.push(relativePath);
    }
  });
  
  return fileList;
}

// Extract structure from markdown
function extractStructure(content) {
  const structure = {
    headers: [],
    codeBlocks: 0,
    mermaidDiagrams: 0,
    links: 0,
    images: 0
  };
  
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBlockLang = '';
  
  lines.forEach(line => {
    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      structure.headers.push({
        level: headerMatch[1].length,
        text: headerMatch[2]
      });
    }
    
    // Code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.substring(3).trim();
        structure.codeBlocks++;
        if (codeBlockLang === 'mermaid') {
          structure.mermaidDiagrams++;
        }
      } else {
        inCodeBlock = false;
      }
    }
    
    // Links
    const linkMatches = line.match(/\[([^\]]+)\]\(([^)]+)\)/g);
    if (linkMatches) {
      structure.links += linkMatches.length;
    }
    
    // Images
    const imageMatches = line.match(/!\[([^\]]*)\]\(([^)]+)\)/g);
    if (imageMatches) {
      structure.images += imageMatches.length;
    }
  });
  
  return structure;
}

// Compare structures
function compareStructures(zhStructure, enStructure, relativePath) {
  // Check header count
  if (zhStructure.headers.length !== enStructure.headers.length) {
    warnings.push({
      type: 'header-count-mismatch',
      file: relativePath,
      message: `Header count mismatch: ZH has ${zhStructure.headers.length}, EN has ${enStructure.headers.length}`
    });
  }
  
  // Check header levels
  const minHeaders = Math.min(zhStructure.headers.length, enStructure.headers.length);
  for (let i = 0; i < minHeaders; i++) {
    if (zhStructure.headers[i].level !== enStructure.headers[i].level) {
      warnings.push({
        type: 'header-level-mismatch',
        file: relativePath,
        message: `Header ${i + 1} level mismatch: ZH is H${zhStructure.headers[i].level}, EN is H${enStructure.headers[i].level}`
      });
    }
  }
  
  // Check code blocks
  if (zhStructure.codeBlocks !== enStructure.codeBlocks) {
    warnings.push({
      type: 'code-block-mismatch',
      file: relativePath,
      message: `Code block count mismatch: ZH has ${zhStructure.codeBlocks}, EN has ${enStructure.codeBlocks}`
    });
  }
  
  // Check mermaid diagrams
  if (zhStructure.mermaidDiagrams !== enStructure.mermaidDiagrams) {
    warnings.push({
      type: 'mermaid-mismatch',
      file: relativePath,
      message: `Mermaid diagram count mismatch: ZH has ${zhStructure.mermaidDiagrams}, EN has ${enStructure.mermaidDiagrams}`
    });
  }
  
  // Check images
  if (zhStructure.images !== enStructure.images) {
    warnings.push({
      type: 'image-mismatch',
      file: relativePath,
      message: `Image count mismatch: ZH has ${zhStructure.images}, EN has ${enStructure.images}`
    });
  }
}

// Validate code blocks
function validateCodeBlocks(content, filePath) {
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBlockStart = 0;
  let codeBlockLang = '';
  
  lines.forEach((line, index) => {
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockStart = index + 1;
        codeBlockLang = line.substring(3).trim();
      } else {
        inCodeBlock = false;
        // Basic validation: check if code block is not empty
        const codeContent = lines.slice(codeBlockStart, index).join('\n').trim();
        if (!codeContent && codeBlockLang !== 'mermaid') {
          warnings.push({
            type: 'empty-code-block',
            file: filePath,
            line: codeBlockStart,
            message: `Empty code block at line ${codeBlockStart}`
          });
        }
      }
    }
  });
  
  // Check for unclosed code blocks
  if (inCodeBlock) {
    errors.push({
      type: 'unclosed-code-block',
      file: filePath,
      line: codeBlockStart,
      message: `Unclosed code block starting at line ${codeBlockStart}`
    });
  }
}

// Main check function
function checkConsistency() {
  console.log('🔍 Checking content consistency...\n');
  
  const zhDir = path.join(docsDir, 'zh');
  const enDir = path.join(docsDir, 'en');
  
  const zhFiles = getMarkdownFiles(zhDir, zhDir);
  const enFiles = getMarkdownFiles(enDir, enDir);
  
  console.log(`📊 Statistics:`);
  console.log(`   Chinese files: ${zhFiles.length}`);
  console.log(`   English files: ${enFiles.length}\n`);
  
  // Check if all files exist in both languages
  const zhSet = new Set(zhFiles);
  const enSet = new Set(enFiles);
  
  zhFiles.forEach(file => {
    if (!enSet.has(file)) {
      errors.push({
        type: 'missing-translation',
        file: `en/${file}`,
        message: `Missing English translation for zh/${file}`
      });
    }
  });
  
  enFiles.forEach(file => {
    if (!zhSet.has(file)) {
      errors.push({
        type: 'missing-translation',
        file: `zh/${file}`,
        message: `Missing Chinese translation for en/${file}`
      });
    }
  });
  
  // Compare structure of matching files
  const commonFiles = zhFiles.filter(file => enSet.has(file));
  
  commonFiles.forEach(file => {
    const zhPath = path.join(zhDir, file);
    const enPath = path.join(enDir, file);
    
    const zhContent = fs.readFileSync(zhPath, 'utf-8');
    const enContent = fs.readFileSync(enPath, 'utf-8');
    
    const zhStructure = extractStructure(zhContent);
    const enStructure = extractStructure(enContent);
    
    compareStructures(zhStructure, enStructure, file);
    
    // Validate code blocks
    validateCodeBlocks(zhContent, `zh/${file}`);
    validateCodeBlocks(enContent, `en/${file}`);
  });
  
  // Report errors
  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} errors:\n`);
    errors.forEach(error => {
      console.log(`   ${error.file}${error.line ? ':' + error.line : ''}`);
      console.log(`   → ${error.message}\n`);
    });
  } else {
    console.log('✅ No critical errors found!\n');
  }
  
  // Report warnings
  if (warnings.length > 0) {
    console.log(`⚠️  Found ${warnings.length} warnings:\n`);
    warnings.forEach(warning => {
      console.log(`   ${warning.file}${warning.line ? ':' + warning.line : ''}`);
      console.log(`   → ${warning.message}\n`);
    });
  } else {
    console.log('✅ No consistency warnings!\n');
  }
  
  return errors.length === 0;
}

// Run the check
const success = checkConsistency();
process.exit(success ? 0 : 1);
