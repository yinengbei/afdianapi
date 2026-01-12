import getDatabase from '../db/index.js';

class SyncMetadataModel {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * 更新最后同步时间
   * @param {number} timestamp - 时间戳（秒级）
   * @returns {void}
   */
  updateLastSyncTime(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(`
      INSERT INTO sync_metadata (key, value, updated_at)
      VALUES ('last_sync_time', ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    stmt.run(timestamp.toString(), now);
  }

  /**
   * 获取最后同步时间
   * @returns {number|null} 时间戳（秒级），如果不存在则返回null
   */
  getLastSyncTime() {
    const result = this.db.prepare('SELECT value FROM sync_metadata WHERE key = ?').get('last_sync_time');
    return result ? parseInt(result.value, 10) : null;
  }

  /**
   * 获取元数据值
   * @param {string} key - 键名
   * @returns {string|null} 值
   */
  get(key) {
    const result = this.db.prepare('SELECT value FROM sync_metadata WHERE key = ?').get(key);
    return result ? result.value : null;
  }

  /**
   * 设置元数据值
   * @param {string} key - 键名
   * @param {string} value - 值
   * @returns {void}
   */
  set(key, value) {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(`
      INSERT INTO sync_metadata (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    stmt.run(key, value, now);
  }
}

export default new SyncMetadataModel();

