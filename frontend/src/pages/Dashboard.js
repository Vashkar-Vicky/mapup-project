import React, { useState, useEffect } from 'react';
import { getGeofences, getVehicles, getAlerts, getViolationHistory } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

const Dashboard = () => {
  const [stats, setStats] = useState({
    geofences: 0,
    vehicles: 0,
    alerts: 0,
    violations: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const { lastAlert, isConnected } = useWebSocket();

  useEffect(() => {
    loadStats();
    loadRecentAlerts();
  }, []);

  useEffect(() => {
    if (lastAlert) {
      setRecentAlerts(prev => [lastAlert, ...prev.slice(0, 4)]);
    }
  }, [lastAlert]);

  const loadStats = async () => {
    try {
      const [geofencesRes, vehiclesRes, alertsRes, violationsRes] = await Promise.all([
        getGeofences(),
        getVehicles(),
        getAlerts({}),
        getViolationHistory({ limit: 1 }),
      ]);

      setStats({
        geofences: geofencesRes.data.geofences.length,
        vehicles: vehiclesRes.data.vehicles.length,
        alerts: alertsRes.data.alerts.length,
        violations: violationsRes.data.total_count,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentAlerts = async () => {
    try {
      const response = await getViolationHistory({ limit: 5 });
      const formattedAlerts = response.data.violations.map(v => ({
        event_id: v.id,
        event_type: v.event_type,
        timestamp: v.timestamp,
        vehicle: {
          vehicle_number: v.vehicle_number,
        },
        geofence: {
          geofence_name: v.geofence_name,
        },
      }));
      setRecentAlerts(formattedAlerts);
    } catch (error) {
      console.error('Error loading recent alerts:', error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Monitor your geofencing system in real-time</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isConnected ? '#48bb78' : '#f56565',
          }}></div>
          <span style={{ color: '#718096' }}>
            {isConnected ? 'Real-time alerts connected' : 'Connecting to alerts...'}
          </span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Geofences</h4>
          <div className="value">{stats.geofences}</div>
        </div>
        <div className="stat-card">
          <h4>Active Vehicles</h4>
          <div className="value">{stats.vehicles}</div>
        </div>
        <div className="stat-card">
          <h4>Alert Rules</h4>
          <div className="value">{stats.alerts}</div>
        </div>
        <div className="stat-card">
          <h4>Total Events</h4>
          <div className="value">{stats.violations}</div>
        </div>
      </div>

      <div className="card">
        <h3>Recent Alerts</h3>
        {recentAlerts.length === 0 ? (
          <div className="empty-state">
            <p>No recent alerts</p>
          </div>
        ) : (
          recentAlerts.map((alert, index) => (
            <div key={index} className={`alert-item ${alert.event_type}`}>
              <h4>{alert.event_type.toUpperCase()}</h4>
              <p><strong>Vehicle:</strong> {alert.vehicle.vehicle_number}</p>
              <p><strong>Geofence:</strong> {alert.geofence.geofence_name}</p>
              <p><strong>Time:</strong> {new Date(alert.timestamp).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
