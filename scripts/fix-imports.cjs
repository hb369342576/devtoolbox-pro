const fs = require('fs');
const path = require('path');

console.log('开始批量修复导入路径...\n');

const featuresDir = path.join(__dirname, '..', 'features');
const featureDirs = fs.readdirSync(featuresDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

let totalFixed = 0;
let totalFiles = 0;

featureDirs.forEach(dirName => {
    const indexFile = path.join(featuresDir, dirName, 'index.tsx');

    if (fs.existsSync(indexFile)) {
        totalFiles++;
        console.log(`处理: ${dirName}/index.tsx`);

        try {
            let content = fs.readFileSync(indexFile, 'utf8');
            const originalContent = content;

            // 修复导入路径
            content = content.replace(/from\s+['"]\.\.\/types['"]/g, "from '../../types'");
            content = content.replace(/from\s+['"]\.\.\/locales['"]/g, "from '../../locales'");
            content = content.replace(/from\s+['"]\.\.\/constants['"]/g, "from '../../constants'");
            content = content.replace(/from\s+['"]\.\.\/components\/ConfirmModal['"]/g, "from '../../components/ui/ConfirmModal'");
            content = content.replace(/from\s+['"]\.\.\/components\/ContextMenu['"]/g, "from '../../components/ui/ContextMenu'");
            content = content.replace(/from\s+['"]\.\.\/components\/Layout['"]/g, "from '../../components/ui/Layout'");

            // 如果有更改则保存
            if (content !== originalContent) {
                fs.writeFileSync(indexFile, content, 'utf8');
                console.log('  ✓ 已修复\n');
                totalFixed++;
            } else {
                console.log('  • 无需修改\n');
            }
        } catch (error) {
            console.error(`  ✗ 错误: ${error.message}\n`);
        }
    }
});

console.log('========================');
console.log(`修复完成！`);
console.log(`  总文件数: ${totalFiles}`);
console.log(`  已修复: ${totalFixed}`);
console.log(`  无需修复: ${totalFiles - totalFixed}`);
