import HttpClient from '../utils/httpClient.js';
import { buildRequestParams } from '../utils/signature.js';
import config from '../config/index.js';

class AfdianApiService {
  constructor() {
    this.client = new HttpClient(config.afdian.baseUrl);
    this.userId = config.afdian.userId;
    this.token = config.afdian.apiToken;
  }

  /**
   * 构建并发送API请求
   * @param {string} endpoint - API端点
   * @param {object} params - 请求参数
   * @returns {Promise<object>} 响应数据
   */
  async _request(endpoint, params = {}) {
    const requestParams = buildRequestParams(params, this.userId, this.token);
    return await this.client.post(endpoint, requestParams);
  }

  /**
   * 查询订单
   * @param {object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.per_page - 每页数量（1-100，默认50）
   * @param {string} params.out_trade_no - 订单号（可选，支持逗号分隔多个）
   * @returns {Promise<object>} 订单列表
   */
  async queryOrder(params = {}) {
    const requestParams = {};
    
    if (params.page) {
      requestParams.page = params.page;
    }
    if (params.per_page) {
      requestParams.per_page = params.per_page;
    }
    if (params.out_trade_no) {
      requestParams.out_trade_no = params.out_trade_no;
    }

    return await this._request('/query-order', requestParams);
  }

  /**
   * 查询赞助者
   * @param {object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.per_page - 每页数量（1-100，默认20）
   * @param {string} params.user_id - 用户ID（可选，支持逗号分隔多个）
   * @returns {Promise<object>} 赞助者列表
   */
  async querySponsor(params = {}) {
    const requestParams = {};
    
    if (params.page) {
      requestParams.page = params.page;
    }
    if (params.per_page) {
      requestParams.per_page = params.per_page;
    }
    if (params.user_id) {
      requestParams.user_id = params.user_id;
    }

    return await this._request('/query-sponsor', requestParams);
  }

  /**
   * 查询方案详情
   * @param {object} params - 查询参数
   * @param {string} params.plan_id - 方案ID
   * @returns {Promise<object>} 方案详情
   */
  async queryPlan(params) {
    if (!params.plan_id) {
      throw new Error('plan_id is required');
    }

    return await this._request('/query-plan', { plan_id: params.plan_id });
  }

  /**
   * 发送私信
   * @param {object} params - 请求参数
   * @param {string} params.recipient - 接收用户ID
   * @param {string} params.content - 私信内容
   * @returns {Promise<object>} 响应结果
   */
  async sendMsg(params) {
    if (!params.recipient || !params.content) {
      throw new Error('recipient and content are required');
    }

    return await this._request('/send-msg', {
      recipient: params.recipient,
      content: params.content,
    });
  }

  /**
   * 查询随机回复
   * @param {object} params - 查询参数
   * @param {string} params.out_trade_no - 订单号（支持逗号分隔多个）
   * @returns {Promise<object>} 随机回复列表
   */
  async queryRandomReply(params) {
    if (!params.out_trade_no) {
      throw new Error('out_trade_no is required');
    }

    return await this._request('/query-random-reply', {
      out_trade_no: params.out_trade_no,
    });
  }

  /**
   * 更新方案回复
   * @param {object} params - 请求参数
   * @param {string} params.plan_id - 方案ID（订阅方案）
   * @param {string} params.sku_id - 型号ID（商品）
   * @param {string} params.auto_reply - 自动回复内容（可选）
   * @param {string} params.auto_random_reply - 自动随机回复内容（可选）
   * @param {string} params.update_random_reply_type - 更新方式：append或overwrite（可选）
   * @returns {Promise<object>} 响应结果
   */
  async updatePlanReply(params) {
    if (!params.plan_id && !params.sku_id) {
      throw new Error('plan_id or sku_id is required');
    }
    if (params.plan_id && params.sku_id) {
      throw new Error('plan_id and sku_id cannot be both provided');
    }

    const requestParams = {};
    if (params.plan_id) {
      requestParams.plan_id = params.plan_id;
    }
    if (params.sku_id) {
      requestParams.sku_id = params.sku_id;
    }
    if (params.auto_reply !== undefined) {
      requestParams.auto_reply = params.auto_reply;
    }
    if (params.auto_random_reply !== undefined) {
      requestParams.auto_random_reply = params.auto_random_reply;
    }
    if (params.update_random_reply_type) {
      requestParams.update_random_reply_type = params.update_random_reply_type;
    }

    return await this._request('/update-plan-reply', requestParams);
  }

  /**
   * Ping测试接口（用于验证签名）
   * @param {object} params - 测试参数
   * @returns {Promise<object>} 响应结果
   */
  async ping(params = {}) {
    return await this._request('/ping', params);
  }
}

export default new AfdianApiService();

