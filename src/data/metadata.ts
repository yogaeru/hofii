import path from "node:path";
import fs from "node:fs/promises";
import type { TypeConfigSchema } from "#/core/config/schema";
import { getHofiEnv } from "./env";

interface Metadata {
  config?: Omit<TypeConfigSchema, "imports">;
}

const metadata: Metadata = {};

export function getMetadata() {
  return metadata;
}

export function getMetadataKey<K extends keyof Metadata>(key: K) {
  return metadata[key];
}

export function setMetadata<K extends keyof Metadata>(
  key: K,
  value: Metadata[K],
) {
  metadata[key] = value;
}

export async function setDefaultMetadata(configDir?: string) {
  const dir = configDir ?? getHofiEnv("configDir");
  const pathMetadata = path.resolve(dir || ".", ".state/hofii-lock.json");

  if (await fs.exists(pathMetadata)) {
    const state = await Bun.file(pathMetadata).json();
    setMetadata("config", state.config);
  }
}
