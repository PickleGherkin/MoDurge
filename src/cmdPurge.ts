import { OptionValues } from "commander";
import { log } from "console";
import { readdir, rm, stat } from "fs/promises";
import { getLogoAndVersion } from "./cliSetup";

class MoDurge {
    private didPerformPurge = false;
    private constructor(private destinations: string[], private options: OptionValues) {
        this.prepareSystem();
    }

    private prepareSystem(): void {
        if (!this.options.quiet) this.displayLogoAndVersion();
        this.validateDestinationsNotEmpty();
    }

    private validateDestinationsNotEmpty(): void {
        if (this.destinations.length === 0) globalThis.program.error("No destinations provided. Please specify at least one directory to purge Node.js modules.");
    }

    private displayLogoAndVersion(): void {
        log(getLogoAndVersion());
    }

    public static async purge(destinations: string[], options: OptionValues): Promise<void> {
        const purger = new MoDurge(destinations, options);
        for (const destination of destinations) {
            if (!options.quiet) log(`Searching for node_modules in ${purger.isCurrentDirectory(destination) ? "current directory" : destination}...`);
            await purger.walk(destination);
        }
        if (!options.quiet) purger.displayCompletionMessage();
    }

    private isCurrentDirectory(destination: string): boolean {
        return destination === "." || destination === "./" || destination === process.cwd();
    }

    private displayCompletionMessage(): void {
        if (this.options.dry) {
            log("Dry run completed. No directories were deleted.");
            return;
        }
        log(this.didPerformPurge ? `Successfully purged all node_modules!` : `No node_modules found to purge.`);
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
        if (!this.options.dry) await rm(relativeEntryPath, { recursive: true, force: this.options.force });
        if (!this.didPerformPurge) this.didPerformPurge = true;
    }
}

export async function purge(destinations: string[], options: OptionValues) {
    await MoDurge.purge(destinations, options);
}