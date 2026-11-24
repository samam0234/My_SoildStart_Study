import type { APIEvent } from "@solidjs/start/server";
import { requireUser } from "../../../../server/auth";
import { board } from "../../../../server/board";
import { api, idOf, json, objectBody, options } from "../../../../server/http";

export const OPTIONS = options;
export const GET = ({ request, params }: APIEvent) => api(request, async () => {
  const data = await (await board()).comments(idOf(params.id));
  return json({ data });
});
export const POST = ({ request, params }: APIEvent) => api(request, async () => {
  const user = await requireUser(request);
  return json({ data: await (await board()).comment(idOf(params.id), user.id, await objectBody(request)) }, 201);
});
