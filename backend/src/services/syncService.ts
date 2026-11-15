import { randomUUID } from 'crypto';
import { getStorageProvider } from './storage.js';
import {
  UpdateCheckResult,
  SyncAckPayload,
  SyncHistoryRecord,
  KioskState,
} from '../types/index.js';
import { KioskService } from './kioskService.js';
import { CampaignService } from './campaignService.js';
import { Logger } from '../utils/logger.js';

export class SyncService {
  static async checkForUpdates(
    kioskId: string,
    currentVersion?: string
  ): Promise<UpdateCheckResult> {
    const kiosk = await KioskService.getKiosk(kioskId);
    if (!kiosk) {
      throw new Error(`Kiosk '${kioskId}' not found. Register kiosk first.`);
    }

    const versionToCheck = currentVersion || kiosk.activeCampaign.version;
    const latestCampaign = await CampaignService.getLatestCampaignForKiosk(kioskId);

    if (!latestCampaign) {
      return { hasUpdate: false, currentVersion: versionToCheck };
    }

    const hasUpdate = latestCampaign.version !== versionToCheck;

    if (hasUpdate) {
      // Transition kiosk status to SYNCING
      const storage = getStorageProvider();
      const now = new Date().toISOString();
      kiosk.status = 'SYNCING';
      kiosk.lastHeartbeat = now;
      kiosk.updatedAt = now;
      await storage.putObject(`kiosks/${kioskId}/state.json`, kiosk);

      Logger.info('UPDATE_AVAILABLE', `Update available for ${kioskId}: ${latestCampaign.name} (${latestCampaign.version})`, {
        deviceId: kioskId,
        details: { fromVersion: versionToCheck, toVersion: latestCampaign.version },
      });
    }

    return {
      hasUpdate,
      currentVersion: versionToCheck,
      availableCampaign: hasUpdate ? latestCampaign : null,
    };
  }

  static async acknowledgeSync(
    kioskId: string,
    payload: SyncAckPayload
  ): Promise<{ kiosk: KioskState; record: SyncHistoryRecord }> {
    const storage = getStorageProvider();
    const stateKey = `kiosks/${kioskId}/state.json`;
    const kiosk = await storage.getObject<KioskState>(stateKey);

    if (!kiosk) {
      throw new Error(`Kiosk '${kioskId}' not found.`);
    }

    const campaign = await CampaignService.getCampaign(payload.campaignId);
    const now = new Date().toISOString();

    if (payload.success) {
      kiosk.activeCampaign = {
        campaignId: payload.campaignId,
        name: campaign?.name || 'Updated Campaign',
        version: payload.version,
        headline: campaign?.headline || '',
        themeColor: campaign?.themeColor || '#10b981',
        assets: campaign?.assets || [],
      };
      kiosk.status = 'ONLINE';
      kiosk.lastHeartbeat = now;
      kiosk.updatedAt = now;

      // Add downloaded size to local cache
      const totalDownloadedMb =
        (campaign?.assets.reduce((acc, a) => acc + (a.sizeBytes || 0), 0) || 0) / (1024 * 1024);
      kiosk.localCache.diskUsageMb = Number((kiosk.localCache.diskUsageMb + totalDownloadedMb).toFixed(1));
      kiosk.localCache.totalAssetsCached += campaign?.assets.length || 1;

      await storage.putObject(stateKey, kiosk);

      Logger.info('KIOSK_SYNC_SUCCESS', `Kiosk ${kioskId} successfully applied update ${payload.version}`, {
        deviceId: kioskId,
        details: { campaignId: payload.campaignId, version: payload.version, durationMs: payload.downloadDurationMs },
      });
    } else {
      kiosk.status = 'WARNING';
      kiosk.updatedAt = now;
      await storage.putObject(stateKey, kiosk);

      Logger.warn('KIOSK_SYNC_FAILED', `Kiosk ${kioskId} failed to apply update ${payload.version}: ${payload.message}`, {
        deviceId: kioskId,
        details: { error: payload.message },
      });
    }

    const record: SyncHistoryRecord = {
      syncId: `sync_${randomUUID().slice(0, 8)}`,
      kioskId,
      campaignId: payload.campaignId,
      version: payload.version,
      appliedAt: now,
      downloadDurationMs: payload.downloadDurationMs,
      success: payload.success,
      message: payload.message,
    };

    const historyKey = `kiosks/${kioskId}/sync_history.json`;
    const history = (await storage.getObject<SyncHistoryRecord[]>(historyKey)) || [];
    history.unshift(record);
    await storage.putObject(historyKey, history.slice(0, 30));

    return { kiosk, record };
  }

  static async getSyncHistory(kioskId: string): Promise<SyncHistoryRecord[]> {
    const storage = getStorageProvider();
    const history = await storage.getObject<SyncHistoryRecord[]>(`kiosks/${kioskId}/sync_history.json`);
    return history || [];
  }
}
