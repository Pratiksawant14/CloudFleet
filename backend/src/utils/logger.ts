export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  eventType: string;
  deviceId?: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

export class Logger {
  static log(
    level: LogLevel,
    eventType: string,
    message: string,
    options?: {
      deviceId?: string;
      details?: Record<string, unknown>;
      requestId?: string;
    }
  ): void {
    const entry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      eventType,
      deviceId: options?.deviceId,
      message,
      details: options?.details,
      requestId: options?.requestId,
    };

    const serialized = JSON.stringify(entry);
    if (level === 'ERROR') {
      console.error(serialized);
    } else if (level === 'WARN') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  static info(
    eventType: string,
    message: string,
    options?: { deviceId?: string; details?: Record<string, unknown>; requestId?: string }
  ): void {
    this.log('INFO', eventType, message, options);
  }

  static warn(
    eventType: string,
    message: string,
    options?: { deviceId?: string; details?: Record<string, unknown>; requestId?: string }
  ): void {
    this.log('WARN', eventType, message, options);
  }

  static error(
    eventType: string,
    message: string,
    options?: { deviceId?: string; details?: Record<string, unknown>; requestId?: string }
  ): void {
    this.log('ERROR', eventType, message, options);
  }
}
