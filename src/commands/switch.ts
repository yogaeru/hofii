import path from "node:path";
import * as clack from "@clack/prompts";
import { deepmerge } from "deepmerge-ts";

import { runScan } from "#/core/detect";
import { setHofiEnv } from "#/data/env";
import { validateCommand } from "./validate";
import { applySymlinks } from "#/core/symlink";
import { setMetadata } from "#/data/metadata";
import { diffConfig, buildDiffString } from "#/core/diff";
import { installPackages } from "#/core/package";
import { applyRepositories } from "#/core/repository";

/**
 * Command to switch config into a new config
 */
export async function switchCommand(configDir: string) {
  const configPath = path.join(configDir, "config.toml");

  setHofiEnv("configDir", configDir);

  clack.intro("Switching configuration");
  clack.log.info("Scanning system environment...");
  await runScan(); // scan system environment

  // parse and validate config
  const parsedConfig = await validateCommand(configPath);
  if (!parsedConfig) {
    process.exitCode = 1;
    return;
  }

  setHofiEnv("general", deepmerge(parsedConfig.general, { backup: true }));
  if (parsedConfig.pacman?.aur_helper) {
    setHofiEnv("helperAur", parsedConfig.pacman.aur_helper);
  }

  // diff config and apply config changes
  const diffConfigRes = diffConfig(parsedConfig);
  const diffString = buildDiffString(diffConfigRes);

  // Print the diff string to the console for review
  // clack.note(JSON.stringify(parsedConfig, null, 2), "Parsed Config Response");
  // clack.note(JSON.stringify(diffConfigRes, null, 2));

  clack.note(diffString, "Config To Apply");

  const isApplyConfig = await clack.confirm({
    message: "Apply config changes? (Please review the changes first!!)",
  });

  if (!isApplyConfig || clack.isCancel(isApplyConfig)) {
    clack.log.warn("Config changes not applied.");
    return;
  }

  await applySymlinks(diffConfigRes.symlinks);
  await applyRepositories(diffConfigRes.repositories, parsedConfig);
  await installPackages(diffConfigRes.packages);
  setMetadata("general", parsedConfig.general);
}
