export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ContextLogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: unknown): void;
}

export interface LevelLogger {
  debug(message: string, context?: string, data?: unknown): void;
  info(message: string, context?: string, data?: unknown): void;
  warn(message: string, context?: string, data?: unknown): void;
  error(message: string, context?: string, error?: unknown): void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export const DEFAULT_LOG_LEVEL: LogLevel =
  process.env.NODE_ENV === 'development' ? 'debug' : 'info';

export function isLevelEnabled(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

export function formatLogLine(level: LogLevel, message: string, context?: string): string {
  const contextStr = context ? `[${context}] ` : '';
  return `${new Date().toISOString()} [${level.toUpperCase().padEnd(5)}] ${contextStr}${message}`;
}

export function consoleFor(level: LogLevel): (...args: unknown[]) => void {
  if (level === 'error') return console.error;
  if (level === 'warn') return console.warn;
  if (level === 'debug') return console.debug;
  return console.log;
}

export function withContext(logger: LevelLogger, context: string): ContextLogger {
  return {
    debug: (message, data) => logger.debug(message, context, data),
    info: (message, data) => logger.info(message, context, data),
    warn: (message, data) => logger.warn(message, context, data),
    error: (message, error) => logger.error(message, context, error),
  };
}

function writeToConsole(level: LogLevel, message: string, context?: string, data?: unknown): void {
  if (!isLevelEnabled(level, DEFAULT_LOG_LEVEL)) return;
  consoleFor(level)(formatLogLine(level, message, context), data ?? '');
}

const consoleLogger: LevelLogger = {
  debug: (message, context, data) => writeToConsole('debug', message, context, data),
  info: (message, context, data) => writeToConsole('info', message, context, data),
  warn: (message, context, data) => writeToConsole('warn', message, context, data),
  error: (message, context, error) =>
    writeToConsole(
      'error',
      message,
      context,
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error
    ),
};

export const dbLogger = withContext(consoleLogger, 'Database');
export const uiLogger = withContext(consoleLogger, 'UI');
