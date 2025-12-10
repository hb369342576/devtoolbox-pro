@echo off
echo ================================================
echo DevToolbox Pro - 快速打包脚本
echo ================================================
echo.

echo [1/3] 清理旧的构建文件...
cd src-tauri
cargo clean
cd ..
echo 完成！
echo.

echo [2/3] 等待 10 秒以释放文件锁...
timeout /t 10 /nobreak
echo.

echo [3/3] 开始打包...
echo 注意：如果遇到文件锁定错误，请：
echo   1. 关闭所有防病毒软件
echo   2. 重启电脑
echo   3. 重新运行此脚本
echo.

npx tauri build

echo.
echo ================================================
if %ERRORLEVEL% == 0 (
    echo 打包成功！
    echo.
    echo 安装包位置：
    echo   - MSI: src-tauri\target\release\bundle\msi\
    echo   - NSIS: src-tauri\target\release\bundle\nsis\
    echo   - 便携版: src-tauri\target\release\devtoolbox.exe
) else (
    echo 打包失败！请查看错误信息。
    echo.
    echo 如果是文件锁定错误 (error 32)：
    echo   1. 重启电脑
    echo   2. 重新运行此脚本
    echo.
    echo 或者手动执行：
    echo   cd src-tauri
    echo   cargo build --release
    echo   然后直接使用: target\release\devtoolbox.exe
)
echo ================================================

pause
