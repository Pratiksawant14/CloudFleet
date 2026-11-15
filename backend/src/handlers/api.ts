import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DeviceService } from '../services/deviceService.js';
import { TelemetryService } from '../services/telemetryService.js';
import { CommandService } from '../services/commandService.js';
import { AlertService } from '../services/alertService.js';
import { Logger } from '../utils/logger.js';
import { AlertStatus } from '../types/index.js';

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
  const requestId = event.requestContext.requestId;

  // Handle CORS OPTIONS pre-flight
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const query = event.queryStringParameters || {};

    // 1. Health check
    if (method === 'GET' && rawPath === '/health') {
      return jsonResponse(200, { status: 'healthy', timestamp: new Date().toISOString() });
    }

    // 2. Devices
    if (method === 'POST' && rawPath === '/devices') {
      const device = await DeviceService.registerDevice(body);
      return jsonResponse(201, device);
    }

    if (method === 'GET' && rawPath === '/devices') {
      const fleet = await DeviceService.listDevices();
      return jsonResponse(200, fleet);
    }

    const deviceMatch = rawPath.match(/^\/devices\/([A-Za-z0-9_-]+)$/);
    if (method === 'GET' && deviceMatch) {
      const deviceId = deviceMatch[1];
      const device = await DeviceService.getDevice(deviceId);
      if (!device) return errorResponse(404, `Device '${deviceId}' not found.`, 'NOT_FOUND');
      return jsonResponse(200, device);
    }

    // 3. Telemetry
    const telemetryMatch = rawPath.match(/^\/devices\/([A-Za-z0-9_-]+)\/telemetry$/);
    if (method === 'POST' && telemetryMatch) {
      const deviceId = telemetryMatch[1];
      const result = await TelemetryService.ingestTelemetry(deviceId, body);
      return jsonResponse(202, {
        status: 'INGESTED',
        telemetryId: result.telemetryRecord.telemetryId,
        deviceStatus: result.deviceState.status,
      });
    }

    if (method === 'GET' && telemetryMatch) {
      const deviceId = telemetryMatch[1];
      const limit = query.limit ? parseInt(query.limit, 10) : 50;
      const history = await TelemetryService.getTelemetryHistory(deviceId, limit);
      return jsonResponse(200, { deviceId, history });
    }

    // 4. Commands
    const pendingCommandsMatch = rawPath.match(/^\/devices\/([A-Za-z0-9_-]+)\/commands\/pending$/);
    if (method === 'GET' && pendingCommandsMatch) {
      const deviceId = pendingCommandsMatch[1];
      const pending = await CommandService.getPendingCommands(deviceId);
      return jsonResponse(200, { deviceId, pending });
    }

    const ackCommandMatch = rawPath.match(/^\/devices\/([A-Za-z0-9_-]+)\/commands\/([A-Za-z0-9_-]+)\/ack$/);
    if (method === 'POST' && ackCommandMatch) {
      const deviceId = ackCommandMatch[1];
      const commandId = ackCommandMatch[2];
      const acknowledged = await CommandService.acknowledgeCommand({
        deviceId,
        commandId,
        status: body.status,
        executionResult: body.executionResult,
      });
      return jsonResponse(200, acknowledged);
    }

    const commandsMatch = rawPath.match(/^\/devices\/([A-Za-z0-9_-]+)\/commands$/);
    if (method === 'POST' && commandsMatch) {
      const deviceId = commandsMatch[1];
      const command = await CommandService.sendCommand({
        deviceId,
        type: body.type,
        parameters: body.parameters,
      });
      return jsonResponse(201, command);
    }

    if (method === 'GET' && commandsMatch) {
      const deviceId = commandsMatch[1];
      const commands = await CommandService.getCommands(deviceId);
      return jsonResponse(200, { deviceId, commands });
    }

    // 5. Alerts
    if (method === 'GET' && rawPath === '/alerts') {
      const status = query.status as AlertStatus | undefined;
      const deviceId = query.deviceId as string | undefined;
      const alerts = await AlertService.listAlerts({ status, deviceId });
      return jsonResponse(200, { alerts, total: alerts.length });
    }

    const resolveAlertMatch = rawPath.match(/^\/alerts\/([A-Za-z0-9_-]+)\/resolve$/);
    if (method === 'POST' && resolveAlertMatch) {
      const alertId = resolveAlertMatch[1];
      const deviceId = body.deviceId;
      if (!deviceId) {
        return errorResponse(400, "Must provide 'deviceId' in request body to resolve alert.", 'BAD_REQUEST');
      }
      const resolved = await AlertService.resolveAlert(deviceId, alertId);
      return jsonResponse(200, resolved);
    }

    // Route not found
    return errorResponse(404, `Cannot ${method} ${rawPath}`, 'ROUTE_NOT_FOUND');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('API_EXCEPTION', message, {
      requestId,
      details: { path: rawPath, method },
    });
    return errorResponse(400, message, 'OPERATION_FAILED');
  }
}
