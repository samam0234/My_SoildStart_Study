import { action, query, redirect } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { currentUser, requireUser } from "../server/auth";
import { board, cachedPosts } from "../server/board";
import { ApiError, errorBody, guardOrigin, idOf } from "../server/http";

function requestHere() {
  const event = getRequestEvent();
  if (!event) throw new Error("Request context missing");
  return event.request;
}

export const viewer = query(async () => {
  "use server";
  return await currentUser(requestHere()) ?? null;
}, "viewer");

export const getPosts = query(async (search = "") => {
  "use server";
  const url = new URL(requestHere().url);
  url.search = search;
  return cachedPosts(url);
}, "posts");

export const getPost = query(async (id: string) => {
  "use server";
  try {
    const service = await board();
    const number = idOf(id);
    const [post, comments] = await Promise.all([service.detail(number), service.comments(number)]);
    return { post, comments };
  } catch (error) {
    if (error instanceof ApiError && [400, 404].includes(error.status)) return null;
    throw error;
  }
}, "post");

export const writePost = action(async (form: FormData) => {
  "use server";
  try {
    const request = requestHere();
    guardOrigin(request);
    const user = await requireUser(request);
    const service = await board();
    const input = {
      title: form.get("title"),
      body: form.get("body"),
      tags: String(form.get("tags") ?? "").split(",").map((item) => item.trim()).filter(Boolean)
    };
    const id = form.get("id");
    const post = id
      ? await service.edit(idOf(String(id)), user.id, input)
      : await service.create(user.id, input);
    return redirect("/posts/" + post.id, { revalidate: [getPosts.key, getPost.key] });
  } catch (error) {
    if (error instanceof ApiError) return errorBody(error, crypto.randomUUID());
    throw error;
  }
}, "write-post");
