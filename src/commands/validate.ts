import * as v from "valibot";
import * as clack from "@clack/prompts";
import { expandPath } from "#/utils/path";
import { ConfigSchema } from "#/core/config/schema";
import { parseConfigTOML } from "#/core/config/parser";

export async function validateCommand(path: string) {
  const absPath = expandPath(path);

  clack.intro("Validating Configuration");
  const spinner = clack.spinner();
  spinner.start("Validating...");

  const config = await parseConfigTOML(absPath);
  const validatedConfig = v.parse(ConfigSchema, config);
  // clack.note(JSON.stringify(validatedConfig, null, 2), "Config");

  spinner.stop("");
  clack.outro("Validated successfully with no errors !!");

  return validatedConfig;
}
