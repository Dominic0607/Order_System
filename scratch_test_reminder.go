package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type User struct {
	UserName         string `gorm:"primaryKey;column:user_name"`
	FullName         string `gorm:"column:full_name"`
	TelegramUsername string `gorm:"column:telegram_username"`
}

type Store struct {
	StoreName        string `gorm:"primaryKey;column:store_name"`
	TelegramBotToken string `gorm:"column:telegram_bot_token"`
	TelegramGroupID  string `gorm:"column:telegram_group_id"`
	TelegramTopicID  string `gorm:"column:telegram_topic_id"`
}

type Order struct {
	OrderID                  string `gorm:"primaryKey;column:order_id"`
	FulfillmentStatus        string `gorm:"column:fulfillment_status"`
	FulfillmentStore         string `gorm:"column:fulfillment_store"`
	PackedBy                 string `gorm:"column:packed_by"`
	PackedTime               string `gorm:"column:packed_time"`
	PackingStartTime         string `gorm:"column:packing_start_time"`
	LastTelegramReminderTime string `gorm:"column:last_telegram_reminder_time"`
}

func main() {
	// Parse .env.local manually
	envBytes, err := os.ReadFile(".env.local")
	if err == nil {
		lines := strings.Split(string(envBytes), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				val := strings.TrimSpace(parts[1])
				// Strip quotes if present
				val = strings.Trim(val, `"'`)
				os.Setenv(key, val)
			}
		}
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}

	fmt.Println("=== Checking Packing Delayed Orders ===")
	var orders []Order
	err = db.Where("packing_start_time IS NOT NULL AND packing_start_time != ''").Find(&orders).Error
	if err != nil {
		log.Fatalf("Error querying orders: %v", err)
	}

	fmt.Printf("Found %d orders with packing_start_time set.\n", len(orders))
	for _, order := range orders {
		fmt.Printf("\nOrder: %s, Status: %s, Store: %s, PackedBy: %s, PackedTime: %s, StartTime: %s, LastReminder: %s\n",
			order.OrderID, order.FulfillmentStatus, order.FulfillmentStore, order.PackedBy, order.PackedTime, order.PackingStartTime, order.LastTelegramReminderTime)
		
		// Run reminder evaluation
		ict := time.FixedZone("ICT", 7*3600)
		now := time.Now().In(ict)
		startTime, err := time.ParseInLocation("2006-01-02 15:04:05", order.PackingStartTime, ict)
		if err != nil {
			fmt.Printf("  -> Error parsing start time: %v\n", err)
			continue
		}

		elapsed := now.Sub(startTime)
		fmt.Printf("  -> Elapsed: %v (>= 30m: %v)\n", elapsed, elapsed >= 30*time.Minute)

		var store Store
		err = db.Where("store_name = ?", order.FulfillmentStore).First(&store).Error
		if err != nil {
			fmt.Printf("  -> Error fetching store %s: %v\n", order.FulfillmentStore, err)
		} else {
			tokenPrefix := ""
			if len(store.TelegramBotToken) > 6 {
				tokenPrefix = store.TelegramBotToken[:strings.Index(store.TelegramBotToken, ":")+1]
			}
			fmt.Printf("  -> Store Telegram Config: Group=%s, BotTokenPrefix=%s\n", store.TelegramGroupID, tokenPrefix)
		}

		var user User
		var telegramUsername string
		if order.PackedBy != "" {
			err = db.Where("full_name = ? OR user_name = ?", order.PackedBy, order.PackedBy).First(&user).Error
			if err == nil {
				telegramUsername = user.TelegramUsername
				fmt.Printf("  -> User Telegram: %s\n", telegramUsername)
			} else {
				fmt.Printf("  -> User lookup failed: %v\n", err)
			}
		}

		mentionStr := order.PackedBy
		if telegramUsername != "" {
			telegramUsername = strings.TrimSpace(telegramUsername)
			if !strings.HasPrefix(telegramUsername, "@") {
				telegramUsername = "@" + telegramUsername
			}
			mentionStr = telegramUsername
		} else {
			mentionStr = "@" + strings.ReplaceAll(order.PackedBy, " ", "_")
		}

		if elapsed >= 30*time.Minute {
			if store.TelegramBotToken != "" && store.TelegramGroupID != "" {
				elapsedMins := int(elapsed.Minutes())
				msg := fmt.Sprintf("⚠️ *រំលឹកការវេចខ្ចប់យឺត (Packing Reminder - TEST RUN)* ⚠️\n\nអ្នកវេចខ្ចប់៖ %s\nលេខ Order៖ `%s`\nស្ថានភាព៖ កំពុងវេចខ្ចប់យឺតរហូតដល់ *%d នាទី* ហើយ!\nសូមប្រញាប់វេចខ្ចប់ និងបញ្ចប់ការងារ។", mentionStr, order.OrderID, elapsedMins)

				payload := map[string]interface{}{
					"chat_id":    store.TelegramGroupID,
					"text":       msg,
					"parse_mode": "Markdown",
				}
				if store.TelegramTopicID != "" {
					payload["message_thread_id"] = store.TelegramTopicID
				}

				apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", store.TelegramBotToken)
				jsonData, _ := json.Marshal(payload)
				resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(jsonData))
				if err != nil {
					fmt.Printf("  -> API Send Error: %v\n", err)
				} else {
					var resData map[string]interface{}
					json.NewDecoder(resp.Body).Decode(&resData)
					resp.Body.Close()
					fmt.Printf("  -> Telegram API Response: %v\n", resData)
				}
			} else {
				fmt.Println("  -> Telegram config missing")
			}
		} else {
			fmt.Println("  -> Not enough time has elapsed to send reminder (must be >= 30 mins)")
		}
	}
}
