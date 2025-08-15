import { Command } from "commander"
import { purge } from "./cmdPurge";

declare global {
    var program: Command;
}
globalThis.program = new Command();

export function cliSetup() {
    program
        .version("1.0.0")
        .description("A modular tool for purging node_modules in Node.js projects. Will purge all node_modules recursively in any folder it finds.");

    program.command("purge")
        .argument("<destination>", "Destination to purge node_modules.")
        .action(purge)
        .option("-q, --quiet", "Suppress output");
        
}