import path from "node:path";
import fs from "node:fs/promises";
import * as clack from "@clack/prompts";

import { spawn } from "./spawn";
import { getHofiEnv } from "#/data/env";

async function createSymlink(source: string, target: string, sudo = false) {
  const info = [source, "->", target].join(" ");

  try {
    if (sudo) {
      if (getHofiEnv("platform") !== "linux") {
        clack.log.warn("Sudo only support in Linux");
        return;
      }

      await spawn({
        cmd: ["sudo", "ln", "-s", source, target],
        errMsg: `Failed create symlink ${info}`,
      });
    } else {
      await fs.symlink(source, target);
    }

    clack.log.success(`Succesfully create symlink ${info}`);
  } catch (err) {
    console.error(err);
  }
}

async function removeSymlink(target: string, sudo = false) {
  const info = target;

  try {
    if (sudo) {
      if (getHofiEnv("platform") !== "linux") {
        clack.log.warn("Sudo only support in Linux");
        return;
      }

      await spawn({
        cmd: ["sudo", "rm", target],
        errMsg: `Failed remove symlink ${info}`,
      });
    } else {
      await fs.unlink(target);
    }

    clack.log.success(`Succesfully remove symlink ${info}`);
  } catch (err) {
    console.error(err);
  }
}

export { createSymlink, removeSymlink };
