import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { config } from "./config.js";
import { getStore, isUniqueConflict, one, unpack } from "./db.js";
import { ApiError, unauthorized, validation } from "./http.js";
import { textField } from "./validation.js";
const derive = promisify(scrypt);
const dummyHash = "00000000000000000000000000000000:" + "00".repeat(64);
const digest = (token) => createHash("sha256").update(token).digest("hex");
const expose = (id, { email, nickname }) => ({ id, email, nickname });
const cookieName = "board_session";
async function hashPassword(password, salt = randomBytes(16).toString("hex")) {
    const key = await derive(password, salt, 64);
    return salt + ":" + key.toString("hex");
}
function passwordOf(data, signup) {
    const password = typeof data.password === "string" ? data.password : "";
    if (password.length < (signup ? 8 : 1) || password.length > 128) {
        throw validation({ password: ["비밀번호는 8~128자로 입력하세요."] });
    }
    return password;
}
function emailOf(data) {
    const email = textField(data, "email", 3, 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw validation({ email: ["이메일 형식을 확인하세요."] });
    return email;
}
export async function signup(data) {
    const profile = {
        email: emailOf(data),
        nickname: textField(data, "nickname", 1, 40),
        hash: await hashPassword(passwordOf(data, true))
    };
    try {
        const row = await (await getStore()).insert("users", { key: profile.email, payload: JSON.stringify(profile) });
        return expose(row.id, profile);
    }
    catch (error) {
        if (isUniqueConflict(error))
            throw new ApiError(409, "EMAIL_TAKEN", "이미 등록된 이메일입니다.");
        throw error;
    }
}
export async function login(data) {
    const email = emailOf(data);
    const password = passwordOf(data, false);
    const row = await one(await getStore(), "users", { key: email });
    const profile = row && unpack(row);
    const [salt, expected] = (profile?.hash ?? dummyHash).split(":");
    const actual = (await hashPassword(password, salt)).split(":")[1];
    const matches = timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
    if (!row || !profile?.hash || !matches) {
        throw new ApiError(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    return { user: expose(row.id, profile), accessToken: await issueSession(row.id) };
}
export async function issueSession(id) {
    const token = randomBytes(32).toString("hex");
    await (await getStore()).insert("sessions", {
        key: digest(token), owner: id, payload: JSON.stringify({ expires: Date.now() + 3_600_000 })
    });
    return token;
}
function tokenOf(request) {
    const bearer = request.headers.get("authorization");
    if (bearer !== null)
        return /^Bearer ([a-f0-9]{64})$/i.exec(bearer)?.[1];
    return /(?:^|;\s*)board_session=([a-f0-9]{64})(?:;|$)/.exec(request.headers.get("cookie") ?? "")?.[1];
}
export async function currentUser(request) {
    const token = tokenOf(request);
    if (!token)
        return undefined;
    const store = await getStore();
    const session = await one(store, "sessions", { key: digest(token) });
    if (session?.owner == null)
        return undefined;
    if (unpack(session).expires < Date.now()) {
        await store.remove("sessions", { id: session.id });
        return undefined;
    }
    const row = await one(store, "users", { id: session.owner });
    return row ? expose(row.id, unpack(row)) : undefined;
}
export async function requireUser(request) {
    const user = await currentUser(request);
    if (!user)
        throw unauthorized();
    return user;
}
export async function revoke(request) {
    const token = tokenOf(request);
    if (token)
        await (await getStore()).remove("sessions", { key: digest(token) });
}
export function sessionCookie(token = "", secure = config().secureCookie) {
    return cookieName + "=" + token + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" +
        (token ? "3600" : "0") + (secure ? "; Secure" : "");
}
export async function githubUser(subject, email, nickname) {
    const store = await getStore();
    const key = "github/" + subject;
    let row = await one(store, "users", { key });
    if (!row) {
        const payload = JSON.stringify({ email, nickname, hash: null });
        try {
            row = await store.insert("users", { key, payload });
        }
        catch (error) {
            if (!isUniqueConflict(error))
                throw error;
            row = await one(store, "users", { key });
            if (!row)
                throw error;
        }
    }
    return { user: expose(row.id, unpack(row)), accessToken: await issueSession(row.id) };
}
