import type { APIEvent } from "@solidjs/start/server";
import { requireUser } from "../../../server/auth";
import { api, json, missing, objectBody } from "../../../server/http";
import { checkout, enqueueMail, stripeWebhook } from "../../../server/integrations";

export const POST = ({ request, params }: APIEvent) => api(request, async () => {
  if (params.operation === "stripe-webhook") {
    await stripeWebhook(request);
    return new Response(null, { status: 204 });
  }
  const user = await requireUser(request);
  if (params.operation === "mail") {
    await enqueueMail(user);
    return json({ data: { state: "queued" } }, 202);
  }
  if (params.operation === "checkout") {
    const input = await objectBody(request);
    return json({ data: { url: await checkout(user, String(input.idempotencyKey ?? "")) } });
  }
  throw missing();
});
