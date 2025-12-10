package websocket

import "time"

type AlertMessage struct {
	EventID   string       `json:"event_id"`
	EventType string       `json:"event_type"`
	Timestamp time.Time    `json:"timestamp"`
	Vehicle   VehicleInfo  `json:"vehicle"`
	Geofence  GeofenceInfo `json:"geofence"`
	Location  LocationInfo `json:"location"`
}

type VehicleInfo struct {
	VehicleID     string `json:"vehicle_id"`
	VehicleNumber string `json:"vehicle_number"`
	DriverName    string `json:"driver_name"`
}

type GeofenceInfo struct {
	GeofenceID   string `json:"geofence_id"`
	GeofenceName string `json:"geofence_name"`
	Category     string `json:"category"`
}

type LocationInfo struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}
