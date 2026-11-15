import express, { Request, Response } from 'express';
import cors from 'cors';
import { DeviceService } from './services/deviceService.js';
import { TelemetryService } from './services/telemetryService.js';
import { CommandService } from './services/commandService.js';
import { AlertService } from './services/alertService.js';
import { Logger } from './utils/logger.js';
import { AlertStatus } from './types/index.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    Logger.info('HTTP_REQUEST', `${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Devices
app.post('/devices', async (req: Request, res: Response) => {
  try {
    const device = await DeviceService.registerDevice(req.body);
    res.status(201).json(device);
  } catch (err: unknown) {
    res.status(400).json({ error: { message: (err as Error).message } });
  }
});

app.get('/devices', async (req: Request, res: Response) => {
  try {
    const fleet = await DeviceService.listDevices();
    res.json(fleet);
  } catch (err: unknown) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

app.get('/devices/:id', async (req: Request, res: Response) => {
  try {
    const device = await DeviceService.getDevice(req.params.id);
    if (!device) {
      res.status(404).json({ error: { message: `Device '${req.params.id}' not found.` } });
      return;
    }
    res.json(device);
  } catch (err: unknown) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// Telemetry
app.post('/devices/:id/telemetry', async (req: Request, res: Response) => {
  try {
    const result = await TelemetryService.ingestTelemetry(req.params.id, req.body);
    res.status(202).json({
      status: 'INGESTED',
      telemetryId: result.telemetryRecord.telemetryId,
      deviceStatus: result.deviceState.status,
    });
  } catch (err: unknown) {
    res.status(400).json({ error: { message: (err as Error).message } });
  }
});

app.get('/devices/:id/telemetry', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const history = await TelemetryService.getTelemetryHistory(req.params.id, limit);
    res.json({ deviceId: req.params.id, history });
  } catch (err: unknown) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// Commands
app.get('/devices/:id/commands/pending', async (req: Request, res: Response) => {
  try {
    const pending = await CommandService.getPendingCommands(req.params.id);
    res.json({ deviceId: req.params.id, pending });
  } catch (err: unknown) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

app.post('/devices/:id/commands/:cmdId/ack', async (req: Request, res: Response) => {
  try {
    const acknowledged = await CommandService.acknowledgeCommand({
      deviceId: req.params.id,
      commandId: req.params.cmdId,
      status: req.body.status,
      executionResult: req.body.executionResult,
    });
    res.json(acknowledged);
  } catch (err: unknown) {
    res.status(400).json({ error: { message: (err as Error).message } });
  }
});

app.post('/devices/:id/commands', async (req: Request, res: Response) => {
  try {
    const command = await CommandService.sendCommand({
      deviceId: req.params.id,
      type: req.body.type,
      parameters: req.body.parameters,
    });
    res.status(201).json(command);
  } catch (err: unknown) {
    res.status(400).json({ error: { message: (err as Error).message } });
  }
});

app.get('/devices/:id/commands', async (req: Request, res: Response) => {
  try {
    const commands = await CommandService.getCommands(req.params.id);
    res.json({ deviceId: req.params.id, commands });
  } catch (err: unknown) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// Alerts
app.get('/alerts', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as AlertStatus | undefined;
    const deviceId = req.query.deviceId as string | undefined;
    const alerts = await AlertService.listAlerts({ status, deviceId });
    res.json({ alerts, total: alerts.length });
  } catch (err: unknown) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

app.post('/alerts/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      res.status(400).json({ error: { message: "Must provide 'deviceId' in request body." } });
      return;
    }
    const resolved = await AlertService.resolveAlert(deviceId, req.params.id);
    res.json(resolved);
  } catch (err: unknown) {
    res.status(400).json({ error: { message: (err as Error).message } });
  }
});

// Start listening
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    Logger.info('SERVER_START', `CloudFleet Backend API listening on http://localhost:${PORT}`);
  });
}

export default app;
