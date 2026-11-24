import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import Stripe from "stripe";
import { githubUser, sessionCookie } from "./auth.js";
import { config } from "./config.js";
import { getStore, isUniqueConflict, unpack } from "./db.js";
import { limitedBytes } from "./documents.js";
import { ApiError, badRequest, forbidden } from "./http.js";
const unavailable = () => new ApiError(503, "SERVICE_UNAVAILABLE", "서비스 설정을 확인하세요.");
const upstream = () => new ApiError(502, "UPSTREAM_ERROR", "외부 서비스 응답을 확인하세요.");
export async function checkout(user, idempotencyKey) {
    const { STRIPE_SECRET_KEY: secret, STRIPE_PRICE_ID: price } = process.env;
    if (!secret || !price)
        throw unavailable();
    if (!/^[\w-]{16,80}$/.test(idempotencyKey))
        throw badRequest();
    const origin = config().origin;
    const stripe = new Stripe(secret, { timeout: 10_000, maxNetworkRetries: 1 });
    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price, quantity: 1 }],
        client_reference_id: String(user.id),
        success_url: origin + "/workbench?checkout=success",
        cancel_url: origin + "/workbench?checkout=cancel"
    }, { idempotencyKey: user.id + "/" + idempotencyKey });
    if (!session.url)
        throw upstream();
    return session.url;
}
export async function stripeWebhook(request) {
    const { STRIPE_SECRET_KEY: key, STRIPE_WEBHOOK_SECRET: secret } = process.env;
    if (!key || !secret)
        throw unavailable();
    const body = await limitedBytes(request, 256 * 1024);
    let event;
    try {
        event = new Stripe(key).webhooks.constructEvent(body, request.headers.get("stripe-signature") ?? "", secret);
    }
    catch {
        throw badRequest();
    }
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        const session = event.data.object;
        if (session.payment_status === "paid" && /^\d+$/.test(session.client_reference_id ?? "")) {
            try {
                await (await getStore()).insert("payments", {
                    key: session.id,
                    owner: Number(session.client_reference_id),
                    payload: JSON.stringify({ status: "paid", eventId: event.id })
                });
            }
            catch (error) {
                if (!isUniqueConflict(error))
                    throw error;
            }
        }
    }
}
export async function enqueueMail(user) {
    if (!process.env.SMTP_URL || !process.env.MAIL_FROM)
        throw unavailable();
    await (await getStore()).insert("jobs", {
        owner: user.id,
        payload: JSON.stringify({ email: user.email, state: "queued", attempts: 0, nextAt: Date.now() })
    });
}
export async function workMail() {
    const { SMTP_URL: url, MAIL_FROM: from } = process.env;
    if (!url || !from)
        return;
    const store = await getStore();
    for (const row of (await store.list("jobs")).filter((item) => {
        const job = unpack(item);
        return (job.state === "queued" || job.state === "sending") && job.nextAt <= Date.now();
    }).slice(0, 5)) {
        const job = unpack(row);
        const claimed = { ...job, state: "sending", nextAt: Date.now() + 90_000, attempts: job.attempts + 1 };
        const payload = JSON.stringify(claimed);
        if (!await store.update("jobs", { id: row.id, payload: row.payload }, payload))
            continue;
        try {
            const endpoint = new URL(url);
            if (endpoint.protocol !== "smtp:" && endpoint.protocol !== "smtps:")
                throw new Error("Invalid SMTP protocol");
            const secure = endpoint.protocol === "smtps:";
            const transport = nodemailer.createTransport({
                host: endpoint.hostname, port: Number(endpoint.port || (secure ? 465 : 587)), secure,
                requireTLS: endpoint.searchParams.get("requireTLS") === "true",
                auth: endpoint.username ? { user: decodeURIComponent(endpoint.username), pass: decodeURIComponent(endpoint.password) } : undefined,
                connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 8000
            });
            await transport.sendMail({
                from, to: job.email, subject: "SolidStart 작업실",
                text: "작업실 메일 전송 실습입니다.",
                messageId: "<solidstart-job-" + row.id + "@" + new URL(config().origin).hostname + ">"
            });
            await store.update("jobs", { id: row.id, payload }, JSON.stringify({ ...claimed, state: "sent" }));
        }
        catch {
            const state = claimed.attempts < 3 ? "queued" : "failed";
            await store.update("jobs", { id: row.id, payload }, JSON.stringify({ ...claimed, state, nextAt: Date.now() + 1000 * 2 ** claimed.attempts }));
        }
    }
}
function oauthSettings() {
    const { GITHUB_CLIENT_ID: clientId, GITHUB_CLIENT_SECRET: secret } = process.env;
    if (!clientId || !secret)
        throw unavailable();
    return { clientId, secret, callback: config().origin + "/api/oauth/github/callback" };
}
function stateCookie(value, age) {
    return "oauth_github=" + value + "; Path=/api/oauth/github; HttpOnly; SameSite=Lax; Max-Age=" + age +
        (config().secureCookie ? "; Secure" : "");
}
export function startGithub() {
    const options = oauthSettings();
    const state = randomBytes(32).toString("hex");
    const verifier = randomBytes(32).toString("base64url");
    const url = new URL("https://github.com/login/oauth/authorize");
    url.search = new URLSearchParams({
        client_id: options.clientId, redirect_uri: options.callback, scope: "read:user user:email",
        state, code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url")
    }).toString();
    return new Response(null, { status: 302, headers: { Location: url.href, "Set-Cookie": stateCookie(state + "." + verifier, 600) } });
}
export async function finishGithub(request) {
    const options = oauthSettings();
    const { searchParams } = new URL(request.url);
    const [state, verifier] = (/\boauth_github=([^;]+)/.exec(request.headers.get("cookie") ?? "")?.[1] ?? "").split(".");
    const code = searchParams.get("code");
    if (!code || !state || !verifier || searchParams.get("state") !== state)
        throw forbidden();
    const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST", signal: AbortSignal.timeout(10_000),
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: options.clientId, client_secret: options.secret, code, code_verifier: verifier, redirect_uri: options.callback })
    });
    if (!response.ok)
        throw upstream();
    const { access_token: token } = await response.json();
    if (typeof token !== "string")
        throw upstream();
    const lookup = (path) => fetch("https://api.github.com" + path, {
        headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(10_000)
    });
    const [profileResult, emailsResult] = await Promise.all([lookup("/user"), lookup("/user/emails")]);
    if (!profileResult.ok || !emailsResult.ok)
        throw upstream();
    const profile = await profileResult.json();
    const emails = await emailsResult.json();
    const email = emails.find((item) => item.primary && item.verified)?.email;
    if (!email || !Number.isSafeInteger(profile.id) || typeof profile.login !== "string")
        throw upstream();
    const session = await githubUser(String(profile.id), email, profile.login);
    const headers = new Headers({ Location: "/board" });
    headers.append("Set-Cookie", stateCookie("", 0));
    headers.append("Set-Cookie", sessionCookie(session.accessToken));
    return new Response(null, { status: 302, headers });
}
