import { createAsync, redirect } from "@solidjs/router";
import { For, onCleanup, onMount, Show } from "solid-js";
import { QuestionForm } from "../components/QuestionForm";
import { viewer } from "../features/board-data";
import { readAnswer, responseData } from "../features/stream";
import { createWorkspaceState } from "../features/workspace-state";

async function member() {
  const user = await viewer();
  if (!user) throw redirect("/account");
  return user;
}
export const route = { preload: () => member() };

export default function Workbench() {
  const user = createAsync(member);
  const [state, setState] = createWorkspaceState();
  let controller: AbortController | undefined;
  let historyRequest = 0;
  onCleanup(() => { controller?.abort(); historyRequest++; });

  async function refreshHistory() {
    const request = ++historyRequest;
    const id = state.selected;
    const rows = id ? await responseData(await fetch("/api/documents/" + id + "/questions")) : [];
    if (request === historyRequest) setState("history", rows);
  }

  async function refreshDocuments() {
    const items = await responseData(await fetch("/api/documents"));
    setState("documents", items);
    if (!state.selected && items.length) setState("selected", items[0].id);
    await refreshHistory();
  }

  function report(error: unknown) {
    setState("error", error instanceof Error ? error.message : "요청 오류");
  }

  async function run(work: () => Promise<void>) {
    if (state.pending) return;
    setState({ pending: true, error: "" });
    try { await work(); }
    catch (error) { report(error); }
    finally { setState("pending", false); }
  }

  onMount(() => {
    fetch("/api/auth/me").then((response) => { if (response.ok) return refreshDocuments(); }).catch(report);
  });

  return (
    <Show when={user()}>
      <h1>문서 작업실</h1>
      <section>
        <h2>텍스트 파일</h2>
        <form onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const file = new FormData(form).get("file");
          if (!(file instanceof File) || !file.name) return;
          void run(async () => {
            const document = await responseData(await fetch("/api/documents", {
              method: "POST", headers: { "Content-Type": "text/plain", "X-Filename": encodeURIComponent(file.name) }, body: file
            }));
            setState("selected", document.id);
            await refreshDocuments();
            form.reset();
          });
        }}>
          <label>TXT 또는 MD (최대 64 KiB) <input type="file" name="file" accept=".txt,.md" required /></label>
          <button disabled={state.pending}>올리기</button>
        </form>
        <label>질문할 문서
          <select value={String(state.selected)} disabled={state.pending} onChange={(event) => {
            setState({ selected: Number(event.currentTarget.value), result: "", history: [] });
            void refreshHistory().catch(report);
          }}>
            <option value="0" disabled>문서 선택</option>
            <For each={state.documents}>{(document) => <option value={document.id}>{document.filename}</option>}</For>
          </select>
        </label>
      </section>
      <Show when={state.selected > 0}>
        <section>
          <h2>문서에 질문하기</h2>
          <QuestionForm busy={state.pending} onAsk={(question) => run(async () => {
            setState("result", "");
            controller = new AbortController();
            const response = await fetch("/api/documents/" + state.selected + "/questions", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question }), signal: controller.signal
            });
            await readAnswer(response, (text) => setState("result", (value) => value + text));
            await refreshHistory();
          })} />
          <pre aria-live="polite">{state.result}</pre>
          <details><summary>질문 기록</summary>
            <For each={state.history}>{(entry) => <article><p>{entry.question}</p><pre>{entry.answer}</pre></article>}</For>
          </details>
        </section>
      </Show>
      <section>
        <h2>서비스 연동</h2>
        <button disabled={state.pending} onClick={() => run(async () => {
          await responseData(await fetch("/api/integrations/mail", { method: "POST" }));
          setState("result", "메일 발송을 예약했습니다.");
        })}>내 이메일로 연습 메일 보내기</button>{" "}
        <button disabled={state.pending} onClick={() => run(async () => {
          const { url } = await responseData(await fetch("/api/integrations/checkout", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID() })
          }));
          location.assign(url);
        })}>테스트 결제 열기</button>
        <p role="alert">{state.error}</p>
      </section>
    </Show>
  );
}
