import { answer, history } from "../../../../server/ai";
import { requireUser } from "../../../../server/auth";
import { api, idOf, json, objectBody } from "../../../../server/http";
export const GET = ({ request, params }) => api(request, async () => {
    return json({ data: await history((await requireUser(request)).id, idOf(params.id)) });
});
export const POST = ({ request, params }) => api(request, async () => {
    const user = await requireUser(request);
    return answer(user.id, idOf(params.id), await objectBody(request), request.signal);
});
