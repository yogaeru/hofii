import { deepEquals } from "bun";
import { getMetadata } from "#/data/metadata";
import type { TypeConfigSchema, ConfigSymlinks } from "./config/schema";
import type { DiffConfigResponse } from "#/types/core";

function diffSymlinks(
  oldSymlinks: ConfigSymlinks,
  newSymlinks: ConfigSymlinks,
) {
  const added =
    newSymlinks?.filter(
      (newItem) =>
        !oldSymlinks?.some((oldItem) => deepEquals(newItem, oldItem, true)),
    ) ?? [];

  const removed =
    oldSymlinks?.filter(
      (oldItem) =>
        !newSymlinks?.some((newItem) => deepEquals(oldItem, newItem, true)),
    ) ?? [];

  return { added, removed };
}

/**
 * Compares the new config with the old config and returns the diff.
 * @param newConfig
 * @returns Object with added and removed value.
 */
export function diffConfig(newConfig: TypeConfigSchema) {
  const oldConfig = getMetadata();

  // console.log(JSON.stringify(oldConfig, null, 2))
  const resSymlinks = diffSymlinks(oldConfig.symlinks, newConfig.symlinks);

  return {
    symlinks: resSymlinks,
  };
}

/**
 * Print diff from config
 */
export function buildDiffString(config: DiffConfigResponse) {
  const { symlinks } = config;

  const symlinksLines = (() => {
    const line = ["SYMLINKS"];
    const { added = [], removed = [] } = symlinks;
    if (added?.length === 0 && removed?.length === 0) {
      line.push("  - No changes to apply with symlinks");
      return line.join("\n");
    }
    for (const item of added) {
      line.push(
        `  - [ADDED] ${item.sudo ? "(sudo) " : ""}${item.source} -> ${item.target}`,
      );
    }
    for (const item of removed) {
      line.push(
        `  - [REMOVED] ${item.sudo ? "(sudo) " : ""}${item.source} -> ${item.target}`,
      );
    }
    return line.join("\n");
  })();

  return [
    symlinksLines
  ].join("/n");
}
