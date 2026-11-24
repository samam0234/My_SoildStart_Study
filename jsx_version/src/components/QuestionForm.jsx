import { Switch } from "@kobalte/core/switch";
import { createForm, maxLength, required } from "@modular-forms/solid";
import { createSignal } from "solid-js";
export function QuestionForm(props) {
    const [, { Form, Field }] = createForm();
    const [summary, setSummary] = createSignal(false);
    return (<Form onSubmit={({ question }) => props.onAsk(summary() ? "요약: " + question : question)}>
      <Switch checked={summary()} onChange={setSummary}>
        <Switch.Input />
        <Switch.Control><Switch.Thumb /></Switch.Control>
        <Switch.Label>요약 요청으로 보내기</Switch.Label>
      </Switch>
      <Field name="question" validate={[required("질문을 입력하세요."), maxLength(395, "395자 이하로 입력하세요.")]}>
        {(field, input) => (<label>질문
            <input {...input} value={field.value ?? ""} aria-invalid={Boolean(field.error)} aria-describedby="question-error"/>
            <span id="question-error" role="alert">{field.error}</span>
          </label>)}
      </Field>
      <button disabled={props.busy}>질문 보내기</button>
    </Form>);
}
