import { createAsync, redirect } from "@solidjs/router";
import { Suspense, Show } from "solid-js";
import { viewer } from "../features/board-data";
import { PostForm } from "../components/PostForm";

async function protectedViewer() {
  const user = await viewer();
  if (!user) throw redirect("/account");
  return user;
}

export const route = { preload: () => protectedViewer() };
export default function Board() {
  const user = createAsync(protectedViewer);
  return <Suspense><Show when={user()}>{(member) => (
    <><h1>{member().nickname}의 게시판</h1><h2>글 쓰기</h2><PostForm /></>
  )}</Show></Suspense>;
}
