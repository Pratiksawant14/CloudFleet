import React from 'react';
import { Monitor, Wifi, RefreshCw, PowerOff, Sparkles, ArrowUpRight } from 'lucide-react';
import { FleetSummary } from '../types';

interface FleetOverviewProps {
  summary: FleetSummary | null;
  onFilterClick?: (status: 'ALL' | 'ONLINE' | 'SYNCING' | 'OFFLINE') => void;
  onNavigateToCampaigns?: () => void;
}

export const FleetOverview: React.FC<FleetOverviewProps> = ({
  summary,
  onFilterClick,
  onNavigateToCampaigns,
}) => {
  const total = summary?.total ?? 0;
  const online = summary?.online ?? 0;
  const syncing = summary?.syncing ?? 0;
  const offline = summary?.offline ?? 0;
  const activeCampaigns = summary?.activeCampaigns ?? 1;

  return (
    <div className="kpi-grid">
      {/* 1. Edge Kiosks Deployed */}
      <div
        className="kpi-card"
        style={{ cursor: onFilterClick ? 'pointer' : 'default' }}
        onClick={() => onFilterClick && onFilterClick('ALL')}
      >
        <div className="kpi-top-row">
          <span className="kpi-label">Edge Kiosks</span>
          <div className="circle-outline-icon" style={{ borderColor: 'rgba(56, 189, 248, 0.35)', color: '#38bdf8' }}>
            <Monitor size={18} />
          </div>
        </div>
        <div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-subtext">Active offline-first displays</div>
        </div>
      </div>

      {/* 2. Local Playback Active (0 Cloud Egress) */}
      <div
        className="kpi-card"
        style={{ cursor: onFilterClick ? 'pointer' : 'default' }}
        onClick={() => onFilterClick && onFilterClick('ONLINE')}
      >
        <div className="kpi-top-row">
          <span className="kpi-label">Local Playback</span>
          <div className="circle-outline-icon" style={{ borderColor: 'rgba(16, 185, 129, 0.35)', color: '#34d399' }}>
            <Wifi size={18} />
          </div>
        </div>
        <div>
          <div className="kpi-value" style={{ color: '#34d399' }}>{online}</div>
          <div className="kpi-subtext">Cached locally • 0 cloud egress</div>
        </div>
      </div>

      {/* 3. Pulling Assets (Syncing S3) */}
      <div
        className="kpi-card"
        style={{ cursor: onFilterClick ? 'pointer' : 'default' }}
        onClick={() => onFilterClick && onFilterClick('SYNCING')}
      >
        <div className="kpi-top-row">
          <span className="kpi-label">Syncing S3</span>
          <div className="circle-outline-icon" style={{ borderColor: 'rgba(245, 158, 11, 0.35)', color: '#fbbf24' }}>
            <RefreshCw size={18} />
          </div>
        </div>
        <div>
          <div className="kpi-value" style={{ color: '#fbbf24' }}>{syncing}</div>
          <div className="kpi-subtext">Pulling update into local SSD</div>
        </div>
      </div>

      {/* 4. Inactive / Offline */}
      <div
        className="kpi-card"
        style={{ cursor: onFilterClick ? 'pointer' : 'default' }}
        onClick={() => onFilterClick && onFilterClick('OFFLINE')}
      >
        <div className="kpi-top-row">
          <span className="kpi-label">Inactive / Offline</span>
          <div className="circle-outline-icon" style={{ borderColor: 'rgba(244, 63, 94, 0.35)', color: '#fb7185' }}>
            <PowerOff size={18} />
          </div>
        </div>
        <div>
          <div className="kpi-value" style={{ color: '#fb7185' }}>{offline}</div>
          <div className="kpi-subtext">Heartbeat timeout exceeded</div>
        </div>
      </div>

      {/* 5. Campaigns on S3 (Clickable to switch to Campaign Studio) */}
      <div
        className="kpi-card"
        style={{
          cursor: onNavigateToCampaigns ? 'pointer' : 'default',
          border: '1px solid var(--border-gold)',
          background: 'radial-gradient(circle at 90% 10%, rgba(212, 175, 55, 0.06) 0%, var(--bg-card) 70%)',
        }}
        onClick={() => onNavigateToCampaigns && onNavigateToCampaigns()}
        title="Open Campaign Studio & S3 Repository"
      >
        <div className="kpi-top-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="kpi-label" style={{ color: 'var(--accent-gold)' }}>Campaigns on S3</span>
            <ArrowUpRight size={13} color="var(--accent-gold)" />
          </div>
          <div className="circle-outline-icon" style={{ borderColor: 'var(--border-gold)', color: 'var(--accent-gold)' }}>
            <Sparkles size={18} />
          </div>
        </div>
        <div>
          <div className="kpi-value" style={{ color: 'var(--accent-gold-light)' }}>{activeCampaigns}</div>
          <div className="kpi-subtext" style={{ color: 'var(--accent-gold)' }}>
            Open S3 Studio & Rollback ↗
          </div>
        </div>
      </div>
    </div>
  );
};
