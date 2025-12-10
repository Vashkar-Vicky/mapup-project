import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import Dashboard from './pages/Dashboard';
import Geofences from './pages/Geofences';
import Vehicles from './pages/Vehicles';
import Alerts from './pages/Alerts';
import History from './pages/History';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const [alertCount, setAlertCount] = useState(0);
  const { lastAlert } = useWebSocket();

  useEffect(() => {
    if (lastAlert) {
      setAlertCount(prev => prev + 1);
    }
  }, [lastAlert]);

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <h1>🚗 Geofencing System</h1>
          </div>
          <ul className="nav-links">
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/geofences">Geofences</Link></li>
            <li><Link to="/vehicles">Vehicles</Link></li>
            <li><Link to="/alerts">Alerts {alertCount > 0 && <span className="badge">{alertCount}</span>}</Link></li>
            <li><Link to="/history">History</Link></li>
          </ul>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/geofences" element={<Geofences />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
}

export default App;
