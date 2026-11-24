# Rift Runners: Session Log

Chronological log of major milestones, design decisions, bug fixes, speech calibrations, and next steps. Add a new entry at the top after every major build or change.

## 2026-11-24: Documentation System, Repo Cleanup, and World 2 Speech Calibration

### Completed
- **Modeled Repository Documentation Structure**:
  - Created root `README.md` with project overview, current status, and direct links to `docs/DESIGN.md`, `docs/SESSION-LOG.md`, `BUILD.md`, and `docs/RECOVERY_AND_SETUP.md`.
  - Created root `BUILD.md` locking art direction (World 1 painterly cutscenes anchored to `/src/assets/images/cutscene_opening_warden_1795457392314.jpg`, 2.5D hand-inked maps, `#FFFFFF` sprites), writing rules, speech verification standards, and audio pipelines.
  - Created `docs/DESIGN.md` with complete difficulty tiers, Rune Forge economy, defender roster, World 1 shipped specs, World 2 roadmap, and feature backlog.
  - Created `docs/RECOVERY_AND_SETUP.md` documenting local run commands, Cloudflare Azure speech worker setup, audio caches, and GitHub backup hygiene.
- **Repository Slim-Down for GitHub Sync**:
  - Removed 14 MB of unused chat screenshot uploads from `public/assets/aistudio/` and added `public/assets/aistudio/` to `.gitignore`.
  - Deleted 3 unused superseded v1 cutscene JPGs from `src/assets/images/` (3 MB saved).
  - Converted all 30 cached Leda `.wav` clips in `public/assets/audio/tts-cache/` to 64 kbps mono `.mp3` and updated `server.ts` and `src/lib/audio.ts` to serve `.mp3` first with `.wav` fallback.
  - Web-optimized cutscenes (max `1280px`), battlefield maps (max `1400px`), and sprites (max `512px`, high quality to preserve `#FFFFFF` keying edges).
  - Packed all 116 word and phoneme clips plus used UI audio clips into two Web Audio sprites (`public/assets/audio/words/sprite.mp3` and `public/assets/audio/ui/sprite.mp3`), cutting repository file count from `653` down to `~105` files so AI Studio's GitHub commit push clears cleanly without timing out.
  - Added GitHub Pages deployment support: `.github/workflows/deploy-pages.yml`, `VITE_BASE_PATH` in `vite.config.ts`, `src/lib/assetUrl.ts` for subfolder-safe image and audio URLs, and automatic direct Cloudflare Azure Speech Worker routing when running on `github.io`.
  - Added a standing rule in `BUILD.md` to remind Mr. Scott to push to GitHub after changes pass his checks.
- **Multi-Voice Azure Speech Calibration (Option A) and Mic Hardening**:
  - Added instant Web Audio SFX muting via `fxMasterGain` (`duck(2)` in `src/lib/audio.ts`) whenever the mic opens so explosions and chimes cannot leak into recording.
  - Hardened VAD in `src/lib/speech.ts` (80ms pre-roll, 90ms click-transient ignore, 6-frame warmup, 3 consecutive voiced frames, 650ms end-silence).
  - Expanded `alignmentDrop` recovery (`word <= 30`, `vowel <= 30`, `maxCons <= 35`, `minCons <= 5`) so forced-alignment glitches never punish streak or crystals.
  - Benchmarked World 2 digraphs (`sh`, `ch`, unvoiced `th`, voiced `th`, `wh`, `-ck`) across 4 voice/mic profiles (female, deeper male `-4st`, higher teen `+3st`, noisy Chromebook) plus adversarial swaps (`tin`, `fin`, `dis`, `rip`, `log`, `shop`/`chop`, `shum`/`chum`) against live Azure Speech and verified 13/13 pass.
- **Zero-Schwa Pure Human Phoneme Clips and Rune Cleanup**:
  - Extracted pure Leda phoneme MP3s verified at 97 to 100/100 on Azure: `snd_sh.mp3`, `snd_ch.mp3`, `snd_th.mp3`, and registered `snd:sh`, `snd:ch`, `snd:th`, `snd:wh`, and `snd:ck` in `public/assets/audio/words/manifest.json`.
  - Cached Leda Sound Rule narrations (`Leda_rule-rule-sh-v2.wav`, `Leda_rule-rule-ch-v2.wav`) and key anchor words in `public/assets/audio/tts-cache/`.
  - Audited World 2 Level 1 nonsense runes and replaced `shid`, `chem`, and `chod` with classroom-safe `shib`, `chep`, and `chot` with phonetic TTS spellings.

### Decisions Locked
- Cutscenes must always reference `/src/assets/images/cutscene_opening_warden_1795457392314.jpg` in `ImagePaths` to prevent style drift into comic-book outlines.
- Sound calibration stays invisible to students who are passing cleanly; an Adaptive Quick Voice Check will only trigger quietly if a student misses the same sound 3 times in a row.
- Repository stays lean (under 150 files, audio packed into sprites, TTS cached as 64 kbps mono MP3) so AI Studio pushes cleanly to `jimmaoscott-lang/rift-runners-studio` after Mr. Scott's checks pass.

### Next Up
1. Optionally refresh World 2, Level 1 (`Ashgate Outpost`) cutscenes to match the World 1 painterly Rift Warden style.
2. Build Adaptive Quick Voice Check (triggered only after 3 consecutive misses on the same sound in Speak Mode).
3. Build World 2, Level 2: `Smelter Causeway` (`th`/`wh`/`-ck`, Shieldbearer enemy, Rail Turret + Side Loadout Selector).

## Prior Shipped Milestones (Summary)
- **World 2, Level 1 (`Ashgate Outpost`)**: Built volcanic foundry map, Cinder Imp enemy, `sh`/`ch` word and rune banks, Sound Rule direct instruction cards, biome-matched volcanic letterbox `#1c1210`, guarded `nextLevel` against `comingSoon` stages, and playtested through victory on Hard.
- **World 1 (`The Thornwood`, Levels 1 to 5)**: Shipped complete 5-level short-vowel campaign (`Thornwood Edge`, `Bramble Crossing`, `Hollow Bridge`, `Sunless Ruins`, `Thornking's Heart`), sticky per-level Rift Locks, 4 difficulty tiers, 6 defenders (including Ember Cannon and Tesla Spire), 3 Hero Powers, Leda voice acting, and live Azure Speak Mode.
