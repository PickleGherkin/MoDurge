import { OptionValues } from "commander";
import { log } from "console";
import { readdir, rm, stat } from "fs/promises";

class Purger {
    private constructor(private options: OptionValues) { }

    public static async purge(destination: string, options: OptionValues): Promise<void> {
        const purger = new Purger(options);
        await purger.walk(destination);
    }

    private async walk(destination: string): Promise<void> {
        const entries = await readdir(destination);
        for (const entry of entries) {
            const relativeEntryPath = destination + "/" + entry;
            const isModulesFolder = await this.isModulesFolder(relativeEntryPath);
            if (isModulesFolder) await this.deleteFolder(relativeEntryPath);
        }
    }

    private async isModulesFolder(relativeEntryPath: string): Promise<boolean> {
        if (await this.isNotDirectory(relativeEntryPath)) return false;
        if (!relativeEntryPath.includes("node_modules")) {
            await this.walk(relativeEntryPath);
            return false;
        }
        return true;
    }

    private async isNotDirectory(relativeEntryPath: string): Promise<boolean> {
        const stats = await stat(relativeEntryPath);
        return !stats.isDirectory();
    }

    private async deleteFolder(relativeEntryPath: string): Promise<void> {
        if (!this.options.quiet) log(`Purging: ${relativeEntryPath}`);
        await rm(relativeEntryPath, { recursive: true, force: this.options.force })
    }
}

function isCurrentDirectory(destination: string): boolean {
    return destination === "." || destination === "./" || destination === process.cwd();
}

export async function purge(destinations: string[], options: OptionValues) {
    if(!options.quiet) log(`MoDurge Version ${globalThis.program.version()} by Shade`);
    for (const destination of destinations) {
        if (!options.quiet) log(`Searching for node_modules in ${isCurrentDirectory(destination) ? "current directory" : destination}...`);
        await Purger.purge(destination, options);
    }
    if (!options.quiet) log(`Successfully purged all node_modules!`);
}