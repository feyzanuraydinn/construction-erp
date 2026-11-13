import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { LIMITS } from '../utils/constants';
import {
  DEFAULT_LOG_LEVEL,
  consoleFor,
  formatLogLine,
  isLevelEnabled,
  withContext,
  type ContextLogger,
  type LevelLogger,
  type LogLevel,
} from '../utils/logger';

interface LogConfig {
  level: LogLevel;
  maxFileSize: number;
  maxFiles: number;
  logToConsole: boolean;
}

const DEFAULT_CONFIG: LogConfig = {
  level: DEFAULT_LOG_LEVEL,
  maxFileSize: LIMITS.MAX_LOG_FILE_SIZE,
  maxFiles: LIMITS.MAX_LOG_FILES,
  logToConsole: true,
};

function describe(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

class FileLogger implements LevelLogger {
  private config: LogConfig;
  private logDir: string;
  private currentLogFile: string;
  private writeStream: fs.WriteStream | null = null;
  private initialized = false;

  constructor(config: Partial<LogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logDir = '';
    this.currentLogFile = '';
  }

  init(): void {
    if (this.initialized) return;

    try {
      this.logDir = path.join(app.getPath('userData'), 'logs');

      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      this.currentLogFile = path.join(this.logDir, 'app.log');

      this.rotateIfNeeded();

      this.writeStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });

      this.initialized = true;
      this.info('Logger initialized', 'Logger');
    } catch (error) {
      console.error('Failed to initialize file logger:', error);
    }
  }

  private rotateIfNeeded(): void {
    try {
      if (!fs.existsSync(this.currentLogFile)) return;

      const stats = fs.statSync(this.currentLogFile);
      if (stats.size < this.config.maxFileSize) return;

      const wasWriting = this.writeStream !== null;
      if (this.writeStream) {
        this.writeStream.end();
        this.writeStream = null;
      }

      for (let i = this.config.maxFiles - 1; i >= 0; i--) {
        const oldFile = i === 0 ? this.currentLogFile : path.join(this.logDir, `app.${i}.log`);
        const newFile = path.join(this.logDir, `app.${i + 1}.log`);

        if (fs.existsSync(oldFile)) {
          if (i === this.config.maxFiles - 1) {
            fs.unlinkSync(oldFile);
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      if (wasWriting) {
        this.writeStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });
      }
    } catch (error) {
      console.error('Log rotation failed:', error);
    }
  }

  private write(level: LogLevel, message: string, context?: string, data?: unknown): void {
    if (!isLevelEnabled(level, this.config.level)) return;

    const line = formatLogLine(level, message, context);

    if (this.writeStream) {
      this.writeStream.write(`${line}\n`);
      if (data !== undefined) {
        this.writeStream.write(`  Data: ${describe(data)}\n`);
      }
    }

    if (this.config.logToConsole) {
      consoleFor(level)(line, data !== undefined ? data : '');
    }

    this.rotateIfNeeded();
  }

  debug(message: string, context?: string, data?: unknown): void {
    this.write('debug', message, context, data);
  }

  info(message: string, context?: string, data?: unknown): void {
    this.write('info', message, context, data);
  }

  warn(message: string, context?: string, data?: unknown): void {
    this.write('warn', message, context, data);
  }

  error(message: string, context?: string, error?: unknown): void {
    this.write('error', message, context);
    if (error) {
      if (error instanceof Error) {
        this.write('error', `  ${error.name}: ${error.message}`, context);
        if (error.stack) {
          this.write('error', `  Stack: ${error.stack}`, context);
        }
      } else {
        this.write('error', `  Error data: ${describe(error)}`, context);
      }
    }
  }

  forContext(context: string): ContextLogger {
    return withContext(this, context);
  }
}

export const mainLogger = new FileLogger();
