import fs from "node:fs/promises";
import * as clack from "@clack/prompts";

import { spawn } from "./spawn";
import { getHofiEnv } from "#/data/env";
import type { Stats } from "node:fs";

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

export { getFileInfo, createSymlink, removeSymlink };
