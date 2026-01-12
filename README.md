# 爱发电API代理服务

基于 Fastify 构建的高可用爱发电API代理服务，提供订单数据定时同步和RESTful API查询接口。

## 功能特性

- ✅ **API代理**: 封装爱发电API调用，自动处理签名和请求
- ✅ **定时同步**: 使用 node-cron 定时拉取赞助者数据并存储到 SQLite
- ✅ **数据汇聚**: 自动汇聚每个赞助者的累计金额（`all_sum_amount`）
- ✅ **简化API**: 单一入口 `/sponsor`，返回赞助者总数、页数、赞助时间、金额、昵称、头像
- ✅ **高可用**: 使用 PM2 进程守护，支持自动重启和日志管理

## 技术栈

- **运行时**: Node.js (LTS)
- **Web框架**: Fastify
- **任务调度**: node-cron
- **HTTP客户端**: undici
- **数据库**: SQLite (better-sqlite3)
- **进程守护**: PM2

## 前置要求

**重要**: 本项目需要使用 **Node.js LTS 版本**（18.x 或 20.x），以确保 `better-sqlite3` 可以使用预编译的二进制文件，无需编译。

### 检查 Node.js 版本

```bash
node --version
```

如果版本不是 18.x 或 20.x，请切换到 LTS 版本：

**使用 nvm（推荐）**:
```bash
# Windows (nvm-windows)
nvm install 20
nvm use 20

# Linux/macOS
nvm install 20
nvm use 20
```

**或直接从官网下载**: https://nodejs.org/ (选择 LTS 版本)

## 快速开始

### 1. 安装依赖

#### 使用 Node.js LTS 版本（推荐）

如果使用 Node.js 18.x 或 20.x LTS 版本，`better-sqlite3` 会自动下载预编译的二进制文件，**无需编译**：

```bash
npm install
```

#### Windows 系统（如果必须使用非 LTS 版本）

⚠️ **注意**: 如果使用 Node.js v24+ 或其他非 LTS 版本，`better-sqlite3` 没有预编译二进制文件，需要编译原生模块，Windows 系统需要安装以下工具：

**方法一：安装 Visual Studio Build Tools（推荐）**

1. 下载并安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
2. 安装时选择 "C++ build tools" 工作负载
3. 安装完成后重启终端，然后运行：

```bash
npm install
```

**方法二：使用预编译的二进制文件**

如果不想安装构建工具，可以尝试使用预编译版本：

```bash
npm install --build-from-source=false
```

**方法三：安装 Python（如果方法一失败）**

1. 安装 [Python 3.x](https://www.python.org/downloads/)（确保添加到 PATH）
2. 安装 Visual Studio Build Tools（见方法一）
3. 运行：

```bash
npm install
```

#### Linux/macOS 系统

```bash
npm install
```

**注意**: 如果安装过程中遇到权限问题，可能需要：
- Windows: 以管理员身份运行终端
- Linux/macOS: 使用 `sudo` 或检查文件权限

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 爱发电API配置（必需）
AFDIAN_USER_ID=your_user_id_here
AFDIAN_API_TOKEN=your_api_token_here

# 服务器配置
PORT=3000
HOST=0.0.0.0

# 数据库配置
DB_PATH=./data/afdian.db

# 定时任务配置（cron表达式，默认每5分钟）
SYNC_CRON=*/5 * * * *

# 爱发电API基础URL
AFDIAN_API_BASE_URL=https://afdian.com/api/open
```

### 3. 启动服务

#### 开发模式

```bash
npm run dev
```

#### 生产模式（使用PM2）

```bash
# 启动
npm run pm2:start

# 查看日志
npm run pm2:logs

# 重启
npm run pm2:restart

# 停止
npm run pm2:stop
```

## API接口

### 赞助者查询（唯一入口）

```http
GET /sponsor?page=1&per_page=20
```

**查询参数**:
- `page`: 页码（默认1）
- `per_page`: 每页数量（默认20，最大100）

**返回数据**:
```json
{
  "ec": 200,
  "em": "",
  "data": {
    "total_count": 14,
    "total_page": 2,
    "list": [
      {
        "name": "用户昵称",
        "avatar": "https://pic1.afdiancdn.com/user/xxx/avatar/xxx.jpg",
        "all_sum_amount": "13.00",
        "last_pay_time": 1581083107
      }
    ]
  }
}
```

**返回字段说明**:
- `total_count`: 赞助者总数
- `total_page`: 总页数
- `list`: 赞助者列表
  - `name`: 用户昵称
  - `avatar`: 用户头像URL
  - `all_sum_amount`: 累计赞助金额（已汇聚）
  - `last_pay_time`: 最新一次赞助时间（Unix时间戳，秒级）

## 项目结构

```
afdianapi/
├── src/
│   ├── server.js           # Fastify服务器入口
│   ├── config/
│   │   └── index.js        # 配置管理（环境变量）
│   ├── utils/
│   │   ├── signature.js    # API签名生成
│   │   └── httpClient.js   # HTTP客户端封装（undici）
│   ├── services/
│   │   └── afdianApi.js    # 爱发电API调用封装
│   ├── db/
│   │   ├── index.js        # SQLite数据库初始化
│   │   └── migrations.js   # 数据库迁移/表结构
│   ├── models/
│   │   ├── order.js        # 订单数据模型
│   │   ├── sponsor.js      # 赞助者数据模型
│   │   └── syncMetadata.js # 同步元数据模型
│   ├── routes/
│   │   └── sponsor.js      # 赞助者查询路由（唯一API入口）
│   └── cron/
│       └── syncOrders.js   # 定时同步订单任务
├── data/                   # 数据库文件目录
├── logs/                   # 日志文件目录
├── .env.example            # 环境变量示例
├── package.json
├── pm2.config.js          # PM2配置文件
└── README.md
```

## 定时任务

服务启动后会自动启动定时任务，默认每5分钟同步一次赞助者数据。可以通过环境变量 `SYNC_CRON` 自定义同步频率。

**注意**: 定时任务会同步赞助者数据，每个赞助者的金额已经汇聚（`all_sum_amount`），无需手动计算。

Cron表达式示例：
- `*/5 * * * *` - 每5分钟
- `0 */1 * * *` - 每小时
- `0 0 * * *` - 每天0点

## 数据库

使用 SQLite 存储数据，数据库文件默认位于 `./data/afdian.db`。

### 表结构

- `sponsors`: 赞助者表（存储汇聚后的赞助者数据）
  - `user_id`: 用户ID（主键）
  - `name`: 用户昵称
  - `avatar`: 用户头像
  - `all_sum_amount`: 累计赞助金额（已汇聚）
  - `create_time`: 首次赞助时间
  - `last_pay_time`: 最近一次赞助时间
- `sync_metadata`: 同步元数据表

## 故障排除

### Node.js 版本问题

**错误**: `No prebuilt binaries found (target=24.x.x ...)`

**解决方案**: 切换到 Node.js LTS 版本（18.x 或 20.x）

```bash
# 使用 nvm 切换版本
nvm install 20
nvm use 20

# 然后重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

### better-sqlite3 编译失败

**Windows 系统**:
- 确保已安装 Visual Studio Build Tools 和 "C++ build tools" 工作负载
- 如果已安装 Python，确保 Python 在 PATH 环境变量中
- 尝试以管理员身份运行终端

**通用解决方案**:
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
```

### 权限错误

如果遇到文件权限错误：
- Windows: 以管理员身份运行终端
- Linux/macOS: 检查目录权限，确保有写入权限

## 注意事项

1. **环境变量**: 必须配置 `AFDIAN_USER_ID` 和 `AFDIAN_API_TOKEN`，可在爱发电开发者后台获取
2. **数据库目录**: 确保 `data` 目录有写入权限
3. **日志目录**: PM2 会在 `logs` 目录生成日志文件
4. **API限流**: 注意爱发电API的调用频率限制
5. **Windows 编译**: `better-sqlite3` 在 Windows 上需要 Visual Studio Build Tools 来编译原生模块

## 许可证

MIT

