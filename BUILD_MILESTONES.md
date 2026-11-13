# First personal release

The active implementation scope follows the user's latest instruction: one London System course, one calculating bot targeting 1000 strength, clean flat UI, imported skins, persistent local progress, and a launcher/update flow without the IDE. The broader requirements remain the future product direction; their full catalog, remote APIs, and multi-course launch content are deferred for this first release.

## Milestones

1. Course foundation: responsive UI, ten London lessons across four chapters, legal board interaction, checkpoint, review scheduling, skin selection, SQLite progress, and backups.
2. Runtime opponent: Stockfish browser worker, one approximately 1000-strength bot, arbitrary lesson starts, resume/undo/resign, and saved games.
3. Personal app: double-click launcher, shipped browser build, in-app update/restart, automated browser checks, and verified offline study/play after setup.

Milestone 1: course/rules checks and SQLite persistence/concurrency tests pass; production UI build succeeds. Runtime bot and standalone launch/update are the next milestones.

Milestone 2: real Stockfish WASM play passes browser checks for both colors, game resume, undo, lesson resume/completion, saved skins, and a 390px mobile viewport. The five course/engine unit checks and two storage tests also pass. Standalone launch/update is next.

Milestone 3: double-click launcher, in-app fast-forward update/restart, imported board textures, complete backups, shipped engine source/license notices, and offline browser verification. A real process restart was checked against unchanged SQLite state; a second launch reuses the running instance.

Final verification: 5 course/engine checks, 5 storage/updater checks, all 30 existing importer checks, and 12 browser scenarios passed. The browser scenarios include checkpoint pass vs assisted non-pass, full-game engine replies for both sides, offline London-position play, undo during thinking, backup restore, mobile layout, and persistent skins/progress. Desktop and mobile screens were inspected.

## Open and update the app

- Double-click `Open CHESSNITE.cmd`. It opens `http://127.0.0.1:8765` in your browser. The local service stays available until Windows closes or the process is stopped; opening the launcher again reuses it.
- No IDE, npm install, or development server is needed to use this checkout's shipped build. Python 3.10+ and a current browser are required. Internet is not needed for lessons, skins, or the bundled bot.
- Use **Settings → App updates → Update from GitHub**. If an update is downloaded, choose **Restart to finish**. Git and an internet connection are needed for this action. Updates only fast-forward `main` from the configured repository and refuse to overwrite tracked source edits.
- Progress lives in `.local/chessnite.sqlite3`, separate from tracked source. Export/restore backups from Settings. An unfinished lesson and the current game resume automatically. Changes from stale browser tabs are rejected rather than overwriting newer data.
- Import more skins with the existing `Open Skin Importer.cmd`, then reload CHESSNITE's Appearance page to pick them. Board image framing can be adjusted with Trim outer frame. The localhost address is for this computer, not public hosting or multi-device sync.
- To develop: `npm.cmd ci`, `npm.cmd run build`, `python app/server.py`. Run `npm.cmd test`, `python -m unittest discover -s app/tests -v`, and `npm.cmd run test:browser` for the app checks. Browser tests use a separate database and a system Chrome installation on this machine; other environments can use Playwright's installed Chromium.

Launch limitations: one authored White-side course, one uncalibrated 1000-target bot, untimed practice, local single-user data, and local-only access. Live puzzle/explorer integrations, multi-course catalogs, cloud accounts, and full repertoire authoring remain on the broader roadmap. The starter checkpoint currently tests move recall across 11 decisions; richer strategic-question checkpoints remain future curriculum work.

Push each verified milestone to `main`. Source changes require Node to build; running a shipped build requires only Python 3.10+ and a current browser. Personal data lives in `.local/chessnite.sqlite3`, is ignored by Git, and survives app updates.

## Architectural boundaries

Interaction refinement milestone: inspected the supplied 64.9-second reference video. Added 190 ms click glides, pointer-captured drag ghosts/direct drops, 140 ms illegal-drop return, capture/castling/promotion handling, 1–1.6 second bot response pacing, and separately delayed lesson replies. Seven unit checks and sixteen browser scenarios passed, including drag/click behavior and measured bot delay. The reference is local and is not committed.

Interface refinement milestone: dark background by default with a saved light alternative; larger controls/type, icon navigation and game actions, fewer repeated descriptions, expandable lesson notes, and a primary board-set dropdown showing every imported set. Choosing pieces selects the matching imported board; flat colors remain optional entries in that dropdown. Sound uses cached decoding, a louder default level with gain/limiting, a volume slider and an explicit preview. Saved progress and games are unchanged. Eight unit checks, five backend checks, thirty importer checks and twenty browser scenarios passed, including actual audio decode/gain/mute, keyboard/touch input, board matching, and theme/volume persistence. Dark desktop screens were inspected.

- `web/src`: React UI, chess.js legal rules, versioned course content, engine adapter, and persistence client.
- `app`: loopback-only host, versioned SQLite state with optimistic concurrency, local asset service, and update/launcher logic.
- `tools`: existing skin/sound importer, independent from the main app.
- `web/build`: tracked production build, so ordinary use and updates do not need npm or an IDE.
- `assets/skins`: portable imported packs; user progress is never committed.

This is a single-user local deployment, with browser engine calculations isolated off the UI thread. Course IDs, content versions, modular adapters, and persistence boundaries support adding courses or migrating to a hosted API later. The local server is not an authenticated public internet service.

The bot's 1000 label is an uncalibrated target. Engine candidate scoring and stochastic selection weaken actual calculated play; it does not follow a scripted response tree. An exact rating requires external calibration.
