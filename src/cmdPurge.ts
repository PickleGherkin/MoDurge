import { OptionValues } from "commander";
import { log } from "console";
import { readdir, rm, stat } from "fs/promises";
import { getLogoAndVersion } from "./cliSetup.js";
import { Dirent, PathLike } from "fs";
import { basename, dirname, join } from "path";

class MoDurge {
    private didPerformPurge = false;
    private totalBytesSaved = 0;

    private constructor(private destinations: PathLike[], private options: OptionValues) {
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

    public static async purge(destinations: PathLike[], options: OptionValues): Promise<void> {
        const purger = new MoDurge(destinations, options);
        for (const destination of destinations) {
            if (!options.quiet) log(`Searching for node_modules in ${purger.isCurrentDirectory(destination) ? "current directory" : destination.toString()}...`);
            await purger.walk(destination);
        }
        if (!options.quiet) purger.displayCompletionMessage();
    }

    private isCurrentDirectory(destination: PathLike): boolean {
        const destinationString = destination.toString();
        const currentPathPatterns = [".", "./", process.cwd()]
        const isCurrentDirectory = currentPathPatterns.includes(destinationString);
        return isCurrentDirectory;
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

    private async walk(destination: PathLike): Promise<void> {
        const entries = await readdir(destination);
        for (const entry of entries) {
            const relativeEntryPath = destination.toString() + "/" + entry;
            const isNotDirectory = await this.isNotDirectory(relativeEntryPath);
            if (isNotDirectory) continue;
            const isModulesFolder = await this.isModulesDirectory(relativeEntryPath);
            const parentDir = dirname(relativeEntryPath.toString());
            const hasPackageJson = await this.hasPackageJson(parentDir);
            if (isModulesFolder && hasPackageJson) await this.purgeDirectory(relativeEntryPath);
        }
    }

    private async isModulesDirectory(relativeEntryPath: PathLike): Promise<boolean> {
        const isModulesDirectory = basename(relativeEntryPath.toString()) === "node_modules";
        if (isModulesDirectory) {
            return true;
        }
        await this.walk(relativeEntryPath);
        return false;
    }

    private async hasPackageJson(dirPath: PathLike): Promise<boolean> {
        try {
            const packageJsonPath = join(dirPath.toString(), "package.json");
            const stats = await stat(packageJsonPath);
            const hasPackageJson = stats.isFile();
            return hasPackageJson;
        } catch {
            return false;
        }
    }

    private async isNotDirectory(entryOrPath: PathLike | Dirent): Promise<boolean> {
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

    private async purgeDirectory(relativeEntryPath: PathLike): Promise<void> {
        if (!this.options.quiet) log(`Purging: ${relativeEntryPath.toString()}`);

        try {
            const size = await this.getDirectorySize(relativeEntryPath);
            this.totalBytesSaved += size;
        } catch (error) {
            // Ignore if we can't calculate size (e.g. permission issues)
        }

        if (!this.options.dry) await rm(relativeEntryPath, { recursive: true, force: this.options.force });
        if (!this.didPerformPurge) this.didPerformPurge = true;
    }

    private async getDirectorySize(dirPath: PathLike): Promise<number> {
        let size = 0;
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath: PathLike = dirPath.toString() + "/" + entry.name;
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

export async function purge(destinations: PathLike[], options: OptionValues) {
    await MoDurge.purge(destinations, options);
}