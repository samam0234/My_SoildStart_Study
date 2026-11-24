# study6 · DB와 API 연동

## ① 목표

SQLite로 게시글·댓글을 저장하고 공통 API v1의 CRUD와 응답을 맞춘다.

## ② 📖 이론

- 저장소는 데이터베이스의 보관 방식과 서비스 호출 규칙 사이의 경계다. 도서관 대출 창구가 책이 종이인지 전자인지와 상관없이 같은 대출 업무를 처리하는 것과 비슷하다.
- users, posts, comments, sessions가 각각 숫자 ID를 갖는다. owner는 작성자, parent는 댓글의 상위 글을 나타내며 payload는 JSON 문자열이다. 원시 payload는 API에 내보내지 않고 DTO를 조립한다.
- GET /api/posts는 data 배열과 meta, GET /api/posts/{id}는 단건 data, POST는 201과 Location, PATCH는 부분 수정, DELETE는 본문 없는 204를 사용한다.

## ③ 🛠️ 실기

### 실행 단계

1. .env에서 DB_CLIENT=sqlite 및 DB_FILE=data/board.db를 정하고 /ready를 호출한다.
2. 회원가입과 로그인 뒤 /api/posts에서 등록 → 목록 → 상세 → 수정 → 삭제를 실행한다. 로그인 토큰은 Bearer로, 브라우저에서는 HttpOnly 쿠키를 쓴다.
3. /api/posts/{id}/comments에서 목록과 작성, /api/comments/{id}에서 작성자 삭제를 확인한다.

### 전체 코드 · `tsx_version/src/routes/api/posts/index.ts`

```ts
import type { APIEvent } from "@solidjs/start/server";
import { requireUser } from "../../../server/auth";
import { board, cachedPosts } from "../../../server/board";
import { api, json, objectBody, options } from "../../../server/http";

export const OPTIONS = options;
export const GET = ({ request }: APIEvent) => api(request, async () => json(await cachedPosts(new URL(request.url))));
export const POST = ({ request }: APIEvent) => api(request, async () => {
  const user = await requireUser(request);
  const post = await (await board()).create(user.id, await objectBody(request));
  return json({ data: post }, 201, { Location: "/api/posts/" + post.id });
});
```

#### 줄별 설명

- 1행 · APIEvent로 들어오는 요청 타입을 알린다.
- 2행 · 작성에는 세션 또는 Bearer 인증을 요구한다.
- 3–5행 · GET은 캐시가 붙은 목록 서비스를 쓰고 POST는 저장소 서비스를 쓴다.
- 6행 · API 계약을 요청 본문·응답 처리기에 연결한다.
- 7–8행 · 검색 URL을 그대로 읽고 data와 meta를 JSON으로 내보낸다.
- 9–10행 · 사용자를 확인한 다음 본문을 읽어 등록한다.
- 11–12행 · 생성된 리소스 경로를 Location 응답 헤더에 담는다.

### 전체 코드 · `tsx_version/src/routes/api/posts/[id].ts`

```ts
import type { APIEvent } from "@solidjs/start/server";
import { requireUser } from "../../../server/auth";
import { board } from "../../../server/board";
import { api, idOf, json, objectBody, options } from "../../../server/http";

export const OPTIONS = options;
export const GET = ({ request, params }: APIEvent) => api(request, async () => json({ data: await (await board()).detail(idOf(params.id)) }));
export const PATCH = ({ request, params }: APIEvent) => api(request, async () => {
  const user = await requireUser(request);
  return json({ data: await (await board()).edit(idOf(params.id), user.id, await objectBody(request)) });
});
export const DELETE = ({ request, params }: APIEvent) => api(request, async () => {
  await (await board()).remove(idOf(params.id), (await requireUser(request)).id);
  return new Response(null, { status: 204 });
});
```

#### 줄별 설명

- 1–5행 · 실습에서 사용할 모듈을 불러오고 입력·출력 경계를 연결한다.
- 6행 · 필요한 CORS 프리플라이트 응답을 등록한다.
- 7행 · 정수 ID를 파싱하고 공개 상세를 조회한다.
- 8–11행 · PATCH 요청에서는 로그인 후 일부 필드만 수정한다.
- 12–15행 · 삭제에서 소유자를 확인하고 성공 시 빈 204를 반환한다.

## ④ 🔗 연동 포인트

- study5의 폼 오류는 같은 error.code, error.message, error.fields로 표시한다.
- study7에서 로그인 응답과 작성자 검사를 확인하고 study14에서 /api-docs 정책을 정리한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| SQLITE_CANTOPEN | 쓰기 경로를 만들 수 없음 | DB_FILE 위치와 앱 사용자의 쓰기 권한을 확인한다. |
| 목록이 비었는데 검색어가 남음 | q나 page 필터가 적용돼 있음 | data와 meta를 함께 보고 첫 페이지와 빈 검색으로 재시도한다. |
| 삭제 후 JSON 파싱 오류 | 본문 없는 204에 response.json() 호출 | 204를 확인하고 파싱을 건너뛴다. |

## ⑥ 직접 해보기

1. 같은 글을 다른 계정에서 수정하고 403을 확인한다.
2. limit=51과 검색어 소문자를 지정하고 최대 한도와 대소문자 무시 검색을 확인한다.

## ⑦ ☐ 체크리스트

- [ ] `query`와 `createAsync`로 서버 데이터 불러오기
- [ ] `src/routes/api` 아래 API 라우트로 JSON 엔드포인트 만들기
- [ ] 목록 응답 `data`와 `meta`를 그대로 받기
- [ ] 공통 v1 CRUD·댓글·Location·요청 ID 확인

## ⑧ 다음 단계

[study7 · 인증과 보안 기초](study7.md)에서 가입·로그인·로그아웃을 실습하고 세션 쿠키와 작성자 권한으로 쓰기 경로를 보호한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
- [Notion 공통 API 스펙 v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e)
- [SolidStart API 라우트](https://docs.solidjs.com/solid-start/v2/building-your-application/api-routes)
