import { spawn } from "#/utils/spawn";

type FlatpakScope = "user" | "system";

export abstract class Flatpak {
  static async syncDatabase() {
    await spawn({
      cmd: ["flatpak", "update", "--appstream"],
      errMsg: "Failed to sync package database flatpak",
    });
  }
  static async getInstalledPakcages() {
    const { stdout } = await spawn({
      cmd: ["flatpak", "list", "--app", "--columns=name"],
      opt: { stdout: "pipe" },
    });
    return stdout;
  }
  static async install(packages: string[], scope: FlatpakScope = "system") {
    if (packages.length <= 0) return;

    if (scope === "user") {
      await spawn({
        cmd: ["flatpak", "install", "--user", "-y", ...new Set(packages)],
        errMsg: "Failed to install packages flatpak",
      });
    } else {
      await spawn({
        cmd: ["sudo", "flatpak", "install", "-y", ...new Set(packages)],
        errMsg: "Failed to install packages flatpak",
      });
    }
  }
  static async remove(packages: string[], scope: FlatpakScope = "system") {
    if (packages.length <= 0) return;

    if (scope === "user") {
      await spawn({
        cmd: ["flatpak", "uninstall", "--user", "-y", ...new Set(packages)],
        errMsg: "Failed to remove packages flatpak",
      });
    } else {
      await spawn({
        cmd: ["sudo", "flatpak", "uninstall", "-y", ...new Set(packages)],
        errMsg: "Failed to remove packages flatpak",
      });
    }
  }
}
