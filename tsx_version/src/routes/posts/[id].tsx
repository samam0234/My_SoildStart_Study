import { A, createAsync, useNavigate, useParams, revalidate, type RouteDefinition } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";
import { createSignal, For, Show } from "solid-js";
import { getPost, getPosts, viewer } from "../../features/board-data";
import { PostForm } from "../../components/PostForm";

export const route = { preload: ({ params }) => Promise.all([getPost(params.id ?? ""), viewer()]) } satisfies RouteDefinition;

export default function PostDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const result = createAsync(() => getPost(params.id ?? ""));
  const user = createAsync(() => viewer());
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const postUrl = () => "/api/posts/" + encodeURIComponent(params.id ?? "");

  async function mutate(path: string, method: "POST" | "DELETE", body?: unknown) {
    if (pending()) return false;
    setPending(true);
    setError("");
    try {
      const response = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      if (!response.ok) throw new Error((await response.json()).error.message);
      if (path === postUrl() && method === "DELETE") navigate("/posts");
      await revalidate([getPost.key, getPosts.key]);
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "요청 실패");
      return false;
    } finally { setPending(false); }
  }

  return (
    <Show when={result() !== undefined}>
      <Show when={result()} keyed fallback={<><HttpStatusCode code={404} /><p>글을 찾을 수 없습니다.</p></>}>
        {({ post, comments }) => (
          <>
            <article><h2>{post.title}</h2><p>{post.author.nickname} · {post.createdAt}</p><pre>{post.body}</pre><p>{post.tags.join(", ")}</p></article>
            <Show when={user()?.id === post.author.id}>
              <details><summary>글 수정</summary><PostForm post={post} /></details>
              <button disabled={pending()} onClick={() => { if (confirm("글을 삭제할까요?")) void mutate(postUrl(), "DELETE"); }}>글 삭제</button>
            </Show>
            <h2>댓글</h2>
            <ul><For each={comments}>{(item) => <li>{item.author.nickname} · {item.body}
              <Show when={item.author.id === user()?.id}>
                {" "}<button disabled={pending()} onClick={() => mutate("/api/comments/" + item.id, "DELETE")}>댓글 삭제</button>
              </Show>
            </li>}</For></ul>
            <Show when={user()} fallback={<A href="/account">로그인하고 댓글 달기</A>}>
              <form onSubmit={async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                if (await mutate(postUrl() + "/comments", "POST", { body: new FormData(form).get("body") })) form.reset();
              }}>
                <label>댓글 <input name="body" required maxlength="2000" /></label>
                <button disabled={pending()}>댓글 쓰기</button>
              </form>
            </Show>
            <p role="alert">{error()}</p>
          </>
        )}
      </Show>
    </Show>
  );
}
