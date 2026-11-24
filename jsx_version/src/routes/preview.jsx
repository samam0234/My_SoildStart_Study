import { createSignal, For } from "solid-js";
export default function Preview() {
    const [pending, setPending] = createSignal(false);
    const [result, setResult] = createSignal("");
    const [fields, setFields] = createSignal([]);
    async function submit(event) {
        event.preventDefault();
        if (pending())
            return;
        const form = event.currentTarget;
        setPending(true);
        setFields([]);
        try {
            const response = await fetch("/api/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: new FormData(form).get("title") })
            });
            const body = await response.json();
            if (response.status === 200)
                setResult("미리보기 · " + body.data.title);
            else {
                setResult(response.status + " · " + body.error.message);
                setFields(body.error.fields?.title ?? []);
            }
        }
        catch {
            setResult("서버에 연결할 수 없습니다.");
        }
        finally {
            setPending(false);
        }
    }
    return (<>
      <h1>글 제목 미리보기</h1>
      <form onSubmit={submit} novalidate>
        <label>제목 <input name="title" required maxlength="200" aria-describedby="errors"/></label>
        <button disabled={pending()}>확인</button>
      </form>
      <p role="status">{result()}</p>
      <ul id="errors"><For each={fields()}>{(error) => <li>{error}</li>}</For></ul>
    </>);
}
