# Windows 安装指南

## better-sqlite3 编译问题解决方案

### 方法一：安装 Visual Studio Build Tools（推荐）

1. **下载 Visual Studio Build Tools**
   - 访问：https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
   - 下载 "Build Tools for Visual Studio 2022"

2. **安装步骤**
   - 运行下载的安装程序
   - 选择 "C++ build tools" 工作负载
   - 确保勾选以下组件：
     - MSVC v143 - VS 2022 C++ x64/x86 build tools
     - Windows 10/11 SDK（最新版本）
   - 点击安装

3. **安装完成后**
   ```bash
   # 关闭当前终端，重新打开新的终端
   npm install
   ```

### 方法二：安装 Python（如果方法一失败）

1. **下载 Python**
   - 访问：https://www.python.org/downloads/
   - 下载 Python 3.11 或更高版本

2. **安装时注意事项**
   - ✅ 勾选 "Add Python to PATH"
   - ✅ 选择 "Install for all users"（可选）

3. **验证安装**
   ```bash
   python --version
   ```

4. **安装依赖**
   ```bash
   npm install
   ```

### 方法三：使用预编译版本（临时方案）

如果以上方法都不行，可以尝试：

```bash
npm install --build-from-source=false
```

或者设置环境变量：

```bash
# PowerShell
$env:npm_config_build_from_source="false"
npm install

# CMD
set npm_config_build_from_source=false
npm install
```

### 方法四：使用管理员权限

有时权限问题会导致编译失败：

1. 右键点击 PowerShell 或 CMD
2. 选择 "以管理员身份运行"
3. 导航到项目目录
4. 运行 `npm install`

## 验证安装

安装完成后，验证 better-sqlite3 是否正常工作：

```bash
node -e "const Database = require('better-sqlite3'); const db = new Database(':memory:'); console.log('SQLite 工作正常！'); db.close();"
```

## 常见错误

### 错误：找不到 Python
- 确保已安装 Python 并添加到 PATH
- 或安装 Visual Studio Build Tools（推荐）

### 错误：EPERM 权限错误
- 以管理员身份运行终端
- 关闭可能占用文件的程序（如 VS Code、文件资源管理器）

### 错误：node-gyp 失败
- 确保已安装 Visual Studio Build Tools
- 清理并重新安装：`rm -rf node_modules package-lock.json && npm install`

## 需要帮助？

如果以上方法都无法解决问题，请检查：
1. Node.js 版本是否为 LTS（推荐 18.x 或 20.x）
2. npm 版本是否为最新：`npm install -g npm@latest`
3. 系统是否有足够的磁盘空间

