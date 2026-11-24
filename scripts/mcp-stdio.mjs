import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { boardMcp } from "../tsx_version/src/server/mcp.ts";

await boardMcp().connect(new StdioServerTransport());
