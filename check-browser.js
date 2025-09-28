import fs from 'fs';
import path from 'path';

const browserKeywords = [
  'window.', 'document.', 'alert(', 'localStorage',
  'XMLHttpRequest', 'navigator.', 'BrowserProvider',
  'Web3Modal', 'window.ethereum'
];

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    browserKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        issues.push(`Contains: ${keyword}`);
      }
    });
    
    if (issues.length > 0) {
      console.log(`❌ ${filePath}`);
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log(`✅ ${filePath}`);
    }
  } catch (error) {
    console.log(`⚠️  Could not read: ${filePath}`);
  }
}

function checkDirectory(dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      
      if (fs.statSync(fullPath).isDirectory()) {
        checkDirectory(fullPath); // Recursive for subfolders
      } else if (file.endsWith('.js')) {
        checkFile(fullPath);
      }
    });
  } catch (error) {
    console.log(`⚠️  Could not scan: ${dirPath}`);
  }
}

// Check both modules and lib folders from root
const rootDir = path.join(process.cwd(), '..');
console.log('🔍 Checking modules folder:');
checkDirectory(path.join(rootDir, 'modules'));

console.log('\n🔍 Checking lib folder:');
checkDirectory(path.join(rootDir, 'lib'));
