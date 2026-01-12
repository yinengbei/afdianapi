import crypto from 'crypto';

/**
 * 生成爱发电API签名
 * 签名规则: md5(token + params{params}ts{ts}user_id{user_id})
 * 
 * @param {string} token - API Token
 * @param {string} params - JSON字符串格式的参数
 * @param {number} ts - 时间戳（秒级）
 * @param {string} userId - 用户ID
 * @returns {string} MD5签名字符串
 */
export function generateSign(token, params, ts, userId) {
  // 构建签名字符串: token + params{params}ts{ts}user_id{user_id}
  const signString = `${token}params${params}ts${ts}user_id${userId}`;
  
  // 计算MD5哈希
  const sign = crypto.createHash('md5').update(signString).digest('hex');
  
  return sign;
}

/**
 * 生成当前时间戳（秒级）
 * @returns {number} 秒级时间戳
 */
export function generateTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * 构建API请求参数
 * @param {object} params - 请求参数对象
 * @param {string} userId - 用户ID
 * @param {string} token - API Token
 * @returns {object} 包含签名的完整请求参数
 */
export function buildRequestParams(params, userId, token) {
  const paramsString = JSON.stringify(params);
  const ts = generateTimestamp();
  const sign = generateSign(token, paramsString, ts, userId);

  return {
    user_id: userId,
    params: paramsString,
    ts,
    sign,
  };
}

