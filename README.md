# MoeMoe

Windows 잠금 화면에서 영감을 받은 애니메이션 배경화면 시계입니다. 여러 이미지 공급자에서 화면 비율에 맞는 이미지를 불러오고, 시계·날씨·위치·명대사·사용자 문구 위젯을 원하는 위치에 배치할 수 있습니다.

![MoeMoe 4K demo](public/demo/demo.webp)

## 주요 기능

- 9개 온라인 이미지 공급자와 공급자별 장애 격리: Nekos.best, Waifu.pics, Nekosia, Waifu.im, Nekos.moe, Danbooru, Pic.re, NekosAPI, Wallhaven
- JPEG·PNG·WebP·AVIF 사용자 이미지를 브라우저에 보관하고 온라인 소스와 함께 무작위 표시
- 화면·가로·세로·정사각형 비율 선호, cover/contain 맞춤, 블러·단색 레터박스
- Windows Spotlight 방식의 즐겨찾기 갤러리와 “이 이미지는 그만 보기” 피드백
- 즐겨찾기한 이미지는 원본 바이트를 IndexedDB에 보관하므로 공급자가 주소를 바꿔도 남아 있음
- 최근 본 배경화면 20장을 오가는 앞으로/뒤로 이동
- 12/24시간제, 초 표시, AM/PM 위치, 선택적 서버 시간 동기화
- 시계·날씨·위치·애니 명대사·사용자 문구 위젯, 드래그로 배치
- 섭씨/화씨 선택
- JPG, PNG, WebP, AVIF 다운로드와 원본 출처/작가 메타데이터
- 한국어, 영어, 일본어 UI 및 키보드·포커스 접근성
- 설정 내보내기/가져오기, 런타임 검증, 로컬 저장
- 설치 가능한 PWA와 오프라인 셸
- 저장소에 새 커밋이 올라오면 알리고 10분 뒤 자동 새로고침
- 4K(3840×2160) 오리지널 데모 아트와 AVIF/WebP 최적화

## 시작하기

Node.js `22.22.2+`, `24.15+` 또는 `26+`가 필요합니다. npm은 각 Node에 기본 포함된 버전(`10.9+`)이면 충분합니다.

```bash
git clone https://github.com/gaon12/MoeMoe.git
cd MoeMoe
npm install
Copy-Item .env.sample .env   # PowerShell
npm run dev
```

macOS/Linux에서는 `cp .env.sample .env`를 사용하세요. `.env`와 `.env.*`는 Git에서 제외되며 `.env.sample`만 공개됩니다.

## 환경 변수

| 변수                                | 용도                           | 기본 권장값         |
| ----------------------------------- | ------------------------------ | ------------------- |
| `VITE_FIX_CORS_API_URL`             | 이미지 다운로드용 CORS 프록시  | 배포 설정 사용      |
| `VITE_SERVER_TIME_API_URL`          | 서버 시간 API URL              | 배포 설정 사용      |
| `VITE_GITHUB_REPO_URL`              | 오류 신고 링크                 | 이 저장소 URL       |
| `VITE_ANIME_QUOTE_API_URL`          | 명대사 위젯                    | `.env.sample` 참고  |
| `VITE_IP_REVERSE_GEOCODING_API_URL` | 위치 권한 거절 시 IP 위치 조회 | `https://ipinfo.io` |
| `VITE_APP_COMMIT`                   | 빌드 커밋 SHA 직접 지정        | 비워두면 git에서 읽음 |

`VITE_` 값은 빌드 결과에 공개됩니다. 비밀 키를 넣지 마세요. 외부 설정 URL은 HTTPS만 허용하며, CORS 프록시는 직접 관리하고 신뢰하는 서버만 사용해야 합니다. WeatherAPI 키는 설정 화면에 입력하며 브라우저 로컬 저장소에만 보관되지만, 클라이언트 앱 특성상 완전한 비밀로 취급할 수 없습니다. 설정 내보내기와 가져오기에서는 API 키를 제외합니다.

서버 시간 사용 시 외부 시간 API URL이 비어 있으면 현재 배포 서버에 `HEAD` 요청을 보내 HTTP `Date` 헤더로 동기화합니다. 외부 API를 사용하려면 URL에 `{timezone}` 자리표시자를 넣거나 `timeZone`·`timezone`·`tz` 쿼리 매개변수를 사용할 수 있습니다.

`npm run build`는 현재 빌드에 사용한 공개 `VITE_` 변수만 모아 `dist/.env`도 생성합니다. 따라서 서버에 `dist` 폴더를 그대로 업로드할 수 있습니다. 이 파일은 배포 설정을 함께 보관하기 위한 산출물이며, Vite 정적 앱은 런타임에 `.env`를 다시 읽지 않습니다. 값을 바꾼 뒤에는 반드시 다시 빌드하세요.

애니 명대사 위젯은 기본적으로 꺼져 있습니다. 활성화하면 설정된 HTTPS API를 먼저 사용하고, API가 없거나 응답하지 않으면 내장 문구로 자동 전환합니다.

## 배포

`main`에 push하면 `.github/workflows/deploy.yml`이 검사 → 빌드 → rsync 전송까지 자동으로 처리합니다. 빌드 시 `VITE_APP_COMMIT`에 배포 중인 커밋 SHA를 직접 넣으므로, 실행 중인 앱이 자기 자신을 정확한 커밋과 비교합니다.

필요한 저장소 시크릿(Settings → Secrets and variables → Actions):

| 시크릿               | 내용                                            |
| -------------------- | ----------------------------------------------- |
| `DEPLOY_HOST`        | 서버 호스트명 또는 IP                           |
| `DEPLOY_USER`        | SSH 사용자명                                    |
| `DEPLOY_PATH`        | 업로드할 서버 경로 (이 앱 전용 디렉터리)        |
| `DEPLOY_SSH_KEY`     | 배포용 SSH 개인키 전문                          |
| `DEPLOY_KNOWN_HOSTS` | 서버 호스트키 (`ssh-keyscan -p 22 호스트`)      |
| `DEPLOY_PORT`        | 선택. 비우면 22                                 |

여섯 값을 손으로 모으는 대신 `setup-deploy-secrets.py`를 **서버에 접속한 상태에서** 실행하면 붙여넣을 형태로 한 번에 출력됩니다. 이 스크립트는 출력에 개인키가 포함되므로 저장소에 커밋하지 않습니다(`.gitignore`에 등록됨). 로컬 파일을 서버로 복사하거나 내용을 붙여넣어 실행하세요.

```bash
python3 setup-deploy-secrets.py --host moemoe.uiharu.dev --path /배포/경로
```

하는 일:

- 배포 전용 ed25519 키쌍을 새로 만들고 공개키를 이 계정의 `authorized_keys`에 `restrict` 옵션으로 등록합니다. `restrict`는 pty·포트포워딩·에이전트 포워딩을 막지만 rsync에는 필요 없는 것들이라 배포는 그대로 동작하며, 키가 유출돼도 일반 로그인용으로 쓸 수 없습니다.
- `/etc/ssh`의 호스트키를 읽어 `DEPLOY_KNOWN_HOSTS` 줄을 만듭니다. 포트가 22가 아니면 `[호스트]:포트` 형식으로 씁니다.
- 개인키를 **한 번 출력한 뒤 서버에서 삭제**합니다. 서버에는 공개키만 남습니다.
- 다시 실행하면 같은 주석(`moemoe-deploy`)의 이전 키를 교체하므로 `authorized_keys`가 쌓이지 않고, 기존 `authorized_keys`는 `.bak`으로 백업합니다.

`--host`를 생략하면 현재 SSH 세션의 서버 주소를 씁니다. **도메인으로 접속한다면 반드시 `--host`에 도메인을 넣으세요** — 호스트키 항목이 GitHub가 접속할 주소와 정확히 일치해야 합니다.

직접 만들려면:

```bash
ssh-keygen -t ed25519 -C "moemoe-deploy" -f moemoe-deploy -N ""
ssh-copy-id -i moemoe-deploy.pub 사용자@호스트   # 공개키를 서버에 등록
ssh-keyscan -p 22 호스트                          # DEPLOY_KNOWN_HOSTS 값
```

호스트키는 `StrictHostKeyChecking=no`로 넘기지 않고 시크릿에 고정합니다. 그렇지 않으면 그 주소에 응답하는 아무 서버에나 릴리스를 넘겨주게 됩니다.

전송은 `rsync --delay-updates --delete-after`입니다. 새 파일을 모두 올린 뒤 한 번에 교체하고, 빌드에 더 이상 없는 파일은 그 다음에 지웁니다. **`DEPLOY_PATH`는 이 앱만 들어 있는 디렉터리여야 합니다** — 그 경로에서 `dist`에 없는 파일은 삭제됩니다. 처음 설정할 때는 Actions 탭에서 Deploy 워크플로를 수동 실행하면 `dry_run`이 기본값 `true`라 서버를 건드리지 않고 전송될 목록만 확인할 수 있습니다.

## 자동 업데이트

`VITE_GITHUB_REPO_URL`의 저장소 기본 브랜치 최신 커밋을 30분마다 확인합니다. 빌드에 박힌 커밋과 다르면 알림을 띄우고 **10분 뒤 자동으로 새로고침**합니다. 알림의 `지금 새로고침`으로 즉시 적용할 수도 있습니다. 설정 → 일반 → 자동 업데이트에서 끌 수 있습니다.

빌드 커밋은 `vite build` 시점에 `git rev-parse HEAD`로 읽어 번들에 넣습니다. CI처럼 git 정보가 없는 환경에서는 `VITE_APP_COMMIT`으로 직접 지정하세요. 둘 다 없으면 비교할 기준이 없으므로 확인 자체를 하지 않습니다.

자동 배포를 쓰면 저장소와 배포본이 항상 일치하므로 확인 결과가 곧 실제 업데이트입니다. 수동으로 업로드하는 경우에는 저장소가 배포본보다 앞서 있는 상태가 정상이고, 이때는 새로고침해도 커밋이 그대로입니다. 그래서 같은 커밋에 대한 재시도는 6시간 동안 하지 않습니다. 이 장치가 없으면 10분마다 무한 새로고침이 됩니다. 저장소에 더 새로운 커밋이 올라오면 대기 시간과 무관하게 다시 시도합니다.

인증 없는 GitHub API는 IP당 시간당 60회로 제한되며, 30분 간격은 시간당 2회입니다. 탭이 백그라운드일 때는 확인하지 않습니다.

## 사용자 이미지

설정 → 이미지 → 사용자 이미지에서 여러 파일을 추가할 수 있습니다. 파일은 서버로 업로드하지 않고 현재 브라우저의 IndexedDB에 저장되며, 추가하면 `사용자 이미지` 소스가 자동으로 활성화됩니다.

- 허용 형식: JPEG, PNG, WebP, AVIF
- 파일당 25MB, 최대 50개, 전체 250MB
- 디코딩할 수 없는 파일과 1억 픽셀을 초과하는 이미지는 거부
- 동일한 이름·크기·수정 시각의 중복 파일은 건너뜀
- 사용자 이미지는 세션 전용 `blob:` 주소를 사용하므로 원격 즐겨찾기·차단 목록에는 저장하지 않음
- 온라인 이미지를 즐겨찾기하면 원본 바이트를 별도 IndexedDB(이미지당 20MB, 전체 150MB)에 보관하며, 실패해도 즐겨찾기 자체는 그대로 유지됨

브라우저 데이터 삭제나 시크릿 모드 종료 시 이미지가 사라질 수 있으므로 원본 파일은 별도로 보관하세요.

## 단축키

| 키            | 동작                        |
| ------------- | --------------------------- |
| `R` / `Space` | 새 배경화면                 |
| `F`           | 전체 화면                   |
| `P`           | 자동 새로고침 일시정지/재개 |
| `S`           | 설정 열기                   |
| `←` / `→`     | 이전/다음 배경화면          |

입력란에 포커스가 있거나 이미지를 불러오는 중에는 충돌하는 단축키가 동작하지 않습니다.

한글·가나 입력기가 켜져 있으면 `KeyboardEvent.key`가 조합된 문자를 보고하므로, 그런 경우에는 물리 키 위치(`KeyboardEvent.code`)로 대체합니다. Dvorak 같은 비 QWERTY 배열에서는 키에 인쇄된 글자가 우선합니다.

## 품질 검사

```bash
npm run lint          # Biome 린터
npm run format:check  # Biome 포매터 검사
npm run check         # 린트와 포맷을 한 번에
npm run typecheck
npm test
npm run build
npm audit
```

린트와 포맷은 모두 [Biome](https://biomejs.dev)이 담당합니다. 전체 규칙 프리셋(`preset: all`)을 켜고 필요한 곳만 `biome.json`에서 조정했습니다. ESLint와 Prettier는 제거했습니다.

`npm run format`으로 포맷을 적용할 수 있습니다. GitHub Actions(`.github/workflows/quality.yml`)가 `engines`가 허용하는 Node 22·24·26 각 라인의 최저 버전에서, 각 Node에 기본 포함된 npm으로 위 검사를 모두 실행합니다.

네트워크 요청에는 취소와 타임아웃이 적용되며, 설정 파일을 가져올 때 타입·범위·중복 위젯 ID를 검증합니다.

## 설계와 향후 확장

MoeMoe는 Waifu Downloader, Catgirl Downloader와 같은 이미지 수집 도구의 편의성과 Windows Spotlight의 잠금 화면 경험을 웹에서 결합합니다. 이번 버전에는 고해상도·비율 필터가 강한 Wallhaven SFW 공급자, 이미지 선호/제외 피드백, 즐겨찾기 갤러리를 추가했습니다.

다음 단계로는 데스크톱 래퍼를 통한 실제 Windows 잠금 화면/바탕 화면 적용, 로컬 폴더 공급자(File System Access API), 시간대별 컬렉션, 공급자 상태 대시보드, 다음 배경화면 미리 받아두기를 고려할 수 있습니다. 브라우저만으로는 운영체제 잠금 화면을 직접 변경할 수 없으므로 이 기능은 별도 데스크톱 권한 모델이 필요합니다.

## 기술 스택

- React 19, TypeScript 7, Vite 8
- i18next / react-i18next
- Biome 2 (린트 + 포맷), Vitest 4

## 후원

프로젝트가 마음에 들면 [GitHub Sponsors에서 gaon12 후원하기](https://github.com/sponsors/gaon12)를 이용해 주세요.

## 라이선스

MIT. 자세한 내용은 [LICENSE](LICENSE)를 참고하세요.
