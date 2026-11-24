# study7 · 인증과 보안 기초

## ① 목표

가입·로그인·로그아웃을 실습하고 세션 쿠키와 작성자 권한으로 쓰기 경로를 보호한다.

## ② 📖 이론

- 인증은 신원을 확인하고 인가는 그 사용자가 특정 글을 수정할 수 있는지 확인한다. 출입증이 있는지와 그 방의 열쇠가 있는지는 별개의 검사다.
- 서버는 scrypt와 무작위 salt로 비밀번호를 해싱한다. 로그인하면 1시간 세션 토큰을 발급하고 저장소에는 해당 토큰의 SHA-256 다이제스트만 둔다. API는 Bearer를, 같은 Origin UI는 HttpOnly 쿠키를 읽는다.
- XSS를 줄이기 위해 게시글·AI 결과를 JSX 텍스트로 렌더링한다. CSRF에는 SameSite=Lax와 상태 변경 요청 Origin 검사, CORS에는 한 개의 명시적 출처를 둔다. HTTPS 운영에서는 Secure 쿠키를 발급한다.

## ③ 🛠️ 실기

### 실행 단계

1. /account에서 가입 후 로그인한다. Network의 Set-Cookie와 GET /api/auth/me를 확인한다.
2. 로그인하지 않은 /board 요청은 /account로 리디렉션되고, 작성 API는 401을 보낸다. 작성자와 다른 계정으로 수정 요청을 보내 403을 확인한다.
3. 로그아웃 후 이전 쿠키와 Bearer 토큰으로 /api/auth/me를 다시 호출한다. 둘 다 폐기된 세션을 가리켜 401이 된다.

### 전체 코드 · `tsx_version/src/routes/api/auth/[operation].ts`

```ts
import type { APIEvent } from "@solidjs/start/server";
import { login, requireUser, revoke, sessionCookie, signup } from "../../../server/auth";
import { api, json, missing, objectBody, options } from "../../../server/http";

export const OPTIONS = options;
export const GET = ({ request, params }: APIEvent) => api(request, async () => {
  if (params.operation !== "me") throw missing();
  return json({ data: await requireUser(request) });
});
export const POST = ({ request, params }: APIEvent) => api(request, async () => {
  switch (params.operation) {
    case "signup": return json({ data: await signup(await objectBody(request)) }, 201);
    case "login": {
      const data = await login(await objectBody(request));
      return json({ data }, 200, { "Set-Cookie": sessionCookie(data.accessToken) });
    }
    case "logout":
      await requireUser(request);
      await revoke(request);
      return new Response(null, { status: 204, headers: { "Set-Cookie": sessionCookie() } });
    default: throw missing();
  }
});
```

#### 줄별 설명

- 1행 · 실습에서 사용할 모듈을 불러오고 입력·출력 경계를 연결한다.
- 2–4행 · 인증 서비스·쿠키·폐기 함수를 불러온다.
- 5행 · CORS 프리플라이트를 등록한다.
- 6–10행 · me의 GET만 공개 경로 이름으로 분기하며 사용자 조회는 인증이 필요하다.
- 11행 · 가입은 data와 201을 보낸다.
- 12–15행 · 로그인은 user/accessToken과 HttpOnly Set-Cookie를 보낸다.
- 16–20행 · 로그아웃이 토큰을 폐기하고 쿠키를 만료한다.
- 21–23행 · 없는 작업 이름은 404로 응답한다.

### 전체 코드 · `tsx_version/src/middleware.mjs`

```js
import { createMiddleware } from "@solidjs/start/middleware";
import { currentUser } from "./server/auth";

const privatePages = new Set(["/board", "/workbench"]);

export default createMiddleware([async (event, next) => {
  const path = new URL(event.req.url).pathname.replace(/\/$/, "");
  if ((event.req.method === "GET" || event.req.method === "HEAD") && privatePages.has(path)) {
    if (!await currentUser(event.req)) return new Response(null, {
      status: 302, headers: { Location: "/account", "Cache-Control": "no-store" }
    });
    const response = await next();
    event.res.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  return next();
}]);
```

#### 줄별 설명

- 1–3행 · SolidStart 서버 요청 미들웨어를 생성한다.
- 4–6행 · 인증이 필요한 화면 URL을 지정한다.
- 7행 · 서버에서 최초 GET 또는 HEAD의 인증을 확인한다.
- 8–10행 · 비로그인은 302 응답으로 이동한다.
- 11–14행 · 인증 화면의 공유 캐시 저장을 차단한다.
- 15–17행 · 그 외 요청은 다음 핸들러로 보낸다.

## ④ 🔗 연동 포인트

- 설정 서비스에서 APP_ORIGIN·CORS_ORIGIN·COOKIE_SECURE를 읽는다. 배포에서는 운영 도메인과 HTTPS를 연결한다.
- study13 OAuth 콜백에서 동일한 세션 발급 함수를 재사용한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 로그인 후 지속적인 401 | 앱과 다른 호스트로 요청했거나 HTTP에서 Secure 쿠키 사용 | APP_ORIGIN을 맞추고 브라우저 쿠키 및 HTTPS를 확인한다. |
| 본인 글인데 403 | 다른 세션이 요청에 들어갔거나 Origin이 틀림 | me 응답 id와 글의 author.id, 요청 Origin을 확인한다. |
| 로그인 실패가 모든 경우 같은 문구 | 계정 존재 여부를 숨기는 서버 정책 | 개발 테스트에서 유효한 계정/비밀번호를 별도로 사용한다. |

## ⑥ 직접 해보기

1. 쓰기 요청의 Origin을 다른 출처로 바꾸고 403을 확인한다.
2. 로그아웃 후 이전 Bearer 토큰의 요청이 거절되는지 점검한다.
3. 본문을 <script>로 시작하는 텍스트로 저장해 HTML이 실행되지 않는지 확인한다.

## ⑦ ☐ 체크리스트

- [ ] 서버 세션 쿠키로 로그인과 보호된 라우트
- [ ] scrypt 해시·세션 폐기·작성자 권한 확인
- [ ] CORS·XSS·CSRF 기본 보호 확인

## ⑧ 다음 단계

[study8 · 구조화와 재사용](study8.md)에서 라우트·UI·서비스·저장소·환경 설정을 분리하고 개발과 운영의 값을 분리한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
- [Notion 인증 · 인가](https://app.notion.com/p/3d6d7dec5e2e8113acbec80b1382c48d)
