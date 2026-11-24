# SOLMAR — Open-World Crime Game

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/bebek-gg/gta6-01-v6-rebuild/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/bebek-gg/gta6-01-v6-rebuild/reward.svg)](https://make.fun/bounty/gta6-01)

SOLMAR is an original open-world crime game in the spirit of GTA 6, built for the
[make.fun "Make GTA 6" bounty](https://make.fun/bounty/gta6-01). It runs offline in a
desktop browser from static files — no network requests, no build step.

You are **Marco**, a driver-for-hire in Solmar, a sun-soaked coastal city. Explore it on
foot or by car, steal cars, outrun the police, and work through three story missions:
a delivery run, a police escape, and a marina finale.

## How to play

Serve the `game/` folder with any static server, then open `index.html` in desktop Chrome:

```sh
cd game && python3 -m http.server 8080
```

## Controls

- **W A S D** — move / drive · **Shift** — run / handbrake
- **Mouse** — look (drag) · **E** — enter / exit car · **Space** — jump / brake
- **Left click** — punch / shoot pistol · **R** — reload · **P / Esc** — pause
- **M** — toggle music

## Features

- Open city: grid streets, beach, ocean, pier, traffic and pedestrians
- Wanted system with police cars and foot officers who chase, ram and arrest
- Three story missions with HUD objectives, markers and cash rewards
- Combat: melee plus a pistol pickup with ammo
- HUD with health, money, wanted stars, objective and a live canvas minimap
- Start screen, pause menu, save/load via localStorage
- Synthesised WebAudio sound effects and music — no audio files

## License

MIT — see `LICENSE`.
