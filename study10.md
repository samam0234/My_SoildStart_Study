# study10 · 빌드와 배포 정리

## ① 목표

Node 서버 프리셋으로 빌드하고 HTTPS·DB 환경을 연결한 뒤 기초 구간을 점검한다.

## ② 📖 이론

- 빌드는 브라우저 자산과 서버 코드를 배포 가능한 출력으로 정리한다. Nitro node-server는 상자에 앱과 시작 명령을 담듯 런타임 접점을 만든다.
- DNS는 운영 도메인을 IP로 연결하고 TLS 인증서는 HTTPS에서 서버 주소의 신원과 암호화를 제공한다. 프록시가 TLS를 종료하면 앱의 APP_ORIGIN은 공개 HTTPS 주소다.
- 기초 흐름은 페이지 HTML→중첩 경로→query/createAsync→action→저장소→세션→테스트다.

## ③ 🛠️ 실기

### 실행 단계

1. npm ci, npm run check, npm test, npm run build, npm run test:http를 실행한다. JSX 빌드는 npm run build:jsx를 사용한다.
2. npm start 또는 node --env-file-if-exists=.env tsx_version/.output/server/index.mjs로 운영 산출물을 시작한다.
3. 배포 목표에 Node 24, 설치 의존성, .output, 실행 명령을 준비한다. 운영 환경에 PORT·HOST·APP_ORIGIN·DB_CLIENT·DATABASE_URL을 지정한다.
4. 도메인 DNS를 프록시에 연결하고 TLS 인증서를 설정한다. /health 200, /ready 200, SSR 화면, 로그인 쿠키 Secure, 등록·수정·삭제를 점검한다.

### 전체 코드 · `scripts/run-vite.mjs`

```js
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [version, ...args] = process.argv.slice(2);
if (!["tsx_version", "jsx_version"].includes(version)) throw new Error("Specify a course version");
const cwd = fileURLToPath(new URL("../" + version + "/", import.meta.url));
const cli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const result = spawnSync(process.execPath, [cli, ...args], { cwd, stdio: "inherit" });
process.exitCode = result.status ?? 1;
```

#### 줄별 설명

- 1–3행 · 상위 npm 명령에서 Vite 프로세스를 실행할 수 있게 한다.
- 4행 · 앱 버전과 Vite 옵션을 분리한다.
- 5행 · 지원하는 폴더 이름만 허용한다.
- 6행 · 앱 경로를 계산해 프로세스 작업 위치를 고정한다.
- 7행 · 루트에 설치한 Vite CLI를 직접 호출한다.
- 8–9행 · Vite의 출력과 종료 코드를 상위 명령에 전달한다.

### 전체 코드 · `tsx_version/src/routes/ready.ts`

```ts
import type { APIEvent } from "@solidjs/start/server";
import { getStore } from "../server/db";
import { ApiError, api, json } from "../server/http";

export const GET = ({ request }: APIEvent) => api(request, async () => {
  try { await (await getStore()).list("posts", { id: 0 }); }
  catch { throw new ApiError(503, "DATABASE_UNAVAILABLE", "저장소에 연결할 수 없습니다."); }
  return json({ status: "ready" });
});
```

#### 줄별 설명

- 1행 · API 요청 이벤트 타입을 읽는다.
- 2–4행 · 실행할 DB 연결을 준비한다.
- 5–6행 · 테이블에 실제 조회를 보내 준비 상태를 확인한다.
- 7행 · 연결 실패 때 상태 코드를 503으로 반환한다.
- 8–9행 · 조회 성공이면 준비 상태를 200으로 반환한다.

## ④ 🔗 연동 포인트

- 기초 배포 방법을 midpoint의 게시판에 적용한다. study16은 Docker 이미지·CI·백업 자동화를 덧붙인다.
- SQLite를 쓸 때 DB_FILE은 영속 디스크에 두고, 외부 DB에서는 데이터베이스 URL과 방화벽 연결을 확인한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 운영에서 /health만 200 | 서버는 떴지만 DB 접근 실패 | /ready와 DB 주소·인증·영속 볼륨 권한을 확인한다. |
| 사이트 주소에서 로그인 반복 실패 | TLS 설정과 APP_ORIGIN 또는 쿠키 설정이 어긋남 | 공개 HTTPS 주소와 Set-Cookie 속성을 확인한다. |
| 빌드는 됐는데 서버에서 모듈 로딩 실패 | 배포에 런타임 npm 의존성 또는 OS용 네이티브 바이너리가 빠짐 | 같은 운영 환경에서 npm ci --omit=dev로 설치한다. |

## ⑥ 직접 해보기

1. 개발 서버를 종료한 뒤 npm start로 첫 화면을 검증한다.
2. 운영 요청에서 DevTools Network를 열어 문서 응답과 SSR 데이터를 확인한다.

## ⑦ ☐ 체크리스트

- [ ] SSR, 스트리밍, 배포 프리셋 확인
- [ ] 배포 후 /health·/ready 및 쿠키·CRUD 확인
- [ ] 도메인·HTTPS와 DB 영속 저장 확인

## ⑧ 다음 단계

[studyMidpoint · 세션 게시판](studyMidpoint.md)에서 study0~10의 SolidStart 기초만으로 가입·로그인·글과 댓글 CRUD 게시판을 완성한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
- [SolidStart v2와 배포 플러그인](https://docs.solidjs.com/solid-start/v2)
