
import { discoverOpenClawPlugins } from "./src/plugins/discovery.js";
import { loadOpenClawPlugins } from "./src/plugins/loader.js";
import path from "node:path";

async function run() {
    console.log("Starting loading test...");
    const workspaceDir = process.cwd();

    // We need to mock some environment for the loader
    const registry = loadOpenClawPlugins({
        workspaceDir,
        extraPaths: [path.join(workspaceDir, "extensions", "group-awareness")]
    });

    console.log("Registry initialized.");
    const plugins = registry.getPlugins();
    console.log("Total plugins in registry:", plugins.length);

    const groupAwareness = plugins.find(p => p.id === "group-awareness");
    if (groupAwareness) {
        console.log("Plugin 'group-awareness' found in registry!");
        console.log("Status:", groupAwareness.status);
        if (groupAwareness.error) {
            console.log("Error:", groupAwareness.error);
        }
    } else {
        console.log("Plugin 'group-awareness' NOT found in registry.");
        console.log("Available IDs:", plugins.map(p => p.id).join(", "));
    }
}

run().catch(console.error);
