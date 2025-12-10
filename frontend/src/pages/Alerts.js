import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getAlerts, configureAlert, getGeofences, getVehicles } from '../services/api';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    geofence_id: '',
    vehicle_id: '',
    event_type: 'entry',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [alertsRes, geofencesRes, vehiclesRes] = await Promise.all([
        getAlerts({}),
        getGeofences(),
        getVehicles(),
      ]);
      
      setAlerts(alertsRes.data.alerts);
      setGeofences(geofencesRes.data.geofences);
      setVehicles(vehiclesRes.data.vehicles);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        geofence_id: formData.geofence_id,
        event_type: formData.event_type,
      };
      
      if (formData.vehicle_id) {
        data.vehicle_id = formData.vehicle_id;
      }
      
      await configureAlert(data);
      toast.success('Alert configured successfully!');
      setShowModal(false);
      setFormData({ geofence_id: '', vehicle_id: '', event_type: 'entry' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data || 'Failed to configure alert');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Alert Configuration</h2>
        <p>Set up rules for geofence entry/exit notifications</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3>Alert Rules</h3>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Configure Alert
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <h3>No alert rules configured</h3>
            <p>Create your first alert rule to receive notifications</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Geofence</th>
                <th>Vehicle</th>
                <th>Event Type</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.alert_id}>
                  <td>{alert.geofence_name}</td>
                  <td>{alert.vehicle_number || 'All Vehicles'}</td>
                  <td>
                    <span style={{
                      padding: '0.3rem 0.8rem',
                      borderRadius: '12px',
                      background: alert.event_type === 'entry' ? '#48bb7820' : alert.event_type === 'exit' ? '#f5656520' : '#ed893620',
                      color: alert.event_type === 'entry' ? '#48bb78' : alert.event_type === 'exit' ? '#f56565' : '#ed8936',
                      fontSize: '0.85rem',
                    }}>
                      {alert.event_type}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '0.3rem 0.8rem',
                      borderRadius: '12px',
                      background: alert.status === 'active' ? '#48bb7820' : '#71809620',
                      color: alert.status === 'active' ? '#48bb78' : '#718096',
                      fontSize: '0.85rem',
                    }}>
                      {alert.status}
                    </span>
                  </td>
                  <td>{new Date(alert.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Configure Alert Rule</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Geofence *</label>
                <select
                  value={formData.geofence_id}
                  onChange={(e) => setFormData({ ...formData, geofence_id: e.target.value })}
                  required
                >
                  <option value="">Select a geofence</option>
                  {geofences.map((geo) => (
                    <option key={geo.id} value={geo.id}>
                      {geo.name} ({geo.category})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Vehicle (Optional)</label>
                <select
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                >
                  <option value="">All Vehicles</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicle_number} - {vehicle.driver_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Event Type *</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  required
                >
                  <option value="entry">Entry</option>
                  <option value="exit">Exit</option>
                  <option value="both">Both (Entry & Exit)</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">Configure Alert</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
