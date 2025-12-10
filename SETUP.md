# Geofencing & Vehicle Tracking System

A comprehensive full-stack application for real-time vehicle tracking and geofencing with WebSocket-based alerts.

## 🎯 Features

- **Geofence Management**: Create and manage virtual boundaries using polygon coordinates
- **Vehicle Tracking**: Register vehicles and track their real-time locations
- **Real-time Alerts**: WebSocket-based instant notifications for geofence entry/exit events
- **Interactive Maps**: Visual representation of geofences and vehicle positions using Leaflet
- **Alert Configuration**: Set up custom alert rules for specific vehicles and geofences
- **Violation History**: Track and query historical geofence events with filtering

## 🛠️ Technology Stack

### Backend
- **Language**: Go 1.21
- **Database**: PostgreSQL with PostGIS extension
- **Real-time**: WebSocket using Gorilla WebSocket
- **Router**: Gorilla Mux
- **CORS**: RS CORS

### Frontend
- **Framework**: React 18.2
- **Maps**: React Leaflet
- **HTTP Client**: Axios
- **Routing**: React Router DOM
- **Notifications**: React Toastify

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostGIS (PostgreSQL with spatial extensions)

## 📋 Prerequisites

- Docker and Docker Compose
- Go 1.21+ (for local development)
- Node.js 18+ (for local development)
- Git

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd mapup-project
```

2. **Start all services**
```bash
docker-compose up --build
```

This will start:
- PostgreSQL with PostGIS on port 5432
- Backend API on port 8080
- Frontend application on port 3000

3. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- WebSocket: ws://localhost:8080/ws/alerts

### Local Development Setup

#### Backend Setup

1. **Install PostgreSQL with PostGIS**
```bash
# macOS
brew install postgresql postgis

# Start PostgreSQL
brew services start postgresql

# Create database
createdb geofencing
psql geofencing -c "CREATE EXTENSION postgis;"
```

2. **Configure environment**
```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
```

3. **Install dependencies**
```bash
go mod download
```

4. **Run the backend**
```bash
go run main.go
```

The API will be available at http://localhost:8080

#### Frontend Setup

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env if needed
```

3. **Start development server**
```bash
npm start
```

The application will be available at http://localhost:3000

## 📡 API Endpoints

### Geofences
- `POST /geofences` - Create a new geofence
- `GET /geofences?category=<category>` - Get all geofences (with optional filtering)

### Vehicles
- `POST /vehicles` - Register a new vehicle
- `GET /vehicles` - Get all vehicles
- `POST /vehicles/location` - Update vehicle location
- `GET /vehicles/location/{vehicle_id}` - Get vehicle location

### Alerts
- `POST /alerts/configure` - Configure alert rule
- `GET /alerts?geofence_id=<id>&vehicle_id=<id>` - Get alert configurations

### Violations
- `GET /violations/history` - Get violation history with filtering

### WebSocket
- `WS /ws/alerts` - Real-time alert stream

## 🧪 Testing the API

### Create a Geofence
```bash
curl -X POST http://localhost:8080/geofences \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Zone",
    "description": "Main delivery area",
    "coordinates": [
      [37.7749, -122.4194],
      [37.7849, -122.4194],
      [37.7849, -122.4094],
      [37.7749, -122.4094],
      [37.7749, -122.4194]
    ],
    "category": "delivery_zone"
  }'
```

### Register a Vehicle
```bash
curl -X POST http://localhost:8080/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_number": "KA-01-AB-1234",
    "driver_name": "John Doe",
    "vehicle_type": "truck",
    "phone": "+1234567890"
  }'
```

### Update Vehicle Location
```bash
curl -X POST http://localhost:8080/vehicles/location \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "veh_xxx",
    "latitude": 37.7849,
    "longitude": -122.4194,
    "timestamp": "2025-01-15T10:35:00Z"
  }'
```

### Configure Alert
```bash
curl -X POST http://localhost:8080/alerts/configure \
  -H "Content-Type: application/json" \
  -d '{
    "geofence_id": "geo_xxx",
    "vehicle_id": "veh_xxx",
    "event_type": "entry"
  }'
```

## 🎨 Using the Frontend

1. **Dashboard**: View system statistics and recent alerts
2. **Geofences**: 
   - Create new geofences by entering coordinates
   - View all geofences on an interactive map
   - Filter by category
3. **Vehicles**:
   - Register new vehicles
   - Update vehicle locations using map clicks or coordinates
   - View all vehicles on the map
4. **Alerts**:
   - Configure alert rules for specific geofences
   - Set up alerts for all vehicles or specific ones
   - Choose entry, exit, or both event types
5. **History**:
   - View all geofence events
   - Filter by vehicle, geofence, date range
   - Export data (future feature)

## 📦 Docker Hub

To push the backend image to Docker Hub:

```bash
# Build the image
docker build -t your-username/geofencing-backend:latest ./backend

# Login to Docker Hub
docker login

# Push the image
docker push your-username/geofencing-backend:latest
```

## 🚢 Deployment

### Backend Deployment

The backend can be deployed to any platform supporting Docker:
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform
- Heroku

Example for a cloud platform:
```bash
# Set environment variables
DB_HOST=your-postgres-host
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=geofencing
PORT=8080
```

### Frontend Deployment

Deploy to Vercel, Netlify, or Cloudflare Pages:

**Vercel:**
```bash
cd frontend
vercel deploy
```

**Netlify:**
```bash
cd frontend
npm run build
netlify deploy --prod --dir=build
```

Set environment variables:
- `REACT_APP_API_URL`: Your backend API URL
- `REACT_APP_WS_URL`: Your WebSocket URL

## 🏗️ Project Structure

```
mapup-project/
├── backend/
│   ├── handlers/          # HTTP request handlers
│   ├── models/            # Data models and DB schema
│   ├── websocket/         # WebSocket hub and client
│   ├── main.go            # Application entry point
│   ├── go.mod             # Go dependencies
│   └── Dockerfile         # Backend container config
├── frontend/
│   ├── public/            # Static files
│   ├── src/
│   │   ├── pages/         # React page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service layer
│   │   ├── App.js         # Main app component
│   │   └── index.js       # App entry point
│   ├── package.json       # Node dependencies
│   └── Dockerfile         # Frontend container config
├── docker-compose.yml     # Multi-container orchestration
├── SETUP.md              # This file
└── README.md             # Project overview
```

## 🔍 Key Features Explained

### Point-in-Polygon Detection
The system uses PostGIS's `ST_Contains` function for efficient geospatial queries to determine if a vehicle is within a geofence.

### Real-time Alerts
When a vehicle location is updated:
1. The system checks all geofences using PostGIS spatial queries
2. Compares with previous location to detect entry/exit events
3. Checks configured alert rules
4. Broadcasts alerts to all connected WebSocket clients
5. Stores events in the violations table

### Execution Time Tracking
Every API response includes a `time_ns` field showing execution time in nanoseconds, useful for performance monitoring.

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs postgres

# Restart services
docker-compose restart
```

### WebSocket Connection Failed
- Ensure backend is running
- Check CORS settings
- Verify WebSocket URL in frontend `.env`

### Map Not Loading
- Check internet connection (tiles load from OpenStreetMap)
- Verify Leaflet CSS is loaded
- Check browser console for errors

## 📝 Notes

- All coordinates use [latitude, longitude] format
- Geofence polygons must be closed (first = last coordinate)
- Latitude range: -90 to 90
- Longitude range: -180 to 180
- Default limit for history queries: 50 (max: 500)

## 🔐 Security Considerations

For production deployment:
- Enable authentication (JWT recommended)
- Use HTTPS/WSS for secure connections
- Implement rate limiting
- Use environment variables for sensitive data
- Enable database connection pooling
- Set up proper CORS policies

## 📄 License

This project is created for the MapUp assessment.

## 🤝 Support

For questions or issues, contact the development team.
