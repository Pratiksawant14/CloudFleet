import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { DeviceService } from '../services/deviceService.js';
import { TelemetryService } from '../services/telemetryService.js';
import { CommandService } from '../services/commandService.js';
import { AlertService } from '../services/alertService.js';
import { setStorageProvider, LocalStorageProvider } from '../services/storage.js';

const TEST_DATA_DIR = path.resolve(process.cwd(), '.test-storage');

describe('CloudFleet Backend Service Layer Tests', () => {
  beforeEach(() => {
    // Reset test storage directory
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    setStorageProvider(new LocalStorageProvider(TEST_DATA_DIR));
  });

  it('DeviceService should register a new simulated device', async () => {
    const device = await DeviceService.registerDevice({
      deviceId: 'CF-DEVICE-001',
      name: 'Temperature Sensor 001',
      deviceType: 'ENVIRONMENTAL_MONITOR',
      location: 'Warehouse-Bay-1',
    });

    assert.equal(device.deviceId, 'CF-DEVICE-001');
    assert.equal(device.name, 'Temperature Sensor 001');
    assert.equal(device.status, 'OFFLINE'); // Initial state before telemetry

    const fetched = await DeviceService.getDevice('CF-DEVICE-001');
    assert.ok(fetched);
    assert.equal(fetched.name, 'Temperature Sensor 001');
  });

  it('DeviceService should reject invalid device ID format', async () => {
    await assert.rejects(
      async () => {
        await DeviceService.registerDevice({
          deviceId: 'invalid id with spaces!',
          name: 'Bad Sensor',
        });
      },
      /Invalid device ID/
    );
  });

  it('DeviceService should list fleet with summary counts', async () => {
    await DeviceService.registerDevice({
      deviceId: 'CF-DEVICE-001',
      name: 'Sensor 1',
    });
    await DeviceService.registerDevice({
      deviceId: 'CF-DEVICE-002',
      name: 'Sensor 2',
    });

    const fleet = await DeviceService.listDevices();
    assert.equal(fleet.total, 2);
    assert.equal(fleet.offline, 2);
    assert.equal(fleet.online, 0);
  });

  it('TelemetryService should ingest normal telemetry and transition status to ONLINE', async () => {
    await DeviceService.registerDevice({
      deviceId: 'CF-DEVICE-001',
      name: 'Sensor 1',
    });

    const result = await TelemetryService.ingestTelemetry('CF-DEVICE-001', {
      timestamp: new Date().toISOString(),
      metrics: {
        temperature: 24.5,
        humidity: 55.0,
        battery: 95.0,
      },
    });

    assert.equal(result.deviceState.status, 'ONLINE');
    assert.equal(result.deviceState.latestTelemetry?.temperature, 24.5);

    const history = await TelemetryService.getTelemetryHistory('CF-DEVICE-001', 10);
    assert.equal(history.length, 1);
    assert.equal(history[0].metrics.temperature, 24.5);
  });

  it('TelemetryService should detect high temperature and trigger WARNING and Alert', async () => {
    await DeviceService.registerDevice({
      deviceId: 'CF-DEVICE-001',
      name: 'Sensor 1',
    });

    const result = await TelemetryService.ingestTelemetry('CF-DEVICE-001', {
      timestamp: new Date().toISOString(),
      metrics: {
        temperature: 39.2, // > 35°C threshold
        humidity: 50.0,
        battery: 88.0,
      },
    });

    assert.equal(result.deviceState.status, 'WARNING');

    const alerts = await AlertService.listAlerts({ deviceId: 'CF-DEVICE-001', status: 'ACTIVE' });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, 'HIGH_TEMPERATURE');
    assert.equal(alerts[0].severity, 'WARNING');
  });

  it('CommandService should dispatch, poll, and acknowledge commands', async () => {
    await DeviceService.registerDevice({
      deviceId: 'CF-DEVICE-001',
      name: 'Sensor 1',
    });

    // 1. Dispatch
    const command = await CommandService.sendCommand({
      deviceId: 'CF-DEVICE-001',
      type: 'RESTART',
      parameters: { graceful: true },
    });

    assert.equal(command.status, 'PENDING');

    // 2. Poll pending
    const pending = await CommandService.getPendingCommands('CF-DEVICE-001');
    assert.equal(pending.length, 1);
    assert.equal(pending[0].commandId, command.commandId);

    // 3. Acknowledge
    const acked = await CommandService.acknowledgeCommand({
      deviceId: 'CF-DEVICE-001',
      commandId: command.commandId,
      status: 'ACKNOWLEDGED',
      executionResult: { success: true, message: 'Rebooted cleanly.' },
    });

    assert.equal(acked.status, 'ACKNOWLEDGED');
    assert.ok(acked.acknowledgedAt);
  });

  it('AlertService should resolve alerts and update device activeAlertCount', async () => {
    await DeviceService.registerDevice({
      deviceId: 'CF-DEVICE-001',
      name: 'Sensor 1',
    });

    const alert = await AlertService.createAlert({
      deviceId: 'CF-DEVICE-001',
      type: 'LOW_BATTERY',
      severity: 'WARNING',
      message: 'Battery level critically low (12%)',
      metricValue: 12.0,
      thresholdValue: 20.0,
    });

    assert.equal(alert.status, 'ACTIVE');

    let dev = await DeviceService.getDevice('CF-DEVICE-001');
    assert.equal(dev?.activeAlertCount, 1);

    await AlertService.resolveAlert('CF-DEVICE-001', alert.alertId);

    const activeAlerts = await AlertService.listAlerts({
      deviceId: 'CF-DEVICE-001',
      status: 'ACTIVE',
    });
    assert.equal(activeAlerts.length, 0);

    dev = await DeviceService.getDevice('CF-DEVICE-001');
    assert.equal(dev?.activeAlertCount, 0);
  });
});

