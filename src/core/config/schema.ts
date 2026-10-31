import * as v from "valibot";

const General = v.partial(
  v.object({
    backup: v.boolean(),
    imports: v.array(v.string()),
  }),
);

const FlatpakRemote = v.object({
  name: v.pipe(v.string(), v.regex(/^[A-Za-z0-9._-]+$/)),
  url: v.pipe(v.string(), v.regex(/^https?:\/\/\S+$/)),
});

const Flatpak = v.partial(
  v.object({
    enabled: v.boolean(),
    scope: v.picklist(["user", "system"]),
    remotes: v.array(FlatpakRemote),
    packages: v.array(v.string()),
  }),
);

const DnfRemote = v.object({
  name: v.pipe(v.string(), v.regex(/^[A-Za-z0-9._-]+$/)),
  url: v.pipe(v.string(), v.regex(/^https?:\/\/\S+$/)),
});

const Dnf = v.partial(
  v.object({
    packages: v.array(v.string()),
    rpmfusion: v.boolean(),
    terra: v.boolean(),
    copr: v.array(v.pipe(v.string(), v.regex(/^[^/ \t\n]+\/[^/ \t\n]+$/))),
    remotes: v.array(DnfRemote),
  }),
);

const Pacman = v.partial(
  v.object({
    aur_helper: v.picklist(["yay", "paru"]),
    packages: v.array(v.string()),
  }),
);

const SymlinkObject = v.object({
  source: v.string(),
  target: v.string(),
  sudo: v.optional(v.boolean()),
});

export const ConfigSchema = v.partial(
  v.strictObject({
    general: General,
    pacman: Pacman,
    flatpak: Flatpak,
    dnf: Dnf,
    symlinks: v.array(SymlinkObject),
  }),
);

export type ConfigSchema = v.InferOutput<typeof ConfigSchema>;
export type ConfigGeneral = ConfigSchema["general"];
export type ConfigPacman = ConfigSchema["pacman"];
export type ConfigFlatpak = ConfigSchema["flatpak"];
export type ConfigDnf = ConfigSchema["dnf"];
export type FlatpakRemote = v.InferOutput<typeof FlatpakRemote>;
export type DnfRemote = v.InferOutput<typeof DnfRemote>;

export type ConfigSymlinks = ConfigSchema["symlinks"];
export type SymlinkObject = v.InferOutput<typeof SymlinkObject>;
export type PackageItems = string[];