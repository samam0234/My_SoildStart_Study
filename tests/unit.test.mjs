import { test } from "node:test";
import assert from "node:assert/strict";
import { makeBoard } from "../tsx_version/src/server/board.ts";
import { ttlCache } from "../tsx_version/src/server/cache.ts";
import { excerpts } from "../tsx_version/src/server/documents.ts";
import { guardOrigin, idOf, objectBody } from "../tsx_version/src/server/http.ts";
import { pageQuery, postInput } from "../tsx_version/src/server/validation.ts";

test("정규화, 부분 수정, 페이지 한도", () => {
  const original = postInput({ title: " 제목 ", body: "내용", tags: ["tag", " tag "] });
  assert.deepEqual(original, { title: "제목", body: "내용", tags: ["tag"] });
  assert.deepEqual(postInput({ title: "수정" }, original), { ...original, title: "수정" });
  assert.throws(() => postInput({ ...original, tags: "tag" }), { code: "VALIDATION_ERROR" });
  assert.deepEqual(pageQuery(new URL("http://localhost/?page=0&limit=51&q=%20Solid&sort=wrong")),
    { page: 1, limit: 50, q: "Solid", sort: "-createdAt" });
  assert.throws(() => idOf("1e2"), { code: "BAD_REQUEST" });
});

test("잘못된 JSON과 신뢰하지 않는 요청 출처", async () => {
  await assert.rejects(objectBody(new Request("http://localhost", { method: "POST", body: "{" })), { code: "BAD_REQUEST" });
  assert.throws(() => guardOrigin(new Request("http://localhost", { headers: { Origin: "https://other.example" } })), { code: "FORBIDDEN" });
});

test("동시 캐시 읽기, TTL, 무효화와 오류 재시도", async () => {
  let time = 0;
  let calls = 0;
  const cache = ttlCache(5, 2, () => time);
  const loader = async () => ++calls;
  assert.deepEqual(await Promise.all([cache.read("q", loader), cache.read("q", loader)]), [1, 1]);
  time = 5;
  assert.equal(await cache.read("q", loader), 2);
  cache.clear();
  assert.equal(await cache.read("q", loader), 3);
  await assert.rejects(cache.read("bad", async () => { throw new Error("temporary"); }));
  assert.equal(await cache.read("bad", loader), 4);
});

test("게시판 서비스에서 DB를 메모리 객체로 교체", async () => {
  const rows = {
    users: [{ id: 1, payload: '{"nickname":"mina"}' }],
    posts: [{ id: 1, owner: 1, payload: '{"title":"Solid","body":"Hello","tags":[],"createdAt":"2026-11-01T09:00:00.000Z"}' }],
    comments: [{ id: 1, parent: 1 }]
  };
  const store = {
    list: async (name, where = {}) => rows[name].filter((row) => Object.entries(where).every(([key, value]) => row[key] === value))
  };
  const board = makeBoard(store);
  const result = await board.list(new URL("http://localhost/api/posts?q=hello"));
  assert.equal(result.meta.total, 1);
  assert.equal(result.data[0].commentCount, 1);
  assert.equal(result.data[0].author.nickname, "mina");
  await assert.rejects(board.edit(1, 2, { title: "other" }), { code: "FORBIDDEN" });
});

test("한국어 문서 발췌 검색", () => {
  const [selected] = excerpts("가".repeat(800) + "고객 지원은 수요일에 운영합니다.", "고객 지원");
  assert.equal(selected.number, 2);
  assert.equal(selected.score, 2);
});
