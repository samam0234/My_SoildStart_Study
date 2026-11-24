import { Show } from "solid-js";
export function Greeting(props) {
    return (<section>
      <p>안녕하세요, {props.name.trim() || "SolidStart"}!</p>
      <Show when={props.name !== ""}>
        <button type="button" onClick={props.onReset}>이름 지우기</button>
      </Show>
    </section>);
}
