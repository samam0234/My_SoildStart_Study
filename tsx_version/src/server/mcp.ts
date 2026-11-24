import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { board } from "./board.ts";
import { config } from "./config.ts";
import { forbidden, missing, unauthorized } from "./http.ts";

export function boardMcp() {
  const server = new McpServer({ name: "solidstart-board", version: "1.0.0" });
  server.registerTool("search_posts", {
    description: "공개 게시글 제목·본문 검색",
    inputSchema: { q: z.string().max(200), limit: z.number().int().min(1).max(10).default(5) }
  }, async ({ q, limit }) => {
    const url = new URL("http://localhost/api/posts");
    url.search = new URLSearchParams({ q, limit: String(limit) }).toString();
    const result = await (await board()).list(url);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  });
  return server;
}

export function handleMcp(request: Request) {
  const token = process.env.MCP_TOKEN;
  if (!token) throw missing();
  const origin = request.headers.get("origin");
  if (origin && origin !== config().origin) throw forbidden();
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from("Bearer " + token);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw unauthorized();
  return connect(request);
}

async function connect(request: Request) {
  const server = boardMcp();
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}
