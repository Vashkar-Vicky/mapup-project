import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Geofence API
export const createGeofence = (data) => api.post('/geofences', data);
export const getGeofences = (category) => api.get('/geofences', { params: { category } });

// Vehicle API
export const createVehicle = (data) => api.post('/vehicles', data);
export const getVehicles = () => api.get('/vehicles');
export const updateVehicleLocation = (data) => api.post('/vehicles/location', data);
export const getVehicleLocation = (vehicleId) => api.get(`/vehicles/location/${vehicleId}`);

// Alert API
export const configureAlert = (data) => api.post('/alerts/configure', data);
export const getAlerts = (params) => api.get('/alerts', { params });

// Violation API
export const getViolationHistory = (params) => api.get('/violations/history', { params });

export default api;
