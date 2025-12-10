package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"geofencing-system/models"
)

type GetViolationHistoryResponse struct {
	Violations []models.Violation `json:"violations"`
	TotalCount int                `json:"total_count"`
	TimeNs     string             `json:"time_ns"`
}

func (h *Handler) GetViolationHistory(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	vehicleID := r.URL.Query().Get("vehicle_id")
	geofenceID := r.URL.Query().Get("geofence_id")
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")
	limitStr := r.URL.Query().Get("limit")

	limit := 50
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			if l > 500 {
				limit = 500
			} else {
				limit = l
			}
		}
	}

	query := `
		SELECT v.id, v.vehicle_id, vh.vehicle_number, v.geofence_id, g.name, v.event_type, v.latitude, v.longitude, v.timestamp
		FROM violations v
		JOIN vehicles vh ON v.vehicle_id = vh.id
		JOIN geofences g ON v.geofence_id = g.id
		WHERE 1=1
	`

	args := []interface{}{}
	argCount := 1

	if vehicleID != "" {
		query += fmt.Sprintf(" AND v.vehicle_id = $%d", argCount)
		args = append(args, vehicleID)
		argCount++
	}

	if geofenceID != "" {
		query += fmt.Sprintf(" AND v.geofence_id = $%d", argCount)
		args = append(args, geofenceID)
		argCount++
	}

	if startDate != "" {
		query += fmt.Sprintf(" AND v.timestamp >= $%d", argCount)
		args = append(args, startDate)
		argCount++
	}

	if endDate != "" {
		query += fmt.Sprintf(" AND v.timestamp <= $%d", argCount)
		args = append(args, endDate)
		argCount++
	}

	// Get total count
	countQuery := "SELECT COUNT(*) FROM (" + query + ") AS count_query"
	var totalCount int
	h.DB.QueryRow(countQuery, args...).Scan(&totalCount)

	// Add ordering and limit
	query += fmt.Sprintf(" ORDER BY v.timestamp DESC LIMIT $%d", argCount)
	args = append(args, limit)

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to fetch violation history", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	violations := []models.Violation{}
	for rows.Next() {
		var v models.Violation
		err := rows.Scan(&v.ID, &v.VehicleID, &v.VehicleNumber, &v.GeofenceID, &v.GeofenceName, &v.EventType, &v.Latitude, &v.Longitude, &v.Timestamp)
		if err != nil {
			continue
		}
		violations = append(violations, v)
	}

	elapsed := time.Since(start).Nanoseconds()

	response := GetViolationHistoryResponse{
		Violations: violations,
		TotalCount: totalCount,
		TimeNs:     fmt.Sprintf("%d", elapsed),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
