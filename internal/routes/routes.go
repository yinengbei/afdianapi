package routes

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"afdianapi/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type sponsorResponse struct {
	Name         string  `json:"name"`
	Avatar       *string `json:"avatar"`
	AllSumAmount string  `json:"all_sum_amount"`
	LastPayTime  *int64  `json:"last_pay_time"`
}

type sponsorCacheEntry struct {
	payload   gin.H
	expiresAt time.Time
}

type sponsorCache struct {
	mu      sync.Mutex
	entries map[string]sponsorCacheEntry
}

func newSponsorCache() *sponsorCache {
	return &sponsorCache{
		entries: make(map[string]sponsorCacheEntry),
	}
}

func (c *sponsorCache) get(key string) (gin.H, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	entry, ok := c.entries[key]
	if !ok {
		return nil, false
	}
	if time.Now().After(entry.expiresAt) {
		delete(c.entries, key)
		return nil, false
	}
	return entry.payload, true
}

func (c *sponsorCache) set(key string, payload gin.H, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries[key] = sponsorCacheEntry{
		payload:   payload,
		expiresAt: time.Now().Add(ttl),
	}
}

func Register(router *gin.Engine, db *gorm.DB) {
	cache := newSponsorCache()

	router.GET("/health", func(c *gin.Context) {
		sqlDB, err := db.DB()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "error",
				"message": "数据库连接失败",
			})
			return
		}

		if err := sqlDB.Ping(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "error",
				"message": "数据库连接失败",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"timestamp": time.Now().Unix(),
		})
	})

	router.GET("/sponsor", func(c *gin.Context) {
		page, perPage, ok := parsePagination(c)
		if !ok {
			return
		}

		cacheKey := buildSponsorCacheKey(page, perPage)
		if cached, ok := cache.get(cacheKey); ok {
			c.JSON(http.StatusOK, cached)
			return
		}

		var sponsors []models.Sponsor
		if err := db.Model(&models.Sponsor{}).
			Order("last_pay_time desc").
			Limit(perPage).
			Offset((page - 1) * perPage).
			Find(&sponsors).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"ec":   500,
				"em":   "服务器内部错误",
				"data": nil,
			})
			return
		}

		var total int64
		if err := db.Model(&models.Sponsor{}).Count(&total).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"ec":   500,
				"em":   "服务器内部错误",
				"data": nil,
			})
			return
		}

		list := make([]sponsorResponse, 0, len(sponsors))
		for _, sponsor := range sponsors {
			list = append(list, sponsorResponse{
				Name:         sponsor.Name,
				Avatar:       sponsor.Avatar,
				AllSumAmount: sponsor.AllSumAmount,
				LastPayTime:  sponsor.LastPayTime,
			})
		}

		payload := gin.H{
			"ec": 200,
			"em": "",
			"data": gin.H{
				"total_count": total,
				"total_page":  calcTotalPage(total, int64(perPage)),
				"list":        list,
			},
		}
		cache.set(cacheKey, payload, 5*time.Second)
		c.JSON(http.StatusOK, payload)
	})
}

func parsePagination(c *gin.Context) (int, int, bool) {
	page := 1
	perPage := 20

	if raw := c.Query("page"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 {
			c.JSON(http.StatusBadRequest, gin.H{
				"ec":   400,
				"em":   "页码必须是大于0的整数",
				"data": nil,
			})
			return 0, 0, false
		}
		page = parsed
	}

	if raw := c.Query("per_page"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 100 {
			c.JSON(http.StatusBadRequest, gin.H{
				"ec":   400,
				"em":   "每页数量必须是1-100之间的整数",
				"data": nil,
			})
			return 0, 0, false
		}
		perPage = parsed
	}

	return page, perPage, true
}

func calcTotalPage(total int64, perPage int64) int64 {
	if perPage <= 0 {
		return 0
	}
	if total%perPage == 0 {
		return total / perPage
	}
	return total/perPage + 1
}

func buildSponsorCacheKey(page int, perPage int) string {
	return "sponsor:page=" + strconv.Itoa(page) + ":per_page=" + strconv.Itoa(perPage)
}
