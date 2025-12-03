const fs = require('fs');
const path = require('path');

// 复制目录函数
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 清空 docs 目录（但保留 CNAME）
const docsDir = path.join(__dirname, '..', 'docs');
const cnamePath = path.join(docsDir, 'CNAME');
let cnameContent = '';

// 如果 CNAME 存在，先保存它
if (fs.existsSync(cnamePath)) {
  cnameContent = fs.readFileSync(cnamePath, 'utf8');
}

// 删除 docs 目录中的所有内容（除了 CNAME）
if (fs.existsSync(docsDir)) {
  const entries = fs.readdirSync(docsDir, { withFileTypes: true });
  for (let entry of entries) {
    const entryPath = path.join(docsDir, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(entryPath, { recursive: true, force: true });
    } else if (entry.name !== 'CNAME') {
      fs.unlinkSync(entryPath);
    }
  }
}

// 复制 build 目录到 docs
const buildDir = path.join(__dirname, '..', 'build');
if (!fs.existsSync(buildDir)) {
  console.error('Error: build directory does not exist. Please run "npm run build" first.');
  process.exit(1);
}

copyDir(buildDir, docsDir);

// 恢复 CNAME 文件
if (cnameContent) {
  fs.writeFileSync(cnamePath, cnameContent);
  console.log('✓ Preserved CNAME file');
}

console.log('✓ Build files copied to docs directory');
console.log('✓ Ready to commit and push to main branch');

