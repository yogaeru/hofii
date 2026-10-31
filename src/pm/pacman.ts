import { spawn } from "#/utils/spawn";
import { getHofiEnv } from "#/data/env";

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

  static async install(packages: string[], _scope?: "user" | "system") {
    const aurHelper = getHofiEnv("helperAur");
    if (!aurHelper) return;

    const packagesSet = new Set(packages);
    await spawn({
      cmd: [aurHelper, "-S", "--needed", "--noconfirm", ...packagesSet],
      errMsg: "Failed to install packages pacman",
    });
  }

  static async remove(packages: string[], _scope?: "user" | "system") {
    const aurHelper = getHofiEnv("helperAur");
    if (!aurHelper) return;

    const packagesSet = new Set(packages);
    await spawn({
      cmd: [aurHelper, "-R", ...packagesSet],
      errMsg: "Failed to uninstall packages pacman",
    });
  }
}
