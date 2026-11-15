import { randomUUID } from 'crypto';
import { getStorageProvider } from './storage.js';
import { AlertRecord, AlertType, AlertSeverity, AlertStatus, DeviceState } from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { DeviceService } from './deviceService.js';

export class AlertService {
  static async createAlert(input: {
    deviceId: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    metricValue?: number;
    thresholdValue?: number;
  }): Promise<AlertRecord> {
    const { deviceId, type, severity, message, metricValue, thresholdValue } = input;
    const alertId = `alt_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const alert: AlertRecord = {
      alertId,
      deviceId,
      type,
      severity,
      status: 'ACTIVE',
      message,
      metricValue,
      thresholdValue,
      triggeredAt: now,
      resolvedAt: null,
    };

    const storage = getStorageProvider();
    const alertKey = `devices/${deviceId}/alerts/${alertId}.json`;
    await storage.putObject(alertKey, alert);

    Logger.warn('ALERT_GENERATED', message, {
      deviceId,
      details: { alertId, type, severity, metricValue, thresholdValue },
    });

    await this.refreshDeviceAlertCount(deviceId);
    return alert;
  }

  static async refreshDeviceAlertCount(deviceId: string): Promise<number> {
    const storage = getStorageProvider();
    const alertKeys = await storage.listObjects(`devices/${deviceId}/alerts/`);
    let activeCount = 0;

    for (const key of alertKeys) {
      const alert = await storage.getObject<AlertRecord>(key);
      if (alert && alert.status === 'ACTIVE') {
        activeCount++;
      }
    }

    const stateKey = `devices/${deviceId}/state.json`;
    const state = await storage.getObject<DeviceState>(stateKey);
    if (state) {
      state.activeAlertCount = activeCount;
      state.updatedAt = new Date().toISOString();
      await storage.putObject(stateKey, state);
    }

    return activeCount;
  }

  static async listAlerts(filter?: {
    deviceId?: string;
    status?: AlertStatus;
  }): Promise<AlertRecord[]> {
    const storage = getStorageProvider();
    let targetPrefixes: string[] = [];

    if (filter?.deviceId) {
      targetPrefixes = [`devices/${filter.deviceId}/alerts/`];
    } else {
      const registry = await DeviceService.getRegistry();
      targetPrefixes = registry.deviceIds.map((id) => `devices/${id}/alerts/`);
    }

    const allAlerts: AlertRecord[] = [];
    for (const prefix of targetPrefixes) {
      const keys = await storage.listObjects(prefix);
      for (const key of keys) {
        const alert = await storage.getObject<AlertRecord>(key);
        if (alert) {
          if (!filter?.status || alert.status === filter.status) {
            allAlerts.push(alert);
          }
        }
      }
    }

    // Sort newest first
    allAlerts.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
    return allAlerts;
  }

  static async resolveAlert(deviceId: string, alertId: string): Promise<AlertRecord> {
    const storage = getStorageProvider();
    const alertKey = `devices/${deviceId}/alerts/${alertId}.json`;
    const alert = await storage.getObject<AlertRecord>(alertKey);

    if (!alert) {
      throw new Error(`Alert '${alertId}' not found for device '${deviceId}'.`);
    }

    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date().toISOString();
    await storage.putObject(alertKey, alert);

    Logger.info('ALERT_RESOLVED', `Alert ${alertId} resolved for ${deviceId}`, {
      deviceId,
      details: { alertId, type: alert.type },
    });

    await this.refreshDeviceAlertCount(deviceId);
    return alert;
  }
}
