import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getViolationHistory, getGeofences, getVehicles } from '../services/api';

const History = () => {
  const [violations, setViolations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [geofences, setGeofences] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [filters, setFilters] = useState({
    vehicle_id: '',
    geofence_id: '',
    start_date: '',
    end_date: '',
    limit: 50,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadViolations();
  }, [filters]);

  const loadData = async () => {
    try {
      const [geofencesRes, vehiclesRes] = await Promise.all([
        getGeofences(),
        getVehicles(),
      ]);
      
      setGeofences(geofencesRes.data.geofences);
      setVehicles(vehiclesRes.data.vehicles);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const loadViolations = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.vehicle_id) params.vehicle_id = filters.vehicle_id;
      if (filters.geofence_id) params.geofence_id = filters.geofence_id;
      if (filters.start_date) params.start_date = new Date(filters.start_date).toISOString();
      if (filters.end_date) params.end_date = new Date(filters.end_date).toISOString();
      params.limit = filters.limit;

      const response = await getViolationHistory(params);
      setViolations(response.data.violations);
      setTotalCount(response.data.total_count);
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      vehicle_id: '',
      geofence_id: '',
      start_date: '',
      end_date: '',
      limit: 50,
    });
  };

  return (
    <div>
      <div className="page-header">
        <h2>Violation History</h2>
        <p>View historical geofence entry/exit events</p>
      </div>

      <div className="card">
        <h3>Filters</h3>
        <div className="filter-bar">
          <select
            value={filters.vehicle_id}
            onChange={(e) => setFilters({ ...filters, vehicle_id: e.target.value })}
          >
            <option value="">All Vehicles</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicle_number}
              </option>
            ))}
          </select>

          <select
            value={filters.geofence_id}
            onChange={(e) => setFilters({ ...filters, geofence_id: e.target.value })}
          >
            <option value="">All Geofences</option>
            {geofences.map((geo) => (
              <option key={geo.id} value={geo.id}>
                {geo.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            placeholder="Start Date"
          />

          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            placeholder="End Date"
          />

          <select
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
            style={{ maxWidth: '150px' }}
          >
            <option value="50">50 records</option>
            <option value="100">100 records</option>
            <option value="200">200 records</option>
            <option value="500">500 records</option>
          </select>

          <button className="btn btn-secondary" onClick={resetFilters}>
            Reset Filters
          </button>
        </div>

        <p style={{ color: '#718096', marginBottom: '1rem' }}>
          Showing {violations.length} of {totalCount} total events
        </p>

        {loading ? (
          <div className="loading">Loading history...</div>
        ) : violations.length === 0 ? (
          <div className="empty-state">
            <h3>No events found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Vehicle</th>
                <th>Geofence</th>
                <th>Event</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((violation) => (
                <tr key={violation.id}>
                  <td>{new Date(violation.timestamp).toLocaleString()}</td>
                  <td>{violation.vehicle_number}</td>
                  <td>{violation.geofence_name}</td>
                  <td>
                    <span style={{
                      padding: '0.3rem 0.8rem',
                      borderRadius: '12px',
                      background: violation.event_type === 'entry' ? '#48bb7820' : '#f5656520',
                      color: violation.event_type === 'entry' ? '#48bb78' : '#f56565',
                      fontSize: '0.85rem',
                    }}>
                      {violation.event_type}
                    </span>
                  </td>
                  <td>
                    {violation.latitude.toFixed(4)}, {violation.longitude.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default History;
