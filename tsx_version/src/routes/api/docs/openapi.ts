import type { APIEvent } from "@solidjs/start/server";
import { api, json } from "../../../server/http";
import { openapi } from "../../../server/openapi";

export const GET = ({ request }: APIEvent) => api(request, () => json(openapi));
