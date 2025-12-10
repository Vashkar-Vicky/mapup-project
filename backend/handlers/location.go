package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"geofencing-system/models"

	"github.com/google/uuid"
)

type UpdateLocationRequest struct {
	VehicleID string    `json:"vehicle_id"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	Timestamp time.Time `json:"timestamp"`
}

type UpdateLocationResponse struct {
	VehicleID        string                  `json:"vehicle_id"`
	LocationUpdated  bool                    `json:"location_updated"`
	CurrentGeofences []models.GeofenceStatus `json:"current_geofences"`
	TimeNs           string                  `json:"time_ns"`
}

type GetLocationResponse struct {
	VehicleID       string `json:"vehicle_id"`
	VehicleNumber   string `json:"vehicle_number"`
	CurrentLocation struct {
		Latitude  float64   `json:"latitude"`
		Longitude float64   `json:"longitude"`
		Timestamp time.Time `json:"timestamp"`
	} `json:"current_location"`
	CurrentGeofences []models.GeofenceStatus `json:"current_geofences"`
	TimeNs           string                  `json:"time_ns"`
}

func (h *Handler) UpdateVehicleLocation(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	var req UpdateLocationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate latitude and longitude
	if req.Latitude < -90 || req.Latitude > 90 {
		http.Error(w, "Latitude must be between -90 and 90", http.StatusBadRequest)
		return
	}
	if req.Longitude < -180 || req.Longitude > 180 {
		http.Error(w, "Longitude must be between -180 and 180", http.StatusBadRequest)
		return
	}

	// Insert location update
	_, err := h.DB.Exec(`
		INSERT INTO vehicle_locations (vehicle_id, latitude, longitude, geom, timestamp)
		VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6)
	`, req.VehicleID, req.Latitude, req.Longitude, req.Longitude, req.Latitude, req.Timestamp)

	if err != nil {
		http.Error(w, "Failed to update location: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get current geofences containing the vehicle
	currentGeofences := h.getGeofencesContainingPoint(req.Latitude, req.Longitude)

	// Get previous geofences
	previousGeofences := h.getPreviousGeofences(req.VehicleID)

	// Detect entry/exit events
	h.detectAndHandleEvents(req.VehicleID, req.Latitude, req.Longitude, req.Timestamp, previousGeofences, currentGeofences)

	elapsed := time.Since(start).Nanoseconds()

	response := UpdateLocationResponse{
		VehicleID:        req.VehicleID,
		LocationUpdated:  true,
		CurrentGeofences: currentGeofences,
		TimeNs:           fmt.Sprintf("%d", elapsed),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) GetVehicleLocation(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	// Extract vehicle_id from URL path
	vehicleID := r.URL.Path[len("/vehicles/location/"):]

	// Get vehicle info
	var vehicleNumber string
	err := h.DB.QueryRow(`SELECT vehicle_number FROM vehicles WHERE id = $1`, vehicleID).Scan(&vehicleNumber)
	if err != nil {
		http.Error(w, "Vehicle not found", http.StatusNotFound)
		return
	}

	// Get latest location
	var lat, lon float64
	var timestamp time.Time
	err = h.DB.QueryRow(`
		SELECT latitude, longitude, timestamp
		FROM vehicle_locations
		WHERE vehicle_id = $1
		ORDER BY timestamp DESC
		LIMIT 1
	`, vehicleID).Scan(&lat, &lon, &timestamp)

	currentGeofences := []models.GeofenceStatus{}
	if err == nil {
		// Get current geofences
		currentGeofences = h.getGeofencesContainingPoint(lat, lon)
	}

	elapsed := time.Since(start).Nanoseconds()

	response := GetLocationResponse{
		VehicleID:        vehicleID,
		VehicleNumber:    vehicleNumber,
		CurrentGeofences: currentGeofences,
		TimeNs:           fmt.Sprintf("%d", elapsed),
	}
	response.CurrentLocation.Latitude = lat
	response.CurrentLocation.Longitude = lon
	response.CurrentLocation.Timestamp = timestamp

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) getGeofencesContainingPoint(lat, lon float64) []models.GeofenceStatus {
	rows, err := h.DB.Query(`
		SELECT id, name, category
		FROM geofences
		WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
	`, lon, lat)

	if err != nil {
		return []models.GeofenceStatus{}
	}
	defer rows.Close()

	geofences := []models.GeofenceStatus{}
	for rows.Next() {
		var g models.GeofenceStatus
		rows.Scan(&g.GeofenceID, &g.GeofenceName, &g.Category)
		g.Status = "inside"
		geofences = append(geofences, g)
	}

	return geofences
}

func (h *Handler) getPreviousGeofences(vehicleID string) map[string]bool {
	rows, err := h.DB.Query(`
		SELECT DISTINCT g.id
		FROM geofences g
		JOIN vehicle_locations vl ON ST_Contains(g.geom, vl.geom)
		WHERE vl.vehicle_id = $1
		AND vl.timestamp = (
			SELECT MAX(timestamp) FROM vehicle_locations WHERE vehicle_id = $1 AND id < (
				SELECT MAX(id) FROM vehicle_locations WHERE vehicle_id = $1
			)
		)
	`, vehicleID)

	previous := make(map[string]bool)
	if err != nil {
		return previous
	}
	defer rows.Close()

	for rows.Next() {
		var geoID string
		rows.Scan(&geoID)
		previous[geoID] = true
	}

	return previous
}

func (h *Handler) detectAndHandleEvents(vehicleID string, lat, lon float64, timestamp time.Time, previousGeofences map[string]bool, currentGeofences []models.GeofenceStatus) {
	currentMap := make(map[string]models.GeofenceStatus)
	for _, g := range currentGeofences {
		currentMap[g.GeofenceID] = g
	}

	// Detect entries
	for geoID, g := range currentMap {
		if !previousGeofences[geoID] {
			// Entry event
			h.handleGeofenceEvent(vehicleID, g.GeofenceID, g.GeofenceName, g.Category, "entry", lat, lon, timestamp)
		}
	}

	// Detect exits
	for geoID := range previousGeofences {
		if _, exists := currentMap[geoID]; !exists {
			// Exit event - need to get geofence details
			var name, category string
			h.DB.QueryRow(`SELECT name, category FROM geofences WHERE id = $1`, geoID).Scan(&name, &category)
			h.handleGeofenceEvent(vehicleID, geoID, name, category, "exit", lat, lon, timestamp)
		}
	}
}

func (h *Handler) handleGeofenceEvent(vehicleID, geofenceID, geofenceName, category, eventType string, lat, lon float64, timestamp time.Time) {
	// Check if there's an alert configured for this event
	var alertExists bool
	err := h.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM alerts
			WHERE geofence_id = $1
			AND (vehicle_id = $2 OR vehicle_id IS NULL)
			AND (event_type = $3 OR event_type = 'both')
			AND status = 'active'
		)
	`, geofenceID, vehicleID, eventType).Scan(&alertExists)

	if err != nil || !alertExists {
		return
	}

	// Store violation
	violationID := "viol_" + uuid.New().String()[:8]
	h.DB.Exec(`
		INSERT INTO violations (id, vehicle_id, geofence_id, event_type, latitude, longitude, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, violationID, vehicleID, geofenceID, eventType, lat, lon, timestamp)

	// Get vehicle details
	var vehicleNumber, driverName string
	h.DB.QueryRow(`SELECT vehicle_number, driver_name FROM vehicles WHERE id = $1`, vehicleID).Scan(&vehicleNumber, &driverName)

	// Send WebSocket alert
	alert := map[string]interface{}{
		"event_id":   "evt_" + uuid.New().String()[:8],
		"event_type": eventType,
		"timestamp":  timestamp,
		"vehicle": map[string]string{
			"vehicle_id":     vehicleID,
			"vehicle_number": vehicleNumber,
			"driver_name":    driverName,
		},
		"geofence": map[string]string{
			"geofence_id":   geofenceID,
			"geofence_name": geofenceName,
			"category":      category,
		},
		"location": map[string]float64{
			"latitude":  lat,
			"longitude": lon,
		},
	}

	alertJSON, _ := json.Marshal(alert)
	h.Hub.Broadcast <- alertJSON
}
