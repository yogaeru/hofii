import * as clack from "@clack/prompts";

import type { DiffPackagesResponse, DiffPkgs } from "#/types/core";
import type {
  ConfigPackages,
  ConfigSchema,
  PackageItems,
  PostHooks,
} from "./config/schema";
import { spawn } from "#/utils/spawn";
import { getMetadata, setMetadata } from "#/data/metadata";
import { getHofiEnv } from "#/data/env";
import { PackageManagers, type PackageManager } from "#/pm";
import { deepmerge } from "deepmerge-ts";

// Read only list of supported packages managers
export const PACKAGES_MANAGER = ["pacman", "dnf"] as const;

export interface FilteredPackagesItems {
  items: string[];
  hooks: PostHooks[];
}

type MetadataPackageItems = FilteredPackagesItems | undefined;

export type MetadataPackages = {
  [K in (typeof PACKAGES_MANAGER)[number]]?: MetadataPackageItems;
};

/**
 * Execute given post hooks commnad after install packages
 */
async function execPackageHooks(command: PostHooks) {
  await spawn({
    cmd: command,
    errMsg: `Failed to execute post hooks: ${command.join(" ")}`,
  });
}

export function separatePackages(packages: ConfigSchema["packages"]): DiffPkgs {
  const packagesPerManager: DiffPkgs = {
    pacman: [],
    dnf: [],
  };

  for (const pkg of packages ?? []) {
    if (pkg.manager === "pacman" || pkg.manager === "aur") {
      packagesPerManager.pacman.push(...pkg.items);
      continue;
    }
    if (pkg.manager === "dnf") {
      packagesPerManager.dnf.push(...pkg.items);
      continue;
    }
  }
  return packagesPerManager;
}

export function filterPackagesItems(
  packages: PackageItems,
): FilteredPackagesItems {
  // Stored filtered packages and hooks
  const items = [];
  const hooks = [];

  for (const pkg of packages) {
    if (typeof pkg === "object") {
      const { name, post_hooks } = pkg;
      if (name.trim()) items.push(name.trim());
      if (post_hooks) hooks.push(post_hooks);
      continue;
    }
    items.push(pkg);
  }

  return {
    items,
    hooks,
  };
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
  if (!packages || (packages.items.length <= 0 && packages.hooks.length <= 0))
    return;

  try {
    const succesfullyHooks: PostHooks[] = [];

    if (packages.items.length > 0) {
      await manager.syncDatabase();
      await manager.install(packages.items);
      clack.log.success(`Successfully Installing ${manager.name} Packages`);
    }

    // exec hooks commands
    for (const hook of packages.hooks) {
      await execPackageHooks(hook);
      succesfullyHooks.push(hook);
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
  if (!packages || (packages.items.length <= 0 && packages.hooks.length <= 0))
    return;

  try {
    await manager.remove(packages.items);
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

  const packageManager = getHofiEnv("packageManager");
  const PackageManagerClass =
    PackageManagers[packageManager as keyof typeof PackageManagers];

  const addedPackages = added[packageManager as keyof typeof added];
  const removedPackages = removed[packageManager as keyof typeof removed];

  if (!packageManager || packageManager! in PACKAGES_MANAGER) {
    clack.log.error(
      "Package Manager Not Suppported or Package Manager not detected",
    );
    return;
  }

  // Install and remove packages by the specified package manager
  const installedPackagesResult = await installPackageByManagers(
    PackageManagerClass,
    addedPackages,
  );
  const removedPackagesResult = await removePackageByManagers(
    PackageManagerClass,
    removedPackages,
  );

  // If no packages were installed or removed, log a message and return
  // This in make sure nothing to do with metadata
  if (!installedPackagesResult && !removedPackagesResult) {
    clack.log.info("Nothing to do !!");
    return;
  }

  // store metadata
  const metadataPackage: Partial<MetadataPackages> = {};
  const existingMetadata = getMetadata() ?? {};

  if (existingMetadata.packages) {
    metadataPackage[packageManager as keyof typeof metadataPackage] = deepmerge(
      existingMetadata.packages[
        packageManager as keyof typeof existingMetadata.packages
      ] ?? {},
      installedPackagesResult ?? {},
    );
  } else {
    metadataPackage[packageManager as keyof typeof metadataPackage] =
      installedPackagesResult;
    clack.log.info(`Metadata ${packageManager} Saved`);
  }

  // save metadata
  setMetadata("packages", metadataPackage);

  clack.note(JSON.stringify(metadataPackage, null, 2), "Metadata Info");
  // clack.note(JSON.stringify(config, null, 2), "Metadata Info");
}
