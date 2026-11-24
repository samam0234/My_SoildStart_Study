import { A, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";

export default function App() {
  return (
    <Router root={(props) => (
      <>
        <header class="shell">
          <nav aria-label="주 메뉴">
            <A href="/" end>홈</A>
            <A href="/posts">게시판</A>
            <A href="/account">계정</A>
            <A href="/workbench">문서 작업실</A>
            <a href="/api-docs">API 문서</a>
          </nav>
        </header>
        <main class="shell">
          <Suspense fallback={<p role="status">불러오는 중…</p>}>{props.children}</Suspense>
        </main>
      </>
    )}>
      <FileRoutes />
    </Router>
  );
}
