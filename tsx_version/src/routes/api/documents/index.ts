import type { APIEvent } from "@solidjs/start/server";
import { requireUser } from "../../../server/auth";
import { documents, saveDocument } from "../../../server/documents";
import { api, json } from "../../../server/http";

export const GET = ({ request }: APIEvent) => api(request, async () => {
  return json({ data: await documents((await requireUser(request)).id) });
});
export const POST = ({ request }: APIEvent) => api(request, async () => {
  return json({ data: await saveDocument((await requireUser(request)).id, request) }, 201);
});
