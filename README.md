<p align="center"><img src="branding/SLOPIUM_Logo.png" alt="Slopium logo" width="180"></p>

# Slopium: a calm, customisable home screen for LG webOS TVs

**Slopium** replaces the busy LG home screen with something quiet: a **clock and weather card**, **your apps and TV inputs in one row**, a **Recent apps panel** with "Close all", and a background that is plain black, a picture, or a slideshow (built-in wallpapers or your own pictures from a USB drive). It is a normal webOS app, made for TVs that run webOS, and tuned to stay light on the TV's modest hardware.

> **Slopium is a personal, open-source hobby project. Use it at your own risk.** Many features need a **rooted TV** (Homebrew Channel) and run commands with **root privileges**. Please read the [DISCLAIMER](DISCLAIMER.md) before installing. Slopium is not affiliated with LG Electronics or any streaming service.

Slopium is built on **[Hearth](https://github.com/rudra-avatar/Hearth)** by rudra-avatar (MIT) but is its own project with its own app ID, so it installs next to Hearth. See [Credits](#credits).

<p align="center"><img src="docs/screenshots/home.jpg" alt="Slopium home screen" width="720"><br><sub>Home screen (the weather values in this screenshot are sample data).</sub></p>

## What it does

- **Clock and weather card.** Fourteen clock styles (below), sixteen typefaces, size, thickness from Thin to Black (it thickens the whole clock: digits, hands, rings, dots and bars), colour and accent themes (including themes that follow the wallpaper), 12 / 24-hour. The weather card shows the current conditions, an hourly curve and a 7-day forecast from [Open-Meteo](https://open-meteo.com) (no account needed).
- **Your apps and inputs in one row.** Choose what is shown, re-order, hide, rename and pick icons (including a clean monochrome "marks" icon pack), or use your own picture. Hold OK on an app for its menu.
- **Recent apps panel.** Press **Back** on the home screen to see the apps still running in memory. **OK** opens one, **hold OK** closes just that one, and **Close all** (top right) closes them all. Its width and height are adjustable in Settings. *(Needs a rooted TV.)*
- **Wallpaper.** Black, one picture, or a slideshow from the built-in wallpapers or a folder on a USB drive / the TV's storage. Shuffle remembers its order and place across restarts, so every picture plays once before any repeats.
- **Quiet mode.** After a while without a key press the icon row hides and only the clock and weather card remain. To protect the screen from burn-in they change position: *fade out and reappear* (default), *glide*, *jump* or off, on a fixed timetable (first move after 5 seconds, then every 20 seconds), with wallpaper changes timed so they never land on a move. Press any key to return instantly. Optional **OLED pixel shift** too.
- **Made to be light.** The home screen draws from saved data first; clocks redraw once a minute; unchanged tiles are not redrawn; nothing animates when you return from quiet mode.

<p align="center"><img src="docs/screenshots/recents.jpg" alt="Recent apps panel" width="720"><br><sub>Recent apps panel (Back on the home screen). App icons appear on a real TV; this capture was made without a TV.</sub></p>

### Clock styles

Plain, Frosted card, Stacked, Digital LED, Dot matrix, Nixie tubes, Analogue dial, Flip clock, Calendar page, Sun arc, Day timeline, Words, Binary dots and Progress rings. They all follow the clock theme, accent colour, font, thickness and the date / AM-PM switches in **Settings → Clock**. (The Sun arc assumes sunrise at 06:00 and sunset at 18:00; it is a day-progress display, not an astronomical one.)

<p align="center"><img src="docs/screenshots/clock-styles.jpg" alt="The fourteen clock styles" width="840"></p>

## Requirements

- An LG TV running **webOS** (this is not an Android TV app).
- **Rooted TV with the [Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel)** for the full feature set: live app list with real icons, the Recent apps panel, closing/uninstalling apps, USB / storage browsing for wallpapers and icons, adding Slopium as a TV input, and a few TV-setting switches. These run through the Homebrew Channel's command service.
- Without root, Slopium is designed to fall back to its core: home screen, clock, weather, themes and launching the built-in list of common apps, with the root-only options greyed out. *This fallback is inherited from Hearth and has not been verified on a non-rooted TV by this project.*
- Slopium was developed and tried by its maintainer on their own TV. Behaviour on other models and firmware versions may differ; please report what you find.

## Install

### Option 1: through the Homebrew Channel (recommended, gets you updates)

1. Open the **Homebrew Channel** on the TV and go to **Settings**.
2. Choose **Add repository** and type:

   ```
   https://raw.githubusercontent.com/z3d6380/slopium/main/repo/apps.json
   ```

   (Typing with the remote is slow. From a computer on the same network you can send it over SSH instead: `ares-launch org.webosbrew.hbchannel -p '{"launchMode":"addRepository","url":"https://raw.githubusercontent.com/z3d6380/slopium/main/repo/apps.json"}'`)
3. Go back to the app list, open **Slopium** and choose **Install**. When a new version is released, the Homebrew Channel shows an **Update** button.

### Option 2: install the `.ipk` yourself

Download `io.github.batmanrises.slopium_<version>_all.ipk` from the [Releases](https://github.com/z3d6380/slopium/releases) page (or build it, see [Build](#build)) and install it with **[webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop)**, **or** over SSH on a rooted TV:

```sh
scp -O io.github.batmanrises.slopium_1.0.1_all.ipk root@TV_IP:/tmp/
ssh root@TV_IP
luna-send -i luna://com.webos.appInstallService/dev/install '{"id":"com.ares.defaultName","ipkUrl":"/tmp/io.github.batmanrises.slopium_1.0.1_all.ipk","subscribe":true}'
luna-send -n 1 luna://com.webos.applicationManager/launch '{"id":"io.github.batmanrises.slopium"}'
```

Installing a newer version over an older one keeps your settings.

### Slopium next to Hearth (or an older custom build)

Slopium has its **own app ID** (`io.github.batmanrises.slopium`) and its own settings, files and processes, so it installs **alongside** Hearth and does not replace it. Everything Slopium stores or writes (its settings, the helper files and logs it keeps in `/tmp`, the start-up link for "replace LG Home", the processes it looks for) uses Slopium-only names, so it should not interfere with Hearth. Slopium lists Hearth as an ordinary app. Settings from Hearth or from older `tld.my.customlauncher` builds are **not** carried over.

One thing to keep in mind: both launchers can offer **"replace LG Home"** (Options), so **turn it on in only one launcher at a time**. On webOS 11, Slopium mounts itself in LG Home's place and asks the TV to reread that app; LG's files stay on disk and the switch puts them back. On a TV that cannot reread Home, it uses the older handover helper. The same goes for registering as a TV input: each launcher adds its own entry, so remove the one you no longer use from the input list.

## Using it

| Where | Key | Does |
|---|---|---|
| Home | ← → | Move along the row |
| Home | OK | Open the app. The last tiles are LG Home, System and Slopium Settings |
| Home | hold OK | The app's menu: move it, hide it, uninstall it |
| Home | **Back** | Open the **Recent apps** panel |
| Recent apps | ← → / OK / hold OK / ↑ | Choose / open / close that app / jump to **Close all** |
| Settings | ← → on the tab bar | Apps, Sources, Look, Clock, Weather, Wallpaper, Options |
| Settings | OK, or ← → | OK steps through choices; ← → nudge numbers |
| System | ← → on the tab bar | Picture, Sound, Network, General, Support |
| System | OK, or ← → | OK toggles a switch or steps a choice; ← → changes the value |
| System | Back | Close System and return to the home row |
| Anywhere else | Back | Go back one screen |

Useful settings: **Look** has the Recent apps panel width and height and the quiet-mode movement choice; **Clock** has the clock style, thickness, theme and accent; **Wallpaper** has the picture or slideshow, interval and shuffle.

**System** (the TV tile on the home row) is Slopium's own picture, sound, network and general pages. It uses the same type, tabs and rows as Settings, and it follows the theme and the settings-background slider. Channels, accounts and the rest of the TV's menu stay one row away, under Support → LG settings.

**Status** (Settings → Status) is a quiet row on the home screen: the network icon, processor, memory in use, and free app storage. Each reading can be turned off, and the row can be resized and moved like the clock. It hides while the screen is resting, unless Keep while resting is on. The network name stays off until you turn it on. The row does not turn Wi-Fi on or off.

**Privacy** (Settings → Options → Privacy) is the Life's Good Without Spying switches, drawn as Slopium rows: host blocks, voice and ad services, the DNS filter, IPv6, and the NTP clock. The firmware switch also stops the update service early. Apply writes those switches, then says Applied and stays idle until a switch changes. A boot script puts the same apply back after a restart. If AmazOff is installed, Apply keeps Prime's artwork line in the hosts file.

**Memory** (Settings → Options → Memory) chooses which apps may stay loaded when you have not opened them. Off, the usual choice, unloads an app the TV started on its own and leaves it unloaded until the next time you open it. An app you opened and left by going Home stays either way.

### Settings a fresh install starts with

A new install (no saved settings yet) opens with this look. Everything can be changed in Settings, and an existing install keeps its own settings.

| Tab | Starting values |
|---|---|
| Sources | none ticked |
| Look | Theme Transparent, settings background 40%, quiet mode after 30 s, clock and weather **glide** across the screen, wallpaper changes during quiet mode on (every 20 s), OLED shift on, Recent apps panel 75% wide and 40% tall |
| Icons | Clean marks, size 80%, opacity 100%, rounded square tiles, app names shown, 1 row, side margin 300 px, bottom margin 200 px, spacing 56 px, box colour Violet, title colour matches the icon box, theme Transparent, accent Match the wallpaper, icon colours Clean mark (white silhouette) |
| Clock | Binary dots, theme and accent Match the wallpaper, size 140, font Tektur, thickness Extra bold, white, 100% opacity, position 26% down and 32% across, date and AM/PM shown, frosted glass off, card tint Auto |
| Weather | On, Singapore, Celsius, city name and high/low shown, Weather card (Full: curve and 7 days), card theme and accent Match the wallpaper, graph line Match the theme, dots black, size 70%, position 68% across and 20% down |
| Wallpaper | Built-in wallpapers slideshow every 30 s, shuffle on, opacity 60%, bottom fade 95% dark and 55% high with the smooth and gradual style in black; clock/weather card and icon box/text sync to the wallpaper on, icon frames sync off |
| Options | Live app list via Homebrew Channel on, Close LG Home when the app opens on |

The "Show the LG logo when the TV starts" switch is not a Slopium setting. It is a switch inside the TV itself, so Slopium leaves it alone until you change it in Options.

## Weather and privacy

Weather comes from [Open-Meteo](https://open-meteo.com). The only things sent are the latitude and longitude of the city you picked and any text you type in the city search. Slopium has **no advertising, analytics or telemetry**. If the TV's web view cannot make a secure connection, the fetch can fall back to the TV's own `curl` / `wget`, and the last-resort attempts skip the certificate check; this is only used for public weather numbers.

## Build

Needs only `bash`, `tar` (GNU), `gzip`, `wc`, `sed`, `du` and `date`, all of which come with Git Bash on Windows. No Node, npm or `ar` tool.

```sh
./tools/build-ipk.sh      # writes build/io.github.batmanrises.slopium_<version>_all.ipk
./tools/make-manifest.sh  # writes the Homebrew Channel manifest next to it (used for releases)
```

The app lives in [`app/`](app/). **Note:** `app/assets/app.js` is a single bundled, minified file. Slopium is a modified build of Hearth's bundle, and this repository does not contain a separate TypeScript source tree. See [docs/SOURCE-NOTES.md](docs/SOURCE-NOTES.md) for what that means and where to find Hearth's readable source.

## Updating and releasing

Maintainer notes for publishing a new version (tag, release, Homebrew Channel update) are in [docs/RELEASING.md](docs/RELEASING.md).

## Credits

Slopium would not exist without the work of others. Full licence details are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and, for the installed app, in `app/licenses/`.

- **[Hearth](https://github.com/rudra-avatar/Hearth)** by rudra-avatar (MIT): the **original base build** that Slopium is modified from, including its home screen, settings, wallpapers, weather, edit name/icon, quiet mode and OLED shift. Hearth is in turn a fork of **[partridgeworks/webos-launcher](https://github.com/partridgeworks/webos-launcher)** (MIT). Their copyright notices are kept in [LICENSE](LICENSE).
- **[CleanFrame (webOS)](https://github.com/TheLord83/CleanFrame-webos)** (MIT; upstream [nthnclrk/CleanFrame](https://github.com/nthnclrk/CleanFrame)): the idea of clean monochrome icons, and the icon marks in `app/icons/marks/`.
- **[Simple LG Launcher](https://github.com/fardroid/Simple-LG-launcher)** by fardroid: the inspiration for the weather widget.
- **[Glasshouse](https://github.com/rorygallagher2024/glasshouse)** by Rory Gallagher (MIT): the idea and the TV services behind the Recent apps panel.
- **[Open-Meteo](https://open-meteo.com)**: weather data (CC BY 4.0).
- **[webOS Brew / Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel)**: the root access everything rooted runs on.
- **Preact**, **Feather icons**, **Simple Icons** and the bundled **typefaces** (SIL OFL 1.1): see the notices file.
- Slopium's changes to Hearth were developed with AI assistance (Claude by Anthropic) and tried by the maintainer on a real TV. This is a credit, not an endorsement by Anthropic.

## Licence and disclaimer

Slopium's own code is released under the **MIT licence** ([LICENSE](LICENSE)). Wallpapers, app icons, logos, brand marks, photographs and other third-party material **belong to their respective owners** and are not covered by it.

Slopium is **for personal use**. It is provided **"as is"** with **no warranty**. Using root privileges on a TV can void its warranty or cause problems, and **the authors and contributors are not liable for any damage to your TV or anything else**. Read the full [DISCLAIMER](DISCLAIMER.md).

LG and webOS are trademarks of LG Electronics. All other names and logos are trademarks of their owners.
