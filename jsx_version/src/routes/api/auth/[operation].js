import { login, requireUser, revoke, sessionCookie, signup } from "../../../server/auth";
import { api, json, missing, objectBody, options } from "../../../server/http";
export const OPTIONS = options;
export const GET = ({ request, params }) => api(request, async () => {
    if (params.operation !== "me")
        throw missing();
    return json({ data: await requireUser(request) });
});
export const POST = ({ request, params }) => api(request, async () => {
    switch (params.operation) {
        case "signup": return json({ data: await signup(await objectBody(request)) }, 201);
        case "login": {
            const data = await login(await objectBody(request));
            return json({ data }, 200, { "Set-Cookie": sessionCookie(data.accessToken) });
        }
        case "logout":
            await requireUser(request);
            await revoke(request);
            return new Response(null, { status: 204, headers: { "Set-Cookie": sessionCookie() } });
        default: throw missing();
    }
});
