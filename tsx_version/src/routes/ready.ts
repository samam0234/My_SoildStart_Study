import type { APIEvent } from "@solidjs/start/server";
import { getStore } from "../server/db";
import { ApiError, api, json } from "../server/http";

export const GET = ({ request }: APIEvent) => api(request, async () => {
  try { await (await getStore()).list("posts", { id: 0 }); }
  catch { throw new ApiError(503, "DATABASE_UNAVAILABLE", "저장소에 연결할 수 없습니다."); }
  return json({ status: "ready" });
});
