package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	backend "github.com/samnangh849-source/Oder_Backend/Backend"
)

func main() {
	// Set environment variables if needed
	os.Setenv("DB_MAX_RETRIES", "1")
	
	backend.InitDB()
	if backend.DB == nil {
		log.Fatal("DB not initialized")
	}

	var users []backend.User
	if err := backend.DB.Find(&users).Error; err != nil {
		log.Fatal(err)
	}

	fmt.Println("Users in database:")
	for _, u := range users {
		uJSON, _ := json.Marshal(u)
		fmt.Println(string(uJSON))
	}
}
