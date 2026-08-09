export const OS_LIST: Record<string, string[]> = {
  pacman: [
    "arch",
    "endeavouros",
    "manjaro",
    "garuda",
    "cachyos",
    "arcolinux",
    "rebornos",
    "blendos",
    "steamos",
    "chimeraos",
  ],

  dnf: ["fedora", "nobara", "bazzite", "ultramarine"],
};

// Enter a os name and get name of the distro
export const getPackageManager = (os: string): string | null => {
  for (const [key, value] of Object.entries(OS_LIST)) {
    if (value.includes(os)) {
      return key;
    }
  }
  return null;
};
