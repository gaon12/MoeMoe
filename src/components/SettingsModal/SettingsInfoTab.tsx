import { useTranslation } from "react-i18next";

declare const __APP_VERSION__: string;

interface LocalizedText {
  ko: string;
  en: string;
  ja: string;
}

const localize = (language: string, text: LocalizedText) => {
  if (language === "ja") {
    return text.ja;
  }
  if (language === "en") {
    return text.en;
  }
  return text.ko;
};

export const SettingsInfoTab = () => {
  const { t, i18n } = useTranslation();
  const githubUrl = "https://github.com/gaon12/MoeMoe";
  const sponsorsUrl = "https://github.com/sponsors/gaon12";
  const lang = i18n.language;

  const infoText = {
    librariesTitle: localize(lang, {
      ko: "사용한 라이브러리",
      en: "Libraries Used",
      ja: "使用ライブラリ",
    }),
    librariesDescription: localize(lang, {
      ko: "이 프로젝트를 구성하는 주요 오픈 소스 라이브러리입니다.",
      en: "Major open-source libraries used in this project.",
      ja: "このプロジェクトで利用している主なオープンソースライブラリです。",
    }),
    librariesNameHeader: localize(lang, {
      ko: "라이브러리",
      en: "Library",
      ja: "ライブラリ",
    }),
    librariesLicenseHeader: localize(lang, {
      ko: "라이선스",
      en: "License",
      ja: "ライセンス",
    }),
    apisTitle: localize(lang, {
      ko: "사용한 API",
      en: "APIs Used",
      ja: "利用API",
    }),
    apisDescription: localize(lang, {
      ko: "배경 이미지, 날씨, 위치, 시간 동기화 등에 사용하는 외부 API입니다.",
      en: "External APIs used for wallpapers, weather, location and time sync.",
      ja: "背景画像、天気、位置情報、時刻同期などに外部APIを利用しています。",
    }),
    apisNameHeader: "API",
    apisUsageHeader: localize(lang, {
      ko: "용도",
      en: "Usage",
      ja: "用途",
    }),
    licenseTitle: localize(lang, {
      ko: "라이선스",
      en: "License",
      ja: "ライセンス",
    }),
    projectLicenseLabel: localize(lang, {
      ko: "프로젝트 라이선스",
      en: "Project license",
      ja: "プロジェクトライセンス",
    }),
    sponsorLabel: localize(lang, {
      ko: "개발 후원하기",
      en: "Support development",
      ja: "開発を支援",
    }),
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
      usage: localize(lang, {
        ko: "애니메이션 이미지 (SFW)",
        en: "Anime images (SFW)",
        ja: "アニメ画像 (SFW)",
      }),
    },
    {
      name: "Waifu.pics",
      usage: localize(lang, {
        ko: "애니메이션 이미지 (SFW/NSFW)",
        en: "Anime images (SFW/NSFW)",
        ja: "アニメ画像 (SFW/NSFW)",
      }),
    },
    {
      name: "Nekosia",
      usage: localize(lang, {
        ko: "애니메이션 이미지",
        en: "Anime images",
        ja: "アニメ画像",
      }),
    },
    {
      name: "Waifu.im",
      usage: localize(lang, {
        ko: "애니메이션 이미지 및 작가 정보",
        en: "Anime images with artist info",
        ja: "アニメ画像 + 作者情報",
      }),
    },
    {
      name: "Nekos.moe",
      usage: localize(lang, {
        ko: "ID 기반 애니메이션 이미지",
        en: "Anime images by ID",
        ja: "アニメ画像 (IDベース)",
      }),
    },
    {
      name: "Danbooru (donmai.us)",
      usage: localize(lang, {
        ko: "랜덤 애니메이션 이미지 (safe/NSFW)",
        en: "Random anime images (safe/NSFW)",
        ja: "ランダムアニメ画像 (safe/NSFW)",
      }),
    },
    {
      name: "Pic.re",
      usage: localize(lang, {
        ko: "랜덤 SFW 애니메이션 이미지",
        en: "Random SFW anime images",
        ja: "ランダム SFW アニメ画像",
      }),
    },
    {
      name: "Nekos API (api.nekosapi.com)",
      usage: localize(lang, {
        ko: "애니메이션 이미지 (safe/NSFW)",
        en: "Anime images (safe/NSFW)",
        ja: "アニメ画像 (safe/NSFW)",
      }),
    },
    {
      name: "Wallhaven",
      usage: localize(lang, {
        ko: "고해상도 SFW 애니 배경화면",
        en: "High-resolution SFW anime wallpapers",
        ja: "高解像度SFWアニメ壁紙",
      }),
    },
    {
      name: "WeatherAPI.com",
      usage: localize(lang, {
        ko: "날씨/위치 위젯의 날씨 데이터",
        en: "Weather data for weather/location widgets",
        ja: "天気・現在地ウィジェットの天気情報",
      }),
    },
    {
      name: "OpenStreetMap Nominatim",
      usage: localize(lang, {
        ko: "위도/경도 기반 역지오코딩",
        en: "Reverse geocoding from latitude/longitude",
        ja: "緯度/経度からの住所の逆ジオコーディング",
      }),
    },
    {
      name: "Anime Quote API",
      usage: localize(lang, {
        ko: "애니 명대사 위젯 (환경 변수로 URL 설정)",
        en: "Anime quote widget (URL via env var)",
        ja: "アニメ名言ウィジェット (環境変数でURL指定)",
      }),
    },
    {
      name: "Server Time API",
      usage: localize(lang, {
        ko: "서버 시간 동기화 (환경 변수로 URL 설정)",
        en: "Server time sync (URL via env var)",
        ja: "サーバー時刻同期 (環境変数でURL指定)",
      }),
    },
    {
      name: "IP-based Reverse Geocoding API",
      usage: localize(lang, {
        ko: "IP 기반 대략적인 위치 추정 (환경 변수)",
        en: "Approximate location from IP (env var)",
        ja: "IPベースのおおまかな現在地推定",
      }),
    },
  ];

  return (
    <>
      <div className="settings-section">
        <h3 className="settings-section-title">{t("settings.info.title")}</h3>

        <div className="settings-option">
          <span className="settings-label">
            {t("settings.info.projectName")}
          </span>
          <p className="settings-description">{t("app.title")}</p>
        </div>

        <div className="settings-option">
          <span className="settings-label">{t("settings.info.version")}</span>
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
          <span className="settings-label">{infoText.projectLicenseLabel}</span>
          <p className="settings-description">MIT License</p>
        </div>
        <div className="settings-option">
          <span className="settings-label">{t("settings.info.github")}</span>
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className="info-link"
          >
            <span className="info-link-icon" aria-hidden="true">
              {"GH"}
            </span>
            <span className="info-link-text">{"github.com/gaon12/MoeMoe"}</span>
          </a>
        </div>
        <div className="settings-option">
          <span className="settings-label">{infoText.sponsorLabel}</span>
          <a
            href={sponsorsUrl}
            target="_blank"
            rel="noreferrer"
            className="info-link"
          >
            <span className="info-link-icon" aria-hidden="true">
              {"♥"}
            </span>
            <span className="info-link-text">
              {"github.com/sponsors/gaon12"}
            </span>
          </a>
        </div>
      </div>
    </>
  );
};
