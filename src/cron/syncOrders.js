import cron from 'node-cron';
import afdianApi from '../services/afdianApi.js';
import sponsorModel from '../models/sponsor.js';
import syncMetadataModel from '../models/syncMetadata.js';
import config from '../config/index.js';
import { generateTimestamp } from '../utils/signature.js';

let syncTask = null;
let isSyncing = false;

/**
 * 同步赞助者数据
 */
async function syncSponsors() {
  // 防止并发执行
  if (isSyncing) {
    console.log('[定时任务] 上一次同步仍在进行中，跳过本次执行');
    return;
  }

  isSyncing = true;
  const startTime = Date.now();

  try {
    console.log('[定时任务] 开始同步赞助者数据...');

    let currentPage = 1;
    let hasMore = true;
    let totalSynced = 0;

    while (hasMore) {
      try {
        // 调用API获取赞助者
        const response = await afdianApi.querySponsor({
          page: currentPage,
          per_page: 100,
        });

        if (!response.data || !response.data.list || response.data.list.length === 0) {
          hasMore = false;
          break;
        }

        const sponsors = response.data.list;

        // 批量插入/更新赞助者
        if (sponsors.length > 0) {
          let pageSynced = 0;
          for (const sponsor of sponsors) {
            try {
              // 确保 user 对象存在
              if (!sponsor.user || !sponsor.user.user_id) {
                console.warn(`[定时任务] 跳过无效的赞助者数据：缺少 user 信息`);
                continue;
              }

              // 最新一次赞助时间
              const lastPayTime = sponsor.last_pay_time ?? sponsor.create_time ?? sponsor.first_pay_time;
              // 首次赞助时间（用作必填字段）
              const firstPayTime = sponsor.first_pay_time ?? sponsor.create_time ?? lastPayTime;
              
              if (!lastPayTime || lastPayTime === 0) {
                console.warn(`[定时任务] 跳过赞助者 ${sponsor.user.user_id}：缺少时间字段`, {
                  create_time: sponsor.create_time,
                  first_pay_time: sponsor.first_pay_time,
                  last_pay_time: sponsor.last_pay_time,
                });
                continue;
              }

              const sponsorData = {
                user_id: sponsor.user.user_id,
                name: sponsor.user.name || '',
                avatar: sponsor.user.avatar || null,
                all_sum_amount: sponsor.all_sum_amount || '0.00',
                // 存储首次赞助时间（原create_time语义保持）
                create_time: firstPayTime || lastPayTime,
                first_pay_time: firstPayTime || null,
                // 存储最新一次赞助时间
                last_pay_time: lastPayTime || null,
              };
              
              await sponsorModel.upsert(sponsorData);
              pageSynced++;
            } catch (error) {
              console.error(`[定时任务] 处理赞助者时出错:`, error.message, {
                user_id: sponsor.user?.user_id,
                error: error.stack,
              });
            }
          }
          totalSynced += pageSynced;
          console.log(`[定时任务] 已同步 ${pageSynced}/${sponsors.length} 个赞助者（第 ${currentPage} 页）`);
        }

        // 检查是否还有更多页
        const totalPage = response.data.total_page || 0;
        if (currentPage >= totalPage) {
          hasMore = false;
        } else {
          currentPage++;
        }

        // 如果本次同步的赞助者数量少于100，说明已经同步完最新数据
        if (sponsors.length < 100) {
          hasMore = false;
        }

        // 避免请求过快，稍微延迟
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`[定时任务] 同步第 ${currentPage} 页时出错:`, error.message);
        // 如果出错，停止同步，避免无限重试
        hasMore = false;
      }
    }

    // 更新最后同步时间
    const syncTime = generateTimestamp();
    await syncMetadataModel.updateLastSyncTime(syncTime);

    const duration = Date.now() - startTime;
    console.log(`[定时任务] 同步完成，共同步 ${totalSynced} 个赞助者，耗时 ${duration}ms`);
  } catch (error) {
    console.error('[定时任务] 同步赞助者失败:', error);
  } finally {
    isSyncing = false;
  }
}

/**
 * 启动定时任务
 */
export function startSyncTask() {
  if (syncTask) {
    console.log('[定时任务] 定时任务已在运行');
    return;
  }

  const cronExpression = config.cron.syncCron;
  console.log(`[定时任务] 启动定时任务，Cron表达式: ${cronExpression}`);

  // 立即执行一次同步
  syncSponsors().catch(error => {
    console.error('[定时任务] 首次同步失败:', error);
  });

  // 设置定时任务
  syncTask = cron.schedule(cronExpression, () => {
    syncSponsors().catch(error => {
      console.error('[定时任务] 定时同步失败:', error);
    });
  });

  console.log('[定时任务] 定时任务已启动');
}

/**
 * 停止定时任务
 */
export function stopSyncTask() {
  if (syncTask) {
    syncTask.stop();
    syncTask = null;
    console.log('[定时任务] 定时任务已停止');
  }
}

/**
 * 手动触发同步（用于测试）
 */
export async function manualSync() {
  await syncSponsors();
}

export default {
  startSyncTask,
  stopSyncTask,
  manualSync,
};

