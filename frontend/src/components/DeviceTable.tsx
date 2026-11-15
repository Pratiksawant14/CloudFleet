import React, { useState } from 'react';
import { Search, ChevronRight, HardDrive, Thermometer, Droplets } from 'lucide-react';
import { DeviceState, DeviceStatus } from '../types';

interface DeviceTableProps {
  devices: DeviceState[];
  selectedFilter: 'ALL' | 'ONLINE' | 'WARNING' | 'OFFLINE';
  onFilterChange: (status: 'ALL' | 'ONLINE' | 'WARNING' | 'OFFLINE') => void;
  onSelectDevice: (deviceId: string) => void;
}

export const DeviceTable: React.FC<DeviceTableProps> = ({
  devices,
  selectedFilter,
  onFilterChange,
  onSelectDevice,
}) => {
  const [search, setSearch] = useState('');

  const filteredDevices = devices.filter((d) => {
    const matchesFilter = selectedFilter === 'ALL' || d.status === selectedFilter;
    const matchesSearch =
      d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.location.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatLastSeen = (lastSeen: string | null): string => {
    if (!lastSeen) return 'Never Seen';
    const diffSeconds = Math.round((Date.now() - new Date(lastSeen).getTime()) / 1000);
    if (diffSeconds < 5) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMins = Math.floor(diffSeconds / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    return new Date(lastSeen).toLocaleTimeString();
  };

  const renderStatusBadge = (status: DeviceStatus) => {
    switch (status) {
      case 'ONLINE':
        return <span className="badge badge-online">ONLINE</span>;
      case 'WARNING':
        return <span className="badge badge-warning">WARNING</span>;
      case 'OFFLINE':
      default:
        return <span className="badge badge-offline">OFFLINE</span>;
    }
  };

  const renderBattery = (battery?: number) => {
    if (battery === undefined || battery === null) return <span style={{ color: '#6b7280' }}>--</span>;
    const color = battery < 20 ? '#ef4444' : battery < 50 ? '#f59e0b' : '#10b981';
    return (
      <div className="battery-meter">
        <div className="battery-bar-outer">
          <div
            className="battery-bar-inner"
            style={{ width: `${Math.min(100, Math.max(5, battery))}%`, backgroundColor: color }}
          />
        </div>
        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{battery}%</span>
      </div>
    );
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by ID, name, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          {(['ALL', 'ONLINE', 'WARNING', 'OFFLINE'] as const).map((filter) => (
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
        {filteredDevices.length === 0 ? (
          <div className="empty-state">
            <HardDrive size={36} className="empty-icon" />
            <p>No devices matching the current filters.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#6b7280' }}>
              Register a simulated device or adjust your search filter above.
            </p>
          </div>
        ) : (
          <table className="fleet-table">
            <thead>
              <tr>
                <th>Device ID</th>
                <th>Device Name</th>
                <th>Location</th>
                <th>Status</th>
                <th>Battery</th>
                <th>Latest Temp</th>
                <th>Humidity</th>
                <th>Last Seen</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => {
                const latest = device.latestTelemetry;
                return (
                  <tr key={device.deviceId} onClick={() => onSelectDevice(device.deviceId)}>
                    <td className="device-id-cell">{device.deviceId}</td>
                    <td style={{ fontWeight: 500 }}>{device.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{device.location}</td>
                    <td>{renderStatusBadge(device.status)}</td>
                    <td>{renderBattery(latest?.battery)}</td>
                    <td>
                      {latest ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Thermometer size={14} color={latest.temperature > 35 ? '#f59e0b' : '#38bdf8'} />
                          {latest.temperature}°C
                        </span>
                      ) : (
                        <span style={{ color: '#6b7280' }}>--</span>
                      )}
                    </td>
                    <td>
                      {latest ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Droplets size={14} color="#60a5fa" />
                          {latest.humidity}%
                        </span>
                      ) : (
                        <span style={{ color: '#6b7280' }}>--</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {formatLastSeen(device.lastSeen)}
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDevice(device.deviceId);
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
