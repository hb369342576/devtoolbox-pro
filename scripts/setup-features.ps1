# 批量创建 features 目录结构脚本
$tools = @(
    "DataCompareTool",
    "DataSourceManager", 
    "DbViewer",
    "ExcelToSql",
    "FieldMappingTool",
    "InterviewQuestions",
    "Login",
    "Notes",
    "PdfTools",
    "SeatunnelGen",
    "Settings",
    "SystemMonitor",
    "TimeUtility",
    "UserProfile"
)

Write-Host "Creating feature directories..." -ForegroundColor Green

foreach ($tool in $tools) {
    Write-Host "Setting up $tool..." -ForegroundColor Cyan
    
    # 创建主目录和子目录
    New-Item -ItemType Directory -Force -Path "features\$tool\hooks" | Out-Null
    New-Item -ItemType Directory -Force -Path "features\$tool\components" | Out-Null
    New-Item -ItemType Directory -Force -Path "features\$tool\utils" | Out-Null
    
    # 创建文件
    New-Item -ItemType File -Force -Path "features\$tool\index.tsx" | Out-Null
    New-Item -ItemType File -Force -Path "features\$tool\types.ts" | Out-Null
    
    Write-Host "  ✓ Created features\$tool" -ForegroundColor Gray
}

Write-Host "`nAll feature directories created successfully!" -ForegroundColor Green
Write-Host "Total tools: $($tools.Count)" -ForegroundColor Yellow
