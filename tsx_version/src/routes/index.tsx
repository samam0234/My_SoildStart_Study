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
