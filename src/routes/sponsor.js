import sponsorModel from '../models/sponsor.js';

/**
 * 赞助者查询路由（简化版）
 */
async function sponsorRoutes(fastify, options) {
  /**
   * GET /sponsor
   * 查询赞助者列表（汇聚每个赞助者的金额）
   * 
   * Query参数:
   * - page: 页码（默认1）
   * - per_page: 每页数量（默认20，最大100）
   * 
   * 返回字段:
   * - total_count: 赞助者总数
   * - total_page: 总页数
   * - list: 赞助者列表
   *   - name: 用户昵称
   *   - avatar: 用户头像
   *   - all_sum_amount: 累计赞助金额
   *   - last_pay_time: 最新一次赞助时间（Unix时间戳，秒级）
   */
  fastify.get('/sponsor', async (request, reply) => {
    try {
      const { page, per_page } = request.query;

      // 输入验证和边界检查
      let pageNum = 1;
      let perPageNum = 20;

      if (page !== undefined) {
        pageNum = parseInt(page, 10);
        if (isNaN(pageNum) || pageNum < 1) {
          reply.code(400);
          return {
            ec: 400,
            em: '页码必须是大于0的整数',
            data: null,
          };
        }
      }

      if (per_page !== undefined) {
        perPageNum = parseInt(per_page, 10);
        if (isNaN(perPageNum) || perPageNum < 1 || perPageNum > 100) {
          reply.code(400);
          return {
            ec: 400,
            em: '每页数量必须是1-100之间的整数',
            data: null,
          };
        }
      }

      const options = {
        page: pageNum,
        perPage: perPageNum,
      };

      const result = await sponsorModel.findMany(options);

      // 简化返回数据，只返回需要的字段
      const simplifiedList = result.list.map(sponsor => ({
        name: sponsor.name,
        avatar: sponsor.avatar,
        all_sum_amount: sponsor.all_sum_amount,
        last_pay_time: sponsor.last_pay_time,
      }));

      return {
        ec: 200,
        em: '',
        data: {
          total_count: result.total_count,
          total_page: result.total_page,
          list: simplifiedList,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      // 不直接返回错误详情给客户端，避免信息泄露
      return {
        ec: 500,
        em: '服务器内部错误',
        data: null,
      };
    }
  });
}

export default sponsorRoutes;

