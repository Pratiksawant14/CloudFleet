import { randomUUID } from 'crypto';
import { getStorageProvider } from './storage.js';
import {
  TelemetryPayload,
  TelemetryRecord,
  DeviceState,
  DeviceStatus,
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { AlertService } from './alertService.js';

const TEMP_WARNING_THRESHOLD = 35.0; // °C
const TEMP_CRITICAL_THRESHOLD = 45.0; // °C
const BATTERY_WARNING_THRESHOLD = 20.0; // %
const BATTERY_CRITICAL_THRESHOLD = 5.0; // %

export class TelemetryService {
  static validatePayload(payload: TelemetryPayload): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Telemetry payload must be a non-null object.');
    }
    const { metrics } = payload;
    if (!metrics || typeof metrics !== 'object') {
      throw new Error("Telemetry payload must contain a 'metrics' object.");
    }

    if (
      typeof metrics.temperature !== 'number' ||
      isNaN(metrics.temperature) ||
      metrics.temperature < -50 ||
      metrics.temperature > 100
    ) {
      throw new Error('Metrics temperature must be a number between -50°C and 100°C.');
    }

    if (
      typeof metrics.humidity !== 'number' ||
      isNaN(metrics.humidity) ||
      metrics.humidity < 0 ||
      metrics.humidity > 100
    ) {
      throw new Error('Metrics humidity must be a number between 0% and 100%.');
    }

    if (
      typeof metrics.battery !== 'number' ||
      isNaN(metrics.battery) ||
      metrics.battery < 0 ||
      metrics.battery > 100
    ) {
      throw new Error('Metrics battery must be a number between 0% and 100%.');
    }
  }

  static async ingestTelemetry(
    deviceId: string,
    payload: TelemetryPayload
  ): Promise<{ telemetryRecord: TelemetryRecord; deviceState: DeviceState }> {
    this.validatePayload(payload);

    const storage = getStorageProvider();
    const stateKey = `devices/${deviceId}/state.json`;
    const deviceState = await storage.getObject<DeviceState>(stateKey);

    if (!deviceState) {
      throw new Error(`Device '${deviceId}' not found. Register device first.`);
    }

    const now = new Date();
    const timestampStr = payload.timestamp || now.toISOString();
    const telemetryId = `tel_${randomUUID().slice(0, 8)}`;

    const record: TelemetryRecord = {
      telemetryId,
      deviceId,
      timestamp: timestampStr,
      metrics: {
        temperature: Number(payload.metrics.temperature.toFixed(1)),
        humidity: Number(payload.metrics.humidity.toFixed(1)),
        battery: Number(payload.metrics.battery.toFixed(1)),
      },
      simulatorMetadata: payload.simulatorMetadata,
    };

    // Safe S3 key timestamp
    const safeTimestamp = timestampStr.replace(/[:.]/g, '-');
    const telemetryKey = `devices/${deviceId}/telemetry/${safeTimestamp}_${telemetryId}.json`;
    await storage.putObject(telemetryKey, record);

    // Evaluate alerts and status
    let assignedStatus: DeviceStatus = 'ONLINE';
    let triggeredAlert = false;

    // High temperature evaluation
    if (record.metrics.temperature > TEMP_WARNING_THRESHOLD) {
      assignedStatus = 'WARNING';
      triggeredAlert = true;
      const severity =
        record.metrics.temperature > TEMP_CRITICAL_THRESHOLD ? 'CRITICAL' : 'WARNING';
      await AlertService.createAlert({
        deviceId,
        type: 'HIGH_TEMPERATURE',
        severity,
        message: `High temperature condition: ${record.metrics.temperature}°C (Limit: ${TEMP_WARNING_THRESHOLD}°C)`,
        metricValue: record.metrics.temperature,
        thresholdValue: TEMP_WARNING_THRESHOLD,
      });
    }

    // Low battery evaluation
    if (record.metrics.battery < BATTERY_WARNING_THRESHOLD) {
      assignedStatus = 'WARNING';
      triggeredAlert = true;
      const severity =
        record.metrics.battery < BATTERY_CRITICAL_THRESHOLD ? 'CRITICAL' : 'WARNING';
      await AlertService.createAlert({
        deviceId,
        type: 'LOW_BATTERY',
        severity,
        message: `Low battery warning: ${record.metrics.battery}% (Limit: ${BATTERY_WARNING_THRESHOLD}%)`,
        metricValue: record.metrics.battery,
        thresholdValue: BATTERY_WARNING_THRESHOLD,
      });
    }

    // Update state.json
    deviceState.status = assignedStatus;
    deviceState.lastSeen = now.toISOString();
    deviceState.updatedAt = now.toISOString();
    deviceState.latestTelemetry = {
      ...record.metrics,
      timestamp: record.timestamp,
    };

    await storage.putObject(stateKey, deviceState);

    Logger.info('TELEMETRY_INGESTED', `Telemetry processed for ${deviceId}`, {
      deviceId,
      details: {
        telemetryId,
        metrics: record.metrics,
        statusAssigned: assignedStatus,
        alertTriggered: triggeredAlert,
      },
    });

    return { telemetryRecord: record, deviceState };
  }

  static async getTelemetryHistory(
    deviceId: string,
    limit: number = 50
  ): Promise<TelemetryRecord[]> {
    const storage = getStorageProvider();
    const prefix = `devices/${deviceId}/telemetry/`;
    const keys = await storage.listObjects(prefix);

    // Take the most recent keys (lexicographical sort on timestamp)
    keys.sort().reverse();
    const selectedKeys = keys.slice(0, Math.min(limit, 100));

    const records: TelemetryRecord[] = [];
    for (const key of selectedKeys) {
      const rec = await storage.getObject<TelemetryRecord>(key);
      if (rec) records.push(rec);
    }

    // Sort chronologically ascending for graphs
    records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return records;
  }
}
