import type { APIEvent } from "@solidjs/start/server";
import { api, json } from "../server/http";

export const GET = ({ request }: APIEvent) => api(request, () => json({ status: "ok" }));
