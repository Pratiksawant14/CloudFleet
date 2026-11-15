import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Thermometer,
  Droplets,
  BatteryCharging,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Play,
  Square,
  Sliders,
} from 'lucide-react';
import { DeviceState, TelemetryRecord, CommandRecord, CommandType, AlertRecord } from '../types';
import { ApiService } from '../services/api';

interface DeviceDetailProps {
  deviceId: string;
  onBack: () => void;
  onShowToast: (message: string) => void;
}

export const DeviceDetail: React.FC<DeviceDetailProps> = ({ deviceId, onBack, onShowToast }) => {
  const [device, setDevice] = useState<DeviceState | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryRecord[]>([]);
  const [commands, setCommands] = useState<CommandRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Command form state
  const [commandType, setCommandType] = useState<CommandType>('RESTART');
  const [commandParam, setCommandParam] = useState('');
  const [sendingCommand, setSendingCommand] = useState(false);

  const loadData = async () => {
    try {
      const [devData, telData, cmdData, alertData] = await Promise.all([
        ApiService.getDevice(deviceId),
        ApiService.getTelemetryHistory(deviceId, 30),
        ApiService.getCommands(deviceId),
        ApiService.getAlerts({ deviceId, status: 'ACTIVE' }),
      ]);
      setDevice(devData);
      setTelemetry(telData);
      setCommands(cmdData);
      setAlerts(alertData);
    } catch (err: unknown) {
      console.error('Failed to load device details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2500);
    return () => clearInterval(interval);
  }, [deviceId]);

  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingCommand(true);

    try {
      let params: Record<string, unknown> | undefined = undefined;
      if (commandType === 'SET_MODE') {
        params = { mode: commandParam || 'NORMAL' };
      } else if (commandType === 'RESTART') {
        params = { graceful: true, delaySeconds: 2 };
      }

      const sent = await ApiService.sendCommand(deviceId, commandType, params);
      onShowToast(`Command ${commandType} sent (ID: ${sent.commandId})`);
      await loadData();
    } catch (err: unknown) {
      onShowToast(`Failed: ${(err as Error).message}`);
    } finally {
      setSendingCommand(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await ApiService.resolveAlert(deviceId, alertId);
      onShowToast(`Alert ${alertId} resolved.`);
      await loadData();
    } catch (err: unknown) {
      onShowToast(`Failed to resolve alert: ${(err as Error).message}`);
    }
  };

  if (loading && !device) {
    return (
      <div className="empty-state">
        <p>Loading device telemetry & records...</p>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="empty-state">
        <p>Device '{deviceId}' not found.</p>
        <button className="btn-secondary" onClick={onBack} style={{ marginTop: '1rem' }}>
          Back to Fleet
        </button>
      </div>
    );
  }

  const latest = device.latestTelemetry;

  // Simple SVG chart calculation
  const historyReversed = [...telemetry].reverse();
  const maxTemp = Math.max(45, ...historyReversed.map((t) => t.metrics.temperature || 0));
  const minTemp = Math.min(15, ...historyReversed.map((t) => t.metrics.temperature || 0));

  return (
    <div>
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to Fleet Overview
      </button>

      <div className="detail-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{device.name}</h2>
            <span className={`badge badge-${device.status.toLowerCase()}`}>{device.status}</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
              {device.deviceId}
            </span>{' '}
            • {device.deviceType} • {device.location} • Mode: {device.operationalMode}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Last Seen</span>
          <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>
            {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Quick KPI stats */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card" style={{ padding: '1rem' }}>
          <div className="kpi-header">
            <span>TEMPERATURE</span>
            <Thermometer size={16} color="#38bdf8" />
          </div>
          <div className="kpi-value" style={{ fontSize: '1.75rem', color: latest && latest.temperature > 35 ? '#f59e0b' : '#38bdf8' }}>
            {latest ? `${latest.temperature}°C` : '--'}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Threshold: 35.0°C</span>
        </div>

        <div className="kpi-card" style={{ padding: '1rem' }}>
          <div className="kpi-header">
            <span>HUMIDITY</span>
            <Droplets size={16} color="#60a5fa" />
          </div>
          <div className="kpi-value" style={{ fontSize: '1.75rem', color: '#60a5fa' }}>
            {latest ? `${latest.humidity}%` : '--'}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Normal range: 30-80%</span>
        </div>

        <div className="kpi-card" style={{ padding: '1rem' }}>
          <div className="kpi-header">
            <span>BATTERY LEVEL</span>
            <BatteryCharging size={16} color={latest && latest.battery < 20 ? '#ef4444' : '#10b981'} />
          </div>
          <div className="kpi-value" style={{ fontSize: '1.75rem', color: latest && latest.battery < 20 ? '#ef4444' : '#10b981' }}>
            {latest ? `${latest.battery}%` : '--'}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Threshold: &lt; 20%</span>
        </div>

        <div className="kpi-card" style={{ padding: '1rem' }}>
          <div className="kpi-header">
            <span>OPERATIONAL MODE</span>
            <Sliders size={16} color="#c084fc" />
          </div>
          <div className="kpi-value" style={{ fontSize: '1.5rem', color: '#c084fc' }}>
            {device.operationalMode}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Configured state</span>
        </div>
      </div>

      {/* Detail grid: Left (Telemetry History Chart & Commands Audit), Right (Command Console & Active Alerts) */}
      <div className="detail-grid">
        <div>
          {/* Telemetry Chart */}
          <div className="detail-card">
            <h3 className="card-title">
              <Thermometer size={18} />
              Recent Telemetry Stream ({telemetry.length} data points)
            </h3>

            {historyReversed.length < 2 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                Awaiting telemetry stream from software device simulator...
              </div>
            ) : (
              <div className="chart-box">
                <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="50" x2="500" y2="50" stroke="#374151" strokeDasharray="3 3" />
                  <line x1="0" y1="100" x2="500" y2="100" stroke="#374151" strokeDasharray="3 3" />
                  <line x1="0" y1="150" x2="500" y2="150" stroke="#374151" strokeDasharray="3 3" />

                  {/* Warning line at 35°C */}
                  {(() => {
                    const y35 = 200 - ((35 - minTemp) / (maxTemp - minTemp)) * 180 - 10;
                    return (
                      <g>
                        <line x1="0" y1={y35} x2="500" y2={y35} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 2" />
                        <text x="4" y={y35 - 4} fill="#f59e0b" fontSize="10">Warning (35°C)</text>
                      </g>
                    );
                  })()}

                  {/* Temperature path */}
                  <path
                    d={historyReversed
                      .map((t, idx) => {
                        const x = (idx / (historyReversed.length - 1)) * 480 + 10;
                        const y = 200 - ((t.metrics.temperature - minTemp) / (maxTemp - minTemp)) * 180 - 10;
                        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                  />

                  {/* Temperature points */}
                  {historyReversed.map((t, idx) => {
                    const x = (idx / (historyReversed.length - 1)) * 480 + 10;
                    const y = 200 - ((t.metrics.temperature - minTemp) / (maxTemp - minTemp)) * 180 - 10;
                    const isHot = t.metrics.temperature > 35;
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r={isHot ? 4.5 : 3}
                        fill={isHot ? '#f59e0b' : '#38bdf8'}
                      />
                    );
                  })}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  <span>Oldest</span>
                  <span style={{ color: '#38bdf8' }}>● Temperature (°C)</span>
                  <span>Latest</span>
                </div>
              </div>
            )}
          </div>

          {/* Command Audit Log */}
          <div className="detail-card">
            <h3 className="card-title">
              <Clock size={18} />
              Command History & Acknowledgements
            </h3>
            {commands.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No commands dispatched yet. Use the Command Console to send commands.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="fleet-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Command ID</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Dispatched</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commands.map((cmd) => (
                      <tr key={cmd.commandId}>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{cmd.commandId}</td>
                        <td style={{ fontWeight: 600 }}>{cmd.type}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                cmd.status === 'ACKNOWLEDGED'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : cmd.status === 'PENDING'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(59, 130, 246, 0.15)',
                              color:
                                cmd.status === 'ACKNOWLEDGED'
                                  ? '#10b981'
                                  : cmd.status === 'PENDING'
                                  ? '#f59e0b'
                                  : '#3b82f6',
                            }}
                          >
                            {cmd.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {new Date(cmd.createdAt).toLocaleTimeString()}
                        </td>
                        <td>
                          {cmd.executionResult ? (
                            <span style={{ color: cmd.executionResult.success ? '#10b981' : '#ef4444' }}>
                              {cmd.executionResult.message}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Waiting for ACK...</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Command Console & Active Alerts */}
        <div>
          {/* Active Alerts */}
          {alerts.length > 0 && (
            <div className="detail-card" style={{ borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
              <h3 className="card-title" style={{ color: '#f59e0b' }}>
                <AlertTriangle size={18} />
                Active Alerts ({alerts.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {alerts.map((alt) => (
                  <div
                    key={alt.alertId}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.85rem' }}>{alt.type}</span>
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>{alt.severity}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.35rem 0' }}>
                      {alt.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(alt.triggeredAt).toLocaleTimeString()}
                      </span>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                        onClick={() => handleResolveAlert(alt.alertId)}
                      >
                        <CheckCircle2 size={12} />
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Command Console */}
          <div className="detail-card">
            <h3 className="card-title">
              <Send size={18} />
              Administrative Command Console
            </h3>

            <form onSubmit={handleSendCommand} className="command-form">
              <div className="form-group">
                <label className="form-label">Command Type</label>
                <select
                  className="form-select"
                  value={commandType}
                  onChange={(e) => setCommandType(e.target.value as CommandType)}
                >
                  <option value="RESTART">RESTART — Reboot simulated device & resume</option>
                  <option value="STOP">STOP — Halt telemetry transmission</option>
                  <option value="START">START — Resume telemetry transmission</option>
                  <option value="SET_MODE">SET_MODE — Change operational mode</option>
                </select>
              </div>

              {commandType === 'SET_MODE' && (
                <div className="form-group">
                  <label className="form-label">Mode Parameter</label>
                  <select
                    className="form-select"
                    value={commandParam}
                    onChange={(e) => setCommandParam(e.target.value)}
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="ECO">ECO (Low power / low rate)</option>
                    <option value="DIAGNOSTIC">DIAGNOSTIC (High precision)</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={sendingCommand}
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
              >
                {sendingCommand ? (
                  <span>Dispatching...</span>
                ) : (
                  <>
                    {commandType === 'RESTART' && <RotateCcw size={16} />}
                    {commandType === 'START' && <Play size={16} />}
                    {commandType === 'STOP' && <Square size={16} />}
                    {commandType === 'SET_MODE' && <Sliders size={16} />}
                    <span>Dispatch {commandType}</span>
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Commands are received by the simulator on its polling cycle, executed with simulated hardware latency, and acknowledged back to S3.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

