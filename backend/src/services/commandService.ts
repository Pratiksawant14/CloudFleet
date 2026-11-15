import { randomUUID } from 'crypto';
import { getStorageProvider } from './storage.js';
import { CommandRecord, CommandType, DeviceState } from '../types/index.js';
import { Logger } from '../utils/logger.js';

const VALID_COMMAND_TYPES: CommandType[] = ['START', 'STOP', 'RESTART', 'SET_MODE'];

export class CommandService {
  static async sendCommand(input: {
    deviceId: string;
    type: CommandType;
    parameters?: Record<string, unknown>;
  }): Promise<CommandRecord> {
    const { deviceId, type, parameters } = input;

    if (!VALID_COMMAND_TYPES.includes(type)) {
      throw new Error(`Invalid command type '${type}'. Allowed: ${VALID_COMMAND_TYPES.join(', ')}`);
    }

    const storage = getStorageProvider();
    const state = await storage.getObject<DeviceState>(`devices/${deviceId}/state.json`);
    if (!state) {
      throw new Error(`Device '${deviceId}' not found.`);
    }

    const commandId = `cmd_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const command: CommandRecord = {
      commandId,
      deviceId,
      type,
      parameters,
      status: 'PENDING',
      createdAt: now,
    };

    const commandKey = `devices/${deviceId}/commands/${commandId}.json`;
    await storage.putObject(commandKey, command);

    Logger.info('COMMAND_DISPATCHED', `Command ${type} dispatched to ${deviceId}`, {
      deviceId,
      details: { commandId, type, parameters },
    });

    return command;
  }

  static async getCommands(deviceId: string): Promise<CommandRecord[]> {
    const storage = getStorageProvider();
    const prefix = `devices/${deviceId}/commands/`;
    const keys = await storage.listObjects(prefix);

    const commands: CommandRecord[] = [];
    for (const key of keys) {
      const cmd = await storage.getObject<CommandRecord>(key);
      if (cmd) commands.push(cmd);
    }

    // Newest first
    commands.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return commands;
  }

  static async getPendingCommands(deviceId: string): Promise<CommandRecord[]> {
    const commands = await this.getCommands(deviceId);
    const pending = commands.filter((c) => c.status === 'PENDING');

    const storage = getStorageProvider();
    const dispatchedNow = new Date().toISOString();

    // Mark as DISPATCHED
    for (const cmd of pending) {
      cmd.status = 'DISPATCHED';
      cmd.dispatchedAt = dispatchedNow;
      await storage.putObject(`devices/${deviceId}/commands/${cmd.commandId}.json`, cmd);
    }

    return pending;
  }

  static async acknowledgeCommand(input: {
    deviceId: string;
    commandId: string;
    status?: 'ACKNOWLEDGED' | 'FAILED';
    executionResult?: { success: boolean; message: string };
  }): Promise<CommandRecord> {
    const { deviceId, commandId, status = 'ACKNOWLEDGED', executionResult } = input;

    const storage = getStorageProvider();
    const commandKey = `devices/${deviceId}/commands/${commandId}.json`;
    const command = await storage.getObject<CommandRecord>(commandKey);

    if (!command) {
      throw new Error(`Command '${commandId}' not found for device '${deviceId}'.`);
    }

    const now = new Date().toISOString();
    command.status = status;
    command.acknowledgedAt = now;
    command.executionResult = executionResult || {
      success: status === 'ACKNOWLEDGED',
      message: status === 'ACKNOWLEDGED' ? 'Command executed successfully.' : 'Command execution failed.',
    };

    await storage.putObject(commandKey, command);

    // Apply state changes to device state.json if applicable
    const stateKey = `devices/${deviceId}/state.json`;
    const state = await storage.getObject<DeviceState>(stateKey);
    if (state) {
      if (command.type === 'SET_MODE' && command.parameters?.mode) {
        state.operationalMode = String(command.parameters.mode);
      } else if (command.type === 'STOP') {
        state.operationalMode = 'STOPPED';
      } else if (command.type === 'START') {
        state.operationalMode = 'RUNNING';
      } else if (command.type === 'RESTART') {
        state.operationalMode = 'REBOOTED';
      }
      state.updatedAt = now;
      await storage.putObject(stateKey, state);
    }

    Logger.info('COMMAND_ACKNOWLEDGED', `Command ${commandId} acknowledged by ${deviceId}`, {
      deviceId,
      details: { commandId, status, executionResult: command.executionResult },
    });

    return command;
  }
}
