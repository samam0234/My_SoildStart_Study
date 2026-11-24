import { requireUser } from "../../../server/auth";
import { documents, saveDocument } from "../../../server/documents";
import { api, json } from "../../../server/http";
export const GET = ({ request }) => api(request, async () => {
    return json({ data: await documents((await requireUser(request)).id) });
});
export const POST = ({ request }) => api(request, async () => {
    return json({ data: await saveDocument((await requireUser(request)).id, request) }, 201);
});
