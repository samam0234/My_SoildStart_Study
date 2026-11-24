import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [version, ...args] = process.argv.slice(2);
if (!["tsx_version", "jsx_version"].includes(version)) throw new Error("Specify a course version");
const cwd = fileURLToPath(new URL("../" + version + "/", import.meta.url));
const cli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const result = spawnSync(process.execPath, [cli, ...args], { cwd, stdio: "inherit" });
process.exitCode = result.status ?? 1;
