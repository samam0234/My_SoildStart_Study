# study9 · 테스트와 디버깅

## ① 목표

단위·HTTP 테스트로 주요 계약을 확인하고 요청 ID, DevTools, 서버 로그로 오류를 찾는다.

## ② 📖 이론

- 단위 테스트는 부품의 자를 재는 검사, HTTP 테스트는 문 전체가 열리는지 보는 검사다. 조건을 제어하는 가짜 Store와 격리된 SQLite가 서로 다른 문제를 잡는다.
- Network에서 메소드·상태·본문을, Sources에서 클라이언트 브레이크포인트를, Node 터미널에서 서버 로그를 읽는다. LOG_REQUESTS=true로 요청 ID와 지연 시간을 구조화해 확인한다.
- 외부 API는 AI_PROVIDER=mock이 결정적인 응답을 보내게 하고 SMTP는 Mailpit에서 확인한다. 테스트 데이터베이스는 자동 생성한 임시 경로를 사용한다.

## ③ 🛠️ 실기

### 실행 단계

1. npm test로 검증·캐시·로그인 Origin 검사·저장소 주입·발췌 검색을 실행한다.
2. npm run build 후 npm run test:http로 SSR·인증·CRUD·AI·MCP 흐름을 실행한다.
3. VS Code에서 node --inspect로 서버를 실행하고 Network의 X-Request-Id와 서버 로그를 맞춰 본다.

### 전체 코드 · `tests/unit.test.mjs`

```js
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
```

#### 줄별 설명

- 1–8행 · Node의 테스트 러너와 단언을 준비한다.
- 9–19행 · 정규화와 부분 수정, 페이지 한도를 입력값 단위로 확인한다.
- 20–24행 · 파손된 JSON과 신뢰하지 않는 Origin의 오류를 기대한다.
- 25–38행 · 가짜 시계로 TTL과 동시 로딩을 재현한다.
- 39–55행 · 메모리 객체에서 실제 DB 없이 목록과 소유자 권한을 검사한다.
- 56–59행 · 한글 질문이 맞는 발췌를 먼저 찾는지 확인한다.

## ④ 🔗 연동 포인트

- study10 빌드 뒤 배포 체크리스트에 동일한 /health·/ready·인증 요청을 넣는다.
- study16의 CI에서도 같은 테스트를 실행한 결과만 배포 후보로 사용한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| EADDRINUSE | 포트 중복 | 빈 포트 또는 불필요한 이전 프로세스를 확인한다. |
| MODULE_NOT_FOUND | 의존성 미설치 | Node 24에서 npm ci를 실행한다. |
| SSR의 localStorage 오류 | 브라우저 전역 조기 호출 | onMount로 옮긴다. |
| 404 UI 또는 HTML 응답 | JSON 경로 대신 UI 경로 호출 | /api 접두어와 경로의 파일 이름을 확인한다. |
| 400 BAD_REQUEST | 파손된 JSON 또는 형식이 틀린 ID | 요청 본문과 /api/posts/숫자 경로를 확인한다. |
| 400 VALIDATION_ERROR | 공통 v1 검증 실패 | 응답 error.fields에서 필드와 길이 조건을 본다. |
| 401 UNAUTHORIZED | 누락되거나 만료된 세션 | 로그인 뒤 Set-Cookie 및 보내는 헤더를 확인한다. |
| 403 FORBIDDEN | 작성자 불일치 또는 CSRF 정책 | me/author.id와 Origin을 확인한다. |
| 503 DATABASE_UNAVAILABLE | DB 연결 또는 DB_FILE 권한 이상 | /ready, 컨테이너 로그, URL·디렉터리 권한을 확인한다. |
| SSE가 한 번에 표시됨 | 프록시가 스트림을 버퍼링함 | curl.exe -N과 개발자도구로 프레임 경계를 확인한다. |

## ⑥ 직접 해보기

1. 가짜 Store에 댓글을 하나 더 넣고 commentCount 검증을 바꿔 본다.
2. HTTP 요청에 X-Request-Id를 넣고 오류 본문과 응답 헤더가 같은지 확인한다.

## ⑦ ☐ 체크리스트

- [ ] 테스트에서 DB·AI 응답을 가짜로 바꾸기
- [ ] 요청 ID와 로그를 연결해 원인 재현
- [ ] 빌드 출력으로 HTTP 검증 실행

## ⑧ 다음 단계

[study10 · 빌드와 배포 정리](study10.md)에서 Node 서버 프리셋으로 빌드하고 HTTPS·DB 환경을 연결한 뒤 기초 구간을 점검한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
