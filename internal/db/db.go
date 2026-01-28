package db

import (
	"crypto/tls"
	"fmt"
	"log"
	"sync"
	"time"

	"afdianapi/internal/config"
	"afdianapi/internal/models"

	mysqlDriverConfig "github.com/go-sql-driver/mysql"
	mysqlDriver "gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var (
	dbInstance *gorm.DB
	once       sync.Once
)

func Init(cfg *config.Config) (*gorm.DB, error) {
	var initErr error
	once.Do(func() {
		dsn, err := buildDSN(cfg)
		if err != nil {
			initErr = err
			return
		}

		db, err := gorm.Open(mysqlDriver.Open(dsn), &gorm.Config{})
		if err != nil {
			initErr = fmt.Errorf("数据库连接失败: %w", err)
			return
		}

		sqlDB, err := db.DB()
		if err != nil {
			initErr = fmt.Errorf("获取数据库实例失败: %w", err)
			return
		}

		sqlDB.SetMaxOpenConns(cfg.Database.ConnectionLimit)
		sqlDB.SetMaxIdleConns(cfg.Database.ConnectionLimit)
		sqlDB.SetConnMaxLifetime(30 * time.Minute)

		if err := sqlDB.Ping(); err != nil {
			initErr = fmt.Errorf("数据库连通性检查失败: %w", err)
			return
		}

		if err := db.AutoMigrate(
			&models.Order{},
			&models.OrderSku{},
			&models.Sponsor{},
			&models.SyncMetadata{},
		); err != nil {
			initErr = fmt.Errorf("数据库迁移失败: %w", err)
			return
		}

		dbInstance = db
		log.Printf("数据库连接成功: %s:%d/%s", cfg.Database.Host, cfg.Database.Port, cfg.Database.Name)
	})

	return dbInstance, initErr
}

func GetDB() (*gorm.DB, error) {
	if dbInstance == nil {
		return nil, fmt.Errorf("数据库尚未初始化")
	}
	return dbInstance, nil
}

func Close() error {
	if dbInstance == nil {
		return nil
	}
	sqlDB, err := dbInstance.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func buildDSN(cfg *config.Config) (string, error) {
	mysqlCfg := mysqlDriverConfig.Config{
		User:                 cfg.Database.User,
		Passwd:               cfg.Database.Password,
		Net:                  "tcp",
		Addr:                 fmt.Sprintf("%s:%d", cfg.Database.Host, cfg.Database.Port),
		DBName:               cfg.Database.Name,
		AllowNativePasswords: true,
		Params: map[string]string{
			"charset":   "utf8mb4",
			"parseTime": "true",
			"loc":       "Local",
			"timeout":   fmt.Sprintf("%ds", cfg.Database.ConnectTimeout),
		},
	}

	if cfg.Database.SSL {
		tlsConfigName := "afdianapi_tls"
		if err := mysqlDriverConfig.RegisterTLSConfig(tlsConfigName, &tls.Config{
			InsecureSkipVerify: true,
		}); err != nil {
			return "", fmt.Errorf("注册 TLS 配置失败: %w", err)
		}
		mysqlCfg.TLSConfig = tlsConfigName
	}

	return mysqlCfg.FormatDSN(), nil
}
