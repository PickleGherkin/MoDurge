import { OptionValues } from "commander";
import { log } from "console";
import { readdir, rm, stat } from "fs/promises";

class Purger {
    private didPerformPurge = false;
    private constructor(private options: OptionValues) { }

    public static async purge(destinations: string[], options: OptionValues): Promise<void> {
        const purger = new Purger(options);
        for (const destination of destinations) {
            if (!options.quiet) log(`Searching for node_modules in ${purger.isCurrentDirectory(destination) ? "current directory" : destination}...`);
            await purger.walk(destination);
        }
        if (!options.quiet) log(purger.didPerformPurge ? `Successfully purged all node_modules!` : `No node_modules found to purge.`);
    }

    private isCurrentDirectory(destination: string): boolean {
        return destination === "." || destination === "./" || destination === process.cwd();
    }

    private async walk(destination: string): Promise<void> {
        const entries = await readdir(destination);
        for (const entry of entries) {
            const relativeEntryPath = destination + "/" + entry;
            const isModulesFolder = await this.isModulesDirectory(relativeEntryPath);
            if (isModulesFolder) await this.purgeDirectory(relativeEntryPath);
        }
    }

    private async isModulesDirectory(relativeEntryPath: string): Promise<boolean> {
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

    private async purgeDirectory(relativeEntryPath: string): Promise<void> {
        if (!this.options.quiet) log(`Purging: ${relativeEntryPath}`);
        await rm(relativeEntryPath, { recursive: true, force: this.options.force })
        if (!this.didPerformPurge) this.didPerformPurge = true;
    }
}

export async function purge(destinations: string[], options: OptionValues) {
    if (!options.quiet) log(`MoDurge Version ${globalThis.program.version()} by Shade`);
    await Purger.purge(destinations, options);
}