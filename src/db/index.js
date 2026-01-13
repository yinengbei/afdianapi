import mysql from 'mysql2/promise';
import config from '../config/index.js';
import { runMigrations } from './migrations.js';

let pool = null;

/**
 * 初始化数据库连接
 * @returns {Promise<mysql.Pool>} MySQL连接池
 */
export async function initDatabase() {
  if (pool) {
    return pool;
  }

  // 创建连接池
  pool = mysql.createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    waitForConnections: config.database.waitForConnections,
    connectionLimit: config.database.connectionLimit,
    queueLimit: config.database.queueLimit,
  });

  // 测试连接
  try {
    const connection = await pool.getConnection();
    console.log(`数据库连接成功: ${config.database.host}:${config.database.port}/${config.database.database}`);
    connection.release();
  } catch (error) {
    console.error('数据库连接失败:', error.message);
    throw error;
  }

  // 运行迁移
  await runMigrations(pool);

  return pool;
}

/**
 * 获取数据库连接池
 * @returns {Promise<mysql.Pool>} MySQL连接池
 */
export async function getDatabase() {
  if (!pool) {
    return await initDatabase();
  }
  return pool;
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('数据库连接已关闭');
  }
}

export default getDatabase;
