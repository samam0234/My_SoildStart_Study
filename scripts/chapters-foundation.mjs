export default [
  {
    id: "0", title: "환경 설정", goal: "Node.js 24에서 SolidStart 프로젝트를 생성하고 개발 서버와 Git, 환경 변수를 준비한다.",
    theory: [
      "SolidStart는 파일 기반 경로와 SSR, 서버 함수로 게시판의 화면과 서버 로직을 한 프로젝트에서 관리한다. SSR은 서버가 첫 화면용 HTML을 미리 조립하는 과정이다.",
      "Vite는 개발 중 바뀐 모듈을 갱신하며 빌드를 담당한다. Nitro의 프리셋은 빌드 결과를 어디서 실행할지 정한다. SSR은 식당에서 먼저 차려 주는 첫 상, 하이드레이션은 식탁에 주문 버튼을 연결하는 일과 비슷하다.",
      "루트는 의존성과 문서를 공유한다. tsx_version/src/routes는 URL, src/components는 UI 조각, src/features는 화면 기능, src/server는 브라우저에 보내지 않는 저장소 코드, server/routes는 Nitro 확장 경로다. jsx_version은 같은 코드에서 타입을 제거한 실행 버전이다."
    ],
    steps: [
      "Node.js 24 LTS와 Git을 설치하고 PowerShell에서 node --version, npm --version, git --version을 실행한다.",
      "별도 실습 폴더 만들기: npm init solid@latest -- solidstart-sandbox bare --solidstart --v2 --ts. 생성 폴더에서 npm install을 실행한다.",
      "이 저장소에서 npm ci, npm ls @solidjs/start @solidjs/router, Copy-Item .env.example .env, npm run dev -- --port 3000 --strictPort 순서로 실행한다. http://localhost:3000/에서 첫 화면을 연다.",
      "VS Code의 기본 TypeScript 언어 기능과 ESLint(dbaeumer.vscode-eslint), Prettier(esbenp.prettier-vscode), Docker(ms-azuretools.vscode-docker) 확장을 상황에 맞춰 사용한다. 새 연습 폴더는 git init -b main, git status를 실행한다. 기존 클론에서는 git status로 워킹 트리를 확인한다.",
      "git check-ignore .env로 비밀 파일 제외를 확인한다. .env.example에는 키 이름과 공개 가능한 기본값만 적는다."
    ],
    files: [{path:"tsx_version/vite.config.ts", lines:["1|Vite 설정과 실행 모드별 환경 파일 로더를 가져온다.", "2|Nitro 플러그인을 불러 Node 서버 결과물을 만든다.", "3|SolidStart 플러그인이 SSR·서버 함수·라우팅을 구성한다.", "6|두 앱 경로와 루트 환경 파일 위치를 계산한다.", "8|mode가 development/production 파일을 구분한다.", "9|이미 주입된 운영 변수를 유지하면서 .env 기본값을 채운다.", "12|SolidStart와 Nitro에 같은 앱 디렉터리를 연결한다.", "15|Node 배포 대상과 WebSocket 기능을 명시한다."]}],
    links: ["로컬 .env의 APP_ORIGIN을 개발 주소와 일치시킨다. 뒤에서 쿠키와 WebSocket 요청 Origin 검사에 쓰인다.", "study1에서 src/routes/index.tsx를 수정하면서 HMR을 관찰한다."],
    errors: [["npm 명령을 찾을 수 없음","Node 설치 경로가 터미널 PATH에 반영되지 않음","터미널을 다시 시작하고 node --version을 확인한다."],["포트 3000 바인딩 실패","다른 프로세스가 포트를 사용 중","빈 포트를 정하고 APP_ORIGIN도 같은 포트로 설정한다."],["템플릿 경로 ENOENT","생성기 프로젝트 이름에 Windows 절대 경로를 넘김","부모 폴더로 이동하고 단일 폴더 이름을 전달한다."]],
    practice:["JSX 앱을 npm run dev:jsx -- --port 3001로 열고 포트를 확인한다.","Git이 .env를 무시하고 .env.example은 추적할 수 있는지 확인한다."],
    checks:["`npm init solid@latest`로 SolidStart 템플릿 생성", "Node 24, SolidStart 패키지 버전과 .env 제외 규칙 확인"],
    refs:[["SolidStart v2 개요","https://docs.solidjs.com/solid-start/v2"]]
  },
  {
    id:"1", title:"Hello World와 기본 문법", goal:"SolidStart의 첫 화면을 SSR로 띄우고 JSX에서 표현식과 이벤트를 읽는다.",
    theory:["JSX에서는 태그 사이의 중괄호가 값을 읽고 속성의 중괄호가 값이나 함수를 전달한다. 여러 형제는 프래그먼트로 묶는다.","HTML 초안은 서버에서 전송하고 브라우저가 이벤트를 연결한다. 종이 안내판에 스위치를 붙이는 작업을 생각하면 초기 문서와 동작의 관계가 보인다."],
    steps:["npm run dev -- --port 3000으로 시작한 뒤 /를 연다.","h1 문자열을 바꾸고 저장한다. 페이지가 갱신되는지 본 뒤 DevTools Network에서 Document와 JS 요청을 확인한다.","curl.exe -s http://localhost:3000/으로 서버 HTML에 Hello가 있는지 확인한다. DevTools Elements에서는 입력 후 갱신된 DOM을 확인한다."],
    files:[{path:"tsx_version/src/routes/index.tsx",lines:["1|createSignal은 값 접근자와 변경 함수를 만든다.","3|인사 컴포넌트가 이름 표시와 리셋 버튼을 맡는다.","6|입력의 첫 렌더 값은 서버와 브라우저 모두 빈 문자열이다.","7|브라우저 마운트 후에 저장값을 읽는다.","9|하나의 이벤트 핸들러로 상태와 저장소를 갱신한다.","14|프래그먼트로 페이지의 형제 노드를 반환한다.","18|중괄호로 값과 콜백을 자식에 전달한다.","19|A가 앱 라우터 이동을 담당한다."]}],
    links:["첫 페이지의 표현식과 이벤트를 study2에서 자식 컴포넌트의 props로 옮긴다."],
    errors:[["JSX 빌드 실패","형제 태그를 루트 두 개로 반환함","<>와 </>로 감싼다."],["저장해도 화면 변화 없음","다른 포트의 서버를 보고 있음","터미널 Local 주소와 DevTools Document URL을 확인한다."]],
    practice:["첫 제목에 현재 과정 이름을 추가한다.","DevTools에서 JavaScript를 끄고 새로고침하여 서버 HTML의 첫 화면을 확인한다."],
    checks:["첫 HTML에서 Hello 제목 확인", "HMR과 DevTools Network/Elements 사용"]
  },
  {
    id:"2", title:"핵심 구조와 props", goal:"라우트, 재사용 컴포넌트, 서버 기능 모듈의 역할을 나누고 props로 값을 주고받는다.",
    theory:["파일 경로는 화면의 입구, 컴포넌트는 반복해서 사용할 수 있는 UI 조각, 기능 모듈은 데이터 호출과 비즈니스 규칙을 담는다.","부모가 상태를 소유하고 자식은 props를 읽는다. 자식이 건네는 클릭은 호출 신호다. 주문표를 받는 창구가 손님에게 결정권을 돌려주는 흐름과 같다.","Solid의 반응성은 접근 위치를 추적하므로 기본값이나 변경 데이터를 읽을 때 props를 렌더 초기에 구조 분해하면 변경을 놓칠 수 있다."],
    steps:["/에서 이름을 입력해 부모의 값이 Greeting에 표시되는지 확인한다.","이름 지우기 버튼을 눌러 자식의 onReset이 부모의 update를 부르는 흐름을 따라간다.","App의 Router와 FileRoutes에서 이름 입력 페이지와 게시판 경로가 어떻게 연결되는지 확인한다."],
    files:[{path:"tsx_version/src/components/Greeting.tsx",lines:["1|Show를 조건부 렌더링에 사용한다.","3|name은 읽기 값이고 onReset은 부모가 소유하는 콜백이다.","6|공백을 제거한 이름이나 기본 문구를 읽는다.","7|Show가 빈 문자열일 때 버튼을 렌더링하지 않는다.","8|클릭 시 전달받은 함수를 호출해 상태 변경을 위임한다."]},{path:"tsx_version/src/app.tsx",lines:["1|A와 Router로 링크와 라우트 루트를 선언한다.","2|FileRoutes가 src/routes에서 엔트리를 찾는다.","8|공통 루트가 헤더와 본문을 감싼다.","11|네비게이션에서 내부 페이지로 이동한다.","20|비동기 라우트 데이터의 대기 표시를 둔다.","24|파일 라우트 목록을 Router에 등록한다."]}],
    links:["컴포넌트 간 props 경계를 익힌 뒤 study3의 입력 상태를 영속화한다.","게시판의 PostForm은 등록과 상세 화면의 수정에서 공유한다."],
    errors:[["이름이 바뀌어도 화면이 그대로","props 값을 렌더 초기에 변수로 복사함","동적 JSX에서 props.name을 읽는다."],["버튼 누르면 폼이 전송됨","기본 submit 버튼을 사용함","폼과 무관한 버튼은 type=button을 지정한다."]],
    practice:["Greeting에 안내 문구 prop을 하나 추가한다.","별도 Greeting을 다른 기본 name으로 렌더링해 재사용을 확인한다."],
    checks:["부모의 상태를 자식에서 쓰기","자식 이벤트로 부모 상태 갱신"]
  },
  {
    id:"3", title:"상태와 로컬 저장소", goal:"입력 상태를 화면과 바인딩하고 브라우저 로컬 저장소에 연습 이름을 저장한다.",
    theory:["createSignal은 읽기 접근자와 setter를 제공한다. value는 화면에 반영하고 onInput이 값을 다시 signal에 넣는다.","localStorage는 브라우저 주소별 보관함이다. SSR의 첫 렌더는 브라우저 전역을 사용할 수 없으므로 onMount에서 복원한다. DB가 필요한 공유 데이터는 study6에서 서버로 이동한다."],
    steps:["/에서 이름을 입력하고 새로고침한다.","DevTools Application → Local Storage의 solidstart-name을 확인한다.","저장 항목을 지우고 다시 열어서 기본 표시를 확인한다."],
    files:[{path:"tsx_version/src/routes/index.tsx",lines:["6|빈 문자열로 서버의 첫 문서와 초기 상태를 맞춘다.","7|onMount에서 브라우저 저장소를 읽고 값이 없으면 기본값을 쓴다.","9|사용자 입력과 리셋은 update를 공유한다.","10|setter로 이름을 사용하는 UI를 갱신한다.","11|같은 값을 브라우저 저장소에 남긴다.","17|value와 onInput을 양쪽에 연결한다.","18|변경된 상태가 자식의 props에 전달된다."]}],
    links:["사용자별 설정은 로컬에, URL에 공유할 검색 조건은 study4의 쿼리 파라미터에 둔다.","브라우저 저장소에는 인증 비밀을 넣지 않고 study7의 세션 쿠키를 사용한다."],
    errors:[["서버 로그의 localStorage is not defined","SSR 중 브라우저 API를 호출함","onMount나 브라우저 이벤트로 읽기 위치를 옮긴다."],["다른 탭에서 기대한 값이 없음","다른 호스트나 포트라 Origin이 달라짐","같은 프로토콜·호스트·포트를 사용한다."]],
    practice:["브라우저 저장소에서 이름을 바꾼 뒤 새로고침한다.","http://localhost와 http://127.0.0.1 주소의 저장 공간을 비교한다."],
    checks:["signal과 입력 필드 바인딩 확인","새로고침 뒤 보관값 확인"]
  },
  {
    id:"4", title:"라우팅과 요청 처리", goal:"파일 기반 라우팅과 중첩 레이아웃을 만들고 동적 URL·쿼리·404를 확인한다.",
    theory:["src/routes/posts.tsx는 공통 레이아웃, posts/index.tsx는 목록, posts/[id].tsx는 상세를 렌더링한다. 레이아웃은 두 방을 잇는 복도처럼 공통 링크를 제공한다.","URL 경로는 리소스를 정하며 쿼리는 검색·정렬·페이지 조건을 전달한다. UI 요청은 HTML, API 요청은 JSON이고 상태 코드를 함께 반환한다."],
    steps:["/posts와 /posts?q=Solid&page=1&sort=createdAt를 연다.","게시글의 링크로 /posts/숫자에 이동하고 /posts/999999에서 상세 오류를 관찰한다.","/missing-page와 /api/unknown의 Content-Type 및 404 응답을 curl.exe -i로 확인한다."],
    files:[{path:"tsx_version/src/routes/posts.tsx",lines:["1|RouteSectionProps가 하위 라우트의 children을 제공한다.","2|게시판 공통 알림을 레이아웃에 붙인다.","7|목록과 보호된 내 게시판으로 이동할 링크를 둔다.","8|현재 브라우저의 알림 상태를 렌더링한다.","9|선택된 목록 또는 상세가 삽입된다."]},{path:"tsx_version/src/routes/[...missing].tsx",lines:["1|라우터 링크를 불러온다.","2|렌더 중 서버 HTTP 상태를 지정하는 컴포넌트를 사용한다.","5|잡히지 않은 페이지에 404와 복귀 링크를 제공한다."]}],
    links:["목록 q 및 page는 API의 /api/posts 쿼리와 같은 이름을 쓴다.","화면의 동적 id를 API /api/posts/{id}에 넘기고 서버에서 양의 정수 여부를 확인한다."],
    errors:[["하위 페이지 제목이 나타나지 않음","레이아웃에서 children을 렌더하지 않음","레이아웃 반환 JSX에 props.children을 넣는다."],["화면은 404인데 HTTP는 200","상태 컴포넌트가 없음","SSR에서 HttpStatusCode code={404}를 쓰고 실제 상태를 확인한다."]],
    practice:["목록에서 정렬을 바꾸고 주소를 다른 탭에 붙여 넣는다.","잘못된 문자열 id와 없는 숫자 id의 API 오류 코드를 확인한다."],
    checks:["`src/routes` 파일 기반 라우팅과 중첩 레이아웃","동적 URL과 404 응답 확인"],
    refs:[["SolidStart 파일 라우팅","https://docs.solidjs.com/solid-start/v2/building-your-application/routing"]]
  },
  {
    id:"5", title:"폼 입력과 검증", goal:"폼을 서버에 제출하고 200·400·422 및 필드 오류를 상태별로 표시한다.",
    theory:["빠른 입력 피드백은 브라우저에서, 권위 있는 검증은 서버에서 수행한다. 접수 창구에서 양식을 빠르게 확인하고 담당자가 최종 내용을 확인하는 구조다.","/api/preview는 정상 200, 잘못된 JSON 400, 의미 검증 실패 422를 비교하는 실습이다. 공통 게시판 v1은 입력 검증까지 400 VALIDATION_ERROR로 통일한다.","SolidStart 서버 함수에는 \"use server\"를 둔다. action의 useSubmission은 전송 동안 버튼을 비활성화하고 오류에서 code, message, fields를 꺼낸다."],
    steps:["/preview에서 빈 값을 보내고 422 제목 오류를 확인한다. 올바른 값은 200 미리보기로 표시한다.","DevTools 또는 curl.exe에서 깨진 JSON 본문을 전송해 400을 확인한다.","/board의 제목·본문·태그를 채우고 Network에서 서버 함수 호출 뒤 상세 이동을 본다."],
    files:[{path:"tsx_version/src/routes/api/preview.ts",lines:["1|APIEvent에서 표준 Request를 받는다.","2|공통 응답과 JSON 읽기/검증 함수를 연결한다.","4|POST 핸들러가 공통 API 래퍼를 통과한다.","5|JSON 파싱 실패는 400으로 처리된다.","6|제목 문자열 정제와 길이 검사로 유효성을 판단한다.","8|제목 필드 오류를 422로 반환한다.","10|검증된 제목을 성공 응답의 data에 담는다."]},{path:"tsx_version/src/components/PostForm.tsx",lines:["1|useSubmission이 같은 action의 상태를 조회한다.","5|수정 폼은 선택된 글의 기존 값을 받는다.","7|서버가 반환한 오류를 읽는다.","14|action과 method=post로 보내고 id가 있으면 수정한다.","16|제목·내용·태그 필드를 구성한다.","19|code와 message, fields를 사용자에게 표시한다.","25|서버 응답까지 버튼을 비활성화한다."]}],
    links:["서버 action과 공개 REST 엔드포인트는 study6의 게시판 서비스에서 같은 검증과 DB를 사용한다.","개발자도구에서 FormData와 JSON의 Content-Type 차이와 요청 응답을 확인한다."],
    errors:[["빠른 클릭으로 중복 요청","pending 검사가 호출 전에 실행되지 않음","핸들러 입구와 버튼 상태에 pending을 연결한다."],["JSON 응답 대신 파싱 예외","요청 경로가 UI URL이거나 프록시 오류 HTML을 받음","Network의 상태·Content-Type·실제 호출 경로를 확인한다."]],
    practice:["제목을 정상과 빈 값으로 보내 마지막 응답을 기록한다.","태그 11개로 글쓰기 action을 호출해 fields.tags 메시지를 확인한다."],
    checks:["`\"use server\"` 서버 함수와 `action`으로 글쓰기 폼","`오류 응답 오류`를 익힌다".replace("`오류 응답 오류`를 익힌다","오류 응답 `error.code/message/fields`를 폼 오류로 표시"),"200·400·422 및 중복 제출 방지 확인"],
    refs:[["SolidStart 데이터 변경","https://docs.solidjs.com/solid-start/v2/building-your-application/data-mutation"]]
  },
  {
    id:"6", title:"DB와 API 연동", goal:"SQLite로 게시글·댓글을 저장하고 공통 API v1의 CRUD와 응답을 맞춘다.",
    theory:["저장소는 데이터베이스의 보관 방식과 서비스 호출 규칙 사이의 경계다. 도서관 대출 창구가 책이 종이인지 전자인지와 상관없이 같은 대출 업무를 처리하는 것과 비슷하다.","users, posts, comments, sessions가 각각 숫자 ID를 갖는다. owner는 작성자, parent는 댓글의 상위 글을 나타내며 payload는 JSON 문자열이다. 원시 payload는 API에 내보내지 않고 DTO를 조립한다.","GET /api/posts는 data 배열과 meta, GET /api/posts/{id}는 단건 data, POST는 201과 Location, PATCH는 부분 수정, DELETE는 본문 없는 204를 사용한다."],
    steps:[".env에서 DB_CLIENT=sqlite 및 DB_FILE=data/board.db를 정하고 /ready를 호출한다.","회원가입과 로그인 뒤 /api/posts에서 등록 → 목록 → 상세 → 수정 → 삭제를 실행한다. 로그인 토큰은 Bearer로, 브라우저에서는 HttpOnly 쿠키를 쓴다.","/api/posts/{id}/comments에서 목록과 작성, /api/comments/{id}에서 작성자 삭제를 확인한다."],
    files:[{path:"tsx_version/src/routes/api/posts/index.ts",lines:["1|APIEvent로 들어오는 요청 타입을 알린다.","2|작성에는 세션 또는 Bearer 인증을 요구한다.","3|GET은 캐시가 붙은 목록 서비스를 쓰고 POST는 저장소 서비스를 쓴다.","6|API 계약을 요청 본문·응답 처리기에 연결한다.","7|검색 URL을 그대로 읽고 data와 meta를 JSON으로 내보낸다.","9|사용자를 확인한 다음 본문을 읽어 등록한다.","11|생성된 리소스 경로를 Location 응답 헤더에 담는다."]},{path:"tsx_version/src/routes/api/posts/[id].ts",lines:["6|필요한 CORS 프리플라이트 응답을 등록한다.","7|정수 ID를 파싱하고 공개 상세를 조회한다.","8|PATCH 요청에서는 로그인 후 일부 필드만 수정한다.","12|삭제에서 소유자를 확인하고 성공 시 빈 204를 반환한다."]}],
    links:["study5의 폼 오류는 같은 error.code, error.message, error.fields로 표시한다.","study7에서 로그인 응답과 작성자 검사를 확인하고 study14에서 /api-docs 정책을 정리한다."],
    errors:[["SQLITE_CANTOPEN","쓰기 경로를 만들 수 없음","DB_FILE 위치와 앱 사용자의 쓰기 권한을 확인한다."],["목록이 비었는데 검색어가 남음","q나 page 필터가 적용돼 있음","data와 meta를 함께 보고 첫 페이지와 빈 검색으로 재시도한다."],["삭제 후 JSON 파싱 오류","본문 없는 204에 response.json() 호출","204를 확인하고 파싱을 건너뛴다."]],
    practice:["같은 글을 다른 계정에서 수정하고 403을 확인한다.","limit=51과 검색어 소문자를 지정하고 최대 한도와 대소문자 무시 검색을 확인한다."],
    checks:["`query`와 `createAsync`로 서버 데이터 불러오기","`src/routes/api` 아래 API 라우트로 JSON 엔드포인트 만들기","목록 응답 `data`와 `meta`를 그대로 받기","공통 v1 CRUD·댓글·Location·요청 ID 확인"],
    refs:[["Notion 공통 API 스펙 v1","https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e"],["SolidStart API 라우트","https://docs.solidjs.com/solid-start/v2/building-your-application/api-routes"]]
  }
];
