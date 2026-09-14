import { deepEquals } from "bun";
import fs from "node:fs/promises";
import * as clack from "@clack/prompts";

import {
  createSymlink,
  removeSymlink,
  getFileInfo,
  renameFile,
} from "#/utils/fs";
import { getHofiEnv } from "#/data/env";
import { getMetadata, setMetadata } from "#/data/metadata";

import type { ConfigSymlinks } from "./config/schema";

interface SymlinksArgument {
  added: ConfigSymlinks;
  removed: ConfigSymlinks;
}

/**
 * Apply symlinks based on the provided symlinks argument
 * @param symlinks - The symlinks to apply, including added and removed links
 */
export async function applySymlinks(symlinks: SymlinksArgument) {
  if (!symlinks) return;
  const isBackup = getHofiEnv("settings")?.backup ?? true;
  const { added = [], removed = [] } = symlinks;

  // Track successfully applied and removed symlinks
  const succesfullyAppliedSymlinks: ConfigSymlinks = [];
  const succesfullyRemovedSymlinks: ConfigSymlinks = [];

  try {
    // Apply removed symlinks and get rejected results
    const rejectedRemovedRes = getRejectedSettled(
      await Promise.allSettled(
        removed.map(async (link) => {
          const info = await getFileInfo(link.target);

          // If the target doesn't exist, warn and skip
          if (!info) {
            clack.log.warn(
              `Target doesn't exist: ${link.target}, did you remove it manually?`,
            );
            succesfullyRemovedSymlinks.push(link);
            return;
          }

          // If the target is not a symlink, warn and skip
          if (!info.isSymbolicLink()) {
            clack.log.warn(
              `${link.target} not a symlink, did you remove it manually?`,
            );
            succesfullyRemovedSymlinks.push(link);
            return;
          }

          await removeSymlink(link.target, link.sudo);
          succesfullyRemovedSymlinks.push(link);
          clack.log.success(`Succesfully remove symlink ${link.target}`);
        }),
      ),
    );

    // Apply and get rejected results for added symlinks
    const rejectedAddedRes = getRejectedSettled(
      await Promise.allSettled(
        added.map(async (link) => {
          const info = await getFileInfo(link.target);

          if (info) {
            // If the target is a symbolic link and the source matches, recreate it
            if (info.isSymbolicLink()) {
              const sourceLink = await fs.readlink(link.target);
              if (sourceLink === link.source) {
                await removeSymlink(link.target, link.sudo);
                await createSymlink(link.source, link.target, link.sudo);
                succesfullyAppliedSymlinks.push(link);
                clack.log.warn(`Recreate ${sourceLink} -> ${link.target}`);
                return;
              }
            }

            // If target not symbolic link
            if (isBackup) {
              await renameFile({
                oldPath: link.target,
                newPath: link.target + ".bak",
                sudo: link.sudo,
              });
            } else {
              clack.log.error(
                `Target already exists, skip create: ${link.target}`,
              );
              return;
            }
          }

          await createSymlink(link.source, link.target, link.sudo);
          succesfullyAppliedSymlinks.push(link);
          clack.log.success(
            `Succesfully create symlink ${link.source} -> ${link.target}`,
          );
        }),
      ),
    );

    // Log any errors that occurred during add/remove operations
    for (const error of rejectedAddedRes) {
      console.error(`Failed to add symlink: ${formatError(error)}`);
    }
    for (const error of rejectedRemovedRes) {
      console.error(`Failed to remove symlink: ${formatError(error)}`);
    }

    // If there were errors, log a fatal error and exit
    if (rejectedAddedRes.length > 0 || rejectedRemovedRes.length > 0) {
      clack.log.error(` [FATAL] Error caused while applying symlinks`);
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
      .filter(
        (link) => !succesfullyRemovedSymlinks.some((l) => deepEquals(l, link)),
      )
      .concat(succesfullyAppliedSymlinks);

    clack.log.info(`Updated symlinks state: ${updatedSymlinks.length}`);
    setMetadata("symlinks", updatedSymlinks);
  }
}

// Helper for formatting error messages
function formatError(error: unknown) {
  if (error instanceof Error) {
    const code = "code" in error ? String(error.code) : "ERROR";

    return `[${code}] ${error.message}`;
  }

  return `[ERROR] ${String(error)}`;
}

// get rejected from a list of settled results
function getRejectedSettled<T>(
  results: PromiseSettledResult<T>[],
): PromiseRejectedResult[] {
  return results.filter((result) => result.status === "rejected");
}
