# SolidStart 검증 기록

2026-11-25 (KST), Node.js 24.14.0과 SolidStart 2.2.3 기준.

| 범위 | 확인 결과 |
| --- | --- |
| 학습 Markdown | 루트 21개, 공통 8개 구성, Notion 원문 체크 항목 9개, 전체 코드와 줄 설명 동기화 |
| TSX / JSX | TSX 타입 검사, 두 버전의 Vite/Nitro 프로덕션 빌드 및 각 HTTP 시나리오 3개 통과 |
| 단위 테스트 | 검증, Origin, 캐시, 가짜 저장소, 발췌 검색 5개 통과 |
| HTTP 계약 | SSR·보호 라우트·404, 폼 200/400/422, 세션 발급·폐기, 게시글 CRUD, 댓글, 오류 및 요청 ID, CORS·XSS, OpenAPI |
| DB | SQLite·MariaDB·MongoDB CRUD 스크립트 통과. Docker Compose PostgreSQL에서 Chromium으로 게시판 작성·조회, 문서와 질문 기록 저장 확인 |
| 브라우저 | Chromium에서 가입 → 로그인 → 글쓰기 action → 다른 탭의 WebSocket 알림 및 목록 갱신 → 문서 업로드 → AI mock 스트림 → 내 이메일 발송 예약 |
| 운영 | Docker 이미지 빌드, 비루트 컨테이너와 /ready, PostgreSQL 덤프를 새 데이터베이스에서 복원해 게시글 행 수 확인. SQLite 파일의 백업 무결성 검사 |
| 외부 서비스 | SMTP는 Mailpit 실제 수신 확인. AI는 로컬 mock SSE와 기록, MCP는 stdio 및 인증된 HTTP 호출 확인 |
| 남은 외부 확인 | Stripe 테스트 계정 결제와 webhook 전달, GitHub OAuth 실제 승인, Anthropic/Ollama 모델 호출, 스테이징 워크플로와 공인 HTTPS |

Docker Compose의 로컬 주소에서 40회 순차 요청으로 측정했다. /health p50 1.4 ms, p95 2.4 ms이고 /api/posts?q=study p50 1.0 ms, p95 1.4 ms였다. 작은 로컬 데이터셋에서의 관찰값이다.
