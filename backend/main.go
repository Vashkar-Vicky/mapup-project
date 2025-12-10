package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	"geofencing-system/handlers"
	"geofencing-system/models"
	"geofencing-system/websocket"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"github.com/rs/cors"
)

func main() {
	// Database connection
	// Support DATABASE_URL (Railway, Render, Heroku) or individual env vars
	var connStr string
	databaseURL := os.Getenv("DATABASE_URL")

	if databaseURL != "" {
		// Use DATABASE_URL if provided (deployment platforms)
		connStr = databaseURL
		// Railway/Render may use sslmode=require
		if os.Getenv("DB_SSL_MODE") == "" {
			// Add sslmode if not in URL
			if len(databaseURL) > 0 && databaseURL[len(databaseURL)-1] != '?' {
				if contains(databaseURL, "?") {
					connStr += "&sslmode=require"
				} else {
					connStr += "?sslmode=require"
				}
			}
		}
		log.Println("Using DATABASE_URL for connection")
	} else {
		// Use individual env vars (local development)
		dbHost := getEnv("DB_HOST", "localhost")
		dbPort := getEnv("DB_PORT", "5432")
		dbUser := getEnv("DB_USER", "postgres")
		dbPassword := getEnv("DB_PASSWORD", "postgres")
		dbName := getEnv("DB_NAME", "geofencing")
		sslMode := getEnv("DB_SSL_MODE", "disable")

		connStr = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			dbHost, dbPort, dbUser, dbPassword, dbName, sslMode)
		log.Printf("Using local database connection: %s@%s:%s/%s", dbUser, dbHost, dbPort, dbName)
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	if err = db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	log.Println("Connected to database successfully")

	// Initialize database schema
	if err := models.InitDB(db); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Create handlers
	h := handlers.New(db, hub)

	// Setup router
	r := mux.NewRouter()

	// API endpoints
	r.HandleFunc("/geofences", h.CreateGeofence).Methods("POST")
	r.HandleFunc("/geofences", h.GetGeofences).Methods("GET")
	r.HandleFunc("/vehicles", h.CreateVehicle).Methods("POST")
	r.HandleFunc("/vehicles", h.GetVehicles).Methods("GET")
	r.HandleFunc("/vehicles/location", h.UpdateVehicleLocation).Methods("POST")
	r.HandleFunc("/vehicles/location/{vehicle_id}", h.GetVehicleLocation).Methods("GET")
	r.HandleFunc("/alerts/configure", h.ConfigureAlert).Methods("POST")
	r.HandleFunc("/alerts", h.GetAlerts).Methods("GET")
	r.HandleFunc("/violations/history", h.GetViolationHistory).Methods("GET")

	// WebSocket endpoint
	r.HandleFunc("/ws/alerts", func(w http.ResponseWriter, r *http.Request) {
		websocket.ServeWs(hub, w, r)
	})

	// CORS configuration
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	port := getEnv("PORT", "8080")
	log.Printf("Server starting on port %s", port)

	if err := http.ListenAndServe(":"+port, corsHandler.Handler(r)); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && (s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || containsMiddle(s, substr)))
}

func containsMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
