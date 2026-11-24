# study3 · 상태와 로컬 저장소

## ① 목표

입력 상태를 화면과 바인딩하고 브라우저 로컬 저장소에 연습 이름을 저장한다.

## ② 📖 이론

- createSignal은 읽기 접근자와 setter를 제공한다. value는 화면에 반영하고 onInput이 값을 다시 signal에 넣는다.
- localStorage는 브라우저 주소별 보관함이다. SSR의 첫 렌더는 브라우저 전역을 사용할 수 없으므로 onMount에서 복원한다. DB가 필요한 공유 데이터는 study6에서 서버로 이동한다.

## ③ 🛠️ 실기

### 실행 단계

1. /에서 이름을 입력하고 새로고침한다.
2. DevTools Application → Local Storage의 solidstart-name을 확인한다.
3. 저장 항목을 지우고 다시 열어서 기본 표시를 확인한다.

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

- 1–5행 · 실습에서 사용할 모듈을 불러오고 입력·출력 경계를 연결한다.
- 6행 · 빈 문자열로 서버의 첫 문서와 초기 상태를 맞춘다.
- 7–8행 · onMount에서 브라우저 저장소를 읽고 값이 없으면 기본값을 쓴다.
- 9행 · 사용자 입력과 리셋은 update를 공유한다.
- 10행 · setter로 이름을 사용하는 UI를 갱신한다.
- 11–16행 · 같은 값을 브라우저 저장소에 남긴다.
- 17행 · value와 onInput을 양쪽에 연결한다.
- 18–23행 · 변경된 상태가 자식의 props에 전달된다.

## ④ 🔗 연동 포인트

- 사용자별 설정은 로컬에, URL에 공유할 검색 조건은 study4의 쿼리 파라미터에 둔다.
- 브라우저 저장소에는 인증 비밀을 넣지 않고 study7의 세션 쿠키를 사용한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 서버 로그의 localStorage is not defined | SSR 중 브라우저 API를 호출함 | onMount나 브라우저 이벤트로 읽기 위치를 옮긴다. |
| 다른 탭에서 기대한 값이 없음 | 다른 호스트나 포트라 Origin이 달라짐 | 같은 프로토콜·호스트·포트를 사용한다. |

## ⑥ 직접 해보기

1. 브라우저 저장소에서 이름을 바꾼 뒤 새로고침한다.
2. http://localhost와 http://127.0.0.1 주소의 저장 공간을 비교한다.

## ⑦ ☐ 체크리스트

- [ ] signal과 입력 필드 바인딩 확인
- [ ] 새로고침 뒤 보관값 확인

## ⑧ 다음 단계

[study4 · 라우팅과 요청 처리](study4.md)에서 파일 기반 라우팅과 중첩 레이아웃을 만들고 동적 URL·쿼리·404를 확인한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
