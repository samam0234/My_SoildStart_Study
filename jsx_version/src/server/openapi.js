const media = "application/json";
const ref = (name) => ({ $ref: "#/components/schemas/" + name });
const object = (properties, required = Object.keys(properties)) => ({ type: "object", required, properties });
const string = { type: "string" };
const integer = { type: "integer", minimum: 1 };
const date = { type: "string", format: "date-time" };
const array = (items) => ({ type: "array", items });
const data = (schema) => object({ data: schema });
const response = (description, schema) => ({
    description, headers: { "X-Request-Id": { schema: string } },
    ...(schema ? { content: { [media]: { schema } } } : {})
});
const error = (description) => response(description, ref("Error"));
const secure = [{ bearer: [] }, { session: [] }];
const idParameter = { in: "path", name: "id", required: true, schema: integer };
const query = (name, schema) => ({ in: "query", name, schema });
const body = (schema) => ({ required: true, content: { [media]: { schema } } });
function operation(summary, status, schema, settings = {}) {
    const common = {
        400: "형식 또는 입력 오류", 401: "인증 실패", 403: "권한 없음", 404: "대상 없음",
        409: "충돌", 413: "본문 크기 초과", 429: "요청 한도 초과", 500: "서버 오류"
    };
    const errors = Object.fromEntries([...(settings.errors ?? []), 500].map((code) => [code, error(common[code])]));
    const success = response(status === 204 ? "본문 없음" : "성공", schema);
    return {
        summary,
        ...(settings.auth && { security: secure }),
        ...(settings.input === undefined ? {} : { requestBody: body(settings.input) }),
        responses: {
            ...errors,
            [status]: {
                ...success,
                headers: { ...success.headers, ...(settings.location && { Location: { schema: string } }) }
            }
        }
    };
}
export const openapi = {
    openapi: "3.0.3",
    info: { title: "SolidStart 게시판 공통 API", version: "1.0.0" },
    servers: [{ url: "/" }],
    paths: {
        "/health": { get: operation("프로세스 상태", 200, object({ status: { type: "string", enum: ["ok"] } })) },
        "/api/auth/signup": { post: operation("회원가입", 201, data(ref("User")), {
                input: object({ email: string, password: string, nickname: string }), errors: [400, 409, 413]
            }) },
        "/api/auth/login": { post: operation("로그인", 200, data(object({ user: ref("User"), accessToken: string })), {
                input: object({ email: string, password: string }), errors: [400, 401, 413]
            }) },
        "/api/auth/logout": { post: operation("로그아웃", 204, undefined, { auth: true, errors: [401] }) },
        "/api/auth/me": { get: operation("내 정보", 200, data(ref("User")), { auth: true, errors: [401] }) },
        "/api/posts": {
            get: {
                ...operation("게시글 목록", 200, object({ data: array(ref("PostSummary")), meta: ref("Page") })),
                parameters: [
                    query("q", string), query("page", { ...integer, default: 1 }),
                    query("limit", { ...integer, maximum: 50, default: 10 }),
                    query("sort", { type: "string", enum: ["createdAt", "-createdAt", "-commentCount"], default: "-createdAt" })
                ]
            },
            post: operation("게시글 작성", 201, data(ref("Post")), {
                auth: true, input: ref("PostInput"), errors: [400, 401, 413], location: true
            })
        },
        "/api/posts/{id}": {
            parameters: [idParameter],
            get: operation("게시글 상세", 200, data(ref("Post")), { errors: [400, 404] }),
            patch: operation("게시글 부분 수정", 200, data(ref("Post")), {
                auth: true, input: object({ title: string, body: string, tags: array(string) }, []), errors: [400, 401, 403, 404, 413]
            }),
            delete: operation("게시글 삭제", 204, undefined, { auth: true, errors: [400, 401, 403, 404] })
        },
        "/api/posts/{id}/comments": {
            parameters: [idParameter],
            get: operation("댓글 목록", 200, data(array(ref("Comment"))), { errors: [400, 404] }),
            post: operation("댓글 작성", 201, data(ref("Comment")), {
                auth: true, input: object({ body: string }), errors: [400, 401, 404, 413]
            })
        },
        "/api/comments/{id}": {
            parameters: [idParameter],
            delete: operation("댓글 삭제", 204, undefined, { auth: true, errors: [400, 401, 403, 404] })
        }
    },
    components: {
        securitySchemes: {
            bearer: { type: "http", scheme: "bearer" },
            session: { type: "apiKey", in: "cookie", name: "board_session" }
        },
        schemas: {
            User: object({ id: integer, email: { type: "string", format: "email" }, nickname: string }),
            Author: object({ id: integer, nickname: string }),
            PostInput: object({ title: { type: "string", minLength: 1, maxLength: 200 }, body: string, tags: array(string) }, ["title", "body"]),
            PostSummary: object({ id: integer, title: string, author: ref("Author"), commentCount: { type: "integer", minimum: 0 }, createdAt: date }),
            Post: { allOf: [ref("PostSummary"), object({ body: string, tags: array(string), updatedAt: date })] },
            Comment: object({ id: integer, body: string, createdAt: date, author: ref("Author") }),
            Page: object({ page: integer, limit: integer, total: { type: "integer" }, totalPages: { type: "integer" }, q: string }),
            Error: object({ error: object({ code: string, message: string, fields: { type: "object", additionalProperties: array(string) }, requestId: string }, ["code", "message", "requestId"]) })
        }
    }
};
