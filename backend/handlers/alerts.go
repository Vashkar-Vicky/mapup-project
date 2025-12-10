package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type ConfigureAlertRequest struct {
	GeofenceID string  `json:"geofence_id"`
	VehicleID  *string `json:"vehicle_id,omitempty"`
	EventType  string  `json:"event_type"`
}

type ConfigureAlertResponse struct {
	AlertID    string  `json:"alert_id"`
	GeofenceID string  `json:"geofence_id"`
	VehicleID  *string `json:"vehicle_id,omitempty"`
	EventType  string  `json:"event_type"`
	Status     string  `json:"status"`
	TimeNs     string  `json:"time_ns"`
}

type AlertWithDetails struct {
	AlertID       string    `json:"alert_id"`
	GeofenceID    string    `json:"geofence_id"`
	GeofenceName  string    `json:"geofence_name"`
	VehicleID     *string   `json:"vehicle_id,omitempty"`
	VehicleNumber *string   `json:"vehicle_number,omitempty"`
	EventType     string    `json:"event_type"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

type GetAlertsResponse struct {
	Alerts []AlertWithDetails `json:"alerts"`
	TimeNs string             `json:"time_ns"`
}

func (h *Handler) ConfigureAlert(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	var req ConfigureAlertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate event type
	validEventTypes := map[string]bool{
		"entry": true,
		"exit":  true,
		"both":  true,
	}
	if !validEventTypes[req.EventType] {
		http.Error(w, "Invalid event_type. Must be one of: entry, exit, both", http.StatusBadRequest)
		return
	}

	// Generate ID
	id := "alert_" + uuid.New().String()[:8]

	// Insert alert configuration
	_, err := h.DB.Exec(`
		INSERT INTO alerts (id, geofence_id, vehicle_id, event_type, status)
		VALUES ($1, $2, $3, $4, 'active')
	`, id, req.GeofenceID, req.VehicleID, req.EventType)

	if err != nil {
		http.Error(w, "Failed to configure alert: "+err.Error(), http.StatusInternalServerError)
		return
	}

	elapsed := time.Since(start).Nanoseconds()

	response := ConfigureAlertResponse{
		AlertID:    id,
		GeofenceID: req.GeofenceID,
		VehicleID:  req.VehicleID,
		EventType:  req.EventType,
		Status:     "active",
		TimeNs:     fmt.Sprintf("%d", elapsed),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) GetAlerts(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	geofenceID := r.URL.Query().Get("geofence_id")
	vehicleID := r.URL.Query().Get("vehicle_id")

	query := `
		SELECT a.id, a.geofence_id, g.name, a.vehicle_id, v.vehicle_number, a.event_type, a.status, a.created_at
		FROM alerts a
		JOIN geofences g ON a.geofence_id = g.id
		LEFT JOIN vehicles v ON a.vehicle_id = v.id
		WHERE 1=1
	`

	args := []interface{}{}
	argCount := 1

	if geofenceID != "" {
		query += fmt.Sprintf(" AND a.geofence_id = $%d", argCount)
		args = append(args, geofenceID)
		argCount++
	}

	if vehicleID != "" {
		query += fmt.Sprintf(" AND a.vehicle_id = $%d", argCount)
		args = append(args, vehicleID)
		argCount++
	}

	query += " ORDER BY a.created_at DESC"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to fetch alerts", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	alerts := []AlertWithDetails{}
	for rows.Next() {
		var a AlertWithDetails
		var vehicleID sql.NullString
		var vehicleNumber sql.NullString

		err := rows.Scan(&a.AlertID, &a.GeofenceID, &a.GeofenceName, &vehicleID, &vehicleNumber, &a.EventType, &a.Status, &a.CreatedAt)
		if err != nil {
			continue
		}

		if vehicleID.Valid {
			a.VehicleID = &vehicleID.String
		}
		if vehicleNumber.Valid {
			a.VehicleNumber = &vehicleNumber.String
		}

		alerts = append(alerts, a)
	}

	elapsed := time.Since(start).Nanoseconds()

	response := GetAlertsResponse{
		Alerts: alerts,
		TimeNs: fmt.Sprintf("%d", elapsed),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
