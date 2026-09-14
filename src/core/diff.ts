import { deepEquals } from "bun";
import { getMetadata } from "#/data/metadata";
import type {
  ConfigSchema,
  ConfigSymlinks,
  ConfigPackages,
  PackageItems,
} from "./config/schema";

import {
  filterPackagesItems,
  PACKAGES_MANAGER,
  separatePackages,
  type MetadataPackages,
  type FilteredPackagesItems,
} from "./package";

import type {
  DiffPkgs,
  DiffConfigResponse,
  DiffPackagesResponse,
} from "#/types/core";

/**
 * Diff symlinks between old and new config.
 */
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
 * Diff packages between old and new config.
 */
function diffPackages(
  oldPackages: MetadataPackages | undefined,
  newPackages: ConfigPackages,
): DiffPackagesResponse {
  const oldPackagesPerManager = oldPackages;
  const newPackagesPerManager: MetadataPackages = Object.entries(
    separatePackages(newPackages),
  ).reduce((acc, [manager, items]) => {
    acc[manager as keyof MetadataPackages] = filterPackagesItems(items);
    return acc;
  }, {} as MetadataPackages);

  const added = {} as MetadataPackages;
  const removed = {} as MetadataPackages;

  for (const manager of PACKAGES_MANAGER) {
    // Items
    const addedItems = [
      ...new Set(
        newPackagesPerManager[manager]?.items.filter(
          (items) => !oldPackagesPerManager?.[manager]?.items.includes(items),
        ) ?? [],
      ),
    ];
    const removedItems = [
      ...new Set(
        oldPackagesPerManager?.[manager]?.items.filter(
          (items) => !newPackagesPerManager?.[manager]?.items.includes(items),
        ) ?? [],
      ),
    ];

    // Hooks
    const addedHooks =
      newPackagesPerManager[manager]?.hooks.filter(
        (hook) => !oldPackagesPerManager?.[manager]?.hooks.includes(hook),
      ) ?? [];

    const removedHooks =
      oldPackagesPerManager?.[manager]?.hooks.filter(
        (hook) => !newPackagesPerManager?.[manager]?.hooks.includes(hook),
      ) ?? [];

    added[manager] = { items: addedItems, hooks: addedHooks };
    removed[manager] = { items: removedItems, hooks: removedHooks };
  }

  return { added, removed };
}

/**
 * Compares the new config with the old config and returns the diff.
 * @returns Object with added and removed value.
 */
export function diffConfig(newConfig: ConfigSchema): DiffConfigResponse {
  const oldConfig = getMetadata();

  // console.log(JSON.stringify(oldConfig, null, 2))
  const resSymlinks = diffSymlinks(oldConfig.symlinks, newConfig.symlinks);
  const resPackages = diffPackages(oldConfig.packages, newConfig.packages);
  // console.log(JSON.stringify(resSymlinks, null, 2))
  // console.log(JSON.stringify(resPackages, null, 2))

  return {
    symlinks: resSymlinks,
    packages: resPackages,
  };
}

/**
 * Print diff from config
 */
export function buildDiffString(config: DiffConfigResponse) {
  const { symlinks, packages } = config;

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

  const packagesLines = (() => {
    const lines = ["PACKAGES"];
    const { added = {}, removed = {} } = packages;

    for (const [manager, packageObject] of Object.entries(added)) {
      for (const item of packageObject.items) {
        lines.push(`  - [ADDED] (${manager}) -> ${item}`);
      }
      for (const item of packageObject.hooks) {
        lines.push(`  - [ADDED] (${manager}) -> ${item}`);
      }
    }
    for (const [manager, packageObject] of Object.entries(removed)) {
      for (const item of packageObject.items) {
        lines.push(`  - [REMOVED] (${manager}) -> ${item}`);
      }
      // for (const item of packageObject.hooks) {
      //   lines.push(`  - [REMOVED] (${manager}) ${item}`);
      // }
    }

    if (lines.length === 1) {
      lines.push("  - No changes to apply with packages");
    }

    return lines.join("\n");
  })();

  return [symlinksLines, packagesLines].join("\n\n");
}
