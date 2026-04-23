# MoDurge

MoDurge stands for ***Modules Purge*** and is a modular CLI tool designed for developers to recursively find and purge `node_modules` directories across multiple project destinations. Motiviation for creating such a tool instead of using **pnpm** is that I don't like **pnpm**. If you need to quickly free up disk space by cleaning up old Node.js projects, MoDurge automates the process and reports exactly how much space was saved.

## Installation

You can install MoDurge globally via npm:

```bash
npm install -g modurge
```

*(Assuming you want to install the package from npm. Alternatively, clone the official source code from GitHub and use `npm link`)*

## Usage

MoDurge provides a primary `purge` command that accepts one or more directory paths. It will recursively scan the provided directories, locate all `node_modules` folders, and remove them.

### Basic Syntax

```bash
modurge purge [options] [destinations...]
```

### Examples

**Clean the current directory recursively:**
```bash
modurge purge .
```

**Clean multiple specific directories:**
```bash
modurge purge /path/to/projects /another/path/to/projects
```

## Options

MoDurge offers several flags to customize its execution:

*   **`-d, --dry` (Dry Run)**
    Run the command without actually deleting anything. It will scan the directories, calculate the sizes of the `node_modules` folders, and report the total disk space that *would* be saved. This is highly recommended before running destructive commands.

*   **`-f, --force` (Force Deletion)**
    Forces the deletion process. This will violently remove folders without failing if permissions block standard removal (passes `{ force: true }` to the underlying filesystem removal tool). Use this only if you know what you are doing.

*   **`-q, --quiet` (Quiet Mode)**
    Suppresses all standard output, including the initialization logo, scanning progress, and the final space-saving summary.

## Features

*   **Space Calculation:** MoDurge automatically calculates the file size of every matched `node_modules` directory and returns a human-readable total (e.g., in MB or GB) showing how much disk space was saved.
*   **Recursive Walking:** Safely walks down directory trees to ensure nested projects are appropriately cleaned.
*   **Safety Options:** Out-of-the-box support for dry runs ensures you don't delete unintended files. 

## License

MIT License. See the `LICENSE` file for details.
