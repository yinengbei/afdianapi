/**
 * 数据库迁移脚本
 * 创建所有必需的表结构
 */

export function runMigrations(db) {
  // 创建订单表
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      out_trade_no TEXT PRIMARY KEY,
      custom_order_id TEXT,
      user_id TEXT NOT NULL,
      user_private_id TEXT,
      plan_id TEXT,
      month INTEGER DEFAULT 1,
      total_amount TEXT NOT NULL,
      show_amount TEXT NOT NULL,
      status INTEGER NOT NULL,
      remark TEXT,
      redeem_id TEXT,
      product_type INTEGER DEFAULT 0,
      discount TEXT DEFAULT '0.00',
      address_person TEXT,
      address_phone TEXT,
      address_address TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_plan_id ON orders(plan_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
  `);

  // 创建订单SKU详情表
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_skus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      out_trade_no TEXT NOT NULL,
      sku_id TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      name TEXT,
      album_id TEXT,
      pic TEXT,
      FOREIGN KEY (out_trade_no) REFERENCES orders(out_trade_no) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_order_skus_out_trade_no ON order_skus(out_trade_no);
    CREATE INDEX IF NOT EXISTS idx_order_skus_sku_id ON order_skus(sku_id);
  `);

  // 创建赞助者表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sponsors (
      user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      all_sum_amount TEXT DEFAULT '0.00',
      create_time INTEGER NOT NULL,
      first_pay_time INTEGER,
      last_pay_time INTEGER,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sponsors_create_time ON sponsors(create_time);
    CREATE INDEX IF NOT EXISTS idx_sponsors_last_pay_time ON sponsors(last_pay_time);
  `);

  // 创建同步元数据表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sync_metadata_key ON sync_metadata(key);
  `);

  // 初始化同步元数据
  const stmt = db.prepare('INSERT OR IGNORE INTO sync_metadata (key, value) VALUES (?, ?)');
  stmt.run('last_sync_time', '0');

  console.log('数据库迁移完成');
}

