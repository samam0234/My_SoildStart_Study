import type { APIEvent } from "@solidjs/start/server";
import { requireUser } from "../../../server/auth";
import { board } from "../../../server/board";
import { api, idOf, json, objectBody, options } from "../../../server/http";

export const OPTIONS = options;
export const GET = ({ request, params }: APIEvent) => api(request, async () => json({ data: await (await board()).detail(idOf(params.id)) }));
export const PATCH = ({ request, params }: APIEvent) => api(request, async () => {
  const user = await requireUser(request);
  return json({ data: await (await board()).edit(idOf(params.id), user.id, await objectBody(request)) });
});
export const DELETE = ({ request, params }: APIEvent) => api(request, async () => {
  await (await board()).remove(idOf(params.id), (await requireUser(request)).id);
  return new Response(null, { status: 204 });
});
