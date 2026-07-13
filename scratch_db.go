package main

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type IncentiveCalculator struct {
	ID        uint    `gorm:"primaryKey;column:id"`
	ProjectID uint    `gorm:"column:project_id"`
	Name      string  `gorm:"column:name"`
	Type      string  `gorm:"column:type"`
	Value     float64 `gorm:"column:value"`
	Status    string  `gorm:"column:status"`
	RulesJSON string  `gorm:"column:rules_json"`
}

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is empty")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var calcs []IncentiveCalculator
	if err := db.Table("incentive_calculators").Find(&calcs).Error; err != nil {
		log.Fatal(err)
	}

	for _, c := range calcs {
		fmt.Printf("Calculator ID: %d | Name: %s | Type: %s | RulesJSON: %s\n", c.ID, c.Name, c.Type, c.RulesJSON)
	}
}
