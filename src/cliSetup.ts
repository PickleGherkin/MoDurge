import { Command } from "commander"
import { purge } from "./cmdPurge";

declare global {
    var program: Command;
}
globalThis.program = new Command();

export function cliSetup() {
    program
        .version("1.0.0")
        .description("A modular tool for purging Node.js modules in multiple given project destinations. Will purge all node_modules recursively in any folder it finds.");

    program.command("purge")
        .argument("[destinations...]", "Destinations to purge node_modules.")
        .action(purge)
        .option("-q, --quiet", "Suppress output", false)
        .option("-f, --force", "Force deletion without confirmation. Highly destructive! Use this only if you know what you're doing.", false);
}