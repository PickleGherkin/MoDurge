import { OptionValues } from "commander";
import { log } from "console";
import { readdir, rm, stat } from "fs/promises";
import { getLogoAndVersion } from "./cliSetup.js";
import { Dirent } from "fs";

class MoDurge {
    private didPerformPurge = false;
    private totalBytesSaved = 0;

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

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    private displayCompletionMessage(): void {
        const savedSpaceStr = this.formatBytes(this.totalBytesSaved);
        if (this.options.dry) {
            log(`Dry run completed. Found ${savedSpaceStr} of node_modules that would be deleted.`);
            return;
        }
        log(this.didPerformPurge ? `Successfully purged all node_modules! Saved ${savedSpaceStr} of disk space.` : `No node_modules found to purge.`);
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
        const isNotDirectory = await this.isNotDirectory(relativeEntryPath)
        if (isNotDirectory) return false;
        if (!relativeEntryPath.includes("node_modules")) {
            await this.walk(relativeEntryPath);
            return false;
        }
        return true;
    }

    private async isNotDirectory(entryOrPath: string | Dirent<string>): Promise<boolean> {
        if (entryOrPath instanceof Dirent) {
            return !entryOrPath.isDirectory();
        }
        try {
            const stats = await stat(entryOrPath);
            return !stats.isDirectory();
        } catch {
            return true;
        }
    }

    private async purgeDirectory(relativeEntryPath: string): Promise<void> {
        if (!this.options.quiet) log(`Purging: ${relativeEntryPath}`);

        try {
            const size = await this.getDirectorySize(relativeEntryPath);
            this.totalBytesSaved += size;
        } catch (error) {
            // Ignore if we can't calculate size (e.g. permission issues)
        }

        if (!this.options.dry) await rm(relativeEntryPath, { recursive: true, force: this.options.force });
        if (!this.didPerformPurge) this.didPerformPurge = true;
    }

    private async getDirectorySize(dirPath: string): Promise<number> {
        let size = 0;
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = dirPath + "/" + entry.name;
            const isDirectory = !(await this.isNotDirectory(entry));
            if (isDirectory) {
                size += await this.getDirectorySize(fullPath);
            } else if (entry.isFile()) {
                try {
                    const stats = await stat(fullPath);
                    size += stats.size;
                } catch {
                    // Ignore broken symlinks
                }
            }
        }
        return size;
    }
}

export async function purge(destinations: string[], options: OptionValues) {
    await MoDurge.purge(destinations, options);
}