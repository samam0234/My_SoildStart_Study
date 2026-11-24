import { before, after, test } from "node:test";
import { createServer } from "node:net";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

let server;
let directory;
let base;
let logs = "";
const output = process.env.TEST_BUILD || "tsx_version";
const mcpToken = "mcp-local-integration-test-token";
const json = (body) => JSON.stringify(body);
const credentials = (email) => ({ email, password: "password123", nickname: email.split("@")[0] });

function request(path, method = "GET", body, headers = {}) {
  return fetch(base + path, {
    method, redirect: "manual", headers: { ...(body && { "Content-Type": "application/json" }), ...headers }, body
  });
}

async function member(email) {
  const input = credentials(email);
  assert.equal((await request("/api/auth/signup", "POST", json(input))).status, 201, logs);
  const response = await request("/api/auth/login", "POST", json(input));
  assert.equal(response.status, 200, logs);
  assert.match(response.headers.get("set-cookie"), /HttpOnly; SameSite=Lax/);
  const data = (await response.json()).data;
  assert.equal("hash" in data.user, false);
  return { Authorization: "Bearer " + data.accessToken, Cookie: response.headers.get("set-cookie").split(";")[0] };
}

before(async () => {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));
  base = "http://127.0.0.1:" + port;
  directory = await mkdtemp(join(tmpdir(), "solidstart-http-"));
  server = spawn(process.execPath, [output + "/.output/server/index.mjs"], {
    env: {
      ...process.env, PORT: String(port), HOST: "127.0.0.1", APP_ORIGIN: base, CORS_ORIGIN: "http://localhost:5173",
      DB_CLIENT: "sqlite", DB_FILE: join(directory, "board.db"), AI_PROVIDER: "mock",
      AI_DAILY_TOKEN_LIMIT: "200000", MCP_TOKEN: mcpToken, COOKIE_SECURE: "false"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", (chunk) => { logs += chunk; });
  for (let retry = 0; retry < 80; retry++) {
    try {
      const response = await request("/ready");
      if (response.ok) return;
      logs += "\nready: " + response.status + " " + await response.text();
    } catch {}
    if (server.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Server did not start\n" + logs);
});

after(async () => {
  if (server && server.exitCode === null) {
    await new Promise((resolve) => { server.on("exit", resolve); server.kill(); });
  }
  if (directory) await rm(directory, { recursive: true, force: true, maxRetries: 3 });
});

test("SSR, 폼 상태와 API 문서", async () => {
  assert.match(await (await request("/")).text(), /Hello, SolidStart/);
  assert.equal((await request("/missing-page")).status, 404);
  assert.equal((await request("/board")).headers.get("location"), "/account");
  assert.equal((await request("/workbench")).headers.get("location"), "/account");
  assert.equal((await request("/api/preview", "POST", json({ title: "미리보기" }))).status, 200);
  assert.equal((await request("/api/preview", "POST", "{")).status, 400);
  assert.equal((await request("/api/preview", "POST", json({ title: "" }))).status, 422);
  assert.match(await (await request("/api-docs")).text(), /SwaggerUIBundle/);
  const schema = await (await request("/api/docs/openapi")).json();
  assert.equal(schema.paths["/api/posts/{id}"].delete.responses["204"].content, undefined);
});

test("세션과 v1 게시판 CRUD, 댓글, 오류 헤더, CORS", async () => {
  const owner = await member("owner@example.test");
  const other = await member("other@example.test");
  assert.equal((await request("/api/auth/me", "GET", undefined, { Cookie: owner.Cookie })).status, 200);
  assert.equal((await request("/api/auth/signup", "POST", json(credentials("owner@example.test")))).status, 409);
  assert.equal((await request("/api/auth/login", "POST", json({ email: "owner@example.test", password: "wrong" }))).status, 401);
  assert.equal((await request("/api/posts", "POST", json({ title: "abc" }))).status, 401);
  assert.equal((await request("/api/posts", "POST", json({ title: "abc" }), { ...owner, Origin: "https://other.example" })).status, 403);
  const cors = await request("/api/posts", "OPTIONS", undefined, { Origin: "http://localhost:5173" });
  assert.equal(cors.headers.get("access-control-allow-origin"), "http://localhost:5173");

  const failure = await request("/api/posts", "POST", json({ title: "", body: "study" }), { ...owner, "X-Request-Id": "study-test" });
  assert.equal(failure.status, 400);
  assert.deepEqual((await failure.json()).error.fields.title, ["1~200자로 입력하세요."]);
  assert.equal(failure.headers.get("x-request-id"), "study-test");

  const created = await request("/api/posts", "POST", json({ title: "SOLID tracked", body: "<script>alert(1)</script>", tags: ["study"] }), owner);
  assert.equal(created.status, 201, logs);
  const path = created.headers.get("location");
  assert.match(path, /^\/api\/posts\/\d+$/);
  const post = (await created.json()).data;

  const page = await (await request("/api/posts?q=solid&limit=99")).json();
  assert.deepEqual(page.meta, { q: "solid", limit: 50, page: 1, total: 1, totalPages: 1 });
  assert.equal(page.data[0].id, post.id);
  assert.match(await (await request("/posts/" + post.id)).text(), /SOLID tracked/);
  assert.doesNotMatch(await (await request("/posts/" + post.id)).text(), /<script>alert\(1\)<\/script>/);
  assert.equal((await request(path, "PATCH", json({ title: "다른 사용자" }), other)).status, 403);
  assert.equal((await request(path, "PATCH", json({ title: "수정한 글" }), owner)).status, 200);

  const comment = await request(path + "/comments", "POST", json({ body: "댓글" }), other);
  assert.equal(comment.status, 201);
  const commentPath = "/api/comments/" + (await comment.json()).data.id;
  assert.equal((await (await request(path)).json()).data.commentCount, 1);
  assert.equal((await request(commentPath, "DELETE", undefined, owner)).status, 403);
  assert.equal(await (await request(commentPath, "DELETE", undefined, other)).text(), "");
  assert.equal((await request(path, "DELETE", undefined, owner)).status, 204);
  assert.equal((await request(path)).status, 404);
  assert.equal((await request("/api/missing-xyz")).status, 404);
  assert.equal((await request("/api/auth/logout", "POST", undefined, owner)).status, 204);
  assert.equal((await request("/api/auth/me", "GET", undefined, owner)).status, 401);
});

test("파일 한도, 문서 소유권, AI 스트림과 HTTP MCP", async () => {
  const owner = await member("doc@example.test");
  const other = await member("stranger@example.test");
  const uploadHeaders = { ...owner, "Content-Type": "text/plain", "X-Filename": "notes.md" };
  assert.equal((await request("/api/documents", "POST", "X".repeat(65537), uploadHeaders)).status, 413);
  const uploaded = await request("/api/documents", "POST", "SolidStart는 문서를 저장합니다.", uploadHeaders);
  assert.equal(uploaded.status, 201);
  const id = (await uploaded.json()).data.id;
  const path = "/api/documents/" + id + "/questions";
  assert.equal((await request(path, "GET", undefined, other)).status, 404);
  const stream = await request(path, "POST", json({ question: "SolidStart" }), owner);
  assert.match(stream.headers.get("content-type"), /text\/event-stream/);
  const frames = (await stream.text()).split("\n\n").filter(Boolean).map((frame) => JSON.parse(frame.slice(6)));
  assert.match(frames.map((item) => item.text || "").join(""), /발췌 1/);
  assert.equal(frames.at(-1).done, true);
  assert.equal((await (await request(path, "GET", undefined, owner)).json()).data.length, 1);
  assert.equal((await request("/mcp", "POST", "{}")).status, 401);

  const client = new Client({ name: "http-test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL("/mcp", base), {
    requestInit: { headers: { Authorization: "Bearer " + mcpToken } }
  }));
  try {
    assert.equal((await client.listTools()).tools[0].name, "search_posts");
    assert.equal((await client.callTool({ name: "search_posts", arguments: { q: "Solid" } })).isError, undefined);
  } finally { await client.close(); }
});
