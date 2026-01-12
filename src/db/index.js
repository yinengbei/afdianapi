import Database from 'better-sqlite3';
import { dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import config from '../config/index.js';
import { runMigrations } from './migrations.js';

let db = null;

/**
 * 初始化数据库连接
 * @returns {Database} SQLite数据库实例
 */
export function initDatabase() {
  if (db) {
    return db;
  }

  // 确保数据库目录存在
  const dbDir = dirname(config.database.path);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // 创建数据库连接
  db = new Database(config.database.path);
  
  // 启用外键约束
  db.pragma('foreign_keys = ON');

  // 运行迁移
  runMigrations(db);

  console.log(`数据库已初始化: ${config.database.path}`);

  return db;
}

/**
 * 获取数据库实例
 * @returns {Database} SQLite数据库实例
 */
export function getDatabase() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('数据库连接已关闭');
  }
}

export default getDatabase;

