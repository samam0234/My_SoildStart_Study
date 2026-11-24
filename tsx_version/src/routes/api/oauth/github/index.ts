import type { APIEvent } from "@solidjs/start/server";
import { api } from "../../../../server/http";
import { startGithub } from "../../../../server/integrations";

export const GET = ({ request }: APIEvent) => api(request, startGithub);
