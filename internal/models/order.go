package models

type Order struct {
	OutTradeNo     string     `gorm:"column:out_trade_no;primaryKey;size:255"`
	CustomOrderID  *string    `gorm:"column:custom_order_id;size:255"`
	UserID         string     `gorm:"column:user_id;size:255;index:idx_orders_user_id"`
	UserPrivateID  *string    `gorm:"column:user_private_id;size:255"`
	PlanID         *string    `gorm:"column:plan_id;size:255;index:idx_orders_plan_id"`
	Month          int        `gorm:"column:month;default:1"`
	TotalAmount    string     `gorm:"column:total_amount;size:50"`
	ShowAmount     string     `gorm:"column:show_amount;size:50"`
	Status         int        `gorm:"column:status;index:idx_orders_status"`
	Remark         *string    `gorm:"column:remark;type:text"`
	RedeemID       *string    `gorm:"column:redeem_id;size:255"`
	ProductType    int        `gorm:"column:product_type;default:0"`
	Discount       string     `gorm:"column:discount;size:50;default:'0.00'"`
	AddressPerson  *string    `gorm:"column:address_person;size:255"`
	AddressPhone   *string    `gorm:"column:address_phone;size:255"`
	AddressAddress *string    `gorm:"column:address_address;type:text"`
	CreatedAt      int64      `gorm:"column:created_at;index:idx_orders_created_at"`
	UpdatedAt      int64      `gorm:"column:updated_at"`
	Skus           []OrderSku `gorm:"foreignKey:OutTradeNo;references:OutTradeNo;constraint:OnDelete:CASCADE"`
}

func (Order) TableName() string {
	return "orders"
}

type OrderSku struct {
	ID         uint    `gorm:"column:id;primaryKey;autoIncrement"`
	OutTradeNo string  `gorm:"column:out_trade_no;size:255;index:idx_order_skus_out_trade_no"`
	SkuID      string  `gorm:"column:sku_id;size:255;index:idx_order_skus_sku_id"`
	Count      int     `gorm:"column:count;default:1"`
	Name       *string `gorm:"column:name;size:255"`
	AlbumID    *string `gorm:"column:album_id;size:255"`
	Pic        *string `gorm:"column:pic;type:text"`
}

func (OrderSku) TableName() string {
	return "order_skus"
}
