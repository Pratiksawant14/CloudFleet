import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { AlertRecord, AlertStatus } from '../types';
import { ApiService } from '../services/api';

interface AlertsListProps {
  onShowToast: (message: string) => void;
  onSelectDevice: (deviceId: string) => void;
}

export const AlertsList: React.FC<AlertsListProps> = ({ onShowToast, onSelectDevice }) => {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      const statusParam = filter === 'ALL' ? undefined : (filter as AlertStatus);
      const data = await ApiService.getAlerts({ status: statusParam });
      setAlerts(data);
    } catch (err: unknown) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 3000);
    return () => clearInterval(interval);
  }, [filter]);

  const handleResolve = async (deviceId: string, alertId: string) => {
    try {
      await ApiService.resolveAlert(deviceId, alertId);
      onShowToast(`Alert ${alertId} resolved.`);
      await loadAlerts();
    } catch (err: unknown) {
      onShowToast(`Failed to resolve: ${(err as Error).message}`);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Fleet Security & Threshold Alerts</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Automated alerts triggered by telemetry threshold evaluations or device heartbeat timeouts.
          </p>
        </div>

        <div className="filter-group">
          {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map((st) => (
            <button
              key={st}
              className={`filter-btn ${filter === st ? 'active' : ''}`}
              onClick={() => setFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        {loading && alerts.length === 0 ? (
          <div className="empty-state">
            <p>Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <ShieldAlert size={36} className="empty-icon" color="#10b981" />
            <p>No {filter.toLowerCase()} alerts found across the fleet.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#6b7280' }}>
              All monitored IoT devices are operating within normal telemetry parameters.
            </p>
          </div>
        ) : (
          <table className="fleet-table">
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Device ID</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Message</th>
                <th>Triggered</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alt) => {
                const isCritical = alt.severity === 'CRITICAL';
                return (
                  <tr key={alt.alertId}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{alt.alertId}</td>
                    <td
                      className="device-id-cell"
                      onClick={() => onSelectDevice(alt.deviceId)}
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {alt.deviceId}
                    </td>
                    <td style={{ fontWeight: 600 }}>{alt.type}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: isCritical ? '#ef4444' : '#f59e0b',
                        }}
                      >
                        {alt.severity}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-primary)' }}>{alt.message}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(alt.triggeredAt).toLocaleTimeString()}
                    </td>
                    <td>
                      <span className={`badge ${alt.status === 'ACTIVE' ? 'badge-warning' : 'badge-online'}`}>
                        {alt.status}
                      </span>
                    </td>
                    <td>
                      {alt.status === 'ACTIVE' ? (
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleResolve(alt.deviceId, alt.alertId)}
                        >
                          <CheckCircle2 size={12} />
                          Resolve
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Resolved</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
