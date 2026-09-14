import path from "node:path";
import * as clack from "@clack/prompts";
import { deepmerge } from "deepmerge-ts";

import { runScan } from "#/core/detect";
import { setHofiEnv } from "#/data/env";
import { validateCommand } from "./validate";
import { applySymlinks } from "#/core/symlink";
import { setDefaultMetadata } from "#/data/metadata";
import { diffConfig, buildDiffString } from "#/core/diff";
import { installPackages } from "#/core/package";


/**
 * Command to switch config into a new config
 */
export async function switchCommand(configDir: string) {
  const configPath = path.join(configDir, "config.toml");

  // load metadata from existing lock file
  setHofiEnv("configDir", configDir);
  await setDefaultMetadata();

  clack.intro("Switching configuration");
  clack.log.info("Scanning system environment...");
  await runScan(); // scan system environment

  // parse and validate config
  const parsedConfig = await validateCommand(configPath);
  if (!parsedConfig) {
    process.exit(1);
  }

  setHofiEnv("settings", deepmerge(parsedConfig.settings, { backup: true }));

  // diff config and apply config changes
  const diffConfigRes = diffConfig(parsedConfig);
  const diffString = buildDiffString(diffConfigRes);
  // clack.note(JSON.stringify(diffConfigRes, null, 2));
  clack.note(diffString, "Config To Apply");

  const isApplyConfig = await clack.confirm({
    message: "Apply config changes? (Please review the changes first!!)",
  });

  if (!isApplyConfig || clack.isCancel(isApplyConfig)) {
    clack.log.warn("Config changes not applied.");
    process.exit(0);
  }

  await applySymlinks(diffConfigRes.symlinks);
  await installPackages(diffConfigRes.packages)
}
