import * as v from "valibot";
import * as clack from "@clack/prompts";
import { expandPath } from "#/utils/path";
import { ConfigSchema } from "#/core/config/schema";
import { parseConfigTOML } from "#/core/config/parser";

export async function validateCommand(path: string) {
  const absPath = expandPath(path);

  clack.log.step("Validating Configuration");
  const spinner = clack.spinner();
  spinner.start("Validating...");

  const config = await parseConfigTOML(absPath);
  const validatedConfig = v.parse(ConfigSchema, config);
  spinner.stop("Successfully validated with no errors!");

  return validatedConfig;
}
