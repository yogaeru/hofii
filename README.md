# Hofii

> An orchestration tool for managing dotfiles and packages declaratively on Linux.

![Hofii](https://img.shields.io/badge/hofii-dotfiles-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Bun](https://img.shields.io/badge/runtime-bun-orange)

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
| 💾 **State Tracking** | Lock file (`~/.cache/hofii/hofii-lock.json`) tracks applied config |-->

## Installation

### Prerequisites
- [Bun](https://bun.sh/) (v1.0+)
- Linux (Arch-based distributions fully supported)

```bash
bun add -g hofii
```
Only support with bun 

<!--## Quick Start

### 1. Create a Configuration Directory

```bash
mkdir -p ~/.config/hofii
cd ~/.config/hofii
```

### 2. Create `config.toml`

```toml
# ~/.config/hofii/config.toml
[settings]
aur_helper = "yay"    # or "paru"
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

# Packages to install
[[packages]]
manager = "pacman"
items = ["git", "neovim", "zsh", "btop"]

[[packages]]
manager = "aur"
items = ["visual-studio-code-bin", "google-chrome"]

[[packages]]
manager = "flatpak"
scope = "user"
items = ["com.spotify.Client", "org.telegram.desktop"]
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

### Settings

```toml
[settings]
aur_helper = "yay"    # AUR helper: "yay" or "paru"
backup = true         # Backup existing files before creating symlinks
flatpak = true        # Enable Flatpak support (auto-detected)
```

### Symlinks

```toml
[[symlinks]]
source = "./config/nvim"    # Relative to config.toml directory
target = "~/.config/nvim"   # Target path (~ expands to $HOME)
sudo = false                # Use sudo for creation (default: false)
```

<!--### Packages

#### Pacman (Official Repositories)
```toml
[[packages]]
manager = "pacman"
items = ["git", "neovim", "base-devel"]
```

#### AUR (Arch User Repository)
```toml
[[packages]]
manager = "aur"
items = [
  "visual-studio-code-bin",
  { name = "google-chrome", post_hooks = ["sudo systemctl enable --now chrome-remote-desktop"] }
]
```

#### Flatpak
```toml
[[packages]]
manager = "flatpak"
scope = "user"      # or "system"
items = ["com.spotify.Client", "org.telegram.desktop"]
```-->

### Imports (Modular Config)

Split your config across multiple files:

```toml
# config.toml
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
│   │   ├── metadata.ts # Lock file management (~/.cache/hofii/)
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

Hofii maintains a lock file at `~/.cache/hofii/hofii-lock.json` that tracks:
- Applied symlinks (source, target, sudo)
- Configuration state

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
| Fedora | dnf | 🔄 Planned |
| Nobara | dnf | 🔄 Planned |

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Note:** Hofii is in early development. Use with caution and always review the diff before applying changes.