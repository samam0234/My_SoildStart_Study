# study13 · 외부 서비스 연동

## ① 목표

결제·메일·문서 파일·GitHub OAuth를 SolidStart 서버의 경계에서 연결한다.

## ② 📖 이론

- Stripe Checkout에는 서버가 가격 ID를 전달하고 결제 상태는 서명된 webhook으로 확인한다. 문에 붙은 성공 알림과 영수증이 다르듯 리디렉션 결과만으로 결제를 확정하지 않는다.
- 메일은 인증된 계정의 주소로만 예약하고 SMTP 서버로 백그라운드 전송한다. 파일은 확장자, MIME, 실제 바이트와 UTF-8을 검사하고 소유자별로 저장한다.
- OAuth는 state로 로그인 시작과 콜백을 묶고 PKCE로 인가 코드를 보호한다. GitHub 사용자 ID로 연동하며 확인된 이메일을 읽고 앱 세션을 새로 만든다.

## ③ 🛠️ 실기

### 실행 단계

1. .env의 STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET에 테스트 모드 값을 넣는다. Stripe CLI로 stripe listen --forward-to localhost:3000/api/integrations/stripe-webhook을 실행한다. /workbench에서 테스트 Checkout을 누르고 해당 사용자 결제 이벤트를 확인한다.
2. docker compose --profile mail up -d mailpit을 실행한다. 호스트의 앱에서 SMTP_URL=smtp://localhost:1025, MAIL_FROM=board@example.test로 설정하고 작업실의 내게 메일 버튼을 누른 뒤 http://localhost:8025에서 확인한다.
3. /workbench에서 UTF-8 TXT/MD를 올린다. /api/documents POST의 Content-Type은 text/plain, X-Filename은 URL 인코딩 파일명이다. 최대 64 KiB다.
4. GitHub OAuth App의 callback을 http://localhost:3000/api/oauth/github/callback으로 등록하고 GITHUB_CLIENT_ID와 GITHUB_CLIENT_SECRET을 서버에 둔다. /account 링크로 로그인한다.

### 전체 코드 · `tsx_version/src/routes/api/integrations/[operation].ts`

```ts
import type { APIEvent } from "@solidjs/start/server";
import { requireUser } from "../../../server/auth";
import { api, json, missing, objectBody } from "../../../server/http";
import { checkout, enqueueMail, stripeWebhook } from "../../../server/integrations";

export const POST = ({ request, params }: APIEvent) => api(request, async () => {
  if (params.operation === "stripe-webhook") {
    await stripeWebhook(request);
    return new Response(null, { status: 204 });
  }
  const user = await requireUser(request);
  if (params.operation === "mail") {
    await enqueueMail(user);
    return json({ data: { state: "queued" } }, 202);
  }
  if (params.operation === "checkout") {
    const input = await objectBody(request);
    return json({ data: { url: await checkout(user, String(input.idempotencyKey ?? "")) } });
  }
  throw missing();
});
```

#### 줄별 설명

- 1행 · 들어오는 요청 타입을 지정한다.
- 2–3행 · 사용자별 작업을 인증하도록 한다.
- 4–6행 · 서버에서만 쓰는 결제와 메일 기능을 가져온다.
- 7–10행 · Stripe webhook은 사용자 세션 대신 자체 서명을 검사한다.
- 11행 · 일반 작업은 앱 로그인 사용자만 호출할 수 있다.
- 12–15행 · 메일을 큐에 추가하고 아직 발송 전임을 202로 알린다.
- 16–19행 · 멱등 키로 Checkout을 시작하고 이동 주소를 반환한다.
- 20–21행 · 지원하지 않는 이름은 공통 오류를 반환한다.

### 전체 코드 · `tsx_version/src/server/integrations.ts`

```ts
import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import Stripe from "stripe";
import { githubUser, sessionCookie, type User } from "./auth.ts";
import { config } from "./config.ts";
import { getStore, isUniqueConflict, unpack } from "./db.ts";
import { limitedBytes } from "./documents.ts";
import { ApiError, badRequest, forbidden } from "./http.ts";

const unavailable = () => new ApiError(503, "SERVICE_UNAVAILABLE", "서비스 설정을 확인하세요.");
const upstream = () => new ApiError(502, "UPSTREAM_ERROR", "외부 서비스 응답을 확인하세요.");

export async function checkout(user: User, idempotencyKey: string) {
  const { STRIPE_SECRET_KEY: secret, STRIPE_PRICE_ID: price } = process.env;
  if (!secret || !price) throw unavailable();
  if (!/^[\w-]{16,80}$/.test(idempotencyKey)) throw badRequest();
  const origin = config().origin;
  const stripe = new Stripe(secret, { timeout: 10_000, maxNetworkRetries: 1 });
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: String(user.id),
    success_url: origin + "/workbench?checkout=success",
    cancel_url: origin + "/workbench?checkout=cancel"
  }, { idempotencyKey: user.id + "/" + idempotencyKey });
  if (!session.url) throw upstream();
  return session.url;
}

export async function stripeWebhook(request: Request) {
  const { STRIPE_SECRET_KEY: key, STRIPE_WEBHOOK_SECRET: secret } = process.env;
  if (!key || !secret) throw unavailable();
  const body = await limitedBytes(request, 256 * 1024);
  let event: Stripe.Event;
  try { event = new Stripe(key).webhooks.constructEvent(body, request.headers.get("stripe-signature") ?? "", secret); }
  catch { throw badRequest(); }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    if (session.payment_status === "paid" && /^\d+$/.test(session.client_reference_id ?? "")) {
      try {
        await (await getStore()).insert("payments", {
          key: session.id,
          owner: Number(session.client_reference_id),
          payload: JSON.stringify({ status: "paid", eventId: event.id })
        });
      } catch (error) { if (!isUniqueConflict(error)) throw error; }
    }
  }
}

type Job = { email: string; state: "queued" | "sending" | "sent" | "failed"; attempts: number; nextAt: number };
export async function enqueueMail(user: User) {
  if (!process.env.SMTP_URL || !process.env.MAIL_FROM) throw unavailable();
  await (await getStore()).insert("jobs", {
    owner: user.id,
    payload: JSON.stringify({ email: user.email, state: "queued", attempts: 0, nextAt: Date.now() } satisfies Job)
  });
}

export async function workMail() {
  const { SMTP_URL: url, MAIL_FROM: from } = process.env;
  if (!url || !from) return;
  const store = await getStore();
  for (const row of (await store.list("jobs")).filter((item) => {
    const job = unpack<Job>(item);
    return (job.state === "queued" || job.state === "sending") && job.nextAt <= Date.now();
  }).slice(0, 5)) {
    const job = unpack<Job>(row);
    const claimed: Job = { ...job, state: "sending", nextAt: Date.now() + 90_000, attempts: job.attempts + 1 };
    const payload = JSON.stringify(claimed);
    if (!await store.update("jobs", { id: row.id, payload: row.payload }, payload)) continue;
    try {
      const endpoint = new URL(url);
      if (endpoint.protocol !== "smtp:" && endpoint.protocol !== "smtps:") throw new Error("Invalid SMTP protocol");
      const secure = endpoint.protocol === "smtps:";
      const transport = nodemailer.createTransport({
        host: endpoint.hostname, port: Number(endpoint.port || (secure ? 465 : 587)), secure,
        requireTLS: endpoint.searchParams.get("requireTLS") === "true",
        auth: endpoint.username ? { user: decodeURIComponent(endpoint.username), pass: decodeURIComponent(endpoint.password) } : undefined,
        connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 8000
      });
      await transport.sendMail({
        from, to: job.email, subject: "SolidStart 작업실",
        text: "작업실 메일 전송 실습입니다.",
        messageId: "<solidstart-job-" + row.id + "@" + new URL(config().origin).hostname + ">"
      });
      await store.update("jobs", { id: row.id, payload }, JSON.stringify({ ...claimed, state: "sent" }));
    } catch {
      const state = claimed.attempts < 3 ? "queued" : "failed";
      await store.update("jobs", { id: row.id, payload }, JSON.stringify({ ...claimed, state, nextAt: Date.now() + 1000 * 2 ** claimed.attempts }));
    }
  }
}

function oauthSettings() {
  const { GITHUB_CLIENT_ID: clientId, GITHUB_CLIENT_SECRET: secret } = process.env;
  if (!clientId || !secret) throw unavailable();
  return { clientId, secret, callback: config().origin + "/api/oauth/github/callback" };
}

function stateCookie(value: string, age: number) {
  return "oauth_github=" + value + "; Path=/api/oauth/github; HttpOnly; SameSite=Lax; Max-Age=" + age +
    (config().secureCookie ? "; Secure" : "");
}

export function startGithub() {
  const options = oauthSettings();
  const state = randomBytes(32).toString("hex");
  const verifier = randomBytes(32).toString("base64url");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: options.clientId, redirect_uri: options.callback, scope: "read:user user:email",
    state, code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url")
  }).toString();
  return new Response(null, { status: 302, headers: { Location: url.href, "Set-Cookie": stateCookie(state + "." + verifier, 600) } });
}

export async function finishGithub(request: Request) {
  const options = oauthSettings();
  const { searchParams } = new URL(request.url);
  const [state, verifier] = (/\boauth_github=([^;]+)/.exec(request.headers.get("cookie") ?? "")?.[1] ?? "").split(".");
  const code = searchParams.get("code");
  if (!code || !state || !verifier || searchParams.get("state") !== state) throw forbidden();

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST", signal: AbortSignal.timeout(10_000),
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: options.clientId, client_secret: options.secret, code, code_verifier: verifier, redirect_uri: options.callback })
  });
  if (!response.ok) throw upstream();
  const { access_token: token } = await response.json();
  if (typeof token !== "string") throw upstream();
  const lookup = (path: string) => fetch("https://api.github.com" + path, {
    headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(10_000)
  });
  const [profileResult, emailsResult] = await Promise.all([lookup("/user"), lookup("/user/emails")]);
  if (!profileResult.ok || !emailsResult.ok) throw upstream();
  const profile = await profileResult.json();
  const emails: { email: string; verified: boolean; primary: boolean }[] = await emailsResult.json();
  const email = emails.find((item) => item.primary && item.verified)?.email;
  if (!email || !Number.isSafeInteger(profile.id) || typeof profile.login !== "string") throw upstream();
  const session = await githubUser(String(profile.id), email, profile.login);
  const headers = new Headers({ Location: "/board" });
  headers.append("Set-Cookie", stateCookie("", 0));
  headers.append("Set-Cookie", sessionCookie(session.accessToken));
  return new Response(null, { status: 302, headers });
}
```

#### 줄별 설명

- 1–12행 · Stripe·SMTP·OAuth·환경 값·저장소를 가져온다.
- 13–29행 · Checkout 가격은 서버가 정하고 사용자별 멱등 키를 적용한다.
- 30–38행 · webhook 원본 바이트와 Stripe 서명을 대조한다.
- 39–50행 · 실제로 결제된 Checkout만 세션 ID 기준으로 저장한다.
- 51–57행 · 메일 작업을 등록하고 값이 없는 환경에서는 503을 반환한다.
- 58–67행 · 작업 목록의 상태와 예정 시각을 확인한다.
- 68–72행 · 직전 payload로 경쟁 쓰기를 걸러 작업을 점유한다.
- 73–85행 · SMTP 주소·인증·암호화·타임아웃을 설정한다.
- 86–94행 · SMTP 응답과 재시도 횟수에 따라 상태를 기록한다.
- 95–106행 · OAuth 클라이언트와 callback 정책을 설정한다.
- 107–119행 · 무작위 state와 S256 챌린지로 OAuth를 시작한다.
- 120–134행 · callback과 state를 확인하고 인가 코드를 교환한다.
- 135–145행 · GitHub 사용자와 검증 이메일을 확인한다.
- 146–148행 · 앱 세션을 발급하고 기존 OAuth 쿠키를 정리한다.

## ④ 🔗 연동 포인트

- SMTP 발송 작업은 study15에서 재시도와 크래시 복구를 확인한다.
- 파일 원문은 study18의 문서 발췌와 질문 이력에서 사용한다. OAuth 로그인도 일반 /api/auth/me 세션으로 이어진다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 503 SERVICE_UNAVAILABLE | 외부 서비스 환경 변수가 비어 있음 | 각 작업에 요구되는 서버 설정 이름을 확인한다. |
| 400 webhook | 서명 비밀이 다른 리스너용이거나 원본 본문이 변경됨 | CLI가 표시한 secret과 원본 바이트를 사용한다. |
| 403 OAuth 콜백 | state 쿠키 없음·만료·불일치 | 같은 호스트에서 로그인을 다시 시작하고 callback 주소를 확인한다. |

## ⑥ 직접 해보기

1. Mailpit에서 메일 제목과 수신 주소를 확인한다.
2. 같은 Stripe idempotencyKey를 두 번 보내 Checkout 주소가 같은지 테스트 모드로 확인한다.
3. 허용 크기를 초과한 파일과 지원하지 않는 파일을 업로드해 413·400 응답을 본다.

## ⑦ ☐ 체크리스트

- [ ] Stripe 테스트 결제·raw body 서명·멱등 처리 확인
- [ ] SMTP 예약과 Mailpit 수신 확인
- [ ] 파일 검증과 OAuth state·PKCE 확인

## ⑧ 다음 단계

[study14 · REST API 설계와 OpenAPI](study14.md)에서 공통 v1 경로·검색·페이지네이션·오류 계약을 OpenAPI와 Swagger UI로 검증한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
- [Stripe Checkout](https://docs.stripe.com/payments/checkout)
- [Stripe webhook 서명](https://docs.stripe.com/webhooks/signature)
- [GitHub OAuth 승인](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
