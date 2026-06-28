package main

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type IncentiveResult struct {
	ID              uint    `gorm:"primaryKey"`
	Timestamp       string  `gorm:"column:timestamp"`
	ProjectID       uint    `gorm:"column:project_id"`
	UserName        string  `gorm:"column:user_name"`
	CalculatedValue float64 `gorm:"column:calculated_value"`
}

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var results []IncentiveResult
	db.Find(&results)

	fmt.Printf("Total results in DB: %d\n", len(results))
	for _, r := range results {
		fmt.Printf("ID: %d, ProjectID: %d, User: %s, Payout: $%.2f, Timestamp: '%s'\n", r.ID, r.ProjectID, r.UserName, r.CalculatedValue, r.Timestamp)
	}
}
