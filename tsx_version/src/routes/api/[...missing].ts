import type { APIEvent } from "@solidjs/start/server";
import { api, missing, options } from "../../server/http";

const unknown = ({ request }: APIEvent) => api(request, () => { throw missing(); });
export { unknown as GET, unknown as POST, unknown as PATCH, unknown as DELETE, unknown as PUT, options as OPTIONS };
