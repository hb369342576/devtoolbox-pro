# 批量迁移脚本 - 简单工具直接迁移
# 对于逻辑简单、无需拆分的工具，直接将代码移动到features目录

Write-Host "开始批量迁移简单工具..." -ForegroundColor Green

# 定义简单工具列表（无需拆分组件）
$simpleTools = @(
    @{Name="Settings"; NeedRefactor=$false},
    @{Name="SystemMonitor"; NeedRefactor=$false},
    @{Name="TimeUtility"; NeedRefactor=$false},
    @{Name="PdfTools"; NeedRefactor=$false},
    @{Name="Notes"; NeedRefactor=$false},
    @{Name="InterviewQuestions"; NeedRefactor=$false}
)

foreach ($tool in $simpleTools) {
    $toolName = $tool.Name
    $sourceFile = "views\$toolName.tsx"
    $targetFile = "features\$toolName\index.tsx"
    
    Write-Host "`n处理: $toolName" -ForegroundColor Cyan
    
    if (Test-Path $sourceFile) {
        # 检查目标文件是否已存在
        if (Test-Path $targetFile) {
            Write-Host "  ⚠️  已存在，跳过" -ForegroundColor Yellow
        } else {
            # 复制文件到features目录
            Copy-Item $sourceFile $targetFile -Force
            
            # 更新导入路径
            $content = Get-Content $targetFile -Raw
            $content = $content -replace "from '\.\./types'", "from '../../types'"
            $content = $content -replace "from '\.\./locales'", "from '../../locales'"
            $content = $content -replace "from '\.\./components/", "from '../../components/ui/"
            $content = $content -replace "from '\.\./constants'", "from '../../constants'"
            Set-Content $targetFile $content -NoNewline
            
            Write-Host "  ✓ 迁移完成" -ForegroundColor Green
        }
    } else {
        Write-Host "  ✗ 源文件不存在: $sourceFile" -ForegroundColor Red
    }
}

Write-Host "`n✅ 批量迁移完成！" -ForegroundColor Green
Write-Host "已迁移: $($simpleTools.Count) 个工具" -ForegroundColor Yellow
Write-Host "`n下一步：更新 App.tsx 中的导入路径" -ForegroundColor Cyan
