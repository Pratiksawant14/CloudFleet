import React from 'react';
import {
  MonitorPlay,
  RefreshCw,
  Plus,
  Terminal,
  UploadCloud,
  Monitor,
  LayoutDashboard,
  Tv,
  Sparkles,
} from 'lucide-react';
import { ApiService } from '../services/api';

interface HeaderProps {
  backendConnected: boolean;
  activeView: 'OPERATIONS' | 'CAMPAIGNS' | 'SCREEN_SIMULATOR';
  onViewChange: (view: 'OPERATIONS' | 'CAMPAIGNS' | 'SCREEN_SIMULATOR') => void;
  onRefresh: () => void;
  onOpenCampaignModal: () => void;
  onOpenRegisterModal: () => void;
  onOpenSimulatorGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendConnected,
  activeView,
  onViewChange,
  onRefresh,
  onOpenCampaignModal,
  onOpenRegisterModal,
  onOpenSimulatorGuide,
}) => {
  return (
    <header className="app-header">
      {/* Brand Monogram & Title */}
      <div className="brand-section" onClick={() => onViewChange('OPERATIONS')} style={{ cursor: 'pointer' }}>
        <div className="brand-logo">
          <MonitorPlay size={18} />
        </div>
        <div>
          <h1 className="brand-title">CLOUDFLEET</h1>
          <span className="brand-subtitle">Serverless Edge Kiosk & Signage</span>
        </div>
      </div>

      {/* Navigation Switcher (Luxury Spaced Minimalist Tabs) */}
      <nav className="nav-switcher">
        <button
          onClick={() => onViewChange('OPERATIONS')}
          className={`nav-tab-btn ${activeView === 'OPERATIONS' ? 'active' : ''}`}
        >
          <LayoutDashboard size={14} />
          <span>Fleet Ops</span>
        </button>

        <button
          onClick={() => onViewChange('CAMPAIGNS')}
          className={`nav-tab-btn ${activeView === 'CAMPAIGNS' ? 'active' : ''}`}
        >
          <Sparkles size={14} />
          <span>Campaign Studio (S3)</span>
        </button>

        <button
          onClick={() => onViewChange('SCREEN_SIMULATOR')}
          className={`nav-tab-btn ${activeView === 'SCREEN_SIMULATOR' ? 'active' : ''}`}
        >
          <Monitor size={14} />
          <span>Screen Simulator</span>
        </button>
      </nav>

      {/* Actions (Ghost Buttons without Heavy Backgrounds) */}
      <div className="header-actions">
        <div className="connection-pill" title={`Cloud API: ${ApiService.getBaseUrl()}`}>
          <span className={`status-dot ${backendConnected ? 'online' : 'offline'}`} />
          <span>{backendConnected ? 'AWS API Ready' : 'Connecting...'}</span>
        </div>

        <button className="btn-ghost" onClick={onRefresh} title="Sync data with Amazon S3">
          <RefreshCw size={13} />
          <span>Sync</span>
        </button>

        <button
          className="btn-ghost btn-ghost-cyan"
          onClick={() => window.open('/screen', '_blank')}
          title="Open edge-to-edge full TV display"
        >
          <Tv size={14} />
          <span>TV Display</span>
        </button>

        <button className="btn-ghost" onClick={onOpenSimulatorGuide} title="Kiosk Terminal Guide">
          <Terminal size={13} />
          <span>CLI</span>
        </button>

        <button className="btn-ghost" onClick={onOpenRegisterModal}>
          <Plus size={14} />
          <span>Register</span>
        </button>

        <button
          className="btn-ghost btn-ghost-gold"
          onClick={onOpenCampaignModal}
          style={{ fontWeight: 700 }}
        >
          <UploadCloud size={15} />
          <span>+ Deploy Campaign</span>
        </button>
      </div>
    </header>
  );
};
