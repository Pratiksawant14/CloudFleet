import {
  DeviceState,
  FleetSummary,
  TelemetryRecord,
  CommandRecord,
  CommandType,
  AlertRecord,
  AlertStatus,
} from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.port === '3000' ? 'http://localhost:4000' : '');

export class ApiService {
  static getBaseUrl(): string {
    return API_BASE_URL || window.location.origin;
  }

  static async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check failed with status ${res.status}`);
    return res.json();
  }

  static async getFleet(): Promise<FleetSummary> {
    const res = await fetch(`${API_BASE_URL}/devices`);
    if (!res.ok) throw new Error(`Failed to fetch fleet: ${res.statusText}`);
    return res.json();
  }

  static async getDevice(deviceId: string): Promise<DeviceState> {
    const res = await fetch(`${API_BASE_URL}/devices/${deviceId}`);
    if (!res.ok) throw new Error(`Failed to fetch device: ${res.statusText}`);
    return res.json();
  }

  static async registerDevice(data: {
    deviceId: string;
    name: string;
    deviceType?: string;
    location?: string;
  }): Promise<DeviceState> {
    const res = await fetch(`${API_BASE_URL}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to register device (${res.status})`);
    }
    return res.json();
  }

  static async getTelemetryHistory(
    deviceId: string,
    limit: number = 30
  ): Promise<TelemetryRecord[]> {
    const res = await fetch(
      `${API_BASE_URL}/devices/${deviceId}/telemetry?limit=${limit}`
    );
    if (!res.ok) throw new Error(`Failed to fetch telemetry: ${res.statusText}`);
    const data = await res.json();
    return data.history || [];
  }

  static async sendCommand(
    deviceId: string,
    type: CommandType,
    parameters?: Record<string, unknown>
  ): Promise<CommandRecord> {
    const res = await fetch(`${API_BASE_URL}/devices/${deviceId}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, parameters }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to send command (${res.status})`);
    }
    return res.json();
  }

  static async getCommands(deviceId: string): Promise<CommandRecord[]> {
    const res = await fetch(`${API_BASE_URL}/devices/${deviceId}/commands`);
    if (!res.ok) throw new Error(`Failed to fetch commands: ${res.statusText}`);
    const data = await res.json();
    return data.commands || [];
  }

  static async getAlerts(filter?: {
    deviceId?: string;
    status?: AlertStatus;
  }): Promise<AlertRecord[]> {
    const params = new URLSearchParams();
    if (filter?.deviceId) params.set('deviceId', filter.deviceId);
    if (filter?.status) params.set('status', filter.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/alerts${query}`);
    if (!res.ok) throw new Error(`Failed to fetch alerts: ${res.statusText}`);
    const data = await res.json();
    return data.alerts || [];
  }

  static async resolveAlert(
    deviceId: string,
    alertId: string
  ): Promise<AlertRecord> {
    const res = await fetch(`${API_BASE_URL}/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to resolve alert (${res.status})`);
    }
    return res.json();
  }
}
