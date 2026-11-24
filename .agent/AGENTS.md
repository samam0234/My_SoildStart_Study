# SolidStart 학습 저장소

- 과정 기준은 [Notion SolidStart](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)와 [공통 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e)이다.
- 루트 과정 파일은 study0.md~study18.md, studyMidpoint.md, studyFinal.md의 21개다. 제목·목표·이론·실기·연동·오류·연습·체크리스트·다음 단계는 장 데이터에서 수정한다.
- 실제 코드는 tsx_version이 원본이다. npm run sync:jsx로 JSX를 맞추고, npm run generate:study로 코드와 문서를 맞춘다. npm run verify:study가 문서와 Notion 학습 항목 9개를 검사한다.
- Node 24, Vite 8, SolidStart 2.2.3을 사용한다. npm run check, npm test, npm run build, npm run build:jsx, npm run test:http를 실행한다. 다른 버전의 HTTP 테스트는 TEST_BUILD=jsx_version으로 지정한다.
- /posts와 /board는 공통 v1 게시판, /workbench는 인증된 문서 AI 실습이다. 실제 외부 서비스와 스테이징 검증의 상태는 docs/validation.md에 기록한다.
- 비밀은 .env 또는 배포 환경에 둔다. 문서와 코드 작업 및 검증 뒤 Notion을 갱신한다. 커밋은 [COMMIT_GUIDE.md](COMMIT_GUIDE.md)의 진도 순서를 유지한다.
