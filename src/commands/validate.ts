import * as v from "valibot";
import fs from "node:fs/promises";
import pathModule from "node:path";
import * as clack from "@clack/prompts";
import { expandPath } from "#/utils/path";
import { ConfigSchema } from "#/core/config/schema";
import { parseConfigTOML } from "#/core/config/parser";

export async function validateCommand(path: string) {
  let validatedConfig: ConfigSchema;
  const expandedPath = expandPath(path);
  const absPath = (await fs.stat(expandedPath)).isDirectory()
    ? pathModule.join(expandedPath, "config.toml")
    : expandedPath;

  clack.log.step("Validating Configuration");
  const spinner = clack.spinner();
  spinner.start("Validating...");

  try {
    const config = await parseConfigTOML(absPath);
    validatedConfig = v.parse(ConfigSchema, config);
    // clack.note(JSON.stringify(validatedConfig, null, 2));
  } catch (e) {
    clack.log.error(e instanceof Error ? e.message : String(e));
    spinner.stop("Validation failed");
    return;
  }

  spinner.stop("Successfully validated with no errors!");
  return validatedConfig;
}
