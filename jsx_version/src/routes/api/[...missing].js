import { api, missing, options } from "../../server/http";
const unknown = ({ request }) => api(request, () => { throw missing(); });
export { unknown as GET, unknown as POST, unknown as PATCH, unknown as DELETE, unknown as PUT, options as OPTIONS };
