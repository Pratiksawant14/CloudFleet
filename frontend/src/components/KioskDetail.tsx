import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Monitor,
  HardDrive,
  Cpu,
  Thermometer,
  History,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { KioskState, SyncHistoryRecord } from '../types';
import { ApiService } from '../services/api';

interface KioskDetailProps {
  kioskId: string;
  onBack: () => void;
  onShowToast: (message: string) => void;
}

export const KioskDetail: React.FC<KioskDetailProps> = ({ kioskId, onBack, onShowToast }) => {
  const [kiosk, setKiosk] = useState<KioskState | null>(null);
  const [history, setHistory] = useState<SyncHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [kioskData, historyData] = await Promise.all([
        ApiService.getKiosk(kioskId),
        ApiService.getSyncHistory(kioskId),
      ]);
      setKiosk(kioskData);
      setHistory(historyData);
    } catch (err: unknown) {
      console.error('Failed to load kiosk:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2500);
    return () => clearInterval(interval);
  }, [kioskId]);

  if (loading && !kiosk) {
    return (
      <div className="empty-state">
        <p>Connecting to edge kiosk telemetry...</p>
      </div>
    );
  }

  if (!kiosk) {
    return (
      <div className="empty-state">
        <p>Kiosk '{kioskId}' not found.</p>
        <button className="btn-secondary" onClick={onBack} style={{ marginTop: '1rem' }}>
          Back to Fleet
        </button>
      </div>
    );
  }

  const campaign = kiosk.activeCampaign;

  return (
    <div>
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to Kiosk Fleet
      </button>

      <div className="detail-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{kiosk.name}</h2>
            <span className={`badge badge-${kiosk.status.toLowerCase()}`}>
              {kiosk.status === 'ONLINE' ? 'LOCAL PLAYBACK' : kiosk.status}
            </span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
              {kiosk.kioskId}
            </span>{' '}
            • {kiosk.kioskType} • {kiosk.location}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Last Cloud Check-in</span>
          <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>
            {kiosk.lastHeartbeat ? new Date(kiosk.lastHeartbeat).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Kiosk Screen Mockup & Hardware Overview */}
      <div className="detail-grid">
        {/* Left Column: Realistic Kiosk Screen Rendering */}
        <div>
          <div className="detail-card" style={{ borderColor: campaign.themeColor || '#3b82f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                <Monitor size={18} />
                Live Screen View (Edge Display Renderer)
              </h3>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                }}
              >
                Campaign v{campaign.version}
              </span>
            </div>

            {/* Visual Kiosk Display Screen Box */}
            <div
              style={{
                width: '100%',
                minHeight: '220px',
                backgroundColor: '#0a0f1d',
                borderRadius: '8px',
                border: '2px solid #1f2937',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
              }}
            >
              {/* Subtle top banner accent */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '6px',
                  backgroundColor: campaign.themeColor || '#3b82f6',
                }}
              />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Sparkles size={16} color={campaign.themeColor || '#3b82f6'} />
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
                    {campaign.name}
                  </span>
                </div>
                <h1
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: '#ffffff',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  }}
                >
                  {campaign.headline}
                </h1>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1.5rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.75rem',
                }}
              >
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                  Running Offline from Local Device Disk
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Asset ID: {campaign.campaignId}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              *This content runs continuously on the local kiosk hardware without internet streaming. It only contacts AWS Lambda when an update is queued.
            </p>
          </div>

          {/* Sync History Audit */}
          <div className="detail-card">
            <h3 className="card-title">
              <History size={18} />
              S3 Update History & Deployment Logs
            </h3>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No updates applied yet. Currently running initial factory baseline v1.0.0.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="fleet-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Campaign ID</th>
                      <th>Downloaded At</th>
                      <th>Latency</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((rec) => (
                      <tr key={rec.syncId}>
                        <td style={{ fontWeight: 600, color: '#60a5fa' }}>v{rec.version}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{rec.campaignId}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {new Date(rec.appliedAt).toLocaleTimeString()}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{rec.downloadDurationMs}ms</td>
                        <td>
                          <span className="badge badge-online" style={{ fontSize: '0.7rem' }}>
                            <CheckCircle2 size={11} style={{ marginRight: '3px' }} />
                            SUCCESS
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Hardware & Storage Diagnostics */}
        <div>
          <div className="detail-card">
            <h3 className="card-title">
              <HardDrive size={18} />
              Edge Local Storage Diagnostics
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Local Cache Disk Usage</span>
                  <span style={{ fontWeight: 600 }}>{kiosk.localCache.diskUsageMb} MB</span>
                </div>
                <div className="battery-bar-outer" style={{ width: '100%', height: '8px' }}>
                  <div
                    className="battery-bar-inner"
                    style={{
                      width: `${Math.min(100, (kiosk.localCache.diskUsageMb / 500) * 100)}%`,
                      backgroundColor: '#3b82f6',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CACHED ASSETS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{kiosk.localCache.totalAssetsCached} files</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FREE STORAGE</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{(kiosk.systemMetrics.storageFreeMb / 1024).toFixed(1)} GB</div>
                </div>
              </div>
            </div>
          </div>

          <div className="detail-card">
            <h3 className="card-title">
              <Cpu size={18} />
              Kiosk Device Telemetry
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>CPU Utilization</span>
                <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{kiosk.systemMetrics.cpuUsage}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Thermometer size={14} /> Core Temperature
                </span>
                <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{kiosk.systemMetrics.temperature}°C</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ingress Mode</span>
                <span style={{ fontWeight: 600, color: '#38bdf8', fontSize: '0.8rem' }}>On-Demand HTTPS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
