package config

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type AfdianConfig struct {
	UserID   string
	APIToken string
	BaseURL  string
}

type ServerConfig struct {
	Host string
	Port int
}

type DatabaseConfig struct {
	Host            string
	Port            int
	User            string
	Password        string
	Name            string
	ConnectionLimit int
	ConnectTimeout  int
	SSL             bool
}

type CronConfig struct {
	SyncCron string
}

type Config struct {
	Afdian   AfdianConfig
	Server   ServerConfig
	Database DatabaseConfig
	Cron     CronConfig
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	userID := os.Getenv("AFDIAN_USER_ID")
	apiToken := os.Getenv("AFDIAN_API_TOKEN")
	if userID == "" || apiToken == "" {
		return nil, fmt.Errorf("缺少必需的环境变量: AFDIAN_USER_ID/AFDIAN_API_TOKEN")
	}

	if os.Getenv("NODE_ENV") == "production" && os.Getenv("DB_PASSWORD") == "" {
		log.Println("警告: 生产环境未设置数据库密码，存在安全风险")
	}

	return &Config{
		Afdian: AfdianConfig{
			UserID:   userID,
			APIToken: apiToken,
			BaseURL:  getEnvString("AFDIAN_API_BASE_URL", "https://afdian.com/api/open"),
		},
		Server: ServerConfig{
			Host: getEnvString("HOST", "0.0.0.0"),
			Port: getEnvInt("PORT", 3000),
		},
		Database: DatabaseConfig{
			Host:            getEnvString("DB_HOST", "localhost"),
			Port:            getEnvInt("DB_PORT", 3306),
			User:            getEnvString("DB_USER", "root"),
			Password:        getEnvString("DB_PASSWORD", ""),
			Name:            getEnvString("DB_NAME", "afdian"),
			ConnectionLimit: getEnvInt("DB_CONNECTION_LIMIT", 10),
			ConnectTimeout:  getEnvInt("DB_CONNECT_TIMEOUT", 10),
			SSL:             getEnvBool("DB_SSL", false),
		},
		Cron: CronConfig{
			SyncCron: getEnvString("SYNC_CRON", "*/5 * * * *"),
		},
	}, nil
}

func getEnvString(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err == nil {
			return parsed
		}
	}
	return fallback
}
