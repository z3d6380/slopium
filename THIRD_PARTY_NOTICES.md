# Third-party notices

Slopium is a modified version of **[Hearth](https://github.com/rudra-avatar/Hearth)** (MIT), which is itself a modified version of **[partridgeworks/webos-launcher](https://github.com/partridgeworks/webos-launcher)** (MIT). The copyright notices of those projects are kept in [LICENSE](LICENSE), as the MIT licence requires. Slopium's own changes are released under the same MIT licence.

The MIT licence in [LICENSE](LICENSE) covers this project's own code and its logo/app icon. The material listed below belongs to others and is **not** covered by it. Licence texts for everything that is bundled in the installed app are in [`app/licenses/`](app/licenses/).

## Projects this one builds on or learned from

| Project | Licence | What Slopium takes from it |
|---|---|---|
| [Hearth](https://github.com/rudra-avatar/Hearth) by rudra-avatar | MIT | **The original base of this launcher**: app skeleton, home screen, settings, wallpapers, weather, clock, edit name/icon, quiet mode and OLED shift ideas and code. |
| [partridgeworks/webos-launcher](https://github.com/partridgeworks/webos-launcher) | MIT (© webos-launcher contributors) | The project Hearth was forked from: Luna service bridge, app list and icon loading, remote handling. |
| [CleanFrame (webOS)](https://github.com/TheLord83/CleanFrame-webos) (upstream: [nthnclrk/CleanFrame](https://github.com/nthnclrk/CleanFrame)) | MIT (© 2026 Nathan Clark; webOS port © 2026 Stefan Wienert, as stated in the licence file bundled with the app) | The idea of clean monochrome icons, and the monochrome icon marks in `app/icons/marks/` (the "marks" icon pack). See `app/licenses/ICON-MARKS-NOTICE.txt`, `CleanFrame-MIT.txt`, `CleanFrame-icon-sources.json`. |
| [Simple LG Launcher](https://github.com/fardroid/Simple-LG-launcher) by fardroid | not checked | Inspiration for the weather widget. No code or assets are claimed to be taken from it. |
| [Glasshouse](https://github.com/rorygallagher2024/glasshouse) by Rory Gallagher | MIT (© 2026 Rory Gallagher) | The idea of the **Recent apps panel** (Back on the home screen, "Close all") and the TV services it calls. Licence text: `app/licenses/Glasshouse-MIT.txt`. |
| [webOS Brew / Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel) | MIT | The root access and `exec` service that every rooted feature runs on. Not bundled. |
| [Life's Good Without Spying](https://github.com/lewisdoesstuff/lifesgoodwithoutspying) by Lewis Wood | MIT (© 2026 Lewis Wood) | The privacy engine and block lists in `app/privacy/`. Slopium uses its own file names. Licence text: `app/licenses/LifesGood-MIT.txt`. |

## Bundled software and assets

| Component | Licence | Where |
|---|---|---|
| [Preact](https://preactjs.com) | MIT, © Jason Miller | compiled into `app/assets/app.js`; text in `app/licenses/preact-MIT.txt` |
| [Feather](https://feathericons.com) "settings" icon | MIT, © Cole Bemis | the cog on the Settings tile; text in `app/licenses/Feather-MIT.txt` |
| Typefaces: Inter, Poppins, Oswald, Roboto Mono, Cormorant Garamond, Outfit, Work Sans, Bricolage Grotesque, Big Shoulders, Jura, Tektur, JetBrains Mono, Lora, Poiret One, Pixelify Sans | SIL Open Font License 1.1, © their respective Project Authors | `app/assets/*.woff`, `*.woff2`; each licence text is in `app/licenses/*-OFL.txt` |
| Monochrome icon marks | CC0 (Simple Icons) / MIT (Custom Brand Icons, CleanFrame drawings) | `app/icons/marks/`; see `ICON-MARKS-NOTICE.txt` |
| Slopium logo and app icon | Provided by the project owner | `branding/`, `app/icon.png`, `app/largeIcon.png` |

The typeface files keep their original licences. They were converted/subset by upstream Hearth; they are redistributed under the OFL with their licence texts alongside.

## App and input icons (trademarks)

`app/icons/apps/` contains the icons of third-party TV apps and `app/icons/inputs/` contains input-type icons. They are trademarks or copyright of their respective owners. This project is not affiliated with, endorsed by or sponsored by any of them. They are included in good faith, only so the launcher can show recognisable tiles for apps and inputs that are already installed on the user's own TV. **Rights holders who would like an icon removed can open an issue and it will be removed.** Every tile falls back to a plain text tile without its icon.

"LG" and "webOS" are trademarks of LG Electronics. Netflix, YouTube, Disney+, Prime Video, Apple TV and other names are trademarks of their owners.

## Wallpapers and photographs

The built-in wallpapers (`app/assets/wallpapers.js`) and any pictures you load from a USB drive or the TV's storage are **not** covered by the MIT licence. They belong to their respective owners (or creators). They are included for convenience and personal use. If you own one and want it removed, please open an issue.

## Weather data

Weather data comes from [Open-Meteo](https://open-meteo.com) (free for non-commercial use, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). Slopium sends only the latitude and longitude of the chosen city (and any text typed into the city search) to Open-Meteo's forecast and geocoding APIs.
