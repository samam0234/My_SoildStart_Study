# study17 · WebSocket과 파일 처리

## ① 목표

Nitro WebSocket으로 공개 게시판 변경을 알리고 파일 업로드의 한도와 인증을 확인한다.

## ② 📖 이론

- WebSocket은 연결을 유지하는 통화처럼 서버가 변경을 바로 알릴 수 있다. 브라우저는 wss 또는 ws로 연결하고 서버는 변경 종류만 전달한다.
- 알림이 오면 라우터의 목록·상세 키를 revalidate한다. 구독은 연결 종료에 정리하고 허용 Origin에서만 연결한다.
- 업로드는 본문 전체를 받기 전에 Content-Length를 보고, 스트리밍 도중에도 실제 바이트를 센다. 문서는 공개 알림에 넣지 않고 인증된 소유자가 서버에서만 찾는다.

## ③ 🛠️ 실기

### 실행 단계

1. /posts를 탭 두 개에서 열고 DevTools Network의 WS 항목을 확인한다.
2. 한 탭에서 새 글·댓글을 등록하고 다른 탭의 알림과 목록 갱신을 확인한다.
3. /workbench에서 64 KiB 이하 파일을 올린 뒤 더 큰 파일을 보낸다. 413과 저장 거부를 확인한다.

### 전체 코드 · `tsx_version/server/routes/ws.ts`

```ts
import { defineWebSocketHandler } from "nitro";
import { subscribe } from "../../src/server/announcements";
import { config } from "../../src/server/config";

const cleanups = new Map<string, () => void>();
function remove(id: string) {
  cleanups.get(id)?.();
  cleanups.delete(id);
}

export default defineWebSocketHandler({
  upgrade(request) {
    if (request.headers.get("origin") !== config().origin) return new Response(null, { status: 403 });
  },
  open(peer) {
    if (cleanups.size >= 100) {
      peer.close(1013, "Too many connections");
      return;
    }
    cleanups.set(peer.id, subscribe((message) => peer.send(message)));
    peer.send(JSON.stringify({ kind: "connected" }));
  },
  close(peer) { remove(peer.id); },
  error(peer) { remove(peer.id); }
});
```

#### 줄별 설명

- 1행 · Nitro WebSocket 핸들러를 불러온다.
- 2–4행 · 같은 프로세스 안의 변경 구독을 연결한다.
- 5–6행 · 소켓 ID별 정리 함수를 저장한다.
- 7–11행 · 종료 때 해당 구독을 제거한다.
- 12–14행 · 브라우저 요청 Origin을 운영 주소와 대조한다.
- 15–18행 · 최대 연결 수에 도달하면 종료한다.
- 19–21행 · 각 소켓에서 서버가 전달한 변경 종류를 보낸다.
- 22–25행 · 연결 종료와 오류에서 구독을 해제한다.

### 전체 코드 · `tsx_version/src/components/LiveStatus.tsx`

```tsx
import { createSignal, onCleanup, onMount } from "solid-js";
import { revalidate } from "@solidjs/router";
import { getPost, getPosts } from "../features/board-data";

export function LiveStatus() {
  const [status, setStatus] = createSignal("알림 연결 준비 중");
  let socket: WebSocket | undefined;
  onMount(() => {
    const url = new URL("/ws", location.href);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(url);
    socket.onopen = () => setStatus("실시간 알림 연결됨");
    socket.onmessage = (message) => {
      if (JSON.parse(message.data).kind === "connected") return;
      setStatus("게시판 변경 감지 · " + new Date().toLocaleTimeString());
      void revalidate([getPosts.key, getPost.key]);
    };
    socket.onerror = socket.onclose = () => setStatus("알림 연결 종료 · 새로고침으로 재연결");
  });
  onCleanup(() => socket?.close());
  return <p role="status">{status()}</p>;
}
```

#### 줄별 설명

- 1–7행 · 브라우저 생명주기 훅과 상태를 사용한다.
- 8–9행 · 마운트된 브라우저에서만 소켓을 연다.
- 10–12행 · 현재 페이지 프로토콜을 ws 또는 wss로 연결한다.
- 13–15행 · 글 변경 이벤트를 받고 화면 상태를 바꾼다.
- 16–19행 · 라우터 조회를 새로 실행한다.
- 20–22행 · 화면이 사라지면 소켓을 닫는다.

### 전체 코드 · `tsx_version/src/server/documents.ts`

```ts
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
```

#### 줄별 설명

- 1–3행 · 공통 DB와 HTTP 오류 도구를 가져온다.
- 4–8행 · 업로드에서 파일명·텍스트·실제 크기를 기록한다.
- 9–28행 · 헤더와 스트림을 검사해 최대 바이트 수를 제한한다.
- 29–38행 · 파일명, 확장자와 MIME 타입을 검사한다.
- 39–46행 · UTF-8 해석과 내용 검증을 거친 뒤 소유권과 함께 저장한다.
- 47–57행 · 사용자의 문서 목록과 문서 본문 조회를 제공한다.
- 58–68행 · 질문 단어를 포함한 문서 발췌를 순위로 고른다.

## ④ 🔗 연동 포인트

- 파일 처리 결과는 study18의 문서 검색과 Q&A 입력으로 쓰인다.
- 운영 프록시에서 WebSocket 업그레이드를 전달한다. 여러 인스턴스가 필요하면 인스턴스 간 이벤트를 공유하도록 변경한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| WebSocket 403 | 현재 브라우저 Origin이 APP_ORIGIN과 다름 | 정확한 호스트·포트와 HTTPS 주소를 맞춘다. |
| 연결은 되지만 알림이 안 옴 | 두 탭의 요청이 다른 프로세스로 감 | 단일 인스턴스 또는 공유 이벤트 경로를 점검한다. |
| 413 파일 요청 | 헤더 또는 실제 본문이 한도를 넘음 | 텍스트를 작게 나눠 업로드한다. |

## ⑥ 직접 해보기

1. DevTools에서 변경 프레임을 기록하고 저장 응답과 시간 순서를 비교한다.
2. 두 계정으로 같은 문서 ID의 조회나 질문을 시도해 한 계정만 접근하는지 확인한다.

## ⑦ ☐ 체크리스트

- [ ] WebSocket 연결·변경 발표·구독 해제 확인
- [ ] 파일 크기 제한과 소유자 접근 확인
- [ ] 프록시 Upgrade 및 wss 점검

## ⑧ 다음 단계

[study18 · AI 모델과 MCP](study18.md)에서 DocuForge의 문서 요약·근거 Q&A를 SolidStart 안에서 만들고 스트리밍과 MCP를 연결한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
- [SolidStart v2 WebSocket](https://docs.solidjs.com/solid-start/v2/advanced/websocket)
