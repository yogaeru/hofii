import { isDeepStrictEqual } from "node:util";
import { getMetadata } from "#/data/metadata";
import type { ConfigSchema, ConfigSymlinks } from "./config/schema";

import {
  filterPackagesItems,
  PACKAGES_MANAGER,
  separatePackages,
  type MetadataPackages,
} from "./package";

import type {
  DiffPkgs,
  DiffConfigResponse,
  DiffPackagesResponse,
  DiffRepositoriesResponse,
  DnfRepository,
} from "#/types/core";

const DEFAULT_FLATHUB = {
  name: "flathub",
  url: "https://flathub.org/repo/flathub.flatpakrepo",
} as const;

function configuredFlatpakRemotes(config: ConfigSchema["flatpak"]) {
  if (!config?.enabled) return [];
  return config.remotes?.length ? config.remotes : [DEFAULT_FLATHUB];
}

function configuredDnfRepositories(config: ConfigSchema["dnf"]): DnfRepository[] {
  if (!config) return [];
  return [
    ...(config.rpmfusion
      ? [{ name: "rpmfusion", kind: "rpmfusion" as const }]
      : []),
    ...(config.terra ? [{ name: "terra", kind: "terra" as const }] : []),
    ...(config.copr ?? []).map((copr) => ({
      name: `copr:${copr}`,
      kind: "copr" as const,
    })),
    ...(config.remotes ?? []).map((remote) => ({
      ...remote,
      kind: "remote" as const,
    })),
  ];
}

function diffRepositories(
  oldConfig: ReturnType<typeof getMetadata>,
  newConfig: ConfigSchema,
): DiffRepositoriesResponse {
  const oldRemotes = oldConfig.flatpak?.enabled
    ? oldConfig.flatpak.remotes ?? []
    : [];
  const newRemotes = configuredFlatpakRemotes(newConfig.flatpak);
  const oldDnf = configuredDnfRepositories(oldConfig.dnf);
  const newDnf = configuredDnfRepositories(newConfig.dnf);

  const oldFlatpakScope = oldConfig.flatpak?.scope ?? "system";
  const newFlatpakScope = newConfig.flatpak?.scope ?? "system";
  const flatpakScopeChanged = oldFlatpakScope !== newFlatpakScope;

  return {
    flatpak: {
      added: flatpakScopeChanged
        ? newRemotes
        : newRemotes.filter(
            (remote) => !oldRemotes.some((old) => old.name === remote.name),
          ),
      removed: flatpakScopeChanged
        ? oldRemotes
        : oldRemotes.filter(
            (remote) => !newRemotes.some((next) => next.name === remote.name),
          ),
    },
    dnf: {
      added: newDnf.filter(
        (entry) => !oldDnf.some((old) => isDeepStrictEqual(old, entry)),
      ),
      removed: oldDnf.filter(
        (entry) => !newDnf.some((next) => isDeepStrictEqual(next, entry)),
      ),
    },
  };
}

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
        !oldSymlinks?.some((oldItem) => isDeepStrictEqual(newItem, oldItem)),
    ) ?? [];

  const removed =
    oldSymlinks?.filter(
      (oldItem) =>
        !newSymlinks?.some((newItem) => isDeepStrictEqual(oldItem, newItem)),
    ) ?? [];

  return { added, removed };
}

/**
 * Diff packages between old and new config.
 */
function diffPackages(
  oldPackages: MetadataPackages | undefined,
  newConfig: ConfigSchema,
): DiffPackagesResponse {
  const oldPackagesPerManager = oldPackages;
  const newPackagesPerManager: MetadataPackages = Object.entries(
    separatePackages(newConfig),
  ).reduce((acc, [manager, items]) => {
    acc[manager as keyof MetadataPackages] = filterPackagesItems(
      items,
      manager === "flatpak"
        ? (newConfig.flatpak?.scope ?? "system")
        : undefined,
    );
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

    const oldScope = oldPackagesPerManager?.[manager]?.scope;
    const newScope =
      newPackagesPerManager[manager]?.scope ??
      (manager === "flatpak" ? "system" : undefined);
    if (manager === "flatpak" && oldScope !== newScope) {
      addedItems.splice(0, addedItems.length, ...(newPackagesPerManager[manager]?.items ?? []));
      removedItems.splice(0, removedItems.length, ...(oldPackagesPerManager?.[manager]?.items ?? []));
    }

    added[manager] = {
      items: addedItems,
      scope: newPackagesPerManager[manager]?.scope,
    };
    removed[manager] = {
      items: removedItems,
      scope: oldPackagesPerManager?.[manager]?.scope,
    };
  }

  return { added, removed };
}

/**
 * Compares the new config with the old config and returns the diff.
 * @returns Object with added and removed value.
 */
export function diffConfig(newConfig: ConfigSchema): DiffConfigResponse {
  const oldConfig = getMetadata();

  const resSymlinks = diffSymlinks(oldConfig.symlinks, newConfig.symlinks);
  const resPackages = diffPackages(oldConfig.packages, newConfig);
  const repositories = diffRepositories(oldConfig, newConfig);

  return {
    symlinks: resSymlinks,
    packages: resPackages,
    repositories,
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
    }
    for (const [manager, packageObject] of Object.entries(removed)) {
      for (const item of packageObject.items) {
        lines.push(`  - [REMOVED] (${manager}) -> ${item}`);
      }
    }

    if (lines.length === 1) {
      lines.push("  - No changes to apply with packages");
    }

    return lines.join("\n");
  })();

  const repositoryLines = (() => {
    const lines = ["REPOSITORIES"];
    for (const remote of config.repositories.flatpak.added ?? []) {
      lines.push(`  - [ADDED] (flatpak:${remote.name}) -> ${remote.url}`);
    }
    for (const remote of config.repositories.flatpak.removed ?? []) {
      lines.push(`  - [REMOVED] (flatpak:${remote.name}) -> ${remote.url}`);
    }
    for (const repo of config.repositories.dnf.added) {
      lines.push(`  - [ADDED] (dnf:${repo.name}) -> ${repo.url ?? "built-in"}`);
    }
    for (const repo of config.repositories.dnf.removed) {
      lines.push(`  - [REMOVED] (dnf:${repo.name}) -> ${repo.url ?? "built-in"}`);
    }
    if (lines.length === 1) lines.push("  - No repository changes to apply");
    return lines.join("\n");
  })();

  return [symlinksLines, packagesLines, repositoryLines].join("\n\n");
}
