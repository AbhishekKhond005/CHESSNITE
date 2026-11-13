# CHESSNITE — Product Requirements and Development Plan

Version: 1.6  
Created: 2026-11-13  
Last updated: 2026-11-13  
Status: First personal application release and standalone skin/sound importer implemented on explicit request. Broader platform features remain planned.  
Purpose: A living specification that can be expanded as new requirements are requested.

## 1. Product vision

Build a chess platform inspired by the convenience of Chess.com, centered on a personal opening compendium. Users should be able to discover openings, understand their ideas, organize their own variations, replay notation on a board, practice from any position, and play real engine-driven opponents with customizable visuals.

Include a guided learning roadmap inspired by the approachable progression of Duolingo and chess learning platforms: clear levels, short interactive lessons, checkpoints, scheduled review, and a useful next step. The personal compendium and guided curriculum must work together.

The defining workflow is:

**Find an opening → understand its plans → save and organize lines → rehearse them → play a bot from that position → save discoveries back into the compendium.**

Use original branding, interface design, and licensed or original assets. Chess.com is a functional reference; its daily puzzle is accessed through the documented API with attribution. Do not copy its interface, lessons, or artwork.

## 2. Scope and terminology

### The four required pillars

| Pillar | Required outcome |
| --- | --- |
| Opening compendium | Searchable learning material and editable, branching lines for named openings; personal organization is a first-class feature. |
| Notation-to-board system | Enter or import move notation and generate a playable, navigable reconstruction of the game or line. |
| Skin system | Choose board themes, piece sets, and interface appearance, with persistent preferences and previews. |
| Dynamic bots | Play opponents that calculate moves from the current position, with configurable strength and training behavior. |

### Boundaries and assumptions

- Initial chess variant: standard chess. Variants such as Chess960 are future extensions.
- Initial audience: an individual studying and managing their own repertoire. Private personal data is the default.
- Delivery target: a responsive web experience for desktop and mobile browsers. Final stack and hosting choices remain open.
- Existing Java project files do not commit the platform to a Java-only architecture.
- A usable first release includes all four pillars plus a guided learning path through the reviewed starter opening curriculum. Later phases expand the curriculum, personalization, and optional social features.
- Human matchmaking, tournaments, chat, payments, and a public social feed are outside the initial release.
- No subscriptions or paid cosmetic economy are assumed. Required external data integrations are Chess.com's daily puzzle and Lichess opening data. Lichess API authentication is required for live explorer access; this is separate from introducing CHESSNITE user accounts.
- “All openings and their lines” means broad coverage of named standard openings, with an expandable collection of documented variations. It does not mean enumerating every legal continuation: opening theory evolves and branches indefinitely.
- “Generate games from notation” means reconstruct supplied moves. Automatically inventing a continuation is a separate, explicitly selected engine feature.
- “Not hardcoded bots” means runtime calculation from arbitrary legal positions. An optional opening repertoire can guide early choices but cannot be the bot's only move source.

### Priority labels

The current first build follows the user's narrowed release scope below; the broader P0/P1 catalog in this document describes the future platform and is not a claim that every listed feature is already implemented.

### Current personal release — implemented scope

- One White-side London System course: ten interactive lessons, four chapters, key reply branches, move recall, an eleven-decision checkpoint, and spaced reviews.
- One runtime Stockfish-based bot, Robin, with an approximate 1000-strength target; untimed play, either color, lesson-position starts, undo, resign, PGN export, and saved games. Strength has not been externally calibrated.
- Clean responsive UI; imported piece packs, flat board palettes, imported board textures with frame adjustment, and local sound cues.
- SQLite session/progress storage, exact unfinished-lesson/game resume, local backups, and conflict protection against stale browser tabs.
- `Open CHESSNITE.cmd` opens a local browser app without the IDE. The shipped production build requires Python and a browser to run; npm is needed for source development only.
- Settings provides explicit GitHub update and restart actions. Updates fast-forward the configured repository and preserve ignored local data; tracked source edits must be committed before updating.
- The local URL is `http://127.0.0.1:8765` while the launcher service is running. This release is for one computer; it is not a public hosted or synchronized multi-device app.
- Live daily puzzles/explorer enrichment, other courses, broader strategic assessments, and personal repertoire authoring remain future work. See `BUILD_MILESTONES.md` for actual shipped milestones and checks.

### Platform priority labels

- **P0:** Required for the first usable release.
- **P1:** Next-stage functionality that improves learning and daily use.
- **P2:** Optional expansion after the core product is reliable.

Requirement IDs are permanent. Future edits should preserve IDs and record changes in section 18.

## 3. Main user journeys

1. **Create a repertoire:** Create “White repertoire,” find the Italian Game, save a starter line, add branches for Black's replies, annotate plans, and mark the line for practice.
2. **Convert notation into a study:** Paste `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6`, preview the board, step through each move, add an alternative continuation, and save it under the Ruy Lopez.
3. **Practice a weak variation:** Open a saved Sicilian line, choose “Practice as White,” recall moves without visible answers, receive feedback, and schedule another review.
4. **Play from an opening:** Select a position in a saved line, choose a bot and side, play beyond the memorized moves, and attach useful continuations to the study.
5. **Personalize the workspace:** Preview a board and piece combination, save it as a preset, and use it consistently in study, replay, and play screens.
6. **Solve today's puzzle:** Open the Chess.com daily puzzle from Home, solve it without seeing the solution, review it, and retain the local attempt record.
7. **Start with a prepared opening collection:** Browse the selected White and Black opening packs, fetch Lichess continuations, and copy useful lines into a personal repertoire.
8. **Follow a learning roadmap:** Choose an experience level and preferred side, see the recommended next lesson on a visual path, complete a short lesson and recall drill, pass a checkpoint, and return for scheduled review. Open the associated study or play its position against a bot at any point.

## 4. Opening compendium and learning material

| ID | Priority | Requirement |
| --- | --- | --- |
| OPEN-001 | P0 | Provide a catalog of named openings and variations, including names, aliases, ECO codes where applicable, defining moves, and starting positions. |
| OPEN-002 | P0 | Browse by opening family, first moves, side, and tags; search by name, ECO code, move sequence, or current position. |
| OPEN-003 | P0 | Each published learning page includes an overview, annotated main line, important branches, plans for both sides, common mistakes, and a concise takeaway. |
| OPEN-004 | P0 | Organize personal material as repertoires or collections → opening studies → branching lines, with folders, tags, favorites, and custom ordering. |
| OPEN-005 | P0 | Add, rename, duplicate, move, archive, restore, and delete personal studies and lines. Protect destructive actions with undo or confirmation as appropriate. |
| OPEN-006 | P0 | Edit variations on the board or through notation; promote a branch to the main line and attach notes to a position or move. |
| OPEN-007 | P0 | Store comments, move-quality annotations, arrows, square highlights, source links, and personal explanations with a line. |
| OPEN-008 | P0 | Support both White and Black repertoires, including the opponent's alternatives rather than only one memorized sequence. |
| OPEN-009 | P0 | Show whether material is a catalog reference, a personal copy, or an engine suggestion. Catalog updates must not silently overwrite personal edits. |
| OPEN-010 | P1 | Recognize transpositions and link studies that reach equivalent positions through different move orders. Preserve each move order and its annotations. |
| OPEN-011 | P1 | Add illustrative games, typical pawn structures, tactical themes, and endgame transitions to learning pages. |
| OPEN-012 | P1 | Show repertoire gaps: opponent replies without a prepared response, unfinished notes, and lines awaiting review. |
| OPEN-013 | P1 | Compare two lines or repertoire versions, highlighting the first divergence. |
| OPEN-014 | P0 | Offer Lichess-backed opening continuations for the selected starter packs, with move frequencies, game outcomes, query filters, and sample sizes. Broader arbitrary-position exploration is P1. |
| OPEN-015 | P0 | Include the 15 White and 15 Black opening selections below, with source-backed names, defining lines, and linked variations fetched from Lichess data and its Opening Explorer API. |
| OPEN-016 | P0 | Fetch and cache opening continuations through the Lichess integration in section 4.2; provide refresh status and preserve personal edits during updates. |
| OPEN-017 | P0 | Keep selected opening packs browsable and their cached lines replayable when the API is offline or authentication is unavailable; show which enrichment is missing. |

### Content coverage and sourcing

- Use a pinned version of the [Lichess opening dataset](https://github.com/lichess-org/chess-openings) as the required catalog seed, supplemented by the Opening Explorer API. It supplies opening identifiers and moves, not a complete teaching curriculum.
- Publish a coverage manifest recording dataset version, import date, valid and rejected records, and counts by opening family and ECO group.
- Separate **catalog coverage** from **learning-content coverage**. A catalog entry without reviewed explanations must say “Reference entry — lesson pending.”
- Cover all ECO groups A–E in the catalog roadmap. Define the actual supported catalog by a pinned dataset snapshot, not an unsupported claim of universal completeness.
- First release: searchable valid catalog records and all 30 selected opening-pack entries below, plus at least 12 reviewed starter studies. Review Italian, Ruy Lopez, Scotch, Queen's Gambit, London, English, Sicilian, French, Caro-Kann, Queen's Gambit Declined, King's Indian, and Nimzo-Indian first. Clearly mark remaining imported entries as awaiting instructional review.
- Each starter study should have an annotated main line, at least three relevant branches, plans for both sides, and at least one common mistake with an explanation.
- Keep catalog-only entries usable: users can replay the defining line and immediately create their own study.
- Track author, source, review status, and last-reviewed date for educational content. Do not import third-party lessons without appropriate rights.
- Review generated explanations before publishing them as instructional material. Engine evaluations support analysis but do not automatically explain strategic ideas.
- Content expansion is an ongoing workstream alongside software development, not a prerequisite to documenting every opening before release.

### 4.1. Selected opening packs — 15 for each side

These are curated study priorities based on established theory, usefulness in a broad repertoire, and variety of positions. They are not claimed to be the statistically most played or objectively strongest openings. The sequence below is an organizing order, not a live popularity ranking. Popularity statistics must always identify their database and filters.

“White opening” and “Black defense” indicate the learner's perspective: both players contribute to every opening. Shared positions and related families should link to the same catalog references without losing side-specific study notes. Seed moves identify the starting family; they are not the entire lesson. Match them to the pinned Lichess catalog during implementation and retain aliases when upstream names differ.

#### White opening pack

| ID | Opening / system | Seed moves (SAN) | Initial variation targets |
| --- | --- | --- | --- |
| W01 | Italian Game | `1. e4 e5 2. Nf3 Nc6 3. Bc4` | Giuoco Piano, Two Knights Defense, Evans Gambit. |
| W02 | Ruy Lopez | `1. e4 e5 2. Nf3 Nc6 3. Bb5` | Morphy Defense, Berlin Defense, Exchange Variation. |
| W03 | Scotch Game | `1. e4 e5 2. Nf3 Nc6 3. d4` | Classical Variation, Mieses Variation, Scotch Gambit. |
| W04 | Four Knights Game | `1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6` | Spanish Four Knights, Scotch Four Knights, Italian Four Knights. |
| W05 | Vienna Game | `1. e4 e5 2. Nc3` | Vienna Gambit, `2...Nf6` branches, `2...Nc6` branches. |
| W06 | King's Gambit | `1. e4 e5 2. f4` | Accepted, Declined, Falkbeer Countergambit. |
| W07 | Queen's Gambit | `1. d4 d5 2. c4` | Accepted, Declined, Slav Defense. |
| W08 | London System | `1. d4 d5 2. Nf3 Nf6 3. Bf4` | `...e6` setups, `...c5` pressure, King's Indian setups via alternate move orders. |
| W09 | Catalan Opening | `1. d4 Nf6 2. c4 e6 3. g3 d5 4. Bg2` | Open Catalan, Closed Catalan, early `...Bb4+` lines. |
| W10 | English Opening | `1. c4` | Symmetrical English, Reversed Sicilian, Anglo-Indian setups. |
| W11 | Reti Opening | `1. Nf3 d5 2. c4` | `2...d4`, `2...e6`, `2...c6`, including transpositions. |
| W12 | King's Indian Attack | `1. Nf3 d5 2. g3 Nf6 3. Bg2` | French-type structures, Sicilian-type structures, `...d5/...c5` setups via appropriate move orders. |
| W13 | Trompowsky Attack | `1. d4 Nf6 2. Bg5` | `2...Ne4`, `2...e6`, `2...d5`. |
| W14 | Colle System | `1. d4 d5 2. Nf3 Nf6 3. e3` | Colle-Koltanowski, Colle-Zukertort, early `...Bf5` responses. |
| W15 | Bird Opening | `1. f4` | Classical `...d5` setups, From's Gambit, `...Nf6/...g6` setups. |

#### Black defense pack

| ID | Opening / defense | Seed moves (SAN) | Initial variation targets |
| --- | --- | --- | --- |
| B01 | Sicilian Defense | `1. e4 c5` | Najdorf, Dragon, Classical, Sveshnikov, Alapin, Closed Sicilian. |
| B02 | French Defense | `1. e4 e6 2. d4 d5` | Advance, Exchange, Tarrasch, Winawer, Classical. |
| B03 | Caro-Kann Defense | `1. e4 c6 2. d4 d5` | Advance, Exchange, Classical, Panov-Botvinnik Attack. |
| B04 | Scandinavian Defense | `1. e4 d5` | `2. exd5 Qxd5 3. Nc3 Qa5`, `3...Qd6`, `2...Nf6`. |
| B05 | Pirc Defense | `1. e4 d6 2. d4 Nf6 3. Nc3 g6` | Austrian Attack, Classical, `Be3/Qd2` setups. |
| B06 | Modern Defense | `1. e4 g6 2. d4 Bg7` | `...d6` setups, early `...c5` setups, Pirc transpositions. |
| B07 | Alekhine Defense | `1. e4 Nf6` | Four Pawns Attack, Exchange Variation, Modern Variation. |
| B08 | Petrov Defense | `1. e4 e5 2. Nf3 Nf6` | Classical `3. Nxe5`, Steinitz `3. d4`, Three Knights `3. Nc3`. |
| B09 | Philidor Defense | `1. e4 e5 2. Nf3 d6` | Hanham setups, Exchange Variation, Antoshin Variation. |
| B10 | Queen's Gambit Declined | `1. d4 d5 2. c4 e6` | Orthodox, Tartakower, Exchange Variation. |
| B11 | Slav Defense | `1. d4 d5 2. c4 c6` | Accepted Slav, Exchange Slav, quiet `e3` setups. |
| B12 | Semi-Slav Defense | `1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 e6` | Meran, Anti-Meran, Botvinnik Variation. |
| B13 | King's Indian Defense | `1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6` | Classical, Samisch, Fianchetto, Four Pawns Attack. |
| B14 | Nimzo-Indian Defense | `1. d4 Nf6 2. c4 e6 3. Nc3 Bb4` | Rubinstein `4. e3`, Classical `4. Qc2`, Samisch `4. a3`. |
| B15 | Grunfeld Defense | `1. d4 Nf6 2. c4 g6 3. Nc3 d5` | Exchange Variation, Russian System, Fianchetto Variation. |

Variation targets may require a branch before the displayed seed ends; for example, a Fianchetto system can replace `Nc3/e4`. Store the correct full move order for each branch rather than appending every target to one seed. Retain named targets even when their popularity is low. These packs are a starting library, not complete White or Black repertoires against every possible opposing move.

### 4.2. Lichess opening-data integration

Use the catalog dataset for names and defining lines, and the live API for position-specific continuations and statistics. The API does not provide an entire authored opening course or a single “top 15 openings” download. Teaching explanations remain a separate reviewed content layer.

- Current official endpoints: `GET https://explorer.lichess.org/masters` and `GET https://explorer.lichess.org/lichess`. Use the Masters database by default for the curated pack; offer a clearly labeled Lichess-player database toggle.
- Query using `fen` and/or comma-separated UCI moves in `play`. Convert validated SAN seeds to UCI with the shared chess core. Store each query's database, filters, retrieval time, and source position with its results.
- Preserve returned move notation, White/draw/Black game counts, opening identification when present, and example-game references. Percentages use the stated sample; game outcomes are not engine evaluations.
- Authentication is required in the current [Lichess explorer specifications](https://github.com/lichess-org/api/tree/master/doc/specs/tags/openingexplorer). Choose a documented OAuth/token approach during implementation. Keep shared service credentials on the server; never bundle them in frontend assets or include tokens in study exports or logs. If user authorization is chosen, explain and support disconnect/reconnect.
- First build the 30 entries from the catalog, then fetch each seed and at least three variation targets. Where data is available, fetch the three most common continuations per seed in addition to explicitly selected named targets; these are complementary, not interchangeable.
- Initial automatic enrichment budget: follow each selected variation's most-played continuation for up to 12 additional half-moves, stopping at no data, a repeated position, or a terminal position. Cap at 100 distinct position queries per pack entry per refresh. Share cached queries across entries and make additional depth user-requested.
- Sort popularity by the number of games in the selected database and filters, not win percentage. Mark samples below a configurable minimum (initially 100 games) as small samples; do not invent missing statistics or treat a win rate as proof of soundness.
- Cache explorer responses for 7 days initially, with a visible last-refreshed date and manual refresh. Cache keys must include position/history parameters, database, and every query filter. Catalog updates remain pinned and separately versioned.
- Queue API calls with one in-flight request per provider initially, deduplicate identical jobs, and reuse shared cached results. Respect provider limits and `Retry-After`; back off on 429 and transient errors rather than promising a fixed throughput.
- Display ready, partially fetched, stale, authentication required, and failed states per entry. Imports are resumable and idempotent; refreshes must not duplicate lines or overwrite personal copies.
- Fetching is scoped to opening positions, variations, statistics, and game references. Downloading all Lichess games or scraping public studies is not required.

Endpoint, query, and authentication details are based on the official [Masters specification](https://github.com/lichess-org/api/blob/master/doc/specs/tags/openingexplorer/masters.yaml) and [Lichess-games specification](https://github.com/lichess-org/api/blob/master/doc/specs/tags/openingexplorer/lichess.yaml), checked on 2026-11-13. Recheck them before implementation.

## 5. Notation input, board reconstruction, and analysis

The user-facing experience can be simple, while internally three responsibilities remain separate: chess rules, notation parsing, and engine calculation.

| ID | Priority | Requirement |
| --- | --- | --- |
| MOVE-001 | P0 | Accept pasted standard algebraic notation (SAN), including move numbers, captures, checks, checkmate, castling, and promotions. |
| MOVE-002 | P0 | Import and export PGN, including headers, results, comments, standard move annotations, and recursive variations. Preserve nested branches. |
| MOVE-003 | P0 | Accept FEN for custom positions and respect PGN starting-position headers. Provide a board editor with legality checks for study starts. |
| MOVE-004 | P0 | Validate every move against the current position, including self-check, castling conditions, en passant, and promotion. |
| MOVE-005 | P0 | On failure, identify the game, move number, side, and problematic token; preserve the input and offer to inspect the valid prefix without silently accepting the invalid suffix. |
| MOVE-006 | P0 | Reconstruct every position with first/previous/next/last controls, clickable moves, keyboard navigation, board flipping, and adjustable autoplay. |
| MOVE-007 | P0 | Continue from any displayed position, create a variation, save as a study, or challenge a bot from that position. |
| MOVE-008 | P0 | Export a game or line as PGN and copy the current FEN or move sequence. Include a portable study backup for data PGN cannot represent. |
| MOVE-009 | P0 | Distinguish an unfinished line from a finished game. Do not invent moves, winners, or results when notation ends. |
| MOVE-010 | P1 | Accept coordinate/UCI move notation such as `e2e4` through an explicit input mode. Document supported formats and offer examples. |
| MOVE-011 | P1 | Import multiple games with a selection preview, per-game errors, progress, cancellation, and duplicate detection. |
| MOVE-012 | P1 | Offer optional engine continuation with a chosen side, move limit, and time budget. Label generated moves and save only on user request. |
| MOVE-013 | P1 | Offer on-demand evaluation, alternative candidate moves, and a principal variation, with cancellation and configurable analysis effort. |

Example: importing `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6` creates a six-half-move replay ending after Black's third move. Importing `1. e4 e5 2. Bh6` identifies White's illegal second move and preserves the original text.

### Chess rules and game outcomes

The shared rules layer must correctly handle legal moves, side to move, check, checkmate, stalemate, promotions, castling rights, and en passant. Track move history and counters for repetition and move-count rules. Distinguish claimable draws from automatic draws, and document the supported ruleset before implementation. Include dead-position handling and timed-game outcomes where clocks are enabled. Validate loaded positions; avoid claiming a position is historically reachable when only structural checks were performed.

## 6. Dynamic bots and play modes

| ID | Priority | Requirement |
| --- | --- | --- |
| BOT-001 | P0 | Use a runtime chess engine that accepts arbitrary valid positions and calculates legal moves. Fixed scripts or a finite response table do not satisfy this requirement. |
| BOT-002 | P0 | Offer several difficulty presets using supported engine strength controls and search budgets. Describe rating labels as estimates unless independently calibrated. |
| BOT-003 | P0 | Allow play as White, Black, or a random side, from the initial position, a study node, or a supplied FEN. |
| BOT-004 | P0 | Support untimed play, restart, resign, undo in practice games, and rematch with sides swapped. Save completed and interrupted games. |
| BOT-005 | P0 | Handle engine thinking, cancellation, failure, retry, and resume visibly. An unavailable engine must not leave a game stuck or invent an opponent move. |
| BOT-006 | P0 | Validate returned moves and reject late responses from an obsolete position after undo, restart, or navigation. |
| BOT-007 | P1 | Add timed games with presets and increments, consistent clock ownership, timeout handling, and documented background-tab behavior. |
| BOT-008 | P1 | Add an opening sparring mode: start at a chosen study node, optionally follow a selected repertoire, then switch to calculated play when it ends or the user deviates. |
| BOT-009 | P1 | Add a sparring setting that samples different saved opponent replies so repeated practice covers multiple branches. |
| BOT-010 | P1 | Offer optional hints, move explanations, and post-game review. Keep hints and live evaluation hidden unless the selected practice mode allows them. |
| BOT-011 | P1 | Save a game's interesting continuation back into an existing study, showing a merge preview and preserving its source. |
| BOT-012 | P2 | Add data-driven playing styles using engine candidate selection, search parameters, or suitable models, while preserving legal play and plausible strength. |

### Engine approach

- Prefer integrating a proven engine for the first release; writing a new competitive search engine is a separate project.
- Stockfish is a candidate behind a replaceable engine adapter. Its [official FAQ](https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html) documents strength controls, including the relationship between `UCI_Elo` and `UCI_LimitStrength`. Exact supported settings must be queried from the selected engine build.
- Difficulty presets are configuration, while moves are calculated from the board. Optional stylistic variation must not become a set of scripted games.
- Very weak human-like play may require more than lowering engine strength. Validate the beginner experience before promising specific rating bands or personalities.
- Evaluate browser-worker execution versus a managed server process before selecting a deployment approach. Browser execution reduces server calculation load; server execution simplifies centralized resource control but adds hosting and network dependencies.
- Isolate playing strength from analysis strength. Changing an analysis setting must not silently strengthen the opponent.
- Record engine identity, version, relevant settings, and search budget with saved analysis. Avoid presenting a shallow evaluation as certain.
- Keep engine work off the main UI thread and enforce resource and time limits. Review distribution and dependency licenses before shipping selected binaries or assets.

## 7. Skin system and customization

| ID | Priority | Requirement |
| --- | --- | --- |
| SKIN-001 | P0 | Include at least four board palettes and three visually distinct, clearly readable piece sets. |
| SKIN-002 | P0 | Provide light, dark, and system-following interface modes. |
| SKIN-003 | P0 | Preview changes on a sample position before applying them; save named presets and restore defaults. |
| SKIN-004 | P0 | Persist board, piece, and interface preferences across sessions and apply them consistently across all chess screens. |
| SKIN-005 | P0 | Configure coordinates, legal-move indicators, last-move highlights, check indicators, animation speed, and move sounds. Include mute and reduced-motion options. |
| SKIN-006 | P0 | Ensure themes preserve readable moves, distinguishable pieces, and accessible highlights. Provide a high-contrast preset. |
| SKIN-007 | P1 | Preview board and piece combinations on small screens; prevent customization panels from obscuring active play. |
| SKIN-008 | P2 | Allow custom board colors and piece assets with validation, safe format restrictions, preview, and fallback behavior. |
| SKIN-009 | P0 | Provide a standalone URL/CSS skin importer that saves local raster assets, a versioned manifest with provenance, local CSS variables, and an offline preview. Accept partial packs, optionally require all 12 pieces, and publish only fully downloaded packs without overwriting existing ones. |
| SKIN-010 | P0 | Extend the standalone importer to sound packs: skip empty URLs, validate MP3/OGG/WebM/WAV formats, group by event, preserve ZIP sources, and generate local CSS and an offline audio preview. By default abort on a failure; optionally publish available files with explicit failure/recovery reporting. |
| SKIN-011 | P0 | Let the future app select a sound pack independently from board/piece skins, map game/puzzle/study events to its sounds, choose a supported format, and respect mute/volume settings. Provide fallback or silence for missing events and define playback precedence to avoid accidental overlapping cues. |
| SKIN-012 | P0 | Provide a desktop paste interface with separate pieces, board, and sound areas, clipboard buttons, automatic URL extraction and asset counts, a suggested editable pack name, output-folder selection, responsive background imports, progress, cancellation, and buttons to open the finished preview/folder. Keep the CLI available. |

Cosmetics are visual preferences. They must not alter game state, training correctness, or bot difficulty. A cosmetic store is outside the initial scope.

### 7.1. Standalone skin and sound importer — available utility

- Entry point: `tools/import_skin.py`; usage and storage contract: `tools/README.md`.
- Friendly entry point: double-click `Open Skin Importer.cmd` or run `python tools/import_skin.py` without arguments. The Tkinter window lives in `tools/skin_importer_gui.py` and accepts full CSS blocks, plain supported URLs, or a mix, with no intermediate input file required.
- Input: pasted theme CSS saved as a file or piped through stdin, or HTTPS image URLs with identifiable piece/board filenames.
- Output: `assets/skins/<skin-id>/manifest.json`, `theme.css`, `preview.html`, and local `pieces/`, `boards/`, `sounds/`, and `archives/` assets as applicable. Manifest schema version 2 adds event → format → audio metadata and explicit failure/recovery reporting. Existing image-only schema-1 packs remain valid.
- The supplied `ca09k` piece set and `ohdxn` board-image declarations are recorded in `tools/examples/chesscom-ca09k.css`; the imported pack is `assets/skins/ca09k-ohdxn/`.
- The future study application should load selected manifests, resolve relative assets, and provide bundled fallbacks for missing roles. This loader and the skin-selection UI remain unimplemented.
- Preserve 3D-board images and piece-perspective metadata independently. Interactive perspective rendering requires a compatible board renderer; a downloaded texture alone does not supply its geometry.
- Importing source files does not establish redistribution rights. Preserve provenance alongside the pack.
- The supplied sound declarations are recorded in `tools/examples/chesscom-sounds.css`; the usable pack is `assets/skins/chesscom-sounds/`, including a playback preview. Empty alternate URLs are ignored. Source ZIP archives are preserved separately from playable events.
- `--skip-failed` allows a reported partial import. Optional `--archive-fallback` reads uniquely matching missing audio members from supplied archives into controlled filenames, preserves archive/member provenance, and never extracts the whole archive.
- All 36 supplied sound events have local MP3s: 34 direct downloads and two recovered archive versions (`draw-offer` and `lesson_pass`). Their individual URLs returned HTTP 403. The three alternate OGG/WebM/WAV draw-offer URLs also returned 403 and remain explicitly unavailable; formats are not invented or converted.
- The future loader should support both manifest versions, keep images and sound preferences independent, and map events such as move, capture, check, promotion, castling, game result, and learning feedback to sound keys. The app playback layer remains unimplemented.

## 8. Learning, revision, and progress

| ID | Priority | Requirement |
| --- | --- | --- |
| LEARN-001 | P0 | Practice a selected line, opening, folder, or repertoire as either side; the system supplies opponent moves from selected branches. |
| LEARN-002 | P0 | Support guided learning, recall without hints, and randomized branch practice. |
| LEARN-003 | P0 | Compare a submitted move with configured accepted study continuations. Distinguish “not in this repertoire” from “illegal” or “objectively bad.” |
| LEARN-004 | P0 | On a mistake, show the expected continuation and attached explanation, with reveal, retry, or continue controls. |
| LEARN-005 | P0 | Schedule spaced reviews using attempts, errors, hints, and elapsed time. Allow manual rescheduling, pausing, and resetting a line. |
| LEARN-006 | P0 | Track progress by side, line, position, and repertoire; show due reviews, common errors, and recently neglected material. |
| LEARN-007 | P0 | Reconcile training records when lines change: retain unaffected progress and flag changed continuations for review. |
| LEARN-008 | P2 | Generate exercises from recurring mistakes and suggest which repertoire gaps to study next. |

Training follows the user's learning objective. If several moves are acceptable, authors must be able to accept multiple continuations. Engine agreement alone must not silently rewrite a repertoire answer.

### 8.1. Chess.com puzzle of the day

| ID | Priority | Requirement |
| --- | --- | --- |
| PUZ-001 | P0 | Fetch the current daily puzzle using `GET https://api.chess.com/pub/puzzle`, the documented public read-only endpoint; no Chess.com sign-in is required for this fetch. |
| PUZ-002 | P0 | Read the returned title, source URL, publication timestamp, FEN, and PGN. Use CHESSNITE's board and active skin for interactive solving. The returned image is optional and must not expose the solution prematurely. |
| PUZ-003 | P0 | Place a Puzzle of the Day card on Home and provide a dedicated solving view. Orient the board for the solving side and initially hide solution moves and revealing annotations. |
| PUZ-004 | P0 | Let users submit moves, receive correct/incorrect feedback, retry, request a hint, reveal the solution, and replay it afterward. Drive opponent replies from the validated supplied solution. |
| PUZ-005 | P0 | Render a clearly visible “Daily puzzle by Chess.com” text link pointing to the returned puzzle URL, including in cached views. |
| PUZ-006 | P0 | Cache the latest valid puzzle, honor HTTP cache headers and conditional requests, and revalidate when allowed. Support manual refresh without bypassing provider cache policy. |
| PUZ-007 | P0 | Identify a puzzle by its source URL and publication timestamp; use the provider timestamp for its publication date and the user's timezone only for display. A local midnight rollover must not manufacture a new puzzle. |
| PUZ-008 | P0 | Preserve attempts, mistakes, hint/reveal usage, completion, and elapsed solving time locally across reloads. A repeated response must not reset progress. Distinguish assisted completion from an unaided solve. |
| PUZ-009 | P0 | Handle timeouts, missing fields, invalid chess data, and rate limiting. Keep the last valid puzzle with a visible publication date and stale/offline label; show an unavailable state when no cached puzzle exists. |
| PUZ-010 | P1 | Retain previously fetched puzzles and local attempt history for review, within a configurable retention policy. Do not assume the API supports fetching an arbitrary historical date. |

Integration behavior:

- Use the [Chess.com Published-Data API](https://www.chess.com/news/view/published-data-api) and its daily-puzzle response contract, checked on 2026-11-13. This fetch does not synchronize ratings, attempts, or account activity back to Chess.com.
- Validate the PGN starting-position headers against the supplied FEN before enabling solving. Derive the starting side and any setup moves from the actual payload; do not assume every puzzle PGN starts from the normal initial position or has the same prefix convention.
- Preserve variations and validate their legal moves. Treat supplied solution branches as accepted answers; a different legal move is “not the supplied solution,” not automatically “a blunder.” Optional engine exploration happens after the attempt and is separately labeled.
- If the payload lacks a usable solution or its PGN/FEN cannot be reconciled, keep the last valid cached puzzle, show the issue, and provide the source link. Do not invent a replacement solution.
- Save an in-progress attempt against its puzzle identity when a newer puzzle arrives. Let the user finish it or switch explicitly.
- The UI hides solution data for learning convenience; the public payload contains the solution. This feature does not create a secure competitive puzzle rating.
- Use the shared integration request queue and bounded retry behavior from section 4.2. Determine whether direct browser requests or a backend fetch/cache best fit provider headers and the deployment design during implementation.

### 8.2. Guided learner roadmap — required product feature

This is the roadmap a learner follows inside CHESSNITE. Section 15 separately describes the software delivery plan. The learning path is a core experience, with original visual design and original or licensed lessons.

#### Path structure and navigation

Use **track → level → unit → lesson → exercise**, with a checkpoint at the end of each unit. Tracks include Foundations, White Repertoire, Black Repertoire, and My Repertoire. The personal track starts as a view of selected published units and saved study lines; custom course authoring follows in P1.

| ID | Priority | Requirement |
| --- | --- | --- |
| PATH-001 | P0 | On first use, ask for experience level, preferred side, opening interests, and a flexible 5/10/15-minute daily target. Allow skipping onboarding and changing choices later. |
| PATH-002 | P0 | Show a visual learning path with named levels, ordered lesson nodes, prerequisites, checkpoints, progress, and a prominent Continue action. Offer an equivalent accessible list view. |
| PATH-003 | P0 | Distinguish not started, available, in progress, completed, checkpoint passed, mastered, and review due. Mark unpublished content separately as coming soon, not as a locked achievement. |
| PATH-004 | P0 | Publish short interactive lessons with a stated objective, an estimated 3–7-minute duration, explanations, board exercises, recall, and a recap. Allow pausing and resuming at the exact exercise. |
| PATH-005 | P0 | End each opening unit with a checkpoint that tests move recall, an opponent alternative, a typical mistake, and a strategic idea using reviewed exercises. Show the pass criteria and explain failures. |
| PATH-006 | P0 | Unlock the next recommended unit when prerequisites and its checkpoint criteria are met. Keep the catalog, personal compendium, and free bot play accessible regardless of path progress. Allow browsing future lesson objectives. |
| PATH-007 | P0 | Turn each reviewed opening study into a linked learning unit, including relevant branches and side-specific explanations. A raw API line alone cannot be labeled a reviewed lesson. |
| PATH-008 | P0 | Connect lessons to Open in compendium, Practice this line, and Play from here against a bot. Store discoveries back in the user's study without rewriting the published lesson. |
| PATH-009 | P0 | Provide a review queue and a daily session combining due review, one suitable new lesson, and an optional application exercise within the chosen time budget. Explain why the next activity is recommended. |
| PATH-010 | P0 | Distinguish lesson completion from retained mastery. Hints, reveals, errors, elapsed time, and delayed recall must affect progress as defined below. |
| PATH-011 | P0 | Show side-specific progress, units passed, skills needing review, and actual published content coverage. Completing one path must not imply mastery of all chess or all 30 opening entries. |
| PATH-012 | P0 | Persist and back up enrollments, attempts, current lesson/exercise, checkpoint results, review dates, and curriculum versions. Curriculum edits must not erase unrelated progress. |
| PATH-013 | P1 | Offer an optional placement assessment and unit test-out for experienced players. Mark passed objectives accurately; skipping explanations must not manufacture delayed-recall mastery. |
| PATH-014 | P1 | Adapt lesson selection and difficulty using observed mistakes and successful recall. Initially use explainable rules; users can override the suggested track or study order. |
| PATH-015 | P1 | Let users create an ordered learning path from their own studies, with selectable branches, accepted moves, objectives, and checkpoints. Label unreviewed personal content accordingly. |
| PATH-016 | P1 | Add optional XP, badges, daily goals, and streaks. Keep these separate from mastery and any chess rating; users can hide them or pause reminders. No lives/hearts system may block study after mistakes. |
| PATH-017 | P0 | Make prerequisites and next-step selection deterministic and explainable. Validate prerequisite graphs for cycles and missing published dependencies before releasing a curriculum. |
| PATH-018 | P0 | A puzzle API outage, missing explorer credentials, or an unavailable bot must not block cached lessons, completed progress, or review. Offer a suitable lesson exercise when an optional application activity is unavailable. |

#### Curriculum progression

Levels describe skills and increasing independence, not promised Elo bands. The path can branch and learners can select a repertoire suited to their interests. Do not force users to finish all 15 White openings before studying Black, or all 30 entries before advancing.

| Level | Learning goal | Representative units and activities | Delivery scope |
| --- | --- | --- | --- |
| 0 — Chess foundations | Navigate the board, make legal moves, and read notation. | Piece movement, captures, check, castling, promotion, and short SAN replays. | Expanded Foundations track in P1; launch includes a concise board/notation orientation and a skip option. |
| 1 — Opening essentials | Understand the reason for an opening move. | Center control, development, king safety, and recognizing premature pawn/queen moves; four short reviewed launch lessons. | P0. |
| 2 — First White repertoire | Learn one main setup and its key opponent replies. | Choose Italian, Ruy Lopez, Scotch, Queen's Gambit, London, or English from the reviewed White units; start with one, explore others as electives. | P0 starter units; expand to W01–W15 as teaching content is reviewed. |
| 3 — First Black repertoire | Prepare responses to common opening starts. | Choose a reviewed defense against `1. e4` and one against `1. d4`, using Sicilian, French, Caro-Kann, QGD, King's Indian, or Nimzo-Indian units as appropriate. Identify uncovered opponent move orders explicitly. | P0 starter units; expand to B01–B15 as teaching content is reviewed. |
| 4 — Branches and move orders | Handle deviations rather than repeating a single line. | Important alternatives, transpositions, anti-systems, move-order traps, and finding repertoire gaps. | P0: at least three reviewed branches in every launch opening unit; P1: broader transposition and gap tools. |
| 5 — Plans after the opening | Choose moves when memorized theory ends. | Typical pawn structures, tactical motifs, piece plans, and relevant endgame transitions, using positions from selected openings. | P0: strategic ideas and common mistakes in starter units; P1: dedicated structure, tactics, and endgame units. |
| 6 — Apply and analyze | Transfer study into practical games and learn from mistakes. | Play a bot from a lesson position, compare with the prepared line, and save notes; later add automated review and targeted opening sparring. | P0 manual study/play loop; P1 deeper review and sparring. |
| 7 — Maintain a personal repertoire | Study independently and retain useful knowledge. | Delayed recall, mixed branch checkpoints, regular gap reviews, and learner-authored paths. | P0 review and retention loop; P1 authored paths and adaptive recommendations. |

White and Black are parallel tracks: after Opening Essentials, either can be started or alternated. Within an opening, the teaching order is **ideas → main line → common alternatives → mistakes → plans → checkpoint → practical play → delayed review**. Foundations beyond the launch orientation are an optional prerequisite recommendation until those lessons are published.

Launch content minimum: the four Opening Essentials lessons, the board/notation orientation, and 12 reviewed opening units corresponding to the studies named in section 4. Each opening unit has at least an ideas lesson, a main-line lesson, a branch/mistake lesson, a recall exercise set, and a checkpoint. Each must expose at least three relevant branches. Publish a content manifest linking unit, lesson, exercise, source study, learner side, prerequisite, and review status. Catalog-only entries remain usable for self-study but do not appear as completable authored lessons.

#### A typical lesson and daily session

Example Italian Game unit:

1. Show the objective: develop pieces and understand the role of `Bc4`.
2. Demonstrate the main line with brief explanations on the board.
3. Ask the learner to make selected moves without visible answers.
4. Introduce Giuoco Piano, Two Knights, and Evans Gambit branches in separate exercises with the correct starting move orders.
5. Test a common mistake and a positional idea with reviewed feedback.
6. Run the unit checkpoint, then offer a bot game from one of the studied positions.
7. Save weak decisions to the review queue and show the next useful step.

A 10-minute session might allocate three minutes to due review, five to a lesson, and two to a short application exercise. These are estimates, not a timer that cuts off play. A full bot game remains optional and can continue beyond the target. Allow review-only sessions, stopping early, and resuming later. Completing the Chess.com daily puzzle can count toward an optional activity goal; it must not confer opening mastery unless its reviewed objectives actually match.

#### Completion, checkpoints, mastery, and review rules

These are initial product defaults to validate with learners, not claims of scientifically optimal thresholds. Version the policy so subsequent tuning preserves the meaning of earlier results.

- **Lesson completed:** All required exercises were attempted and the recap reached. Record whether hints or reveals were used. Showing a solution cannot count as unaided success.
- **Checkpoint passed:** At least 80% first-attempt accuracy on a minimum of 10 scored decisions, covering every required skill and selected branch category. Score all required decisions, including wrong/skipped answers, in the denominator. Requesting a hint or reveal switches the attempt to practice; an assisted attempt cannot award a checkpoint pass. Accept every configured valid answer; free text answers require reviewed rubrics or constrained answer choices.
- **Checkpoint retry:** Explain missed concepts, offer targeted practice, and allow retry immediately without a lives limit. Vary reviewed positions/order where content permits and retain attempt history. Repeating a just-revealed answer is practice, not delayed recall evidence.
- **Unit mastered:** Pass the checkpoint, then pass two unaided review sessions at the same accuracy threshold on different dates, at least 24 hours after the checkpoint and at least 24 hours apart. A progress badge must distinguish passed from mastered.
- **Review schedule:** Begin with intervals of 1, 3, 7, 14, and 30 days after successive successful reviews. A wrong answer or any hint/reveal returns the affected skill to a one-day interval and offers immediate practice. Do not reset unrelated units.
- **Review due:** Indicates a scheduled retention check, not automatic loss of previously earned completion. Display mastery together with current review status; overdue lessons stay open.
- **Daily goal:** Count genuine learning/review activity and completion, not merely opening a page. XP and streak rewards, when added, use stable activity IDs to prevent duplicate awards on refresh, restore, or retry. They never unlock engine strength or replace skill assessment.
- **Dates and recovery:** Store attempt timestamps in UTC and a learner timezone for day-based goals. Document day boundaries and timezone-change behavior; changing timezone or restoring a backup must not duplicate rewards or move a review arbitrarily into the future.
- **Content changes:** Keep the learner's completed history tied to its curriculum version. A changed answer/line can mark the affected skill for reassessment while leaving unrelated progress intact. Deprecated units remain visible in history with a link to their replacement.

#### Access and motivation

The guided path recommends a sequence; direct compendium access remains available for exploration and tournament preparation. Users can change side, pause a track, select a different opening, or practice an advanced position. Optional placement or checkpoint test-out can satisfy a prerequisite when implemented. Every gated node should explain exactly what to complete and offer a useful available alternative. Draft lessons and unavailable integrations must never create a dead end in the published path.

Use supportive feedback, optional celebrations respecting reduced motion and mute settings, and a clear Next action. Allow mistakes without blocking practice, avoid shame-based streak messaging, and keep reminders opt-in. Completing a bot game is useful practice; winning it is not a prerequisite for passing an opening unit.

## 9. Quality-of-life features

### Included in the first release

- **QOL-001:** Autosave with visible saving/saved/failed status and recovery of unfinished notes and games after refresh or a crash.
- **QOL-002:** Undo/redo for study edits, with recovery for accidentally removed branches.
- **QOL-003:** Search personal studies by title, tag, opening, and move sequence; show recent items and favorites.
- **QOL-004:** Resume the last study or game at the exact selected position and board orientation.
- **QOL-005:** Keyboard shortcuts with a discoverable shortcut guide; avoid intercepting keys while typing notes.
- **QOL-006:** Support click-to-move and drag-and-drop, with touch-friendly controls and an explicit promotion chooser.
- **QOL-007:** Export and restore the complete personal library, annotations, settings, and organization in a versioned backup.
- **QOL-008:** Clear empty states, loading states, import progress, actionable errors, and retry controls.
- **QOL-009:** Adjustable board size, collapsible panels, and a focused study layout that works at mobile widths.

### Follow-up improvements

- **QOL-010 / P1:** Bulk tag, move, archive, and export selected studies.
- **QOL-011 / P1:** Study revision history with named snapshots and restore previews.
- **QOL-012 / P1:** Offline access to previously downloaded studies, with queued edits and explicit synchronization state.
- **QOL-013 / P1:** Repertoire coverage map and filters for draft, ready, learning, due, and mastered material.
- **QOL-014:** Flexible daily study targets are P0 through PATH-001/009. Optional reminders and opt-in streak features are P1 through PATH-016; no mandatory streak mechanics.
- **QOL-015 / P2:** Multiple named workspaces, such as tournament preparation and casual exploration.

## 10. Screens and navigation

| Screen | Main contents and actions |
| --- | --- |
| Home | Continue recommended lesson, due reviews, daily study target, Chess.com Puzzle of the Day with attribution and date, recent studies, and favorites. |
| Learning path | Experience/side selection, track switcher, visual level/unit/lesson map, accessible list view, prerequisites, checkpoints, mastery/review states, and Next action. |
| Guided lesson / checkpoint | Objective, short explanation, interactive board decisions, hints where allowed, saved exercise position, assessment feedback, recap, and compendium/bot links. |
| Opening catalog | Search, family filters, selected White/Black packs, Lichess continuations and statistics, fetch status, coverage status, and create-study action. |
| My compendium | Collections, folders, tags, sorting, search, import/export, and archived studies. |
| Study workspace | Board, branching move list, annotations, learning material, save state, and play-from-here action. |
| Notation workspace | Paste/upload notation, select starting position, validation preview, replay, and save/export. |
| Bot setup and game | Side, difficulty, start position, game controls, move list, and post-game save. |
| Training and review | Scope selection, due queue, recall board, feedback, session results, and scheduled next review. P0 foundation; P1 adaptive recommendations. |
| Daily puzzle | Interactive board, attempt controls, hidden solution, hints/reveal, completion status, source credit, and publication date. |
| Appearance | Theme and piece previews, presets, accessibility options, and reset. |
| Settings and data | Preferences, storage status, backup/restore, integration connection/refresh status, and account controls if accounts are introduced. |

Use the same board interaction model everywhere. On desktop, the study workspace can show navigation, board, and notes side by side. On mobile, retain the board and use clearly labeled tabs or drawers for moves and notes. Keep implementation details out of everyday learning screens.

## 11. Data model and integrity requirements

These are conceptual entities, not a mandated database schema.

| Entity | Purpose |
| --- | --- |
| Workspace / user | Ownership boundary; can begin as a single local profile. |
| Opening reference | Name, aliases, ECO, defining moves, source, dataset version, and content coverage status. |
| Learning article | Reviewed explanation, illustrative lines, authorship, references, and revision state. |
| Collection / repertoire | Personal grouping, side, folders, tags, ordering, and visibility. |
| Study | Named move tree, starting position, metadata, source links, and revision information. |
| Study node | Parent, move from parent, ordered children, main-line choice, annotations, and resulting position. |
| Position reference | Normalized position identity for search and transposition links. |
| Game | Starting state, moves, outcome, participants or bot profile, timestamps, and optional clocks. |
| Bot profile | Engine identity and settings, difficulty preset, optional style and repertoire policy. |
| Analysis | Position, engine version/settings, effort, evaluation, candidate lines, and calculation date. |
| Training record | Study revision, side, target move or position, attempts, mistakes, and next review. |
| Curriculum / track | Stable track ID, published version, levels, objectives, learner-side scope, and prerequisite graph. |
| Unit / lesson / exercise | Stable content ID and revision, ordered activities, reviewed answers/rubric, linked study/branches, checkpoints, estimated duration, and publication state. |
| Learner enrollment / path progress | Selected tracks, onboarding choices, goals, current activity, prerequisite results, completion/mastery states, and curriculum version. |
| Assessment / review attempt | Unit/skill/exercise version, submitted decisions, first-attempt score, hints/reveals, timestamps, scheduling policy version, and next due date. |
| Optional motivation ledger | Stable learning-activity IDs, goal timezone, XP/badge/streak events, and reminder preferences; distinct from mastery and chess rating. P1. |
| Theme preset | Board, pieces, interface mode, highlights, sound, and motion preferences. |
| Opening pack entry | Stable W/B ID, learner side, seed line, catalog reference, variation targets, enrichment state, and optional linked personal study. |
| Explorer snapshot | Provider/database, canonical query and filters, retrieved time, move counts, game references, and cache/version metadata. |
| Daily puzzle | Provider URL and publication timestamp, title, FEN, original PGN, validated solution tree, source attribution, and fetch/cache metadata. |
| Puzzle attempt | Puzzle identity, submitted moves, errors, hints/reveal, elapsed time, completion state, and last active position. |
| Integration state | Provider, queued job/cursor, last success, errors, and authentication state; credential secrets live outside portable application data. |

Integrity rules:

1. Store studies as move trees to preserve history and context. Use separate cross-links for transpositions; do not collapse all annotations into one shared node.
2. Position matching must include side to move, castling rights, and relevant en passant rights. Board placement alone is insufficient.
3. Distinguish position identity for opening lookup from full game state for draw claims, counters, history, and engine analysis caching.
4. Each non-root study node has exactly one parent; branch order and the main-line selection are explicit. Prevent cycles.
5. Preserve original imported notation alongside a validated representation where useful for recovery and diagnostics.
6. Use stable IDs, versioned backup formats, and migrations so future additions do not invalidate existing libraries.
7. PGN is the chess interchange format; the full-library backup also preserves folders, theme settings, training history, and other application metadata.
8. A restore operation validates the backup and offers merge or replace with a reviewable summary. Never silently discard existing data.
9. Remote content updates are transactional: validate a replacement snapshot before publishing it. Keep personal studies and puzzle attempt records independent from cache expiry or provider refreshes.
10. Full-library backups include puzzle attempts and source identifiers plus user-saved opening lines. Exclude credentials and replaceable bulk response caches; preserve provenance for all retained remote content.
11. Include learner enrollment, curriculum references, assessment history, review schedules, and current lesson position in complete backups. Version curriculum and scoring/scheduling policies separately from study revisions; never silently mark a changed exercise as previously mastered.

## 12. Logical architecture and technical decisions

Keep the product modular without committing to a framework yet:

- **Shared chess core:** Authoritative legal-move validation, position transitions, notation conversion, and game outcomes.
- **Board and replay interface:** Renders state, accepts moves, and navigates variations; it does not invent a separate rules implementation.
- **Compendium and content layer:** Catalog import, personal studies, organization, learning pages, and search.
- **Engine adapter:** Position-in/move-or-analysis-out boundary, job IDs, cancellation, settings, and error handling.
- **Training and curriculum layer:** Versioned tracks, prerequisite validation, accepted continuations, lesson/checkpoint delivery, assessment, scheduling, saved progress, and explainable next-activity selection.
- **Persistence layer:** Autosave, complete backups, schema migrations, and optional future synchronization.
- **Theme layer:** Shared visual tokens, board palettes, piece assets, and accessibility preferences.
- **External data adapters:** Chess.com daily-puzzle fetch and Lichess catalog/explorer access, with authentication where required, validation, request queues, caching, refresh state, and source attribution.

Decisions to settle before implementation:

| Decision | Proposed direction | Evidence needed |
| --- | --- | --- |
| Delivery | Responsive web application | Confirm offline expectations and target browsers. |
| Accounts | Local single-user workspace initially | Decide whether cross-device access is needed at launch. |
| Backend | Add where required by API credential protection, shared caching, account, sync, content, or engine needs | Compare deployment complexity, data safety, and operational cost; resolve Lichess authentication before live enrichment. |
| Engine hosting | Browser worker or isolated server engine | Measure responsiveness, supported devices, and resource usage. |
| Rules/notation library | Reuse a maintained, tested implementation | Verify correctness, language fit, supported PGN features, and license. |
| Catalog source | Pinned Lichess opening dataset plus authenticated Opening Explorer API enrichment | Validate the 30 selected entries, provider contracts, licenses, cache policy, and update process. |
| External authentication | Select a documented Lichess OAuth/token flow; Chess.com daily-puzzle fetch is public | Confirm credentials, deployment boundary, provider limits, reconnect behavior, and safe secret storage. |
| Technology stack | Select after architectural choices | Consider the current Java project without assuming it dictates the UI stack. |

Suggested implementation choices remain provisional. No dependency, service subscription, hosting commitment, or application code is introduced by this plan.

The Chess.com daily-puzzle and Lichess opening-data providers are required product choices in version 1.1; their implementation libraries and hosting mechanisms remain provisional.

## 13. Reliability, accessibility, privacy, and performance

- **NFR-001 / P0:** Never lose an acknowledged saved edit during ordinary navigation or reload. Show failed persistence clearly; provide backup reminders and storage-capacity errors.
- **NFR-002 / P0:** Enforce ownership boundaries wherever shared hosting or accounts exist. Private studies remain private unless sharing is explicitly enabled.
- **NFR-003 / P0:** Treat PGN, comments, links, backups, and future uploaded assets as untrusted input. Escape or sanitize displayed content, limit import size and variation depth, and cap engine resources.
- **NFR-004 / P0:** Support keyboard access, visible focus, readable contrast, reduced motion, screen-reader announcements for moves and errors, and a usable text move list. Validate core flows against WCAG 2.2 AA before release.
- **NFR-005 / P0:** Layouts must remain usable from 360 CSS pixels upward and on current stable desktop Chrome, Edge, Firefox, and Safari, plus representative Android Chrome and iOS Safari devices selected at implementation time.
- **NFR-006 / P0:** On an agreed mid-range reference device, aim for board input and navigation feedback within 100 ms at the 95th percentile, excluding intentionally animated travel and engine thinking. Keep work off the UI thread.
- **NFR-007 / P0:** Target a usable initial workspace within 3 seconds on an agreed reference network/device with warm application assets. Record cold-load performance separately before release.
- **NFR-008 / P0:** Use a benchmark library of 10,000 study nodes: target common personal searches under 300 ms at the 95th percentile and a 1 MB PGN import preview within 2 seconds on the reference device. Treat these as provisional budgets to validate, not current measurements.
- **NFR-009 / P0:** Expose progress and cancellation for work exceeding one second; stream analysis updates where supported. Engine thought time follows the selected budget.
- **NFR-010 / P0:** Keep diagnostic logs free of private notes, full imported games, or credentials by default. Any future analytics collection requires a documented purpose and user controls.
- **NFR-011 / P1:** If synchronization is introduced, retain conflicting edits, offer a comparison/merge flow, and make offline/pending/failed status visible.
- **NFR-012 / P0:** Document data storage, export, deletion, dependency licenses, and supported rules behavior before public release.

Performance targets apply to defined benchmark fixtures. Very large imports must use explicit limits or background processing rather than freezing the interface.

## 14. Acceptance scenarios

These are future implementation checks, not tests to create during this planning task.

1. **Organize a repertoire:** Create a collection, add an opening with three branches, reorder and annotate it, reload, and recover every edit. Export and restore into a fresh workspace with equivalent content.
2. **Validate notation:** The valid example in section 5 replays correctly. The invalid example identifies the first illegal move without losing input. Test captures, ambiguous SAN, promotion, castling, en passant, and custom starts.
3. **Preserve PGN structure:** Import nested variations, comments, annotations, result, and headers; export and reimport with equivalent supported chess content. Report unsupported fields rather than silently claiming full preservation.
4. **Handle transpositions:** Two move orders that reach the same relevant position are discoverable together; each retains its own move history and notes. Positions with different castling rights must not be merged.
5. **Prove runtime bots:** Play from previously unseen legal FENs outside saved opening lines. Each bot returns legal calculated moves within its budget. Undo during thinking cannot apply an outdated response. Do not use “different move every time” as proof: engines can legitimately repeat their best move.
6. **Verify bot difficulty:** Check that presets apply distinct supported settings and benchmark their relative results across enough games and positions. Display estimated strength without claiming a calibrated human rating.
7. **Switch skins:** Preview and apply every bundled board/piece combination, reload, and retain the selection. Verify high contrast, mobile readability, mute, and reduced motion.
8. **Recover from failure:** Interrupt engine work and persistence separately. Preserve the recoverable state, show a useful error, and allow retry or export without duplicating moves.
9. **Validate learning content:** Every starter study meets the content checklist; every catalog-only entry clearly identifies missing teaching material. Publish the actual coverage manifest.
10. **Review training, when released:** Accept configured alternatives, track an error and hint, schedule the next review, and reconcile a subsequent edit without erasing unrelated progress.
11. **Fetch and solve the daily puzzle:** Load a valid Chess.com payload, display source credit, hide solution text, accept the supplied continuation, play opponent replies, and persist the attempt. Exercise hint/reveal and assisted completion. Repeated fetches retain progress; a new publication creates a different puzzle without discarding the active attempt.
12. **Handle puzzle failures and dates:** Exercise malformed PGN/FEN, timeout, 429, cached responses, a local midnight rollover, and no-cache offline startup. Show the last valid publication as stale when appropriate; never label it as a newly fetched puzzle or invent a solution.
13. **Populate both opening packs:** Verify exactly W01–W15 and B01–B15, legal seed moves, catalog matches/aliases, correct branch roots, and at least three targeted variations per entry. Fetch live continuation snapshots where credentials and source data permit. Empty responses remain clearly labeled gaps rather than fabricated content.
14. **Refresh Lichess data safely:** Verify documented authentication, database/filter-specific caching, sample counts, 401/403 reconnect behavior, 429 backoff, bounded traversal, pause/resume, and deduplication. A refresh cannot overwrite a personal study or duplicate a branch. Cached packs remain usable offline; missing live authentication is visible and is not counted as a successful enrichment.
15. **Follow the learner roadmap:** Onboard a beginner and an experienced learner; choose either side, find a suitable published unit, complete a lesson, resume after reload, take a checkpoint, and see an explained next step. Check accessible list navigation and free compendium access from a gated node.
16. **Assess honestly:** For a 10-decision checkpoint, eight unaided correct first attempts pass, seven fail, and hinted/revealed answers cannot count as unaided successes. Verify configured alternatives, skill/branch coverage, repeat attempts, and supportive retry behavior. Completing a lesson, winning a bot game, or gaining XP alone must not mark a unit mastered.
17. **Retain and recover progress:** Exercise the one-day first review, successive intervals, two delayed successful reviews for mastery, and a failure that reschedules only the affected skill. Verify overdue status, timezone/day boundaries, refresh, backup/restore, and curriculum changes without lost progress or duplicated optional rewards.
18. **Validate content and avoid dead ends:** Confirm the four opening-principles lessons, orientation, 12 reviewed opening units, three branches per opening unit, valid prerequisites, and published content manifest. Reject cycles and missing dependencies. API failures and unavailable optional bot activities must leave a usable lesson/review route.

## 15. Phased roadmap

### Phase 0 — Finalize design and scope

- Resolve deployment, accounts, engine location, storage, and stack choices.
- Select and validate rules/notation dependencies, engine build, catalog snapshot, and licensed assets.
- Verify Chess.com puzzle and Lichess explorer payloads, choose the Lichess authentication flow, and define API cache/request budgets.
- Define screens, content templates, benchmark fixtures, the selected 30 opening entries, first 12 reviewed studies, and import limits.
- Define the learner roadmap, prerequisite rules, lesson/exercise templates, checkpoint rubrics, and initial retention policy. Plan the launch orientation, four Opening Essentials lessons, and learning units derived from the 12 reviewed starter studies.
- Confirm restore behavior and data ownership before implementation begins.

Exit condition: architecture decisions, content coverage target, data contract, and release checklist are reviewable. Implementation begins only when requested separately.

### Phase 1 — Chess and study foundation

- Shared chess rules, interactive board, SAN/PGN/FEN flows, replay, and variation editing.
- Local workspace persistence, autosave, recovery, and complete export/restore.
- Foundational responsive and accessible interactions.

Exit condition: notation round-trips and editable studies survive reload and backup restoration.

### Phase 2 — First usable release: all four pillars

- Catalog import and search, personal collections, notes, and the reviewed starter curriculum.
- Populate the 15 White and 15 Black opening packs with Lichess catalog lines and authenticated API enrichment; include refresh, caching, and partial-failure states.
- Add the Chess.com daily-puzzle fetch, interactive solving, attribution, cached fallback, and saved attempts.
- Runtime engine bots, difficulty presets, arbitrary-position starts, game saving, and recovery.
- Board/piece skins, interface themes, previews, and saved preferences.
- Ship the P0 learning path: onboarding, visual/list roadmap, short lessons, checkpoints, baseline spaced review, durable learner progress, and links to studies and bot practice. Publish the launch curriculum and its coverage manifest; advanced unpublished levels remain clearly marked.
- All P0 requirements and relevant acceptance scenarios pass.

Exit condition: a user can browse both selected opening packs, fetch Lichess continuations, organize branches, replay notation, customize the board, play a calculating bot from a saved position, solve the Chess.com daily puzzle, and follow a published guided unit through a checkpoint and scheduled review. Verify both integrations with actual provider responses, then exercise cached and failure scenarios.

### Phase 3 — Training and deeper study

- Extend the P0 learning path with fuller Foundations, placement/test-out, adaptive recommendations, personal course authoring, and optional motivational features.
- Expand recall/review tools, transposition links, and repertoire-gap detection; baseline drills, scheduling, and progress already ship in Phase 2.
- Engine analysis, opening sparring, game-to-study merges, revision history, and larger imports.
- Expand reviewed lessons beyond the starter curriculum.

Exit condition: the study → practice → play → revise loop works with durable progress records.

### Phase 4 — Optional platform expansion

- Accounts, synchronization, sharing permissions, collaboration, and offline workflows if requested.
- Opening explorer expansion beyond the P0 packs and P1 arbitrary-position lookup, richer bot styles, custom assets, and personalized exercises.
- Consider human multiplayer as a separately scoped project with matchmaking, clocks, reconnection, abuse handling, and operational requirements.

Phase ordering is dependency-based, not a calendar estimate. Estimate delivery only after scope, architecture, content staffing, and deployment choices are settled.

## 16. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Broad opening coverage mistaken for complete teaching material | Track catalog and reviewed lesson coverage separately and publish a manifest. |
| Scope grows into every feature of a major chess service | Preserve the opening-compendium focus and require explicit scope for social or multiplayer systems. |
| Fragile notation or inconsistent chess rules | Use one tested rules core and verify import/export, variants of notation, and unusual legal positions. |
| Saved lines become tangled through transpositions | Preserve move trees and use separate position cross-links. |
| Beginner bots feel implausibly strong | Validate actual play; describe strength honestly and evaluate additional weakening approaches only if needed. |
| Engine work freezes devices or drains resources | Isolate work, cap budgets, support cancellation, and measure representative mobile devices. |
| Browser storage is cleared or unavailable | Make full backups easy, report persistence failures, and assess durable storage or sync before broader release. |
| Personal edits are lost during catalog updates or synchronization | Separate reference content from personal copies, retain revisions, and preview conflicts. |
| Imported content or assets cannot be redistributed | Maintain source and license records and review selected materials before distribution. |
| External APIs change, rate-limit requests, or become unavailable | Isolate provider adapters, retain validated caches, back off, expose status, and recheck upstream contracts before releases. |
| Explorer credentials are absent or exposed | Select the supported auth flow early; protect secrets, handle revocation, and keep catalog/cached study access available. |
| Puzzle solution leaks into the learning interface | Hide supplied solution data until reveal/completion, including comments and previews; do not promise competitive secrecy. |
| A visual path promises lessons that do not exist or gates exploration unnecessarily | Separate published lessons from catalog references/drafts, validate dependencies, and keep compendium access open. |
| Gamification is mistaken for retained chess skill | Separate XP/streaks from checkpoint and delayed-recall evidence; allow users to hide motivational features. |
| Curriculum revisions erase learning history or invalidate scores silently | Keep stable content IDs, version attempts/policies, and reassess only affected skills. |

## 17. Open decisions for future implementation

These do not block this requirements document. Resolve them before dependent development:

1. Is a local personal workspace sufficient at launch, or are accounts and cross-device synchronization required immediately?
2. Which engine execution approach best fits the intended devices and hosting budget?
3. What balance of beginner guidance and advanced repertoire management should the starter curriculum emphasize?
4. Who authors and reviews the first 12 lessons named in section 4, and how quickly should the remaining selected entries gain reviewed teaching content?
5. Is offline bot play a launch requirement, or is offline study access sufficient?
6. Which documented Lichess authentication flow and deployment boundary should support the required explorer integration? Are any additional external services needed beyond the two required providers?
7. Are private share links or collaborative editing needed before a public community?

Until changed, use the scope assumptions in section 2 for planning. Choices that affect data safety or architecture must be settled before dependent implementation.

## 18. Maintaining this document

For each future request:

1. Add or update requirements with stable IDs and a priority.
2. Explain the user benefit, affected workflows, dependencies, and acceptance criteria.
3. Update the data model, roadmap, risks, and open decisions when necessary.
4. Record whether the request expands scope, replaces an earlier decision, or clarifies existing behavior.
5. Update the version and change log. A planning edit alone does not authorize coding or deployment.

Suggested addition template:

```text
Requirement ID:
Feature name:
User problem / benefit:
Required behavior:
Priority and target phase:
Data and UI impact:
Dependencies:
Acceptance criteria:
Outstanding decisions:
```

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-11-13 | Initial plan: opening compendium, notation reconstruction, skins, dynamic bots, quality-of-life features, training, architecture boundaries, and staged delivery. |
| 1.1 | 2026-11-13 | Added required Chess.com daily-puzzle integration and 15 curated openings for each side, with Lichess catalog/API enrichment, authentication, cache/error handling, data entities, acceptance criteria, and updated release scope. Planning only; no implementation performed. |
| 1.2 | 2026-11-13 | Added SKIN-009 and documented the explicitly requested standalone skin importer, portable pack format, supplied asset pack, and remaining application-loader work. Main platform remains in planning. |
| 1.3 | 2026-11-13 | Added SKIN-010/011, sound imports and event grouping, schema-2 manifests, audio previews, explicit partial imports, and optional archive recovery. Downloaded the supplied sound pack; main application playback remains planned. |
| 1.4 | 2026-11-13 | Added SKIN-012 and a paste-first desktop interface with separate asset areas, detection, naming, background imports, cancellation, and preview/folder actions. Preserved CLI support and added mixed CSS/plain-URL parsing. |
| 1.5 | 2026-11-13 | Made a guided learner roadmap a core P0 feature: levels/tracks, launch curriculum, short lessons, prerequisites, checkpoints, mastery criteria, spaced review, and compendium/bot links. Promoted LEARN-001–007 to P0; added PATH-001–018, P1 personalization/motivation, data requirements, acceptance scenarios, and updated delivery scope. Requirements only; no application implementation. |
| 1.6 | 2026-11-13 | Implemented the user's narrowed first personal release: London course, one calculating 1000-target bot, responsive flat UI, skins, SQLite progress, backups, launcher and in-app update/restart. Recorded the shipped scope separately from the broader platform roadmap. |

## 19. Technical references

These references document required data providers and candidate engine integration. Exact implementation dependencies remain open.

- [Lichess opening dataset](https://github.com/lichess-org/chess-openings): required named-opening catalog and source documentation.
- [Lichess Opening Explorer API](https://lichess.org/api#tag/Opening-Explorer): live position-based opening data.
- [Lichess Masters endpoint specification](https://github.com/lichess-org/api/blob/master/doc/specs/tags/openingexplorer/masters.yaml) and [Lichess-games endpoint specification](https://github.com/lichess-org/api/blob/master/doc/specs/tags/openingexplorer/lichess.yaml): official endpoint, query, and authentication contracts.
- [Chess.com Published-Data API](https://www.chess.com/news/view/published-data-api): daily-puzzle fields, attribution, caching, and request guidance.
- [Stockfish official FAQ](https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html): engine behavior and strength-setting guidance.

Review the current upstream documentation, supported formats, and license terms when dependencies are selected for implementation.
