# studyMidpoint · 세션 게시판

## ① 목표

study0~10의 SolidStart 기초만으로 가입·로그인·글과 댓글 CRUD 게시판을 완성한다.

## ② 📖 이론

- 게시판은 URL, 서버 렌더링, 인증, 요청 검증, 데이터베이스를 한 흐름으로 연습하는 서비스다. 접수대가 신분증을 확인한 뒤 작성자에게 자신의 문서만 편집하게 하는 것과 같다.

## ③ 🛠️ 실기

### 기능 목록

- 공개 글 목록·검색·정렬·페이지네이션과 공개 상세
- 가입·로그인·로그아웃, 로그인 전 /board 보호
- 새 글 등록·작성자 수정 및 삭제, 댓글 작성 및 작성자 삭제
- SQLite 영속화와 공통 v1 JSON 계약

### 폴더 구조

```text
tsx_version/src/
  routes/{account,board,posts,api}/  화면과 API
  components/PostForm.tsx         등록과 수정
  features/board-data.ts          서버 쿼리와 action
  server/{auth,board,db,http}.ts   인증·업무 규칙·저장소·응답
```

### 구현 순서

1. study0~2에서 프로젝트·앱 셸·컴포넌트와 중첩 URL을 준비한다.
2. study3~5에서 입력 관리와 글쓰기 action을 만든다.
3. study6에서 SQLite와 v1 CRUD/댓글을 연결한다.
4. study7에서 쿠키·토큰과 작성자 권한을 확인한다.
5. study8~10에서 모듈 분리, 테스트, Node 빌드와 HTTP 준비 점검을 실행한다.

### 전체 코드 · `tsx_version/src/features/board-data.ts`

```ts
import { action, query, redirect } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { currentUser, requireUser } from "../server/auth";
import { board, cachedPosts } from "../server/board";
import { ApiError, errorBody, guardOrigin, idOf } from "../server/http";

function requestHere() {
  const event = getRequestEvent();
  if (!event) throw new Error("Request context missing");
  return event.request;
}

export const viewer = query(async () => {
  "use server";
  return await currentUser(requestHere()) ?? null;
}, "viewer");

export const getPosts = query(async (search = "") => {
  "use server";
  const url = new URL(requestHere().url);
  url.search = search;
  return cachedPosts(url);
}, "posts");

export const getPost = query(async (id: string) => {
  "use server";
  try {
    const service = await board();
    const number = idOf(id);
    const [post, comments] = await Promise.all([service.detail(number), service.comments(number)]);
    return { post, comments };
  } catch (error) {
    if (error instanceof ApiError && [400, 404].includes(error.status)) return null;
    throw error;
  }
}, "post");

export const writePost = action(async (form: FormData) => {
  "use server";
  try {
    const request = requestHere();
    guardOrigin(request);
    const user = await requireUser(request);
    const service = await board();
    const input = {
      title: form.get("title"),
      body: form.get("body"),
      tags: String(form.get("tags") ?? "").split(",").map((item) => item.trim()).filter(Boolean)
    };
    const id = form.get("id");
    const post = id
      ? await service.edit(idOf(String(id)), user.id, input)
      : await service.create(user.id, input);
    return redirect("/posts/" + post.id, { revalidate: [getPosts.key, getPost.key] });
  } catch (error) {
    if (error instanceof ApiError) return errorBody(error, crypto.randomUUID());
    throw error;
  }
}, "write-post");
```

#### 줄별 설명

- 1–6행 · 같은 Solid Router에서 조회 query와 쓰기 action을 가져온다.
- 7–12행 · 서버 함수가 현재 HTTP 요청을 읽을 수 있게 한다.
- 13–17행 · viewer가 세션 사용자 또는 빈 값을 돌려준다.
- 18–23행 · URL 검색 조건으로 목록을 조회한다.
- 24–35행 · 숫자 id로 글 상세와 댓글을 병렬 조회한다.
- 36–46행 · 쓰기 action이 브라우저 밖에서 인증·Origin·폼 값을 확인한다.
- 47–49행 · 숨은 id 값으로 수정과 신규 생성을 분기한다.
- 50–51행 · 저장 후 상세 URL로 이동하고 관련 목록·상세 캐시를 갱신한다.
- 52–59행 · 업무 오류를 구조화된 필드 오류로 돌려준다.

## ④ 🔗 연동 포인트

- SSR 조회와 REST API는 같은 서비스에 연결되며 쿠키나 Bearer는 서버에서 같은 세션을 찾는다.
- 다음 구간에서 저장소만 PostgreSQL·MariaDB·MongoDB로 바꿔 기존 화면과 계약을 확인한다.

### DB·API 연동 구성도

```text
브라우저 /posts ── SSR query ── 게시판 서비스 ── SQLite
브라우저 /board ── action ─────────────┘
다른 HTTP 클라이언트 ── /api/posts ────┘
/account ── /api/auth/login ── HttpOnly 쿠키 ── 보호 라우트
```

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 가입됐지만 /board로 이동하지 않음 | 가입과 로그인은 서로 다른 요청 | 로그인까지 수행하고 session/me를 확인한다. |
| 상세는 갱신됐지만 목록이 늦음 | 목록 키를 재검증하지 않음 | 쓰기 action이 getPosts.key를 재검증하는지 확인한다. |

## ⑥ 직접 해보기

1. 두 계정으로 글·댓글을 작성하고 교차 삭제를 시도한다.
2. 빈 DB에서 초기 배포 후 두 개의 글을 등록하고 컨테이너 재시작 뒤 조회한다.

## ⑦ ☐ 체크리스트

### 배포 점검

- [ ] 빌드와 HTTP 테스트 통과
- [ ] 영속 SQLite 경로 및 운영 APP_ORIGIN 확인
- [ ] 다른 계정 403과 인증되지 않은 요청 401 확인
- [ ] 1차 배포에서 SSR·HTTPS·/ready 확인

### 회고

페이지와 외부 HTTP가 같은 입력 검증·소유자 규칙을 사용하도록 모아 오류 재현이 쉬워졌다. 초반 부하는 한 Node 프로세스와 SQLite로 관찰한다. 다음 구간에서 DB 전환과 별도 작업실을 실습한다.

## ⑧ 다음 단계

[study11 · DB 확장](study11.md)에서 같은 SolidStart 게시판을 PostgreSQL, MariaDB, MongoDB에 연결하고 저장소 설정 차이를 검증한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
