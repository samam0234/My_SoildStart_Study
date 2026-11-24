import type { APIEvent } from "@solidjs/start/server";
import { requireUser } from "../../../server/auth";
import { board, cachedPosts } from "../../../server/board";
import { api, json, objectBody, options } from "../../../server/http";

export const OPTIONS = options;
export const GET = ({ request }: APIEvent) => api(request, async () => json(await cachedPosts(new URL(request.url))));
export const POST = ({ request }: APIEvent) => api(request, async () => {
  const user = await requireUser(request);
  const post = await (await board()).create(user.id, await objectBody(request));
  return json({ data: post }, 201, { Location: "/api/posts/" + post.id });
});
