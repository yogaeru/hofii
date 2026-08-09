import fs from "node:fs/promises";
import * as clack from "@clack/prompts";
import { deepmerge } from "deepmerge-ts";

import { getHofiEnv } from "#/data/env";
import { createSymlink } from "#/utils/fs";
import type { ConfigSymlinks } from "./config/schema";
import { getMetadata, getMetadataKey, setMetadata } from "#/data/metadata";

export async function applySymlinks(symlinks: ConfigSymlinks) {
  if (!symlinks || symlinks.length === 0) return;
  const isBackup = getHofiEnv("settings")?.backup ?? "";

  const appliedSymlinks: ConfigSymlinks = [];

  await Promise.all(
    symlinks.map(async (link) => {
      try {
        const info = await fs.lstat(link.target);

        if (info.isSymbolicLink()) {
          await fs.unlink(link.target);
        } else if (isBackup) {
          await fs.rename(link.target, link.target + ".bak");
        } else {
          clack.log.warn(`Target already exists, skipping: ${link.target}`);
          return;
        }

        await createSymlink(link.source, link.target, link.sudo);
        // clack.log.success(`Succesfully create symlink ${link.source} -> ${link.target}`);
        appliedSymlinks.push(link);
      } catch (err) {
        console.error(err);
      }
    }),
  );

  const existingConfig = getMetadataKey("config") ?? {};
  setMetadata(
    "config",
    deepmerge(existingConfig, { symlinks: appliedSymlinks }),
  );
  // console.log(getMetadata())
}
