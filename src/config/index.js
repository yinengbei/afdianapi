import dotenv from 'dotenv';

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
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'afdian',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },

  // 定时任务配置
  cron: {
    syncCron: process.env.SYNC_CRON || '*/5 * * * *', // 默认每5分钟
  },
};

// MySQL 数据库配置已通过环境变量设置

export default config;

