import { PACKAGES_MANAGER, type MetadataPackages } from "#/core/package";
import type { SymlinkObject, PackageItems } from "#/core/config/schema";

export type DiffPkgs = {
  [key in (typeof PACKAGES_MANAGER)[number]]: PackageItems;
};

export interface DiffSymlinksResponse {
  added: SymlinkObject[];
  removed: SymlinkObject[];
}

export interface DiffPackagesResponse {
  added: MetadataPackages;
  removed: MetadataPackages;
}

export interface DiffConfigResponse {
  symlinks: DiffSymlinksResponse;
  packages: DiffPackagesResponse;
}
