import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { renderCourse } from "./generate-study.mjs";

const required = {
  0: ["`npm init solid@latest`로 SolidStart 템플릿 생성"],
  4: ["`src/routes` 파일 기반 라우팅과 중첩 레이아웃"],
  5: ["`\"use server\"` 서버 함수와 `action`으로 글쓰기 폼", "오류 응답 `error.code/message/fields`를 폼 오류로 표시"],
  6: ["`query`와 `createAsync`로 서버 데이터 불러오기", "`src/routes/api` 아래 API 라우트로 JSON 엔드포인트 만들기", "목록 응답 `data`와 `meta`를 그대로 받기"],
  7: ["서버 세션 쿠키로 로그인과 보호된 라우트"],
  10: ["SSR, 스트리밍, 배포 프리셋 확인"]
};

const docs = await renderCourse();
const names = (await readdir(".")).filter((name) => /^study.*\.md$/i.test(name)).sort();
assert.deepEqual(names, docs.map((doc) => doc.path).sort());
for (const { chapter, path, content } of docs) {
  assert.equal(await readFile(path, "utf8"), content, path + " differs from current code or lesson metadata");
  assert.equal(content.match(/^## [①②③④⑤⑥⑦⑧] /gm)?.length, 8, path);
  assert.ok(chapter.practice.length >= 2 && chapter.practice.length <= 3, path);
  assert.ok(chapter.files.length, path);
  for (const check of required[chapter.id] || []) assert.ok(content.includes("- [ ] " + check + "\n"), check);
}
console.log("21 study chapters, 8 sections and all 9 Notion checkboxes verified.");
