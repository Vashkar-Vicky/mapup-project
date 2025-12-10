package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"geofencing-system/models"

	"github.com/google/uuid"
)

type CreateGeofenceRequest struct {
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Coordinates [][2]float64 `json:"coordinates"`
	Category    string       `json:"category"`
}

type CreateGeofenceResponse struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
	TimeNs string `json:"time_ns"`
}

type GetGeofencesResponse struct {
	Geofences []models.Geofence `json:"geofences"`
	TimeNs    string            `json:"time_ns"`
}

func (h *Handler) CreateGeofence(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	var req CreateGeofenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate coordinates
	if len(req.Coordinates) < 4 {
		http.Error(w, "Minimum 4 coordinate points required", http.StatusBadRequest)
		return
	}

	// Check if polygon is closed
	if req.Coordinates[0] != req.Coordinates[len(req.Coordinates)-1] {
		http.Error(w, "First and last coordinates must be identical (closed polygon)", http.StatusBadRequest)
		return
	}

	// Validate latitude and longitude ranges
	for _, coord := range req.Coordinates {
		if coord[0] < -90 || coord[0] > 90 {
			http.Error(w, "Latitude must be between -90 and 90", http.StatusBadRequest)
			return
		}
		if coord[1] < -180 || coord[1] > 180 {
			http.Error(w, "Longitude must be between -180 and 180", http.StatusBadRequest)
			return
		}
	}

	// Validate category
	validCategories := map[string]bool{
		"delivery_zone":   true,
		"restricted_zone": true,
		"toll_zone":       true,
		"customer_area":   true,
	}
	if !validCategories[req.Category] {
		http.Error(w, "Invalid category", http.StatusBadRequest)
		return
	}

	// Generate ID
	id := "geo_" + uuid.New().String()[:8]

	// Convert coordinates to JSON string
	coordsJSON, _ := json.Marshal(req.Coordinates)

	// Build WKT polygon string for PostGIS
	wkt := "POLYGON(("
	for i, coord := range req.Coordinates {
		if i > 0 {
			wkt += ","
		}
		wkt += fmt.Sprintf("%f %f", coord[1], coord[0]) // lon lat for WKT
	}
	wkt += "))"

	// Insert into database
	_, err := h.DB.Exec(`
		INSERT INTO geofences (id, name, description, category, coordinates, geom)
		VALUES ($1, $2, $3, $4, $5, ST_GeomFromText($6, 4326))
	`, id, req.Name, req.Description, req.Category, string(coordsJSON), wkt)

	if err != nil {
		http.Error(w, "Failed to create geofence: "+err.Error(), http.StatusInternalServerError)
		return
	}

	elapsed := time.Since(start).Nanoseconds()

	response := CreateGeofenceResponse{
		ID:     id,
		Name:   req.Name,
		Status: "active",
		TimeNs: fmt.Sprintf("%d", elapsed),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) GetGeofences(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	category := r.URL.Query().Get("category")

	var rows *sql.Rows
	var err error

	if category != "" {
		rows, err = h.DB.Query(`
			SELECT id, name, description, category, coordinates, created_at
			FROM geofences
			WHERE category = $1
			ORDER BY created_at DESC
		`, category)
	} else {
		rows, err = h.DB.Query(`
			SELECT id, name, description, category, coordinates, created_at
			FROM geofences
			ORDER BY created_at DESC
		`)
	}

	if err != nil {
		http.Error(w, "Failed to fetch geofences", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	geofences := []models.Geofence{}
	for rows.Next() {
		var g models.Geofence
		var coordsJSON string
		err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.Category, &coordsJSON, &g.CreatedAt)
		if err != nil {
			continue
		}
		json.Unmarshal([]byte(coordsJSON), &g.Coordinates)
		geofences = append(geofences, g)
	}

	elapsed := time.Since(start).Nanoseconds()

	response := GetGeofencesResponse{
		Geofences: geofences,
		TimeNs:    fmt.Sprintf("%d", elapsed),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
