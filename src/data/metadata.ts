import path from "node:path";
import fs from "node:fs/promises";
import { getHomedir } from "#/utils/path";
import { type ConfigSchema } from "#/core/config/schema";
import type { MetadataPackages } from "#/core/package";

type ConfigBase = Omit<ConfigSchema, "imports" | "packages">
type Config = ConfigBase & {
  packages?: Partial<MetadataPackages>;
};

interface Metadata {
  config?: Config;
}

/**
 * Configuration state for the Hofii
 */
const CONFIG: Config = {};

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
 * Set default metadata from the environment or config directory
 */
export async function setDefaultMetadata() {
  const cachedir = path.resolve(getHomedir(), ".cache/hofii");
  const pathMetadata = path.resolve(cachedir, "hofii-lock.json");

  if (await fs.exists(pathMetadata)) {
    const state = await Bun.file(pathMetadata).json();

    Object.assign(CONFIG, state.config);
  }
}

/**
 * Write Metadata file
 * File location: ~/.cache/hofii/hofii-lock.json
 */
export async function writeMetadata() {
  const metadatadir = path.resolve(getHomedir(), ".cache/hofii");

  if (!(await fs.exists(metadatadir))) {
    await fs.mkdir(metadatadir, { recursive: true });
  }
  const metadata: Metadata = {
    config: CONFIG,
  };

  await Bun.write(
    path.resolve(metadatadir, "hofii-lock.json"),
    JSON.stringify(metadata, null, 2),
  );
}
