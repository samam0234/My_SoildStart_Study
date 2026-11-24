export function config(env = process.env) {
    const db = env.DB_CLIENT || "sqlite";
    if (db !== "sqlite" && db !== "pg" && db !== "mysql2" && db !== "mongo") {
        throw new Error("DB_CLIENT must be sqlite, pg, mysql2 or mongo");
    }
    return {
        db,
        dbFile: env.DB_FILE || "data/board.db",
        databaseUrl: env.DATABASE_URL,
        mongoUrl: env.MONGODB_URL,
        mongoDb: env.MONGODB_DB || "solidstart",
        origin: new URL(env.APP_ORIGIN || "http://localhost:3000").origin,
        corsOrigin: env.CORS_ORIGIN || "",
        secureCookie: env.COOKIE_SECURE === "true" || env.APP_ORIGIN?.startsWith("https:") === true
    };
}
