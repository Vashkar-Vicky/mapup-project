# Geofencing & Vehicle Tracking System

A full-stack real-time geofencing and vehicle tracking system with WebSocket-based alerts.

## Overview

This application enables users to:
- Create virtual boundaries (geofences) on a map
- Track vehicles in real-time
- Receive instant alerts when vehicles enter or exit geofenced areas
- View historical movement data
- Configure custom alert rules

## Technology Stack

**Backend**: Go, PostgreSQL with PostGIS, WebSocket
**Frontend**: React, Leaflet Maps, Axios
**Infrastructure**: Docker, Docker Compose

## Quick Start

```bash
# Start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8080
```

For detailed setup instructions, see [SETUP.md](./SETUP.md)

## Features

✅ RESTful API with 9 endpoints
✅ Real-time WebSocket alerts
✅ Interactive map interface
✅ Geospatial queries with PostGIS
✅ Point-in-polygon detection
✅ Historical event tracking
✅ Fully containerized with Docker

## API Endpoints

- `POST /geofences` - Create geofence
- `GET /geofences` - List geofences
- `POST /vehicles` - Register vehicle
- `GET /vehicles` - List vehicles
- `POST /vehicles/location` - Update location
- `GET /vehicles/location/{id}` - Get vehicle location
- `POST /alerts/configure` - Configure alerts
- `GET /alerts` - List alert rules
- `GET /violations/history` - Get event history
- `WS /ws/alerts` - WebSocket alerts stream

## Project Structure

```
mapup-project/
├── backend/          # Go API server
├── frontend/         # React application
├── docker-compose.yml
├── SETUP.md         # Detailed setup guide
└── README.md        # This file
```

## Development

See [SETUP.md](./SETUP.md) for:
- Local development setup
- API testing examples
- Deployment instructions
- Troubleshooting guide

## License

Created for MapUp Full-Stack Developer Assessment
