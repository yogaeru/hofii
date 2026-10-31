import * as clack from "@clack/prompts";

import type {
  ConfigDnf,
  ConfigFlatpak,
  FlatpakRemote,
} from "./config/schema";
import type { DnfRepository, DiffRepositoriesResponse } from "#/types/core";
import { getHofiEnv } from "#/data/env";
import { getMetadata, setMetadata } from "#/data/metadata";
import { spawn } from "#/utils/spawn";

const FLATHUB: FlatpakRemote = {
  name: "flathub",
  url: "https://flathub.org/repo/flathub.flatpakrepo",
};

function flatpakScopeArgs(scope: "user" | "system" | undefined) {
  return scope === "user" ? ["--user"] : [];
}

async function getFlatpakRemotes(scope: "user" | "system" | undefined) {
  const { stdout } = await spawn({
    cmd: ["flatpak", ...flatpakScopeArgs(scope), "remotes", "--columns=name"],
    opt: { stdout: "pipe" },
  });
  return new Set((stdout ?? "").split(/\r?\n/).map((name) => name.trim()).filter(Boolean));
}

async function applyFlatpakRemote(remote: FlatpakRemote, scope: "user" | "system" | undefined) {
  await spawn({
    cmd: [
      "flatpak",
      ...flatpakScopeArgs(scope),
      "remote-add",
      "--if-not-exists",
      remote.name,
      remote.url,
    ],
    errMsg: `Failed to add Flatpak remote ${remote.name}`,
  });
}

async function removeFlatpakRemote(
  remote: FlatpakRemote,
  scope: "user" | "system" | undefined,
) {
  await spawn({
    cmd: [
      "flatpak",
      ...flatpakScopeArgs(scope),
      "remote-delete",
      remote.name,
    ],
    errMsg: `Failed to remove Flatpak remote ${remote.name}`,
  });
}

async function applyFlatpak(
  diff: DiffRepositoriesResponse["flatpak"],
  config: ConfigFlatpak | undefined,
) {
  if (!getHofiEnv("flatpak")) return false;
  const previous = getMetadata().flatpak;
  const scope = config?.scope ?? previous?.scope ?? "system";
  const configured = config?.enabled
    ? config.remotes?.length
      ? config.remotes
      : [FLATHUB]
    : [];
  const installed = await getFlatpakRemotes(scope);
  const applied = [...(previous?.remotes ?? [])];

  for (const remote of configured) {
    if (installed.has(remote.name)) {
      if (!applied.some((item) => item.name === remote.name)) applied.push(remote);
      continue;
    }
    if (!(diff.added ?? []).some((item) => item.name === remote.name)) continue;
    try {
      await applyFlatpakRemote(remote, scope);
      applied.push(remote);
      clack.log.success(`Added Flatpak remote ${remote.name}`);
    } catch (error) {
      clack.log.error(error instanceof Error ? error.message : String(error));
    }
  }

  for (const remote of diff.removed ?? []) {
    try {
      await removeFlatpakRemote(remote, previous?.scope ?? scope);
      const index = applied.findIndex((item) => item.name === remote.name);
      if (index >= 0) applied.splice(index, 1);
      clack.log.success(`Removed Flatpak remote ${remote.name}`);
    } catch (error) {
      clack.log.error(error instanceof Error ? error.message : String(error));
    }
  }

  if (applied.length === 0 && !previous?.remotes?.length) return false;
  setMetadata("flatpak", {
    ...(config ?? {}),
    enabled: Boolean(config?.enabled) || applied.length > 0,
    scope,
    remotes: applied,
  });
  return applied.length > 0 || (previous?.remotes?.length ?? 0) > 0;
}

async function rpmRelease() {
  const { stdout } = await spawn({
    cmd: ["rpm", "-E", "%fedora"],
    opt: { stdout: "pipe" },
  });
  const release =   (stdout ?? "").trim();
  if (!/^\d+$/.test(release)) throw new Error("Unable to determine Fedora release");
  return release;
}

async function applyDnfRepo(repo: DnfRepository) {
  if (repo.kind === "rpmfusion") {
    const release = await rpmRelease();
    await spawn({
      cmd: [
        "sudo",
        "dnf",
        "install",
        "-y",
        `https://mirrors.rpmfusion.org/free/fedora/rpmfusion-free-release-${release}.noarch.rpm`,
        `https://mirrors.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-${release}.noarch.rpm`,
      ],
      errMsg: "Failed to enable RPM Fusion",
    });
    return;
  }
  if (repo.kind === "terra") {
    const release = await rpmRelease();
    await spawn({
      cmd: [
        "sudo",
        "dnf",
        "install",
        "-y",
        `https://github.com/terrapkg/terra/releases/download/10/terra-release-${release}.noarch.rpm`,
      ],
      errMsg: "Failed to enable Terra",
    });
    return;
  }
  if (repo.kind === "copr") {
    const copr = repo.name.slice("copr:".length);
    if (!/^[^/ \t\n]+\/[^/ \t\n]+$/.test(copr)) {
      throw new Error(`Invalid COPR repository: ${copr}`);
    }
    await spawn({
      cmd: ["sudo", "dnf", "copr", "enable", "-y", copr],
      errMsg: `Failed to enable COPR ${copr}`,
    });
    return;
  }
  if (!repo.url) {
    throw new Error(`DNF remote ${repo.name} requires a URL`);
  }
  await spawn({
    cmd: ["sudo", "dnf", "config-manager", "--add-repo", repo.url],
    errMsg: `Failed to enable DNF repository ${repo.name}`,
  });
}

async function applyDnf(
  diff: DiffRepositoriesResponse["dnf"],
  config: ConfigDnf | undefined,
) {
  if (!config || getHofiEnv("packageManager") !== "dnf") return false;
  const previous = getMetadata().dnf;
  const applied = new Map<string, DnfRepository>();
  if (previous?.rpmfusion) {
    applied.set("rpmfusion", { name: "rpmfusion", kind: "rpmfusion" });
  }
  if (previous?.terra) {
    applied.set("terra", { name: "terra", kind: "terra" });
  }
  for (const copr of previous?.copr ?? []) {
    applied.set(`copr:${copr}`, {
      name: `copr:${copr}`,
      kind: "copr",
    });
  }
  for (const remote of previous?.remotes ?? []) {
    applied.set(remote.name, { ...remote, kind: "remote" });
  }

  for (const repo of diff.added) {
    try {
      await applyDnfRepo(repo);
      applied.set(repo.name, repo);
      clack.log.success(`Enabled DNF repository ${repo.name}`);
    } catch (error) {
      clack.log.error(error instanceof Error ? error.message : String(error));
    }
  }
  for (const repo of diff.removed) {
    applied.delete(repo.name);
  }

  const next: ConfigDnf = {
    rpmfusion: applied.has("rpmfusion"),
    terra: applied.has("terra"),
    copr: [...applied.values()]
      .filter((repo) => repo.kind === "copr")
      .map((repo) => repo.name.slice("copr:".length)),
    remotes: [...applied.values()]
      .filter(
        (repo): repo is DnfRepository & { kind: "remote"; url: string } =>
          repo.kind === "remote" && Boolean(repo.url),
      )
      .map(({ name, url }) => ({ name, url })),
  };
  setMetadata("dnf", next);
  return diff.added.length > 0;
}

export async function applyRepositories(
  repositories: DiffRepositoriesResponse,
  config: { flatpak?: ConfigFlatpak; dnf?: ConfigDnf },
) {
  if ((repositories.flatpak.added ?? []).length || (repositories.flatpak.removed ?? []).length) {
    if (!getHofiEnv("flatpak")) {
      clack.log.warn("Skipping Flatpak repositories: Flatpak is not available on this host");
    } else {
      await applyFlatpak(repositories.flatpak, config.flatpak);
    }
  }
  if (repositories.dnf.added.length || repositories.dnf.removed.length) {
    if (getHofiEnv("packageManager") !== "dnf") {
      clack.log.warn("Skipping DNF repositories: DNF is not available on this host");
    } else {
      await applyDnf(repositories.dnf, config.dnf);
    }
  }
}
