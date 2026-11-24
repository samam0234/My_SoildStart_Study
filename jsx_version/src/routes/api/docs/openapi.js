import { api, json } from "../../../server/http";
import { openapi } from "../../../server/openapi";
export const GET = ({ request }) => api(request, () => json(openapi));
