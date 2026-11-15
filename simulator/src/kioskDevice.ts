import * as fs from 'fs';
import * as path from 'path';

export interface SimulatedKioskConfig {
  kioskId: string;
  name: string;
  location: string;
  kioskType?: string;
  apiBaseUrl: string;
  updateCheckIntervalMs?: number;
  heartbeatIntervalMs?: number;
}

export interface LocalActiveCampaign {
  campaignId: string;
  name: string;
  version: string;
  headline: string;
  themeColor: string;
  assets?: Array<{ filename: string; sizeBytes: number; url: string; mediaType?: string }>;
}

export class SimulatedKiosk {
  public readonly kioskId: string;
  public readonly name: string;
  public readonly location: string;
  public readonly kioskType: string;
  public readonly apiBaseUrl: string;

  private isRunning: boolean = false;
  private isDisconnected: boolean = false;
  private isUpdating: boolean = false;
  private updateCheckIntervalMs: number;
  private heartbeatIntervalMs: number;

  private activeCampaign: LocalActiveCampaign = {
    campaignId: 'CMP-DEFAULT-001',
    name: 'Default Store Welcome Promo',
    version: '1.0.0',
    headline: 'Welcome to Our Store - Discover Latest Arrivals',
    themeColor: '#3b82f6',
  };

  private localCacheDiskUsageMb: number = 24.5;
  private totalAssetsCached: number = 1;

  private updateTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private playbackLogTimer: NodeJS.Timeout | null = null;

  constructor(config: SimulatedKioskConfig) {
    this.kioskId = config.kioskId;
    this.name = config.name;
    this.location = config.location;
    this.kioskType = config.kioskType || 'RETAIL_KIOSK';
    this.apiBaseUrl = config.apiBaseUrl.replace(/\/+$/, '');
    this.updateCheckIntervalMs = config.updateCheckIntervalMs || 6000;
    this.heartbeatIntervalMs = config.heartbeatIntervalMs || 4000;
  }

  public getActiveCampaign(): LocalActiveCampaign {
    return this.activeCampaign;
  }

  public disconnect(): void {
    this.isDisconnected = true;
    console.log(`[${this.kioskId}] Network disconnected / power offline simulated.`);
  }

  public reconnect(): void {
    this.isDisconnected = false;
    console.log(`[${this.kioskId}] Network reconnected.`);
  }

  public async register(): Promise<void> {
    try {
      const res = await fetch(`${this.apiBaseUrl}/kiosks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kioskId: this.kioskId,
          name: this.name,
          location: this.location,
          kioskType: this.kioskType,
        }),
      });

      if (res.ok) {
        console.log(`[${this.kioskId}] Kiosk identity registered with Cloud API.`);
      }
    } catch (err: unknown) {
      console.warn(`[${this.kioskId}] Registration warning: ${(err as Error).message}`);
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`\n===================================================================`);
    console.log(`[${this.kioskId}] SMART KIOSK STARTED at '${this.location}'`);
    console.log(`[${this.kioskId}] Local Offline Playback active: "${this.activeCampaign.headline}" (v${this.activeCampaign.version})`);
    console.log(`[${this.kioskId}] Serverless update checks scheduled every ${this.updateCheckIntervalMs / 1000}s`);
    console.log(`===================================================================\n`);

    // Immediate initial check-in & heartbeat
    this.sendHeartbeat();
    this.checkForCloudUpdates();

    // Periodic heartbeat loop
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatIntervalMs);

    // Periodic on-demand update check loop
    this.updateTimer = setInterval(() => {
      this.checkForCloudUpdates();
    }, this.updateCheckIntervalMs);

    // Periodic local playback status log (demonstrates offline local playback without cloud dependency)
    this.playbackLogTimer = setInterval(() => {
      if (this.isRunning) {
        console.log(`[${this.kioskId}] [LOCAL PLAYBACK] Screen rendering: "${this.activeCampaign.headline}" (Cached locally on device disk - 0 Cloud bytes used)`);
      }
    }, 12000);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.updateTimer) clearInterval(this.updateTimer);
    if (this.playbackLogTimer) clearInterval(this.playbackLogTimer);
    this.heartbeatTimer = null;
    this.updateTimer = null;
    this.playbackLogTimer = null;
    console.log(`[${this.kioskId}] Kiosk playback terminated.`);
  }

  public async sendHeartbeat(): Promise<void> {
    if (!this.isRunning || this.isDisconnected) return;

    try {
      await fetch(`${this.apiBaseUrl}/kiosks/${this.kioskId}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: {
            cpuUsage: Number((3 + Math.random() * 4).toFixed(1)),
            temperature: Number((28 + Math.random() * 3).toFixed(1)),
            storageFreeMb: 48000,
            diskUsageMb: this.localCacheDiskUsageMb,
          },
        }),
      });
    } catch (err: unknown) {
      // Background heartbeat failure acceptable if network is offline
    }
  }

  public async checkForCloudUpdates(): Promise<boolean> {
    if (!this.isRunning || this.isDisconnected || this.isUpdating) return false;
    this.isUpdating = true;

    try {
      console.log(`[${this.kioskId}] Checking Cloud API for updates (Current Local Version: v${this.activeCampaign.version})...`);
      const res = await fetch(`${this.apiBaseUrl}/kiosks/${this.kioskId}/check-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentVersion: this.activeCampaign.version }),
      });

      if (!res.ok) return false;

      const data = (await res.json()) as {
        hasUpdate: boolean;
        availableCampaign?: {
          campaignId: string;
          name: string;
          version: string;
          themeColor: string;
          headline: string;
          assets: Array<{ filename: string; sizeBytes: number; url: string }>;
        };
      };

      if (data.hasUpdate && data.availableCampaign) {
        const camp = data.availableCampaign;
        console.log(`\n>>> [${this.kioskId}] NEW CLOUD UPDATE DETECTED! <<<`);
        console.log(`[${this.kioskId}] Campaign: "${camp.name}" | Target Version: v${camp.version}`);
        console.log(`[${this.kioskId}] Headline: "${camp.headline}"`);

        const downloadStart = Date.now();
        let totalRealBytes = 0;
        let totalCacheHits = 0;
        const cacheDir = path.resolve(process.cwd(), '.kiosk-cache', this.kioskId);
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }

        console.log(`[${this.kioskId}] Verifying local edge cache in '${cacheDir}'...`);

        for (const asset of camp.assets) {
          const destFile = path.join(cacheDir, asset.filename);

          // Check if asset already exists in local disk cache
          if (fs.existsSync(destFile) && fs.statSync(destFile).size > 0) {
            const stat = fs.statSync(destFile);
            totalCacheHits++;
            console.log(`[${this.kioskId}]    ⚡ [LOCAL CACHE HIT] '${asset.filename}' (${(stat.size / 1024).toFixed(1)} KB) already exists on device disk.`);
            console.log(`[${this.kioskId}]    ⚡ [ZERO CLOUD EGRESS] Bypassed S3 download! 0 Cloud bytes used.`);
            continue;
          }

          // Cache miss: download from S3
          try {
            console.log(`[${this.kioskId}] -> [CACHE MISS] Downloading ${asset.filename} from S3 (${asset.url})...`);
            const assetRes = await fetch(asset.url);
            if (assetRes.ok) {
              const arrayBuf = await assetRes.arrayBuffer();
              fs.writeFileSync(destFile, Buffer.from(arrayBuf));
              const stat = fs.statSync(destFile);
              totalRealBytes += stat.size;
              console.log(`[${this.kioskId}]    [SAVED TO DISK] ${asset.filename} (${(stat.size / 1024).toFixed(1)} KB) saved in local cache.`);
            } else {
              totalRealBytes += asset.sizeBytes || 1024 * 500;
            }
          } catch {
            totalRealBytes += asset.sizeBytes || 1024 * 500;
          }
        }

        const isFullCacheHit = totalCacheHits === camp.assets.length && camp.assets.length > 0;
        const downloadDurationMs = isFullCacheHit ? 15 : Math.max(Date.now() - downloadStart, 250);

        // Switch local screen display
        this.activeCampaign = {
          campaignId: camp.campaignId,
          name: camp.name,
          version: camp.version,
          headline: camp.headline,
          themeColor: camp.themeColor || '#10b981',
          assets: camp.assets,
        };

        if (isFullCacheHit) {
          console.log(`[${this.kioskId}] ⚡ [INSTANT SWITCH] 100% Local Cache Hit! Bypassed S3 download (0 KB egress).`);
        } else {
          const downloadedMb = Number((totalRealBytes / (1024 * 1024)).toFixed(2));
          this.localCacheDiskUsageMb = Number((this.localCacheDiskUsageMb + downloadedMb).toFixed(1));
          this.totalAssetsCached += (camp.assets.length - totalCacheHits);
          console.log(`[${this.kioskId}] Download complete (${downloadedMb} MB saved to local disk cache).`);
        }

        console.log(`[${this.kioskId}] SCREEN SWITCHED: Now rendering "${this.activeCampaign.headline}" (v${this.activeCampaign.version})`);

        // Send acknowledgement to Cloud API
        await this.postSyncAcknowledgement(
          camp.campaignId,
          camp.version,
          downloadDurationMs,
          isFullCacheHit,
          totalRealBytes
        );
        return true;
      } else {
        console.log(`[${this.kioskId}] Up to date. Resuming local playback.`);
        return false;
      }
    } catch (err: unknown) {
      console.warn(`[${this.kioskId}] Update check warning: ${(err as Error).message}`);
      return false;
    } finally {
      this.isUpdating = false;
    }
  }

  private async postSyncAcknowledgement(
    campaignId: string,
    version: string,
    durationMs: number,
    cacheHit: boolean = false,
    bytesDownloaded: number = 0
  ): Promise<void> {
    try {
      await fetch(`${this.apiBaseUrl}/kiosks/${this.kioskId}/sync-ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kioskId: this.kioskId,
          campaignId,
          version,
          success: true,
          downloadDurationMs: durationMs,
          cacheHit,
          bytesDownloaded,
          message: cacheHit
            ? `⚡ Local cache hit: 0 S3 egress bytes used. Instantly switched from local disk cache.`
            : `Assets downloaded from S3 and cached locally. Kiosk screen switched to ${version}.`,
        }),
      });
      console.log(`[${this.kioskId}] Acknowledged update completion to Cloud Backend.`);
    } catch (err: unknown) {
      console.warn(`[${this.kioskId}] Sync ACK failed: ${(err as Error).message}`);
    }
  }
}

