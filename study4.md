# study4 · 라우팅과 요청 처리

## ① 목표

파일 기반 라우팅과 중첩 레이아웃을 만들고 동적 URL·쿼리·404를 확인한다.

## ② 📖 이론

- src/routes/posts.tsx는 공통 레이아웃, posts/index.tsx는 목록, posts/[id].tsx는 상세를 렌더링한다. 레이아웃은 두 방을 잇는 복도처럼 공통 링크를 제공한다.
- URL 경로는 리소스를 정하며 쿼리는 검색·정렬·페이지 조건을 전달한다. UI 요청은 HTML, API 요청은 JSON이고 상태 코드를 함께 반환한다.

## ③ 🛠️ 실기

### 실행 단계

1. /posts와 /posts?q=Solid&page=1&sort=createdAt를 연다.
2. 게시글의 링크로 /posts/숫자에 이동하고 /posts/999999에서 상세 오류를 관찰한다.
3. /missing-page와 /api/unknown의 Content-Type 및 404 응답을 curl.exe -i로 확인한다.

### 전체 코드 · `tsx_version/src/routes/posts.tsx`

```tsx
import { A, type RouteSectionProps } from "@solidjs/router";
import { LiveStatus } from "../components/LiveStatus";

export default function PostsLayout(props: RouteSectionProps) {
  return (
    <>
      <h1>학습 게시판</h1>
      <nav aria-label="게시판 메뉴"><A href="/posts" end>목록</A><A href="/board">내 게시판</A></nav>
      <LiveStatus />
      {props.children}
    </>
  );
}
```

#### 줄별 설명

- 1행 · RouteSectionProps가 하위 라우트의 children을 제공한다.
- 2–6행 · 게시판 공통 알림을 레이아웃에 붙인다.
- 7행 · 목록과 보호된 내 게시판으로 이동할 링크를 둔다.
- 8행 · 현재 브라우저의 알림 상태를 렌더링한다.
- 9–13행 · 선택된 목록 또는 상세가 삽입된다.

### 전체 코드 · `tsx_version/src/routes/[...missing].tsx`

```tsx
import { A } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";

export default function NotFound() {
  return <><HttpStatusCode code={404} /><h1>페이지를 찾을 수 없습니다</h1><A href="/">홈으로</A></>;
}
```

#### 줄별 설명

- 1행 · 라우터 링크를 불러온다.
- 2–4행 · 렌더 중 서버 HTTP 상태를 지정하는 컴포넌트를 사용한다.
- 5–6행 · 잡히지 않은 페이지에 404와 복귀 링크를 제공한다.

## ④ 🔗 연동 포인트

- 목록 q 및 page는 API의 /api/posts 쿼리와 같은 이름을 쓴다.
- 화면의 동적 id를 API /api/posts/{id}에 넘기고 서버에서 양의 정수 여부를 확인한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 하위 페이지 제목이 나타나지 않음 | 레이아웃에서 children을 렌더하지 않음 | 레이아웃 반환 JSX에 props.children을 넣는다. |
| 화면은 404인데 HTTP는 200 | 상태 컴포넌트가 없음 | SSR에서 HttpStatusCode code={404}를 쓰고 실제 상태를 확인한다. |

## ⑥ 직접 해보기

1. 목록에서 정렬을 바꾸고 주소를 다른 탭에 붙여 넣는다.
2. 잘못된 문자열 id와 없는 숫자 id의 API 오류 코드를 확인한다.

## ⑦ ☐ 체크리스트

- [ ] `src/routes` 파일 기반 라우팅과 중첩 레이아웃
- [ ] 동적 URL과 404 응답 확인

## ⑧ 다음 단계

[study5 · 폼 입력과 검증](study5.md)에서 폼을 서버에 제출하고 200·400·422 및 필드 오류를 상태별로 표시한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
- [SolidStart 파일 라우팅](https://docs.solidjs.com/solid-start/v2/building-your-application/routing)
