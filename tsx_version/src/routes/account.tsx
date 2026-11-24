import { A, createAsync, revalidate, useNavigate } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { viewer } from "../features/board-data";

export default function Account() {
  const member = createAsync(() => viewer());
  const navigate = useNavigate();
  const [signup, setSignup] = createSignal(false);
  const [pending, setPending] = createSignal(false);
  const [notice, setNotice] = createSignal("");
  const [fields, setFields] = createSignal<Record<string, string[]>>({});

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (pending()) return;
    const form = event.currentTarget as HTMLFormElement;
    const operation = signup() ? "signup" : "login";
    setPending(true);
    setFields({});
    try {
      const response = await fetch("/api/auth/" + operation, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      const result = await response.json();
      if (!response.ok) {
        setFields(result.error.fields ?? {});
        throw new Error(result.error.code + " · " + result.error.message);
      }
      if (operation === "signup") {
        setSignup(false);
        form.reset();
        setNotice("가입했습니다. 로그인해 주세요.");
      } else {
        await revalidate(viewer.key);
        navigate("/board");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "인증 요청 실패");
    } finally { setPending(false); }
  }

  return (
    <>
      <h1>계정</h1>
      <Show when={member()} fallback={
        <>
          <button onClick={() => { setSignup(!signup()); setNotice(""); setFields({}); }}>{signup() ? "로그인으로" : "회원가입으로"}</button>
          <form onSubmit={submit}>
            <label>이메일 <input type="email" name="email" required autocomplete="email" /></label>
            <Show when={signup()}><label>닉네임 <input name="nickname" required maxlength="40" /></label></Show>
            <label>비밀번호 <input name="password" type="password" required autocomplete={signup() ? "new-password" : "current-password"} /></label>
            <button disabled={pending()}>{signup() ? "회원가입" : "로그인"}</button>
          </form>
          <a href="/api/oauth/github">GitHub로 로그인</a>
        </>
      }>{(user) => (
        <>
          <p>{user().nickname}님으로 로그인했습니다.</p>
          <A href="/board">글 쓰기</A>{" "}
          <button disabled={pending()} onClick={async () => {
            if (pending()) return;
            setPending(true);
            try {
              const response = await fetch("/api/auth/logout", { method: "POST" });
              if (!response.ok) throw new Error("로그아웃 요청에 실패했습니다.");
              await revalidate(viewer.key);
              setNotice("로그아웃했습니다.");
            } catch (error) { setNotice(error instanceof Error ? error.message : "오류"); }
            finally { setPending(false); }
          }}>로그아웃</button>
        </>
      )}</Show>
      <p role="status">{notice()}</p>
      <ul><For each={Object.entries(fields())}>{([field, messages]) => <li>{field} · {messages.join(", ")}</li>}</For></ul>
    </>
  );
}
