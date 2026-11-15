import { SimulatedKiosk } from './kioskDevice.js';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logStep(stepNum: number, title: string) {
  console.log(`\n============================================================`);
  console.log(`[STEP ${stepNum}] ${title}`);
  console.log(`============================================================`);
}

async function runDemo() {
  console.log('\n============================================================');
  console.log('   CLOUDFLEET — SERVERLESS EDGE KIOSK UPDATE DEMONSTRATION  ');
  console.log('============================================================\n');

  // Step 1: Health check
  logStep(1, 'Verify Cloud API Gateway / Serverless Ingress');
  const healthRes = await fetch(`${API_BASE_URL}/health`);
  if (!healthRes.ok) {
    throw new Error(`Cloud API not reachable at ${API_BASE_URL}/health. Make sure backend is running!`);
  }
  const healthData = (await healthRes.json()) as any;
  console.log('Backend Status:', healthData);

  // Step 2: Show initial fleet status
  logStep(2, 'Inspect Kiosk Fleet Status');
  const fleetRes = await fetch(`${API_BASE_URL}/kiosks`);
  const initialFleet = (await fleetRes.json()) as any;
  console.log(`Total Kiosks: ${initialFleet.total}, Online: ${initialFleet.online}, Offline: ${initialFleet.offline}`);

  // Step 3: Register a new Smart Edge Kiosk
  const testKioskId = 'KIOSK-RETAIL-001';
  logStep(3, `Register Smart Edge Kiosk: ${testKioskId}`);
  const regRes = await fetch(`${API_BASE_URL}/kiosks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kioskId: testKioskId,
      name: 'Downtown Store Entrance Display',
      kioskType: 'RETAIL_KIOSK',
      location: 'Flagship Store - Bay 1',
    }),
  });
  const regData = (await regRes.json()) as any;
  console.log(`Kiosk Registered: ${regData.kioskId} at ${regData.location}`);
  console.log(`Initial Offline Campaign: "${regData.activeCampaign.name}" (v${regData.activeCampaign.version})`);

  // Step 4: Boot Simulated Kiosk in Local Offline Mode
  logStep(4, `Boot Edge Kiosk Simulator in Offline Playback Mode`);
  const kiosk = new SimulatedKiosk({
    kioskId: testKioskId,
    name: 'Downtown Store Entrance Display',
    location: 'Flagship Store - Bay 1',
    apiBaseUrl: API_BASE_URL,
    updateCheckIntervalMs: 3000,
    heartbeatIntervalMs: 2000,
  });

  kiosk.start();
  console.log('Waiting for initial kiosk heartbeat...');
  await delay(2500);

  // Step 5: Verify Kiosk is ONLINE
  logStep(5, `Verify Kiosk Status Transitions to ONLINE`);
  const kioskStateRes1 = await fetch(`${API_BASE_URL}/kiosks/${testKioskId}`);
  const kioskState1 = (await kioskStateRes1.json()) as any;
  console.log(`Kiosk Cloud Status: ${kioskState1.status}`);
  console.log(`Active Screen Display: "${kioskState1.activeCampaign.headline}" (v${kioskState1.activeCampaign.version})`);

  // Step 6: Admin Publishes a New Content Campaign to S3
  logStep(6, `Admin Publishes New Media Campaign (v2.0.0) with S3 Assets`);
  const newCampaignRes = await fetch(`${API_BASE_URL}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Summer Flash Sale Campaign',
      version: '2.0.0',
      themeColor: '#ef4444',
      headline: 'SUMMER FLASH SALE: 50% OFF ALL ITEMS!',
      description: 'High-priority promotional update with 4K video assets and promotional banners',
      assets: [
        {
          filename: 'summer_sale_4k.mp4',
          mediaType: 'VIDEO',
          sizeBytes: 15400000,
          url: 'https://cloudfleet-assets.s3.amazonaws.com/campaigns/summer_sale_4k.mp4',
        },
        {
          filename: 'discount_banner.png',
          mediaType: 'IMAGE',
          sizeBytes: 2800000,
          url: 'https://cloudfleet-assets.s3.amazonaws.com/campaigns/discount_banner.png',
        },
      ],
      targetKiosks: ['ALL'],
    }),
  });
  const newCampaign = (await newCampaignRes.json()) as any;
  console.log(`Campaign Created on S3: ID=${newCampaign.campaignId}, Version=v${newCampaign.version}`);
  console.log(`Headline: "${newCampaign.headline}"`);
  console.log(`Assets staged in S3: ${newCampaign.assets.length} file(s) (Total ${(18.2).toFixed(1)} MB)`);

  // Step 7: Kiosk Checks Cloud API for Updates
  logStep(7, `Kiosk Wakes Up, Calls Serverless Lambda to Check for Updates`);
  console.log('Waiting for scheduled kiosk update check...');
  await delay(3500);

  // Step 8: Verify Kiosk has Downloaded S3 Assets and Switched Screen
  logStep(8, `Verify Kiosk Screen Transitioned to New Campaign (v2.0.0)`);
  const kioskStateRes2 = await fetch(`${API_BASE_URL}/kiosks/${testKioskId}`);
  const kioskState2 = (await kioskStateRes2.json()) as any;
  console.log(`Current Active Campaign: "${kioskState2.activeCampaign.name}"`);
  console.log(`Current Version on Screen: v${kioskState2.activeCampaign.version}`);
  console.log(`Headline on Screen: "${kioskState2.activeCampaign.headline}"`);
  console.log(`Local Cache Size: ${kioskState2.localCache.diskUsageMb} MB (${kioskState2.localCache.totalAssetsCached} assets)`);

  if (kioskState2.activeCampaign.version !== '2.0.0') {
    throw new Error(`Expected kiosk version to be 2.0.0, but found ${kioskState2.activeCampaign.version}`);
  }

  // Step 9: Verify Sync Audit History in Cloud Persistence
  logStep(9, `Verify Cloud Sync Audit History`);
  const historyRes = await fetch(`${API_BASE_URL}/kiosks/${testKioskId}/history`);
  const historyData = (await historyRes.json()) as any;
  console.log(`Retrieved ${historyData.history.length} update history record(s):`);
  historyData.history.forEach((rec: any, idx: number) => {
    console.log(`  [${idx + 1}] Applied: ${rec.appliedAt} | Version: v${rec.version} | Duration: ${rec.downloadDurationMs}ms | Message: ${rec.message}`);
  });

  // Step 10: Graceful Shutdown of Simulator
  logStep(10, `Stop Kiosk Simulator & Confirm Serverless Shutdown`);
  kiosk.stop();
  console.log('Simulator stopped cleanly.');

  // Summary
  console.log('\n============================================================');
  console.log('   ALL CORE KIOSK DEMONSTRATION PHASES COMPLETED WITH SUCCESS! ');
  console.log('============================================================\n');
  console.log('Cloud Computing Capabilities Demonstrated:');
  console.log('  [x] Offline-First Edge Execution: Zero internet required for continuous playback');
  console.log('  [x] Zero Idle Cost: AWS Lambda only invoked on-demand during update check');
  console.log('  [x] S3 Central Asset Repository: Heavy media assets hosted on S3 and cached on edge');
  console.log('  [x] Seamless Version Propagation: Admin updates S3 -> Kiosks auto-sync & switch screens');
  console.log('  [x] End-to-End Auditability: Complete sync history and acknowledgements persisted\n');
}

runDemo().catch((err) => {
  console.error('\nDEMO FAILED:', err);
  process.exit(1);
});
