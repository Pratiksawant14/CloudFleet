import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { KioskService } from '../services/kioskService.js';
import { CampaignService } from '../services/campaignService.js';
import { SyncService } from '../services/syncService.js';
import { setStorageProvider, LocalStorageProvider } from '../services/storage.js';

const TEST_DATA_DIR = path.resolve(process.cwd(), '.test-kiosk-storage');

describe('CloudFleet Kiosk Management & Sync Service Tests', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    setStorageProvider(new LocalStorageProvider(TEST_DATA_DIR));
  });

  it('KioskService should register a new kiosk with default local campaign', async () => {
    const kiosk = await KioskService.registerKiosk({
      kioskId: 'KIOSK-SHOP-001',
      name: 'Downtown Store Display',
      kioskType: 'RETAIL_KIOSK',
      location: 'Store 101 - Entrance',
    });

    assert.equal(kiosk.kioskId, 'KIOSK-SHOP-001');
    assert.equal(kiosk.name, 'Downtown Store Display');
    assert.equal(kiosk.status, 'OFFLINE'); // Offline until first check-in
    assert.equal(kiosk.activeCampaign.version, '1.0.0');

    const fetched = await KioskService.getKiosk('KIOSK-SHOP-001');
    assert.ok(fetched);
    assert.equal(fetched.location, 'Store 101 - Entrance');
  });

  it('KioskService should update heartbeat and transition status to ONLINE', async () => {
    await KioskService.registerKiosk({
      kioskId: 'KIOSK-SHOP-001',
      name: 'Downtown Store Display',
    });

    const updated = await KioskService.updateHeartbeat('KIOSK-SHOP-001', {
      cpuUsage: 8.5,
      temperature: 30.2,
      storageFreeMb: 45000,
      diskUsageMb: 25.0,
    });

    assert.equal(updated.status, 'ONLINE');
    assert.ok(updated.lastHeartbeat);
    assert.equal(updated.systemMetrics.cpuUsage, 8.5);
  });

  it('CampaignService should create and publish a new content campaign to S3', async () => {
    const campaign = await CampaignService.createCampaign({
      name: 'Weekend Flash Sale Promo',
      version: '2.0.0',
      themeColor: '#ef4444',
      headline: 'Flash Sale: 50% Off Everything!',
      description: 'High priority weekend promotional assets',
      assets: [
        {
          filename: 'flash_sale_banner.png',
          mediaType: 'IMAGE',
          sizeBytes: 2400000,
        },
      ],
      targetKiosks: ['ALL'],
    });

    assert.ok(campaign.campaignId.startsWith('CMP-2_0_0'));
    assert.equal(campaign.version, '2.0.0');
    assert.equal(campaign.status, 'PUBLISHED');
    assert.equal(campaign.assets.length, 1);

    const list = await CampaignService.listCampaigns();
    assert.ok(list.some((c) => c.version === '2.0.0'));
  });

  it('SyncService should detect update when kiosk version is older than published campaign', async () => {
    await KioskService.registerKiosk({
      kioskId: 'KIOSK-SHOP-001',
      name: 'Store Kiosk',
    });

    // Currently on default v1.0.0
    await CampaignService.createCampaign({
      name: 'Holiday Special v2.0',
      version: '2.0.0',
      headline: 'Happy Holidays!',
      targetKiosks: ['ALL'],
    });

    const check = await SyncService.checkForUpdates('KIOSK-SHOP-001', '1.0.0');
    assert.equal(check.hasUpdate, true);
    assert.equal(check.availableCampaign?.version, '2.0.0');

    // Kiosk should transition to SYNCING
    const kiosk = await KioskService.getKiosk('KIOSK-SHOP-001');
    assert.equal(kiosk?.status, 'SYNCING');
  });

  it('SyncService should acknowledge update, switch screen campaign, and record history', async () => {
    await KioskService.registerKiosk({
      kioskId: 'KIOSK-SHOP-001',
      name: 'Store Kiosk',
    });

    const campaign = await CampaignService.createCampaign({
      name: 'Summer Season Promo',
      version: '2.5.0',
      headline: 'Summer Deals are Live!',
      targetKiosks: ['ALL'],
    });

    const ackResult = await SyncService.acknowledgeSync('KIOSK-SHOP-001', {
      kioskId: 'KIOSK-SHOP-001',
      campaignId: campaign.campaignId,
      version: '2.5.0',
      success: true,
      downloadDurationMs: 1200,
      message: 'Downloaded 1 asset (3.2MB) to local disk cache. Screen switched.',
    });

    assert.equal(ackResult.kiosk.activeCampaign.version, '2.5.0');
    assert.equal(ackResult.kiosk.status, 'ONLINE');

    const history = await SyncService.getSyncHistory('KIOSK-SHOP-001');
    assert.equal(history.length, 1);
    assert.equal(history[0].version, '2.5.0');
    assert.equal(history[0].success, true);
  });
});

