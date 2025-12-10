import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { toast } from 'react-toastify';
import { getVehicles, createVehicle, updateVehicleLocation, getVehicleLocation } from '../services/api';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const LocationPicker = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
};

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleLocations, setVehicleLocations] = useState({});
  const [formData, setFormData] = useState({
    vehicle_number: '',
    driver_name: '',
    vehicle_type: 'car',
    phone: '',
  });
  const [locationData, setLocationData] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
  });

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const response = await getVehicles();
      setVehicles(response.data.vehicles);
      
      // Load locations for all vehicles
      for (const vehicle of response.data.vehicles) {
        loadVehicleLocation(vehicle.id);
      }
    } catch (error) {
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const loadVehicleLocation = async (vehicleId) => {
    try {
      const response = await getVehicleLocation(vehicleId);
      if (response.data.current_location.latitude) {
        setVehicleLocations(prev => ({
          ...prev,
          [vehicleId]: response.data.current_location,
        }));
      }
    } catch (error) {
      console.error('Failed to load vehicle location:', error);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await createVehicle(formData);
      toast.success('Vehicle registered successfully!');
      setShowCreateModal(false);
      setFormData({ vehicle_number: '', driver_name: '', vehicle_type: 'car', phone: '' });
      loadVehicles();
    } catch (error) {
      toast.error(error.response?.data || 'Failed to register vehicle');
    }
  };

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        vehicle_id: selectedVehicle.id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timestamp: new Date().toISOString(),
      };
      
      const response = await updateVehicleLocation(data);
      toast.success('Location updated successfully!');
      
      if (response.data.current_geofences.length > 0) {
        const geofenceNames = response.data.current_geofences.map(g => g.geofence_name).join(', ');
        toast.info(`Vehicle is inside: ${geofenceNames}`);
      }
      
      setShowLocationModal(false);
      loadVehicleLocation(selectedVehicle.id);
    } catch (error) {
      toast.error(error.response?.data || 'Failed to update location');
    }
  };

  const openLocationModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    const location = vehicleLocations[vehicle.id];
    if (location) {
      setLocationData({
        latitude: location.latitude,
        longitude: location.longitude,
      });
    }
    setShowLocationModal(true);
  };

  const handleMapClick = (latlng) => {
    setLocationData({
      latitude: latlng.lat,
      longitude: latlng.lng,
    });
  };

  return (
    <div>
      <div className="page-header">
        <h2>Vehicles</h2>
        <p>Manage and track your fleet</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3>Vehicle Fleet</h3>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + Register Vehicle
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading vehicles...</div>
        ) : vehicles.length === 0 ? (
          <div className="empty-state">
            <h3>No vehicles registered</h3>
            <p>Register your first vehicle to get started</p>
          </div>
        ) : (
          <>
            {Object.keys(vehicleLocations).length > 0 && (
              <div className="map-container">
                <MapContainer center={[37.7749, -122.4194]} zoom={12} style={{ height: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  {vehicles.map((vehicle) => {
                    const location = vehicleLocations[vehicle.id];
                    if (!location || !location.latitude) return null;
                    return (
                      <Marker
                        key={vehicle.id}
                        position={[location.latitude, location.longitude]}
                      >
                        <Popup>
                          <strong>{vehicle.vehicle_number}</strong><br />
                          Driver: {vehicle.driver_name}<br />
                          Type: {vehicle.vehicle_type}<br />
                          Last Update: {new Date(location.timestamp).toLocaleString()}
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            )}

            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle Number</th>
                  <th>Driver</th>
                  <th>Type</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>{vehicle.vehicle_number}</td>
                    <td>{vehicle.driver_name}</td>
                    <td>{vehicle.vehicle_type}</td>
                    <td>{vehicle.phone}</td>
                    <td>
                      <span style={{
                        padding: '0.3rem 0.8rem',
                        borderRadius: '12px',
                        background: vehicle.status === 'active' ? '#48bb7820' : '#71809620',
                        color: vehicle.status === 'active' ? '#48bb78' : '#718096',
                        fontSize: '0.85rem',
                      }}>
                        {vehicle.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        onClick={() => openLocationModal(vehicle)}
                      >
                        Update Location
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Create Vehicle Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Register New Vehicle</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label>Vehicle Number *</label>
                <input
                  type="text"
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  placeholder="KA-01-AB-1234"
                  required
                />
              </div>
              <div className="form-group">
                <label>Driver Name *</label>
                <input
                  type="text"
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Vehicle Type *</label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  required
                >
                  <option value="car">Car</option>
                  <option value="truck">Truck</option>
                  <option value="van">Van</option>
                  <option value="motorcycle">Motorcycle</option>
                </select>
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1234567890"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">Register Vehicle</button>
            </form>
          </div>
        </div>
      )}

      {/* Update Location Modal */}
      {showLocationModal && selectedVehicle && (
        <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Location - {selectedVehicle.vehicle_number}</h3>
              <button className="close-btn" onClick={() => setShowLocationModal(false)}>&times;</button>
            </div>
            <p style={{ color: '#718096', marginBottom: '1rem' }}>Click on the map to set location</p>
            <div className="map-container">
              <MapContainer center={[locationData.latitude, locationData.longitude]} zoom={13} style={{ height: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <LocationPicker onLocationSelect={handleMapClick} />
                <Marker position={[locationData.latitude, locationData.longitude]}>
                  <Popup>New Location</Popup>
                </Marker>
              </MapContainer>
            </div>
            <form onSubmit={handleLocationSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={locationData.latitude}
                    onChange={(e) => setLocationData({ ...locationData, latitude: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={locationData.longitude}
                    onChange={(e) => setLocationData({ ...locationData, longitude: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Update Location</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicles;
