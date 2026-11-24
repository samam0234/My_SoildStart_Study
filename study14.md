# study14 · REST API 설계와 OpenAPI

## ① 목표

공통 v1 경로·검색·페이지네이션·오류 계약을 OpenAPI와 Swagger UI로 검증한다.

## ② 📖 이론

- 리소스는 소문자 복수 명사로 표현하고 HTTP 메소드가 동작을 표현한다. 책 번호는 자원, 요청 메소드는 대출·수정·삭제의 구분에 해당한다.
- v1은 공통 규약의 버전이며 현재 경로는 /api다. OpenAPI info.version=1.0.0을 사용한다. 호환되지 않는 계약이 필요하면 새 경로(예: /api/v2)와 별도 문서를 유지한다.
- 검색 q는 제목·본문에서 대소문자를 무시한다. page는 1부터, limit 기본 10 및 최대 50이고 정렬은 createdAt, -createdAt, -commentCount다. 오류는 error.code/message/fields/requestId로 연결한다.

## ③ 🛠️ 실기

### 실행 단계

1. /api-docs의 Swagger UI와 /api/docs/openapi의 OpenAPI 3 JSON을 연다. Swagger UI 자산에는 CDN 접근이 필요하다.
2. GET /api/posts를 q와 limit으로 호출하고 성공 단건·목록·204 제거의 스키마를 확인한다.
3. 테스트 계정 토큰으로 Bearer Authorize를 설정하고 POST의 201·Location, 잘못된 본문의 400·fields, 권한 없는 요청의 403을 확인한다.

### 전체 코드 · `tsx_version/src/routes/api/docs/openapi.ts`

```ts
import type { APIEvent } from "@solidjs/start/server";
import { api, json } from "../../../server/http";
import { openapi } from "../../../server/openapi";

export const GET = ({ request }: APIEvent) => api(request, () => json(openapi));
```

#### 줄별 설명

- 1행 · SolidStart APIEvent를 가져온다.
- 2행 · 공통 응답 헤더와 JSON 프레임을 사용한다.
- 3–4행 · 게시판 계약의 전체 OpenAPI 스키마 객체를 불러온다.
- 5행 · GET에 JSON 문서 응답을 연결한다.

### 전체 코드 · `tsx_version/src/routes/api-docs.ts`

```ts
const html = '<!DOCTYPE html><html lang="ko"><meta charset="utf-8"><title>SolidStart 게시판 OpenAPI</title>' +
  '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.31.0/swagger-ui.css">' +
  '<body><p><a href="/">홈</a> · <a href="/api/docs/openapi">OpenAPI JSON</a></p><div id="swagger-ui"></div>' +
  '<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.31.0/swagger-ui-bundle.js"></script>' +
  '<script>SwaggerUIBundle({url:"/api/docs/openapi",dom_id:"#swagger-ui",validatorUrl:null});</script></body></html>';

export function GET() {
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
}
```

#### 줄별 설명

- 1행 · 한국어 HTML 문서와 제목을 정의한다.
- 2–3행 · Swagger UI CSS 버전을 고정한다.
- 4행 · 문서 자산을 로드한다.
- 5–6행 · 앱의 OpenAPI URL과 렌더링 위치를 지정한다.
- 7–9행 · HTML과 올바른 Content-Type, nosniff를 반환한다.

### 전체 코드 · `tsx_version/src/server/openapi.ts`

```ts
const media = "application/json";
const ref = (name: string) => ({ $ref: "#/components/schemas/" + name });
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: "object", required, properties });
const string = { type: "string" };
const integer = { type: "integer", minimum: 1 };
const date = { type: "string", format: "date-time" };
const array = (items: unknown) => ({ type: "array", items });
const data = (schema: unknown) => object({ data: schema });
const response = (description: string, schema?: unknown) => ({
  description, headers: { "X-Request-Id": { schema: string } },
  ...(schema ? { content: { [media]: { schema } } } : {})
});
const error = (description: string) => response(description, ref("Error"));
const secure = [{ bearer: [] }, { session: [] }];
const idParameter = { in: "path", name: "id", required: true, schema: integer };
const query = (name: string, schema: unknown) => ({ in: "query", name, schema });
const body = (schema: unknown) => ({ required: true, content: { [media]: { schema } } });

function operation(summary: string, status: number, schema?: unknown, settings: {
  auth?: boolean; input?: unknown; errors?: number[]; location?: boolean;
} = {}) {
  const common: Record<number, string> = {
    400: "형식 또는 입력 오류", 401: "인증 실패", 403: "권한 없음", 404: "대상 없음",
    409: "충돌", 413: "본문 크기 초과", 429: "요청 한도 초과", 500: "서버 오류"
  };
  const errors = Object.fromEntries([...(settings.errors ?? []), 500].map((code) => [code, error(common[code])]));
  const success = response(status === 204 ? "본문 없음" : "성공", schema);
  return {
    summary,
    ...(settings.auth && { security: secure }),
    ...(settings.input === undefined ? {} : { requestBody: body(settings.input) }),
    responses: {
      ...errors,
      [status]: {
        ...success,
        headers: { ...success.headers, ...(settings.location && { Location: { schema: string } }) }
      }
    }
  };
}

export const openapi = {
  openapi: "3.0.3",
  info: { title: "SolidStart 게시판 공통 API", version: "1.0.0" },
  servers: [{ url: "/" }],
  paths: {
    "/health": { get: operation("프로세스 상태", 200, object({ status: { type: "string", enum: ["ok"] } })) },
    "/api/auth/signup": { post: operation("회원가입", 201, data(ref("User")), {
      input: object({ email: string, password: string, nickname: string }), errors: [400, 409, 413]
    }) },
    "/api/auth/login": { post: operation("로그인", 200, data(object({ user: ref("User"), accessToken: string })), {
      input: object({ email: string, password: string }), errors: [400, 401, 413]
    }) },
    "/api/auth/logout": { post: operation("로그아웃", 204, undefined, { auth: true, errors: [401] }) },
    "/api/auth/me": { get: operation("내 정보", 200, data(ref("User")), { auth: true, errors: [401] }) },
    "/api/posts": {
      get: {
        ...operation("게시글 목록", 200, object({ data: array(ref("PostSummary")), meta: ref("Page") })),
        parameters: [
          query("q", string), query("page", { ...integer, default: 1 }),
          query("limit", { ...integer, maximum: 50, default: 10 }),
          query("sort", { type: "string", enum: ["createdAt", "-createdAt", "-commentCount"], default: "-createdAt" })
        ]
      },
      post: operation("게시글 작성", 201, data(ref("Post")), {
        auth: true, input: ref("PostInput"), errors: [400, 401, 413], location: true
      })
    },
    "/api/posts/{id}": {
      parameters: [idParameter],
      get: operation("게시글 상세", 200, data(ref("Post")), { errors: [400, 404] }),
      patch: operation("게시글 부분 수정", 200, data(ref("Post")), {
        auth: true, input: object({ title: string, body: string, tags: array(string) }, []), errors: [400, 401, 403, 404, 413]
      }),
      delete: operation("게시글 삭제", 204, undefined, { auth: true, errors: [400, 401, 403, 404] })
    },
    "/api/posts/{id}/comments": {
      parameters: [idParameter],
      get: operation("댓글 목록", 200, data(array(ref("Comment"))), { errors: [400, 404] }),
      post: operation("댓글 작성", 201, data(ref("Comment")), {
        auth: true, input: object({ body: string }), errors: [400, 401, 404, 413]
      })
    },
    "/api/comments/{id}": {
      parameters: [idParameter],
      delete: operation("댓글 삭제", 204, undefined, { auth: true, errors: [400, 401, 403, 404] })
    }
  },
  components: {
    securitySchemes: {
      bearer: { type: "http", scheme: "bearer" },
      session: { type: "apiKey", in: "cookie", name: "board_session" }
    },
    schemas: {
      User: object({ id: integer, email: { type: "string", format: "email" }, nickname: string }),
      Author: object({ id: integer, nickname: string }),
      PostInput: object({ title: { type: "string", minLength: 1, maxLength: 200 }, body: string, tags: array(string) }, ["title", "body"]),
      PostSummary: object({ id: integer, title: string, author: ref("Author"), commentCount: { type: "integer", minimum: 0 }, createdAt: date }),
      Post: { allOf: [ref("PostSummary"), object({ body: string, tags: array(string), updatedAt: date })] },
      Comment: object({ id: integer, body: string, createdAt: date, author: ref("Author") }),
      Page: object({ page: integer, limit: integer, total: { type: "integer" }, totalPages: { type: "integer" }, q: string }),
      Error: object({ error: object({ code: string, message: string, fields: { type: "object", additionalProperties: array(string) }, requestId: string }, ["code", "message", "requestId"]) })
    }
  }
};
```

#### 줄별 설명

- 1–15행 · 공통 스키마 작성 함수와 응답 Content-Type을 정의한다.
- 16–21행 · 인증과 ID·검색·요청 본문의 공통 구조를 정한다.
- 22–42행 · 성공, 실패와 Location 응답 헤더를 조립한다.
- 43–57행 · OpenAPI 버전과 서버, 공통 v1 API 경로를 선언한다.
- 58–91행 · 페이지네이션·검색·정렬·댓글 상태 코드를 정의한다.
- 92–105행 · Bearer와 쿠키 인증 및 본문 스키마를 선언한다.

## ④ 🔗 연동 포인트

- 공통 스펙의 오류 헤더·본문 requestId를 서버 로그와 맞춘다.
- 문서 작업실 전용 엔드포인트는 study13·18의 실습 문서에서 관리한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| Swagger 화면이 빈 채로 나옴 | CDN 자산을 차단함 | /api/docs/openapi의 JSON을 직접 열고 DevTools의 CDN 요청을 확인한다. |
| 204를 JSON으로 읽지 못함 | 204에는 본문이 없음 | 성공 상태에 따라 파싱을 건너뛴다. |

## ⑥ 직접 해보기

1. OpenAPI에 정의된 필드 목록과 실서버 요청 두 개를 비교한다.
2. 401과 403의 실제 응답에 같은 요청 ID 헤더 동작이 적용되는지 확인한다.

## ⑦ ☐ 체크리스트

- [ ] OpenAPI 경로·모델·보안 스키마 확인
- [ ] q·page·limit·sort와 meta 검증
- [ ] 버전 유지 원칙과 204·오류 응답 확인

## ⑧ 다음 단계

[study15 · 성능, 캐시와 비동기 작업](study15.md)에서 목록 캐시와 메일 작업 큐를 실습하고 실제 응답 지연을 측정한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
- [공통 API 스펙 v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e)
- [OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3)
