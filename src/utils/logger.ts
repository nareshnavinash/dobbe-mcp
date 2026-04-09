/**
 * Lightweight stderr logger for dobbe.
 * MCP uses stdio for transport, so all logs go to stderr.
 *
 * Environment variables:
 *   DOBBE_LOG_LEVEL  — debug | info | warn | error (default: info)
 *   DOBBE_LOG_FORMAT — json | pretty (default: json)
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m",  // gray
  info: "\x1b[36m",   // cyan
  warn: "\x1b[33m",   // yellow
  error: "\x1b[31m",  // red
};
const RESET = "\x1b[0m";

const minLevel = LEVELS[(process.env.DOBBE_LOG_LEVEL as LogLevel) ?? "info"] ?? LEVELS.info;
const format = (process.env.DOBBE_LOG_FORMAT ?? "json") as "json" | "pretty";

function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (LEVELS[level] < minLevel) return;

  if (format === "pretty") {
    const ts = new Date().toISOString().slice(11, 23);
    const color = LEVEL_COLORS[level];
    const dataStr = data && Object.keys(data).length > 0
      ? ` ${JSON.stringify(data)}`
      : "";
    process.stderr.write(`${ts} ${color}${level.toUpperCase().padEnd(5)}${RESET} ${message}${dataStr}\n`);
  } else {
    const entry = {
      ts: new Date().toISOString(),
      level,
      msg: message,
      ...data,
    };
    process.stderr.write(JSON.stringify(entry) + "\n");
  }
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
};
