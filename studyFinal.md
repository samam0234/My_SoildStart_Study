# studyFinal · 게시판과 문서 AI 작업실

## ① 목표

세션 게시판을 PostgreSQL, 외부 연동, 문서 AI, 실시간 알림과 자동 배포를 갖춘 SolidStart 서비스로 완성한다.

## ② 📖 이론

- 쓰기 검증, 사용자 권한, 공통 HTTP 형식은 게시판과 작업실이 재사용한다. 서비스와 Store를 분리하면 입출력 계약을 유지하며 저장소를 교체할 수 있다.
- 문서 작업실은 저장·발췌·모델 호출·SSE·기록의 흐름을 따른다. 개인 기록을 다루는 작업실과 누구나 볼 수 있는 게시판은 소유권을 독립적으로 검사한다. 출입구가 같아도 열람 가능한 문서함은 사용자마다 다르다.

## ③ 🛠️ 실기

### 기능 목록

- 세션 게시판과 공통 API v1, 댓글·작성자 권한·OpenAPI
- SQLite에서 PostgreSQL로 전환하며 MariaDB·MongoDB 드라이버 실습
- 문서 업로드·발췌 기반 AI 요약과 질의·SSE·기록·MCP 검색
- Stripe Checkout, 서명된 webhook, SMTP 백그라운드 전송, GitHub OAuth
- 공개 게시판 WebSocket 알림, TTL 캐시, Docker 준비 검사, CI/CD와 백업

### 폴더 구조

```text
tsx_version/
  src/routes/{posts,account,board,workbench,api}/
  src/components/   재사용 가능한 폼과 알림
  src/features/     서버 함수·브라우저 스트림·상태
  src/server/       저장소·보안·업무 규칙·연동
  server/{routes,plugins}/  WebSocket·메일 작업
jsx_version/         같은 동작의 JavaScript/JSX
.github/workflows/   검사·이미지 게시·스테이징 배포
```

### 구현 순서

1. studyMidpoint에서 v1 게시판·댓글·쿠키를 검증하고 PostgreSQL로 DB 설정을 옮긴다. 기존 데이터가 있다면 소유자 ID와 댓글 parent 보존을 확인한다.
2. study12~13에서 UI 위젯·폼·Store와 연동 API를 연결한다. Stripe·OAuth는 테스트 자격증명을 사용하고 메일은 Mailpit에서 확인한다.
3. study14~15에서 OpenAPI, 캐시, 메일 큐, 요청 로그와 성능 측정을 적용한다.
4. study17~18에서 알림과 파일 한도, 문서 소유권, mock 또는 모델 SSE, stdio/HTTP MCP를 검증한다.
5. study16의 CI와 Docker 스테이징 배포를 거쳐 /ready·TLS·세션·WebSocket·SSE·DB 백업 복원까지 점검한다.

### 전체 코드 · `compose.yml`

```yaml
services:
  app:
    image: ${SOLIDSTART_IMAGE:-solidstart-study:local}
    build: .
    ports: ["${BIND_HOST:-127.0.0.1}:${APP_PORT:-3000}:3000"]
    env_file:
      - path: .env
        required: false
    environment:
      APP_ORIGIN: ${APP_ORIGIN:-http://localhost:3000}
      DB_CLIENT: ${DB_CLIENT:-pg}
      DATABASE_URL: ${DATABASE_URL:-postgresql://board:board@db:5432/board}
      SMTP_URL: ${SMTP_URL:-}
      MAIL_FROM: ${MAIL_FROM:-}
      LOG_REQUESTS: "true"
    volumes: ["app-data:/app/data"]
    depends_on:
      db: { condition: service_healthy }
    restart: unless-stopped
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: board
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-board}
      POSTGRES_DB: board
    volumes: ["db-data:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U board -d board"]
      interval: 5s
      timeout: 3s
      retries: 15
    restart: unless-stopped
  mariadb:
    image: mariadb:11.4
    profiles: ["drivers"]
    environment:
      MARIADB_ROOT_PASSWORD: board-root-local
      MARIADB_USER: board
      MARIADB_PASSWORD: board
      MARIADB_DATABASE: board
    ports: ["127.0.0.1:33316:3306"]
  mongo:
    image: mongo:8
    profiles: ["drivers"]
    ports: ["127.0.0.1:33317:27017"]
  mailpit:
    image: axllent/mailpit:latest
    profiles: ["mail"]
    ports: ["127.0.0.1:1025:1025", "127.0.0.1:8025:8025"]
volumes:
  app-data:
  db-data:
```

#### 줄별 설명

- 1–2행 · 앱과 PostgreSQL, 실습 서비스의 컨테이너를 정의한다.
- 3–4행 · 스테이징에서 커밋 SHA의 이미지 URL로 바꿀 수 있게 한다.
- 5–8행 · 바인딩 호스트와 포트를 환경 값으로 분리한다.
- 9–13행 · 앱의 공개 Origin과 DB 연결 주소를 전달한다.
- 14–16행 · DB 헬스체크 성공 후 앱을 시작한다.
- 17–22행 · PostgreSQL 버전과 계정·DB를 지정한다.
- 23–28행 · pg_isready로 DB 시작 상태를 확인한다.
- 29–43행 · 드라이버 실습에만 MariaDB와 MongoDB를 연다.
- 44–46행 · SMTP 실습용 Mailpit을 선택 실행한다.
- 47–52행 · 앱 및 PostgreSQL 데이터를 이름 있는 볼륨에 저장한다.

## ④ 🔗 연동 포인트

- 기초 게시판과 심화 작업실이 같은 세션 및 저장소 경계를 사용한다. GitHub Actions 배포 전에 도메인·비밀·PG 백업을 별도로 준비한다.
- 동작 재현은 README, 1차 흐름은 studyMidpoint, 운영 확인은 study16, AI 공급자·MCP 설정은 study18을 사용한다.

### DB·API 연동 구성도

```text
브라우저 ── SolidStart SSR·action·JSON API ── PostgreSQL
   │                   ├─ 계정·공개 게시판·문서 소유권
   ├──── SSE ──────────┤  문서 → 발췌 → 모델 → 기록
   └──── WebSocket ────┤  공개 게시판 변경 알림
                       ├─ Stripe · SMTP · GitHub OAuth
MCP 클라이언트 ─ /mcp ──┘  공개 게시판 검색
GitHub Actions ── GHCR 이미지 ── Docker Compose ── HTTPS 프록시
```

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| Cloud 프록시 뒤 실시간 연결 실패 | WebSocket Upgrade 또는 APP_ORIGIN 오류 | HTTPS·wss·업그레이드 헤더를 확인한다. |
| 파일은 올라가는데 AI 답변 안 나옴 | 자격증명·모델 설정·할당량 또는 프록시 버퍼링 | mock으로 먼저 확인하고 서버 AI 상태와 SSE 프레임을 본다. |
| 배포 버전에서 DB 데이터가 비어 있음 | 새 DB나 볼륨이 연결됨 | 운영 Compose 프로젝트, 볼륨, DATABASE_URL을 대조한다. |

## ⑥ 직접 해보기

1. 두 계정으로 한 계정의 글 수정과 문서를 다른 계정에서 접근해 거절되는지 확인한다.
2. 새 이미지와 이전 이미지를 차례로 스테이징에 올려 롤백 뒤 데이터 보존을 확인한다.
3. 외부 모델을 연결한 뒤 mock 결과와 근거·응답 시간·사용량을 비교한다.

## ⑦ ☐ 체크리스트

### 배포 점검

- [ ] PostgreSQL 생성·조회·수정·삭제와 볼륨 재시작 확인
- [ ] Stripe·SMTP·OAuth 테스트 설정과 통합 확인
- [ ] 파일 소유권·SSE·구독·MCP 검증
- [ ] 두 버전의 타입/빌드/HTTP 및 보안 테스트 확인
- [ ] Docker /ready, TLS, GitHub Actions, 백업·복원·사용자 권한 확인

### 회고

한 프로젝트에서 서버 렌더링과 공개 API가 게시판 규칙을 재사용하고, 문서 AI에 별도의 데이터 소유권과 한도를 적용했다. 다중 인스턴스 공유 캐시·알림, 청크 검색 품질 측정, 실제 서비스 지표와 백업 복원 주기를 다음 개선에 남긴다.

## ⑧ 다음 단계

다음 반복에서는 [study16](study16.md)의 복원 절차와 [study18](study18.md)의 모델 검증을 새 DB와 스테이징에서 기록한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
