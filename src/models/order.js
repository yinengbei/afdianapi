import getDatabase from '../db/index.js';

class OrderModel {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * 插入或更新订单
   * @param {object} orderData - 订单数据
   * @returns {object} 插入的订单数据
   */
  upsert(orderData) {
    const now = Math.floor(Date.now() / 1000);
    
    const orderStmt = this.db.prepare(`
      INSERT INTO orders (
        out_trade_no, custom_order_id, user_id, user_private_id, plan_id,
        month, total_amount, show_amount, status, remark, redeem_id,
        product_type, discount, address_person, address_phone, address_address,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(out_trade_no) DO UPDATE SET
        custom_order_id = excluded.custom_order_id,
        user_id = excluded.user_id,
        user_private_id = excluded.user_private_id,
        plan_id = excluded.plan_id,
        month = excluded.month,
        total_amount = excluded.total_amount,
        show_amount = excluded.show_amount,
        status = excluded.status,
        remark = excluded.remark,
        redeem_id = excluded.redeem_id,
        product_type = excluded.product_type,
        discount = excluded.discount,
        address_person = excluded.address_person,
        address_phone = excluded.address_phone,
        address_address = excluded.address_address,
        updated_at = excluded.updated_at
    `);

    orderStmt.run(
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
    );

    // 处理SKU详情
    if (orderData.sku_detail && Array.isArray(orderData.sku_detail) && orderData.sku_detail.length > 0) {
      // 删除旧的SKU记录
      const deleteSkuStmt = this.db.prepare('DELETE FROM order_skus WHERE out_trade_no = ?');
      deleteSkuStmt.run(orderData.out_trade_no);

      // 插入新的SKU记录
      const skuStmt = this.db.prepare(`
        INSERT INTO order_skus (out_trade_no, sku_id, count, name, album_id, pic)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const insertSku = this.db.transaction((skus) => {
        for (const sku of skus) {
          skuStmt.run(
            orderData.out_trade_no,
            sku.sku_id,
            sku.count || 1,
            sku.name || null,
            sku.album_id || null,
            sku.pic || null
          );
        }
      });

      insertSku(orderData.sku_detail);
    }

    return this.findByTradeNo(orderData.out_trade_no);
  }

  /**
   * 批量插入订单
   * @param {Array<object>} orders - 订单数组
   * @returns {number} 插入的订单数量
   */
  batchUpsert(orders) {
    const insert = this.db.transaction((orders) => {
      let count = 0;
      for (const order of orders) {
        this.upsert(order);
        count++;
      }
      return count;
    });

    return insert(orders);
  }

  /**
   * 根据订单号查找订单
   * @param {string} outTradeNo - 订单号
   * @returns {object|null} 订单数据
   */
  findByTradeNo(outTradeNo) {
    const order = this.db.prepare('SELECT * FROM orders WHERE out_trade_no = ?').get(outTradeNo);
    
    if (!order) {
      return null;
    }

    // 加载SKU详情
    const skus = this.db.prepare('SELECT * FROM order_skus WHERE out_trade_no = ?').all(outTradeNo);
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
   * @returns {object} 订单列表和分页信息
   */
  findMany(options = {}) {
    const { page = 1, perPage = 50, outTradeNo } = options;
    const offset = (page - 1) * perPage;

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

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(perPage, offset);

    const orders = this.db.prepare(query).all(...params);

    // 为每个订单加载SKU详情
    const ordersWithSkus = orders.map(order => {
      const skus = this.db.prepare('SELECT * FROM order_skus WHERE out_trade_no = ?').all(order.out_trade_no);
      return {
        ...order,
        sku_detail: skus,
      };
    });

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
    const totalResult = this.db.prepare(countQuery).get(...countParams);
    const total = totalResult.total;

    return {
      list: ordersWithSkus,
      total_count: total,
      total_page: Math.ceil(total / perPage),
      page,
      per_page: perPage,
    };
  }

  /**
   * 获取总订单数
   * @returns {number} 总订单数
   */
  getTotalCount() {
    const result = this.db.prepare('SELECT COUNT(*) as total FROM orders').get();
    return result.total;
  }

  /**
   * 获取总金额
   * @returns {string} 总金额（字符串格式，保留两位小数）
   */
  getTotalAmount() {
    const result = this.db.prepare(`
      SELECT SUM(CAST(total_amount AS REAL)) as total 
      FROM orders 
      WHERE status = 2
    `).get();
    
    return (result.total || 0).toFixed(2);
  }
}

export default new OrderModel();

