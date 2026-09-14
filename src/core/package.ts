import * as clack from "@clack/prompts";
import { Pacman } from "#/pm/pacman";

import type { DiffPackagesResponse, DiffPkgs } from "#/types/core";
import type {
  ConfigPackages,
  ConfigSchema,
  PackageItems,
  PostHooks,
} from "./config/schema";
import { spawn } from "#/utils/spawn";
import { setMetadata } from "#/data/metadata";

// Read only list of supported packages managers
export const PACKAGES_MANAGER = ["pacman"] as const;

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
  };

  for (const pkg of packages ?? []) {
    if (pkg.manager === "pacman" || pkg.manager === "aur") {
      packagesPerManager.pacman.push(...pkg.items);
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
 * Installing pacman packages
 */
async function installPacmanPackages(
  packages: MetadataPackageItems,
): Promise<FilteredPackagesItems | undefined> {
  if (!packages) return;

  try {
    const succesfullyHooks: PostHooks[] = [];

    await Pacman.syncDatabase();
    await Pacman.install(packages.items);
    clack.log.success("Successfully Installing Pacman Packages");

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

async function removePacmanPackages(packages: MetadataPackageItems) {
  if (!packages) return;

  if (!packages.items.length) return;
  await Pacman.remove(packages.items);
}

/**
 * Entrty install packages
 */
export async function installPackages(config: DiffPackagesResponse) {
  const { added: addedPackages, removed: removedPackages } = config;

  const pacman = await installPacmanPackages(addedPackages.pacman);
  await removePacmanPackages(removedPackages.pacman);

  // store metadata
  const metadataPackage: Partial<MetadataPackages> = {};

  if (pacman) {
    metadataPackage.pacman = pacman;
    clack.log.info("Metadata pacman Saved");
  }
  // save metadata
  setMetadata("packages", metadataPackage); 

  // clack.note(JSON.stringify(metadataPackage, null, 2), "Metadata Info");
  // clack.note(JSON.stringify(pacman, null, 2), "Metadata Info");
  // clack.note(JSON.stringify(config, null, 2), "Metadata Info");
}
