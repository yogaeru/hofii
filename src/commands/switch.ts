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

  const symlinksLine = () => {
    const line = ["SYMLINKS"];
    const config = diffConfigRes.symlinks;
    const { added = [], removed = [] } = config;
    if (added?.length === 0 && removed?.length === 0) {
      line.push("  - No changes to apply with symlinks");
      return line.join("\n");
    }

    for (const item of added) {
      line.push(
        `  - [ADDED] ${item.sudo ? "(sudo) " : ""}${item.source} -> ${item.target}`,
      );
    }
    for (const item of removed) {
      line.push(
        `  - [REMOVED] ${item.sudo ? "(sudo) " : ""}${item.source} -> ${item.target}`,
      );
    }
    return line.join("\n");
  };

  clack.note(symlinksLine(), "Config To Apply");

  const isApplyConfig = await clack.confirm({
    message: "Apply config changes? (Please review the changes first!!)",
  });
  if (!isApplyConfig || clack.isCancel(isApplyConfig)) {
    clack.log.warn("Config changes not applied.");
    process.exit(0);
  }

  await applySymlinks(diffConfigRes.symlinks);
}
