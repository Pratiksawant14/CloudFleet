import React from 'react';
import { Cloud, RefreshCw, Plus, Terminal, AlertTriangle, Cpu } from 'lucide-react';
import { ApiService } from '../services/api';

interface HeaderProps {
  backendConnected: boolean;
  activeTab: 'fleet' | 'alerts';
  onTabChange: (tab: 'fleet' | 'alerts') => void;
  onRefresh: () => void;
  onOpenRegisterModal: () => void;
  onOpenSimulatorGuide: () => void;
  activeAlertCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  backendConnected,
  activeTab,
  onTabChange,
  onRefresh,
  onOpenRegisterModal,
  onOpenSimulatorGuide,
  activeAlertCount,
}) => {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo">
          <Cloud size={20} />
        </div>
        <div>
          <h1 className="brand-title">CloudFleet</h1>
          <span className="brand-subtitle">Serverless IoT Fleet Management</span>
        </div>
      </div>

      <div className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'fleet' ? 'active' : ''}`}
          onClick={() => onTabChange('fleet')}
        >
          <Cpu size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          Fleet Overview
        </button>
        <button
          className={`nav-tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => onTabChange('alerts')}
        >
          <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          Fleet Alerts {activeAlertCount > 0 && `(${activeAlertCount})`}
        </button>
      </div>

      <div className="header-actions">
        <div className="connection-pill" title={`API: ${ApiService.getBaseUrl()}`}>
          <span className={`status-dot ${backendConnected ? 'online' : 'offline'}`} />
          <span>{backendConnected ? 'Backend Connected' : 'Connecting to API...'}</span>
        </div>

        <button className="btn-secondary" onClick={onRefresh} title="Refresh data">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>

        <button className="btn-secondary" onClick={onOpenSimulatorGuide} title="Simulator Guide">
          <Terminal size={14} />
          <span>Simulator CLI</span>
        </button>

        <button className="btn-primary" onClick={onOpenRegisterModal}>
          <Plus size={16} />
          <span>Register Device</span>
        </button>
      </div>
    </header>
  );
};
