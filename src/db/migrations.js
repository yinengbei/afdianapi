/**
 * 数据库迁移脚本
 * 创建所有必需的表结构
 */

/**
 * 安全创建索引（如果不存在）
 * @param {object} connection - MySQL连接
 * @param {string} tableName - 表名
 * @param {string} indexName - 索引名
 * @param {string} columns - 列名（如：'user_id' 或 'user_id, plan_id'）
 */
async function createIndexIfNotExists(connection, tableName, indexName, columns) {
  // 检查索引是否存在
  const [rows] = await connection.query(`
    SELECT COUNT(*) as count
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND index_name = ?
  `, [tableName, indexName]);

  if (rows[0].count === 0) {
    // 注意：columns 参数已经包含了必要的反引号（如果需要）
    await connection.query(`
      CREATE INDEX ${indexName} ON ${tableName}(${columns})
    `);
  }
}

export async function runMigrations(pool) {
  const connection = await pool.getConnection();
  
  try {
    // 创建订单表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        out_trade_no VARCHAR(255) PRIMARY KEY,
        custom_order_id VARCHAR(255),
        user_id VARCHAR(255) NOT NULL,
        user_private_id VARCHAR(255),
        plan_id VARCHAR(255),
        month INT DEFAULT 1,
        total_amount VARCHAR(50) NOT NULL,
        show_amount VARCHAR(50) NOT NULL,
        status INT NOT NULL,
        remark TEXT,
        redeem_id VARCHAR(255),
        product_type INT DEFAULT 0,
        discount VARCHAR(50) DEFAULT '0.00',
        address_person VARCHAR(255),
        address_phone VARCHAR(255),
        address_address TEXT,
        created_at INT NOT NULL DEFAULT 0,
        updated_at INT NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建订单表索引
    await createIndexIfNotExists(connection, 'orders', 'idx_orders_user_id', 'user_id');
    await createIndexIfNotExists(connection, 'orders', 'idx_orders_plan_id', 'plan_id');
    await createIndexIfNotExists(connection, 'orders', 'idx_orders_status', 'status');
    await createIndexIfNotExists(connection, 'orders', 'idx_orders_created_at', 'created_at');

    // 创建订单SKU详情表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_skus (
        id INT AUTO_INCREMENT PRIMARY KEY,
        out_trade_no VARCHAR(255) NOT NULL,
        sku_id VARCHAR(255) NOT NULL,
        count INT DEFAULT 1,
        name VARCHAR(255),
        album_id VARCHAR(255),
        pic TEXT,
        FOREIGN KEY (out_trade_no) REFERENCES orders(out_trade_no) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建订单SKU表索引
    await createIndexIfNotExists(connection, 'order_skus', 'idx_order_skus_out_trade_no', 'out_trade_no');
    await createIndexIfNotExists(connection, 'order_skus', 'idx_order_skus_sku_id', 'sku_id');

    // 创建赞助者表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sponsors (
        user_id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        avatar TEXT,
        all_sum_amount VARCHAR(50) DEFAULT '0.00',
        create_time INT NOT NULL,
        first_pay_time INT,
        last_pay_time INT,
        updated_at INT NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建赞助者表索引
    await createIndexIfNotExists(connection, 'sponsors', 'idx_sponsors_create_time', 'create_time');
    await createIndexIfNotExists(connection, 'sponsors', 'idx_sponsors_last_pay_time', 'last_pay_time');

    // 创建同步元数据表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        updated_at INT NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建同步元数据表索引（key 字段已经有 UNIQUE 约束，但为了保持一致性也创建索引）
    await createIndexIfNotExists(connection, 'sync_metadata', 'idx_sync_metadata_key', '`key`');

    // 初始化同步元数据
    await connection.query(`
      INSERT IGNORE INTO sync_metadata (\`key\`, value) VALUES ('last_sync_time', '0');
    `);

    console.log('数据库迁移完成');
  } finally {
    connection.release();
  }
}
