import { api } from "../../../../server/http";
import { startGithub } from "../../../../server/integrations";
export const GET = ({ request }) => api(request, startGithub);
