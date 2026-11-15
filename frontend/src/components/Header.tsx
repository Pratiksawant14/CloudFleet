import React from 'react';
import { MonitorPlay, RefreshCw, Plus, Terminal, UploadCloud } from 'lucide-react';
import { ApiService } from '../services/api';

interface HeaderProps {
  backendConnected: boolean;
  onRefresh: () => void;
  onOpenCampaignModal: () => void;
  onOpenRegisterModal: () => void;
  onOpenSimulatorGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendConnected,
  onRefresh,
  onOpenCampaignModal,
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

      <div className="header-actions">
        <div className="connection-pill" title={`API: ${ApiService.getBaseUrl()}`}>
          <span className={`status-dot ${backendConnected ? 'online' : 'offline'}`} />
          <span>{backendConnected ? 'Serverless API Ready' : 'Connecting to API...'}</span>
        </div>

        <button className="btn-secondary" onClick={onRefresh} title="Refresh data">
          <RefreshCw size={14} />
          <span>Sync</span>
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
