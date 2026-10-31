import * as clack from "@clack/prompts";

import type { DiffPackagesResponse, DiffPkgs } from "#/types/core";
import type { ConfigSchema, PackageItems } from "./config/schema";
import { spawn } from "#/utils/spawn";
import { getMetadata, setMetadata } from "#/data/metadata";
import { getHofiEnv } from "#/data/env";
import { PackageManagers, type PackageManager } from "#/pm";

// Read only list of supported packages managers
export const PACKAGES_MANAGER = ["pacman", "dnf", "flatpak"] as const;

export interface FilteredPackagesItems {
  items: string[];
  scope?: "user" | "system";
}

type MetadataPackageItems = FilteredPackagesItems | undefined;

export type MetadataPackages = {
  [K in (typeof PACKAGES_MANAGER)[number]]?: MetadataPackageItems;
};

/**
 * Separates packages by their manager.
 * The return should be an object with keys as package managers and values as arrays of package items.
 * @param packages The packages to separate.
 * @returns An object with packages separated by their manager.
 */
export function separatePackages(config: ConfigSchema): DiffPkgs {
  const packagesPerManager: DiffPkgs = {
    pacman: [],
    flatpak: [],
    dnf: [],
  };

  packagesPerManager.pacman.push(...(config.pacman?.packages ?? []));
  packagesPerManager.dnf.push(...(config.dnf?.packages ?? []));
  packagesPerManager.flatpak.push(...(config.flatpak?.packages ?? []));
  return packagesPerManager;
}

/**
 * Filter package items from the given packages.
 * Returns normalized package items.
 * @param packages The package names to filter.
 * @returns An object containing normalized package items.
 */
export function filterPackagesItems(
  packages: PackageItems,
  scope?: "user" | "system",
): FilteredPackagesItems {
  const items = [];
  for (const pkg of packages) {
    if (pkg.trim()) items.push(pkg.trim());
  }

  return { items, ...(scope ? { scope } : {}) };
}

function packageItemsEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function updatePackageMetadata(
  manager: keyof MetadataPackages,
  added: MetadataPackageItems,
  removed: MetadataPackageItems,
) {
  const existing = getMetadata().packages ?? {};
  const previous = existing[manager];
  const removedItems = new Set(removed?.items ?? []);
  const nextItems = [
    ...(previous?.items ?? []).filter((item) => !removedItems.has(item)),
    ...(added?.items ?? []),
  ];
  const nextManager: FilteredPackagesItems = {
    items: [...new Set(nextItems)],
    ...(added?.scope
      ? { scope: added.scope }
      : previous?.scope
        ? { scope: previous.scope }
        : {}),
  };
  const next = {
    ...existing,
    [manager]: nextManager,
  };

  if (
    previous &&
    packageItemsEqual(previous.items, nextManager.items) &&
    previous.scope === nextManager.scope
  ) {
    return;
  }
  setMetadata("packages", next);
}

/**
 * Installing pakcages by manager itself
 * @param manager Package Manager to Install, like dnf or pacman
 * @param packages list packages to install
 */
async function installPackageByManagers(
  manager: PackageManager,
  packages: MetadataPackageItems,
) {
  if (!packages || packages.items.length <= 0)
    return;

  try {
    if (packages.items.length > 0) {
      await manager.syncDatabase();
      await manager.install(packages.items, packages.scope);
      clack.log.success(`Successfully Installing ${manager.name} Packages`);
    }

    return packages;
  } catch (error) {
    if (error instanceof Error) clack.log.error(error.message);
    else console.error(error);
    return;
  }
}

/**
 * Removes packages by the specified package manager.
 * @param manager The package manager to use for removal.
 * @param packages list of packages to remove
 */
async function removePackageByManagers(
  manager: PackageManager,
  packages: MetadataPackageItems,
) {
  if (!packages || packages.items.length <= 0)
    return;

  try {
    await manager.remove(packages.items, packages.scope);
    return packages;
  } catch (error) {
    if (error instanceof Error) clack.log.error(error.message);
    else console.error(error);
    return;
  }
}

/**
 * Entrty install packages
 */
export async function installPackages(config: DiffPackagesResponse) {
  const { added, removed } = config;
  const detectedManager = getHofiEnv("packageManager");
  const activeManagers = new Set<keyof typeof PackageManagers>();
  if (
    detectedManager &&
    Object.prototype.hasOwnProperty.call(PackageManagers, detectedManager)
  ) {
    activeManagers.add(detectedManager as keyof typeof PackageManagers);
  }
  if (getHofiEnv("flatpak")) activeManagers.add("flatpak");

  let hasChanges = false;
  let hasAppliedChanges = false;

  for (const packageManager of PACKAGES_MANAGER) {
    const addedPackages = added[packageManager];
    const removedPackages = removed[packageManager];
    const hasManagerChanges =
      (addedPackages?.items.length ?? 0) > 0 ||
      (removedPackages?.items.length ?? 0) > 0;

    if (!hasManagerChanges) continue;
    hasChanges = true;

    if (!activeManagers.has(packageManager)) {
      clack.log.warn(
        `Skipping ${packageManager} packages: manager is not available on this host`,
      );
      continue;
    }

    const PackageManagerClass = PackageManagers[packageManager];
    const installedPackagesResult = await installPackageByManagers(
      PackageManagerClass,
      addedPackages,
    );
    const removedPackagesResult = await removePackageByManagers(
      PackageManagerClass,
      removedPackages,
    );

    if (!installedPackagesResult && !removedPackagesResult) continue;
    hasAppliedChanges = true;
    updatePackageMetadata(
      packageManager,
      installedPackagesResult,
      removedPackagesResult,
    );
    clack.log.info(`Metadata ${packageManager} saved`);
  }

  if (!hasChanges) clack.log.info("No package changes to apply.");
  else if (!hasAppliedChanges) clack.log.warn("No package changes were applied.");
}
