# study12 · 프론트 UI와 상태·폼 연동

## ① 목표

Kobalte, Solid Store, Modular Forms를 사용해 문서 작업실 입력과 상태를 연결한다.

## ② 📖 이론

- Kobalte의 Switch는 키보드 조작과 라벨 같은 접근성을 제공하고 모양은 스타일에서 정한다. Modular Forms는 필드 오류를 제공하며 최종 검증은 API가 담당한다.
- createStore는 선택 문서, 제출 상태, 결과, 질문 기록을 하나의 모델로 묶는다. 작업일지의 각 칸만 업데이트하듯 변경 경로만 갱신한다.

## ③ 🛠️ 실기

### 실행 단계

1. 로그인하고 /workbench에서 TXT/MD를 업로드해 문서를 선택한다.
2. 요약 스위치를 Space로 바꾸고 비어 있는 질문을 전송해 필드 오류를 확인한다.
3. 유효한 질문을 전송하고 대기 중 버튼이 비활성화되고 결과와 기록이 바뀌는지 확인한다.

### 전체 코드 · `tsx_version/src/components/QuestionForm.tsx`

```tsx
import { Switch } from "@kobalte/core/switch";
import { createForm, maxLength, required } from "@modular-forms/solid";
import { createSignal } from "solid-js";

type Question = { question: string };
export function QuestionForm(props: { busy: boolean; onAsk: (question: string) => Promise<void> }) {
  const [, { Form, Field }] = createForm<Question>();
  const [summary, setSummary] = createSignal(false);
  return (
    <Form onSubmit={({ question }) => props.onAsk(summary() ? "요약: " + question : question)}>
      <Switch checked={summary()} onChange={setSummary}>
        <Switch.Input />
        <Switch.Control><Switch.Thumb /></Switch.Control>
        <Switch.Label>요약 요청으로 보내기</Switch.Label>
      </Switch>
      <Field name="question" validate={[required("질문을 입력하세요."), maxLength(395, "395자 이하로 입력하세요.")]} >
        {(field, input) => (
          <label>질문
            <input {...input} value={field.value ?? ""} aria-invalid={Boolean(field.error)} aria-describedby="question-error" />
            <span id="question-error" role="alert">{field.error}</span>
          </label>
        )}
      </Field>
      <button disabled={props.busy}>질문 보내기</button>
    </Form>
  );
}
```

#### 줄별 설명

- 1행 · Kobalte의 접근 가능한 스위치를 사용한다.
- 2–6행 · Modular Forms의 폼 구성과 검증을 가져온다.
- 7행 · 폼에서 제출 핸들러와 필드를 꺼낸다.
- 8–9행 · 요약 여부는 별도 signal로 관리한다.
- 10행 · 전송할 때 요약이면 질문 앞에 표시를 붙인다.
- 11–15행 · 스위치의 접근 가능한 입력과 라벨을 연결한다.
- 16–18행 · 빈 값과 최대 길이를 제출 전에 검사한다.
- 19–23행 · 입력과 오류 메시지를 ARIA 속성으로 연결한다.
- 24–27행 · 서버가 응답하는 동안 제출 버튼을 비활성화한다.

### 전체 코드 · `tsx_version/src/features/workspace-state.ts`

```ts
import { createStore } from "solid-js/store";

export type WorkspaceDocument = { id: number; filename: string; byteSize: number };
export type HistoryEntry = { id: number; question: string; answer: string };
export function createWorkspaceState() {
  return createStore({
    documents: [] as WorkspaceDocument[],
    history: [] as HistoryEntry[],
    selected: 0,
    pending: false,
    result: "",
    error: ""
  });
}
```

#### 줄별 설명

- 1–2행 · 객체 구조를 반응형으로 추적하는 createStore를 가져온다.
- 3–5행 · 문서와 질문 결과 모양을 정한다.
- 6–14행 · 선택 문서·입력 대기·응답·오류의 초기 상태를 선언한다.

## ④ 🔗 연동 포인트

- Switch는 프롬프트 의도를 전달하고 실제 질문 API와 SSE 처리는 study18에서 다룬다.
- 쓰기 pending과 폼 검증, 텍스트 렌더링의 경계를 유지한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 라벨 클릭으로 스위치가 이동하지 않음 | 스위치 입력 또는 라벨 구조 누락 | Switch.Input·Control·Label 구성과 Tab/Space를 확인한다. |
| 문서 전환 뒤 이전 기록이 표시됨 | 느린 이전 응답이 새 선택 상태를 덮음 | 요청 번호를 비교해 최신 응답만 적용한다. |

## ⑥ 직접 해보기

1. 마우스 없이 문서를 골라 질문을 제출한다.
2. 395자와 396자 입력을 시도해 UI와 API 제한 관계를 적는다.

## ⑦ ☐ 체크리스트

- [ ] Kobalte 위젯과 키보드 점검
- [ ] Solid Store로 목록·선택·결과 관리
- [ ] Modular Forms 오류와 API 검증 확인

## ⑧ 다음 단계

[study13 · 외부 서비스 연동](study13.md)에서 결제·메일·문서 파일·GitHub OAuth를 SolidStart 서버의 경계에서 연결한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
- [Kobalte Switch](https://kobalte.dev/docs/core/components/switch/)
- [Modular Forms Solid](https://modularforms.dev/solid/guides/create-your-form)
