import React, { useState } from 'react';
import { Search, ChevronRight, Monitor, HardDrive, RefreshCw } from 'lucide-react';
import { KioskState, KioskStatus } from '../types';

interface KioskTableProps {
  kiosks: KioskState[];
  selectedFilter: 'ALL' | 'ONLINE' | 'SYNCING' | 'OFFLINE';
  onFilterChange: (status: 'ALL' | 'ONLINE' | 'SYNCING' | 'OFFLINE') => void;
  onSelectKiosk: (kioskId: string) => void;
  onOpenScreenSimulator?: (kioskId: string) => void;
}

export const KioskTable: React.FC<KioskTableProps> = ({
  kiosks,
  selectedFilter,
  onFilterChange,
  onSelectKiosk,
  onOpenScreenSimulator,
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
        return <span className="badge badge-online">● Local Playback</span>;
      case 'SYNCING':
        return (
          <span className="badge badge-warning">
            <RefreshCw size={11} className="spin" />
            Syncing S3
          </span>
        );
      case 'OFFLINE':
      default:
        return <span className="badge badge-offline">Offline</span>;
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
      {/* Search & Filter Toolbar */}
      <div className="toolbar">
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by Kiosk ID, store location, or campaign headline..."
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

      {/* Main Table */}
      <div className="table-container">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
            <Monitor size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
            <p style={{ fontWeight: 600 }}>No edge kiosks found matching current criteria.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--text-muted)' }}>
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
                <th>Local Disk Cache</th>
                <th>Last Check-In</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((kiosk) => {
                const campaign = kiosk.activeCampaign;
                return (
                  <tr
                    key={kiosk.kioskId}
                    onClick={() => onSelectKiosk(kiosk.kioskId)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="device-id-cell">{kiosk.kioskId}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{kiosk.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{kiosk.location}</div>
                    </td>
                    <td>{renderStatusBadge(kiosk.status)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: campaign.themeColor || '#38bdf8',
                            boxShadow: `0 0 8px ${campaign.themeColor || '#38bdf8'}`,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontWeight: 500,
                            maxWidth: '260px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: '#ffffff',
                          }}
                          title={campaign.headline}
                        >
                          {campaign.headline}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38bdf8',
                          padding: '2px 7px',
                          borderRadius: '4px',
                        }}
                      >
                        v{campaign.version}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <HardDrive size={13} color="var(--text-muted)" />
                        <span>{kiosk.localCache.diskUsageMb} MB</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {formatLastHeartbeat(kiosk.lastHeartbeat)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                        {onOpenScreenSimulator && (
                          <button
                            className="btn-ghost btn-ghost-cyan"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                            title="Open Realistic Kiosk Screen View"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenScreenSimulator(kiosk.kioskId);
                            }}
                          >
                            <Monitor size={12} />
                            <span>Screen</span>
                          </button>
                        )}
                        <button
                          className="btn-ghost"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectKiosk(kiosk.kioskId);
                          }}
                        >
                          <span>Inspect</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
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
