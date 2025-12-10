package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"geofencing-system/models"

	"github.com/google/uuid"
)

type CreateVehicleRequest struct {
	VehicleNumber string `json:"vehicle_number"`
	DriverName    string `json:"driver_name"`
	VehicleType   string `json:"vehicle_type"`
	Phone         string `json:"phone"`
}

type CreateVehicleResponse struct {
	ID            string `json:"id"`
	VehicleNumber string `json:"vehicle_number"`
	Status        string `json:"status"`
	TimeNs        string `json:"time_ns"`
}

type GetVehiclesResponse struct {
	Vehicles []models.Vehicle `json:"vehicles"`
	TimeNs   string           `json:"time_ns"`
}

func (h *Handler) CreateVehicle(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	var req CreateVehicleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.VehicleNumber == "" || req.DriverName == "" || req.VehicleType == "" || req.Phone == "" {
		http.Error(w, "All fields are required", http.StatusBadRequest)
		return
	}

	// Generate ID
	id := "veh_" + uuid.New().String()[:8]

	// Insert into database
	_, err := h.DB.Exec(`
		INSERT INTO vehicles (id, vehicle_number, driver_name, vehicle_type, phone, status)
		VALUES ($1, $2, $3, $4, $5, 'active')
	`, id, req.VehicleNumber, req.DriverName, req.VehicleType, req.Phone)

	if err != nil {
		http.Error(w, "Failed to create vehicle: "+err.Error(), http.StatusInternalServerError)
		return
	}

	elapsed := time.Since(start).Nanoseconds()

	response := CreateVehicleResponse{
		ID:            id,
		VehicleNumber: req.VehicleNumber,
		Status:        "active",
		TimeNs:        fmt.Sprintf("%d", elapsed),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) GetVehicles(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	rows, err := h.DB.Query(`
		SELECT id, vehicle_number, driver_name, vehicle_type, phone, status, created_at
		FROM vehicles
		ORDER BY created_at DESC
	`)
	if err != nil {
		http.Error(w, "Failed to fetch vehicles", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	vehicles := []models.Vehicle{}
	for rows.Next() {
		var v models.Vehicle
		err := rows.Scan(&v.ID, &v.VehicleNumber, &v.DriverName, &v.VehicleType, &v.Phone, &v.Status, &v.CreatedAt)
		if err != nil {
			continue
		}
		vehicles = append(vehicles, v)
	}

	elapsed := time.Since(start).Nanoseconds()

	response := GetVehiclesResponse{
		Vehicles: vehicles,
		TimeNs:   fmt.Sprintf("%d", elapsed),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
