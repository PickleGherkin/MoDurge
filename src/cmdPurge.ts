import { OptionValues } from "commander";
import { log } from "console";
import { rmSync, readdirSync, statSync } from "fs";

class Purger {
    private constructor(private options: OptionValues) { }

    public static purge(destination: string, options: OptionValues): void {
        const purger = new Purger(options);
        purger.walk(destination);
    }

    private walk(destination: string): void {
        const entries = readdirSync(destination);
        for (const entry of entries) {
            const relativeEntryPath = destination + "/" + entry;
            const isModulesFolder = this.isModulesFolder(relativeEntryPath);
            if (isModulesFolder) this.deleteFolder(relativeEntryPath);
        }
    }

    private isModulesFolder(relativeEntryPath: string): boolean {
        if (this.isNotDirectory(relativeEntryPath)) return false;
        if (!relativeEntryPath.includes("node_modules")) {
            this.walk(relativeEntryPath);
            return false;
        }
        return true;
    }

    private isNotDirectory(relativeEntryPath: string): boolean {
        return !statSync(relativeEntryPath).isDirectory();
    }

    private deleteFolder(relativeEntryPath: string): void {
        if (!this.options.quiet) log(`Purging: ${relativeEntryPath}`);
        rmSync(relativeEntryPath, { recursive: true });
    }
}

function isCurrentDirectory(destination: string): boolean {
    return destination === "." || destination === "./" || destination === process.cwd();
}

export function purge(destination: string, options: OptionValues) {
    if(!options.quiet) log(`MoPurge Version ${globalThis.program.version()} by Shade`);
    if (!options.quiet) log(`Purging node_modules in ${isCurrentDirectory(destination) ? "current directory" : destination}...`);
    Purger.purge(destination, options);
    if (!options.quiet) log(`Successfully purged all node_modules!`);
}