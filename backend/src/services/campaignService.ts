import { randomUUID } from 'crypto';
import { getStorageProvider } from './storage.js';
import { CampaignManifest } from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { AssetService } from './assetService.js';

export class CampaignService {
  private static DEFAULT_CAMPAIGN: CampaignManifest = {
    campaignId: 'CMP-DEFAULT-001',
    name: 'Default Store Welcome Promo',
    version: '1.0.0',
    themeColor: '#3b82f6',
    headline: 'Welcome to Our Store - Discover Latest Arrivals',
    description: 'Default onboarding campaign bundle stored locally on edge kiosks',
    assets: [
      {
        assetId: 'ast_welcome_banner',
        filename: 'welcome_screen_ad.svg',
        mediaType: 'IMAGE',
        sizeBytes: 154000,
        url: 'http://localhost:4000/assets/welcome_screen_ad.svg',
        checksum: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    ],
    targetKiosks: ['ALL'],
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  };

  static async ensureDefaultCampaign(): Promise<void> {
    try {
      await AssetService.seedDefaultAssets();
    } catch {}

    const storage = getStorageProvider();
    const manifestKey = `campaigns/${this.DEFAULT_CAMPAIGN.campaignId}/manifest.json`;
    const existing = await storage.getObject<CampaignManifest>(manifestKey);
    if (!existing) {
      await storage.putObject(manifestKey, this.DEFAULT_CAMPAIGN);
    }
  }

  static async createCampaign(input: {
    name: string;
    version: string;
    themeColor?: string;
    headline: string;
    description?: string;
    targetKiosks?: string[];
    assets?: Array<{
      filename: string;
      mediaType: 'IMAGE' | 'VIDEO' | 'HTML_BUNDLE';
      sizeBytes: number;
      url?: string;
    }>;
  }): Promise<CampaignManifest> {
    const {
      name,
      version,
      themeColor = '#f59e0b',
      headline,
      description = '',
      targetKiosks = ['ALL'],
      assets = [],
    } = input;

    if (!name || !version || !headline) {
      throw new Error('Name, version, and headline are required to create a campaign.');
    }

    const campaignId = `CMP-${version.replace(/[^a-zA-Z0-9]/g, '_')}-${randomUUID().slice(0, 6)}`.toUpperCase();
    const now = new Date().toISOString();

    const campaignAssets = assets.map((a, idx) => ({
      assetId: `ast_${idx + 1}_${randomUUID().slice(0, 6)}`,
      filename: a.filename,
      mediaType: a.mediaType,
      sizeBytes: a.sizeBytes || 2500000,
      url: a.url || `https://cloudfleet-storage.s3.amazonaws.com/campaigns/${campaignId}/assets/${a.filename}`,
      checksum: `sha256-${randomUUID().replace(/-/g, '')}`,
    }));

    // If no assets provided, create a default promo image asset
    if (campaignAssets.length === 0) {
      campaignAssets.push({
        assetId: `ast_promo_${randomUUID().slice(0, 6)}`,
        filename: `${name.toLowerCase().replace(/\s+/g, '_')}_banner.png`,
        mediaType: 'IMAGE',
        sizeBytes: 3200000,
        url: `https://cloudfleet-storage.s3.amazonaws.com/campaigns/${campaignId}/assets/promo_banner.png`,
        checksum: `sha256-${randomUUID().replace(/-/g, '')}`,
      });
    }

    const manifest: CampaignManifest = {
      campaignId,
      name,
      version,
      themeColor,
      headline,
      description,
      assets: campaignAssets,
      targetKiosks,
      status: 'PUBLISHED', // Direct publish for fast demo
      createdAt: now,
      publishedAt: now,
    };

    const storage = getStorageProvider();
    const key = `campaigns/${campaignId}/manifest.json`;
    await storage.putObject(key, manifest);

    Logger.info('CAMPAIGN_PUBLISHED', `Campaign ${name} (${version}) published to S3`, {
      details: { campaignId, version, headline, assetsCount: campaignAssets.length },
    });

    return manifest;
  }

  static async listCampaigns(): Promise<CampaignManifest[]> {
    await this.ensureDefaultCampaign();
    const storage = getStorageProvider();
    const keys = await storage.listObjects('campaigns/');
    const manifestKeys = keys.filter((k) => k.endsWith('manifest.json'));

    const campaigns: CampaignManifest[] = [];
    for (const key of manifestKeys) {
      const manifest = await storage.getObject<CampaignManifest>(key);
      if (manifest) {
        campaigns.push(manifest);
      }
    }

    // Sort newest first
    campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return campaigns;
  }

  static async getCampaign(campaignId: string): Promise<CampaignManifest | null> {
    const storage = getStorageProvider();
    return storage.getObject<CampaignManifest>(`campaigns/${campaignId}/manifest.json`);
  }

  static async getLatestCampaignForKiosk(kioskId: string): Promise<CampaignManifest | null> {
    const all = await this.listCampaigns();
    const published = all.filter((c) => c.status === 'PUBLISHED');

    for (const c of published) {
      if (c.targetKiosks.includes('ALL') || c.targetKiosks.includes(kioskId)) {
        return c; // First is newest because sorted desc
      }
    }

    return published[0] || null;
  }
}

