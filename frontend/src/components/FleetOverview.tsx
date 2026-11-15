import React from 'react';
import { Server, Wifi, WifiOff, AlertTriangle, Bell } from 'lucide-react';
import { FleetSummary } from '../types';

interface FleetOverviewProps {
  summary: FleetSummary | null;
  onFilterClick?: (status: 'ALL' | 'ONLINE' | 'WARNING' | 'OFFLINE') => void;
}

export const FleetOverview: React.FC<FleetOverviewProps> = ({ summary, onFilterClick }) => {
  const total = summary?.total ?? 0;
  const online = summary?.online ?? 0;
  const warning = summary?.warning ?? 0;
  const offline = summary?.offline ?? 0;
  const activeAlerts = summary?.activeAlerts ?? 0;

  return (
    <div className="kpi-grid">
      <div
        className="kpi-card total"
        style={{ cursor: onFilterClick ? 'pointer' : 'default' }}
        onClick={() => onFilterClick && onFilterClick('ALL')}
      >
        <div className="kpi-header">
          <span>TOTAL FLEET</span>
          <Server size={18} color="#3b82f6" />
        </div>
        <div className="kpi-value">{total}</div>
      </div>

      <div
        className="kpi-card online"
        style={{ cursor: onFilterClick ? 'pointer' : 'default' }}
        onClick={() => onFilterClick && onFilterClick('ONLINE')}
      >
        <div className="kpi-header">
          <span>ONLINE DEVICES</span>
          <Wifi size={18} color="#10b981" />
        </div>
        <div className="kpi-value" style={{ color: '#10b981' }}>
          {online}
        </div>
      </div>

      <div
        className="kpi-card warning"
        style={{ cursor: onFilterClick ? 'pointer' : 'default' }}
        onClick={() => onFilterClick && onFilterClick('WARNING')}
      >
        <div className="kpi-header">
          <span>WARNING THRESHOLD</span>
          <AlertTriangle size={18} color="#f59e0b" />
        </div>
        <div className="kpi-value" style={{ color: '#f59e0b' }}>
          {warning}
        </div>
      </div>

      <div
        className="kpi-card offline"
        style={{ cursor: onFilterClick ? 'pointer' : 'default' }}
        onClick={() => onFilterClick && onFilterClick('OFFLINE')}
      >
        <div className="kpi-header">
          <span>OFFLINE / INACTIVE</span>
          <WifiOff size={18} color="#ef4444" />
        </div>
        <div className="kpi-value" style={{ color: '#ef4444' }}>
          {offline}
        </div>
      </div>

      <div className="kpi-card alerts">
        <div className="kpi-header">
          <span>ACTIVE ALERTS</span>
          <Bell size={18} color="#ec4899" />
        </div>
        <div className="kpi-value" style={{ color: activeAlerts > 0 ? '#ec4899' : '#9ca3af' }}>
          {activeAlerts}
        </div>
      </div>
    </div>
  );
};
