import getDatabase from '../db/index.js';

class OrderModel {
  constructor() {
    this.db = null;
  }

  async _getDb() {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  /**
   * 插入或更新订单
   * @param {object} orderData - 订单数据
   * @returns {Promise<object>} 插入的订单数据
   */
  async upsert(orderData) {
    const db = await this._getDb();
    const now = Math.floor(Date.now() / 1000);
    
    const orderSql = `
      INSERT INTO orders (
        out_trade_no, custom_order_id, user_id, user_private_id, plan_id,
        month, total_amount, show_amount, status, remark, redeem_id,
        product_type, discount, address_person, address_phone, address_address,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        custom_order_id = VALUES(custom_order_id),
        user_id = VALUES(user_id),
        user_private_id = VALUES(user_private_id),
        plan_id = VALUES(plan_id),
        month = VALUES(month),
        total_amount = VALUES(total_amount),
        show_amount = VALUES(show_amount),
        status = VALUES(status),
        remark = VALUES(remark),
        redeem_id = VALUES(redeem_id),
        product_type = VALUES(product_type),
        discount = VALUES(discount),
        address_person = VALUES(address_person),
        address_phone = VALUES(address_phone),
        address_address = VALUES(address_address),
        updated_at = VALUES(updated_at)
    `;

    await db.execute(orderSql, [
      orderData.out_trade_no,
      orderData.custom_order_id || null,
      orderData.user_id,
      orderData.user_private_id || null,
      orderData.plan_id || null,
      orderData.month || 1,
      orderData.total_amount,
      orderData.show_amount,
      orderData.status,
      orderData.remark || null,
      orderData.redeem_id || null,
      orderData.product_type || 0,
      orderData.discount || '0.00',
      orderData.address_person || null,
      orderData.address_phone || null,
      orderData.address_address || null,
      orderData.created_at || now,
      orderData.updated_at || now
    ]);

    // 处理SKU详情
    if (orderData.sku_detail && Array.isArray(orderData.sku_detail) && orderData.sku_detail.length > 0) {
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        // 删除旧的SKU记录
        await connection.execute('DELETE FROM order_skus WHERE out_trade_no = ?', [orderData.out_trade_no]);

        // 插入新的SKU记录
        const skuSql = `
          INSERT INTO order_skus (out_trade_no, sku_id, count, name, album_id, pic)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        for (const sku of orderData.sku_detail) {
          await connection.execute(skuSql, [
            orderData.out_trade_no,
            sku.sku_id,
            sku.count || 1,
            sku.name || null,
            sku.album_id || null,
            sku.pic || null
          ]);
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    return await this.findByTradeNo(orderData.out_trade_no);
  }

  /**
   * 批量插入订单
   * @param {Array<object>} orders - 订单数组
   * @returns {Promise<number>} 插入的订单数量
   */
  async batchUpsert(orders) {
    // 不使用事务，因为每个 upsert 操作都是原子的
    // 如果需要事务保证，可以在调用方处理
    let count = 0;
    for (const order of orders) {
      await this.upsert(order);
      count++;
    }
    return count;
  }

  /**
   * 根据订单号查找订单
   * @param {string} outTradeNo - 订单号
   * @returns {Promise<object|null>} 订单数据
   */
  async findByTradeNo(outTradeNo) {
    const db = await this._getDb();
    const [rows] = await db.execute('SELECT * FROM orders WHERE out_trade_no = ?', [outTradeNo]);
    
    if (rows.length === 0) {
      return null;
    }

    const order = rows[0];

    // 加载SKU详情
    const [skus] = await db.execute('SELECT * FROM order_skus WHERE out_trade_no = ?', [outTradeNo]);
    return {
      ...order,
      sku_detail: skus,
    };
  }

  /**
   * 查询订单列表
   * @param {object} options - 查询选项
   * @param {number} options.page - 页码
   * @param {number} options.perPage - 每页数量
   * @param {string} options.outTradeNo - 订单号（可选，支持逗号分隔多个）
   * @returns {Promise<object>} 订单列表和分页信息
   */
  async findMany(options = {}) {
    const db = await this._getDb();
    const { page = 1, perPage = 50, outTradeNo } = options;
    // 确保是整数类型
    const pageNum = parseInt(page, 10) || 1;
    const perPageNum = parseInt(perPage, 10) || 50;
    const offset = (pageNum - 1) * perPageNum;

    let query = 'SELECT * FROM orders';
    const params = [];

    if (outTradeNo) {
      const tradeNos = outTradeNo.split(',').map(no => no.trim()).filter(Boolean);
      if (tradeNos.length > 0) {
        const placeholders = tradeNos.map(() => '?').join(',');
        query += ` WHERE out_trade_no IN (${placeholders})`;
        params.push(...tradeNos);
      }
    }

    // 注意：LIMIT 和 OFFSET 必须使用整数，不能使用参数占位符
    query += ` ORDER BY created_at DESC LIMIT ${perPageNum} OFFSET ${offset}`;

    const [orders] = await db.execute(query, params);

    // 为每个订单加载SKU详情
    const ordersWithSkus = await Promise.all(orders.map(async (order) => {
      const [skus] = await db.execute('SELECT * FROM order_skus WHERE out_trade_no = ?', [order.out_trade_no]);
      return {
        ...order,
        sku_detail: skus,
      };
    }));

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM orders';
    const countParams = [];
    if (outTradeNo) {
      const tradeNos = outTradeNo.split(',').map(no => no.trim()).filter(Boolean);
      if (tradeNos.length > 0) {
        const placeholders = tradeNos.map(() => '?').join(',');
        countQuery += ` WHERE out_trade_no IN (${placeholders})`;
        countParams.push(...tradeNos);
      }
    }
    const [countRows] = await db.execute(countQuery, countParams);
    const total = countRows[0].total;

    return {
      list: ordersWithSkus,
      total_count: total,
      total_page: Math.ceil(total / perPageNum),
      page: pageNum,
      per_page: perPageNum,
    };
  }

  /**
   * 获取总订单数
   * @returns {Promise<number>} 总订单数
   */
  async getTotalCount() {
    const db = await this._getDb();
    const [rows] = await db.execute('SELECT COUNT(*) as total FROM orders');
    return rows[0].total;
  }

  /**
   * 获取总金额
   * @returns {Promise<string>} 总金额（字符串格式，保留两位小数）
   */
  async getTotalAmount() {
    const db = await this._getDb();
    const [rows] = await db.execute(`
      SELECT SUM(CAST(total_amount AS DECIMAL(10,2))) as total 
      FROM orders 
      WHERE status = 2
    `);
    
    return (rows[0].total || 0).toFixed(2);
  }
}

export default new OrderModel();
