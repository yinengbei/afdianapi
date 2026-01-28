package models

type Sponsor struct {
	UserID       string  `gorm:"column:user_id;primaryKey;size:255"`
	Name         string  `gorm:"column:name;size:255"`
	Avatar       *string `gorm:"column:avatar;type:text"`
	AllSumAmount string  `gorm:"column:all_sum_amount;size:50;default:'0.00'"`
	CreateTime   int64   `gorm:"column:create_time;index:idx_sponsors_create_time"`
	FirstPayTime *int64  `gorm:"column:first_pay_time"`
	LastPayTime  *int64  `gorm:"column:last_pay_time;index:idx_sponsors_last_pay_time"`
	UpdatedAt    int64   `gorm:"column:updated_at"`
}

func (Sponsor) TableName() string {
	return "sponsors"
}
