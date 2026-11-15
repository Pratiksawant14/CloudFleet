import { SimulatedDevice } from './device.js';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const DEVICE_COUNT = parseInt(process.env.DEVICE_COUNT || '3', 10);

async function main() {
  console.log('====================================================');
  console.log('  CloudFleet — Multi-Device Software IoT Simulator   ');
  console.log(`  Backend API: ${API_BASE_URL}`);
  console.log('====================================================');

  const args = process.argv.slice(2);
  let count = DEVICE_COUNT;
  let singleDeviceId: string | null = null;
  let overheatId: string | null = null;
  let lowBatteryId: string | null = null;
  let disconnectId: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--devices' && args[i + 1]) {
      count = parseInt(args[++i], 10);
    } else if (args[i] === '--device' && args[i + 1]) {
      singleDeviceId = args[++i];
    } else if (args[i] === '--overheat' && args[i + 1]) {
      overheatId = args[++i];
    } else if (args[i] === '--low-battery' && args[i + 1]) {
      lowBatteryId = args[++i];
    } else if (args[i] === '--disconnect' && args[i + 1]) {
      disconnectId = args[++i];
    }
  }

  const devices: SimulatedDevice[] = [];

  if (singleDeviceId) {
    devices.push(
      new SimulatedDevice({
        deviceId: singleDeviceId,
        name: `Simulated Sensor ${singleDeviceId}`,
        apiBaseUrl: API_BASE_URL,
        location: 'Facility-Section-A',
      })
    );
  } else {
    for (let i = 1; i <= count; i++) {
      const pad = String(i).padStart(3, '0');
      const id = `CF-DEVICE-${pad}`;
      devices.push(
        new SimulatedDevice({
          deviceId: id,
          name: `Temperature Sensor ${pad}`,
          apiBaseUrl: API_BASE_URL,
          location: `Warehouse-Bay-${i}`,
        })
      );
    }
  }

  console.log(`Initializing ${devices.length} simulated IoT device(s)...`);

  for (const dev of devices) {
    await dev.register();
    dev.start();

    if (overheatId === dev.deviceId) {
      dev.injectOverheat(39.2);
    }
    if (lowBatteryId === dev.deviceId) {
      dev.injectLowBattery(12.5);
    }
    if (disconnectId === dev.deviceId) {
      dev.injectDisconnect();
    }
  }

  console.log('\nSimulator running. Press Ctrl+C to terminate all simulated devices.\n');

  const shutdown = () => {
    console.log('\nStopping all simulated devices...');
    for (const dev of devices) {
      dev.stop();
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
