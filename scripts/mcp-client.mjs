import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const args = process.argv.slice(2);
const http = args[0] === "--http";
const transport = http
  ? new StreamableHTTPClientTransport(new URL("/mcp", process.env.APP_ORIGIN || "http://localhost:3000"), {
    requestInit: { headers: { Authorization: "Bearer " + process.env.MCP_TOKEN } }
  })
  : new StdioClientTransport({
    command: process.execPath, args: ["--env-file-if-exists=.env", "scripts/mcp-stdio.mjs"],
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => ["PATH", "APP_ORIGIN", "DB_CLIENT", "DB_FILE", "DATABASE_URL", "MONGODB_URL", "MONGODB_DB"].includes(key.toUpperCase())))
  });
const client = new Client({ name: "study-client", version: "1.0.0" });

try {
  await client.connect(transport);
  console.log(await client.listTools());
  console.log(await client.callTool({ name: "search_posts", arguments: { q: args[http ? 1 : 0] || "", limit: 5 } }));
} finally {
  await client.close();
}
