import { Command } from "commander"
import { purge } from "./cmdPurge.js";
import { logo } from "./logo.js";
import { join } from "path";
import { readFileSync } from "fs";

declare global {
    var program: Command;
}
globalThis.program = new Command();

export function getLogoAndVersion() {
    return `${logo}\nVersion ${globalThis.program.version()} by Shade`;
}

/* v8 ignore start */
export function cliSetup() {
    function getVersion(): string {
        const packageJsonPath = join(import.meta.dirname, '..', 'package.json');
        const packageJson: Record<string, string> = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        // No error handling needed, since build script checks for a valid package.json and version. I hope I don't regret this.
        return packageJson.version;
    }

    program
        .version(getVersion())
        .description("A modular tool for purging Node.js modules in multiple given project destinations. Will purge all node_modules recursively in any folder it finds.");

    program.command("purge")
        .argument("[destinations...]", "Destinations to purge node_modules.")
        .action(purge)
        .option("-q, --quiet", "Suppress output", false)
        .option("-f, --force", "Force deletion without confirmation. Highly destructive! Use this only if you know what you're doing.", false)
        .option("-d, --dry", "Run in dry mode. Only show what would be deleted without actually deleting anything.", false);

    program.addHelpText("beforeAll", getLogoAndVersion());
}
/* v8 ignore stop */