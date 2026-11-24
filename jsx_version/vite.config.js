import { defineConfig, loadEnv } from "vite";
import { nitro } from "nitro/vite";
import { solidStart } from "@solidjs/start/config";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
const envDir = fileURLToPath(new URL("..", import.meta.url));
export default defineConfig(({ mode }) => {
    for (const [key, value] of Object.entries(loadEnv(mode, envDir, ""))) {
        process.env[key] ??= value;
    }
    return {
        root,
        envDir,
        plugins: [solidStart({ middleware: "./src/middleware.mjs" }), nitro()],
        nitro: {
            rootDir: root,
            serverDir: "./server",
            preset: "node-server",
            features: { websocket: true }
        }
    };
});
