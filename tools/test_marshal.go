package main

import (
	"encoding/json"
	"fmt"
)

type User struct {
	UserName          string `json:"UserName"`
	Password          string `json:"Password,omitempty"`
	Team              string `json:"Team"`
	FullName          string `json:"FullName"`
	ProfilePictureURL string `json:"ProfilePictureURL"`
	Role              string `json:"Role"`
	IsSystemAdmin     bool   `json:"IsSystemAdmin"`
	TelegramUsername  string `json:"TelegramUsername"`
}

func main() {
	var orderRequest struct {
		CurrentUser      User                     `json:"currentUser"`
		SelectedTeam     string                   `json:"selectedTeam"`
		Page             string                   `json:"page"`
	}

	orderRequest.CurrentUser.UserName = "Dom"
	orderRequest.SelectedTeam = "Thoeun"
	orderRequest.Page = "MyPage"

	orderData := map[string]interface{}{
		"orderId": "12345",
		"originalRequest": orderRequest,
	}

	jsonData, _ := json.MarshalIndent(orderData, "", "  ")
	fmt.Println(string(jsonData))
}
