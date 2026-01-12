import getDatabase from '../db/index.js';

class SponsorModel {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * 插入或更新赞助者
   * @param {object} sponsorData - 赞助者数据
   * @param {number} sponsorData.last_pay_time - 最新一次赞助时间
   * @param {number} sponsorData.create_time - 首次赞助时间（必填，字段语义保留）
   * @returns {object} 插入的赞助者数据
   */
  upsert(sponsorData) {
    const now = Math.floor(Date.now() / 1000);
    
    const stmt = this.db.prepare(`
      INSERT INTO sponsors (
        user_id, name, avatar, all_sum_amount, create_time,
        first_pay_time, last_pay_time, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        name = excluded.name,
        avatar = excluded.avatar,
        all_sum_amount = excluded.all_sum_amount,
        create_time = excluded.create_time,
        first_pay_time = COALESCE(excluded.first_pay_time, sponsors.first_pay_time),
        last_pay_time = excluded.last_pay_time,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      sponsorData.user_id,
      sponsorData.name,
      sponsorData.avatar || null,
      sponsorData.all_sum_amount || '0.00',
        sponsorData.create_time,          // 首次赞助时间
        sponsorData.first_pay_time || null,
        sponsorData.last_pay_time || null, // 最新一次赞助时间
      now
    );

    return this.findByUserId(sponsorData.user_id);
  }

  /**
   * 根据用户ID查找赞助者
   * @param {string} userId - 用户ID
   * @returns {object|null} 赞助者数据
   */
  findByUserId(userId) {
    return this.db.prepare('SELECT * FROM sponsors WHERE user_id = ?').get(userId) || null;
  }

  /**
   * 查询赞助者列表
   * @param {object} options - 查询选项
   * @param {number} options.page - 页码
   * @param {number} options.perPage - 每页数量
   * @param {string} options.userId - 用户ID（可选，支持逗号分隔多个）
   * @returns {object} 赞助者列表和分页信息
   */
  findMany(options = {}) {
    const { page = 1, perPage = 20, userId } = options;
    const offset = (page - 1) * perPage;

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
    query += ' ORDER BY last_pay_time DESC LIMIT ? OFFSET ?';
    params.push(perPage, offset);

    const sponsors = this.db.prepare(query).all(...params);

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
    const totalResult = this.db.prepare(countQuery).get(...countParams);
    const total = totalResult.total;

    return {
      list: sponsors,
      total_count: total,
      total_page: Math.ceil(total / perPage),
      page,
      per_page: perPage,
    };
  }
}

export default new SponsorModel();

