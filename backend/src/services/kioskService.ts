import { getStorageProvider } from './storage.js';
import { KioskState, KioskType, KioskRegistry, FleetSummary } from '../types/index.js';
import { Logger } from '../utils/logger.js';

const KIOSK_ID_REGEX = /^[A-Z0-9_-]{3,32}$/;
const HEARTBEAT_TIMEOUT_MS = 60 * 1000; // 60 seconds

export class KioskService {
  private static REGISTRY_KEY = 'kiosks/registry.json';

  static validateKioskId(kioskId: string): boolean {
    return KIOSK_ID_REGEX.test(kioskId);
  }

  static async getRegistry(): Promise<KioskRegistry> {
    const storage = getStorageProvider();
    const registry = await storage.getObject<KioskRegistry>(this.REGISTRY_KEY);
    return registry || { kioskIds: [], updatedAt: new Date().toISOString() };
  }

  static async saveRegistry(registry: KioskRegistry): Promise<void> {
    const storage = getStorageProvider();
    registry.updatedAt = new Date().toISOString();
    await storage.putObject(this.REGISTRY_KEY, registry);
  }

  static async registerKiosk(input: {
    kioskId: string;
    name: string;
    kioskType?: KioskType;
    location?: string;
  }): Promise<KioskState> {
    const { kioskId, name, kioskType = 'RETAIL_KIOSK', location = 'Store Location 1' } = input;

    if (!this.validateKioskId(kioskId)) {
      throw new Error(`Invalid kiosk ID '${kioskId}'. Must be 3-32 alphanumeric characters, dashes, or underscores.`);
    }

    if (!name || name.trim().length === 0) {
      throw new Error('Kiosk name is required.');
    }

    const storage = getStorageProvider();
    const stateKey = `kiosks/${kioskId}/state.json`;
    const existing = await storage.getObject<KioskState>(stateKey);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const newState: KioskState = {
      kioskId,
      name: name.trim(),
      kioskType,
      location: location.trim(),
      status: 'OFFLINE',
      activeCampaign: {
        campaignId: 'CMP-DEFAULT-001',
        name: 'Default Store Welcome Promo',
        version: '1.0.0',
        headline: 'Welcome to Our Store - Discover Latest Arrivals',
        themeColor: '#3b82f6',
      },
      localCache: {
        totalAssetsCached: 1,
        diskUsageMb: 18.5,
      },
      lastHeartbeat: null,
      systemMetrics: {
        cpuUsage: 4.8,
        temperature: 26.5,
        storageFreeMb: 52400,
      },
      updatedAt: now,
    };

    await storage.putObject(stateKey, newState);

    const registry = await this.getRegistry();
    if (!registry.kioskIds.includes(kioskId)) {
      registry.kioskIds.push(kioskId);
      await this.saveRegistry(registry);
    }

    Logger.info('KIOSK_REGISTERED', `Kiosk ${kioskId} registered at ${location}`, {
      deviceId: kioskId,
      details: { name, kioskType, location },
    });

    return newState;
  }

  static evaluateKioskStatus(kiosk: KioskState): KioskState {
    if (!kiosk.lastHeartbeat) {
      return { ...kiosk, status: 'OFFLINE' };
    }

    const diff = Date.now() - new Date(kiosk.lastHeartbeat).getTime();
    if (diff > HEARTBEAT_TIMEOUT_MS) {
      return { ...kiosk, status: 'OFFLINE' };
    }

    return kiosk;
  }

  static async getKiosk(kioskId: string): Promise<KioskState | null> {
    const storage = getStorageProvider();
    const state = await storage.getObject<KioskState>(`kiosks/${kioskId}/state.json`);
    if (!state) return null;
    return this.evaluateKioskStatus(state);
  }

  static async updateHeartbeat(
    kioskId: string,
    metrics?: { cpuUsage?: number; temperature?: number; storageFreeMb?: number; diskUsageMb?: number }
  ): Promise<KioskState> {
    const storage = getStorageProvider();
    const stateKey = `kiosks/${kioskId}/state.json`;
    let kiosk = await storage.getObject<KioskState>(stateKey);

    if (!kiosk) {
      kiosk = await this.registerKiosk({
        kioskId,
        name: `Smart Kiosk ${kioskId}`,
      });
    }

    const now = new Date().toISOString();
    kiosk.lastHeartbeat = now;
    kiosk.updatedAt = now;
    kiosk.status = 'ONLINE';

    if (metrics) {
      if (metrics.cpuUsage !== undefined) kiosk.systemMetrics.cpuUsage = metrics.cpuUsage;
      if (metrics.temperature !== undefined) kiosk.systemMetrics.temperature = metrics.temperature;
      if (metrics.storageFreeMb !== undefined) kiosk.systemMetrics.storageFreeMb = metrics.storageFreeMb;
      if (metrics.diskUsageMb !== undefined) kiosk.localCache.diskUsageMb = metrics.diskUsageMb;
    }

    await storage.putObject(stateKey, kiosk);
    return kiosk;
  }

  static async listKiosks(): Promise<FleetSummary> {
    const registry = await this.getRegistry();
    const storage = getStorageProvider();

    const promises = registry.kioskIds.map(async (id) => {
      const state = await storage.getObject<KioskState>(`kiosks/${id}/state.json`);
      return state ? this.evaluateKioskStatus(state) : null;
    });

    const kiosks = (await Promise.all(promises)).filter((k): k is KioskState => k !== null);

    let online = 0;
    let syncing = 0;
    let offline = 0;

    for (const k of kiosks) {
      if (k.status === 'ONLINE') online++;
      else if (k.status === 'SYNCING') syncing++;
      else offline++;
    }

    // Count published campaigns
    const campaignKeys = await storage.listObjects('campaigns/');
    const campaignCount = campaignKeys.filter((k) => k.endsWith('manifest.json')).length;

    return {
      kiosks,
      total: kiosks.length,
      online,
      syncing,
      offline,
      activeCampaigns: campaignCount || 1,
    };
  }
}
