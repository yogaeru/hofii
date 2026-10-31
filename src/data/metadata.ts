import path from "node:path";
import fs from "node:fs/promises";
import { getHomedir } from "#/utils/path";
import { type ConfigSchema } from "#/core/config/schema";
import type { MetadataPackages } from "#/core/package";

type ConfigBase = Omit<ConfigSchema, "general" | "pacman" | "flatpak" | "dnf">
type Config = ConfigBase & {
  general?: ConfigSchema["general"];
  flatpak?: Omit<NonNullable<ConfigSchema["flatpak"]>, "packages">;
  dnf?: Omit<NonNullable<ConfigSchema["dnf"]>, "packages">;
  packages?: Partial<MetadataPackages>;
};

export interface Metadata {
  config?: Config;
}

/**
 * Configuration state for the Hofii
 */
const CONFIG: Config = {};
const METADATA_FILENAME = "hofii-lock.json";

export function getMetadataPath() {
  return path.resolve(getHomedir(), ".config", "hofii", METADATA_FILENAME);
}

function getLegacyMetadataPath() {
  return path.resolve(getHomedir(), ".cache", "hofii", METADATA_FILENAME);
}

/**
 * Get the current metadata Object
 */
export function getMetadata() {
  return CONFIG;
}

/**
 * Get a specific metadata key
 */
export function getMetadataKey<K extends keyof Config>(key: K) {
  return CONFIG[key];
}

/**
 * Set a specific metadata key
 */
export function setMetadata<K extends keyof Config>(key: K, value: Config[K]) {
  CONFIG[key] = value;
}

/**
 * Load metadata from the user configuration directory, migrating the legacy
 * cache file when it is the only available state.
 */
export async function setDefaultMetadata() {
  const metadataPath = getMetadataPath();
  const legacyPath = getLegacyMetadataPath();
  let sourcePath = metadataPath;

  try {
    await loadMetadataFile(metadataPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    sourcePath = legacyPath;
    try {
      await loadMetadataFile(legacyPath);
    } catch (legacyError) {
      if ((legacyError as NodeJS.ErrnoException).code !== "ENOENT") {
        throw legacyError;
      }
    }
  }

  if (sourcePath === legacyPath && Object.keys(CONFIG).length > 0) {
    await writeMetadata();
  }
}

/**
 * Write metadata to ~/.config/hofii/hofii-lock.json.
 */
export async function writeMetadata() {
  const metadataPath = getMetadataPath();
  const metadatadir = path.dirname(metadataPath);

  await fs.mkdir(metadatadir, { recursive: true });
  const metadata: Metadata = {
    config: CONFIG,
  };

  const temporaryPath = `${metadataPath}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(metadata, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await fs.rename(temporaryPath, metadataPath);
}

async function loadMetadataFile(metadataPath: string) {
  const parsed: unknown = JSON.parse(await fs.readFile(metadataPath, "utf8"));
  if (!isMetadata(parsed)) {
    throw new Error(`Invalid metadata file: ${metadataPath}`);
  }
  Object.assign(CONFIG, parsed.config ?? {});
}

function isMetadata(value: unknown): value is Metadata {
  if (!value || typeof value !== "object") return false;
  const config = (value as { config?: unknown }).config;
  return config === undefined || (typeof config === "object" && config !== null);
}
