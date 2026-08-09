import type { ConfigSettings } from "#/core/config/schema";

interface HofiEnv {
  osId?: string;
  osName?: string;
  platform?: string;
  packageManager?: string;

  flatpak: boolean;
  isFlatpak: boolean;
  helperAur: "paru" | "yay" | null;

  settings?: ConfigSettings;
  configDir?: string;
}

// The Hofi environment object with default values
const env: HofiEnv = {
  osName: undefined,
  osId: undefined,
  platform: "linux",
  packageManager: undefined,
  helperAur: null,
  isFlatpak: false,
  flatpak: false,
};

/* Get a value from the Hofi environment by key */
export function getHofiEnv<K extends keyof HofiEnv>(key: K): HofiEnv[K] {
  return env[key];
}

/* Get the entire Hofi environment object */
export function getHofiEnvObject(): HofiEnv {
  return env;
}

/* Set a value in the Hofi environment by key */
export function setHofiEnv<K extends keyof HofiEnv>(
  key: K,
  value: HofiEnv[K],
): void {
  env[key] = value;
}
