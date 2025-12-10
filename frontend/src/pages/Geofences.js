import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import { toast } from 'react-toastify';
import { getGeofences, createGeofence } from '../services/api';

const Geofences = () => {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'delivery_zone',
    coordinates: '',
  });

  useEffect(() => {
    loadGeofences();
  }, [filter]);

  const loadGeofences = async () => {
    try {
      setLoading(true);
      const response = await getGeofences(filter);
      setGeofences(response.data.geofences);
    } catch (error) {
      toast.error('Failed to load geofences');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Parse coordinates from textarea
      const coordLines = formData.coordinates.trim().split('\n');
      const coords = coordLines.map(line => {
        const [lat, lon] = line.split(',').map(s => parseFloat(s.trim()));
        return [lat, lon];
      });

      // Ensure polygon is closed
      if (JSON.stringify(coords[0]) !== JSON.stringify(coords[coords.length - 1])) {
        coords.push(coords[0]);
      }

      const data = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        coordinates: coords,
      };

      await createGeofence(data);
      toast.success('Geofence created successfully!');
      setShowModal(false);
      setFormData({ name: '', description: '', category: 'delivery_zone', coordinates: '' });
      loadGeofences();
    } catch (error) {
      toast.error(error.response?.data || 'Failed to create geofence');
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      delivery_zone: '#48bb78',
      restricted_zone: '#f56565',
      toll_zone: '#ed8936',
      customer_area: '#4299e1',
    };
    return colors[category] || '#667eea';
  };

  return (
    <div>
      <div className="page-header">
        <h2>Geofences</h2>
        <p>Manage virtual boundaries for vehicle tracking</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: '200px', padding: '0.7rem', borderRadius: '6px', border: '2px solid #e2e8f0' }}
          >
            <option value="">All Categories</option>
            <option value="delivery_zone">Delivery Zone</option>
            <option value="restricted_zone">Restricted Zone</option>
            <option value="toll_zone">Toll Zone</option>
            <option value="customer_area">Customer Area</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Create Geofence
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading geofences...</div>
        ) : geofences.length === 0 ? (
          <div className="empty-state">
            <h3>No geofences yet</h3>
            <p>Create your first geofence to get started</p>
          </div>
        ) : (
          <>
            <div className="map-container">
              <MapContainer center={[37.7749, -122.4194]} zoom={12} style={{ height: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {geofences.map((geo) => (
                  <Polygon
                    key={geo.id}
                    positions={geo.coordinates.map(c => [c[0], c[1]])}
                    pathOptions={{ color: getCategoryColor(geo.category) }}
                  >
                    <Popup>
                      <strong>{geo.name}</strong><br />
                      {geo.description}<br />
                      <em>{geo.category.replace('_', ' ')}</em>
                    </Popup>
                  </Polygon>
                ))}
              </MapContainer>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {geofences.map((geo) => (
                  <tr key={geo.id}>
                    <td>{geo.name}</td>
                    <td>
                      <span style={{
                        padding: '0.3rem 0.8rem',
                        borderRadius: '12px',
                        background: getCategoryColor(geo.category) + '20',
                        color: getCategoryColor(geo.category),
                        fontSize: '0.85rem',
                      }}>
                        {geo.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{geo.description}</td>
                    <td>{new Date(geo.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Geofence</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="delivery_zone">Delivery Zone</option>
                  <option value="restricted_zone">Restricted Zone</option>
                  <option value="toll_zone">Toll Zone</option>
                  <option value="customer_area">Customer Area</option>
                </select>
              </div>
              <div className="form-group">
                <label>Coordinates * (one per line: latitude, longitude)</label>
                <textarea
                  rows="6"
                  value={formData.coordinates}
                  onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                  placeholder="37.7749, -122.4194&#10;37.7849, -122.4194&#10;37.7849, -122.4094&#10;37.7749, -122.4094"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">Create Geofence</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Geofences;
