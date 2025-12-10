import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws/alerts';

export const useWebSocket = () => {
  const [lastAlert, setLastAlert] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  const connect = () => {
    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        toast.success('Real-time alerts connected!', { autoClose: 2000 });
      };

      ws.current.onmessage = (event) => {
        try {
          const alert = JSON.parse(event.data);
          setLastAlert(alert);
          
          // Show toast notification
          const message = `${alert.event_type.toUpperCase()}: ${alert.vehicle.vehicle_number} ${alert.event_type === 'entry' ? 'entered' : 'exited'} ${alert.geofence.geofence_name}`;
          
          if (alert.event_type === 'entry') {
            toast.info(message, { autoClose: 5000 });
          } else {
            toast.warning(message, { autoClose: 5000 });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return { lastAlert, isConnected };
};
