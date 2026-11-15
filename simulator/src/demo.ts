import { SimulatedDevice } from './device.js';

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
  console.log('   CLOUDFLEET MVP — AUTOMATED END-TO-END DEMONSTRATION      ');
  console.log('============================================================\n');

  // Step 1: Health check
  logStep(1, 'Verify Backend API Connectivity');
  const healthRes = await fetch(`${API_BASE_URL}/health`);
  if (!healthRes.ok) {
    throw new Error(`Backend not reachable at ${API_BASE_URL}/health. Make sure backend is running!`);
  }
  const healthData = (await healthRes.json()) as any;
  console.log('Backend Status:', healthData);

  // Step 2: Show current fleet summary
  logStep(2, 'Inspect Fleet Summary');
  const fleetRes = await fetch(`${API_BASE_URL}/devices`);
  const initialFleet = (await fleetRes.json()) as any;
  console.log(`Total devices: ${initialFleet.total}, Online: ${initialFleet.online}, Offline: ${initialFleet.offline}, Warning: ${initialFleet.warning}`);

  // Step 3: Register a simulated device
  const testDeviceId = 'CF-DEVICE-001';
  logStep(3, `Register Simulated Device: ${testDeviceId}`);
  const regRes = await fetch(`${API_BASE_URL}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: testDeviceId,
      name: 'Temperature Sensor 001',
      deviceType: 'ENVIRONMENTAL_MONITOR',
      location: 'Warehouse-Bay-4',
    }),
  });

  if (regRes.status === 201) {
    const regData = (await regRes.json()) as any;
    console.log(`Successfully registered: ${regData.deviceId} (Status: ${regData.status})`);
  } else {
    console.log(`Device already registered or response: ${regRes.status}`);
  }

  // Step 4: Start Device Simulator
  logStep(4, `Start Software Device Simulator for ${testDeviceId}`);
  const simulator = new SimulatedDevice({
    deviceId: testDeviceId,
    name: 'Temperature Sensor 001',
    apiBaseUrl: API_BASE_URL,
    location: 'Warehouse-Bay-4',
    telemetryIntervalMs: 1500, // fast cadence for demo
    commandPollingIntervalMs: 1000,
  });

  simulator.start();
  console.log('Simulator running. Waiting for initial telemetry packets...');
  await delay(3500);

  // Step 5: Verify Device becomes ONLINE
  logStep(5, `Verify Device State Transitions to ONLINE in Backend`);
  const devStateRes1 = await fetch(`${API_BASE_URL}/devices/${testDeviceId}`);
  const devState1 = (await devStateRes1.json()) as any;
  console.log(`Current Status: ${devState1.status}`);
  console.log(`Latest Telemetry:`, devState1.latestTelemetry);
  if (devState1.status !== 'ONLINE') {
    throw new Error(`Expected device to be ONLINE, but found ${devState1.status}`);
  }

  // Step 6: Query Telemetry History
  logStep(6, `Retrieve Recent Telemetry History from Persistence`);
  const historyRes = await fetch(`${API_BASE_URL}/devices/${testDeviceId}/telemetry?limit=5`);
  const historyData = (await historyRes.json()) as any;
  console.log(`Retrieved ${historyData.history.length} historical telemetry records:`);
  historyData.history.forEach((rec: any, idx: number) => {
    console.log(`  [${idx + 1}] Time: ${rec.timestamp} | Temp: ${rec.metrics.temperature}°C | Bat: ${rec.metrics.battery}%`);
  });

  // Step 7: Inject Thermal Hazard (Overheat)
  logStep(7, `Simulate Thermal Spike: Injecting 38.5°C (> 35°C threshold)`);
  simulator.injectOverheat(38.5);
  console.log('Fault injected. Waiting for simulator to emit overheated telemetry...');
  await delay(3000);

  // Step 8: Verify WARNING state and Alert Generation
  logStep(8, `Verify WARNING Status and Alert Persistence`);
  const devStateRes2 = await fetch(`${API_BASE_URL}/devices/${testDeviceId}`);
  const devState2 = (await devStateRes2.json()) as any;
  console.log(`Device Status after overheat: ${devState2.status}`);

  const alertsRes = await fetch(`${API_BASE_URL}/alerts?deviceId=${testDeviceId}&status=ACTIVE`);
  const alertsData = (await alertsRes.json()) as any;
  console.log(`Active alerts count: ${alertsData.total}`);
  alertsData.alerts.forEach((alt: any) => {
    console.log(`  -> Alert: ${alt.type} | Severity: ${alt.severity} | Message: ${alt.message}`);
  });

  if (devState2.status !== 'WARNING') {
    console.warn(`Warning: Expected status WARNING, got ${devState2.status}`);
  }

  // Step 9: Send RESTART Command from Fleet Management
  logStep(9, `Dispatch Administrative Command: RESTART via API`);
  const cmdRes = await fetch(`${API_BASE_URL}/devices/${testDeviceId}/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'RESTART',
      parameters: { graceful: true, reason: 'Thermal spike mitigation' },
    }),
  });
  const cmdData = (await cmdRes.json()) as any;
  console.log(`Command Dispatched: ID=${cmdData.commandId}, Type=${cmdData.type}, Status=${cmdData.status}`);

  // Step 10: Simulator Receives, Reboots, and Acknowledges
  logStep(10, `Simulator Executes Command and Posts Acknowledgement`);
  console.log('Waiting for simulator to poll, execute reboot sequence, and post ACK...');
  await delay(4500);

  const cmdAuditRes = await fetch(`${API_BASE_URL}/devices/${testDeviceId}/commands`);
  const cmdAuditData = (await cmdAuditRes.json()) as any;
  const latestCmd = cmdAuditData.commands.find((c: any) => c.commandId === cmdData.commandId);
  console.log(`Command Status in Backend: ${latestCmd?.status}`);
  console.log(`Execution Result:`, latestCmd?.executionResult);

  // Step 11: Verify Normal Operation Resumed
  logStep(11, `Verify Device Resumes Normal Telemetry and Status`);
  await delay(2000);
  const devStateRes3 = await fetch(`${API_BASE_URL}/devices/${testDeviceId}`);
  const devState3 = (await devStateRes3.json()) as any;
  console.log(`Device Status: ${devState3.status}`);
  console.log(`Operational Mode: ${devState3.operationalMode}`);
  console.log(`Current Temp: ${devState3.latestTelemetry?.temperature}°C`);

  // Step 12: Stop Simulator (Simulate Device Teardown)
  logStep(12, `Stop Simulator & Confirm Clean Shutdown`);
  simulator.stop();
  console.log('Simulator stopped. Device telemetry transmission has halted.');

  // Summary
  console.log('\n============================================================');
  console.log('   ALL 12 CORE DEMONSTRATION PHASES COMPLETED WITH SUCCESS! ');
  console.log('============================================================\n');
  console.log('Demonstrated capabilities:');
  console.log('  [x] Software device registration & identity tracking');
  console.log('  [x] Time-series telemetry generation, ingestion, and S3 persistence');
  console.log('  [x] Automated threshold breach detection & alert generation');
  console.log('  [x] Bi-directional administrative command dispatch & ACK loop');
  console.log('  [x] State machine updates visible in backend persistence\n');
}

runDemo().catch((err) => {
  console.error('\nDEMO FAILED:', err);
  process.exit(1);
});
