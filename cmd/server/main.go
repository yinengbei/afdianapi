package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"afdianapi/internal/config"
	"afdianapi/internal/cron"
	"afdianapi/internal/db"
	"afdianapi/internal/routes"
	"afdianapi/internal/services"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("配置加载失败: %v", err)
	}

	database, err := db.Init(cfg)
	if err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}

	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())
	routes.Register(router, database)

	server := &http.Server{
		Addr:    fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler: router,
	}

	afdianClient := services.NewAfdianClient(cfg)
	scheduler := cron.NewScheduler(cfg, database, afdianClient)
	if err := scheduler.Start(); err != nil {
		log.Fatalf("定时任务启动失败: %v", err)
	}

	go func() {
		log.Printf("服务器已启动: http://%s:%d", cfg.Server.Host, cfg.Server.Port)
		log.Printf("赞助者查询: http://%s:%d/sponsor", cfg.Server.Host, cfg.Server.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP 服务启动失败: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("收到关闭信号，开始优雅关闭...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	scheduler.Stop()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("HTTP 服务关闭失败: %v", err)
	}
	if err := db.Close(); err != nil {
		log.Printf("数据库关闭失败: %v", err)
	}

	log.Println("服务已关闭")
}
