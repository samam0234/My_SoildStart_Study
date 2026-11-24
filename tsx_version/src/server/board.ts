import { getStore, one, unpack, type Row, type Store } from "./db.ts";
import { forbidden, missing } from "./http.ts";
import { pageQuery, postInput, textField, type PostInput } from "./validation.ts";
import { announce } from "./announcements.ts";
import { ttlCache } from "./cache.ts";

type PostData = PostInput & { createdAt: string; updatedAt: string };
type CommentData = { body: string; createdAt: string };
type Author = { id: number; nickname: string };

const timestamp = () => new Date().toISOString();
const authorOf = (row: Row): Author => ({ id: row.id, nickname: unpack<{ nickname: string }>(row).nickname });
const unknownAuthor = { id: 0, nickname: "알 수 없음" };

async function postRow(store: Store, id: number) {
  const row = await one(store, "posts", { id });
  if (!row) throw missing();
  return row;
}

export function makeBoard(store: Store) {
  async function detail(id: number) {
    const row = await postRow(store, id);
    const user = row.owner === null ? undefined : await one(store, "users", { id: row.owner });
    const comments = await store.list("comments", { parent: id });
    return { id, ...unpack<PostData>(row), author: user ? authorOf(user) : unknownAuthor, commentCount: comments.length };
  }

  return {
    detail,
    async list(url: URL) {
      const { q, page, limit, sort } = pageQuery(url);
      const [posts, authors, comments] = await Promise.all([
        store.list("posts"), store.list("users"), store.list("comments")
      ]);
      const names = new Map(authors.map((row) => [row.id, authorOf(row)]));
      const counts = new Map<number | null, number>();
      for (const row of comments) counts.set(row.parent, (counts.get(row.parent) ?? 0) + 1);
      const needle = q.toLowerCase();
      const matches = posts.map((row) => ({
        ...unpack<PostData>(row),
        id: row.id,
        author: names.get(row.owner ?? 0) ?? unknownAuthor,
        commentCount: counts.get(row.id) ?? 0
      })).filter((post) => (post.title + "\n" + post.body).toLowerCase().includes(needle));
      matches.sort((left, right) => {
        if (sort === "-commentCount" && left.commentCount !== right.commentCount) return right.commentCount - left.commentCount;
        const order = left.createdAt.localeCompare(right.createdAt) || left.id - right.id;
        return sort === "createdAt" ? order : -order;
      });
      const data = matches.slice((page - 1) * limit, page * limit)
        .map(({ id, title, author, commentCount, createdAt }) => ({ id, title, author, commentCount, createdAt }));
      return { data, meta: { page, limit, total: matches.length, totalPages: Math.ceil(matches.length / limit), q } };
    },
    async create(owner: number, input: Record<string, unknown>) {
      const now = timestamp();
      const data = { ...postInput(input), createdAt: now, updatedAt: now };
      const row = await store.insert("posts", { owner, payload: JSON.stringify(data) });
      listCache.clear();
      announce("post-created");
      return detail(row.id);
    },
    async edit(id: number, owner: number, input: Record<string, unknown>) {
      const row = await postRow(store, id);
      if (row.owner !== owner) throw forbidden();
      const current = unpack<PostData>(row);
      const payload = { ...current, ...postInput(input, current), updatedAt: timestamp() };
      if (!await store.update("posts", { id, owner }, JSON.stringify(payload))) throw missing();
      listCache.clear();
      announce("post-updated");
      return detail(id);
    },
    async remove(id: number, owner: number) {
      const row = await postRow(store, id);
      if (row.owner !== owner) throw forbidden();
      if (!await store.remove("posts", { id, owner })) throw missing();
      await store.remove("comments", { parent: id });
      listCache.clear();
      announce("post-deleted");
    },
    async comments(id: number) {
      await postRow(store, id);
      const [rows, users] = await Promise.all([store.list("comments", { parent: id }), store.list("users")]);
      const names = new Map(users.map((row) => [row.id, authorOf(row)]));
      return rows.map((row) => ({ id: row.id, ...unpack<CommentData>(row), author: names.get(row.owner ?? 0) ?? unknownAuthor }));
    },
    async comment(id: number, owner: number, input: Record<string, unknown>) {
      await postRow(store, id);
      const data = { body: textField(input, "body", 1, 2000), createdAt: timestamp() };
      const row = await store.insert("comments", { owner, parent: id, payload: JSON.stringify(data) });
      listCache.clear();
      announce("comment-changed");
      const user = await one(store, "users", { id: owner });
      return { ...data, id: row.id, author: user ? authorOf(user) : unknownAuthor };
    },
    async removeComment(id: number, owner: number) {
      const row = await one(store, "comments", { id });
      if (!row) throw missing();
      if (row.owner !== owner) throw forbidden();
      if (!await store.remove("comments", { id, owner })) throw missing();
      listCache.clear();
      announce("comment-changed");
    }
  };
}

export const board = async () => makeBoard(await getStore());

type Listing = Awaited<ReturnType<ReturnType<typeof makeBoard>["list"]>>;
const listCache = ttlCache<string, Listing>(5000, 128);
export function cachedPosts(url: URL) {
  const key = JSON.stringify(pageQuery(url));
  return listCache.read(key, async () => (await board()).list(url));
}
