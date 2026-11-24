# study11 · DB 확장

## ① 목표

같은 SolidStart 게시판을 PostgreSQL, MariaDB, MongoDB에 연결하고 저장소 설정 차이를 검증한다.

## ② 📖 이론

- Store는 SolidStart 서비스에 동일한 list/insert/update/remove 계약을 준다. 콘센트와 기기 사이에 어댑터를 바꾸듯 UI와 HTTP 경로를 유지하고 드라이버를 바꾼다.
- SQL에서는 Knex 스키마와 쿼리 빌더를 사용한다. PostgreSQL은 pg 드라이버와 RETURNING, MariaDB는 mysql2 드라이버와 생성 ID를 사용한다. SQLite는 better-sqlite3와 로컬 파일을 쓴다. MongoDB는 공식 드라이버, 컬렉션·인덱스, 원자적 숫자 카운터를 쓴다.
- ORM 설계에서 관계형 모델은 스키마 마이그레이션·FK·JOIN을 적용하는 위치가 핵심이고 MongoDB의 모델은 문서 임베딩 또는 참조와 인덱스가 기준이다. 이 실습은 JSON payload를 공유하며 owner/parent는 검색 가능한 필드로 두고 스키마 차이를 어댑터에 모은다.

## ③ 🛠️ 실기

### 실행 단계

1. SQLite 기본 경로로 npm run test:db를 실행한다.
2. PostgreSQL은 Docker Compose 기본 db 서비스, DB_CLIENT=pg와 DATABASE_URL=postgresql://board:board@db:5432/board를 사용한다. 호스트 실행에서 DB에 접근하려면 포트를 의도적으로 게시하고 db 대신 localhost를 쓴다.
3. docker compose --profile drivers up -d mariadb mongo를 실행한다. MariaDB는 DB_CLIENT=mysql2 및 DATABASE_URL=mysql://board:board@127.0.0.1:33316/board, MongoDB는 DB_CLIENT=mongo, MONGODB_URL=mongodb://127.0.0.1:33317, MONGODB_DB=solidstart를 설정한다.
4. 각 설정에서 npm run test:db로 CRUD를 확인한다. 기존 데이터가 있으면 원본 백업·읽기 전용 전환·ID 및 owner/parent를 보존한 이관·행 수와 소유권 검증을 순서대로 수행한다. 설정 변경의 기본예제는 새 DB에서 시작한다.

### 전체 코드 · `scripts/check-db.mjs`

```js
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
```

#### 줄별 설명

- 1–2행 · Node 단언과 충돌 방지용 무작위 식별자를 가져온다.
- 3–6행 · 환경 변수와 선택된 DB Store에 접근한다.
- 7–12행 · DB를 열고 같은 게시판 서비스에 주입한다.
- 13–16행 · 격리된 데이터로 게시글을 등록한다.
- 17–23행 · 검색·댓글·부분 수정·삭제 결과를 검증한다.
- 24–32행 · 테스트가 만든 데이터만 정리하고 연결을 닫는다.

### 전체 코드 · `tsx_version/src/server/db.ts`

```ts
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import type { Knex } from "knex";
import { MongoClient, type Db } from "mongodb";
import { config } from "./config.ts";

// Knex loads dialect and native driver packages at runtime in Node.
const loadPackage = createRequire(import.meta.url);
const createKnex: typeof import("knex").default = loadPackage("knex");

export type Row = { id: number; key: string | null; owner: number | null; parent: number | null; payload: string };
export type Table = "users" | "posts" | "comments" | "sessions" | "documents" | "jobs" | "ai_history" | "ai_budget" | "payments";
type Filter = Partial<Row>;
type Insert = Partial<Omit<Row, "id" | "payload">> & Pick<Row, "payload">;

export interface Store {
  list(table: Table, where?: Filter): Promise<Row[]>;
  insert(table: Table, row: Insert): Promise<Row>;
  update(table: Table, where: Filter, payload: string): Promise<boolean>;
  remove(table: Table, where: Filter): Promise<boolean>;
  close(): Promise<void>;
}

const tables: Table[] = ["users", "posts", "comments", "sessions", "documents", "jobs", "ai_history", "ai_budget", "payments"];

async function sqlStore(client: "sqlite" | "pg" | "mysql2", filename: string, url?: string): Promise<Store> {
  if (client === "sqlite") mkdirSync(dirname(filename), { recursive: true });
  else if (!url) throw new Error("DATABASE_URL is required");

  const db = createKnex({
    client: client === "sqlite" ? "better-sqlite3" : client,
    connection: client === "sqlite" ? { filename } : url,
    useNullAsDefault: true,
    pool: { min: 0, max: client === "sqlite" ? 1 : 8 }
  });
  try {
    if (client === "sqlite") await db.raw("PRAGMA journal_mode = WAL");
    for (const name of tables) {
      if (await db.schema.hasTable(name)) continue;
      await db.schema.createTable(name, (table: Knex.CreateTableBuilder) => {
        table.increments("id").primary();
        table.string("key", 255).unique();
        table.integer("owner").nullable();
        table.integer("parent").nullable();
        table.text("payload", "longtext").notNullable();
        table.index(["owner"]);
        table.index(["parent"]);
      });
    }
  } catch (error) {
    await db.destroy();
    throw error;
  }
  return {
    list: async (name, where = {}) => db<Row>(name).where(where).orderBy("id"),
    async insert(name, row) {
      const data = { key: null, owner: null, parent: null, ...row };
      const [result] = client === "pg"
        ? await db<Row>(name).insert(data).returning("id")
        : await db<Row>(name).insert(data);
      return { ...data, id: Number(typeof result === "number" ? result : result.id) };
    },
    update: async (name, where, payload) => (await db<Row>(name).where(where).update({ payload })) > 0,
    remove: async (name, where) => (await db<Row>(name).where(where).delete()) > 0,
    close: () => db.destroy()
  };
}

async function mongoStore(url: string | undefined, database: string): Promise<Store> {
  if (!url) throw new Error("MONGODB_URL is required");
  const client = new MongoClient(url, { maxPoolSize: 8, serverSelectionTimeoutMS: 5000 });
  let db: Db;
  try {
    await client.connect();
    db = client.db(database);
    for (const name of tables) {
      await db.collection<Row>(name).createIndexes([
        { key: { id: 1 }, unique: true },
        { key: { key: 1 }, unique: true, partialFilterExpression: { key: { $type: "string" } } },
        { key: { owner: 1 } },
        { key: { parent: 1 } }
      ]);
    }
  } catch (error) {
    await client.close();
    throw error;
  }
  const table = (name: Table) => db.collection<Row>(name);
  return {
    list: async (name, where = {}) => (await table(name).find(where, { projection: { _id: 0 } }).sort({ id: 1 }).toArray()),
    async insert(name, row) {
      const sequence = await db.collection<{ _id: string; next: number }>("counters")
        .findOneAndUpdate({ _id: name }, { $inc: { next: 1 } }, { upsert: true, returnDocument: "after" });
      if (!sequence) throw new Error("Sequence unavailable");
      const result = { key: null, owner: null, parent: null, ...row, id: sequence.next };
      await table(name).insertOne({ ...result });
      return result;
    },
    update: async (name, where, payload) => (await table(name).updateOne(where, { $set: { payload } })).matchedCount > 0,
    remove: async (name, where) => (await table(name).deleteMany(where)).deletedCount > 0,
    close: () => client.close()
  };
}

export function openStore(settings = config()): Promise<Store> {
  return settings.db === "mongo"
    ? mongoStore(settings.mongoUrl, settings.mongoDb)
    : sqlStore(settings.db, settings.dbFile, settings.databaseUrl);
}

const runtime = globalThis as typeof globalThis & { solidStartStudyStore?: Promise<Store> };
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

export function isUniqueConflict(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  return code === "SQLITE_CONSTRAINT_UNIQUE" || code === "23505" || code === "ER_DUP_ENTRY" || code === 11000;
}

export async function one(store: Store, table: Table, where: Filter) {
  return (await store.list(table, where))[0];
}

export const unpack = <T>(row: Row): T => JSON.parse(row.payload) as T;
```

#### 줄별 설명

- 1–11행 · 파일 경로·네이티브 SQL 드라이버 로더·MongoDB 연결을 가져온다.
- 12–27행 · 공통 Row와 Store 입력·출력 형태를 정의한다.
- 28–39행 · 환경에 따라 SQLite와 네트워크 SQL 설정을 고른다.
- 40–56행 · 초기 테이블과 탐색 인덱스를 만든다.
- 57–73행 · 공통 CRUD를 SQL 쿼리로 연결한다.
- 74–93행 · MongoDB 컬렉션과 중복 메일·ID 인덱스를 생성한다.
- 94–110행 · MongoDB 데이터 입력에는 증가 카운터를 사용한다.
- 111–130행 · 환경별 Store를 선택하고 연결 성공을 공유한다.
- 131–136행 · 엔진별 고유 키 위반과 행 변환을 공통으로 처리한다.

## ④ 🔗 연동 포인트

- 서비스와 API 계약을 고정했으므로 study12의 UI와 study18의 문서 저장도 DB 교체 뒤 같은 경로를 사용한다.
- ORM으로 확장하는 경우 PostgreSQL용 Drizzle은 drizzle-orm/node-postgres, pgTable, Drizzle Kit의 dialect=postgresql을 조합한다. MariaDB 접속은 mysql2와 MySQL 방언을 사용하며 실제 MariaDB 버전에서 생성된 마이그레이션을 먼저 검증한다. 스키마에는 mysqlTable, 설정에는 dialect=mysql을 둔다. MongoDB에서 Mongoose를 사용하면 mongoose.connect(MONGODB_URL, { dbName })으로 연결하고 new Schema()로 문서를 정의한다. 인덱스와 참조 필드는 스키마에서 관리한다.
- 로컬 Mongo 예제는 테스트용 단일 노드를 사용한다. 운영에서 다중 리소스를 한 번에 바꾸는 기능이 늘면 트랜잭션 가능한 배치와 복제 구성을 설계한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| ECONNREFUSED | 컨테이너 준비 전이거나 호스트 이름이 틀림 | docker compose ps와 DB 포트를 확인한다. |
| Mongo 로그인 또는 서버 선택 실패 | URL, 인증 DB 또는 접근 설정 불일치 | MONGODB_URL과 MONGODB_DB를 확인한다. |
| DB 바꾼 뒤 예전 글이 없음 | 대상은 새 데이터 저장소 | 기존 자료가 필요하면 이관 절차 후 원본과 대상의 수와 ID를 대조한다. |

## ⑥ 직접 해보기

1. 세 드라이버에서 같은 테스트를 실행하고 차이가 생기는 설정을 적는다.
2. 정상 연결을 끊고 /ready의 503을 재현한다.

## ⑦ ☐ 체크리스트

- [ ] PostgreSQL·MariaDB·MongoDB 설정과 CRUD 확인
- [ ] SQL 생성 ID와 MongoDB 카운터 차이 이해
- [ ] 이관 전에 원본과 복원 절차 확인

## ⑧ 다음 단계

[study12 · 프론트 UI와 상태·폼 연동](study12.md)에서 Kobalte, Solid Store, Modular Forms를 사용해 문서 작업실 입력과 상태를 연결한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
- [Knex 지원 클라이언트](https://knexjs.org/guide/)
- [MongoDB Node 드라이버](https://www.mongodb.com/docs/drivers/node/current/)
- [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle MySQL](https://orm.drizzle.team/docs/get-started/mysql-new)
- [Mongoose 스키마](https://mongoosejs.com/docs/guide.html)
