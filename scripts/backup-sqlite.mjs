import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";

const source = resolve(process.env.DB_FILE || "data/board.db");
const target = resolve(process.argv[2] || "backups/board-" + Date.now() + ".db");
if (source === target) throw new Error("The backup must use a different file");
await mkdir(dirname(target), { recursive: true });

const db = new Database(source, { readonly: true, fileMustExist: true });
try {
  await db.backup(target);
  const copy = new Database(target, { readonly: true, fileMustExist: true });
  try {
    if (copy.pragma("integrity_check", { simple: true }) !== "ok") throw new Error("Invalid backup");
  } finally { copy.close(); }
  console.log(target);
} finally { db.close(); }
