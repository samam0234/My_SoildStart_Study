# study15 · 성능, 캐시와 비동기 작업

## ① 목표

목록 캐시와 메일 작업 큐를 실습하고 실제 응답 지연을 측정한다.

## ② 📖 이론

- 5초 TTL 캐시는 검색 결과를 잠시 맡기는 보관함과 같다. 서버에서 정규화한 쿼리를 키로 쓰고 게시글과 댓글 변경 뒤 전체 목록 캐시를 지운다.
- 같은 키에 진행 중인 Promise를 공유해 동시 조회를 줄이고, 오류 Promise는 제거해 다시 시도할 수 있게 한다. 사용자별 세션·파일 응답은 공개 캐시에 저장하지 않는다.
- 메일 작업은 먼저 DB에 넣고 별도 타이머가 4초마다 가져온다. 저장된 상태를 바탕으로 작업을 점유하고 시간이 지난 작업을 회수한다. SMTP 전송 후 저장 전에 죽을 경우 중복 가능성이 있으므로 동일 Message-ID를 쓰고 운영에서는 수신 측 멱등을 같이 설계한다.

## ③ 🛠️ 실기

### 실행 단계

1. 실행 중인 서버에서 node scripts/measure.mjs를 실행해 /health와 /api/posts의 p50·p95를 기록한다. BASE_URL을 바꿔 대상 서버를 지정할 수 있다.
2. 캐시 TTL이나 검색 패턴을 바꾸고 같은 DB와 요청 수에서 다시 잰다. SSR·네트워크는 DevTools, 서버 시간은 LOG_REQUESTS=true로 비교한다.
3. Mailpit을 중단한 상태로 메일을 예약하고 다시 켜서 발송 또는 실패 상태의 전이를 확인한다.

### 전체 코드 · `tsx_version/src/server/cache.ts`

```ts
export function ttlCache<K, V>(ttl: number, capacity: number, clock = Date.now) {
  const entries = new Map<K, { expires: number; value: Promise<V> }>();

  function clear() {
    entries.clear();
  }

  function read(key: K, load: () => Promise<V>) {
    const hit = entries.get(key);
    if (hit && hit.expires > clock()) return hit.value;
    entries.delete(key);
    if (entries.size >= capacity) {
      const oldest = entries.keys().next();
      if (!oldest.done) entries.delete(oldest.value);
    }
    const value = Promise.resolve().then(load);
    entries.set(key, { expires: clock() + ttl, value });
    void value.catch(() => {
      if (entries.get(key)?.value === value) entries.delete(key);
    });
    return value;
  }

  return { clear, read };
}
```

#### 줄별 설명

- 1행 · TTL·용량·시간 함수를 받아 캐시를 만든다.
- 2–3행 · 키마다 만료 시각과 진행 중인 Promise를 저장한다.
- 4–8행 · 변경 뒤 사용하는 전체 무효화다.
- 9–11행 · 만료되지 않은 항목은 같은 Promise를 반환한다.
- 12–15행 · 용량을 넘기기 전에 가장 먼저 들어온 항목을 뺀다.
- 16–17행 · 당장 조회하지 않고 Promise에 로더를 붙인다.
- 18–23행 · 실패한 Promise가 아직 같은 캐시 항목이면 제거한다.
- 24–25행 · 호출자에게 조회·무효화 API를 돌려준다.

### 전체 코드 · `tsx_version/server/plugins/mail.ts`

```ts
import { definePlugin } from "nitro";
import { workMail } from "../../src/server/integrations";
import { closeStore } from "../../src/server/db";

export default definePlugin((app) => {
  let current: Promise<void> | undefined;
  const timer = setInterval(() => {
    current ??= workMail()
      .catch(() => console.error(JSON.stringify({ level: "error", task: "workMail" })))
      .finally(() => { current = undefined; });
  }, 4000);
  timer.unref();
  app.hooks.hook("close", async () => {
    clearInterval(timer);
    await current;
    await closeStore();
  });
});
```

#### 줄별 설명

- 1–5행 · Nitro 시작에 실행할 플러그인을 정의한다.
- 6–8행 · 한 프로세스에서 진행 중인 배치가 있으면 새 배치를 시작하지 않는다.
- 9–12행 · 작업 오류는 구조화해 남기고 다음 틱에 다시 실행할 수 있게 한다.
- 13–18행 · 서버 종료 때 타이머를 닫고 남은 작업과 DB 연결을 정리한다.

## ④ 🔗 연동 포인트

- study17의 웹소켓도 같은 Node 프로세스에서 변경 알림을 보낸다. 여러 인스턴스로 확장할 때 Redis 같은 공유 캐시·메시지 브로커를 고려한다.
- 샘플 게시판은 작은 데이터 세트를 메모리에서 필터링한다. 데이터가 커지면 DB에서 인덱스·페이지네이션과 집계를 적용한 뒤 다시 측정한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 목록이 잠시 이전 데이터 | 캐시 무효화가 다른 프로세스에 전파되지 않음 | 단일 인스턴스에서 재현하고 다중 인스턴스에는 공유 무효화를 설계한다. |
| 작업이 계속 queued 또는 failed | SMTP 설정 누락 또는 접속 실패 | 로그·Mailpit 연결과 작업 재시도 시각을 확인한다. |

## ⑥ 직접 해보기

1. 검색 키를 바꾸며 캐시 단위 테스트에 새 입력을 추가한다.
2. 40회 요청의 p50과 p95를 기록하고 조건을 함께 적는다.

## ⑦ ☐ 체크리스트

- [ ] TTL·용량·오류·무효화 동작 확인
- [ ] 메일 작업 점유와 재시도 실습
- [ ] 측정 조건과 p50·p95 기록

## ⑧ 다음 단계

[study16 · 운영, Docker와 CI/CD](study16.md)에서 Docker 이미지, GitHub Actions, 관측과 복원 점검을 운영 체크리스트로 실행한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
