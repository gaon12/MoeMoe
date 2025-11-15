<a id="readme-top"></a>

<div align="center">
  <h1>MoeMoe — Anime Wallpaper Clock</h1>
  <p>
    A beautiful, customizable desktop clock with random anime backgrounds, multilingual UI, and rich settings.
  </p>
  <!-- Optional screenshot: place at public/images/screenshot.png
  <img src="images/screenshot.png" alt="Screenshot" width="720" />
  -->
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#features">Features</a></li>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#environment">Environment</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#settings">Settings</a></li>
    <li><a href="#api-sources">API Sources</a></li>
    <li><a href="#i18n">Internationalization</a></li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#scripts">Scripts</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

## About The Project

MoeMoe is a desktop-style clock inspired by the Windows lock screen. It displays a large, elegant clock over stunning anime/waifu imagery from multiple sources, with smooth transitions, multilingual support, and robust customization. Settings persist locally and the app runs entirely client‑side.

### Features

- Real-time clock with flexible format
  - 12/24‑hour toggle, optional seconds
  - AM/PM visibility, style (locale words or AM/PM), and position (before/after)
- Multiple image sources with randomization and graceful fallback
- Progressive image loading (Thumbhash preview → full image)
- Artist and source attribution where available
- Theme system: Dark, Light, Auto
- Settings panel with persistence (localStorage)
- Keyboard shortcuts (R/Space refresh, F fullscreen, S settings)
- Responsive layout with refined overlays and readability
- Optional server time sync with network-delay compensation

### Built With

- React 19, TypeScript 5.9, Vite 7
- i18next (multilingual UI), Thumbhash (image placeholders)
- Modern CSS with variables and responsive design

## Getting Started

### Prerequisites

- Node.js 18+
- npm (or yarn/pnpm)

### Installation

```bash
# Clone
git clone https://github.com/your-username/moemoe.git
cd moemoe

# Install deps
npm install

# Start dev server
npm run dev

# Build production
npm run build

# Preview production build
npm run preview
```

### Environment

Copy `.env.sample` to `.env` and adjust as needed:

```
VITE_FIX_CORS_API_URL=https://test.com/?url=
VITE_SERVER_TIME_API_URL=https://test.com/?tz=
```

- CORS proxy is optional; when set, image URLs are proxied automatically.
- Server time API: the app appends your IANA timezone (e.g., `Asia/Seoul`) to `tz=`, then computes offset using round‑trip midpoint to compensate for delay.

## Usage

- Press `S` to open Settings
- Press `R` or `Space` to refresh the background
- Press `F` to toggle fullscreen

Artist/source links are shown when available; click to open in a new tab.

## Settings

Appearance
- Language: auto‑initialized from browser (ko/ja/en; falls back to en)
- Theme: Dark / Light / Auto
- Clock: 12/24‑hour, seconds on/off, AM/PM style (locale or AM/PM) and position

Images
- Sources: multi‑select with Select All / Deselect All; at least one is required (defaults to all selected)
- Fit mode: Cover / Contain
- Letterbox fill: Blur / Edge‑Color / Custom / Solid
- Auto refresh interval (seconds)
- Allow NSFW (where supported)

Time
- Use server time (optional)
- Update interval for server sync (10/30/60/300 seconds)

## API Sources

Integrated
- Nekos.best — rich categories, artist/anime metadata
- Waifu.pics — simple, reliable SFW/NSFW endpoints
- Nekosia — curated catgirl images
- Waifu.im — curated images with artist/source info
- Nekos.moe — random image id → direct file URL
- Donmai.us (Danbooru) — random posts (respecting SFW/NSFW setting)

Planned/Requested
- Waifu.it, Pic.re, Neoksapi.com

## Internationalization

Supported languages
- Korean (한국어)
- English
- Japanese (日本語)

All strings live under `src/locales/{ko,en,ja}/translation.json`.

## Project Structure

```
src/
├─ components/
│  ├─ Clock/
│  ├─ ImageBackground/
│  ├─ RefreshButton/
│  ├─ DownloadButton/
│  ├─ SettingsButton/
│  └─ SettingsModal/
├─ contexts/           # AppContext (settings/state)
├─ i18n/               # i18next config
├─ locales/            # translations
├─ services/           # imageApi (sources, proxy)
├─ types/              # image/settings types
├─ App.tsx, App.css
├─ index.css
└─ main.tsx
```

## Scripts

- `npm run dev` — start dev server
- `npm run build` — type‑check + build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint

## Roadmap

- Additional sources (Waifu.it, Pic.re, Neoksapi.com)
- Advanced widgets (Weather, Quotes, Custom text)
- Favorites/history, export/import settings

## Contributing

We welcome contributions of all kinds:

- Open an issue for bugs or feature requests
  - https://github.com/your-username/moemoe/issues/new/choose
- Submit a pull request with your changes
- Donate to support development (GitHub Sponsors/BuyMeACoffee — add your link here)

Please follow common GitHub practices (small, focused PRs; clear descriptions). Thank you!

## License

MIT License — see `LICENSE` in the repository.

## Acknowledgments

- Fonts: RIDIBatang by Ridi Corporation
- APIs: Nekos.best, Waifu.pics, Nekosia, Waifu.im, Nekos.moe, Danbooru
