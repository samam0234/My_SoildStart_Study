import type { APIEvent } from "@solidjs/start/server";
import { api } from "../server/http";
import { handleMcp } from "../server/mcp";

export const POST = ({ request }: APIEvent) => api(request, () => handleMcp(request));
