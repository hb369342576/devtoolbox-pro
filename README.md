# DevToolbox Pro - 开发者全能工具箱

DevToolbox Pro 是一个基于 **Tauri 2.0** + **React 19** + **Rust** 构建的跨平台桌面应用。它集成了数据库管理、数据同步脚本生成、办公工具和系统监控等功能，专为开发者设计，体积小巧且性能优越。

## 🛠️ 技术栈

*   **前端**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts
*   **状态管理**: Zustand (轻量级全局状态管理)
*   **后端**: Rust (Tauri Host Process)
*   **框架**: Tauri 2.0
*   **构建工具**: Vite

## 🏗️ 架构特性

*   **Feature-Based**: 功能模块化，易于扩展
*   **Zustand Stores**: 9个专用Store统一管理状态（1个全局Store + 8个功能Store）
*   **TypeScript**: 完整类型安全
*   **组件原子化**: 高复用性组件设计
*   **性能优化**: Selector细粒度更新
*   **响应式设计**: 适配不同屏幕尺寸
*   **热更新支持**: 前端和后端代码修改后自动刷新

## ✨ 核心功能

1.  **数据库查看器**: 支持 MySQL, Doris, PostgreSQL 等多数据源连接，可视化查看表结构，生成 DDL/DML，支持多方言转换。
2.  **Excel 转 SQL**: 解析 Excel 文件并自动生成建表语句，支持自定义模板解析规则。
3.  **Seatunnel 脚本生成**: 可视化配置 Source/Sink，支持任务管理，一键生成 Seatunnel/DataX 同步任务脚本。
4.  **PDF 工具箱**: 提供 PDF 合并、拆分、压缩及元数据编辑功能。
5.  **系统工具**: 实时系统资源监控 (CPU/内存/网络) 及时间戳转换工具（支持多种格式和时区）。
6.  **数据比较工具**: 支持多数据源表结构和数据比较，可视化展示差异，生成同步脚本。
7.  **字段映射工具**: 可视化配置不同数据源之间的字段映射关系，支持类型兼容性检查。
8.  **面试题库**: 开发者面试题集合，支持分类浏览和搜索。
9.  **笔记功能**: 开发者专用笔记工具，支持 Markdown 编辑和分类管理。
10. **用户管理**: 支持登录认证和用户资料管理。
11. **数据源管理器**: 集中管理所有数据库连接配置，支持导入导出。

---

## 🚀 环境准备

在开始之前，请确保您的开发环境已安装以下必要的依赖：

### 1. 基础环境
*   **Node.js**: 建议版本 v18.0.0 或更高。
*   **Package Manager**: 推荐使用 `npm` 或 `pnpm`。

### 2. Rust 环境
Tauri 依赖 Rust 进行后端编译。
*   访问 [rust-lang.org](https://www.rust-lang.org/tools/install) 下载并安装 `rustup`。
*   安装完成后，在终端运行 `rustc --version` 确认安装成功。

### 3. 系统构建工具 (Windows 用户必看 ⚠️)
Windows 必须安装 **Microsoft Visual Studio C++ 生成工具** 才能编译 Rust 代码。
1.  下载 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)。
2.  安装时勾选 **"使用 C++ 的桌面开发" (Desktop development with C++)**。
3.  确保右侧详情中包含 **Windows SDK** (如 Windows 10/11 SDK)。

---

## 💻 开发调试 (Debug)

### 1. 安装依赖
在项目根目录下运行：
```bash
npm install
```

### 2. 配置后端代码 (可选)
如果您需要修改后端功能，可以编辑以下文件：
*   `src-tauri/src/main.rs` - Tauri 应用入口文件
*   `src-tauri/Cargo.toml` - Rust 依赖配置文件
*   `src-tauri/tauri.conf.json` - Tauri 应用配置文件

### 3. 启动开发服务器

项目支持两种开发模式：

#### Web 开发模式
仅启动 React 前端服务器，通过浏览器访问：
```bash
npm run dev
```
*   **访问地址**：http://localhost:3000/
*   **热更新**：修改 `.tsx` 文件，界面会自动刷新。

#### 桌面开发模式
同时启动 React 前端服务器和 Tauri Rust 后端进程，并弹出桌面窗口：
```bash
npm run tauri dev
```
*   **前端热更新**：修改 `.tsx` 文件，界面会自动刷新。
*   **后端热更新**：修改 `.rs` 文件，Tauri 会自动重新编译并重启应用。

---

## 📦 打包发布 (Build)

当开发完成，您可以将应用打包为独立的安装程序 (`.exe` 或 `.msi`)。

### 1. 修改配置
打开 `src-tauri/tauri.conf.json`，确保 `identifier` 是唯一的（不要使用默认的 `com.devtoolbox.app`，建议修改）：
```json
{
  "identifier": "com.yourname.devtoolbox",
  ...
}
```

### 2. 执行打包命令
```bash
npm run tauri build
```
此过程可能需要几分钟，因为它会下载依赖并进行 Release 模式的 Rust 编译。

### 3. 获取安装包
打包成功后，安装文件通常位于：
*   **安装程序**: `src-tauri/target/release/bundle/nsis/DevToolbox Pro_1.0.0_x64-setup.exe`
*   **绿色版**: `src-tauri/target/release/DevToolbox Pro.exe`

---

## ❓ 常见问题

**Q: 启动时报错 `failed to run custom build command for openssl-sys`?**
A: 缺少 OpenSSL 库。Windows 通常不需要手动安装（由 VS Build Tools 处理），Linux 用户请运行 `sudo apt install libssl-dev`。

**Q: 打包后数据库连接失败？**
A: 请检查防火墙设置。打包后的 `.exe` 依然受限于运行机器的网络环境，确保该机器能访问目标数据库 IP。

**Q: 如何修改应用图标？**
A: 将您的图标 (1024x1024 png) 放入根目录，命名为 `app-icon.png`，然后运行 `npx tauri icon app-icon.png` 自动生成所有尺寸图标。

---

## 📄 License

MIT License