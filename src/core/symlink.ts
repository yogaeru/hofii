import fs from "node:fs/promises";
import { deepEquals } from "bun";
import * as clack from "@clack/prompts";

import { getHofiEnv } from "#/data/env";
import { getMetadata, setMetadata } from "#/data/metadata";
import { createSymlink, removeSymlink, getFileInfo } from "#/utils/fs";

import type { ConfigSymlinks } from "./config/schema";

interface SymlinksArgument {
  added: ConfigSymlinks;
  removed: ConfigSymlinks;
}

/**
 * Apply symlinks based on the provided symlinks argument
 * @param symlinks - The symlinks to apply, including added and removed links
 */
export async function applySymlinks(symlinks: SymlinksArgument | undefined) {
  if (!symlinks) return;
  const isBackup = getHofiEnv("settings")?.backup ?? "";
  const { added = [], removed = [] } = symlinks;

  const appliedSymlinks: ConfigSymlinks = [];
  const removedSymlinks: ConfigSymlinks = [];

  try {
    // Apply removed symlinks
    const removeResults = (
      await Promise.allSettled(
        removed.map(async (link) => {
          const info = await getFileInfo(link.target);

          if (!info) {
            clack.log.warn(
              `Target doesn't exist: ${link.target}, did you remove it manually?`,
            );
            removedSymlinks.push(link);
            return;
          }

          if (!info.isSymbolicLink()) {
            clack.log.warn(
              `File ${link.target} not a symlink, did you remove it manually?`,
            );
            removedSymlinks.push(link);
            return;
          }

          await removeSymlink(link.target, link.sudo);
          removedSymlinks.push(link);
          clack.log.success(`Succesfully remove symlink ${link.target}`);
        }),
      )
    ).filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    // Apply added symlinks
    const addResults = (
      await Promise.allSettled(
        added.map(async (link) => {
          const info = await getFileInfo(link.target);
          const sourceLink = await fs.readlink(link.target);

          if (info) {
            if (info.isSymbolicLink() && sourceLink === link.source) {
              await removeSymlink(link.target, link.sudo);
              await createSymlink(link.source, link.target, link.sudo);
              appliedSymlinks.push(link);
              clack.log.warn(`Recreate ${sourceLink} -> ${link.target}`);
              return;
            } else if (isBackup) {
              await fs.rename(link.target, link.target + ".bak");
            } else {
              clack.log.error(
                `Target already exists, skip create: ${link.target}`,
              );
              return;
            }
          }

          await createSymlink(link.source, link.target, link.sudo);
          appliedSymlinks.push(link);
          clack.log.success(
            `Succesfully create symlink ${link.source} -> ${link.target}`,
          );
        }),
      )
    ).filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    for (const error of addResults) {
      console.error(`Failed to add symlink: ${formatError(error)}`);
    }

    for (const error of removeResults) {
      console.error(`Failed to remove symlink: ${formatError(error)}`);
    }

    if (addResults.length > 0 || removeResults.length > 0) {
      clack.log.error(` [FATAL] Failed to apply symlinks`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(err);
    clack.log.error(` [FATAL] Failed to apply symlinks`);
    process.exitCode = 1;
  } finally {
    const existingConfig = getMetadata() ?? {};
    const existingSymlinks = existingConfig.symlinks ?? [];

    const updatedSymlinks = existingSymlinks
      .filter((link) => !removedSymlinks.some((l) => deepEquals(l, link)))
      .concat(appliedSymlinks);

    clack.log.info(`Updated symlinks state: ${updatedSymlinks.length}`);

    setMetadata("symlinks", updatedSymlinks);
  }
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    const code = "code" in error ? String(error.code) : "ERROR";

    return `[${code}] ${error.message}`;
  }

  return `[ERROR] ${String(error)}`;
}
