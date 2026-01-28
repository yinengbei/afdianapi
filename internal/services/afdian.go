package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"afdianapi/internal/config"
	"afdianapi/internal/utils"

	"github.com/go-resty/resty/v2"
)

type AfdianClient struct {
	client *resty.Client
	userID string
	token  string
}

func NewAfdianClient(cfg *config.Config) *AfdianClient {
	client := resty.New().
		SetBaseURL(cfg.Afdian.BaseURL).
		SetTimeout(30 * time.Second)

	return &AfdianClient{
		client: client,
		userID: cfg.Afdian.UserID,
		token:  cfg.Afdian.APIToken,
	}
}

type apiResponse struct {
	Ec   int             `json:"ec"`
	Em   string          `json:"em"`
	Data json.RawMessage `json:"data"`
}

func (c *AfdianClient) request(endpoint string, params interface{}, out interface{}) error {
	requestParams, err := utils.BuildRequestParams(params, c.userID, c.token)
	if err != nil {
		return err
	}

	resp, err := c.client.R().
		SetHeader("Content-Type", "application/json").
		SetBody(requestParams).
		Post(endpoint)
	if err != nil {
		return fmt.Errorf("请求失败: %w", err)
	}

	if resp.StatusCode() != http.StatusOK {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode(), string(resp.Body()))
	}

	var parsed apiResponse
	if err := json.Unmarshal(resp.Body(), &parsed); err != nil {
		return fmt.Errorf("响应解析失败: %w", err)
	}

	if parsed.Ec != 200 {
		return fmt.Errorf("API错误: %s", parsed.Em)
	}

	if out == nil {
		return nil
	}

	if err := json.Unmarshal(parsed.Data, out); err != nil {
		return fmt.Errorf("数据解析失败: %w", err)
	}

	return nil
}

type SponsorUser struct {
	UserID string `json:"user_id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

type SponsorItem struct {
	User         SponsorUser `json:"user"`
	AllSumAmount string      `json:"all_sum_amount"`
	CreateTime   int64       `json:"create_time"`
	FirstPayTime *int64      `json:"first_pay_time"`
	LastPayTime  *int64      `json:"last_pay_time"`
}

type SponsorData struct {
	TotalCount int           `json:"total_count"`
	TotalPage  int           `json:"total_page"`
	List       []SponsorItem `json:"list"`
}

func (c *AfdianClient) QuerySponsor(page int, perPage int) (*SponsorData, error) {
	params := map[string]interface{}{
		"page":     page,
		"per_page": perPage,
	}

	var data SponsorData
	if err := c.request("/query-sponsor", params, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (c *AfdianClient) QueryOrder(params map[string]interface{}) (json.RawMessage, error) {
	var data json.RawMessage
	if err := c.request("/query-order", params, &data); err != nil {
		return nil, err
	}
	return data, nil
}

func (c *AfdianClient) QueryPlan(planID string) (json.RawMessage, error) {
	params := map[string]interface{}{
		"plan_id": planID,
	}
	var data json.RawMessage
	if err := c.request("/query-plan", params, &data); err != nil {
		return nil, err
	}
	return data, nil
}

func (c *AfdianClient) SendMsg(recipient string, content string) (json.RawMessage, error) {
	params := map[string]interface{}{
		"recipient": recipient,
		"content":   content,
	}
	var data json.RawMessage
	if err := c.request("/send-msg", params, &data); err != nil {
		return nil, err
	}
	return data, nil
}

func (c *AfdianClient) QueryRandomReply(outTradeNo string) (json.RawMessage, error) {
	params := map[string]interface{}{
		"out_trade_no": outTradeNo,
	}
	var data json.RawMessage
	if err := c.request("/query-random-reply", params, &data); err != nil {
		return nil, err
	}
	return data, nil
}

func (c *AfdianClient) UpdatePlanReply(params map[string]interface{}) (json.RawMessage, error) {
	var data json.RawMessage
	if err := c.request("/update-plan-reply", params, &data); err != nil {
		return nil, err
	}
	return data, nil
}

func (c *AfdianClient) Ping(params map[string]interface{}) (json.RawMessage, error) {
	var data json.RawMessage
	if err := c.request("/ping", params, &data); err != nil {
		return nil, err
	}
	return data, nil
}
