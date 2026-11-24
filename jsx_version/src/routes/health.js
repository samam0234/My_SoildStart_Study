import { api, json } from "../server/http";
export const GET = ({ request }) => api(request, () => json({ status: "ok" }));
