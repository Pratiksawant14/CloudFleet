export interface SimulatedDeviceConfig {
  deviceId: string;
  name: string;
  apiBaseUrl: string;
  location?: string;
  deviceType?: string;
  telemetryIntervalMs?: number;
  commandPollingIntervalMs?: number;
}

export type SimulatedOperationalState = 'RUNNING' | 'STOPPED' | 'REBOOTING' | 'DISCONNECTED';

export class SimulatedDevice {
  public readonly deviceId: string;
  public readonly name: string;
  public readonly apiBaseUrl: string;
  public readonly location: string;
  public readonly deviceType: string;

  private state: SimulatedOperationalState = 'STOPPED';
  private telemetryIntervalMs: number;
  private commandPollingIntervalMs: number;

  private currentTemp: number = 24.5;
  private currentHumidity: number = 55.0;
  private currentBattery: number = 98.0;
  private operationalMode: string = 'NORMAL';

  private forcedTempOverride: number | null = null;
  private forcedBatteryOverride: number | null = null;
  private isDisconnected: boolean = false;

  private telemetryTimer: NodeJS.Timeout | null = null;
  private commandTimer: NodeJS.Timeout | null = null;
  private uptimeSeconds: number = 0;
  private uptimeTimer: NodeJS.Timeout | null = null;

  constructor(config: SimulatedDeviceConfig) {
    this.deviceId = config.deviceId;
    this.name = config.name;
    this.apiBaseUrl = config.apiBaseUrl.replace(/\/+$/, '');
    this.location = config.location || 'Warehouse-Bay-1';
    this.deviceType = config.deviceType || 'ENVIRONMENTAL_MONITOR';
    this.telemetryIntervalMs = config.telemetryIntervalMs || 4000;
    this.commandPollingIntervalMs = config.commandPollingIntervalMs || 2500;
  }

  public getState(): SimulatedOperationalState {
    return this.state;
  }

  public injectOverheat(temperature: number = 38.5): void {
    this.forcedTempOverride = temperature;
    console.log(`[${this.deviceId}] !!! FAULT INJECTED: Overheat temperature forced to ${temperature}°C`);
  }

  public injectLowBattery(batteryPct: number = 14.0): void {
    this.forcedBatteryOverride = batteryPct;
    console.log(`[${this.deviceId}] !!! FAULT INJECTED: Low battery forced to ${batteryPct}%`);
  }

  public injectDisconnect(): void {
    this.isDisconnected = true;
    this.state = 'DISCONNECTED';
    console.log(`[${this.deviceId}] !!! FAULT INJECTED: Network disconnected / simulated crash`);
  }

  public clearOverrides(): void {
    this.forcedTempOverride = null;
    this.forcedBatteryOverride = null;
    this.isDisconnected = false;
    this.state = 'RUNNING';
    console.log(`[${this.deviceId}] Fault overrides cleared. Returned to normal operational state.`);
  }

  public async register(): Promise<void> {
    try {
      const res = await fetch(`${this.apiBaseUrl}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.deviceId,
          name: this.name,
          location: this.location,
          deviceType: this.deviceType,
        }),
      });

      if (res.status === 201) {
        console.log(`[${this.deviceId}] Registered with backend API.`);
      } else if (res.status === 400 || res.status === 409) {
        // Already registered or duplicate - acceptable in simulator startup
        console.log(`[${this.deviceId}] Device identity confirmed on backend.`);
      } else {
        console.warn(`[${this.deviceId}] Registration response status: ${res.status}`);
      }
    } catch (err: unknown) {
      console.warn(`[${this.deviceId}] Registration warning (backend may be warming up): ${(err as Error).message}`);
    }
  }

  public start(): void {
    if (this.state === 'RUNNING') return;
    this.state = 'RUNNING';
    console.log(`[${this.deviceId}] Simulator STARTED (Telemetry every ${this.telemetryIntervalMs / 1000}s, Command polling every ${this.commandPollingIntervalMs / 1000}s)`);

    // Uptime counter
    this.uptimeTimer = setInterval(() => {
      if (this.state === 'RUNNING') {
        this.uptimeSeconds++;
      }
    }, 1000);

    // Initial immediate telemetry transmission
    this.sendTelemetry();

    // Telemetry loop
    this.telemetryTimer = setInterval(() => {
      this.sendTelemetry();
    }, this.telemetryIntervalMs);

    // Command polling loop
    this.commandTimer = setInterval(() => {
      this.pollAndExecuteCommands();
    }, this.commandPollingIntervalMs);
  }

  public stop(): void {
    this.state = 'STOPPED';
    if (this.telemetryTimer) clearInterval(this.telemetryTimer);
    if (this.commandTimer) clearInterval(this.commandTimer);
    if (this.uptimeTimer) clearInterval(this.uptimeTimer);
    this.telemetryTimer = null;
    this.commandTimer = null;
    this.uptimeTimer = null;
    console.log(`[${this.deviceId}] Simulator STOPPED.`);
  }

  public async sendTelemetry(): Promise<void> {
    if (this.state !== 'RUNNING' || this.isDisconnected) {
      return;
    }

    // Realistic natural variation
    if (this.forcedTempOverride !== null) {
      this.currentTemp = this.forcedTempOverride;
    } else {
      const tempDrift = (Math.random() - 0.48) * 0.4;
      this.currentTemp = Math.max(18.0, Math.min(32.0, this.currentTemp + tempDrift));
    }

    const humidityDrift = (Math.random() - 0.5) * 0.8;
    this.currentHumidity = Math.max(30.0, Math.min(85.0, this.currentHumidity + humidityDrift));

    if (this.forcedBatteryOverride !== null) {
      this.currentBattery = this.forcedBatteryOverride;
    } else {
      this.currentBattery = Math.max(1.0, this.currentBattery - 0.02);
    }

    const payload = {
      timestamp: new Date().toISOString(),
      metrics: {
        temperature: Number(this.currentTemp.toFixed(1)),
        humidity: Number(this.currentHumidity.toFixed(1)),
        battery: Number(this.currentBattery.toFixed(1)),
      },
      simulatorMetadata: {
        operationalMode: this.operationalMode,
        uptimeSeconds: this.uptimeSeconds,
        firmwareVersion: '1.0.0-sim',
      },
    };

    try {
      const res = await fetch(`${this.apiBaseUrl}/devices/${this.deviceId}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        console.log(
          `[${this.deviceId}] -> Telemetry Sent: Temp=${payload.metrics.temperature}°C, Hum=${payload.metrics.humidity}%, Bat=${payload.metrics.battery}%`
        );
      } else {
        const errorText = await res.text();
        console.warn(`[${this.deviceId}] Telemetry rejection (${res.status}): ${errorText}`);
      }
    } catch (err: unknown) {
      console.warn(`[${this.deviceId}] Telemetry send failed: ${(err as Error).message}`);
    }
  }

  public async pollAndExecuteCommands(): Promise<void> {
    if (this.isDisconnected) return;

    try {
      const res = await fetch(`${this.apiBaseUrl}/devices/${this.deviceId}/commands/pending`);
      if (!res.ok) return;

      const data = (await res.json()) as { pending: Array<{ commandId: string; type: string; parameters?: Record<string, unknown> }> };
      const pendingList = data.pending || [];

      for (const cmd of pendingList) {
        console.log(`[${this.deviceId}] <- Command RECEIVED: ${cmd.type} (ID: ${cmd.commandId})`);
        await this.handleCommand(cmd.commandId, cmd.type, cmd.parameters);
      }
    } catch (err: unknown) {
      // Background polling failure
    }
  }

  private async handleCommand(
    commandId: string,
    type: string,
    parameters?: Record<string, unknown>
  ): Promise<void> {
    let success = true;
    let message = '';

    switch (type) {
      case 'START':
        this.clearOverrides();
        this.state = 'RUNNING';
        message = 'Device started telemetry streaming.';
        break;

      case 'STOP':
        this.state = 'STOPPED';
        message = 'Device stopped telemetry transmission.';
        break;

      case 'RESTART':
        this.state = 'REBOOTING';
        console.log(`[${this.deviceId}] ... Simulating device REBOOT sequence (delay 2s) ...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        this.uptimeSeconds = 0;
        this.clearOverrides();
        this.state = 'RUNNING';
        message = 'Device rebooted successfully and resumed normal streaming.';
        break;

      case 'SET_MODE':
        if (parameters?.mode) {
          this.operationalMode = String(parameters.mode);
          message = `Operational mode updated to ${this.operationalMode}.`;
        } else {
          success = false;
          message = 'Missing mode parameter.';
        }
        break;

      default:
        success = false;
        message = `Unsupported command: ${type}`;
        break;
    }

    console.log(`[${this.deviceId}] => Acknowledging command ${commandId}: ${message}`);
    await this.acknowledgeCommand(commandId, success, message);
  }

  private async acknowledgeCommand(
    commandId: string,
    success: boolean,
    message: string
  ): Promise<void> {
    try {
      await fetch(`${this.apiBaseUrl}/devices/${this.deviceId}/commands/${commandId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: success ? 'ACKNOWLEDGED' : 'FAILED',
          executionResult: { success, message },
        }),
      });
    } catch (err: unknown) {
      console.warn(`[${this.deviceId}] Failed to post command acknowledgement: ${(err as Error).message}`);
    }
  }
}
