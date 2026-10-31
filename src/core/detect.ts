import fs from "node:fs/promises";
import { execa } from "execa";
import { getPackageManager } from "../data/os";
import { setHofiEnv, getHofiEnvObject } from "#/data/env";

type AurHelper = "yay" | "paru" | null;

/**
 * Check is command exist
 */
async function commandExist(command: string): Promise<boolean> {
  try {
    await execa("which", [command]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Getting information for installed AUR helper
 */
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

/**
 * Get OS Name information
 */
async function getOSName(): Promise<{ id?: string; name?: string }> {
  if (process.platform === "linux") {
    const release = await fs.readFile("/etc/os-release", "utf8");
    const values = Object.fromEntries(
      release
        .split("\n")
        .map((line) => line.match(/^([A-Z_]+)=(.*)$/))
        .filter((match): match is RegExpMatchArray => match !== null)
        .map(([, key, value]) => [key, value!.replace(/^"|"$/g, "")]),
    );

    return {
      id: values.ID,
      name: values.NAME,
    };
  }

  return {
    id: "unknown",
    name: "unknown",
  };
}


/**
 * Enttry point to scan entire system
 */
async function runScan() {
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

export {
  commandExist,
  getAurHelper,
  getOSName,
  runScan
 };
