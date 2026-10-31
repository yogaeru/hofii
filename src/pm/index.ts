import { DNF } from "./dnf";
import { Flatpak } from "./flatpak";
import { Pacman } from "./pacman";

export type PackageManager = typeof Pacman | typeof DNF | typeof Flatpak;

export const PackageManagers = {
  pacman: Pacman,
  dnf: DNF,
  flatpak: Flatpak,
};
