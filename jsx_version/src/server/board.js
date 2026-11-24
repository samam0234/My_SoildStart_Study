import { getStore, one, unpack } from "./db.js";
import { forbidden, missing } from "./http.js";
import { pageQuery, postInput, textField } from "./validation.js";
import { announce } from "./announcements.js";
import { ttlCache } from "./cache.js";
const timestamp = () => new Date().toISOString();
const authorOf = (row) => ({ id: row.id, nickname: unpack(row).nickname });
const unknownAuthor = { id: 0, nickname: "알 수 없음" };
async function postRow(store, id) {
    const row = await one(store, "posts", { id });
    if (!row)
        throw missing();
    return row;
}
export function makeBoard(store) {
    async function detail(id) {
        const row = await postRow(store, id);
        const user = row.owner === null ? undefined : await one(store, "users", { id: row.owner });
        const comments = await store.list("comments", { parent: id });
        return { id, ...unpack(row), author: user ? authorOf(user) : unknownAuthor, commentCount: comments.length };
    }
    return {
        detail,
        async list(url) {
            const { q, page, limit, sort } = pageQuery(url);
            const [posts, authors, comments] = await Promise.all([
                store.list("posts"), store.list("users"), store.list("comments")
            ]);
            const names = new Map(authors.map((row) => [row.id, authorOf(row)]));
            const counts = new Map();
            for (const row of comments)
                counts.set(row.parent, (counts.get(row.parent) ?? 0) + 1);
            const needle = q.toLowerCase();
            const matches = posts.map((row) => ({
                ...unpack(row),
                id: row.id,
                author: names.get(row.owner ?? 0) ?? unknownAuthor,
                commentCount: counts.get(row.id) ?? 0
            })).filter((post) => (post.title + "\n" + post.body).toLowerCase().includes(needle));
            matches.sort((left, right) => {
                if (sort === "-commentCount" && left.commentCount !== right.commentCount)
                    return right.commentCount - left.commentCount;
                const order = left.createdAt.localeCompare(right.createdAt) || left.id - right.id;
                return sort === "createdAt" ? order : -order;
            });
            const data = matches.slice((page - 1) * limit, page * limit)
                .map(({ id, title, author, commentCount, createdAt }) => ({ id, title, author, commentCount, createdAt }));
            return { data, meta: { page, limit, total: matches.length, totalPages: Math.ceil(matches.length / limit), q } };
        },
        async create(owner, input) {
            const now = timestamp();
            const data = { ...postInput(input), createdAt: now, updatedAt: now };
            const row = await store.insert("posts", { owner, payload: JSON.stringify(data) });
            listCache.clear();
            announce("post-created");
            return detail(row.id);
        },
        async edit(id, owner, input) {
            const row = await postRow(store, id);
            if (row.owner !== owner)
                throw forbidden();
            const current = unpack(row);
            const payload = { ...current, ...postInput(input, current), updatedAt: timestamp() };
            if (!await store.update("posts", { id, owner }, JSON.stringify(payload)))
                throw missing();
            listCache.clear();
            announce("post-updated");
            return detail(id);
        },
        async remove(id, owner) {
            const row = await postRow(store, id);
            if (row.owner !== owner)
                throw forbidden();
            if (!await store.remove("posts", { id, owner }))
                throw missing();
            await store.remove("comments", { parent: id });
            listCache.clear();
            announce("post-deleted");
        },
        async comments(id) {
            await postRow(store, id);
            const [rows, users] = await Promise.all([store.list("comments", { parent: id }), store.list("users")]);
            const names = new Map(users.map((row) => [row.id, authorOf(row)]));
            return rows.map((row) => ({ id: row.id, ...unpack(row), author: names.get(row.owner ?? 0) ?? unknownAuthor }));
        },
        async comment(id, owner, input) {
            await postRow(store, id);
            const data = { body: textField(input, "body", 1, 2000), createdAt: timestamp() };
            const row = await store.insert("comments", { owner, parent: id, payload: JSON.stringify(data) });
            listCache.clear();
            announce("comment-changed");
            const user = await one(store, "users", { id: owner });
            return { ...data, id: row.id, author: user ? authorOf(user) : unknownAuthor };
        },
        async removeComment(id, owner) {
            const row = await one(store, "comments", { id });
            if (!row)
                throw missing();
            if (row.owner !== owner)
                throw forbidden();
            if (!await store.remove("comments", { id, owner }))
                throw missing();
            listCache.clear();
            announce("comment-changed");
        }
    };
}
export const board = async () => makeBoard(await getStore());
const listCache = ttlCache(5000, 128);
export function cachedPosts(url) {
    const key = JSON.stringify(pageQuery(url));
    return listCache.read(key, async () => (await board()).list(url));
}
