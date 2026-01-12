import { request } from 'undici';

/**
 * HTTP客户端封装
 * 使用undici作为HTTP客户端，性能优于axios
 */
class HttpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * 发送POST请求
   * @param {string} endpoint - API端点
   * @param {object} data - 请求数据
   * @param {object} options - 额外选项
   * @returns {Promise<object>} 响应数据
   */
  async post(endpoint, data, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.body.json();

      // 检查响应状态
      if (response.statusCode !== 200) {
        throw new Error(`HTTP ${response.statusCode}: ${JSON.stringify(responseData)}`);
      }

      // 检查业务错误码
      if (responseData.ec !== 200) {
        const error = new Error(responseData.em || 'API请求失败');
        error.code = responseData.ec;
        error.data = responseData.data;
        throw error;
      }

      return responseData;
    } catch (error) {
      // 如果是业务错误，直接抛出
      if (error.code) {
        throw error;
      }

      // 网络错误或其他错误
      throw new Error(`请求失败: ${error.message}`);
    }
  }

  /**
   * 发送GET请求
   * @param {string} endpoint - API端点
   * @param {object} queryParams - 查询参数
   * @param {object} options - 额外选项
   * @returns {Promise<object>} 响应数据
   */
  async get(endpoint, queryParams = {}, options = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // 添加查询参数
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    try {
      const response = await request(url.toString(), {
        method: 'GET',
        headers: {
          ...options.headers,
        },
      });

      const responseData = await response.body.json();

      // 检查响应状态
      if (response.statusCode !== 200) {
        throw new Error(`HTTP ${response.statusCode}: ${JSON.stringify(responseData)}`);
      }

      // 检查业务错误码
      if (responseData.ec !== 200) {
        const error = new Error(responseData.em || 'API请求失败');
        error.code = responseData.ec;
        error.data = responseData.data;
        throw error;
      }

      return responseData;
    } catch (error) {
      // 如果是业务错误，直接抛出
      if (error.code) {
        throw error;
      }

      // 网络错误或其他错误
      throw new Error(`请求失败: ${error.message}`);
    }
  }
}

export default HttpClient;

