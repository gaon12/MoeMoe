# MoeMoe

Windows 잠금 화면에서 영감을 받은 애니메이션 배경화면 시계입니다. 여러 이미지 공급자에서 화면 비율에 맞는 이미지를 불러오고, 시계·날씨·위치·명대사·사용자 문구 위젯을 원하는 위치에 배치할 수 있습니다.

![MoeMoe 4K demo](public/demo/demo.webp)

## 주요 기능

- 9개 온라인 이미지 공급자와 공급자별 장애 격리: Nekos.best, Waifu.pics, Nekosia, Waifu.im, Nekos.moe, Danbooru, Pic.re, NekosAPI, Wallhaven
- JPEG·PNG·WebP·AVIF 사용자 이미지를 브라우저에 보관하고 온라인 소스와 함께 무작위 표시
- 화면·가로·세로·정사각형 비율 선호, cover/contain 맞춤, 블러·단색 레터박스
- Windows Spotlight 방식의 즐겨찾기 갤러리와 “이 이미지는 그만 보기” 피드백
- 12/24시간제, 초 표시, AM/PM 위치, 선택적 서버 시간 동기화
- 시계·날씨·위치·애니 명대사·사용자 문구 위젯
- JPG, PNG, WebP, AVIF 다운로드와 원본 출처/작가 메타데이터
- 한국어, 영어, 일본어 UI 및 키보드·포커스 접근성
- 설정 내보내기/가져오기, 런타임 검증, 로컬 저장
- 4K(3840×2160) 오리지널 데모 아트 네 가지 포맷

## 시작하기

Vite 8의 요구 사항에 따라 Node.js `20.19+` 또는 `22.12+`가 필요합니다.

```bash
git clone https://github.com/gaon12/MoeMoe.git
cd MoeMoe
npm install
Copy-Item .env.sample .env   # PowerShell
npm run dev
```

macOS/Linux에서는 `cp .env.sample .env`를 사용하세요. `.env`와 `.env.*`는 Git에서 제외되며 `.env.sample`만 공개됩니다.

## 환경 변수

| 변수                                | 용도                               | 기본 권장값         |
| ----------------------------------- | ---------------------------------- | ------------------- |
| `VITE_FIX_CORS_API_URL`             | 이미지 다운로드용 CORS 프록시      | 비워 둠             |
| `VITE_SERVER_TIME_API_URL`          | IANA 시간대를 뒤에 붙이는 시간 API | 비워 둠             |
| `VITE_GITHUB_REPO_URL`              | 오류 신고 링크                     | 이 저장소 URL       |
| `VITE_ANIME_QUOTE_API_URL`          | 명대사 위젯                        | `.env.sample` 참고  |
| `VITE_IP_REVERSE_GEOCODING_API_URL` | 위치 권한 거절 시 IP 위치 조회     | `https://ipinfo.io` |

`VITE_` 값은 빌드 결과에 공개됩니다. 비밀 키를 넣지 마세요. 특히 CORS 프록시는 직접 관리하고 신뢰하는 서버만 사용해야 합니다. WeatherAPI 키는 설정 화면에 입력하며 브라우저 로컬 저장소에만 보관되지만, 클라이언트 앱 특성상 완전한 비밀로 취급할 수 없습니다.

애니 명대사 위젯은 기본적으로 꺼져 있습니다. 활성화하면 설정된 HTTPS API를 먼저 사용하고, API가 없거나 응답하지 않으면 내장 문구로 자동 전환합니다.

## 사용자 이미지

설정 → 이미지 → 사용자 이미지에서 여러 파일을 추가할 수 있습니다. 파일은 서버로 업로드하지 않고 현재 브라우저의 IndexedDB에 저장되며, 추가하면 `사용자 이미지` 소스가 자동으로 활성화됩니다.

- 허용 형식: JPEG, PNG, WebP, AVIF
- 파일당 25MB, 최대 50개, 전체 250MB
- 디코딩할 수 없는 파일과 1억 픽셀을 초과하는 이미지는 거부
- 동일한 이름·크기·수정 시각의 중복 파일은 건너뜀
- 사용자 이미지는 세션 전용 `blob:` 주소를 사용하므로 원격 즐겨찾기·차단 목록에는 저장하지 않음

브라우저 데이터 삭제나 시크릿 모드 종료 시 이미지가 사라질 수 있으므로 원본 파일은 별도로 보관하세요.

## 단축키

| 키            | 동작                        |
| ------------- | --------------------------- |
| `R` / `Space` | 새 배경화면                 |
| `F`           | 전체 화면                   |
| `P`           | 자동 새로고침 일시정지/재개 |
| `S`           | 설정 열기                   |

입력란에 포커스가 있거나 이미지를 불러오는 중에는 충돌하는 단축키가 동작하지 않습니다.

## 품질 검사

```bash
npm run format:check
npm run lint
npm test
npm run build
npm audit
```

`npm run lint`는 warning도 실패로 처리합니다. 네트워크 요청에는 취소와 타임아웃이 적용되며, 설정 파일을 가져올 때 타입·범위·중복 위젯 ID를 검증합니다.

## 설계와 향후 확장

MoeMoe는 Waifu Downloader, Catgirl Downloader와 같은 이미지 수집 도구의 편의성과 Windows Spotlight의 잠금 화면 경험을 웹에서 결합합니다. 이번 버전에는 고해상도·비율 필터가 강한 Wallhaven SFW 공급자, 이미지 선호/제외 피드백, 즐겨찾기 갤러리를 추가했습니다.

다음 단계로는 데스크톱 래퍼를 통한 실제 Windows 잠금 화면/바탕 화면 적용, 로컬 폴더 공급자, 시간대별 컬렉션, 공급자 상태 대시보드, 즐겨찾기 동기화를 고려할 수 있습니다. 브라우저만으로는 운영체제 잠금 화면을 직접 변경할 수 없으므로 이 기능은 별도 데스크톱 권한 모델이 필요합니다.

## 기술 스택

- React 19, TypeScript 6, Vite 8
- i18next / react-i18next
- ThumbHash
- ESLint 10, Prettier 3, Vitest 4

## 후원

프로젝트가 마음에 들면 [GitHub Sponsors에서 gaon12 후원하기](https://github.com/sponsors/gaon12)를 이용해 주세요.

## 라이선스

MIT. 자세한 내용은 [LICENSE](LICENSE)를 참고하세요.
