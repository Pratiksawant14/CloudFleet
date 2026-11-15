export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'WARNING';

export type DeviceType =
  | 'ENVIRONMENTAL_MONITOR'
  | 'TEMPERATURE_PROBE'
  | 'BATTERY_TELEMETRY'
  | 'GENERIC_IOT';

export interface TelemetryMetrics {
  temperature: number;
  humidity: number;
  battery: number;
}

export interface TelemetryRecord {
  telemetryId: string;
  deviceId: string;
  timestamp: string;
  metrics: TelemetryMetrics;
  simulatorMetadata?: {
    operationalMode?: string;
    uptimeSeconds?: number;
    firmwareVersion?: string;
  };
}

export interface DeviceState {
  deviceId: string;
  name: string;
  deviceType: DeviceType;
  location: string;
  status: DeviceStatus;
  operationalMode: string;
  createdAt: string;
  updatedAt: string;
  lastSeen: string | null;
  latestTelemetry: (TelemetryMetrics & { timestamp: string }) | null;
  activeAlertCount: number;
}

export type CommandType = 'START' | 'STOP' | 'RESTART' | 'SET_MODE';

export type CommandStatus =
  | 'PENDING'
  | 'DISPATCHED'
  | 'EXECUTED'
  | 'ACKNOWLEDGED'
  | 'FAILED';

export interface CommandRecord {
  commandId: string;
  deviceId: string;
  type: CommandType;
  parameters?: Record<string, unknown>;
  status: CommandStatus;
  createdAt: string;
  dispatchedAt?: string;
  acknowledgedAt?: string;
  executionResult?: {
    success: boolean;
    message: string;
  };
}

export type AlertType = 'HIGH_TEMPERATURE' | 'LOW_BATTERY' | 'DEVICE_OFFLINE';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'RESOLVED';

export interface AlertRecord {
  alertId: string;
  deviceId: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  metricValue?: number;
  thresholdValue?: number;
  triggeredAt: string;
  resolvedAt?: string | null;
}

export interface FleetSummary {
  devices: DeviceState[];
  total: number;
  online: number;
  offline: number;
  warning: number;
  activeAlerts: number;
}
