import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { KioskService } from './services/kioskService.js';
import { CampaignService } from './services/campaignService.js';
import { SyncService } from './services/syncService.js';
import { Logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    Logger.info('HTTP_REQUEST', `${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'CloudFleet Serverless Kiosk Management API',
    timestamp: new Date().toISOString(),
  });
});

// Kiosk Management
app.post('/kiosks', async (req: Request, res: Response) => {
  try {
    const kiosk = await KioskService.registerKiosk(req.body);
    res.status(201).json(kiosk);
  } catch (err: unknown) {
    res.status(400).json({ error: { message: (err as Error).message } });
  }
});

app.get('/kiosks', async (_req: Request, res: Response) => {
  try {
    const fleet = await KioskService.listKiosks();
    res.json(fleet);
  } catch (err: unknown) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

app.get('/kiosks/:id', async (req: Request, res: Response) => {
  try {
    const kiosk = await KioskService.getKiosk(req.params.id);
    if (!kiosk) {
      res.status(404).json({ error: { message: `Kiosk '${req.params.id}' not found.` } });
      return;
    }
    res.json(kiosk);
  } catch (err: unknown) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

app.post('/kiosks/:id/heartbeat', async (req: Request, res: Response) => {
  try {
    const updated = await KioskService.updateHeartbeat(req.params.id, req.body.metrics);
    res.json(updated);
  } catch (err: unknown) {
    res.status(400).json({ error: { message: (err as Error).message } });
  }
});

// On-Demand Kiosk Updates
app.post('/kiosks/:id/check-update', async (req: Request, res: Response) => {
  try {
    const result = await SyncService.checkForUpdates(req.params.id, req.body.currentVersion);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: { message: (err as Error).message } });
  }
});

app.post('/kiosks/:id/sync-ack', async (req: Request, res: Response) => {
  try {
    const result = await SyncService.acknowledgeSync(req.params.id, req.body);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: { message: (err as Error).message } });
  }
});

app.get('/kiosks/:id/history', async (req: Request, res: Response) => {
  try {
    const history = await SyncService.getSyncHistory(req.params.id);
    res.json({ kioskId: req.params.id, history });
  } catch (err: unknown) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// Campaign Management (Admin)
app.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const campaign = await CampaignService.createCampaign(req.body);
    res.status(201).json(campaign);
  } catch (err: unknown) {
    res.status(400).json({ error: { message: (err as Error).message } });
  }
});

app.get('/campaigns', async (_req: Request, res: Response) => {
  try {
    const campaigns = await CampaignService.listCampaigns();
    res.json({ campaigns, total: campaigns.length });
  } catch (err: unknown) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

app.get('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await CampaignService.getCampaign(req.params.id);
    if (!campaign) {
      res.status(404).json({ error: { message: `Campaign '${req.params.id}' not found.` } });
      return;
    }
    res.json(campaign);
  } catch (err: unknown) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// Start listening
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    Logger.info('SERVER_START', `CloudFleet Kiosk API listening on http://localhost:${PORT}`);
  });
}

export default app;
