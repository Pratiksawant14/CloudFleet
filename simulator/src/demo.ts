import { SimulatedKiosk } from './kioskDevice.js';
import { fork, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logStep(stepNum: number, title: string) {
  console.log(`\n============================================================`);
  console.log(`[STEP ${stepNum}] ${title}`);
  console.log(`============================================================`);
}

let autoStartedServer: ChildProcess | null = null;

function findBackendServerScript(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'backend/dist/localServer.js'),
    path.resolve(process.cwd(), '../backend/dist/localServer.js'),
    path.resolve(__dirname, '../../backend/dist/localServer.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

async function ensureBackendRunning(): Promise<void> {
  // Check if backend is already listening
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(1200) });
    if (res.ok) {
      return;
    }
  } catch {
    // Backend not running
  }

  // If local URL, automatically launch the localServer
  if (API_BASE_URL.includes('localhost:4000') || API_BASE_URL.includes('127.0.0.1:4000')) {
    const serverScript = findBackendServerScript();
    if (serverScript) {
      console.log('[AUTO-START] Local backend server is not running on port 4000.');
      console.log('[AUTO-START] Automatically starting local backend server for demonstration...');

      autoStartedServer = fork(serverScript, [], {
        stdio: 'pipe',
        env: { ...process.env, PORT: '4000' },
      });

      const deadline = Date.now() + 8000;
      while (Date.now() < deadline) {
        await delay(600);
        try {
          const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(1000) });
          if (res.ok) {
            console.log('[AUTO-START] Local backend server is ready!\n');
            return;
          }
        } catch {
          // Keep waiting
        }
      }
    }
  }

  throw new Error(
    `Cannot connect to Backend API at ${API_BASE_URL}.\n\n` +
      `💡 How to fix:\n` +
      `   Start the backend in another terminal by running:\n` +
      `   npm run dev:backend\n\n` +
      `   Then run this demo again: npm run simulate:demo\n`
  );
}

async function runDemo() {
  console.log('\n============================================================');
  console.log('   CLOUDFLEET — SERVERLESS EDGE KIOSK UPDATE DEMONSTRATION  ');
  console.log('============================================================\n');

  try {
    await ensureBackendRunning();

    // Step 1: Health check
    logStep(1, 'Verify Cloud API Gateway / Serverless Ingress');
    const healthRes = await fetch(`${API_BASE_URL}/health`);
    if (!healthRes.ok) {
      throw new Error(`Cloud API not healthy at ${API_BASE_URL}/health`);
    }
    const healthData = (await healthRes.json()) as any;
    console.log('Backend Status:', healthData);

  // Step 2: Show initial fleet status
  logStep(2, 'Inspect Kiosk Fleet Status');
  const fleetRes = await fetch(`${API_BASE_URL}/kiosks`);
  const initialFleet = (await fleetRes.json()) as any;
  console.log(`Total Kiosks: ${initialFleet.total}, Online: ${initialFleet.online}, Offline: ${initialFleet.offline}`);

  // Step 3: Register a new Smart Edge Kiosk
  const testKioskId = `KIOSK-DEMO-${Date.now().toString().slice(-4)}`;
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
  const targetVersion = `${parseInt(kioskState1.activeCampaign.version.split('.')[0] || '1', 10) + 1}.0.0`;
  logStep(6, `Admin Publishes New Media Campaign (v${targetVersion}) with S3 Assets`);
  const newCampaignRes = await fetch(`${API_BASE_URL}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Summer Flash Sale Campaign',
      version: targetVersion,
      themeColor: '#ef4444',
      headline: `SUMMER FLASH SALE: 50% OFF ALL ITEMS!`,
      description: 'High-priority promotional update with graphic assets staged to Amazon S3',
      assets: [
        {
          filename: 'flash_sale_poster.svg',
          mediaType: 'IMAGE',
          sizeBytes: 198000,
          url: `${API_BASE_URL}/assets/flash_sale_poster.svg`,
        },
      ],
      targetKiosks: ['ALL'],
    }),
  });
  const newCampaign = (await newCampaignRes.json()) as any;
  console.log(`Campaign Created on S3: ID=${newCampaign.campaignId}, Version=v${newCampaign.version}`);
  console.log(`Headline: "${newCampaign.headline}"`);
  console.log(`Assets staged in S3: ${newCampaign.assets.length} file(s)`);

  // Step 7: Kiosk Checks Cloud API for Updates
  logStep(7, `Kiosk Wakes Up, Calls Serverless Lambda to Check for Updates`);
  console.log('Waiting for scheduled kiosk update check...');
  await delay(3500);

  // Step 8: Verify Kiosk has Downloaded S3 Assets and Switched Screen
  logStep(8, `Verify Kiosk Screen Transitioned to New Campaign (v${targetVersion})`);
  const kioskStateRes2 = await fetch(`${API_BASE_URL}/kiosks/${testKioskId}`);
  const kioskState2 = (await kioskStateRes2.json()) as any;
  console.log(`Current Active Campaign: "${kioskState2.activeCampaign.name}"`);
  console.log(`Current Version on Screen: v${kioskState2.activeCampaign.version}`);
  console.log(`Headline on Screen: "${kioskState2.activeCampaign.headline}"`);
  console.log(`Local Cache Size: ${kioskState2.localCache.diskUsageMb} MB (${kioskState2.localCache.totalAssetsCached} assets)`);

  if (kioskState2.activeCampaign.version !== targetVersion) {
    throw new Error(`Expected kiosk version to be ${targetVersion}, but found ${kioskState2.activeCampaign.version}`);
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
  } finally {
    if (autoStartedServer) {
      console.log('[AUTO-STOP] Shutting down auto-started backend server...');
      autoStartedServer.kill();
      // Allow graceful shutdown
      await delay(500);
    }
  }
}

runDemo().catch((err) => {
  console.error('\n============================================================');
  console.error('DEMO FAILED:');
  console.error(err.message || err);
  console.error('============================================================');
  process.exit(1);
});
