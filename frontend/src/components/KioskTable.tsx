import React, { useState } from 'react';
import { Search, ChevronRight, Monitor, HardDrive, RefreshCw } from 'lucide-react';
import { KioskState, KioskStatus } from '../types';

interface KioskTableProps {
  kiosks: KioskState[];
  selectedFilter: 'ALL' | 'ONLINE' | 'SYNCING' | 'OFFLINE';
  onFilterChange: (status: 'ALL' | 'ONLINE' | 'SYNCING' | 'OFFLINE') => void;
  onSelectKiosk: (kioskId: string) => void;
}

export const KioskTable: React.FC<KioskTableProps> = ({
  kiosks,
  selectedFilter,
  onFilterChange,
  onSelectKiosk,
}) => {
  const [search, setSearch] = useState('');

  const filtered = kiosks.filter((k) => {
    const matchesFilter = selectedFilter === 'ALL' || k.status === selectedFilter;
    const matchesSearch =
      k.kioskId.toLowerCase().includes(search.toLowerCase()) ||
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.location.toLowerCase().includes(search.toLowerCase()) ||
      k.activeCampaign.headline.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const renderStatusBadge = (status: KioskStatus) => {
    switch (status) {
      case 'ONLINE':
        return <span className="badge badge-online">LOCAL PLAYBACK</span>;
      case 'SYNCING':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={12} className="spin" />
            SYNCING FROM S3
          </span>
        );
      case 'OFFLINE':
      default:
        return <span className="badge badge-offline">OFFLINE</span>;
    }
  };

  const formatLastHeartbeat = (time: string | null): string => {
    if (!time) return 'Never Seen';
    const diff = Math.round((Date.now() - new Date(time).getTime()) / 1000);
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    return `${mins}m ago`;
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by Kiosk ID, store location, or headline..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          {(['ALL', 'ONLINE', 'SYNCING', 'OFFLINE'] as const).map((filter) => (
            <button
              key={filter}
              className={`filter-btn ${selectedFilter === filter ? 'active' : ''}`}
              onClick={() => onFilterChange(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Monitor size={36} className="empty-icon" />
            <p>No edge kiosks found matching current criteria.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#6b7280' }}>
              Register a kiosk or launch the simulator from your terminal.
            </p>
          </div>
        ) : (
          <table className="fleet-table">
            <thead>
              <tr>
                <th>Kiosk ID</th>
                <th>Store / Venue Location</th>
                <th>Status</th>
                <th>Active Screen Display</th>
                <th>Version</th>
                <th>Local Cache</th>
                <th>Last Check-in</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((kiosk) => {
                const campaign = kiosk.activeCampaign;
                return (
                  <tr key={kiosk.kioskId} onClick={() => onSelectKiosk(kiosk.kioskId)}>
                    <td className="device-id-cell">{kiosk.kioskId}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{kiosk.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{kiosk.location}</div>
                    </td>
                    <td>{renderStatusBadge(kiosk.status)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: campaign.themeColor || '#3b82f6',
                            display: 'inline-block',
                          }}
                        />
                        <span style={{ fontWeight: 500, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {campaign.headline}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          backgroundColor: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        v{campaign.version}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <HardDrive size={13} />
                        <span>{kiosk.localCache.diskUsageMb} MB</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {formatLastHeartbeat(kiosk.lastHeartbeat)}
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectKiosk(kiosk.kioskId);
                        }}
                      >
                        Inspect
                        <ChevronRight size={14} />
                      </button>
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

