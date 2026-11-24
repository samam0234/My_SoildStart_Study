import { A } from "@solidjs/router";
import { LiveStatus } from "../components/LiveStatus";
export default function PostsLayout(props) {
    return (<>
      <h1>학습 게시판</h1>
      <nav aria-label="게시판 메뉴"><A href="/posts" end>목록</A><A href="/board">내 게시판</A></nav>
      <LiveStatus />
      {props.children}
    </>);
}
