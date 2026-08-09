import { $ } from "bun";
import { getPackageManager } from "../data/os";
import { setHofiEnv, getHofiEnvObject } from "#/data/env";

type AurHelper = "yay" | "paru" | null;

async function commandExist(command: string): Promise<boolean> {
  try {
    await $`which ${command}`.quiet();
    return true;
  } catch {
    return false;
  }
}

async function getAurHelper(): Promise<AurHelper[]> {
  const helpers: AurHelper[] = [];
  if (await commandExist("yay")) {
    helpers.push("yay");
  }
  if (await commandExist("paru")) {
    helpers.push("paru");
  }
  return helpers;
}

export async function getOSName(): Promise<{ id?: string; name?: string }> {
  if (process.platform === "linux") {
    const distroName =
      (await $`cat /etc/os-release | grep ^NAME`.quiet().text()) || "";
    const distroId =
      (await $`cat /etc/os-release | grep ^ID`.quiet().text()) || "";
    const name = distroName.trim().slice(5).replace(/"/g, "");
    const id = distroId.trim().slice(3).replace(/"/g, "");

    return {
      id,
      name,
    };
  }

  return {
    id: "unknown",
    name: "unknown",
  };
}

export async function runScan() {
  const { name = "", id = "" } = await getOSName();
  const packageManager = getPackageManager(id);
  const aurHelper = packageManager === "pacman" ? await getAurHelper() : null;
  const flatpak = await commandExist("flatpak");

  setHofiEnv("osName", name);
  setHofiEnv("osId", id);
  setHofiEnv("flatpak", flatpak);
  if (aurHelper) setHofiEnv("helperAur", aurHelper[0]!);
  if (packageManager) setHofiEnv("packageManager", packageManager);

  return {
    osName: name,
    osId: id,
    packageManager,
    aurHelper,
    flatpak,
  };
}

export { commandExist, getAurHelper };
