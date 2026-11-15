import React from 'react';
import { MonitorPlay, RefreshCw, Plus, Terminal, UploadCloud, Monitor, LayoutDashboard, Tv, FolderArchive } from 'lucide-react';
import { ApiService } from '../services/api';

interface HeaderProps {
  backendConnected: boolean;
  activeView: 'OPERATIONS' | 'SCREEN_SIMULATOR';
  onViewChange: (view: 'OPERATIONS' | 'SCREEN_SIMULATOR') => void;
  onRefresh: () => void;
  onOpenCampaignModal: () => void;
  onOpenCampaignLibrary: () => void;
  onOpenRegisterModal: () => void;
  onOpenSimulatorGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendConnected,
  activeView,
  onViewChange,
  onRefresh,
  onOpenCampaignModal,
  onOpenCampaignLibrary,
  onOpenRegisterModal,
  onOpenSimulatorGuide,
}) => {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
          <MonitorPlay size={20} />
        </div>
        <div>
          <h1 className="brand-title">CloudFleet</h1>
          <span className="brand-subtitle">Serverless Edge Kiosk & Signage Fleet</span>
        </div>
      </div>

      {/* Navigation View Switcher (Dashboard vs Screen Simulator) */}
      <div
        style={{
          display: 'flex',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          padding: '0.25rem',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          gap: '0.25rem',
        }}
      >
        <button
          onClick={() => onViewChange('OPERATIONS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            backgroundColor: activeView === 'OPERATIONS' ? '#2563eb' : 'transparent',
            color: activeView === 'OPERATIONS' ? '#ffffff' : 'var(--text-secondary)',
            border: 'none',
          }}
        >
          <LayoutDashboard size={14} />
          <span>Fleet Ops Center</span>
        </button>

        <button
          onClick={() => onViewChange('SCREEN_SIMULATOR')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            backgroundColor: activeView === 'SCREEN_SIMULATOR' ? '#7c3aed' : 'transparent',
            color: activeView === 'SCREEN_SIMULATOR' ? '#ffffff' : 'var(--text-secondary)',
            border: 'none',
          }}
        >
          <Monitor size={14} />
          <span>Live Kiosk Screen Simulator</span>
        </button>
      </div>

      <div className="header-actions">
        <div className="connection-pill" title={`API: ${ApiService.getBaseUrl()}`}>
          <span className={`status-dot ${backendConnected ? 'online' : 'offline'}`} />
          <span>{backendConnected ? 'Serverless API Ready' : 'Connecting to API...'}</span>
        </div>

        <button className="btn-secondary" onClick={onRefresh} title="Refresh data">
          <RefreshCw size={14} />
          <span>Sync</span>
        </button>

        <button
          className="btn-secondary"
          onClick={() => window.open('/screen', '_blank')}
          title="Open edge-to-edge TV screen in a new window/monitor"
          style={{ color: 'var(--accent-cyan)' }}
        >
          <Tv size={14} />
          <span>Open TV Screen</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenCampaignLibrary}
          title="Browse all past campaigns staged in Amazon S3 & 1-click re-activate"
          style={{ color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.3)' }}
        >
          <FolderArchive size={14} />
          <span>Campaign Library</span>
        </button>

        <button className="btn-secondary" onClick={onOpenSimulatorGuide} title="Simulator Guide">
          <Terminal size={14} />
          <span>Kiosk CLI</span>
        </button>

        <button className="btn-secondary" onClick={onOpenRegisterModal}>
          <Plus size={14} />
          <span>Register Kiosk</span>
        </button>

        <button
          className="btn-primary"
          style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
          onClick={onOpenCampaignModal}
        >
          <UploadCloud size={16} />
          <span>Deploy Campaign to S3</span>
        </button>
      </div>
    </header>
  );
};
