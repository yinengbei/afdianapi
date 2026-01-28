## 爱发电 API 代理服务，提供赞助者查询与定时同步功能。

### 功能概览

- `GET /sponsor`：分页查询赞助者列表
- `GET /health`：健康检查（数据库连通性）
- 定时任务：周期性同步赞助者数据写入 MySQL
- 5 秒内缓存 `/sponsor` 返回结果，降低数据库压力

### 环境要求

- Go 1.20+
- MySQL 5.7+（推荐 8.0+）

### 快速开始

1. 准备环境变量（可放在项目根目录 `.env`）

```
AFDIAN_USER_ID=你的user_id
AFDIAN_API_TOKEN=你的api_token

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=afdian

PORT=3000
HOST=0.0.0.0
SYNC_CRON=*/5 * * * *
DB_SSL=false
```

2. 启动服务

```
go run ./cmd/server
```

### 接口说明

#### GET /health

健康检查，返回数据库连接状态。

响应示例：
```
{"status":"ok","timestamp":1700000000}
```

#### GET /sponsor

查询赞助者列表（按最新赞助时间倒序）。

查询参数：
- `page`：页码，默认 1
- `per_page`：每页数量，默认 20，最大 100

响应示例：
```
{
  "ec": 200,
  "em": "",
  "data": {
    "total_count": 123,
    "total_page": 7,
    "list": [
      {
        "name": "用户昵称",
        "avatar": "头像URL",
        "all_sum_amount": "99.00",
        "last_pay_time": 1700000000
      }
    ]
  }
}
```

### 配置说明

- `AFDIAN_USER_ID` / `AFDIAN_API_TOKEN`：必填，用于签名与鉴权
- `SYNC_CRON`：cron 表达式，默认每 5 分钟同步一次
- `DB_SSL=true`：启用 MySQL TLS（默认关闭）
- `DB_CONNECT_TIMEOUT`：连接超时（秒），默认 10
- `DB_CONNECTION_LIMIT`：连接池上限，默认 10

### 目录结构

```
cmd/server        应用入口
internal/config   配置加载
internal/db       数据库连接与迁移
internal/models   数据库模型
internal/services 爱发电 API 客户端
internal/cron     定时同步任务
internal/routes   HTTP 路由
internal/utils    签名与工具函数
```

