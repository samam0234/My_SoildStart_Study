# study16 · 운영, Docker와 CI/CD

## ① 목표

Docker 이미지, GitHub Actions, 관측과 복원 점검을 운영 체크리스트로 실행한다.

## ② 📖 이론

- Dockerfile은 같은 빌드 레시피로 런타임을 만드는 조리법이다. 빌드 단계에 설치·컴파일을 두고 최종 단계는 비루트 사용자로 실행한다.
- CI는 두 버전의 타입·테스트·빌드와 문서를 검사한다. 기본 브랜치에서 검증된 Docker 이미지를 커밋 SHA 태그의 Actions 아티팩트로 7일간 보관한다. 수동 실행에서 deploy를 선택하면 해당 실행의 아티팩트를 SSH로 보내 스테이징에 설치한다.
- /health는 프로세스, /ready는 DB 접근, 구조화 로그는 요청 ID·경로·지연·응답 상태를 기록한다. 백업은 복원 연습까지 해야 대체 가능한 데이터를 만들 수 있다.

## ③ 🛠️ 실기

### 실행 단계

1. 운영용 별도 .env에서 DB_CLIENT=pg를 선택하고 DATABASE_URL을 Compose의 db 서비스와 같게 정한다. 실제 운영 비밀번호와 비밀은 서버 또는 GitHub Environment에 저장한다.
2. docker compose up --build -d --wait 및 docker compose logs -f app을 실행한다. 호스트 프록시가 TLS를 종료하도록 하고 APP_ORIGIN은 공개 HTTPS URL로 지정한다.
3. Linux amd64 호스트의 /opt/solidstart에 배포용 compose.yml과 .env를 준비하고 staging 환경에 SSH host/user/key/known_hosts를 등록한다. 기본 브랜치에서 워크플로를 수동 실행하고 deploy를 선택한다. 작업은 압축 이미지를 docker image load에 전달하고 DB 이미지 준비 후 앱의 /ready를 확인한다.
4. PostgreSQL 백업: 백업 폴더를 준비한 뒤 docker compose exec -T db pg_dump -U board -d board --file=/tmp/board.sql, docker compose cp db:/tmp/board.sql backups/board.sql을 실행한다. 복원 실습은 별도 테스트 DB에서 psql -v ON_ERROR_STOP=1 -d 복원DB -f 덤프파일로 하고 행 수·인증·CRUD를 확인한다. SQLite는 node --env-file-if-exists=.env scripts/backup-sqlite.mjs를 실행한다.
5. 롤백은 호스트에 보관된 이전 SHA 태그 이미지를 SOLIDSTART_IMAGE로 지정하고 docker compose up -d --no-build --pull never --wait를 실행한다. 별도로 아카이브한 이미지가 있다면 먼저 docker image load로 불러온다. 스키마 변경이 있다면 앱 롤백과 DB 복원을 함께 검증한다.

### 전체 코드 · `Dockerfile`

```dockerfile
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/tsx_version/.output ./output
RUN mkdir /app/data && chown node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=4s --start-period=15s CMD node -e "fetch('http://127.0.0.1:3000/ready').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "output/server/index.mjs"]
```

#### 줄별 설명

- 1–2행 · Node 24 빌드 스테이지와 작업 경로를 정한다.
- 3–4행 · 잠금 파일로 의존성을 재현 가능하게 설치한다.
- 5–7행 · 소스를 가져와 빌드하고 개발 패키지를 정리한다.
- 8–10행 · 실행 이미지에는 운영 환경과 주소를 기본값으로 선언한다.
- 11–12행 · 운영 모듈과 빌드 결과를 비루트 사용자 소유로 복사한다.
- 13–14행 · SQLite 데이터 볼륨에 쓸 수 있는 경로를 준비한다.
- 15행 · 준비 상태를 정기 검사한다.
- 16–17행 · Nitro HTTP 엔트리를 시작한다.

### 전체 코드 · `.github/workflows/ci.yml`

```yaml
name: SolidStart checks
on:
  push:
  pull_request:
  workflow_dispatch:
    inputs:
      deploy:
        description: Deploy the verified image to the configured staging environment
        type: boolean
        default: false
permissions:
  contents: read
concurrency:
  group: solidstart-${{ github.ref }}
  cancel-in-progress: false
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: "24", cache: npm }
      - run: npm ci
      - run: npm run sync:jsx && git diff --exit-code -- jsx_version
      - run: npm run check && npm test && npm run verify:study
      - run: npm run build && npm run build:jsx
      - run: npm run test:http
      - run: npm run test:http
        env: { TEST_BUILD: jsx_version }
  image:
    if: github.ref_name == github.event.repository.default_branch && github.event_name != 'pull_request'
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Build and archive the verified image
        shell: bash
        run: |
          IMAGE="solidstart-study:$GITHUB_SHA"
          docker build --tag "$IMAGE" .
          docker image save "$IMAGE" | gzip -1 > solidstart-image.tar.gz
      - uses: actions/upload-artifact@v7
        with:
          name: solidstart-image-${{ github.sha }}
          path: solidstart-image.tar.gz
          if-no-files-found: error
          compression-level: 0
          retention-days: 7
  deploy:
    if: github.event_name == 'workflow_dispatch' && inputs.deploy
    needs: image
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: solidstart-image-${{ github.sha }}
      - name: Deploy image and wait for readiness
        env:
          STAGING_HOST: ${{ secrets.STAGING_HOST }}
          STAGING_USER: ${{ secrets.STAGING_USER }}
          STAGING_SSH_KEY: ${{ secrets.STAGING_SSH_KEY }}
          STAGING_KNOWN_HOSTS: ${{ secrets.STAGING_KNOWN_HOSTS }}
        run: |
          set -eu
          test -n "$STAGING_HOST" && test -n "$STAGING_USER"
          install -m 0700 -d ~/.ssh
          printf '%s\n' "$STAGING_SSH_KEY" > ~/.ssh/id_ed25519
          printf '%s\n' "$STAGING_KNOWN_HOSTS" > ~/.ssh/known_hosts
          chmod 600 ~/.ssh/id_ed25519 ~/.ssh/known_hosts
          IMAGE="solidstart-study:$GITHUB_SHA"
          REMOTE_HOST="$STAGING_USER@$STAGING_HOST"
          ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$REMOTE_HOST" docker image load < solidstart-image.tar.gz
          ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$REMOTE_HOST" sh -s -- "$IMAGE" <<'REMOTE'
          set -eu
          cd /opt/solidstart
          export SOLIDSTART_IMAGE="$1"
          docker compose pull db
          docker compose up -d --no-build --pull never --wait
          REMOTE
```

#### 줄별 설명

- 1–10행 · 푸시와 PR 검증, 스테이징용 수동 실행을 정의한다.
- 11–16행 · 저장소 읽기 권한과 브랜치별 동시성 제한을 둔다.
- 17–31행 · 두 버전의 의존성·소스·문서·빌드·HTTP를 검증한다.
- 32–37행 · 기본 브랜치에서 검증을 통과한 커밋만 빌드한다.
- 38–42행 · 이미지 태그를 SHA에 고정하고 압축 아카이브를 만든다.
- 43–49행 · 동일 실행에서 다운로드할 아티팩트를 업로드한다.
- 50–59행 · 스테이징 입력을 선택한 경우 이미지를 다운로드한다.
- 60–65행 · 배포 환경의 SSH 접속 비밀을 읽는다.
- 66–73행 · 공개 호스트 키 검증을 활성화하고 압축 이미지를 전송한다.
- 74–80행 · 원격 Docker Compose에서 DB와 앱을 시작하고 준비 상태를 기다린다.

## ④ 🔗 연동 포인트

- HTTP 백업·로그 점검은 studyFinal의 출시 기준으로 사용한다.
- GitHub Actions 환경 설정과 실행 절차는 워크플로 정의의 verify, image, deploy를 함께 확인한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 컨테이너 health unhealthy | DB 주소 또는 환경 변수 불일치 | compose ps와 app/db 로그에서 /ready 실패 원인을 확인한다. |
| 배포 직전 SSH host 오류 | known_hosts에 제공된 호스트 키가 실제 호스트와 다름 | 신뢰할 수 있는 경로에서 키를 확인하고 GitHub Environment에 넣는다. |
| DB 백업 용량이 0 | 리다이렉션 또는 백업 명령 실패 | 덤프 생성 종료 코드·파일 크기 확인 후 새 DB 복원으로 검증한다. |

## ⑥ 직접 해보기

1. 로컬 Compose 서비스를 재시작하고 작성한 글이 남아 있는지 확인한다.
2. SQLite 백업에서 integrity_check가 통과하는지 보고 임시 경로에서 서버를 실행한다.
3. 이미지 태그 두 개로 staging 롤백을 연습한다.

## ⑦ ☐ 체크리스트

- [ ] Docker 비루트 실행 및 /ready 통과
- [ ] CI에서 두 버전 빌드·HTTP 검사
- [ ] 운영 환경의 비밀·SSH·HTTPS 설정
- [ ] 백업 파일과 별도 DB 복원 확인

## ⑧ 다음 단계

[study17 · WebSocket과 파일 처리](study17.md)에서 Nitro WebSocket으로 공개 게시판 변경을 알리고 파일 업로드의 한도와 인증을 확인한다.

### 참고 자료

- [Notion SolidStart 학습 원문](https://app.notion.com/p/41fd7dec5e2e8136baebff3ee38eb136)
