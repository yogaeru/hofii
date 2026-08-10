import path from "node:path";
import fs from "node:fs/promises";
import { getHofiEnv } from "./env";
import { type TypeConfigSchema } from "#/core/config/schema";

type Config = Omit<TypeConfigSchema, "imports">;

interface Metadata {
  config?: Omit<TypeConfigSchema, "imports">;
}

/**
 * Configuration state for the Hofii CLI
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
export async function setDefaultMetadata(configDir?: string) {
  const dir = configDir ?? getHofiEnv("configDir");
  const pathMetadata = path.resolve(dir || ".", ".state/hofii-lock.json");

  if (await fs.exists(pathMetadata)) {
    const state = await Bun.file(pathMetadata).json();

    Object.assign(CONFIG, state.config);
  }
}

/**
 * Write Metadata file
 */
export async function writeMetadata() {
  const metadataDir = path.resolve(getHofiEnv("configDir") || ".", ".state");

  if (!(await fs.exists(metadataDir))) {
    await fs.mkdir(metadataDir, { recursive: true });
  }
  const metadata: Metadata = {
    config: CONFIG,
  };

  await Bun.write(
    path.resolve(metadataDir, "hofii-lock.json"),
    JSON.stringify(metadata, null, 2),
  );
}
