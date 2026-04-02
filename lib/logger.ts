/**
 * 日志模块
 * 提供统一的日志记录功能
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * 日志记录器
 */
export class Logger {
  private module: string;
  private minLevel: LogLevel;

  constructor(module: string, minLevel: LogLevel = LogLevel.INFO) {
    this.module = module;
    this.minLevel = minLevel;
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // 检查日志级别
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message,
      data,
    };

    // 处理错误对象
    if (data instanceof Error) {
      entry.error = {
        message: data.message,
        stack: data.stack,
      };
      delete entry.data;
    }

    // 输出到控制台
    this.outputToConsole(entry);

    // 可以扩展为输出到文件、远程日志服务等
  }

  /**
   * 检查是否应该记录该级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minIndex = levels.indexOf(this.minLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.module}]`;
    const message = entry.message;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.log(prefix, message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, entry.data || '');
        break;
      case LogLevel.ERROR:
        if (entry.error) {
          console.error(prefix, message);
          console.error(entry.error.message);
          if (entry.error.stack) {
            console.error(entry.error.stack);
          }
        } else {
          console.error(prefix, message, entry.data || '');
        }
        break;
    }
  }

  /**
   * 调试日志
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * 信息日志
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * 警告日志
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * 错误日志
   */
  error(message: string, error?: Error | any): void {
    this.log(LogLevel.ERROR, message, error);
  }

  /**
   * 设置最小日志级别
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

/**
 * 创建日志记录器
 */
export function createLogger(module: string, minLevel?: LogLevel): Logger {
  return new Logger(module, minLevel);
}

/**
 * 全局日志记录器实例
 */
const loggers = new Map<string, Logger>();

/**
 * 获取日志记录器
 */
export function getLogger(module: string): Logger {
  if (!loggers.has(module)) {
    loggers.set(module, createLogger(module));
  }
  return loggers.get(module)!;
}

/**
 * 设置全局日志级别
 */
export function setGlobalLogLevel(level: LogLevel): void {
  loggers.forEach((logger) => {
    logger.setMinLevel(level);
  });
}
