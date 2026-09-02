import path from "node:path";
import * as v from "valibot";
import * as clack from "@clack/prompts";
import { deepmerge } from "deepmerge-ts";
import { ConfigSchema } from "./schema";
import { expandPath } from "#/utils/path";
import type { TypeConfigSchema, ConfigSymlinks } from "./schema";

/**
 * Parses a TOML configuration file and recursively merges included configs.
 *
 * @param filePath The path to the TOML file.
 * @param visitedPaths A set of visited file paths to detect circular dependencies.
 * @returns The parsed and merged configuration object.
 * @throws Error if a circular dependency is detected.
 */
export async function parseConfigTOML(
  filePath: string,
  visitedPaths = new Set<string>(),
): Promise<any> {
  const absoluteFilePath = path.resolve(filePath);
  // console.log("Absolute Path: ", absoluteFilePath);
  if (visitedPaths.has(absoluteFilePath)) {
    throw new Error(`Circular dependency detected: ${absoluteFilePath}`);
  }

  visitedPaths.add(absoluteFilePath);
  const content = await Bun.file(absoluteFilePath).text();
  const toml = Bun.TOML.parse(content) as TypeConfigSchema;
  let parsedConfig;

  try {
    parsedConfig = v.parse(ConfigSchema, toml);
  } catch (error) {
    if (error instanceof v.ValiError) {
      clack.log.error(error.issues[0].message);
    }
    process.exit(1);
  }

  const { imports: importedSources = [], symlinks: symlinkConfig = [] } =
    parsedConfig;
  delete parsedConfig.imports;

  const parentAbsouleDir = path.dirname(absoluteFilePath);
  parsedConfig.symlinks = expandSymlinkPath(parentAbsouleDir, symlinkConfig);

  let mergedParentConfigs = {};

  for (const source of importedSources) {
    const absoluteChildPath = path.resolve(parentAbsouleDir, source);
    const parsedChildConfig = await parseConfigTOML(
      absoluteChildPath,
      visitedPaths,
    );
    mergedParentConfigs = deepmerge(mergedParentConfigs, parsedChildConfig);
  }

  return deepmerge(parsedConfig, mergedParentConfigs);
}

function expandSymlinkPath(
  filePath: string,
  config: ConfigSymlinks | undefined,
): ConfigSymlinks {
  if (!config || config.length === 0) return [];

  const result: ConfigSymlinks = [];

  for (const symlink of config) {
    if (!symlink) continue;
    const { source, target } = symlink;
    const expandSourcePath = path.resolve(filePath, source);
    const expandTargetPath = expandPath(target);
    result.push({
      source: expandSourcePath,
      target: expandTargetPath,
    });
  }
  return result;
}
