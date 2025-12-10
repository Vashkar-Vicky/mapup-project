package models

import (
	"database/sql"
)

func InitDB(db *sql.DB) error {
	// Enable PostGIS extension
	_, err := db.Exec(`CREATE EXTENSION IF NOT EXISTS postgis;`)
	if err != nil {
		return err
	}

	// Create geofences table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS geofences (
			id VARCHAR(50) PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			description TEXT,
			category VARCHAR(50) NOT NULL,
			coordinates TEXT NOT NULL,
			geom GEOMETRY(POLYGON, 4326),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return err
	}

	// Create vehicles table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS vehicles (
			id VARCHAR(50) PRIMARY KEY,
			vehicle_number VARCHAR(50) UNIQUE NOT NULL,
			driver_name VARCHAR(255) NOT NULL,
			vehicle_type VARCHAR(50) NOT NULL,
			phone VARCHAR(20) NOT NULL,
			status VARCHAR(20) DEFAULT 'active',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return err
	}

	// Create vehicle_locations table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS vehicle_locations (
			id SERIAL PRIMARY KEY,
			vehicle_id VARCHAR(50) REFERENCES vehicles(id),
			latitude DOUBLE PRECISION NOT NULL,
			longitude DOUBLE PRECISION NOT NULL,
			geom GEOMETRY(POINT, 4326),
			timestamp TIMESTAMP NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return err
	}

	// Create alerts table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS alerts (
			id VARCHAR(50) PRIMARY KEY,
			geofence_id VARCHAR(50) REFERENCES geofences(id),
			vehicle_id VARCHAR(50) REFERENCES vehicles(id),
			event_type VARCHAR(20) NOT NULL,
			status VARCHAR(20) DEFAULT 'active',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return err
	}

	// Create violations table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS violations (
			id VARCHAR(50) PRIMARY KEY,
			vehicle_id VARCHAR(50) REFERENCES vehicles(id),
			geofence_id VARCHAR(50) REFERENCES geofences(id),
			event_type VARCHAR(20) NOT NULL,
			latitude DOUBLE PRECISION NOT NULL,
			longitude DOUBLE PRECISION NOT NULL,
			timestamp TIMESTAMP NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return err
	}

	// Create indexes
	_, err = db.Exec(`CREATE INDEX IF NOT EXISTS idx_vehicle_locations_vehicle_id ON vehicle_locations(vehicle_id);`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`CREATE INDEX IF NOT EXISTS idx_vehicle_locations_timestamp ON vehicle_locations(timestamp);`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`CREATE INDEX IF NOT EXISTS idx_violations_vehicle_id ON violations(vehicle_id);`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`CREATE INDEX IF NOT EXISTS idx_violations_geofence_id ON violations(geofence_id);`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`CREATE INDEX IF NOT EXISTS idx_violations_timestamp ON violations(timestamp);`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`CREATE INDEX IF NOT EXISTS idx_geofences_geom ON geofences USING GIST(geom);`)
	if err != nil {
		return err
	}

	return nil
}
