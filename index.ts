#!/usr/bin/env node

import cac from "cac";
import path from "node:path";
import * as v from "valibot";

import { scanCommand } from "#/commands/scan";
import { validateCommand } from "#/commands/validate";
import { switchCommand } from "#/commands/switch";
import { setDefaultMetadata, writeMetadata } from "#/data/metadata";

const HofiiCli = cac("hofii");
HofiiCli.version("0.0.3");

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
  await setDefaultMetadata();

  if (process.argv.slice(2).length === 0) {
    HofiiCli.outputHelp();
    process.exitCode = 0;
  } else {
    HofiiCli.help().parse(process.argv, { run: false });
    await HofiiCli.runMatchedCommand();
  }
} catch (error) {
  if (error instanceof v.ValiError) {
    const erroMsg = error.issues
      .map((issue) => {
        const path = issue.path.at(-1)?.input;

        return [`✗ ${issue.message}`, `  at: ${JSON.stringify(path)}`].join(
          "\n",
        );
      })
      .join("\n\n");
    console.error(erroMsg);
  } else if (error instanceof Error) {
    console.log(error.message);
  } else {
    console.error(error);
  }
} finally {
  await writeMetadata();
}
