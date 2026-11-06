# Changelog

## Unreleased

- **System opens in Slopium.** The System tile on the home row used to launch the TV's own settings app. It now opens Picture, Sound, Network, General and Support in the same type, tabs and rows as Slopium Settings. Left and right change a value, OK toggles a switch, and Back returns to the home row. Support still has a row that opens the TV's own menu for channels, accounts and the rest. Processor, memory and storage readouts are not part of this change.
- **Status row.** Settings → Status shows a quiet row on the home screen: a network icon, processor, memory in use, and free space on the TV's app storage. Each one can be turned off. Size and position work like the clock. The row hides while the screen is resting, and it does not turn Wi-Fi on or off. The network name is off until it is switched on.

## 1.0.2: Home button and saved layout

- **The Home button opens Slopium directly on webOS TVs whose Home app is Flutter** (this includes webOS 11). Slopium is mounted in Home's place and the app manager is asked to reread that one app. LG's own Home files stay underneath, and Restore puts them back. The older watcher remains the fallback when a TV cannot reread Home.
- **One saved layout for the Slopium tile and the Home button.** Settings are also written to `/var/lib/webosbrew/slopium-config.json`. A failed or empty read no longer replaces a saved layout with the built-in defaults (Singapore, the default theme, 12-hour clock).
- `tools/wifi-recover.sh` is an optional boot script for a TV whose Wi-Fi stays down until it is toggled. It is not run by the app. It turns Wi-Fi off and on once only when Wi-Fi is still down after boot, and it leaves Ethernet and an already-connected network alone.

## 1.0.1: install fix

- **Fixed "-5: Failed to extract package" on some TVs** (reported on webOS 5.5). The package is now written in exactly the layout that ares-package produces: plain ustar tar archives with short, `usr/...` file names, and ar members without a trailing slash. Version 1.0.0 contained two icon paths that were 101 characters long, which made the packager write GNU "long name" records that older webOS installers cannot read.
- `tools/build-ipk.sh` no longer needs the `ar` tool, so it also runs in Git Bash on Windows, and it stops with an error instead of writing a package that older TVs cannot read.

## 1.0.0: first public release as Slopium

> Version numbering starts again at 1.0.0 because Slopium is a new app with its own ID. The 2.x numbers belonged to earlier private builds under the old `tld.my.customlauncher` ID.

The launcher is renamed **Slopium** and published as its own open-source project. It is a modified version of [Hearth](https://github.com/rudra-avatar/Hearth) (MIT); see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

- New name, logo and app icon; all in-app mentions of the old name replaced.
- **Its own app ID, `io.github.batmanrises.slopium`**, so it installs next to Hearth instead of replacing it. Settings from older `tld.my.customlauncher` builds are not carried over.
- Everything that used a shared name is now unique to Slopium: stored settings, the "replace LG Home" helper files and their start-up link, log and marker files in `/tmp`, and the process patterns used to find and stop them.
- **Update path:** a Homebrew Channel repository (`repo/apps.json`) and a GitHub Actions workflow that publishes the `.ipk` and its manifest for every tagged release.
- New fresh-install defaults for Look, Icons, Clock, Weather, Wallpaper and Options (listed in the README).
- Added the licence, credits and disclaimer files (`LICENSE`, `THIRD_PARTY_NOTICES.md`, `DISCLAIMER.md`, `app/licenses/NOTICE.txt`) and a repository layout with build scripts.

### Changes made to the Hearth base before this release

- **Recent apps panel**: Back on the home screen opens a bottom panel of the apps in memory, with "Close all"; adjustable width and height. Closing responds on the first press: the cards leave the panel at once, the apps are stopped together, and the TV's recent list is cleaned up once they have quit.
- **Quiet mode**: fixed timetable (first move after 5 s, then every 20 s; wallpaper changes timed to never coincide); movement style choice (fade out and reappear, glide, jump, off); instant return with no row animation; reliable reset to the default state after the screensaver.
- **Clock**: 14 styles (new: Dot matrix, Nixie tubes, Calendar page, Sun arc, Day timeline; Pill and Neon glow folded into Frosted card and the Neon theme); thickness now applies to the whole clock, with Extra bold and Black steps.
- **Weather**: the "Today" icon now agrees with the current conditions.
- **Wallpaper**: shuffle remembers its order and place across restarts and no longer repeats the previous round's order.
- **Glass and themes**: the card tint is picked from the card's default position, not from where quiet mode has moved it.
- **Performance**: removed leftover code and animations that cost time on weak TV hardware.
