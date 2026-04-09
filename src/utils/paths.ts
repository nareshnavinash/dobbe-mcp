import * as path from "node:path";

/**
 * Centralized path constants for dobbe.
 * Supports DOBBE_HOME environment variable for custom root directory.
 */

const HOME = process.env.HOME ?? process.env.USERPROFILE ?? ".";

export const DOBBE_DIR = process.env.DOBBE_HOME ?? path.join(HOME, ".dobbe");
export const STATE_DIR = path.join(DOBBE_DIR, "state");
export const CACHE_DIR = path.join(DOBBE_DIR, "cache");
export const SESSION_DIR = path.join(DOBBE_DIR, "sessions");
export const CONFIG_PATH = path.join(DOBBE_DIR, "config.toml");
