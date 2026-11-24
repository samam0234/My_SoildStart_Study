import { requireUser } from "../../../server/auth";
import { board } from "../../../server/board";
import { api, idOf, options } from "../../../server/http";
export const OPTIONS = options;
export const DELETE = ({ request, params }) => api(request, async () => {
    await (await board()).removeComment(idOf(params.id), (await requireUser(request)).id);
    return new Response(null, { status: 204 });
});
