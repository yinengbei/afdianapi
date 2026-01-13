import getDatabase from '../db/index.js';

class SponsorModel {
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
   * 插入或更新赞助者
   * @param {object} sponsorData - 赞助者数据
   * @param {number} sponsorData.last_pay_time - 最新一次赞助时间
   * @param {number} sponsorData.create_time - 首次赞助时间（必填，字段语义保留）
   * @returns {Promise<object>} 插入的赞助者数据
   */
  async upsert(sponsorData) {
    const db = await this._getDb();
    const now = Math.floor(Date.now() / 1000);
    
    const sql = `
      INSERT INTO sponsors (
        user_id, name, avatar, all_sum_amount, create_time,
        first_pay_time, last_pay_time, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        avatar = VALUES(avatar),
        all_sum_amount = VALUES(all_sum_amount),
        create_time = VALUES(create_time),
        first_pay_time = COALESCE(VALUES(first_pay_time), sponsors.first_pay_time),
        last_pay_time = VALUES(last_pay_time),
        updated_at = VALUES(updated_at)
    `;

    await db.execute(sql, [
      sponsorData.user_id,
      sponsorData.name,
      sponsorData.avatar || null,
      sponsorData.all_sum_amount || '0.00',
      sponsorData.create_time,          // 首次赞助时间
      sponsorData.first_pay_time || null,
      sponsorData.last_pay_time || null, // 最新一次赞助时间
      now
    ]);

    return await this.findByUserId(sponsorData.user_id);
  }

  /**
   * 根据用户ID查找赞助者
   * @param {string} userId - 用户ID
   * @returns {Promise<object|null>} 赞助者数据
   */
  async findByUserId(userId) {
    const db = await this._getDb();
    const [rows] = await db.execute('SELECT * FROM sponsors WHERE user_id = ?', [userId]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 查询赞助者列表
   * @param {object} options - 查询选项
   * @param {number} options.page - 页码
   * @param {number} options.perPage - 每页数量
   * @param {string} options.userId - 用户ID（可选，支持逗号分隔多个）
   * @returns {Promise<object>} 赞助者列表和分页信息
   */
  async findMany(options = {}) {
    const db = await this._getDb();
    const { page = 1, perPage = 20, userId } = options;
    // 确保是整数类型
    const pageNum = parseInt(page, 10) || 1;
    const perPageNum = parseInt(perPage, 10) || 20;
    const offset = (pageNum - 1) * perPageNum;

    let query = 'SELECT * FROM sponsors';
    const params = [];

    if (userId) {
      const userIds = userId.split(',').map(id => id.trim()).filter(Boolean);
      if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',');
        query += ` WHERE user_id IN (${placeholders})`;
        params.push(...userIds);
      }
    }

    // 按最新一次赞助时间倒序排列
    // 注意：LIMIT 和 OFFSET 必须使用整数，不能使用参数占位符
    query += ` ORDER BY last_pay_time DESC LIMIT ${perPageNum} OFFSET ${offset}`;

    const [sponsors] = await db.execute(query, params);

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM sponsors';
    const countParams = [];
    if (userId) {
      const userIds = userId.split(',').map(id => id.trim()).filter(Boolean);
      if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',');
        countQuery += ` WHERE user_id IN (${placeholders})`;
        countParams.push(...userIds);
      }
    }
    const [countRows] = await db.execute(countQuery, countParams);
    const total = countRows[0].total;

    return {
      list: sponsors,
      total_count: total,
      total_page: Math.ceil(total / perPageNum),
      page: pageNum,
      per_page: perPageNum,
    };
  }
}

export default new SponsorModel();
