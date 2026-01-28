package utils

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"
)

// GenerateSign 生成爱发电API签名
// 签名规则: md5(token + params{params}ts{ts}user_id{user_id})
func GenerateSign(token string, params string, ts int64, userID string) string {
	signString := fmt.Sprintf("%sparams%sts%duser_id%s", token, params, ts, userID)
	hash := md5.Sum([]byte(signString))
	return hex.EncodeToString(hash[:])
}

// GenerateTimestamp 生成当前时间戳（秒级）
func GenerateTimestamp() int64 {
	return time.Now().Unix()
}

// BuildRequestParams 构建API请求参数
func BuildRequestParams(params interface{}, userID string, token string) (map[string]interface{}, error) {
	if params == nil {
		params = map[string]interface{}{}
	}

	paramsBytes, err := json.Marshal(params)
	if err != nil {
		return nil, fmt.Errorf("params 序列化失败: %w", err)
	}

	paramsString := string(paramsBytes)
	ts := GenerateTimestamp()
	sign := GenerateSign(token, paramsString, ts, userID)

	return map[string]interface{}{
		"user_id": userID,
		"params":  paramsString,
		"ts":      ts,
		"sign":    sign,
	}, nil
}
