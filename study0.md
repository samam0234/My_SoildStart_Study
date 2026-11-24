# study0 · 환경 설정

## ① 목표

Node.js 24에서 SolidStart 프로젝트를 생성하고 개발 서버와 Git, 환경 변수를 준비한다.

## ② 📖 이론

- SolidStart는 파일 기반 경로와 SSR, 서버 함수로 게시판의 화면과 서버 로직을 한 프로젝트에서 관리한다. SSR은 서버가 첫 화면용 HTML을 미리 조립하는 과정이다.
- Vite는 개발 중 바뀐 모듈을 갱신하며 빌드를 담당한다. Nitro의 프리셋은 빌드 결과를 어디서 실행할지 정한다. SSR은 식당에서 먼저 차려 주는 첫 상, 하이드레이션은 식탁에 주문 버튼을 연결하는 일과 비슷하다.
- 루트는 의존성과 문서를 공유한다. tsx_version/src/routes는 URL, src/components는 UI 조각, src/features는 화면 기능, src/server는 브라우저에 보내지 않는 저장소 코드, server/routes는 Nitro 확장 경로다. jsx_version은 같은 코드에서 타입을 제거한 실행 버전이다.

## ③ 🛠️ 실기

### 실행 단계

1. Node.js 24 LTS와 Git을 설치하고 PowerShell에서 node --version, npm --version, git --version을 실행한다.
2. 별도 실습 폴더 만들기: npm init solid@latest -- solidstart-sandbox bare --solidstart --v2 --ts. 생성 폴더에서 npm install을 실행한다.
3. 이 저장소에서 npm ci, npm ls @solidjs/start @solidjs/router, Copy-Item .env.example .env, npm run dev -- --port 3000 --strictPort 순서로 실행한다. http://localhost:3000/에서 첫 화면을 연다.
4. VS Code의 기본 TypeScript 언어 기능과 ESLint(dbaeumer.vscode-eslint), Prettier(esbenp.prettier-vscode), Docker(ms-azuretools.vscode-docker) 확장을 상황에 맞춰 사용한다. 새 연습 폴더는 git init -b main, git status를 실행한다. 기존 클론에서는 git status로 워킹 트리를 확인한다.
5. git check-ignore .env로 비밀 파일 제외를 확인한다. .env.example에는 키 이름과 공개 가능한 기본값만 적는다.

### 전체 코드 · `tsx_version/vite.config.ts`

```ts
import { defineConfig, loadEnv } from "vite";
import { nitro } from "nitro/vite";
import { solidStart } from "@solidjs/start/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const envDir = fileURLToPath(new URL("..", import.meta.url));
export default defineConfig(({ mode }) => {
  for (const [key, value] of Object.entries(loadEnv(mode, envDir, ""))) {
    process.env[key] ??= value;
  }
  return {
    root,
    envDir,
    plugins: [solidStart({ middleware: "./src/middleware.mjs" }), nitro()],
    nitro: {
      rootDir: root,
      serverDir: "./server",
      preset: "node-server",
      features: { websocket: true }
    }
  };
});
```

#### 줄별 설명

- 1행 · Vite 설정과 실행 모드별 환경 파일 로더를 가져온다.
- 2행 · Nitro 플러그인을 불러 Node 서버 결과물을 만든다.
- 3–5행 · SolidStart 플러그인이 SSR·서버 함수·라우팅을 구성한다.
- 6–7행 · 두 앱 경로와 루트 환경 파일 위치를 계산한다.
- 8행 · mode가 development/production 파일을 구분한다.
- 9–11행 · 이미 주입된 운영 변수를 유지하면서 .env 기본값을 채운다.
- 12–14행 · SolidStart와 Nitro에 같은 앱 디렉터리를 연결한다.
- 15–23행 · Node 배포 대상과 WebSocket 기능을 명시한다.

## ④ 🔗 연동 포인트

- 로컬 .env의 APP_ORIGIN을 개발 주소와 일치시킨다. 뒤에서 쿠키와 WebSocket 요청 Origin 검사에 쓰인다.
- study1에서 src/routes/index.tsx를 수정하면서 HMR을 관찰한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| npm 명령을 찾을 수 없음 | Node 설치 경로가 터미널 PATH에 반영되지 않음 | 터미널을 다시 시작하고 node --version을 확인한다. |
| 포트 3000 바인딩 실패 | 다른 프로세스가 포트를 사용 중 | 빈 포트를 정하고 APP_ORIGIN도 같은 포트로 설정한다. |
| 템플릿 경로 ENOENT | 생성기 프로젝트 이름에 Windows 절대 경로를 넘김 | 부모 폴더로 이동하고 단일 폴더 이름을 전달한다. |

## ⑥ 직접 해보기

1. JSX 앱을 npm run dev:jsx -- --port 3001로 열고 포트를 확인한다.
2. Git이 .env를 무시하고 .env.example은 추적할 수 있는지 확인한다.

## ⑦ ☐ 체크리스트

- [ ] `npm init solid@latest`로 SolidStart 템플릿 생성
- [ ] Node 24, SolidStart 패키지 버전과 .env 제외 규칙 확인

## ⑧ 다음 단계

[study1 · Hello World와 기본 문법](study1.md)에서 SolidStart의 첫 화면을 SSR로 띄우고 JSX에서 표현식과 이벤트를 읽는다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
- [SolidStart v2 개요](https://docs.solidjs.com/solid-start/v2)
