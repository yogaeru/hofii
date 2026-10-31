import { spawn } from "#/utils/spawn";

export abstract class DNF {
  static async syncDatabase() {
    await spawn({
      cmd: ["sudo", "dnf", "makecache"],
      errMsg: "Failed to sync package database dnf",
    });
  }
  static async getInstalledPakcages() {
    const { stdout } = await spawn({
      cmd: ["dnf", "repoquery", "--userinstalled", "--qf", "%{name}\n"],
      opt: { stdout: "pipe" },
    });
    return stdout;
  }

  static async install(packages: string[], _scope?: "user" | "system") {
    if (packages.length <= 0) return;

    await spawn({
      cmd: ["sudo", "dnf", "install", "-y", "-q", ...new Set(packages)],
      errMsg: "Failed to install packages dnf",
    });
  }

  static async remove(packages: string[], _scope?: "user" | "system") {
    if (packages.length <= 0) return;

    await spawn({
      cmd: ["sudo", "dnf", "remove", ...new Set(packages)],
      errMsg: "Failed to remove packages dnf",
    });
  }
}
