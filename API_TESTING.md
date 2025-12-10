# API Testing Guide

This guide provides example curl commands to test all API endpoints.

## Prerequisites

Make sure the backend is running:
```bash
docker-compose up backend
# OR
cd backend && go run main.go
```

Backend should be available at: http://localhost:8080

## 1. Create a Geofence

```bash
curl -X POST http://localhost:8080/geofences \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Delivery Zone",
    "description": "Main delivery area for downtown customers",
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

**Expected Response:**
```json
{
  "id": "geo_12345678",
  "name": "Downtown Delivery Zone",
  "status": "active",
  "time_ns": "1234567"
}
```

## 2. Get All Geofences

```bash
# Get all geofences
curl http://localhost:8080/geofences

# Filter by category
curl "http://localhost:8080/geofences?category=delivery_zone"
```

## 3. Register a Vehicle

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

**Expected Response:**
```json
{
  "id": "veh_12345678",
  "vehicle_number": "KA-01-AB-1234",
  "status": "active",
  "time_ns": "1123456"
}
```

## 4. Get All Vehicles

```bash
curl http://localhost:8080/vehicles
```

## 5. Update Vehicle Location

**Important:** Replace `veh_12345678` with actual vehicle ID from step 3

```bash
curl -X POST http://localhost:8080/vehicles/location \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "veh_12345678",
    "latitude": 37.7799,
    "longitude": 122.4144,
    "timestamp": "2025-12-10T10:35:00Z"
  }'
```

**Expected Response:**
```json
{
  "vehicle_id": "veh_12345678",
  "location_updated": true,
  "current_geofences": [
    {
      "geofence_id": "geo_12345678",
      "geofence_name": "Downtown Delivery Zone",
      "status": "inside"
    }
  ],
  "time_ns": "2345678"
}
```

## 6. Get Vehicle Location

```bash
curl http://localhost:8080/vehicles/location/veh_12345678
```

## 7. Configure Alert

**Important:** Replace IDs with actual values from previous steps

```bash
curl -X POST http://localhost:8080/alerts/configure \
  -H "Content-Type: application/json" \
  -d '{
    "geofence_id": "geo_12345678",
    "vehicle_id": "veh_12345678",
    "event_type": "entry"
  }'
```

**Alert for all vehicles:**
```bash
curl -X POST http://localhost:8080/alerts/configure \
  -H "Content-Type: application/json" \
  -d '{
    "geofence_id": "geo_12345678",
    "event_type": "both"
  }'
```

## 8. Get All Alerts

```bash
# Get all alerts
curl http://localhost:8080/alerts

# Filter by geofence
curl "http://localhost:8080/alerts?geofence_id=geo_12345678"

# Filter by vehicle
curl "http://localhost:8080/alerts?vehicle_id=veh_12345678"
```

## 9. Get Violation History

```bash
# Get recent violations
curl http://localhost:8080/violations/history

# With filters
curl "http://localhost:8080/violations/history?vehicle_id=veh_12345678&limit=100"

# With date range
curl "http://localhost:8080/violations/history?start_date=2025-12-01T00:00:00Z&end_date=2025-12-31T23:59:59Z"

# Multiple filters
curl "http://localhost:8080/violations/history?vehicle_id=veh_12345678&geofence_id=geo_12345678&limit=50"
```

## 10. Test WebSocket Connection

### Using wscat (install: npm install -g wscat)

```bash
wscat -c ws://localhost:8080/ws/alerts
```

Keep this connection open, then trigger an alert by updating a vehicle location that enters a geofenced area with a configured alert.

### Using JavaScript

```javascript
const ws = new WebSocket('ws://localhost:8080/ws/alerts');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const alert = JSON.parse(event.data);
  console.log('Alert received:', alert);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

## Complete Test Workflow

1. **Create a geofence** (save the geofence ID)
2. **Register a vehicle** (save the vehicle ID)
3. **Configure an alert** for the geofence and vehicle
4. **Connect to WebSocket** to receive real-time alerts
5. **Update vehicle location** inside the geofence
6. **Observe the WebSocket alert** in real-time
7. **Update vehicle location** outside the geofence
8. **Observe the exit alert** (if configured)
9. **Check violation history** to see all events

## Testing Different Scenarios

### Scenario 1: Vehicle Enters Restricted Zone
```bash
# Create restricted zone
curl -X POST http://localhost:8080/geofences \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Restricted Area",
    "description": "No entry zone",
    "coordinates": [[37.78, -122.42], [37.79, -122.42], [37.79, -122.41], [37.78, -122.41], [37.78, -122.42]],
    "category": "restricted_zone"
  }'

# Configure alert for all vehicles
curl -X POST http://localhost:8080/alerts/configure \
  -H "Content-Type: application/json" \
  -d '{"geofence_id": "geo_xxx", "event_type": "entry"}'

# Move vehicle into zone
curl -X POST http://localhost:8080/vehicles/location \
  -H "Content-Type: application/json" \
  -d '{"vehicle_id": "veh_xxx", "latitude": 37.785, "longitude": -122.415, "timestamp": "2025-12-10T11:00:00Z"}'
```

### Scenario 2: Multiple Geofences
Create several overlapping geofences and move a vehicle through them to test:
- Entry detection
- Exit detection
- Multiple geofence containment
- Alert triggering

## Error Cases to Test

### Invalid Coordinates
```bash
curl -X POST http://localhost:8080/geofences \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "coordinates": [[95, -200]], "category": "delivery_zone"}'
```

### Non-closed Polygon
```bash
curl -X POST http://localhost:8080/geofences \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "coordinates": [[37.77, -122.41], [37.78, -122.41], [37.78, -122.40]], "category": "delivery_zone"}'
```

### Invalid Vehicle ID
```bash
curl -X POST http://localhost:8080/vehicles/location \
  -H "Content-Type: application/json" \
  -d '{"vehicle_id": "invalid_id", "latitude": 37.78, "longitude": -122.41, "timestamp": "2025-12-10T12:00:00Z"}'
```

## Performance Testing

Check execution times in the `time_ns` field:
```bash
for i in {1..10}; do
  curl -s http://localhost:8080/vehicles | jq '.time_ns'
done
```

## Tips

- Use `jq` for pretty-printing JSON: `curl ... | jq`
- Save IDs in variables: `GEOFENCE_ID="geo_12345678"`
- Use Postman or Insomnia for easier API testing
- Check backend logs for detailed error messages
- WebSocket alerts are sent only when alert rules match

## Troubleshooting

**No alerts received:**
- Verify alert configuration exists
- Check vehicle is actually entering/exiting the geofence
- Ensure WebSocket connection is established
- Check backend logs for errors

**Location not updating:**
- Verify vehicle ID is correct
- Check latitude/longitude are within valid ranges
- Ensure timestamp is in ISO 8601 format

**Geofence not created:**
- Verify polygon is closed (first = last coordinate)
- Check at least 4 points provided
- Ensure coordinates are in [lat, lon] format
- Validate latitude (-90 to 90) and longitude (-180 to 180)
