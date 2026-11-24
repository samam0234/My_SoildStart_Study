import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import { MongoClient } from "mongodb";
import { config } from "./config.js";
// Knex loads dialect and native driver packages at runtime in Node.
const loadPackage = createRequire(import.meta.url);
const createKnex = loadPackage("knex");
const tables = ["users", "posts", "comments", "sessions", "documents", "jobs", "ai_history", "ai_budget", "payments"];
async function sqlStore(client, filename, url) {
    if (client === "sqlite")
        mkdirSync(dirname(filename), { recursive: true });
    else if (!url)
        throw new Error("DATABASE_URL is required");
    const db = createKnex({
        client: client === "sqlite" ? "better-sqlite3" : client,
        connection: client === "sqlite" ? { filename } : url,
        useNullAsDefault: true,
        pool: { min: 0, max: client === "sqlite" ? 1 : 8 }
    });
    try {
        if (client === "sqlite")
            await db.raw("PRAGMA journal_mode = WAL");
        for (const name of tables) {
            if (await db.schema.hasTable(name))
                continue;
            await db.schema.createTable(name, (table) => {
                table.increments("id").primary();
                table.string("key", 255).unique();
                table.integer("owner").nullable();
                table.integer("parent").nullable();
                table.text("payload", "longtext").notNullable();
                table.index(["owner"]);
                table.index(["parent"]);
            });
        }
    }
    catch (error) {
        await db.destroy();
        throw error;
    }
    return {
        list: async (name, where = {}) => db(name).where(where).orderBy("id"),
        async insert(name, row) {
            const data = { key: null, owner: null, parent: null, ...row };
            const [result] = client === "pg"
                ? await db(name).insert(data).returning("id")
                : await db(name).insert(data);
            return { ...data, id: Number(typeof result === "number" ? result : result.id) };
        },
        update: async (name, where, payload) => (await db(name).where(where).update({ payload })) > 0,
        remove: async (name, where) => (await db(name).where(where).delete()) > 0,
        close: () => db.destroy()
    };
}
async function mongoStore(url, database) {
    if (!url)
        throw new Error("MONGODB_URL is required");
    const client = new MongoClient(url, { maxPoolSize: 8, serverSelectionTimeoutMS: 5000 });
    let db;
    try {
        await client.connect();
        db = client.db(database);
        for (const name of tables) {
            await db.collection(name).createIndexes([
                { key: { id: 1 }, unique: true },
                { key: { key: 1 }, unique: true, partialFilterExpression: { key: { $type: "string" } } },
                { key: { owner: 1 } },
                { key: { parent: 1 } }
            ]);
        }
    }
    catch (error) {
        await client.close();
        throw error;
    }
    const table = (name) => db.collection(name);
    return {
        list: async (name, where = {}) => (await table(name).find(where, { projection: { _id: 0 } }).sort({ id: 1 }).toArray()),
        async insert(name, row) {
            const sequence = await db.collection("counters")
                .findOneAndUpdate({ _id: name }, { $inc: { next: 1 } }, { upsert: true, returnDocument: "after" });
            if (!sequence)
                throw new Error("Sequence unavailable");
            const result = { key: null, owner: null, parent: null, ...row, id: sequence.next };
            await table(name).insertOne({ ...result });
            return result;
        },
        update: async (name, where, payload) => (await table(name).updateOne(where, { $set: { payload } })).matchedCount > 0,
        remove: async (name, where) => (await table(name).deleteMany(where)).deletedCount > 0,
        close: () => client.close()
    };
}
export function openStore(settings = config()) {
    return settings.db === "mongo"
        ? mongoStore(settings.mongoUrl, settings.mongoDb)
        : sqlStore(settings.db, settings.dbFile, settings.databaseUrl);
}
const runtime = globalThis;
export function getStore() {
    runtime.solidStartStudyStore ??= openStore().catch((error) => {
        runtime.solidStartStudyStore = undefined;
        throw error;
    });
    return runtime.solidStartStudyStore;
}
export async function closeStore() {
    const store = await runtime.solidStartStudyStore;
    runtime.solidStartStudyStore = undefined;
    await store?.close();
}
export function isUniqueConflict(error) {
    const code = error?.code;
    return code === "SQLITE_CONSTRAINT_UNIQUE" || code === "23505" || code === "ER_DUP_ENTRY" || code === 11000;
}
export async function one(store, table, where) {
    return (await store.list(table, where))[0];
}
export const unpack = (row) => JSON.parse(row.payload);
