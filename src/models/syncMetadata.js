import getDatabase from '../db/index.js';

class SyncMetadataModel {
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
   * 更新最后同步时间
   * @param {number} timestamp - 时间戳（秒级）
   * @returns {Promise<void>}
   */
  async updateLastSyncTime(timestamp) {
    const db = await this._getDb();
    const now = Math.floor(Date.now() / 1000);
    await db.execute(`
      INSERT INTO sync_metadata (\`key\`, value, updated_at)
      VALUES ('last_sync_time', ?, ?)
      ON DUPLICATE KEY UPDATE
        value = VALUES(value),
        updated_at = VALUES(updated_at)
    `, [timestamp.toString(), now]);
  }

  /**
   * 获取最后同步时间
   * @returns {Promise<number|null>} 时间戳（秒级），如果不存在则返回null
   */
  async getLastSyncTime() {
    const db = await this._getDb();
    const [rows] = await db.execute('SELECT value FROM sync_metadata WHERE `key` = ?', ['last_sync_time']);
    return rows.length > 0 ? parseInt(rows[0].value, 10) : null;
  }

  /**
   * 获取元数据值
   * @param {string} key - 键名
   * @returns {Promise<string|null>} 值
   */
  async get(key) {
    const db = await this._getDb();
    const [rows] = await db.execute('SELECT value FROM sync_metadata WHERE `key` = ?', [key]);
    return rows.length > 0 ? rows[0].value : null;
  }

  /**
   * 设置元数据值
   * @param {string} key - 键名
   * @param {string} value - 值
   * @returns {Promise<void>}
   */
  async set(key, value) {
    const db = await this._getDb();
    const now = Math.floor(Date.now() / 1000);
    await db.execute(`
      INSERT INTO sync_metadata (\`key\`, value, updated_at)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        value = VALUES(value),
        updated_at = VALUES(updated_at)
    `, [key, value, now]);
  }
}

export default new SyncMetadataModel();
