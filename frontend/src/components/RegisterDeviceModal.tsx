import React, { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { ApiService } from '../services/api';

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceRegistered: (deviceId: string) => void;
}

export const RegisterDeviceModal: React.FC<RegisterDeviceModalProps> = ({
  isOpen,
  onClose,
  onDeviceRegistered,
}) => {
  const [deviceId, setDeviceId] = useState('CF-DEVICE-001');
  const [name, setName] = useState('Temperature Sensor 001');
  const [deviceType, setDeviceType] = useState('ENVIRONMENTAL_MONITOR');
  const [location, setLocation] = useState('Warehouse-Bay-1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await ApiService.registerDevice({
        deviceId: deviceId.trim().toUpperCase(),
        name: name.trim(),
        deviceType,
        location: location.trim(),
      });
      onDeviceRegistered(deviceId.trim().toUpperCase());
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Register Simulated IoT Device</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="command-form">
          <div className="form-group">
            <label className="form-label">Device Identifier (ID)</label>
            <input
              type="text"
              className="form-input"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
              placeholder="e.g. CF-DEVICE-001"
              required
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Format: 3-32 alphanumeric characters, hyphens, or underscores.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Friendly Device Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cold Storage Sensor 01"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Device Type</label>
            <select
              className="form-select"
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
            >
              <option value="ENVIRONMENTAL_MONITOR">ENVIRONMENTAL_MONITOR</option>
              <option value="TEMPERATURE_PROBE">TEMPERATURE_PROBE</option>
              <option value="BATTERY_TELEMETRY">BATTERY_TELEMETRY</option>
              <option value="GENERIC_IOT">GENERIC_IOT</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Physical Location Label</label>
            <input
              type="text"
              className="form-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Warehouse-Bay-4"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Plus size={16} />
              <span>{loading ? 'Registering...' : 'Register Device'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
