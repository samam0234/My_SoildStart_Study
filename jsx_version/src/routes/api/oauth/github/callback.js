import { api } from "../../../../server/http";
import { finishGithub } from "../../../../server/integrations";
export const GET = ({ request }) => api(request, () => finishGithub(request));
