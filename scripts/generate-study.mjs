import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import base from "./chapters-foundation.mjs";
import middle from "./chapters-board.mjs";
import advanced from "./chapters-advanced.mjs";
import final from "./chapters-final.mjs";

const notion = "https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136";
const chapters = [...base, ...middle, ...advanced, final];
const fence = String.fromCharCode(96).repeat(3);
const list = (items) => items.map((item) => "- " + item).join("\n");
const ordered = (items) => items.map((item, index) => (index + 1) + ". " + item).join("\n");
const block = (language, code) => fence + language + "\n" + code + "\n" + fence;
const inline = (value) => String.fromCharCode(96) + value + String.fromCharCode(96);
const lang = { ts: "ts", tsx: "tsx", mjs: "js", yml: "yaml", Dockerfile: "dockerfile" };

const supplementary = {
  "5": [
    { path: "tsx_version/src/routes/preview.tsx", lines: ["1|signal과 반복 렌더러를 준비한다.", "4|대기 여부와 오류 필드 상태를 초기화한다.", "8|폼 기본 전송을 차단하고 중복 호출을 막는다.", "15|JSON API에 제목 값을 전달한다.", "21|200과 오류 상태를 다른 안내로 표시한다.", "27|네트워크 오류와 전송 종료를 처리한다.", "35|폼, 결과, 필드 오류를 렌더링한다."] }
  ],
  "11": [
    { path: "tsx_version/src/server/db.ts", lines: ["1|파일 경로·네이티브 SQL 드라이버 로더·MongoDB 연결을 가져온다.", "12|공통 Row와 Store 입력·출력 형태를 정의한다.", "28|환경에 따라 SQLite와 네트워크 SQL 설정을 고른다.", "40|초기 테이블과 탐색 인덱스를 만든다.", "57|공통 CRUD를 SQL 쿼리로 연결한다.", "74|MongoDB 컬렉션과 중복 메일·ID 인덱스를 생성한다.", "94|MongoDB 데이터 입력에는 증가 카운터를 사용한다.", "111|환경별 Store를 선택하고 연결 성공을 공유한다.", "131|엔진별 고유 키 위반과 행 변환을 공통으로 처리한다."] }
  ],
  "13": [
    { path: "tsx_version/src/server/integrations.ts", lines: ["1|Stripe·SMTP·OAuth·환경 값·저장소를 가져온다.", "13|Checkout 가격은 서버가 정하고 사용자별 멱등 키를 적용한다.", "30|webhook 원본 바이트와 Stripe 서명을 대조한다.", "39|실제로 결제된 Checkout만 세션 ID 기준으로 저장한다.", "51|메일 작업을 등록하고 값이 없는 환경에서는 503을 반환한다.", "58|작업 목록의 상태와 예정 시각을 확인한다.", "68|직전 payload로 경쟁 쓰기를 걸러 작업을 점유한다.", "73|SMTP 주소·인증·암호화·타임아웃을 설정한다.", "86|SMTP 응답과 재시도 횟수에 따라 상태를 기록한다.", "95|OAuth 클라이언트와 callback 정책을 설정한다.", "107|무작위 state와 S256 챌린지로 OAuth를 시작한다.", "120|callback과 state를 확인하고 인가 코드를 교환한다.", "135|GitHub 사용자와 검증 이메일을 확인한다.", "146|앱 세션을 발급하고 기존 OAuth 쿠키를 정리한다."] }
  ],
  "14": [
    { path: "tsx_version/src/server/openapi.ts", lines: ["1|공통 스키마 작성 함수와 응답 Content-Type을 정의한다.", "16|인증과 ID·검색·요청 본문의 공통 구조를 정한다.", "22|성공, 실패와 Location 응답 헤더를 조립한다.", "43|OpenAPI 버전과 서버, 공통 v1 API 경로를 선언한다.", "58|페이지네이션·검색·정렬·댓글 상태 코드를 정의한다.", "92|Bearer와 쿠키 인증 및 본문 스키마를 선언한다."] }
  ],
  "17": [
    { path: "tsx_version/src/server/documents.ts", lines: ["1|공통 DB와 HTTP 오류 도구를 가져온다.", "4|업로드에서 파일명·텍스트·실제 크기를 기록한다.", "9|헤더와 스트림을 검사해 최대 바이트 수를 제한한다.", "29|파일명, 확장자와 MIME 타입을 검사한다.", "39|UTF-8 해석과 내용 검증을 거친 뒤 소유권과 함께 저장한다.", "47|사용자의 문서 목록과 문서 본문 조회를 제공한다.", "58|질문 단어를 포함한 문서 발췌를 순위로 고른다."] }
  ],
  "18": [
    { path: "tsx_version/src/server/ai.ts", lines: ["1|모델 SDK, 문서 조회, DB, 공통 검증을 가져온다.", "7|모델 지침과 출력 한도를 지정한다.", "13|계정별 UTC 예산에서 입력과 최대 출력량을 예약한다.", "32|Ollama NDJSON을 요청하고 스트리밍 청크를 읽는다.", "64|mock·Ollama·Anthropic 모델 제공자를 선택한다.", "84|Anthropic의 텍스트 delta와 사용량을 가져온다.", "94|문서 권한을 확인하고 발췌와 질문을 구조화한다.", "103|사용자 취소와 시간 제한을 모델에 전달한다.", "111|SSE가 소비될 때 텍스트를 다음 프레임으로 보낸다.", "124|완료 응답·사용량·기록을 저장한다.", "137|스트림 취소에서 모델 연결을 정리한다.", "145|문서 소유권을 확인하고 기록을 조회한다."] },
    { path: "tsx_version/src/server/mcp.ts", lines: ["1|MCP 서버·전송·검증·타이밍 비교를 준비한다.", "9|검색어와 한도를 검증하는 도구를 등록한다.", "15|공개 게시판과 같은 검색 서비스를 호출한다.", "22|HTTP MCP의 토큰과 브라우저 출처를 확인한다.", "32|요청 단위 stateless 전송을 열고 완료 후 연결을 닫는다."] }
  ]
};

function explain(code, anchors) {
  const count = code.split("\n").length;
  return anchors.filter(([line]) => line <= count).map(([line, description], index, rows) => {
    const last = rows[index + 1]?.[0] - 1 || count;
    const mark = last > line ? line + "–" + last : String(line);
    return "- " + mark + "행 · " + description;
  }).join("\n");
}

async function render(chapter, next) {
  const sections = [
    "# study" + chapter.id + " · " + chapter.title,
    "## ① 목표\n\n" + chapter.goal,
    "## ② 📖 이론\n\n" + list(chapter.theory),
    "## ③ 🛠️ 실기\n\n" + (chapter.functions
      ? "### 기능 목록\n\n" + list(chapter.functions) + "\n\n### 폴더 구조\n\n" + block("text", chapter.tree) + "\n\n### 구현 순서\n\n"
      : "### 실행 단계\n\n") + ordered(chapter.steps)
  ];

  for (const { path, lines } of [...chapter.files, ...(supplementary[chapter.id] || [])]) {
    const code = (await readFile(path, "utf8")).trimEnd();
    const filename = path.split("/").at(-1);
    const ext = filename.includes(".") ? filename.split(".").at(-1) : filename;
    const anchors = lines.map((line) => {
      const [index, text] = line.split("|");
      return [Number(index), text];
    }).sort((a, b) => a[0] - b[0]);
    if (anchors[0][0] > 1) {
      anchors.unshift([1, "실습에서 사용할 모듈을 불러오고 입력·출력 경계를 연결한다."]);
    }
    sections.push("### 전체 코드 · " + inline(path) + "\n\n" + block(lang[ext] || "text", code) + "\n\n#### 줄별 설명\n\n" + explain(code, anchors));
  }
  const diagram = chapter.diagram ? "\n\n### DB·API 연동 구성도\n\n" + block("text", chapter.diagram) : "";
  sections.push("## ④ 🔗 연동 포인트\n\n" + list(chapter.links) + diagram);
  sections.push("## ⑤ 오류 노트\n\n| 증상 | 원인 | 해결 |\n| --- | --- | --- |\n" + chapter.errors.map((row) => "| " + row.join(" | ") + " |").join("\n"));
  sections.push("## ⑥ 직접 해보기\n\n" + ordered(chapter.practice));
  sections.push("## ⑦ ☐ 체크리스트\n\n" + (chapter.functions ? "### 배포 점검\n\n" : "") + chapter.checks.map((check) => "- [ ] " + check).join("\n"));
  if (chapter.retrospective) sections.push("### 회고\n\n" + chapter.retrospective);
  sections.push("## ⑧ 다음 단계\n\n" + (next
    ? "[study" + next.id + " · " + next.title + "](study" + next.id + ".md)에서 " + next.goal
    : "다음 반복에서는 [study16](study16.md)의 복원 절차와 [study18](study18.md)의 모델 검증을 새 DB와 스테이징에서 기록한다."));
  const related = [[ "Notion SolidStart 학습 원문", notion ], ...(chapter.refs || [])];
  sections.push("### 참고 자료\n\n" + list(related.map(([label, url]) => "[" + label + "](" + url + ")")));
  return sections.join("\n\n") + "\n";
}

export async function renderCourse() {
  return Promise.all(chapters.map(async (chapter, index) => ({
    chapter, path: "study" + chapter.id + ".md", content: await render(chapter, chapters[index + 1])
  })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const { path, content } of await renderCourse()) await writeFile(path, content);
}
