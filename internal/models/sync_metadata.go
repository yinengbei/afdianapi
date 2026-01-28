package models

type SyncMetadata struct {
	ID        uint   `gorm:"column:id;primaryKey;autoIncrement"`
	Key       string `gorm:"column:key;size:255;uniqueIndex:idx_sync_metadata_key"`
	Value     string `gorm:"column:value;type:text"`
	UpdatedAt int64  `gorm:"column:updated_at"`
}

func (SyncMetadata) TableName() string {
	return "sync_metadata"
}
