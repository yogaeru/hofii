# Hofii

> An orchestration tool for managing dotfiles and packages declaratively on Linux.

![Hofii](https://img.shields.io/badge/hofii-dotfiles-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node.js](https://img.shields.io/badge/runtime-Node.js-green)

---

## Overview

Hofii is a declarative dotfile manager for Linux that helps you:
- **Manage symlinks** for configuration files across your system
- **Install packages** from multiple package managers (pacman, AUR, Flatpak)
- **Detect your environment** automatically (distro, package manager, AUR helper)
- **Track state** with a lock file for reproducible configurations
<!--
## Features

| Feature | Description |
|---------|-------------|
| 🔗 **Symlink Management** | Create, update, and remove symlinks with backup support |
| 📦 **Package Management** | Install packages via pacman, AUR (yay/paru), and Flatpak |
| 🔍 **Environment Detection** | Auto-detects OS, package manager, AUR helper, Flatpak |
| 📋 **Declarative Config** | TOML-based configuration with import support |
| 🔄 **Diff & Apply** | See changes before applying with interactive confirmation |
| 💾 **State Tracking** | Lock file (`~/.config/hofii/hofii-lock.json`) tracks applied config |-->

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+)
- Linux (Arch-based distributions fully supported)

```bash
npm install -g hofii
```
Hofii uses Node.js subprocesses and does not require Bun.

<!--## Quick Start

### 1. Create a Configuration Directory

```bash
mkdir -p ~/.config/hofii
cd ~/.config/hofii
```

### 2. Create `config.toml`

```toml
# ~/.config/hofii/config.toml
[general]
backup = true         # backup existing files before symlinking

# Symlinks: source (relative to config.toml) -> target (absolute path with ~ expansion)
[[symlinks]]
source = "./config/fastfetch"
target = "~/.config/fastfetch"

[[symlinks]]
source = "./config/nvim"
target = "~/.config/nvim"

[[symlinks]]
source = "./config/zed"
target = "~/.config/zed"

# Package-manager settings and packages
[pacman]
aur_helper = "yay"    # or "paru"
packages = ["git", "neovim", "zsh", "btop", "visual-studio-code-bin"]

[flatpak]
scope = "user"
packages = ["com.spotify.Client", "org.telegram.desktop"]
```

### 3. Add Your Dotfiles

```bash
mkdir -p ~/.config/hofii/config
# Copy or link your config directories here
cp -r ~/.config/nvim ~/.config/hofii/config/
cp -r ~/.config/fastfetch ~/.config/hofii/config/
```

### 4. Scan Your System

```bash
hofii scan
# or
hofii s
```

This detects your OS, package manager, AUR helper, and Flatpak availability.

### 5. Validate Configuration

```bash
hofii validate ~/.config/hofii
# or
hofii v ~/.config/hofii
```

Validates your TOML config without applying changes.

### 6. Apply Configuration

```bash
hofii switch ~/.config/hofii
# or
hofii sw ~/.config/hofii
```

Shows a diff of what will change, asks for confirmation, then applies symlinks.-->

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `hofii scan` | `s` | Detect system environment (OS, package manager, AUR helper, Flatpak) |
| `hofii validate [dir]` | `v` | Validate configuration files |
| `hofii switch [dir]` | `sw` | Switch to new configuration (apply symlinks) |

## Configuration Reference

### General settings

```toml
[general]
backup = true         # Backup existing files before creating symlinks
imports = ["home.toml"]
```

### Flatpak settings

Flatpak configuration is opt-in and is applied only when Flatpak is detected.
When enabled without explicit remotes, Hofii ensures Flathub is configured on
the first setup. Remote configuration is stored in metadata after successful
application.

```toml
[flatpak]
enabled = true
scope = "user"        # or "system"
remotes = [
  { name = "flathub", url = "https://flathub.org/repo/flathub.flatpakrepo" },
]
packages = ["com.spotify.Client", "org.telegram.desktop"]
```

### DNF settings

DNF repository settings are applied only on hosts where DNF is detected.
RPM Fusion and Terra are built-in boolean options. COPR entries use the
separate `owner/project` list, while custom repositories use named URL objects.

```toml
[dnf]
packages = ["git", "neovim"]
rpmfusion = true
terra = true
copr = ["owner/project"]
remotes = [
  { name = "custom", url = "https://example.com/custom.repo" },
]
```

### Symlinks

```toml
[[symlinks]]
source = "./config/nvim"    # Relative to config.toml directory
target = "~/.config/nvim"   # Target path (~ expands to $HOME)
sudo = false                # Use sudo for creation (default: false)
```

### Packages

#### Pacman and AUR
```toml
[pacman]
aur_helper = "paru"  # or "yay"
packages = ["git", "neovim", "base-devel", "google-chrome"]
```

#### DNF
```toml
[dnf]
packages = ["git", "neovim"]
rpmfusion = true
terra = false
copr = ["owner/project"]
remotes = [
  { name = "custom", url = "https://example.com/custom.repo" },
]
```

#### Flatpak
```toml
[flatpak]
scope = "user"      # or "system"
packages = ["com.spotify.Client", "org.telegram.desktop"]
```

Package entries are declarative, but `switch` only applies packages for the
package manager detected on the current host. All Flatpak packages inherit the
`user` or `system` scope from `[flatpak]`. Arbitrary post-install hooks are
intentionally not supported.

### Imports (Modular Config)

Split your config across multiple files:

```toml
# config.toml
[general]
imports = ["home.toml", "work.toml"]

[[symlinks]]
source = "./config/shared"
target = "~/.config/shared"
```

```toml
# home.toml
[[symlinks]]
source = "./config/hyprland"
target = "~/.config/hyprland"
```

## Project Structure

```
hofii/
├── src/
│   ├── commands/      # CLI commands (scan, validate, switch)
│   ├── core/
│   │   ├── config/    # Config parsing & validation (schema, parser)
│   │   ├── detect.ts  # Environment detection
│   │   ├── diff.ts    # Config diffing
│   │   └── symlink.ts # Symlink operations
│   ├── data/
│   │   ├── env.ts     # Environment variables
│   │   ├── metadata.ts # Lock file management (~/.config/hofii/)
│   │   └── os.ts      # OS/Package manager detection
│   ├── pm/
│   │   └── pacman.ts  # Pacman package operations
│   ├── types/         # TypeScript types
│   └── utils/         # Utilities (fs, path, spawn)
├── example/           # Example configurations
├── dist/              # Built output
└── index.ts           # Entry point
```

## Lock File

Hofii maintains a lock file at `~/.config/hofii/hofii-lock.json` that tracks:
- Applied symlinks (source, target, sudo)
- Successfully applied package and repository state
- Configuration state

An existing lock file from the legacy `~/.cache/hofii/hofii-lock.json`
location is migrated automatically. Metadata is updated per section: successful
symlink and package operations are recorded independently, so a failed section
does not claim that its requested changes were applied.

This enables:
- Diffing between current and desired state
- Safe removal of symlinks no longer in config
- Reproducible deployments

## Example Configuration

See the `example/` directory for a complete working configuration:

```
example/
├── config.toml          # Main config with symlinks
├── home.toml            # Additional config (imported)
├── config/
│   ├── fastfetch/
│   ├── btop/
│   └── ...
└── .state/              # Example lock file
```

## Supported Distributions

| Distribution | Package Manager | Status |
|--------------|-----------------|--------|
| Arch Linux | pacman | ✅ Full support |
| EndeavourOS | pacman | ✅ Full support |
| Manjaro | pacman | ✅ Full support |
| Garuda | pacman | ✅ Full support |
| CachyOS | pacman | ✅ Full support |
| Fedora | dnf | ✅ Supported |
| Nobara | dnf | ✅ Supported |

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Note:** Hofii is in early development. Use with caution and always review the diff before applying changes.