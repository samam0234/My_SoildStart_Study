import { randomUUID } from "node:crypto";
import { config } from "./config.ts";

export type Fields = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Fields;
  constructor(status: number, code: string, message: string, fields?: Fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const json = (data: unknown, status = 200, headers?: HeadersInit) => {
  const result = new Headers(headers);
  result.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { status, headers: result });
};

export const badRequest = () => new ApiError(400, "BAD_REQUEST", "요청 형식을 확인하세요.");
export const validation = (fields: Fields, status = 400) => new ApiError(status, "VALIDATION_ERROR", "입력값을 확인하세요.", fields);
export const missing = () => new ApiError(404, "NOT_FOUND", "대상을 찾을 수 없습니다.");
export const forbidden = () => new ApiError(403, "FORBIDDEN", "요청 권한이 없습니다.");
export const unauthorized = () => new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
export const tooLarge = () => new ApiError(413, "PAYLOAD_TOO_LARGE", "파일이 너무 큽니다.");

export function idOf(raw: string | undefined) {
  const id = Number(raw);
  if (!raw || !/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1) throw badRequest();
  return id;
}

export function guardOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const settings = config();
  if (origin && origin !== settings.origin && origin !== settings.corsOrigin) throw forbidden();
  if (!origin && request.headers.get("sec-fetch-site") === "cross-site") throw forbidden();
}

export async function objectBody(request: Request): Promise<Record<string, unknown>> {
  try {
    if (Number(request.headers.get("content-length")) > 65_536) throw tooLarge();
    const reader = request.body?.pipeThrough(new TextDecoderStream()).getReader();
    if (!reader) throw badRequest();
    let text = "";
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        text += part.value;
        if (text.length > 65_536) {
          await reader.cancel();
          throw tooLarge();
        }
      }
    } finally { reader.releaseLock(); }
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw badRequest();
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw badRequest();
  }
}

export function errorBody(error: ApiError, requestId: string) {
  return { error: { code: error.code, message: error.message, fields: error.fields, requestId } };
}

export async function api(request: Request, run: () => Response | Promise<Response>) {
  const requestId = request.headers.get("x-request-id") || randomUUID();
  const started = performance.now();
  let response: Response;
  try {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) guardOrigin(request);
    response = await run();
  } catch (error) {
    if (error instanceof ApiError) response = json(errorBody(error, requestId), error.status);
    else {
      console.error(JSON.stringify({ level: "error", requestId, type: error instanceof Error ? error.name : "unknown" }));
      response = json(errorBody(new ApiError(500, "INTERNAL", "서버 오류가 발생했습니다."), requestId), 500);
    }
  }
  const headers = new Headers(response.headers);
  headers.set("X-Request-Id", requestId);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", headers.get("Cache-Control") ?? "no-store");
  headers.append("Vary", "Origin");
  const origin = request.headers.get("origin");
  if (origin && origin === config().corsOrigin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Id");
    headers.set("Access-Control-Expose-Headers", "X-Request-Id, Location");
  }
  if (process.env.LOG_REQUESTS === "true") {
    console.info(JSON.stringify({ requestId, method: request.method, path: new URL(request.url).pathname, status: response.status, ms: Math.round(performance.now() - started) }));
  }
  return new Response(response.body, { status: response.status, headers });
}

export const options = ({ request }: { request: Request }) => api(request, () => new Response(null, { status: 204 }));
