# First personal release

The active implementation scope follows the user's latest instruction: one London System course, one calculating bot targeting 1000 strength, clean flat UI, imported skins, persistent local progress, and a launcher/update flow without the IDE. The broader requirements remain the future product direction; their full catalog, remote APIs, and multi-course launch content are deferred for this first release.

## Milestones

1. Course foundation: responsive UI, ten London lessons across four chapters, legal board interaction, checkpoint, review scheduling, skin selection, SQLite progress, and backups.
2. Runtime opponent: Stockfish browser worker, one approximately 1000-strength bot, arbitrary lesson starts, resume/undo/resign, and saved games.
3. Personal app: double-click launcher, shipped browser build, in-app update/restart, automated browser checks, and verified offline study/play after setup.

Milestone 1: course/rules checks and SQLite persistence/concurrency tests pass; production UI build succeeds. Runtime bot and standalone launch/update are the next milestones.

Milestone 2: real Stockfish WASM play passes browser checks for both colors, game resume, undo, lesson resume/completion, saved skins, and a 390px mobile viewport. The five course/engine unit checks and two storage tests also pass. Standalone launch/update is next.

Push each verified milestone to `main`. Source changes require Node to build; running a shipped build requires only Python 3.10+ and a current browser. Personal data lives in `.local/chessnite.sqlite3`, is ignored by Git, and survives app updates.

## Architectural boundaries

- `web/src`: React UI, chess.js legal rules, versioned course content, engine adapter, and persistence client.
- `app`: loopback-only host, versioned SQLite state with optimistic concurrency, local asset service, and update/launcher logic.
- `tools`: existing skin/sound importer, independent from the main app.
- `web/build`: tracked production build, so ordinary use and updates do not need npm or an IDE.
- `assets/skins`: portable imported packs; user progress is never committed.

This is a single-user local deployment, with browser engine calculations isolated off the UI thread. Course IDs, content versions, modular adapters, and persistence boundaries support adding courses or migrating to a hosted API later. The local server is not an authenticated public internet service.

The bot's 1000 label is an uncalibrated target. Engine candidate scoring and stochastic selection weaken actual calculated play; it does not follow a scripted response tree. An exact rating requires external calibration.
