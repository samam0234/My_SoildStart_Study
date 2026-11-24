import { getStore, one, unpack } from "./db.ts";
import { ApiError, badRequest, missing, tooLarge, validation } from "./http.ts";

const maxBytes = 64 * 1024;
type Uploaded = { filename: string; text: string; byteSize: number; createdAt: string };
export type DocumentInfo = { id: number; filename: string; byteSize: number; createdAt: string };
const describe = (id: number, { filename, byteSize, createdAt }: Uploaded): DocumentInfo => ({ id, filename, byteSize, createdAt });

export async function limitedBytes(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw badRequest();
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw tooLarge();
      }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(parts, length);
}

export async function saveDocument(owner: number, request: Request) {
  let filename;
  try { filename = decodeURIComponent(request.headers.get("x-filename") ?? ""); }
  catch { throw badRequest(); }
  if (!/\.(txt|md)$/i.test(filename) || /[\\/\u0000-\u001f]/.test(filename) || filename.length > 140) {
    throw validation({ filename: ["TXT 또는 MD 이름을 확인하세요."] });
  }
  const contentType = request.headers.get("content-type")?.split(";")[0];
  if (contentType !== "text/plain") throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "텍스트 파일만 업로드할 수 있습니다.");
  const bytes = await limitedBytes(request, maxBytes);
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim(); }
  catch { throw validation({ file: ["UTF-8 파일로 저장하세요."] }); }
  if (!text || text.includes("\0")) throw validation({ file: ["내용이 있는 UTF-8 텍스트를 선택하세요."] });
  const data = { filename, text, byteSize: bytes.byteLength, createdAt: new Date().toISOString() };
  const row = await (await getStore()).insert("documents", { owner, payload: JSON.stringify(data) });
  return describe(row.id, data);
}

export async function documents(owner: number) {
  return (await (await getStore()).list("documents", { owner })).reverse()
    .map((row) => describe(row.id, unpack<Uploaded>(row)));
}

export async function documentText(owner: number, id: number) {
  const row = await one(await getStore(), "documents", { id, owner });
  if (!row) throw missing();
  return unpack<Uploaded>(row).text;
}

export function excerpts(text: string, question: string) {
  const terms = question.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const ranked = (text.match(/[\s\S]{1,800}/gu) ?? []).map((chunk, index) => ({
    chunk,
    number: index + 1,
    score: terms.filter((term) => chunk.toLowerCase().includes(term)).length
  }));
  return ranked.sort((a, b) => b.score - a.score).slice(0, 4);
}
