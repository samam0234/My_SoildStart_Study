import { api } from "../server/http";
import { handleMcp } from "../server/mcp";
export const POST = ({ request }) => api(request, () => handleMcp(request));
