# 爱发电API代理

基于 Fastify 构建的高可用爱发电API代理服务，提供订单数据定时同步和RESTful API查询接口。

## 功能特性

- ✅ **API代理**: 封装爱发电API调用，自动处理签名和请求
- ✅ **定时同步**: 使用 node-cron 定时拉取赞助者数据并存储到 MySQL
- ✅ **数据汇聚**: 自动汇聚每个赞助者的累计金额（`all_sum_amount`）
- ✅ **简化API**: 唯一入口 `/sponsor`，返回赞助者总数、页数、赞助时间、金额、昵称、头像
- ✅ **高可用**: 使用 PM2 进程守护，支持自动重启和日志管理

## 前置要求

本项目需要使用 **Node.js LTS 版本**（18.*）。

## 快速开始

### 1. 安装依赖

```bash
npm install
```
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

# MySQL数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=afdian

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

### 赞助者查询
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
│   │   ├── index.js        # MySQL数据库连接池初始化
│   │   └── migrations.js   # 数据库迁移/表结构
│   ├── models/
│   │   ├── order.js        # 订单数据模型
│   │   ├── sponsor.js      # 赞助者数据模型
│   │   └── syncMetadata.js # 同步元数据模型
│   ├── routes/
│   │   └── sponsor.js      # 赞助者查询路由（唯一API入口）
│   └── cron/
│       └── syncOrders.js   # 定时同步订单任务
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

使用 MySQL 存储数据。首次运行时会自动创建所有表结构。

### 前置要求

1. 安装并运行 MySQL 服务器（5.7+）
2. 创建数据库（数据库名由 `DB_NAME` 环境变量指定）
3. 确保数据库用户有足够的权限（CREATE TABLE, INSERT, UPDATE, SELECT 等）

### 表结构

- `sponsors`: 赞助者表（存储汇聚后的赞助者数据）
  - `user_id`: 用户ID（主键）
  - `name`: 用户昵称
  - `avatar`: 用户头像
  - `all_sum_amount`: 累计赞助金额（已汇聚）
  - `create_time`: 首次赞助时间
  - `last_pay_time`: 最近一次赞助时间
- `orders`: 订单表
- `order_skus`: 订单SKU详情表
- `sync_metadata`: 同步元数据表


## 注意事项

1. **环境变量**: 必须配置 `AFDIAN_USER_ID` 和 `AFDIAN_API_TOKEN`，可在爱发电开发者后台获取
2. **MySQL配置**: 必须配置 MySQL 连接信息（`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`）
3. **数据库准备**: 确保 MySQL 数据库已创建（数据库名由 `DB_NAME` 环境变量指定），首次运行时会自动创建表结构
4. **日志目录**: PM2 会在 `logs` 目录生成日志文件
5. **API限流**: 注意爱发电API的调用频率限制
6. 此项目全部代码由**AI**开发，未经严格的审查，慎重使用

## 许可证

MIT

