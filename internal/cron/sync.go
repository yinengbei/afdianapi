package cron

import (
	"log"
	"strconv"
	"sync"
	"time"

	"afdianapi/internal/config"
	"afdianapi/internal/models"
	"afdianapi/internal/services"

	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SyncService struct {
	db        *gorm.DB
	client    *services.AfdianClient
	mu        sync.Mutex
	isSyncing bool
}

func NewSyncService(db *gorm.DB, client *services.AfdianClient) *SyncService {
	return &SyncService{
		db:     db,
		client: client,
	}
}

func (s *SyncService) SyncSponsors() {
	s.mu.Lock()
	if s.isSyncing {
		log.Println("[定时任务] 上一次同步仍在进行中，跳过本次执行")
		s.mu.Unlock()
		return
	}
	s.isSyncing = true
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		s.isSyncing = false
		s.mu.Unlock()
	}()

	startTime := time.Now()
	log.Println("[定时任务] 开始同步赞助者数据...")

	currentPage := 1
	totalSynced := 0
	hasMore := true

	for hasMore {
		data, err := s.client.QuerySponsor(currentPage, 100)
		if err != nil {
			log.Printf("[定时任务] 同步第 %d 页时出错: %v", currentPage, err)
			break
		}

		if data == nil || len(data.List) == 0 {
			hasMore = false
			break
		}

		pageSynced := 0
		for _, sponsor := range data.List {
			if sponsor.User.UserID == "" {
				log.Println("[定时任务] 跳过无效的赞助者数据：缺少 user 信息")
				continue
			}

			lastPayTime := pickFirstNonZero(
				derefInt64(sponsor.LastPayTime),
				sponsor.CreateTime,
				derefInt64(sponsor.FirstPayTime),
			)
			firstPayTime := pickFirstNonZero(
				derefInt64(sponsor.FirstPayTime),
				sponsor.CreateTime,
				lastPayTime,
			)

			if lastPayTime == 0 {
				log.Printf("[定时任务] 跳过赞助者 %s：缺少时间字段", sponsor.User.UserID)
				continue
			}

			now := time.Now().Unix()
			firstPayTimePtr := int64PtrOrNil(firstPayTime)
			lastPayTimePtr := int64PtrOrNil(lastPayTime)
			name := sponsor.User.Name
			var avatarPtr *string
			if sponsor.User.Avatar != "" {
				avatar := sponsor.User.Avatar
				avatarPtr = &avatar
			}

			record := models.Sponsor{
				UserID:       sponsor.User.UserID,
				Name:         name,
				Avatar:       avatarPtr,
				AllSumAmount: sponsor.AllSumAmount,
				CreateTime:   firstPayTime,
				FirstPayTime: firstPayTimePtr,
				LastPayTime:  lastPayTimePtr,
				UpdatedAt:    now,
			}

			err = s.db.Clauses(clause.OnConflict{
				Columns: []clause.Column{{Name: "user_id"}},
				DoUpdates: clause.Assignments(map[string]interface{}{
					"name":           record.Name,
					"avatar":         record.Avatar,
					"all_sum_amount": record.AllSumAmount,
					"create_time":    record.CreateTime,
					"first_pay_time": gorm.Expr("COALESCE(?, first_pay_time)", record.FirstPayTime),
					"last_pay_time":  record.LastPayTime,
					"updated_at":     record.UpdatedAt,
				}),
			}).Create(&record).Error
			if err != nil {
				log.Printf("[定时任务] 处理赞助者时出错: %v", err)
				continue
			}

			pageSynced++
		}

		totalSynced += pageSynced
		log.Printf("[定时任务] 已同步 %d/%d 个赞助者（第 %d 页）", pageSynced, len(data.List), currentPage)

		if currentPage >= data.TotalPage || len(data.List) < 100 {
			hasMore = false
		} else {
			currentPage++
			time.Sleep(500 * time.Millisecond)
		}
	}

	syncTime := time.Now().Unix()
	meta := models.SyncMetadata{
		Key:       "last_sync_time",
		Value:     strconv.FormatInt(syncTime, 10),
		UpdatedAt: syncTime,
	}
	if err := s.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "key"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"value":      meta.Value,
			"updated_at": meta.UpdatedAt,
		}),
	}).Create(&meta).Error; err != nil {
		log.Printf("[定时任务] 更新同步元数据失败: %v", err)
	}

	log.Printf("[定时任务] 同步完成，共同步 %d 个赞助者，耗时 %s", totalSynced, time.Since(startTime))
}

type Scheduler struct {
	cron        *cron.Cron
	syncCron    string
	syncService *SyncService
}

func NewScheduler(cfg *config.Config, db *gorm.DB, client *services.AfdianClient) *Scheduler {
	return &Scheduler{
		cron:        cron.New(),
		syncCron:    cfg.Cron.SyncCron,
		syncService: NewSyncService(db, client),
	}
}

func (s *Scheduler) Start() error {
	if _, err := s.cron.AddFunc(s.syncCron, func() {
		s.syncService.SyncSponsors()
	}); err != nil {
		return err
	}

	go s.syncService.SyncSponsors()
	s.cron.Start()
	log.Printf("[定时任务] 定时任务已启动，Cron表达式: %s", s.syncCron)
	return nil
}

func (s *Scheduler) Stop() {
	ctx := s.cron.Stop()
	<-ctx.Done()
	log.Println("[定时任务] 定时任务已停止")
}

func pickFirstNonZero(values ...int64) int64 {
	for _, value := range values {
		if value > 0 {
			return value
		}
	}
	return 0
}

func derefInt64(value *int64) int64 {
	if value == nil {
		return 0
	}
	return *value
}

func int64PtrOrNil(value int64) *int64 {
	if value == 0 {
		return nil
	}
	return &value
}
