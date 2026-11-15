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
}

export class SimulatedKiosk {
  public readonly kioskId: string;
  public readonly name: string;
  public readonly location: string;
  public readonly kioskType: string;
  public readonly apiBaseUrl: string;

  private isRunning: boolean = false;
  private isDisconnected: boolean = false;
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
    if (!this.isRunning || this.isDisconnected) return false;

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
        console.log(`[${this.kioskId}] Pulling ${camp.assets.length} media asset(s) from S3 into local disk cache...`);

        const downloadStart = Date.now();
        // Simulate asset download latency from Amazon S3
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const downloadDurationMs = Date.now() - downloadStart;

        // Switch local screen display
        this.activeCampaign = {
          campaignId: camp.campaignId,
          name: camp.name,
          version: camp.version,
          headline: camp.headline,
          themeColor: camp.themeColor || '#10b981',
        };

        const downloadedMb = camp.assets.reduce((sum, a) => sum + (a.sizeBytes || 0), 0) / (1024 * 1024);
        this.localCacheDiskUsageMb = Number((this.localCacheDiskUsageMb + downloadedMb).toFixed(1));
        this.totalAssetsCached += camp.assets.length;

        console.log(`[${this.kioskId}] Download complete (${downloadedMb.toFixed(1)} MB saved to local storage).`);
        console.log(`[${this.kioskId}] SCREEN SWITCHED: Now rendering "${this.activeCampaign.headline}" (v${this.activeCampaign.version})`);

        // Send acknowledgement to Cloud API
        await this.postSyncAcknowledgement(camp.campaignId, camp.version, downloadDurationMs);
        return true;
      } else {
        console.log(`[${this.kioskId}] Up to date. Resuming local playback.`);
        return false;
      }
    } catch (err: unknown) {
      console.warn(`[${this.kioskId}] Update check warning: ${(err as Error).message}`);
      return false;
    }
  }

  private async postSyncAcknowledgement(
    campaignId: string,
    version: string,
    durationMs: number
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
          message: `Assets downloaded from S3 and cached locally. Kiosk screen switched to ${version}.`,
        }),
      });
      console.log(`[${this.kioskId}] Acknowledged update completion to Cloud Backend.`);
    } catch (err: unknown) {
      console.warn(`[${this.kioskId}] Sync ACK failed: ${(err as Error).message}`);
    }
  }
}

