# study1 · Hello World와 기본 문법

## ① 목표

SolidStart의 첫 화면을 SSR로 띄우고 JSX에서 표현식과 이벤트를 읽는다.

## ② 📖 이론

- JSX에서는 태그 사이의 중괄호가 값을 읽고 속성의 중괄호가 값이나 함수를 전달한다. 여러 형제는 프래그먼트로 묶는다.
- HTML 초안은 서버에서 전송하고 브라우저가 이벤트를 연결한다. 종이 안내판에 스위치를 붙이는 작업을 생각하면 초기 문서와 동작의 관계가 보인다.

## ③ 🛠️ 실기

### 실행 단계

1. npm run dev -- --port 3000으로 시작한 뒤 /를 연다.
2. h1 문자열을 바꾸고 저장한다. 페이지가 갱신되는지 본 뒤 DevTools Network에서 Document와 JS 요청을 확인한다.
3. curl.exe -s http://localhost:3000/으로 서버 HTML에 Hello가 있는지 확인한다. DevTools Elements에서는 입력 후 갱신된 DOM을 확인한다.

### 전체 코드 · `tsx_version/src/routes/index.tsx`

```tsx
import { createSignal, onMount } from "solid-js";
import { A } from "@solidjs/router";
import { Greeting } from "../components/Greeting";

export default function Home() {
  const [name, setName] = createSignal("");
  onMount(() => setName(localStorage.getItem("solidstart-name") ?? ""));

  function update(value: string) {
    setName(value);
    localStorage.setItem("solidstart-name", value);
  }

  return (
    <>
      <h1>Hello, SolidStart</h1>
      <p>서버에서 첫 HTML을 보내는 게시판 실습입니다.</p>
      <label>연습 이름 <input value={name()} onInput={(event) => update(event.currentTarget.value)} /></label>
      <Greeting name={name()} onReset={() => update("")} />
      <A href="/posts">게시글 보기</A>
    </>
  );
}
```

#### 줄별 설명

- 1–2행 · createSignal은 값 접근자와 변경 함수를 만든다.
- 3–5행 · 인사 컴포넌트가 이름 표시와 리셋 버튼을 맡는다.
- 6행 · 입력의 첫 렌더 값은 서버와 브라우저 모두 빈 문자열이다.
- 7–8행 · 브라우저 마운트 후에 저장값을 읽는다.
- 9–13행 · 하나의 이벤트 핸들러로 상태와 저장소를 갱신한다.
- 14–17행 · 프래그먼트로 페이지의 형제 노드를 반환한다.
- 18행 · 중괄호로 값과 콜백을 자식에 전달한다.
- 19–23행 · A가 앱 라우터 이동을 담당한다.

## ④ 🔗 연동 포인트

- 첫 페이지의 표현식과 이벤트를 study2에서 자식 컴포넌트의 props로 옮긴다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| JSX 빌드 실패 | 형제 태그를 루트 두 개로 반환함 | <>와 </>로 감싼다. |
| 저장해도 화면 변화 없음 | 다른 포트의 서버를 보고 있음 | 터미널 Local 주소와 DevTools Document URL을 확인한다. |

## ⑥ 직접 해보기

1. 첫 제목에 현재 과정 이름을 추가한다.
2. DevTools에서 JavaScript를 끄고 새로고침하여 서버 HTML의 첫 화면을 확인한다.

## ⑦ ☐ 체크리스트

- [ ] 첫 HTML에서 Hello 제목 확인
- [ ] HMR과 DevTools Network/Elements 사용

## ⑧ 다음 단계

[study2 · 핵심 구조와 props](study2.md)에서 라우트, 재사용 컴포넌트, 서버 기능 모듈의 역할을 나누고 props로 값을 주고받는다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
