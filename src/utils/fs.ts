import fs from "node:fs/promises";
import * as clack from "@clack/prompts";

import { spawn } from "./spawn";
import { getHofiEnv } from "#/data/env";
import type { Stats } from "node:fs";

/**
 * Creates a symlink from `source` to `target`.
 * @param source - The path of the source file.
 * @param target - The path of the target file.
 * @param sudo - Whether to run the command with sudo.
 */
async function createSymlink(source: string, target: string, sudo = false) {
  if (sudo) {
    if (getHofiEnv("platform") !== "linux") {
      clack.log.warn("Sudo only support in Linux");
      return;
    }

    await spawn({
      cmd: ["sudo", "ln", "-s", source, target],
      errMsg: `Failed create symlink ${source + " -> " + target}`,
    });
  } else {
    await fs.symlink(source, target);
  }
}

/**
 * Removes a symlink at `target`.
 * @param target - The path of the symlink to remove.
 * @param sudo - Whether to run the command with sudo.
 */
async function removeSymlink(target: string, sudo = false) {
  if (sudo) {
    if (getHofiEnv("platform") !== "linux") {
      clack.log.warn("Sudo only support in Linux");
      return;
    }

    await spawn({
      cmd: ["sudo", "rm", target],
      errMsg: `Failed remove symlink ${target}`,
    });
  } else {
    await fs.unlink(target);
  }
}

/**
 * Helper function to get file info using `fs.lstat`.
 * It can be used for check file existence.
 */
async function getFileInfo(filePath: string): Promise<Stats | null> {
  try {
    return await fs.lstat(filePath);
  } catch (err) {
    return null;
  }
}

/**
 * Renames a file from `oldPath` to `newPath`.
 * @param oldPath - The path of the file to rename.
 * @param newPath - The new path of the file.
 * @param sudo - Whether to run the command with sudo.
 */
async function renameFile({
  oldPath,
  newPath,
  sudo = false,
}: {
  oldPath: string;
  newPath: string;
  sudo?: boolean;
}) {
  if (!(await getFileInfo(newPath))) return;

  if (sudo) {
    if (getHofiEnv("platform") !== "linux") {
      clack.log.warn("Sudo only support in Linux");
      return;
    }

    await spawn({
      cmd: ["sudo", "mv", oldPath, newPath],
      errMsg: `Failed rename file ${oldPath + " -> " + newPath}`,
    });
  } else {
    await fs.rename(oldPath, newPath);
  }
}

// Export all functions
export { getFileInfo, createSymlink, removeSymlink, renameFile };
