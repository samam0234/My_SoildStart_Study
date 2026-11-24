import { validation } from "./http.ts";

export function textField(data: Record<string, unknown>, key: string, min: number, max: number) {
  const value = typeof data[key] === "string" ? data[key].trim() : "";
  if (value.length < min || value.length > max) throw validation({ [key]: [min + "~" + max + "자로 입력하세요."] });
  return value;
}

export type PostInput = { title: string; body: string; tags: string[] };

export function postInput(data: Record<string, unknown>, current?: PostInput): PostInput {
  const title = current && !Object.hasOwn(data, "title") ? current.title : textField(data, "title", 1, 200);
  const body = current && !Object.hasOwn(data, "body") ? current.body : textField(data, "body", 1, 10_000);
  const tags = Object.hasOwn(data, "tags") ? data.tags : current?.tags ?? [];
  if (!Array.isArray(tags) || tags.length > 10 || tags.some((tag) => typeof tag !== "string" || !tag.trim() || tag.length > 30)) {
    throw validation({ tags: ["태그는 각 1~30자, 최대 10개입니다."] });
  }
  return { title, body, tags: [...new Set(tags.map((tag: string) => tag.trim()))] };
}

export function pageQuery(url: URL) {
  function number(name: string, fallback: number) {
    const value = Number(url.searchParams.get(name));
    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
  }
  const sort = url.searchParams.get("sort");
  return {
    page: number("page", 1),
    limit: Math.min(number("limit", 10), 50),
    q: (url.searchParams.get("q") ?? "").trim().slice(0, 200),
    sort: sort === "createdAt" || sort === "-commentCount" ? sort : "-createdAt"
  } as const;
}
