import React, { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { ApiService } from '../services/api';

interface RegisterKioskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKioskRegistered: (kioskId: string) => void;
}

export const RegisterKioskModal: React.FC<RegisterKioskModalProps> = ({
  isOpen,
  onClose,
  onKioskRegistered,
}) => {
  const [kioskId, setKioskId] = useState('KIOSK-RETAIL-001');
  const [name, setName] = useState('Downtown Store Entrance Display');
  const [kioskType, setKioskType] = useState('RETAIL_KIOSK');
  const [location, setLocation] = useState('Flagship Store - Bay 1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await ApiService.registerKiosk({
        kioskId: kioskId.trim().toUpperCase(),
        name: name.trim(),
        kioskType,
        location: location.trim(),
      });
      onKioskRegistered(kioskId.trim().toUpperCase());
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
          <h2 className="modal-title">Register Smart Edge Kiosk</h2>
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
            <label className="form-label">Kiosk Unique Identifier (ID)</label>
            <input
              type="text"
              className="form-input"
              value={kioskId}
              onChange={(e) => setKioskId(e.target.value.toUpperCase())}
              placeholder="e.g. KIOSK-RETAIL-001"
              required
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Format: 3-32 alphanumeric characters, dashes, or underscores.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Display Friendly Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mall West Promenade Kiosk"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Kiosk Screen Type</label>
            <select
              className="form-select"
              value={kioskType}
              onChange={(e) => setKioskType(e.target.value)}
            >
              <option value="RETAIL_KIOSK">RETAIL_KIOSK (Store & Checkout)</option>
              <option value="DIGITAL_SIGNAGE">DIGITAL_SIGNAGE (Billboard Display)</option>
              <option value="INTERACTIVE_SCREEN">INTERACTIVE_SCREEN (Wayfinding & Menu)</option>
              <option value="AIRPORT_DISPLAY">AIRPORT_DISPLAY (Passenger Information)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Store / Venue Location</label>
            <input
              type="text"
              className="form-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Flagship Store - Bay 1"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Plus size={16} />
              <span>{loading ? 'Provisioning...' : 'Register Kiosk'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

