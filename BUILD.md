# Rift Runners: Project Directions

Read this file together with `docs/DESIGN.md` and `docs/SESSION-LOG.md` before building any new level, cutscene, defender, enemy, or phonics skill. Whenever a rule, cutoff, art standard, or level milestone changes, update these files in the same turn so decisions carry cleanly from level to level.

## 1. Mandatory Pre-Build and Post-Build Workflow

1. **Before building**: Read `BUILD.md`, `docs/DESIGN.md`, and the latest entries in `docs/SESSION-LOG.md`.
2. **During building**: Follow every art, gameplay, speech, audio, and writing lock in this file.
3. **Before calling a level complete**:
   - Run the multi-voice Azure speech benchmark (Section 4) for every new phonics sound.
   - Extract and verify zero-schwa pure human phoneme clips (Section 5).
   - Run `npm run lint` (`tsc --noEmit`) and `npm run build` (`vite build`).
4. **After building**: Record shipped work, visual or scoring adjustments, and next steps in `docs/SESSION-LOG.md`, and update `docs/DESIGN.md` and `README.md` status.
5. **After Mr. Scott's checks pass**: Remind Mr. Scott to sync/push the verified milestone to GitHub before starting the next big set of changes.

## 2. Art Direction Lock

Rift Runners uses two intentional visual styles. Keep cutscenes and battlefield assets strictly separated.

### A. Story Cutscenes (Painterly Dark Fantasy)

Every opening, victory, and defeat cutscene must match the canonical World 1 painterly style anchored by `/src/assets/images/cutscene_opening_warden_1795457392314.jpg`.

- **Style**: Semi-realistic dark-fantasy painterly digital illustration with smooth atmospheric brushwork, cinematic lighting, and rich depth.
- **Hard Ban**: Zero thick black comic-book ink outlines, zero cel-shading, zero cartoon proportions.
- **Mandatory Image Reference**: Every cutscene generation call MUST pass `/src/assets/images/cutscene_opening_warden_1795457392314.jpg` in `ImagePaths` so character faces, clothing, and brushwork remain locked.
- **Canonical Cast and Props**:
  - **The Rift Warden**: Red-haired woman with hair pulled back, faint facial scars, steel shoulder pauldrons over a dark teal-green hooded ranger coat with crossed brown leather straps, carrying a twisted wooden staff topped with a glowing cyan crystal.
  - **The Runner (Player)**: Hooded teenager seen from behind or three-quarter back, wearing a dark backpack and a glowing cyan runic wristband on the left wrist.
  - **The Rift Anchor**: Tall carved dark stone obelisk monolith with a glowing cyan runic orb set into its center.
- **Known Drift Note**: World 2, Level 1 (`Ashgate Outpost`) cutscenes were initially generated with thick black comic outlines before this rule was written down. Future World 2 cutscenes and any `w2-l1` refresh must follow the painterly cast lock above.

### B. Battlefield Maps (2.5D Hand-Inked Illustrated)

- **Format**: 16:9 widescreen top-down 2.5D hand-inked illustrated battlefield matching the active biome (lush dark forest for World 1, glowing volcanic iron foundry and lava channels for World 2).
- **Road and Tower Pads**: Clear winding path from Rift Spawn to the Rift Anchor, with painted flat stone tower pads beside the road.
- **HUD Clearance**: Leave the bottom-left area free of key road curves or tower pads so the horizontal Rift Locks bar stays clear.
- **Letterbox Color**: Match the outer canvas letterbox in `src/App.tsx` to the active biome (`#07100c` for World 1, `#1c1210` for World 2).

### C. Battlefield Sprites (Enemies and Towers)

- **Format**: 1:1 square hand-inked sprite isolated on a pure `#FFFFFF` white background so canvas white-keying removes the backdrop cleanly.
- **Facing Direction**: Verify facing orientation against `CanvasBattleEngine.ts` (`flipX`) so enemies march facing forward along the lane.

## 3. Writing, Copy, and Classroom-Safety Rules

Follow these rules in all game text, cutscene scripts, UI labels, docs, and chat replies:

1. **Zero em dashes**: Never use the em dash character anywhere. Use commas, colons, parentheses, or separate sentences.
2. **Avoid "not X, it's Y" phrasing**: State what something is directly instead of using "not X, it's Y" contrasts.
3. **Never begin a paragraph with the word "On"**: Rephrase paragraph openings so none start with "On".
4. **Classroom-Safe Word Audit**: Review every real word and nonsense rune for unintended slang, profanity, or awkward homophones before shipping (for example, `shid`, `chem`, and `chod` were replaced with `shib`, `chep`, and `chot` in World 2 Level 1).

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

## 5. Audio, Voice Acting, and Direct Instruction Rules

- **Mentor Voice**: Default to `Leda` (pre-cached Gemini TTS clips stored as 64 kbps mono `.mp3` files in `public/assets/audio/tts-cache/`, with `.wav` fallback supported at runtime).
- **TTS Quota Hygiene**: Batch words into a single Gemini TTS request with pauses and split locally with Python to avoid `429 RESOURCE_EXHAUSTED` cooldowns, then convert to 64 kbps mono `.mp3` and store permanently in `public/assets/audio/`.
- **Zero-Schwa Pure Phoneme Clips**: Sound Rule cards must play clean isolated human phonemes with zero trailing "uh" schwa. Slice pure phonemes directly from Leda's spoken word audio, verify at 95+ on live Azure Speech, and register `snd:<pattern>` in `public/assets/audio/words/manifest.json` (which supports both packed `sprite.mp3` slices and standalone `.mp3` paths).
- **Sound Rule Narration**: Keep rule scripts focused on the sound and anchor word with zero trailing letter-spelling cues.
- **Rune TTS Overrides**: Register phonetic TTS overrides in `src/lib/audio.ts` whenever a nonsense rune might be misread by TTS.

## 6. Repository Hygiene

- Keep `public/assets/aistudio/` ignored in `.gitignore` and clear unused draft images before syncing to GitHub so repository size and file count stay lean (AI Studio's GitHub sync works best under ~150 files).
- Optimize new images before committing (maps max `1400px` wide, cutscenes max `1280px` wide, sprites max `512px` square) and convert cached `.wav` voice clips to 64 kbps mono `.mp3` so GitHub single-commit syncs stay well under payload limits.
- Never commit API keys or secrets; reference variables only through `.env.example`.
- Remind Mr. Scott to push to GitHub after changes pass his checks so every verified milestone has a clean recovery point.
