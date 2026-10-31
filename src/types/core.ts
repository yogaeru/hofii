import { PACKAGES_MANAGER, type MetadataPackages } from "#/core/package";
import type {
  SymlinkObject,
  PackageItems,
  FlatpakRemote,
  DnfRemote,
} from "#/core/config/schema";

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

export interface DiffRepositoriesResponse {
  flatpak: {
    added: FlatpakRemote[];
    removed: FlatpakRemote[];
  };
  dnf: {
    added: DnfRepository[];
    removed: DnfRepository[];
  };
}

export type DnfRepository = Omit<DnfRemote, "url"> & {
  url?: string;
  kind: "rpmfusion" | "terra" | "copr" | "remote";
};

export interface DiffConfigResponse {
  symlinks: DiffSymlinksResponse;
  packages: DiffPackagesResponse;
  repositories: DiffRepositoriesResponse;
}
