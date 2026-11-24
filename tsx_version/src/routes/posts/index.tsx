import { A, createAsync, useLocation, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";
import { getPosts } from "../../features/board-data";

export const route = { preload: ({ location }) => getPosts(location.search) } satisfies RouteDefinition;

export default function PostList() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const result = createAsync(() => getPosts(location.search));
  const move = (page: number) => setParams({ page });
  return (
    <>
      <form action="/posts" method="get">
        <label>검색 <input name="q" value={typeof params.q === "string" ? params.q : ""} /></label>
        <label>정렬
          <select name="sort" value={typeof params.sort === "string" ? params.sort : "-createdAt"}>
            <option value="-createdAt">최신순</option><option value="createdAt">오래된 순</option>
            <option value="-commentCount">댓글 많은 순</option>
          </select>
        </label>
        <button>검색</button>
      </form>
      <Show when={result()} keyed>{({ data, meta }) => (
        <>
          <p role="status">총 {meta.total}건 · {meta.page}/{Math.max(1, meta.totalPages)} 페이지</p>
          <ul><For each={data} fallback={<li>일치하는 글이 없습니다.</li>}>{(post) => (
            <li><A href={"/posts/" + post.id}>{post.title}</A> · {post.author.nickname} · 댓글 {post.commentCount}</li>
          )}</For></ul>
          <button disabled={meta.page <= 1} onClick={() => move(meta.page - 1)}>이전</button>
          {" "}<button disabled={meta.page >= meta.totalPages} onClick={() => move(meta.page + 1)}>다음</button>
        </>
      )}</Show>
    </>
  );
}
