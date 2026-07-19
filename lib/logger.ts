/**
 * lib/logger.ts
 * A structured logging utility for production stability.
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  timestamp: string;
  requestId: string;
  userId?: string;
  stage: string;
  fileName?: string;
  message: string;
  level: LogLevel;
  stack?: string;
}

export class StructuredLogger {
  private requestId: string;
  public userId?: string;
  public fileName?: string;

  constructor(requestId: string, userId?: string, fileName?: string) {
    this.requestId = requestId;
    this.userId = userId;
    this.fileName = fileName;
  }

  private formatLog(level: LogLevel, stage: string, message: string, error?: unknown): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      userId: this.userId,
      stage,
      fileName: this.fileName,
      message,
      level,
    };

    if (error instanceof Error) {
      entry.stack = error.stack;
      entry.message = `${message} - ${error.message}`;
    } else if (error) {
      entry.message = `${message} - ${JSON.stringify(error)}`;
    }

    return entry;
  }

  private print(entry: LogEntry) {
    const prefix = `[UPLOAD][${entry.timestamp}][Req: ${entry.requestId}]`;
    const userStr = entry.userId ? `[User: ${entry.userId}]` : "";
    const fileStr = entry.fileName ? `[File: ${entry.fileName}]` : "";
    
    const formattedStr = `${prefix}${userStr}${fileStr} [${entry.stage}] ${entry.message}`;

    switch (entry.level) {
      case "info":
        console.log(`\x1b[32mINFO:\x1b[0m ${formattedStr}`);
        break;
      case "warn":
        console.warn(`\x1b[33mWARN:\x1b[0m ${formattedStr}`);
        break;
      case "error":
        console.error(`\x1b[31mERROR:\x1b[0m ${formattedStr}`);
        if (entry.stack) console.error(entry.stack);
        break;
      case "debug":
        console.log(`\x1b[36mDEBUG:\x1b[0m ${formattedStr}`);
        break;
    }
  }

  info(stage: string, message: string) {
    this.print(this.formatLog("info", stage, message));
  }

  warn(stage: string, message: string, error?: unknown) {
    this.print(this.formatLog("warn", stage, message, error));
  }

  error(stage: string, message: string, error?: unknown) {
    this.print(this.formatLog("error", stage, message, error));
  }

  debug(stage: string, message: string) {
    this.print(this.formatLog("debug", stage, message));
  }
}
