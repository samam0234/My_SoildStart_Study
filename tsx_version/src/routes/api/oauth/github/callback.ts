import type { APIEvent } from "@solidjs/start/server";
import { api } from "../../../../server/http";
import { finishGithub } from "../../../../server/integrations";

export const GET = ({ request }: APIEvent) => api(request, () => finishGithub(request));
