# SolidStart 학습 과정

SolidStart 2.2.3과 Node.js 24로 세션 게시판을 만든 뒤, 문서 요약·질의응답 작업실과 운영 환경으로 확장한다. TypeScript/TSX 원본은 [tsx_version](tsx_version), 같은 기능의 JavaScript/JSX는 [jsx_version](jsx_version)에서 실행한다.

## 시작

~~~powershell
node --version
npm ci
Copy-Item .env.example .env
npm run dev -- --port 3000 --strictPort
~~~

http://localhost:3000/을 연다. JSX 버전은 같은 명령 대신 npm run dev:jsx를 실행한다. 두 버전을 동시에 쓰려면 포트와 브라우저에서 검증할 APP_ORIGIN 설정을 맞춘다.

| 주소 | 기능 |
| --- | --- |
| / | SSR, 입력 바인딩, 로컬 저장 |
| /preview | 200·400·422 폼 미리보기 |
| /posts | 공개 목록, 검색·정렬, 상세, 댓글, 알림 |
| /account · /board | 가입·로그인과 보호된 글쓰기 |
| /workbench | TXT/MD 업로드, 문서 AI 스트림, 연동 실습 |
| /api-docs · /api/docs/openapi | Swagger 화면과 OpenAPI JSON |
| /health · /ready | 프로세스와 DB 준비 확인 |

## 학습 순서

- [study0](study0.md) · [study1](study1.md) · [study2](study2.md) · [study3](study3.md) · [study4](study4.md) · [study5](study5.md)
- [study6](study6.md) · [study7](study7.md) · [study8](study8.md) · [study9](study9.md) · [study10](study10.md) · [studyMidpoint](studyMidpoint.md)
- [study11](study11.md) · [study12](study12.md) · [study13](study13.md) · [study14](study14.md) · [study15](study15.md) · [study16](study16.md)
- [study17](study17.md) · [study18](study18.md) · [studyFinal](studyFinal.md)

과정의 기준은 [Notion SolidStart](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)와 [공통 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e)이다. 문서 질문·발췌·이력은 [DocuForge](https://app.notion.com/p/40bd7dec5e2e818d9c91c6fb26dccc4c)의 학습 흐름을 사용한다.

## 검증 및 운영

~~~powershell
npm run check
npm test
npm run build
npm run test:http
npm run build:jsx
$env:TEST_BUILD='jsx_version'
npm run test:http
Remove-Item Env:TEST_BUILD
npm run verify:study
~~~

기본 DB는 SQLite이고 기본 AI 응답은 로컬 mock이다. PostgreSQL Docker, 그 밖의 DB, 메일·결제·OAuth, Anthropic·Ollama와 MCP 자격증명은 각 장과 [.env.example](.env.example)을 참고한다. Docker의 프런트 포트·APP_ORIGIN과 데이터베이스 값은 Compose 구성을 함께 확인한다. 재현 결과는 [검증 기록](docs/validation.md)에 있다.

원본 수정 뒤 npm run sync:jsx와 npm run generate:study를 실행하면 JSX와 학습 문서의 코드가 갱신된다. npm run verify:study가 21개 문서, 8개 공통 구성, Notion 원문 체크 항목 9개, 코드 동기화를 검사한다.
