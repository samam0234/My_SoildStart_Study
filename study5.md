# study5 · 폼 입력과 검증

## ① 목표

폼을 서버에 제출하고 200·400·422 및 필드 오류를 상태별로 표시한다.

## ② 📖 이론

- 빠른 입력 피드백은 브라우저에서, 권위 있는 검증은 서버에서 수행한다. 접수 창구에서 양식을 빠르게 확인하고 담당자가 최종 내용을 확인하는 구조다.
- /api/preview는 정상 200, 잘못된 JSON 400, 의미 검증 실패 422를 비교하는 실습이다. 공통 게시판 v1은 입력 검증까지 400 VALIDATION_ERROR로 통일한다.
- SolidStart 서버 함수에는 "use server"를 둔다. action의 useSubmission은 전송 동안 버튼을 비활성화하고 오류에서 code, message, fields를 꺼낸다.

## ③ 🛠️ 실기

### 실행 단계

1. /preview에서 빈 값을 보내고 422 제목 오류를 확인한다. 올바른 값은 200 미리보기로 표시한다.
2. DevTools 또는 curl.exe에서 깨진 JSON 본문을 전송해 400을 확인한다.
3. /board의 제목·본문·태그를 채우고 Network에서 서버 함수 호출 뒤 상세 이동을 본다.

### 전체 코드 · `tsx_version/src/routes/api/preview.ts`

```ts
import type { APIEvent } from "@solidjs/start/server";
import { api, json, objectBody, validation } from "../../server/http";

export const POST = (event: APIEvent) => api(event.request, async () => {
  const data = await objectBody(event.request);
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || title.length > 200) {
    throw validation({ title: ["1~200자로 입력하세요."] }, 422);
  }
  return json({ data: { title } });
});
```

#### 줄별 설명

- 1행 · APIEvent에서 표준 Request를 받는다.
- 2–3행 · 공통 응답과 JSON 읽기/검증 함수를 연결한다.
- 4행 · POST 핸들러가 공통 API 래퍼를 통과한다.
- 5행 · JSON 파싱 실패는 400으로 처리된다.
- 6–7행 · 제목 문자열 정제와 길이 검사로 유효성을 판단한다.
- 8–9행 · 제목 필드 오류를 422로 반환한다.
- 10–11행 · 검증된 제목을 성공 응답의 data에 담는다.

### 전체 코드 · `tsx_version/src/components/PostForm.tsx`

```tsx
import { useSubmission } from "@solidjs/router";
import { For, Show } from "solid-js";
import { writePost } from "../features/board-data";

type Editable = { id: number; title: string; body: string; tags: string[] };
export function PostForm(props: { post?: Editable }) {
  const submission = useSubmission(writePost);
  const error = () => {
    const result = submission.result;
    return result && "error" in result ? result.error : undefined;
  };

  return (
    <form action={writePost} method="post">
      <Show when={props.post}><input type="hidden" name="id" value={props.post?.id} /></Show>
      <label>제목 <input name="title" required maxlength="200" value={props.post?.title ?? ""} /></label>
      <label>내용 <textarea name="body" required maxlength="10000" value={props.post?.body ?? ""} /></label>
      <label>태그 <input name="tags" placeholder="study, solidstart" value={props.post?.tags.join(", ") ?? ""} /></label>
      <Show when={error()}>{(failure) => (
        <div role="alert">
          <p>{failure().code} · {failure().message}</p>
          <ul><For each={Object.entries(failure().fields ?? {})}>{([field, messages]) => (
            <li>{field} · {messages.join(", ")}</li>
          )}</For></ul>
        </div>
      )}</Show>
      <button disabled={submission.pending}>{submission.pending ? "저장 중…" : "저장"}</button>
    </form>
  );
}
```

#### 줄별 설명

- 1–4행 · useSubmission이 같은 action의 상태를 조회한다.
- 5–6행 · 수정 폼은 선택된 글의 기존 값을 받는다.
- 7–13행 · 서버가 반환한 오류를 읽는다.
- 14–15행 · action과 method=post로 보내고 id가 있으면 수정한다.
- 16–18행 · 제목·내용·태그 필드를 구성한다.
- 19–24행 · code와 message, fields를 사용자에게 표시한다.
- 25–30행 · 서버 응답까지 버튼을 비활성화한다.

### 전체 코드 · `tsx_version/src/routes/preview.tsx`

```tsx
import { createSignal, For } from "solid-js";

export default function Preview() {
  const [pending, setPending] = createSignal(false);
  const [result, setResult] = createSignal("");
  const [fields, setFields] = createSignal<string[]>([]);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (pending()) return;
    const form = event.currentTarget as HTMLFormElement;
    setPending(true);
    setFields([]);
    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: new FormData(form).get("title") })
      });
      const body = await response.json();
      if (response.status === 200) setResult("미리보기 · " + body.data.title);
      else {
        setResult(response.status + " · " + body.error.message);
        setFields(body.error.fields?.title ?? []);
      }
    } catch {
      setResult("서버에 연결할 수 없습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1>글 제목 미리보기</h1>
      <form onSubmit={submit} novalidate>
        <label>제목 <input name="title" required maxlength="200" aria-describedby="errors" /></label>
        <button disabled={pending()}>확인</button>
      </form>
      <p role="status">{result()}</p>
      <ul id="errors"><For each={fields()}>{(error) => <li>{error}</li>}</For></ul>
    </>
  );
}
```

#### 줄별 설명

- 1–3행 · signal과 반복 렌더러를 준비한다.
- 4–7행 · 대기 여부와 오류 필드 상태를 초기화한다.
- 8–14행 · 폼 기본 전송을 차단하고 중복 호출을 막는다.
- 15–20행 · JSON API에 제목 값을 전달한다.
- 21–26행 · 200과 오류 상태를 다른 안내로 표시한다.
- 27–34행 · 네트워크 오류와 전송 종료를 처리한다.
- 35–44행 · 폼, 결과, 필드 오류를 렌더링한다.

## ④ 🔗 연동 포인트

- 서버 action과 공개 REST 엔드포인트는 study6의 게시판 서비스에서 같은 검증과 DB를 사용한다.
- 개발자도구에서 FormData와 JSON의 Content-Type 차이와 요청 응답을 확인한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 빠른 클릭으로 중복 요청 | pending 검사가 호출 전에 실행되지 않음 | 핸들러 입구와 버튼 상태에 pending을 연결한다. |
| JSON 응답 대신 파싱 예외 | 요청 경로가 UI URL이거나 프록시 오류 HTML을 받음 | Network의 상태·Content-Type·실제 호출 경로를 확인한다. |

## ⑥ 직접 해보기

1. 제목을 정상과 빈 값으로 보내 마지막 응답을 기록한다.
2. 태그 11개로 글쓰기 action을 호출해 fields.tags 메시지를 확인한다.

## ⑦ ☐ 체크리스트

- [ ] `"use server"` 서버 함수와 `action`으로 글쓰기 폼
- [ ] 오류 응답 `error.code/message/fields`를 폼 오류로 표시
- [ ] 200·400·422 및 중복 제출 방지 확인

## ⑧ 다음 단계

[study6 · DB와 API 연동](study6.md)에서 SQLite로 게시글·댓글을 저장하고 공통 API v1의 CRUD와 응답을 맞춘다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
- [SolidStart 데이터 변경](https://docs.solidjs.com/solid-start/v2/building-your-application/data-mutation)
