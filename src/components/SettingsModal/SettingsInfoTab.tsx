import { useTranslation } from "react-i18next";

export const SettingsInfoTab = () => {
  const { t, i18n } = useTranslation();
  const githubUrl = "https://github.com/gaon12/MoeMoe";
  const sponsorsUrl = "https://github.com/sponsors/gaon12";
  const lang = i18n.language;

  const infoText = {
    librariesTitle:
      lang === "ja"
        ? "使用ライブラリ"
        : lang === "en"
          ? "Libraries Used"
          : "사용한 라이브러리",
    librariesDescription:
      lang === "ja"
        ? "このプロジェクトで利用している主なオープンソースライブラリです。"
        : lang === "en"
          ? "Major open-source libraries used in this project."
          : "이 프로젝트를 구성하는 주요 오픈 소스 라이브러리입니다.",
    librariesNameHeader:
      lang === "ja" ? "ライブラリ" : lang === "en" ? "Library" : "라이브러리",
    librariesLicenseHeader:
      lang === "ja" ? "ライセンス" : lang === "en" ? "License" : "라이선스",
    apisTitle:
      lang === "ja" ? "利用API" : lang === "en" ? "APIs Used" : "사용한 API",
    apisDescription:
      lang === "ja"
        ? "背景画像、天気、位置情報、時刻同期などに外部APIを利用しています。"
        : lang === "en"
          ? "External APIs used for wallpapers, weather, location and time sync."
          : "배경 이미지, 날씨, 위치, 시간 동기화 등에 사용하는 외부 API입니다.",
    apisNameHeader: lang === "ja" ? "API" : lang === "en" ? "API" : "API",
    apisUsageHeader: lang === "ja" ? "用途" : lang === "en" ? "Usage" : "용도",
    licenseTitle:
      lang === "ja" ? "ライセンス" : lang === "en" ? "License" : "라이선스",
    projectLicenseLabel:
      lang === "ja"
        ? "プロジェクトライセンス"
        : lang === "en"
          ? "Project license"
          : "프로젝트 라이선스",
    sponsorLabel:
      lang === "ja"
        ? "開発を支援"
        : lang === "en"
          ? "Support development"
          : "개발 후원하기",
  };

  const libraries = [
    { name: "React", license: "MIT" },
    { name: "React DOM", license: "MIT" },
    { name: "i18next", license: "MIT" },
    { name: "react-i18next", license: "MIT" },
    { name: "Vite", license: "MIT" },
    { name: "TypeScript", license: "Apache-2.0" },
  ];

  const apis = [
    {
      name: "Nekos.best",
      usage:
        lang === "ja"
          ? "アニメ画像 (SFW)"
          : lang === "en"
            ? "Anime images (SFW)"
            : "애니메이션 이미지 (SFW)",
    },
    {
      name: "Waifu.pics",
      usage:
        lang === "ja"
          ? "アニメ画像 (SFW/NSFW)"
          : lang === "en"
            ? "Anime images (SFW/NSFW)"
            : "애니메이션 이미지 (SFW/NSFW)",
    },
    {
      name: "Nekosia",
      usage:
        lang === "ja"
          ? "アニメ画像"
          : lang === "en"
            ? "Anime images"
            : "애니메이션 이미지",
    },
    {
      name: "Waifu.im",
      usage:
        lang === "ja"
          ? "アニメ画像 + 作者情報"
          : lang === "en"
            ? "Anime images with artist info"
            : "애니메이션 이미지 및 작가 정보",
    },
    {
      name: "Nekos.moe",
      usage:
        lang === "ja"
          ? "アニメ画像 (IDベース)"
          : lang === "en"
            ? "Anime images by ID"
            : "ID 기반 애니메이션 이미지",
    },
    {
      name: "Danbooru (donmai.us)",
      usage:
        lang === "ja"
          ? "ランダムアニメ画像 (safe/NSFW)"
          : lang === "en"
            ? "Random anime images (safe/NSFW)"
            : "랜덤 애니메이션 이미지 (safe/NSFW)",
    },
    {
      name: "Pic.re",
      usage:
        lang === "ja"
          ? "ランダム SFW アニメ画像"
          : lang === "en"
            ? "Random SFW anime images"
            : "랜덤 SFW 애니메이션 이미지",
    },
    {
      name: "Nekos API (api.nekosapi.com)",
      usage:
        lang === "ja"
          ? "アニメ画像 (safe/NSFW)"
          : lang === "en"
            ? "Anime images (safe/NSFW)"
            : "애니메이션 이미지 (safe/NSFW)",
    },
    {
      name: "Wallhaven",
      usage:
        lang === "ja"
          ? "高解像度SFWアニメ壁紙"
          : lang === "en"
            ? "High-resolution SFW anime wallpapers"
            : "고해상도 SFW 애니 배경화면",
    },
    {
      name: "WeatherAPI.com",
      usage:
        lang === "ja"
          ? "天気・現在地ウィジェットの天気情報"
          : lang === "en"
            ? "Weather data for weather/location widgets"
            : "날씨/위치 위젯의 날씨 데이터",
    },
    {
      name: "OpenStreetMap Nominatim",
      usage:
        lang === "ja"
          ? "緯度/経度からの住所の逆ジオコーディング"
          : lang === "en"
            ? "Reverse geocoding from latitude/longitude"
            : "위도/경도 기반 역지오코딩",
    },
    {
      name: "Anime Quote API",
      usage:
        lang === "ja"
          ? "アニメ名言ウィジェット (環境変数でURL指定)"
          : lang === "en"
            ? "Anime quote widget (URL via env var)"
            : "애니 명대사 위젯 (환경 변수로 URL 설정)",
    },
    {
      name: "Server Time API",
      usage:
        lang === "ja"
          ? "サーバー時刻同期 (環境変数でURL指定)"
          : lang === "en"
            ? "Server time sync (URL via env var)"
            : "서버 시간 동기화 (환경 변수로 URL 설정)",
    },
    {
      name: "IP-based Reverse Geocoding API",
      usage:
        lang === "ja"
          ? "IPベースのおおまかな現在地推定"
          : lang === "en"
            ? "Approximate location from IP (env var)"
            : "IP 기반 대략적인 위치 추정 (환경 변수)",
    },
  ];

  return (
    <>
      <div className="settings-section">
        <h3 className="settings-section-title">{t("settings.info.title")}</h3>

        <div className="settings-option">
          <label className="settings-label">
            {t("settings.info.projectName")}
          </label>
          <p className="settings-description">{t("app.title")}</p>
        </div>

        <div className="settings-option">
          <label className="settings-label">{t("settings.info.version")}</label>
          <p className="settings-description">{__APP_VERSION__}</p>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h3 className="settings-section-title">{infoText.librariesTitle}</h3>
          <p className="settings-description">
            {infoText.librariesDescription}
          </p>
        </div>
        <div className="info-table">
          <div className="info-table-header">
            <span className="info-table-col-name">
              {infoText.librariesNameHeader}
            </span>
            <span className="info-table-col-license">
              {infoText.librariesLicenseHeader}
            </span>
          </div>
          <ul className="info-list">
            {libraries.map((lib) => (
              <li key={lib.name} className="info-list-item">
                <span className="info-list-name">{lib.name}</span>
                <span className="info-badge">{lib.license}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h3 className="settings-section-title">{infoText.apisTitle}</h3>
          <p className="settings-description">{infoText.apisDescription}</p>
        </div>
        <div className="info-table">
          <div className="info-table-header">
            <span className="info-table-col-name">
              {infoText.apisNameHeader}
            </span>
            <span className="info-table-col-usage">
              {infoText.apisUsageHeader}
            </span>
          </div>
          <ul className="info-list">
            {apis.map((api) => (
              <li key={api.name} className="info-list-item">
                <span className="info-list-name">{api.name}</span>
                <span className="info-list-usage">{api.usage}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h3 className="settings-section-title">{infoText.licenseTitle}</h3>
        </div>
        <div className="settings-option">
          <label className="settings-label">
            {infoText.projectLicenseLabel}
          </label>
          <p className="settings-description">MIT License</p>
        </div>
        <div className="settings-option">
          <label className="settings-label">{t("settings.info.github")}</label>
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className="info-link"
          >
            <span className="info-link-icon" aria-hidden="true">
              GH
            </span>
            <span className="info-link-text">github.com/gaon12/MoeMoe</span>
          </a>
        </div>
        <div className="settings-option">
          <label className="settings-label">{infoText.sponsorLabel}</label>
          <a
            href={sponsorsUrl}
            target="_blank"
            rel="noreferrer"
            className="info-link"
          >
            <span className="info-link-icon" aria-hidden="true">
              ♥
            </span>
            <span className="info-link-text">github.com/sponsors/gaon12</span>
          </a>
        </div>
      </div>
    </>
  );
};
