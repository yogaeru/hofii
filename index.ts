#!/usr/bin/env bun

import cac from "cac";
import path from "node:path";
import * as v from "valibot";
import { scanCommand } from "#/commands/scan";
import { validateCommand } from "#/commands/validate";
import { switchCommand } from "#/commands/switch";

import { writeMetadata } from "#/data/metadata";

const HofiiCli = cac("hofii");
HofiiCli.version("0.0.1");

HofiiCli.command("scan", "Detect system environment")
  .alias("s")
  .action(async () => {
    await scanCommand();
  });

HofiiCli.command("validate [dir]", "Validate configuration files")
  .alias("v")
  .action(async (dir) => {
    await validateCommand(dir);
  });

HofiiCli.command("switch [dir]", "Switch to new configuration")
  .alias("sw")
  .action(async (dir) => {
    const resolvedDir = path.resolve(dir);
    await switchCommand(resolvedDir);
  });

try {
  HofiiCli.help().parse(process.argv, { run: false });
  await HofiiCli.runMatchedCommand();
} catch (error) {
  if (error instanceof v.ValiError) {
    const erroMsg = error.issues
      .map((issue) => {
        const path = issue.path.at(-1)?.input;

        return [
          `✗ ${issue.message}`,
          `  at: ${JSON.stringify(path)}`
        ].join("\n");
      })
      .join("\n\n");
    console.error(erroMsg);
  }
  process.exit(1);
} finally {
  await writeMetadata();
}
