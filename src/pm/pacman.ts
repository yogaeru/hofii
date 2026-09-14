import { spawn } from "#/utils/spawn";
import { getHofiEnv } from "#/data/env";

const AUR_HELPER = getHofiEnv("helperAur") as string;

export abstract class Pacman {
  static async syncDatabase() {
    await spawn({
      cmd: ["sudo", "pacman", "-Sy"],
      errMsg: "Failed to sync package database pacman",
    });
  }

  static async getInstalledPakcages() {
    const { stdout } = await spawn({
      cmd: ["pacman", "-Qqen"],
      opt: { stdout: "pipe" },
    });
    return stdout;
  }

  static async install(packages: string[]) {
    if (!AUR_HELPER) return;

    const packagesSet = new Set(packages);
    await spawn({
      cmd: [AUR_HELPER, "-S", "--needed", "--noconfirm", ...packagesSet],
      errMsg: "Failed to install packages pacman",
    });
  }

  static async remove(packages: string[]) {
    if (!AUR_HELPER) return;

    const packagesSet = new Set(packages);
    await spawn({
      cmd: [AUR_HELPER, "-R", ...packagesSet],
      errMsg: "Failed to uninstall packages pacman",
    });
  }
}
