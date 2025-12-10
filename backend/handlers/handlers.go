package handlers

import (
	"database/sql"
	"geofencing-system/websocket"
)

type Handler struct {
	DB  *sql.DB
	Hub *websocket.Hub
}

func New(db *sql.DB, hub *websocket.Hub) *Handler {
	return &Handler{
		DB:  db,
		Hub: hub,
	}
}
