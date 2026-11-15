import { getStorageProvider } from './storage.js';
import { DeviceState, DeviceType, DeviceRegistry, FleetSummary, DeviceStatus } from '../types/index.js';
import { Logger } from '../utils/logger.js';

const DEVICE_ID_REGEX = /^[A-Z0-9_-]{3,32}$/;
const HEARTBEAT_TIMEOUT_MS = 60 * 1000; // 60 seconds

export class DeviceService {
  private static REGISTRY_KEY = 'devices/registry.json';

  static validateDeviceId(deviceId: string): boolean {
    return DEVICE_ID_REGEX.test(deviceId);
  }

  static async getRegistry(): Promise<DeviceRegistry> {
    const storage = getStorageProvider();
    const registry = await storage.getObject<DeviceRegistry>(this.REGISTRY_KEY);
    return registry || { deviceIds: [], updatedAt: new Date().toISOString() };
  }

  static async saveRegistry(registry: DeviceRegistry): Promise<void> {
    const storage = getStorageProvider();
    registry.updatedAt = new Date().toISOString();
    await storage.putObject(this.REGISTRY_KEY, registry);
  }

  static async registerDevice(input: {
    deviceId: string;
    name: string;
    deviceType?: DeviceType;
    location?: string;
  }): Promise<DeviceState> {
    const { deviceId, name, deviceType = 'ENVIRONMENTAL_MONITOR', location = 'Unassigned' } = input;

    if (!this.validateDeviceId(deviceId)) {
      throw new Error(`Invalid device ID '${deviceId}'. Must be 3-32 alphanumeric characters, dashes, or underscores.`);
    }

    if (!name || name.trim().length === 0) {
      throw new Error('Device name is required.');
    }

    const storage = getStorageProvider();
    const stateKey = `devices/${deviceId}/state.json`;
    const existing = await storage.getObject<DeviceState>(stateKey);
    if (existing) {
      throw new Error(`Device '${deviceId}' is already registered.`);
    }

    const now = new Date().toISOString();
    const newState: DeviceState = {
      deviceId,
      name: name.trim(),
      deviceType,
      location: location.trim(),
      status: 'OFFLINE',
      operationalMode: 'NORMAL',
      createdAt: now,
      updatedAt: now,
      lastSeen: null,
      latestTelemetry: null,
      activeAlertCount: 0,
    };

    await storage.putObject(stateKey, newState);

    const registry = await this.getRegistry();
    if (!registry.deviceIds.includes(deviceId)) {
      registry.deviceIds.push(deviceId);
      await this.saveRegistry(registry);
    }

    Logger.info('DEVICE_REGISTERED', `Device ${deviceId} registered successfully`, {
      deviceId,
      details: { name, deviceType, location },
    });

    return newState;
  }

  static evaluateDeviceStatus(device: DeviceState): DeviceState {
    if (!device.lastSeen) {
      return { ...device, status: 'OFFLINE' };
    }

    const lastSeenTime = new Date(device.lastSeen).getTime();
    const now = Date.now();
    const isTimeout = now - lastSeenTime > HEARTBEAT_TIMEOUT_MS;

    if (isTimeout) {
      return { ...device, status: 'OFFLINE' };
    }

    return device;
  }

  static async getDevice(deviceId: string): Promise<DeviceState | null> {
    const storage = getStorageProvider();
    const stateKey = `devices/${deviceId}/state.json`;
    const state = await storage.getObject<DeviceState>(stateKey);
    if (!state) return null;

    return this.evaluateDeviceStatus(state);
  }

  static async listDevices(): Promise<FleetSummary> {
    const registry = await this.getRegistry();
    const storage = getStorageProvider();

    const devicePromises = registry.deviceIds.map(async (id) => {
      const state = await storage.getObject<DeviceState>(`devices/${id}/state.json`);
      return state ? this.evaluateDeviceStatus(state) : null;
    });

    const states = (await Promise.all(devicePromises)).filter(
      (s): s is DeviceState => s !== null
    );

    let online = 0;
    let offline = 0;
    let warning = 0;
    let activeAlerts = 0;

    for (const d of states) {
      if (d.status === 'ONLINE') online++;
      else if (d.status === 'WARNING') warning++;
      else offline++;

      activeAlerts += d.activeAlertCount || 0;
    }

    return {
      devices: states,
      total: states.length,
      online,
      offline,
      warning,
      activeAlerts,
    };
  }
}
