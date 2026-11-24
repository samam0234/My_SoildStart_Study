# study2 · 핵심 구조와 props

## ① 목표

라우트, 재사용 컴포넌트, 서버 기능 모듈의 역할을 나누고 props로 값을 주고받는다.

## ② 📖 이론

- 파일 경로는 화면의 입구, 컴포넌트는 반복해서 사용할 수 있는 UI 조각, 기능 모듈은 데이터 호출과 비즈니스 규칙을 담는다.
- 부모가 상태를 소유하고 자식은 props를 읽는다. 자식이 건네는 클릭은 호출 신호다. 주문표를 받는 창구가 손님에게 결정권을 돌려주는 흐름과 같다.
- Solid의 반응성은 접근 위치를 추적하므로 기본값이나 변경 데이터를 읽을 때 props를 렌더 초기에 구조 분해하면 변경을 놓칠 수 있다.

## ③ 🛠️ 실기

### 실행 단계

1. /에서 이름을 입력해 부모의 값이 Greeting에 표시되는지 확인한다.
2. 이름 지우기 버튼을 눌러 자식의 onReset이 부모의 update를 부르는 흐름을 따라간다.
3. App의 Router와 FileRoutes에서 이름 입력 페이지와 게시판 경로가 어떻게 연결되는지 확인한다.

### 전체 코드 · `tsx_version/src/components/Greeting.tsx`

```tsx
import { Show } from "solid-js";

export function Greeting(props: { name: string; onReset: () => void }) {
  return (
    <section>
      <p>안녕하세요, {props.name.trim() || "SolidStart"}!</p>
      <Show when={props.name !== ""}>
        <button type="button" onClick={props.onReset}>이름 지우기</button>
      </Show>
    </section>
  );
}
```

#### 줄별 설명

- 1–2행 · Show를 조건부 렌더링에 사용한다.
- 3–5행 · name은 읽기 값이고 onReset은 부모가 소유하는 콜백이다.
- 6행 · 공백을 제거한 이름이나 기본 문구를 읽는다.
- 7행 · Show가 빈 문자열일 때 버튼을 렌더링하지 않는다.
- 8–12행 · 클릭 시 전달받은 함수를 호출해 상태 변경을 위임한다.

### 전체 코드 · `tsx_version/src/app.tsx`

```tsx
import { A, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";

export default function App() {
  return (
    <Router root={(props) => (
      <>
        <header class="shell">
          <nav aria-label="주 메뉴">
            <A href="/" end>홈</A>
            <A href="/posts">게시판</A>
            <A href="/account">계정</A>
            <A href="/workbench">문서 작업실</A>
            <a href="/api-docs">API 문서</a>
          </nav>
        </header>
        <main class="shell">
          <Suspense fallback={<p role="status">불러오는 중…</p>}>{props.children}</Suspense>
        </main>
      </>
    )}>
      <FileRoutes />
    </Router>
  );
}
```

#### 줄별 설명

- 1행 · A와 Router로 링크와 라우트 루트를 선언한다.
- 2–7행 · FileRoutes가 src/routes에서 엔트리를 찾는다.
- 8–10행 · 공통 루트가 헤더와 본문을 감싼다.
- 11–19행 · 네비게이션에서 내부 페이지로 이동한다.
- 20–23행 · 비동기 라우트 데이터의 대기 표시를 둔다.
- 24–27행 · 파일 라우트 목록을 Router에 등록한다.

## ④ 🔗 연동 포인트

- 컴포넌트 간 props 경계를 익힌 뒤 study3의 입력 상태를 영속화한다.
- 게시판의 PostForm은 등록과 상세 화면의 수정에서 공유한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 이름이 바뀌어도 화면이 그대로 | props 값을 렌더 초기에 변수로 복사함 | 동적 JSX에서 props.name을 읽는다. |
| 버튼 누르면 폼이 전송됨 | 기본 submit 버튼을 사용함 | 폼과 무관한 버튼은 type=button을 지정한다. |

## ⑥ 직접 해보기

1. Greeting에 안내 문구 prop을 하나 추가한다.
2. 별도 Greeting을 다른 기본 name으로 렌더링해 재사용을 확인한다.

## ⑦ ☐ 체크리스트

- [ ] 부모의 상태를 자식에서 쓰기
- [ ] 자식 이벤트로 부모 상태 갱신

## ⑧ 다음 단계

[study3 · 상태와 로컬 저장소](study3.md)에서 입력 상태를 화면과 바인딩하고 브라우저 로컬 저장소에 연습 이름을 저장한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
