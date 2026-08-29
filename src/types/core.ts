import type { SymlinkObject } from "#/core/config/schema";

export interface DiffSymlinksResponse {
  added: SymlinkObject[];
  removed: SymlinkObject[];
}

export interface DiffConfigResponse {
  symlinks: DiffSymlinksResponse;
}
