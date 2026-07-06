package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

type AppsScriptRequest struct {
	Action string `json:"action"`
	Secret string `json:"secret"`
}

func main() {
	appsScriptURL := "https://script.google.com/macros/s/AKfycbzP9oZwcoDZOm643O_1luZuk_qtMMr-jHDyKaO_q4u0sNR8e8cY_oikbvFe8KLMW3Db/exec"
	appsScriptSecret := "168333@$Oudom"

	fmt.Printf("🔍 Diagnose Google Sheets connection...\n")

	requestData := AppsScriptRequest{
		Action: "diagnose",
		Secret: appsScriptSecret,
	}
	jsonData, _ := json.Marshal(requestData)
	respBody, err := http.Post(appsScriptURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Fatalf("❌ Call to Apps Script failed: %v", err)
	}
	defer respBody.Body.Close()

	body, _ := io.ReadAll(respBody.Body)
	var raw interface{}
	json.Unmarshal(body, &raw)
	prettyJSON, _ := json.MarshalIndent(raw, "", "  ")
	fmt.Printf("Result:\n%s\n", string(prettyJSON))
}
