import { deepEquals } from "bun";
import type { TypeConfigSchema, ConfigSymlinks } from "./config/schema";
import { getMetadata } from "#/data/metadata";

function diffSynmlinks(
  oldSymlinks: ConfigSymlinks,
  newSymlinks: ConfigSymlinks,
) {
  const added = newSymlinks?.filter(
    (newItem) =>
      !oldSymlinks?.some((oldItem) => deepEquals(newItem, oldItem, true)),
  );

  const removed = oldSymlinks?.filter(
    (oldItem) =>
      !newSymlinks?.some((newItem) => deepEquals(oldItem, newItem, true)),
  );

  return { added, removed };
}

/**
 * Compares the new config with the old config and returns the diff.
 * @param newConfig 
 * @returns Object with added and removed value.
 */
export function diffConfig(newConfig: TypeConfigSchema) {
  const oldConfig = getMetadata();
  const resSymlinks = diffSynmlinks(
    oldConfig?.config?.symlinks,
    newConfig.symlinks,
  );

  return {
    symlinks: resSymlinks,
    
  };
}
