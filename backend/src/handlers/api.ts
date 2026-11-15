import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { KioskService } from '../services/kioskService.js';
import { CampaignService } from '../services/campaignService.js';
import { SyncService } from '../services/syncService.js';
import { AssetService } from '../services/assetService.js';
import { Logger } from '../utils/logger.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

function jsonResponse(statusCode: number, data: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data),
  };
}

function errorResponse(statusCode: number, message: string, code = 'ERROR'): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
      },
    }),
  };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const rawPath = event.rawPath || event.requestContext.http.path;

  // Handle CORS OPTIONS pre-flight
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};

    // 1. Health check
    if (method === 'GET' && rawPath === '/health') {
      return jsonResponse(200, { status: 'healthy', service: 'CloudFleet Kiosk Update API', timestamp: new Date().toISOString() });
    }

    // 2. Kiosk Registration & Listing
    if (method === 'POST' && rawPath === '/kiosks') {
      const kiosk = await KioskService.registerKiosk(body);
      return jsonResponse(201, kiosk);
    }

    if (method === 'GET' && rawPath === '/kiosks') {
      const fleet = await KioskService.listKiosks();
      return jsonResponse(200, fleet);
    }

    // 3. Kiosk Specific Operations
    const checkUpdateMatch = rawPath.match(/^\/kiosks\/([A-Za-z0-9_-]+)\/check-update$/);
    if (method === 'POST' && checkUpdateMatch) {
      const kioskId = checkUpdateMatch[1];
      const result = await SyncService.checkForUpdates(kioskId, body.currentVersion);
      return jsonResponse(200, result);
    }

    const syncAckMatch = rawPath.match(/^\/kiosks\/([A-Za-z0-9_-]+)\/sync-ack$/);
    if (method === 'POST' && syncAckMatch) {
      const kioskId = syncAckMatch[1];
      const result = await SyncService.acknowledgeSync(kioskId, body);
      return jsonResponse(200, result);
    }

    const heartbeatMatch = rawPath.match(/^\/kiosks\/([A-Za-z0-9_-]+)\/heartbeat$/);
    if (method === 'POST' && heartbeatMatch) {
      const kioskId = heartbeatMatch[1];
      const updated = await KioskService.updateHeartbeat(kioskId, body.metrics);
      return jsonResponse(200, updated);
    }

    const historyMatch = rawPath.match(/^\/kiosks\/([A-Za-z0-9_-]+)\/history$/);
    if (method === 'GET' && historyMatch) {
      const kioskId = historyMatch[1];
      const history = await SyncService.getSyncHistory(kioskId);
      return jsonResponse(200, { kioskId, history });
    }

    const kioskDetailMatch = rawPath.match(/^\/kiosks\/([A-Za-z0-9_-]+)$/);
    if (method === 'GET' && kioskDetailMatch) {
      const kioskId = kioskDetailMatch[1];
      const kiosk = await KioskService.getKiosk(kioskId);
      if (!kiosk) return errorResponse(404, `Kiosk '${kioskId}' not found.`, 'NOT_FOUND');
      return jsonResponse(200, kiosk);
    }

    // 4. Campaign Management
    if (method === 'POST' && rawPath === '/campaigns') {
      const campaign = await CampaignService.createCampaign(body);
      return jsonResponse(201, campaign);
    }

    if (method === 'GET' && rawPath === '/campaigns') {
      const campaigns = await CampaignService.listCampaigns();
      return jsonResponse(200, { campaigns, total: campaigns.length });
    }

    const campaignDetailMatch = rawPath.match(/^\/campaigns\/([A-Za-z0-9_-]+)$/);
    if (method === 'GET' && campaignDetailMatch) {
      const campaignId = campaignDetailMatch[1];
      const campaign = await CampaignService.getCampaign(campaignId);
      if (!campaign) return errorResponse(404, `Campaign '${campaignId}' not found.`, 'NOT_FOUND');
      return jsonResponse(200, campaign);
    }

    // 5. Binary S3 Asset Management
    if (method === 'POST' && rawPath === '/assets/upload') {
      const { filename, fileData, mediaType } = body;
      const host = event.headers?.host || event.requestContext?.domainName || 'localhost:4000';
      const protocol = event.headers?.['x-forwarded-proto'] || 'https';
      const result = await AssetService.uploadAsset({
        filename,
        fileData,
        mediaType,
        baseUrl: `${protocol}://${host}`,
      });
      return jsonResponse(201, result);
    }

    const assetGetMatch = rawPath.match(/^\/assets\/([A-Za-z0-9_.-]+)$/);
    if (method === 'GET' && assetGetMatch) {
      const filename = assetGetMatch[1];
      const asset = await AssetService.getAsset(filename);
      if (!asset) return errorResponse(404, `Asset '${filename}' not found.`, 'NOT_FOUND');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': asset.contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body: asset.buffer.toString('base64'),
        isBase64Encoded: true,
      };
    }

    return errorResponse(404, `Cannot ${method} ${rawPath}`, 'ROUTE_NOT_FOUND');
  } catch (err: unknown) {
    Logger.error('API_HANDLER_ERROR', (err as Error).message, {
      details: { error: String(err) },
    });
    return errorResponse(500, (err as Error).message || 'Internal Server Error', 'INTERNAL_ERROR');
  }
}
