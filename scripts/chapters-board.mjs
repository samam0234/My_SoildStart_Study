export default [
  {
    id:"7", title:"인증과 보안 기초", goal:"가입·로그인·로그아웃을 실습하고 세션 쿠키와 작성자 권한으로 쓰기 경로를 보호한다.",
    theory:["인증은 신원을 확인하고 인가는 그 사용자가 특정 글을 수정할 수 있는지 확인한다. 출입증이 있는지와 그 방의 열쇠가 있는지는 별개의 검사다.","서버는 scrypt와 무작위 salt로 비밀번호를 해싱한다. 로그인하면 1시간 세션 토큰을 발급하고 저장소에는 해당 토큰의 SHA-256 다이제스트만 둔다. API는 Bearer를, 같은 Origin UI는 HttpOnly 쿠키를 읽는다.","XSS를 줄이기 위해 게시글·AI 결과를 JSX 텍스트로 렌더링한다. CSRF에는 SameSite=Lax와 상태 변경 요청 Origin 검사, CORS에는 한 개의 명시적 출처를 둔다. HTTPS 운영에서는 Secure 쿠키를 발급한다."],
    steps:["/account에서 가입 후 로그인한다. Network의 Set-Cookie와 GET /api/auth/me를 확인한다.","로그인하지 않은 /board 요청은 /account로 리디렉션되고, 작성 API는 401을 보낸다. 작성자와 다른 계정으로 수정 요청을 보내 403을 확인한다.","로그아웃 후 이전 쿠키와 Bearer 토큰으로 /api/auth/me를 다시 호출한다. 둘 다 폐기된 세션을 가리켜 401이 된다."],
    files:[{path:"tsx_version/src/routes/api/auth/[operation].ts",lines:["2|인증 서비스·쿠키·폐기 함수를 불러온다.","5|CORS 프리플라이트를 등록한다.","6|me의 GET만 공개 경로 이름으로 분기하며 사용자 조회는 인증이 필요하다.","11|가입은 data와 201을 보낸다.","12|로그인은 user/accessToken과 HttpOnly Set-Cookie를 보낸다.","16|로그아웃이 토큰을 폐기하고 쿠키를 만료한다.","21|없는 작업 이름은 404로 응답한다."]},{path:"tsx_version/src/middleware.mjs",lines:["1|SolidStart 서버 요청 미들웨어를 생성한다.","4|인증이 필요한 화면 URL을 지정한다.","7|서버에서 최초 GET 또는 HEAD의 인증을 확인한다.","8|비로그인은 302 응답으로 이동한다.","11|인증 화면의 공유 캐시 저장을 차단한다.","15|그 외 요청은 다음 핸들러로 보낸다."]}],
    links:["설정 서비스에서 APP_ORIGIN·CORS_ORIGIN·COOKIE_SECURE를 읽는다. 배포에서는 운영 도메인과 HTTPS를 연결한다.","study13 OAuth 콜백에서 동일한 세션 발급 함수를 재사용한다."],
    errors:[["로그인 후 지속적인 401","앱과 다른 호스트로 요청했거나 HTTP에서 Secure 쿠키 사용","APP_ORIGIN을 맞추고 브라우저 쿠키 및 HTTPS를 확인한다."],["본인 글인데 403","다른 세션이 요청에 들어갔거나 Origin이 틀림","me 응답 id와 글의 author.id, 요청 Origin을 확인한다."],["로그인 실패가 모든 경우 같은 문구","계정 존재 여부를 숨기는 서버 정책","개발 테스트에서 유효한 계정/비밀번호를 별도로 사용한다."]],
    practice:["쓰기 요청의 Origin을 다른 출처로 바꾸고 403을 확인한다.","로그아웃 후 이전 Bearer 토큰의 요청이 거절되는지 점검한다.","본문을 <script>로 시작하는 텍스트로 저장해 HTML이 실행되지 않는지 확인한다."],
    checks:["서버 세션 쿠키로 로그인과 보호된 라우트","scrypt 해시·세션 폐기·작성자 권한 확인","CORS·XSS·CSRF 기본 보호 확인"],
    refs:[["Notion 인증 · 인가","https://app.notion.com/p/3d6d7dec5e2e8113acbec80b1382c48d"]]
  },
  {
    id:"8", title:"구조화와 재사용", goal:"라우트·UI·서비스·저장소·환경 설정을 분리하고 개발과 운영의 값을 분리한다.",
    theory:["라우트는 브라우저 요청을 받는 문, 서비스는 규칙을 적용하는 작업실, 저장소는 실제 데이터를 보관하는 창고다. 같은 등록 로직을 API와 서버 action이 재사용한다.","설정은 config()에서 검증하고 Vite 개발 환경은 루트 .env를 읽는다. 운영 설정은 실행 시 컨테이너 환경이나 배포 시크릿으로 주입한다.","server 모듈을 클라이언트 UI에서 직접 쓰지 않는다. board-data의 서버 함수 본문으로 필요한 동작을 감싼다."],
    steps:["src/routes, src/components, src/features, src/server를 열고 각각 한 파일의 입력·출력을 적는다.","PostForm이 /board와 상세 수정에서 쓰이는 경로를 따라간다.","npm run sync:jsx로 동일 기능의 JSX 소스를 갱신하고 npm run check로 TSX를 확인한다. 사용자 화면 변경은 원본 TSX에서 작업한다."],
    files:[{path:"tsx_version/src/server/config.ts",lines:["1|환경 값을 일반 객체로 주입할 수 있어 설정 단위 검증이 쉽다.","2|기본 DB 선택은 SQLite다.","3|지원하지 않는 클라이언트 문자열을 거절한다.","7|파일 경로와 DB 주소를 구분해 읽는다.","10|Mongo 데이터베이스 이름 기본값을 둔다.","11|주소에서 Origin만 읽어 CORS·CSRF 정책과 일치시킨다.","13|HTTPS 또는 명시 설정에서 Secure 쿠키를 사용한다."]}],
    links:["study9에서 서비스에 가짜 Store를 주입하고 실제 요청은 다른 임시 SQLite로 테스트한다.","실제 Vite 시크릿은 VITE_ 접두사 없이 서버에서만 읽는다."],
    errors:[["빌드 후 환경 파일만 바꿨는데 반영되지 않음","운영 프로세스가 새 환경으로 시작하지 않음","운영 환경 변수를 바꾸고 프로세스를 재시작한다."],["클라이언트 번들에 server-only 오류","UI가 서버 전용 모듈을 직접 가져옴","API 또는 서버 함수 본문을 통해 값을 받는다."]],
    practice:["새 환경 값 하나를 .env.example과 config에 정의하고 잘못된 값을 거절한다.","PostForm의 공통 필드 규칙과 서버 검증의 책임을 구분해 적어 본다."],
    checks:["개발·운영 설정과 비밀 분리","공통 HTTP·검증·DB 모듈 재사용","JSX·TSX 동기화"]
  },
  {
    id:"9", title:"테스트와 디버깅", goal:"단위·HTTP 테스트로 주요 계약을 확인하고 요청 ID, DevTools, 서버 로그로 오류를 찾는다.",
    theory:["단위 테스트는 부품의 자를 재는 검사, HTTP 테스트는 문 전체가 열리는지 보는 검사다. 조건을 제어하는 가짜 Store와 격리된 SQLite가 서로 다른 문제를 잡는다.","Network에서 메소드·상태·본문을, Sources에서 클라이언트 브레이크포인트를, Node 터미널에서 서버 로그를 읽는다. LOG_REQUESTS=true로 요청 ID와 지연 시간을 구조화해 확인한다.","외부 API는 AI_PROVIDER=mock이 결정적인 응답을 보내게 하고 SMTP는 Mailpit에서 확인한다. 테스트 데이터베이스는 자동 생성한 임시 경로를 사용한다."],
    steps:["npm test로 검증·캐시·로그인 Origin 검사·저장소 주입·발췌 검색을 실행한다.","npm run build 후 npm run test:http로 SSR·인증·CRUD·AI·MCP 흐름을 실행한다.","VS Code에서 node --inspect로 서버를 실행하고 Network의 X-Request-Id와 서버 로그를 맞춰 본다."],
    files:[{path:"tests/unit.test.mjs",lines:["1|Node의 테스트 러너와 단언을 준비한다.","9|정규화와 부분 수정, 페이지 한도를 입력값 단위로 확인한다.","20|파손된 JSON과 신뢰하지 않는 Origin의 오류를 기대한다.","25|가짜 시계로 TTL과 동시 로딩을 재현한다.","39|메모리 객체에서 실제 DB 없이 목록과 소유자 권한을 검사한다.","56|한글 질문이 맞는 발췌를 먼저 찾는지 확인한다."]}],
    links:["study10 빌드 뒤 배포 체크리스트에 동일한 /health·/ready·인증 요청을 넣는다.","study16의 CI에서도 같은 테스트를 실행한 결과만 배포 후보로 사용한다."],
    errors:[
      ["EADDRINUSE","포트 중복","빈 포트 또는 불필요한 이전 프로세스를 확인한다."],
      ["MODULE_NOT_FOUND","의존성 미설치","Node 24에서 npm ci를 실행한다."],
      ["SSR의 localStorage 오류","브라우저 전역 조기 호출","onMount로 옮긴다."],
      ["404 UI 또는 HTML 응답","JSON 경로 대신 UI 경로 호출","/api 접두어와 경로의 파일 이름을 확인한다."],
      ["400 BAD_REQUEST","파손된 JSON 또는 형식이 틀린 ID","요청 본문과 /api/posts/숫자 경로를 확인한다."],
      ["400 VALIDATION_ERROR","공통 v1 검증 실패","응답 error.fields에서 필드와 길이 조건을 본다."],
      ["401 UNAUTHORIZED","누락되거나 만료된 세션","로그인 뒤 Set-Cookie 및 보내는 헤더를 확인한다."],
      ["403 FORBIDDEN","작성자 불일치 또는 CSRF 정책","me/author.id와 Origin을 확인한다."],
      ["503 DATABASE_UNAVAILABLE","DB 연결 또는 DB_FILE 권한 이상","/ready, 컨테이너 로그, URL·디렉터리 권한을 확인한다."],
      ["SSE가 한 번에 표시됨","프록시가 스트림을 버퍼링함","curl.exe -N과 개발자도구로 프레임 경계를 확인한다."]
    ],
    practice:["가짜 Store에 댓글을 하나 더 넣고 commentCount 검증을 바꿔 본다.","HTTP 요청에 X-Request-Id를 넣고 오류 본문과 응답 헤더가 같은지 확인한다."],
    checks:["테스트에서 DB·AI 응답을 가짜로 바꾸기","요청 ID와 로그를 연결해 원인 재현","빌드 출력으로 HTTP 검증 실행"]
  },
  {
    id:"10", title:"빌드와 배포 정리", goal:"Node 서버 프리셋으로 빌드하고 HTTPS·DB 환경을 연결한 뒤 기초 구간을 점검한다.",
    theory:["빌드는 브라우저 자산과 서버 코드를 배포 가능한 출력으로 정리한다. Nitro node-server는 상자에 앱과 시작 명령을 담듯 런타임 접점을 만든다.","DNS는 운영 도메인을 IP로 연결하고 TLS 인증서는 HTTPS에서 서버 주소의 신원과 암호화를 제공한다. 프록시가 TLS를 종료하면 앱의 APP_ORIGIN은 공개 HTTPS 주소다.","기초 흐름은 페이지 HTML→중첩 경로→query/createAsync→action→저장소→세션→테스트다."],
    steps:["npm ci, npm run check, npm test, npm run build, npm run test:http를 실행한다. JSX 빌드는 npm run build:jsx를 사용한다.","npm start 또는 node --env-file-if-exists=.env tsx_version/.output/server/index.mjs로 운영 산출물을 시작한다.","배포 목표에 Node 24, 설치 의존성, .output, 실행 명령을 준비한다. 운영 환경에 PORT·HOST·APP_ORIGIN·DB_CLIENT·DATABASE_URL을 지정한다.","도메인 DNS를 프록시에 연결하고 TLS 인증서를 설정한다. /health 200, /ready 200, SSR 화면, 로그인 쿠키 Secure, 등록·수정·삭제를 점검한다."],
    files:[{path:"scripts/run-vite.mjs",lines:["1|상위 npm 명령에서 Vite 프로세스를 실행할 수 있게 한다.","4|앱 버전과 Vite 옵션을 분리한다.","5|지원하는 폴더 이름만 허용한다.","6|앱 경로를 계산해 프로세스 작업 위치를 고정한다.","7|루트에 설치한 Vite CLI를 직접 호출한다.","8|Vite의 출력과 종료 코드를 상위 명령에 전달한다."]},{path:"tsx_version/src/routes/ready.ts",lines:["1|API 요청 이벤트 타입을 읽는다.","2|실행할 DB 연결을 준비한다.","5|테이블에 실제 조회를 보내 준비 상태를 확인한다.","7|연결 실패 때 상태 코드를 503으로 반환한다.","8|조회 성공이면 준비 상태를 200으로 반환한다."]}],
    links:["기초 배포 방법을 midpoint의 게시판에 적용한다. study16은 Docker 이미지·CI·백업 자동화를 덧붙인다.","SQLite를 쓸 때 DB_FILE은 영속 디스크에 두고, 외부 DB에서는 데이터베이스 URL과 방화벽 연결을 확인한다."],
    errors:[["운영에서 /health만 200","서버는 떴지만 DB 접근 실패","/ready와 DB 주소·인증·영속 볼륨 권한을 확인한다."],["사이트 주소에서 로그인 반복 실패","TLS 설정과 APP_ORIGIN 또는 쿠키 설정이 어긋남","공개 HTTPS 주소와 Set-Cookie 속성을 확인한다."],["빌드는 됐는데 서버에서 모듈 로딩 실패","배포에 런타임 npm 의존성 또는 OS용 네이티브 바이너리가 빠짐","같은 운영 환경에서 npm ci --omit=dev로 설치한다."]],
    practice:["개발 서버를 종료한 뒤 npm start로 첫 화면을 검증한다.","운영 요청에서 DevTools Network를 열어 문서 응답과 SSR 데이터를 확인한다."],
    checks:["SSR, 스트리밍, 배포 프리셋 확인","배포 후 /health·/ready 및 쿠키·CRUD 확인","도메인·HTTPS와 DB 영속 저장 확인"],
    refs:[["SolidStart v2와 배포 플러그인","https://docs.solidjs.com/solid-start/v2"]]
  },
  {
    id:"Midpoint", title:"세션 게시판", goal:"study0~10의 SolidStart 기초만으로 가입·로그인·글과 댓글 CRUD 게시판을 완성한다.",
    theory:["게시판은 URL, 서버 렌더링, 인증, 요청 검증, 데이터베이스를 한 흐름으로 연습하는 서비스다. 접수대가 신분증을 확인한 뒤 작성자에게 자신의 문서만 편집하게 하는 것과 같다."],
    functions:["공개 글 목록·검색·정렬·페이지네이션과 공개 상세","가입·로그인·로그아웃, 로그인 전 /board 보호","새 글 등록·작성자 수정 및 삭제, 댓글 작성 및 작성자 삭제","SQLite 영속화와 공통 v1 JSON 계약"],
    tree:"tsx_version/src/\n  routes/{account,board,posts,api}/  화면과 API\n  components/PostForm.tsx         등록과 수정\n  features/board-data.ts          서버 쿼리와 action\n  server/{auth,board,db,http}.ts   인증·업무 규칙·저장소·응답",
    diagram:"브라우저 /posts ── SSR query ── 게시판 서비스 ── SQLite\n브라우저 /board ── action ─────────────┘\n다른 HTTP 클라이언트 ── /api/posts ────┘\n/account ── /api/auth/login ── HttpOnly 쿠키 ── 보호 라우트",
    steps:["study0~2에서 프로젝트·앱 셸·컴포넌트와 중첩 URL을 준비한다.","study3~5에서 입력 관리와 글쓰기 action을 만든다.","study6에서 SQLite와 v1 CRUD/댓글을 연결한다.","study7에서 쿠키·토큰과 작성자 권한을 확인한다.","study8~10에서 모듈 분리, 테스트, Node 빌드와 HTTP 준비 점검을 실행한다."],
    files:[{path:"tsx_version/src/features/board-data.ts",lines:["1|같은 Solid Router에서 조회 query와 쓰기 action을 가져온다.","7|서버 함수가 현재 HTTP 요청을 읽을 수 있게 한다.","13|viewer가 세션 사용자 또는 빈 값을 돌려준다.","18|URL 검색 조건으로 목록을 조회한다.","24|숫자 id로 글 상세와 댓글을 병렬 조회한다.","36|쓰기 action이 브라우저 밖에서 인증·Origin·폼 값을 확인한다.","47|숨은 id 값으로 수정과 신규 생성을 분기한다.","50|저장 후 상세 URL로 이동하고 관련 목록·상세 캐시를 갱신한다.","52|업무 오류를 구조화된 필드 오류로 돌려준다."]}],
    links:["SSR 조회와 REST API는 같은 서비스에 연결되며 쿠키나 Bearer는 서버에서 같은 세션을 찾는다.","다음 구간에서 저장소만 PostgreSQL·MariaDB·MongoDB로 바꿔 기존 화면과 계약을 확인한다."],
    errors:[["가입됐지만 /board로 이동하지 않음","가입과 로그인은 서로 다른 요청","로그인까지 수행하고 session/me를 확인한다."],["상세는 갱신됐지만 목록이 늦음","목록 키를 재검증하지 않음","쓰기 action이 getPosts.key를 재검증하는지 확인한다."]],
    practice:["두 계정으로 글·댓글을 작성하고 교차 삭제를 시도한다.","빈 DB에서 초기 배포 후 두 개의 글을 등록하고 컨테이너 재시작 뒤 조회한다."],
    checks:["빌드와 HTTP 테스트 통과","영속 SQLite 경로 및 운영 APP_ORIGIN 확인","다른 계정 403과 인증되지 않은 요청 401 확인","1차 배포에서 SSR·HTTPS·/ready 확인"],
    retrospective:"페이지와 외부 HTTP가 같은 입력 검증·소유자 규칙을 사용하도록 모아 오류 재현이 쉬워졌다. 초반 부하는 한 Node 프로세스와 SQLite로 관찰한다. 다음 구간에서 DB 전환과 별도 작업실을 실습한다."
  }
];
