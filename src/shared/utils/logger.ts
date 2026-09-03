/**
 * SmartForm Saver — Logger
 *
 * Development-safe logging utility.
 * CRITICAL: Never logs actual user-entered personal information.
 * Only logs field names, metadata, and system events.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

const LOG_COLORS: Record<string, string> = {
  debug: '#8B8B8B',
  info: '#06b6d4',
  warn: '#f59e0b',
  error: '#ef4444',
};

class Logger {
  private level: LogLevel = 'warn';
  private prefix = '[SmartForm]';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(
        `%c${this.prefix} %cDEBUG%c ${message}`,
        'color: #06b6d4; font-weight: bold',
        `color: ${LOG_COLORS.debug}; font-weight: bold`,
        'color: inherit',
        ...args
      );
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(
        `%c${this.prefix} %cINFO%c ${message}`,
        'color: #06b6d4; font-weight: bold',
        `color: ${LOG_COLORS.info}; font-weight: bold`,
        'color: inherit',
        ...args
      );
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(
        `%c${this.prefix} %cWARN%c ${message}`,
        'color: #06b6d4; font-weight: bold',
        `color: ${LOG_COLORS.warn}; font-weight: bold`,
        'color: inherit',
        ...args
      );
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(
        `%c${this.prefix} %cERROR%c ${message}`,
        'color: #06b6d4; font-weight: bold',
        `color: ${LOG_COLORS.error}; font-weight: bold`,
        'color: inherit',
        ...args
      );
    }
  }
}

export const logger = new Logger();
