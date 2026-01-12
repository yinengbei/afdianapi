import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config();

// 验证必需配置
const requiredEnvVars = ['AFDIAN_USER_ID', 'AFDIAN_API_TOKEN'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`缺少必需的环境变量: ${envVar}`);
  }
}

const config = {
  // 爱发电API配置
  afdian: {
    userId: process.env.AFDIAN_USER_ID,
    apiToken: process.env.AFDIAN_API_TOKEN,
    baseUrl: process.env.AFDIAN_API_BASE_URL || 'https://afdian.com/api/open',
  },

  // 服务器配置
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
  },

  // 数据库配置
  database: {
    path: process.env.DB_PATH || './data/afdian.db',
  },

  // 定时任务配置
  cron: {
    syncCron: process.env.SYNC_CRON || '*/5 * * * *', // 默认每5分钟
  },
};

// 确保数据库目录存在
const dbDir = dirname(config.database.path);
if (!existsSync(dbDir)) {
  // 数据库目录会在初始化时创建
}

export default config;

