import * as v from "valibot";

// Settings schema for the configuration file.
const Settings = v.partial(
  v.object({
    flatpak: v.boolean(),
    backup: v.boolean(),
    aur_helper: v.picklist(["yay", "paru"]),
  }),
);

// Symlink schema for the configuration file.
const SymlinkObject = v.object({
  source: v.string(),
  target: v.string(),
  sudo: v.optional(v.boolean()),
});

// Packages related schema for the configuration file.
const PackageManager = v.picklist(["aur", "pacman"]);
const PostHooks = v.union([
  v.string(),
  v.array(v.string()),
  v.array(v.array(v.string())),
]);

const PackageWithHooks = v.object({
  name: v.string(),
  post_hooks: v.optional(PostHooks),
});
const PackageItems = v.array(v.union([v.string(), PackageWithHooks]));

// Package object schema for the configuration file.
const PackageObject = v.object({
  manager: PackageManager,
  items: PackageItems,
});

const FlatpakPackage = v.object({
  manager: v.literal("flatpak"),
  scope: v.picklist(["system", "user"]),
  items: PackageItems,
});

// Merged schema for the configuration file.
export const ConfigSchema = v.partial(
  v.object({
    imports: v.array(v.string()),
    settings: Settings,
    packages: v.array(v.union([FlatpakPackage, PackageObject])),
    symlinks: v.array(SymlinkObject),
  }),
);

export type TypeConfigSchema = v.InferOutput<typeof ConfigSchema>;
export type ConfigSymlinks = TypeConfigSchema["symlinks"];
export type ConfigSettings = TypeConfigSchema["settings"];
