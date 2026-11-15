export type KioskStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'WARNING';

export type KioskType =
  | 'RETAIL_KIOSK'
  | 'DIGITAL_SIGNAGE'
  | 'INTERACTIVE_SCREEN'
  | 'AIRPORT_DISPLAY';

export interface CampaignAsset {
  assetId: string;
  filename: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'HTML_BUNDLE';
  sizeBytes: number;
  url: string;
  checksum: string;
}

export interface CampaignManifest {
  campaignId: string;
  name: string;
  version: string;
  themeColor: string;
  headline: string;
  description: string;
  assets: CampaignAsset[];
  targetKiosks: string[]; // ["ALL"] or specific kiosk IDs
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  publishedAt?: string;
}

export interface KioskState {
  kioskId: string;
  name: string;
  kioskType: KioskType;
  location: string;
  status: KioskStatus;
  activeCampaign: {
    campaignId: string;
    name: string;
    version: string;
    headline: string;
    themeColor?: string;
    description?: string;
    assets?: CampaignAsset[];
  };
  localCache: {
    totalAssetsCached: number;
    diskUsageMb: number;
  };
  lastHeartbeat: string | null;
  systemMetrics: {
    cpuUsage: number;
    temperature: number;
    storageFreeMb: number;
  };
  updatedAt: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  availableCampaign?: CampaignManifest | null;
}

export interface SyncAckPayload {
  kioskId: string;
  campaignId: string;
  version: string;
  success: boolean;
  downloadDurationMs: number;
  message: string;
}

export interface SyncHistoryRecord {
  syncId: string;
  kioskId: string;
  campaignId: string;
  version: string;
  appliedAt: string;
  downloadDurationMs: number;
  success: boolean;
  message: string;
}

export interface KioskRegistry {
  kioskIds: string[];
  updatedAt: string;
}

export interface FleetSummary {
  kiosks: KioskState[];
  total: number;
  online: number;
  syncing: number;
  offline: number;
  activeCampaigns: number;
}
