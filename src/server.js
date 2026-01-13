import Fastify from 'fastify';
import config from './config/index.js';
import { initDatabase, closeDatabase, getDatabase } from './db/index.js';
import { startSyncTask, stopSyncTask } from './cron/syncOrders.js';

// 导入路由
import sponsorRoutes from './routes/sponsor.js';

// 创建Fastify实例
const fastify = Fastify({
  ignoreTrailingSlash: true, // 忽略尾部斜杠，/sponsor 和 /sponsor/ 都会匹配
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
});

// 注册路由
fastify.register(sponsorRoutes);

// 健康检查端点
fastify.get('/health', async (request, reply) => {
  try {
    // 检查数据库连接
    const db = await getDatabase();
    await db.execute('SELECT 1');
    
    return {
      status: 'ok',
      timestamp: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    reply.code(503);
    return {
      status: 'error',
      message: '数据库连接失败',
    };
  }
});

// 启动服务器
async function start() {
  try {
    // 初始化数据库
    await initDatabase();

    // 启动定时任务
    startSyncTask();

    // 启动服务器
    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    console.log(`服务器已启动: http://${config.server.host}:${config.server.port}`);
    console.log(`赞助者查询: http://${config.server.host}:${config.server.port}/sponsor`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// 优雅关闭
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`收到 ${signal} 信号，开始优雅关闭...`);

    // 停止定时任务
    stopSyncTask();

    // 关闭数据库连接
    await closeDatabase();

    // 关闭服务器
    await fastify.close();
    fastify.log.info('服务器已关闭');

    process.exit(0);
  });
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  fastify.log.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  fastify.log.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 启动应用
start();

