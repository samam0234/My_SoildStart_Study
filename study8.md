# study8 · 구조화와 재사용

## ① 목표

라우트·UI·서비스·저장소·환경 설정을 분리하고 개발과 운영의 값을 분리한다.

## ② 📖 이론

- 라우트는 브라우저 요청을 받는 문, 서비스는 규칙을 적용하는 작업실, 저장소는 실제 데이터를 보관하는 창고다. 같은 등록 로직을 API와 서버 action이 재사용한다.
- 설정은 config()에서 검증하고 Vite 개발 환경은 루트 .env를 읽는다. 운영 설정은 실행 시 컨테이너 환경이나 배포 시크릿으로 주입한다.
- server 모듈을 클라이언트 UI에서 직접 쓰지 않는다. board-data의 서버 함수 본문으로 필요한 동작을 감싼다.

## ③ 🛠️ 실기

### 실행 단계

1. src/routes, src/components, src/features, src/server를 열고 각각 한 파일의 입력·출력을 적는다.
2. PostForm이 /board와 상세 수정에서 쓰이는 경로를 따라간다.
3. npm run sync:jsx로 동일 기능의 JSX 소스를 갱신하고 npm run check로 TSX를 확인한다. 사용자 화면 변경은 원본 TSX에서 작업한다.

### 전체 코드 · `tsx_version/src/server/config.ts`

```ts
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
  } as const;
}
```

#### 줄별 설명

- 1행 · 환경 값을 일반 객체로 주입할 수 있어 설정 단위 검증이 쉽다.
- 2행 · 기본 DB 선택은 SQLite다.
- 3–6행 · 지원하지 않는 클라이언트 문자열을 거절한다.
- 7–9행 · 파일 경로와 DB 주소를 구분해 읽는다.
- 10행 · Mongo 데이터베이스 이름 기본값을 둔다.
- 11–12행 · 주소에서 Origin만 읽어 CORS·CSRF 정책과 일치시킨다.
- 13–16행 · HTTPS 또는 명시 설정에서 Secure 쿠키를 사용한다.

## ④ 🔗 연동 포인트

- study9에서 서비스에 가짜 Store를 주입하고 실제 요청은 다른 임시 SQLite로 테스트한다.
- 실제 Vite 시크릿은 VITE_ 접두사 없이 서버에서만 읽는다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 빌드 후 환경 파일만 바꿨는데 반영되지 않음 | 운영 프로세스가 새 환경으로 시작하지 않음 | 운영 환경 변수를 바꾸고 프로세스를 재시작한다. |
| 클라이언트 번들에 server-only 오류 | UI가 서버 전용 모듈을 직접 가져옴 | API 또는 서버 함수 본문을 통해 값을 받는다. |

## ⑥ 직접 해보기

1. 새 환경 값 하나를 .env.example과 config에 정의하고 잘못된 값을 거절한다.
2. PostForm의 공통 필드 규칙과 서버 검증의 책임을 구분해 적어 본다.

## ⑦ ☐ 체크리스트

- [ ] 개발·운영 설정과 비밀 분리
- [ ] 공통 HTTP·검증·DB 모듈 재사용
- [ ] JSX·TSX 동기화

## ⑧ 다음 단계

[study9 · 테스트와 디버깅](study9.md)에서 단위·HTTP 테스트로 주요 계약을 확인하고 요청 ID, DevTools, 서버 로그로 오류를 찾는다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
