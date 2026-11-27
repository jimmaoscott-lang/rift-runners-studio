# Rift Runners: Project Directions

Read this file together with `docs/DESIGN.md` and `docs/SESSION-LOG.md` before building any new level, cutscene, defender, enemy, or phonics skill. Whenever a rule, cutoff, art standard, or level milestone changes, update these files in the same turn so decisions carry cleanly from level to level.

## Mr. Scott's decisions

Settled. Do not change them unless Mr. Scott says so.

- Claude directs and tests; AI Studio builds. Claude never edits the Studio repo. (Nov 27)
- Level 1 difficulty on Hard and Expert is right. Keep those numbers. (Nov 27)
- Students may skip the Level 1 walkthrough. (Nov 27)
- A few crystals per creature kill and a small wave-clear bonus are fine. Reading stays the main income. (Nov 27)
- A miss lowering a lock's count is fine. (Nov 27)
- Sync to GitHub after every build. (Nov 27)
- Cutscene pause: no new cutscene images, narration or story scripts until the rest of the build is finished. All story scripts and cutscenes will be redone as static files as the last step. (Nov 27)
- Student screens show no test or setup tools; those go behind Teacher Mode. (Nov 27)
- No student data in either repo, ever. Both repos are public. (Nov 27)
- Phone layout, cross-device progress and the Unreal Engine move are on hold. (Nov 27)
- Leda is the voice for new word readings and narration. (Studio decision, kept)
- Difficulty dials are a builder-only tool behind Builder Mode. Teachers and students never see them. Good dial values get written into the game as the real numbers, then dials go back to default. Builder Mode and the dials are removed before release. (Nov 27)

## 1. Mandatory Pre-Build and Post-Build Workflow

Build prompts come from docs/STUDIO-PROMPTS.md in jimmaoscott-lang/rift-runners. Run a prompt only when Mr. Scott names it, and check that repo's AI-STUDIO.md for new decisions before each task.

1. **Before building**: Read `BUILD.md`, `docs/DESIGN.md`, and the latest entries in `docs/SESSION-LOG.md`.
2. **During building**: Follow every art, gameplay, speech, audio, and writing lock in this file.
3. **Before calling a level complete**:
   - Run the multi-voice Azure speech benchmark (Section 4) for every new phonics sound.
   - Extract and verify zero-schwa pure human phoneme clips (Section 5).
   - Run `npm run lint` (`tsc --noEmit`) and `npm run build` (`vite build`).
4. **After building**: Record shipped work, visual or scoring adjustments, and next steps in `docs/SESSION-LOG.md`, and update `docs/DESIGN.md` and `README.md` status.
5. **After every build**: Remind Mr. Scott to sync/push to GitHub after every build so each task syncs cleanly.

## 2. Art Direction Lock

Rift Runners uses two intentional visual styles. Keep cutscenes and battlefield assets strictly separated.

### A. Story Cutscenes (Paused Until Final Static Pass)

**Cutscene pause**: do not create or regenerate any cutscene images, narration or scripts until Mr. Scott says the rest of the build is finished. Cutscenes will be redone as static files as the last step.

Reference art lock for that final cutscene pass (anchored by `/src/assets/images/cutscene_opening_warden_1795457392314.jpg`):

- **Style**: Semi-realistic dark-fantasy painterly digital illustration with smooth atmospheric brushwork, cinematic lighting, and rich depth.
- **Hard Ban**: Zero thick black comic-book ink outlines, zero cel-shading, zero cartoon proportions.
- **Mandatory Image Reference**: When the final static cutscene pass begins, every cutscene generation call MUST pass `/src/assets/images/cutscene_opening_warden_1795457392314.jpg` in `ImagePaths` so character faces, clothing, and brushwork remain locked.
- **Canonical Cast and Props**:
  - **The Rift Warden**: Red-haired woman with hair pulled back, faint facial scars, steel shoulder pauldrons over a dark teal-green hooded ranger coat with crossed brown leather straps, carrying a twisted wooden staff topped with a glowing cyan crystal.
  - **The Runner (Player)**: Hooded teenager seen from behind or three-quarter back, wearing a dark backpack and a glowing cyan runic wristband on the left wrist.
  - **The Rift Anchor**: Tall carved dark stone obelisk monolith with a glowing cyan runic orb set into its center.
- **Known Drift Note**: World 2, Level 1 (`Ashgate Outpost`) cutscenes were initially generated with thick black comic outlines before this rule was written down; any refresh waits for the final static cutscene pass.

### B. Battlefield Maps (2.5D Hand-Inked Illustrated)

- **Format**: 16:9 widescreen top-down 2.5D hand-inked illustrated battlefield matching the active biome (lush dark forest for World 1, glowing volcanic iron foundry and lava channels for World 2, sunlit alpine emerald terraces for World 3).
- **Road and Free Placement (`freePlacement: true`)**: Clear winding path from Rift Spawn to the Rift Anchor. All levels across Worlds 1, 2, and 3 use open-terrain Free Placement so ranged towers can be built anywhere on valid off-road ground (respecting `riverUv` and per-level `noBuildZones`) and trail defenders snap smoothly anywhere along the path. New maps from World 3 onward should be illustrated with open buildable terrain and zero painted stone pads.
- **HUD Clearance**: Leave the bottom-left area free of key road curves or tower pads so the horizontal Rift Locks bar stays clear.
- **Letterbox Color**: Match the outer canvas letterbox in `src/App.tsx` to the active biome (`#1b3a22` for World 1, `#1c1210` for World 2, `#0e1c2b` for World 3).

### C. Battlefield Sprites (Enemies and Towers)

- **Format**: 1:1 square hand-inked sprite isolated on a pure `#FFFFFF` white background so canvas white-keying removes the backdrop cleanly.
- **Facing Direction**: Verify facing orientation against `CanvasBattleEngine.ts` (`flipX`) so enemies march facing forward along the lane.

## 3. Writing, Copy, and Classroom-Safety Rules

Follow these rules in all game text, cutscene scripts, UI labels, docs, and chat replies:

1. **Zero em dashes**: Never use the em dash character anywhere. Use commas, colons, parentheses, or separate sentences.
2. **Avoid "not X, it's Y" phrasing**: State what something is directly instead of using "not X, it's Y" contrasts.
3. **Never begin a paragraph with the word "On"**: Rephrase paragraph openings so none start with "On".
4. **Classroom-Safe Word Audit**: Review every real word and nonsense rune for unintended slang, profanity, or awkward homophones before shipping (for example, `shid`, `chem`, and `chod` were replaced with `shib`, `chep`, and `chot` in World 2 Level 1).
5. **Wave Pacing Lock (`waveEvery <= 15`)**: Keep `waveEvery` at `7` to `8` words (strictly `15` maximum) between waves across campaign levels across `5` to `7` escalating waves (`minWaves`), with one-third slower attacker speeds and matching one-third lower defender weapon damage so students get time to build up Free Placement defenses while keeping reading momentum brisk.
6. **Teacher Mode Lock**: Student screens show no test or setup tools. Every new test, preview or unlock tool goes behind Teacher Mode.

## 4. Speech Verification and Calibration Rules (`src/lib/speech.ts`)

Spoken reading is checked live via `/api/speech/check` in `server.ts`, which proxies server-to-server to the Cloudflare Worker (`https://rift-runners-speech.jimmaoscott.workers.dev`) running Azure Pronunciation Assessment. Zero student audio is ever stored or logged.

### A. Mic Capture and Zero-Penalty Recovery

- **Instant SFX Mute**: Opening the mic immediately silences ringing Web Audio battle SFX via `fxMasterGain` (`duck(2)` in `src/lib/audio.ts`) so game sounds never trigger the mic.
- **VAD Hardening**: 80ms pre-roll buffer, ignore first 90ms click transient, 6-frame cold-mic warmup, require 3 consecutive voice frames to start, `650ms` trailing silence (`endSilenceMs`), and `4200ms` max capture (`maxListenMs`).
- **Alignment-Drop Protection**: If Azure returns a forced-alignment collapse or clipped onset (`word <= 30`, `vowel <= 30`, `maxCons <= 35`, `minCons <= 5`), trigger a clean zero-penalty retry (`again`) that preserves the student's streak and crystals.

### B. Multi-Voice Pre-Ship Benchmark Protocol

Before marking any new phonics target complete, test spoken words against live Azure Speech across at least four voice and mic profiles (standard female, deeper male `-4` semitones, higher teen `+3` semitones, and noisy Chromebook mic) plus adversarial sound-swap pairs to confirm real reads pass and target-sound mistakes are caught.

### C. Calibrated Scoring Cutoffs (`scoreAzureWord`)

- **Base Short Vowels (`SPEECH_SCORE_CONFIG`)**: `vowelMin: 52`, `vowelClearMiss: 60`, `consonantAvgMin: 35`, `consonantEachMin: 8`, `wordMin: 40`. Includes Gulf Coast `pin`/`pen` nasal merger support and soft unreleased final stop/nasal support (`SOFT_FINAL_NEIGHBORS`).
- **`sh` (`/ʃ/`) and `ch` (`/tʃ/`)**: Miss if score `< 70`, or if swapped with a neighbor (`tʃ`/`s`/`ʒ` for `sh`; `ʃ`/`s`/`t`/`dʒ` for `ch`) and score `< 82`.
- **Unvoiced `th` (`/θ/`, e.g., `thin`)**: Miss if score `< 48`, or if heard as `t` and score `< 65`.
- **Voiced `th` (`/ð/`, e.g., `this`)**: Miss if score `< 55`, or if heard as `d`/`z`/`v`/`t` and score `< 75`.
- **`wh` (`/w/`, e.g., `whip`)**: Miss if score `< 50`, or if heard as anything other than `w` and score `< 70`.
- **Final `-ck` (`/k/`, e.g., `lock`)**: Miss if score `< 55`, or if heard as `g`/`t`/`p`/`d` and score `< 72`.
- **Initial L-blends and R-blends (`bl`, `cl`, `fr`, `gr`, etc.)**: Checks both the opening consonant (`leadFloor: 34`, `24` with grace; `leadSwapFloor: 95`, `84` with grace when top heard consonant differs) and liquid `/l/` or `/ɹ/` (`liqBaseFloor: 42`, `30` with grace; `liqSwapFloor: 92`, `82` with grace when top heard liquid differs; plus dropped-liquid single-consonant transcription catch such as `back` for `black` or `fog` for `frog` when liquid score `< 84`), honoring Personal Voice Profiles and Speech Accommodations.
- **Initial S-blends (`sp`, `st`, `sc`, `sk`, `sm`, `sn`, `sw`)**: Checks both `/s/` (`sFloor: 40`, `28` with grace) and the second consonant (`secondFloor: 42`, `30` with grace; `swapFloor: 86`, `76` with grace), plus single-consonant drop catches (`pin`/`sin` for `spin`, `top`/`sop` for `stop` when score `< 88`), honoring Spanish L1 epenthesis and Personal Voice Profiles.
- **Final Blends (`-nd`, `-mp`, `-nt`, `-nk`, `-ft`, `-lt`)**: Checks both the first coda consonant (`firstFloor: 36`, `26` with grace) and final stop (`secondFloor: 28`, `20` with grace; `swapFloor: 84`, `74` with grace), allowing soft unreleased final stops when top-2 NBest matches place of articulation, plus dropped-consonant catches (`had` for `hand`, `cap` for `camp`, `bam` for `bamp`).
- **Silent-E Long Vowels (`a_e`, `i_e`, `o_e`, `u_e`)**: Maps VCe targets directly to long-vowel IPA (`eɪ`, `aɪ`, `oʊ`, `u`), forbids short-vowel swaps (`æ`, `ɪ`, `ɑ`, `ʌ`), and explicitly catches dropped-e short-vowel transcriptions (`cap` for `cape`, `tap` for `tape`, `bit` for `bite`, `pin` for `pine`, `kit` for `kite`, `mad` for `made`) when the long vowel scores `< 84` (`< 74` with grace).

### D. Adaptive Quick Voice Check and Personal Voice Profiles

- **Zero Upfront Friction**: Students who pass words cleanly never see voice calibration screens.
- **Trigger Rule**: After 3 cumulative genuine spoken misses on the same phonics pattern in the current level (ignoring silence, mic errors, and alignment drops), `RuneForgePanel.tsx` pauses the wave cleanly (`onRuleHold(true)`) and opens `QuickVoiceCheckModal.tsx` focused on that sound and the missed word. It opens automatically at most once per sound per battle.
- **2-Step Contrast Calibration (`calibratePatternFromSamples`)**: If a student misses the target word (for example, `ship`), Step 2 asks them to say its contrast word (`chip`). If their voice clearly separates the two sounds (for example, a lisp, regional accent, or quiet Chromebook mic scoring lower than standard Azure norms while keeping `ch` distinct), the game saves a personalized `PatternVoiceProfile` (`rift_runners_voice_profiles_v1`) with a custom scoring floor and verified non-contrast speech signature.
- **Explicit Speech & ELL Accommodations (`saveSpeechAccommodation` and `saveWordVoiceOverride`)**: When a student has a consistent speech articulation pattern (for example, saying `"rust"` for `"rush"`) or an L1 transfer pattern (for example, a native Spanish speaker whose `"ch"` comes out as `"sh"`), `QuickVoiceCheckModal.tsx` offers two clear one-click adaptations right after a miss:
  1. **Word-Level Voice Fit** (`rift_runners_word_voices_v1`): Saves that exact spoken variant (`"rust"` -> `"rush"`) so future encounters with that word pass automatically and display `[word voice fit]`.
  2. **Sound-Level Voice Fit** (`mode: 'accommodation'`, `allowContrastOverlap: true`): Adapts all words sharing that phonics sound (for example, accepting `"sh"` on `"ch"` words like `chip`, `chop`, `chum`) while STILL grading the vowel and every other consonant strictly (so saying `"shop"` for `"chip"` still misses on the vowel).
- **Clear Notifications & Management**: Saving any voice fit shows an immediate confirmation banner, displays `Voice fit on` / `Word voice fit on` in the Rune Forge voice bar, notes `(matched your voice profile)` when triggered, and lists every active sound and word adaptation with individual `Remove` controls inside `SettingsModal -> Voice Verification`.
- **Dedicated `Español / ELL Support` Menu (`EllSupportModal.tsx`, `src/data/ellSpanish.ts`)**: Accessible from a compact `Español` button beside `RUNE FORGE`, in the Title header, inside the Cutscene header, and in Settings (keeping Settings uncluttered). All Spanish translations and plain-English glosses live in a single reviewable file (`src/data/ellSpanish.ts`) for easy review by native Spanish speakers. Includes a one-tap `Full Spanish ELL Support` preset plus five live individual controls:
  - **Spanish L1 Voice Fit** (`rift_runners_spanish_l1_v1`): Adapts `ch`/`sh`, short `i`/`ee` (`/ɪ/` -> `/i/`), `v`/`b`, `th` (`/θ/` -> `t`/`s`/`f`, `/ð/` -> `d`/`z`/`t`), and initial `s`-blend epenthesis (`estop` for `stop`) while grading every other sound in the word strictly (`[Spanish L1 fit]`).
  - **Slow Blend Audio (`sound.speakWordSlow`)**: Adds a compact `Slow` sound-by-sound blend button next to the word speaker inside the Rune Forge that highlights each letter tile as its pure human phoneme plays, then plays the blended whole word.
  - **Spanish Meanings & Tap-for-Meaning Glosses**: Shows tappable Spanish translations and cognates under real words inside the Rune Forge, reveals a compact plain-English meaning on tap, and marks nonsense runes as `Runa mágica · palabra inventada`.
  - **Bilingual Sound Rule Tips (`SoundRuleModal.tsx`)**: Adds a `Puente en español` mouth-placement and English-to-Spanish sound bridge card with Spanish audio inside every Sound Rule popup.
  - **Dual-Language Captions (`CutscenePlayer.tsx`, `BattleHUD.tsx`, `App.tsx`)**: Displays Spanish subtitles beneath English lines across all shipped cutscenes, Level 1 walkthrough steps (with Spanish tap-to-hear audio), defender cards, upgrade and specialty popovers, hero power tooltips, placement guidance, and victory milestone prompts.
  - **Accommodation Snapshot & Copyable Teacher Notes (`metrics.ts`, `ResultsScreen.tsx`, `SettingsModal.tsx`)**: Records active ELL supports, reading/display supports, saved voice adaptations, and in-battle support usage (`Audio help`, `Slow Blend`, `Spanish meanings`, `Voice-fit matches`) on every battle record, with one-click `Copy Teacher Note` / `Copy Progress Note` buttons formatted for IEP, ELL, and PLAAF logs.

## 5. Audio, Voice Acting, and Direct Instruction Rules

- **Preferred Voice for Narration and Word Readings (`Leda`)**: Use `Leda` as the default voice for ALL new word readings (World 2 onward and any future word bank additions), walkthrough narration, and zero-schwa pure phonemes (new cutscene narration is paused until the final static cutscene pass). Mr. Scott explicitly prefers Leda over the older World 1 Level 1 word voice. Store pre-cached Gemini TTS clips as 64 kbps mono `.mp3` files in `public/assets/audio/tts-cache/` (with `.wav` fallback supported at runtime) and pack all word clips into `public/assets/audio/words/sprite.mp3`.
- **TTS Quota Hygiene**: Batch words into a single Gemini TTS request with pauses and split locally with Python to avoid `429 RESOURCE_EXHAUSTED` cooldowns, then convert to 64 kbps mono `.mp3` and store permanently in `public/assets/audio/`.
- **Zero-Schwa Pure Phoneme Clips**: Sound Rule cards must play clean isolated human phonemes with zero trailing "uh" schwa. Slice pure phonemes directly from Leda's spoken word audio, verify at 95+ on live Azure Speech, and register `snd:<pattern>` in `public/assets/audio/words/manifest.json` (which supports both packed `sprite.mp3` slices and standalone `.mp3` paths).
- **Sound Rule Narration**: Keep rule scripts focused on the sound and anchor word with zero trailing letter-spelling cues.
- **Rune TTS Overrides**: Register phonetic TTS overrides in `src/lib/audio.ts` whenever a nonsense rune might be misread by TTS.

## 6. Repository Hygiene and GitHub Sync Rules

- **Primary Public Repo**: `jimmaoscott-lang/rift-runners-studio` (`main`). Both `jimmaoscott-lang/rift-runners-studio` and `jimmaoscott-lang/rift-runners` are public; never commit any student data to either repo.
- **GitHub Sync File-Count and Size Lock**: Keep total tracked repository files well under `150` files and under `15 MB`. AI Studio's GitHub sync uploads changed files individually over the GitHub API and fails when a commit carries hundreds of tiny files (653 files failed; packing audio into sprites at 106 files and 8.6 MB pushed cleanly).
- **Audio Sprite Packing Rule**: Pack word clips, pure phonemes, and UI cues into the two Web Audio sprites (`public/assets/audio/words/sprite.mp3` and `public/assets/audio/ui/sprite.mp3`) using `[startSec, durationSec]` entries in their `manifest.json` files instead of adding dozens of loose individual MP3 files.
- **Image and Voice Compression Rule**: Optimize new images before pushing (maps max `1400px` wide, cutscenes max `1280px` wide, sprites max `512px` square) and convert cached `.wav` narrations in `public/assets/audio/tts-cache/` to 64 kbps mono `.mp3`.
- **Screenshot Cleanup**: Keep `public/assets/aistudio/` in `.gitignore` and delete temporary chat screenshots before pushing.
- **Secrets Rule**: Never commit API keys or secrets; reference variables only through `.env.example`.
- **Push Reminder Rule**: Remind Mr. Scott to sync/push to GitHub after every build so each task has a clean recovery point.

