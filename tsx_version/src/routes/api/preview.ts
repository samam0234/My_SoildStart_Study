import type { APIEvent } from "@solidjs/start/server";
import { api, json, objectBody, validation } from "../../server/http";

export const POST = (event: APIEvent) => api(event.request, async () => {
  const data = await objectBody(event.request);
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || title.length > 200) {
    throw validation({ title: ["1~200자로 입력하세요."] }, 422);
  }
  return json({ data: { title } });
});
