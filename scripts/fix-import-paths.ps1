# 批量修复features目录下所有文件的导入路径 - 改进版

Write-Host "开始批量修复导入路径..." -ForegroundColor Green

$files = Get-ChildItem -Path "features" -Filter "index.tsx" -Recurse -File

$totalFixed = 0
$errors = @()

foreach ($file in $files) {
    try {
        Write-Host "`n处理: $($file.Directory.Name)/$($file.Name)" -ForegroundColor Cyan
        
        # 读取文件内容
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        
        # 修复各种导入路径
        $content = $content -replace "from\s+['""]\.\.\/types['""]", "from '../../types'"
        $content = $content -replace "from\s+['""]\.\.\/locales['""]", "from '../../locales'"
        $content = $content -replace "from\s+['""]\.\.\/constants['""]", "from '../../constants'"
        $content = $content -replace "from\s+['""]\.\.\/components\/ConfirmModal['""]", "from '../../components/ui/ConfirmModal'"
        $content = $content -replace "from\s+['""]\.\.\/components\/ContextMenu['""]", "from '../../components/ui/ContextMenu'"
        $content = $content -replace "from\s+['""]\.\.\/components\/Layout['""]", "from '../../components/ui/Layout'"
        
        # 检查是否有更改
        if ($content -ne $originalContent) {
            # 保存修改
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
            
            Write-Host "  ✓ 已修复" -ForegroundColor Green
            $totalFixed++
        } else {
            Write-Host "  • 无需修改" -ForegroundColor Gray
        }
    }
    catch {
        $errors += "处理 $($file.FullName) 时出错: $_"
        Write-Host "  ✗ 错误: $_" -ForegroundColor Red
    }
}

Write-Host "`n" -NoNewline
Write-Host "========================" -ForegroundColor Green
Write-Host "修复完成！" -ForegroundColor Green
Write-Host "  总文件数: $($files.Count)" -ForegroundColor Yellow
Write-Host "  已修复: $totalFixed" -ForegroundColor Green
Write-Host "  无需修复: $($files.Count - $totalFixed)" -ForegroundColor Gray

if ($errors.Count -gt 0) {
    Write-Host "`n错误列表:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
}
