import { Command } from "commander"
import { purge } from "./cmdPurge.js";
import { readFileSync } from "fs";
import { join } from "path";

declare global {
    var program: Command;
}
globalThis.program = new Command();

export function getLogoAndVersion() {
    const logoPath = join(import.meta.dirname, '..', 'logo.txt');
    const logo = readFileSync(logoPath, "utf8");
    return `${logo}\nVersion ${globalThis.program.version()} by Shade`;    
}

export function cliSetup() {
    program
        .version("1.2.0")
        .description("A modular tool for purging Node.js modules in multiple given project destinations. Will purge all node_modules recursively in any folder it finds.");

    program.command("purge")
        .argument("[destinations...]", "Destinations to purge node_modules.")
        .action(purge)
        .option("-q, --quiet", "Suppress output", false)
        .option("-f, --force", "Force deletion without confirmation. Highly destructive! Use this only if you know what you're doing.", false)
        .option("-d, --dry", "Run in dry mode. Only show what would be deleted without actually deleting anything.", false);

    program.addHelpText("beforeAll", getLogoAndVersion());
}