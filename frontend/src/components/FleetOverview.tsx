import React from 'react';
import { Monitor, Wifi, RefreshCw, PowerOff, Sparkles } from 'lucide-react';
import { FleetSummary } from '../types';

interface FleetOverviewProps {
  summary: FleetSummary | null;
  onFilterClick?: (status: 'ALL' | 'ONLINE' | 'SYNCING' | 'OFFLINE') => void;
  onOpenCampaignLibrary?: () => void;
}

export const FleetOverview: React.FC<FleetOverviewProps> = ({
  summary,
  onFilterClick,
  onOpenCampaignLibrary,
}) => {
  const total = summary?.total ?? 0;
  const online = summary?.online ?? 0;
  const syncing = summary?.syncing ?? 0;
  const offline = summary?.offline ?? 0;
  const activeCampaigns = summary?.activeCampaigns ?? 1;

  return (
    <div className="kpi-grid">
      <div
        className="kpi-card total"
        style={{ cursor: onFilterClick ? 'pointer' : 'default' }}
        onClick={() => onFilterClick && onFilterClick('ALL')}
      >
        <div className="kpi-header">
          <span>EDGE KIOSKS DEPLOYED</span>
          <Monitor size={18} color="#3b82f6" />
        </div>
        <div className="kpi-value">{total}</div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Offline-first local displays</span>
      </div>

      <div
        className="kpi-card online"
        style={{ cursor: onFilterClick ? 'pointer' : 'default' }}
        onClick={() => onFilterClick && onFilterClick('ONLINE')}
      >
        <div className="kpi-header">
          <span>LOCAL PLAYBACK ACTIVE</span>
          <Wifi size={18} color="#10b981" />
        </div>
        <div className="kpi-value" style={{ color: '#10b981' }}>
          {online}
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cached locally - 0 cloud egress</span>
      </div>

      <div
        className="kpi-card warning"
        style={{ cursor: onFilterClick ? 'pointer' : 'default' }}
        onClick={() => onFilterClick && onFilterClick('SYNCING')}
      >
        <div className="kpi-header">
          <span>DOWNLOADING ASSETS (S3)</span>
          <RefreshCw size={18} color="#f59e0b" />
        </div>
        <div className="kpi-value" style={{ color: '#f59e0b' }}>
          {syncing}
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pulling update into local cache</span>
      </div>

      <div
        className="kpi-card offline"
        style={{ cursor: onFilterClick ? 'pointer' : 'default' }}
        onClick={() => onFilterClick && onFilterClick('OFFLINE')}
      >
        <div className="kpi-header">
          <span>INACTIVE / OFFLINE</span>
          <PowerOff size={18} color="#ef4444" />
        </div>
        <div className="kpi-value" style={{ color: '#ef4444' }}>
          {offline}
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Heartbeat timeout exceeded</span>
      </div>

      <div
        className="kpi-card alerts"
        style={{ cursor: onOpenCampaignLibrary ? 'pointer' : 'default' }}
        onClick={() => onOpenCampaignLibrary && onOpenCampaignLibrary()}
        title="Click to view all past campaigns & 1-click re-activate"
      >
        <div className="kpi-header">
          <span>CAMPAIGNS ON S3</span>
          <Sparkles size={18} color="#c084fc" />
        </div>
        <div className="kpi-value" style={{ color: '#c084fc' }}>
          {activeCampaigns}
        </div>
        <span style={{ fontSize: '0.75rem', color: '#c084fc' }}>Browse Library & History ↗</span>
      </div>
    </div>
  );
};
