import { useSubmission } from "@solidjs/router";
import { For, Show } from "solid-js";
import { writePost } from "../features/board-data";
export function PostForm(props) {
    const submission = useSubmission(writePost);
    const error = () => {
        const result = submission.result;
        return result && "error" in result ? result.error : undefined;
    };
    return (<form action={writePost} method="post">
      <Show when={props.post}><input type="hidden" name="id" value={props.post?.id}/></Show>
      <label>제목 <input name="title" required maxlength="200" value={props.post?.title ?? ""}/></label>
      <label>내용 <textarea name="body" required maxlength="10000" value={props.post?.body ?? ""}/></label>
      <label>태그 <input name="tags" placeholder="study, solidstart" value={props.post?.tags.join(", ") ?? ""}/></label>
      <Show when={error()}>{(failure) => (<div role="alert">
          <p>{failure().code} · {failure().message}</p>
          <ul><For each={Object.entries(failure().fields ?? {})}>{([field, messages]) => (<li>{field} · {messages.join(", ")}</li>)}</For></ul>
        </div>)}</Show>
      <button disabled={submission.pending}>{submission.pending ? "저장 중…" : "저장"}</button>
    </form>);
}
