import { SimulatedKiosk } from './kioskDevice.js';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

async function main() {
  console.log('===================================================================');
  console.log('    CloudFleet — Offline-First Smart Kiosk & Display Simulator     ');
  console.log(`    Cloud Backend API: ${API_BASE_URL}`);
  console.log('===================================================================');

  const kiosks: SimulatedKiosk[] = [
    new SimulatedKiosk({
      kioskId: 'KIOSK-RETAIL-001',
      name: 'Downtown Store Entrance Display',
      location: 'Flagship Store - Bay 1',
      kioskType: 'RETAIL_KIOSK',
      apiBaseUrl: API_BASE_URL,
      updateCheckIntervalMs: 8000,
    }),
    new SimulatedKiosk({
      kioskId: 'KIOSK-MALL-002',
      name: 'City Mall Interactive Board',
      location: 'Mall Atrium - Central Promenade',
      kioskType: 'INTERACTIVE_SCREEN',
      apiBaseUrl: API_BASE_URL,
      updateCheckIntervalMs: 10000,
    }),
    new SimulatedKiosk({
      kioskId: 'KIOSK-AIRPORT-003',
      name: 'Airport Terminal Information Kiosk',
      location: 'Terminal 2 - Departure Lounge',
      kioskType: 'DIGITAL_SIGNAGE',
      apiBaseUrl: API_BASE_URL,
      updateCheckIntervalMs: 12000,
    }),
  ];

  console.log(`\nBooting ${kiosks.length} simulated edge display kiosks locally...\n`);

  for (const kiosk of kiosks) {
    await kiosk.register();
    kiosk.start();
  }

  console.log('\nAll kiosks are active in local playback mode.');
  console.log('When you publish a new Campaign on the Dashboard, kiosks will download assets from S3 and switch screens.');
  console.log('Press Ctrl+C to terminate simulator.\n');

  const shutdown = () => {
    console.log('\nShutting down kiosks...');
    for (const kiosk of kiosks) {
      kiosk.stop();
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Simulator runtime error:', err);
  process.exit(1);
});
