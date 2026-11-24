import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "../tsx_version/src/server/config.ts";
import { openStore } from "../tsx_version/src/server/db.ts";
import { makeBoard } from "../tsx_version/src/server/board.ts";

const settings = config();
const store = await openStore(settings);
const service = makeBoard(store);
const key = randomUUID();
let user;
let post;
try {
  user = await store.insert("users", { key, payload: JSON.stringify({ nickname: key }) });
  post = await service.create(user.id, { title: key, body: "DB 확인", tags: ["db"] });
  const list = new URL("http://localhost/api/posts");
  list.searchParams.set("q", key);
  assert.equal((await service.list(list)).meta.total, 1);
  await service.comment(post.id, user.id, { body: "댓글 확인" });
  assert.equal((await service.detail(post.id)).commentCount, 1);
  assert.equal((await service.edit(post.id, user.id, { title: "수정 확인" })).title, "수정 확인");
  await service.remove(post.id, user.id);
  assert.equal((await service.list(list)).meta.total, 0);
  console.log(settings.db + " CRUD verified");
} finally {
  if (post) {
    await store.remove("comments", { parent: post.id });
    await store.remove("posts", { id: post.id });
  }
  if (user) await store.remove("users", { id: user.id });
  await store.close();
}
