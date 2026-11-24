import { createMiddleware } from "@solidjs/start/middleware";
import { currentUser } from "./server/auth";

const privatePages = new Set(["/board", "/workbench"]);

export default createMiddleware([async (event, next) => {
  const path = new URL(event.req.url).pathname.replace(/\/$/, "");
  if ((event.req.method === "GET" || event.req.method === "HEAD") && privatePages.has(path)) {
    if (!await currentUser(event.req)) return new Response(null, {
      status: 302, headers: { Location: "/account", "Cache-Control": "no-store" }
    });
    const response = await next();
    event.res.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  return next();
}]);
