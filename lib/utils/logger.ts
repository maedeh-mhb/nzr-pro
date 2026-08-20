/**
 * Structured logging utility
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogEntry {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    };

    if (context && Object.keys(context).length > 0) {
      logEntry.context = context;
    }

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return logEntry;
  }

  private output(entry: LogEntry) {
    const jsonOutput = JSON.stringify(entry);
    
    switch (entry.level) {
      case "debug":
        if (process.env.NODE_ENV === "development") {
          console.debug(jsonOutput);
        }
        break;
      case "info":
        console.info(jsonOutput);
        break;
      case "warn":
        console.warn(jsonOutput);
        break;
      case "error":
        console.error(jsonOutput);
        break;
    }
  }

  debug(message: string, context?: Record<string, any>) {
    const entry = this.formatLog("debug", message, context);
    this.output(entry);
  }

  info(message: string, context?: Record<string, any>) {
    const entry = this.formatLog("info", message, context);
    this.output(entry);
  }

  warn(message: string, context?: Record<string, any>) {
    const entry = this.formatLog("warn", message, context);
    this.output(entry);
  }

  error(message: string, error?: Error | unknown, context?: Record<string, any>) {
    const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined;
    const entry = this.formatLog("error", message, context, err);
    this.output(entry);
  }

  // Convenience methods for API endpoints
  apiRequest(method: string, path: string, userId?: string, context?: Record<string, any>) {
    this.info(`API ${method} ${path}`, {
      type: "api_request",
      method,
      path,
      userId,
      ...context,
    });
  }

  apiError(method: string, path: string, statusCode: number, error: Error | unknown, userId?: string) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.error(`API ${method} ${path} - ${statusCode}`, err, {
      type: "api_error",
      method,
      path,
      statusCode,
      userId,
    });
  }

  databaseQuery(query: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV === "development") {
      this.debug("Database query executed", {
        type: "database_query",
        query,
        ...context,
      });
    }
  }

  databaseError(operation: string, error: Error | unknown, context?: Record<string, any>) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.error(`Database operation failed: ${operation}`, err, {
      type: "database_error",
      operation,
      ...context,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

