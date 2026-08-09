import path from "node:path";
import * as clack from "@clack/prompts";
import { deepmerge } from "deepmerge-ts";

import { runScan } from "#/core/detect";
import { setHofiEnv } from "#/data/env";
import { diffConfig } from "#/core/diff";
import { validateCommand } from "./validate";
import { applySymlinks } from "#/core/symlink";
import { setDefaultMetadata } from "#/data/metadata";

export async function switchCommand(configDir: string) {
  const configPath = path.join(configDir, "config.toml");

  // load metadata from existing lock file
  setHofiEnv("configDir", configDir);
  await setDefaultMetadata(configDir);

  clack.intro("Switching configuration");
  clack.log.info("Scanning system environment...");
  await runScan(); // scan system environment

  // parse and validate config
  const parsedConfig = await validateCommand(configPath);
  setHofiEnv("settings", deepmerge(parsedConfig.settings, { backup: true }));

  // diff config and apply config changes
  const diffConfigRes = diffConfig(parsedConfig);
  await applySymlinks(diffConfigRes.symlinks.added);
}
