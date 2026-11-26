# Rift Runners: Session Log

Chronological log of major milestones, design decisions, bug fixes, speech calibrations, and next steps. Add a new entry at the top after every major build or change.

## 2026-11-26: World 2 Complete (Levels 4 & 5: Crucible Bastion & The Furnace Core Boss Finale)

### Completed
- **World 2, Level 4: `Crucible Bastion` (`src/data/level1.ts`, `src/game/sprites.ts`, `src/game/CanvasBattleEngine.ts`, `src/components/BattleHUD.tsx`)**:
  - Shipped playable `w2-l4` teaching initial S-blends and final blends (`sp`, `st`, `nd`, `mp`) with 24 classroom-safe real words, 8 clean nonsense runes (`spab`, `spog`, `steb`, `stug`, `fand`, `rond`, `bamp`, `zump`), 5 balanced waves (`waveEvery: 10`, `minWaves: 4`, `startCrystals: 265`), 11 measured tower pads, and 4 trail pads.
  - Added the **Forge Weaver** (`weaver`), a support caster (`hp: 155`, `armor: 0.2`) that pulses Golden Forge light to heal up to 3 nearby allies by 14% max HP and grant a 3-second `+25%` damage-reduction shield.
  - Added the **Gravity Snare** (`gravity`, `cost: 95`), a vortex trail trap targeting both ground and flying foes to pull enemies backward along the road, with Level 3 specialties **Singularity Well** (stronger pull plus 4-second armor shred) and **Stasis Anchor** (periodic complete freeze lock inside the vortex), prioritized alongside Rail Turret in the default 6-slot loadout (`src/App.tsx`).
- **World 2, Level 5: `The Furnace Core` Boss Finale (`src/data/level1.ts`, `src/game/sprites.ts`, `src/game/CanvasBattleEngine.ts`)**:
  - Shipped playable `w2-l5` wrapping all 5 World 2 locks (`sh`, `th`, `bl`, `st`, `mp`) across 25 curated review words, 10 curated runes, 5 finale waves (`waveEvery: 10`, `minWaves: 4`, `startCrystals: 280`, `bonusSurgeWaves: 0`), 10 molten-ring tower pads, and 4 trail pads.
  - Added **The Iron Warden** (`ironwarden`, World 2 Boss, `hp: 1180`, `armor: 0.45`, `slowResist: 0.35`, `isBoss: true`), featuring a molten furnace aura, `IRON WARDEN` boss nameplate, and periodic `IRON AEGIS!` warhammer slams that shield nearby escorts and summon bonus Cinder Imps.
- **Visual Assets, Leda Audio Packing, & Bilingual Spanish ELL (`src/assets/images/`, `public/assets/audio/`, `src/data/ellSpanish.ts`, `src/lib/audio.ts`)**:
  - Generated and web-compressed all 9 visual assets (`740 KB` total): 2.5D hand-inked maps for `Crucible Bastion` and `The Furnace Core`, `#FFFFFF`-keyed sprites for Forge Weaver, The Iron Warden, and Gravity Snare, and 4 painterly cast-locked opening and victory cutscenes anchored to the canonical World 1 Rift Warden reference.
  - Generated all 10 `w2-l4` and `w2-l5` Leda cutscene narrations as 64 kbps mono `.mp3` clips, packed all 4 remaining Sound Rule narrations (`rule.th.v2`, `rule.wh.v2`, `rule.ck.v2`, `rule.endblend.v2`) into `public/assets/audio/ui/sprite.mp3`, sliced pure zero-schwa blend phonemes (`snd:sp`, `snd:st`, `snd:nd`, `snd:mp`) from Leda's spoken words, and packed all 82 new words/runes/options/phonemes into `public/assets/audio/words/sprite.mp3` (`423` total English keys, `0` missing keys across all 10 levels).
  - Added Spanish rule bridges (`sp`, `st`, `nd`, `mp`), glosses for all 28 newly introduced real words, bilingual Gravity Snare and specialty translations, and Spanish subtitles for all 10 new cutscene beats.
- **Multi-Voice Azure S-Blend & Final-Blend Calibration (`src/lib/speech.ts`, `src/components/QuickVoiceCheckModal.tsx`, `BUILD.md`)**:
  - Added initial S-blend and final blend scoring in `scoreAzureWord()` and contrast calibration profiles (`spin`/`pin`, `stop`/`top`, `hand`/`had`, `camp`/`cap`) in `QuickVoiceCheckModal.tsx`.
  - Benchmarked live against Azure Speech across four voice and mic profiles (female, male `-4st`, teen `+3st`, Chromebook mic): `16/16` positive matches (`20/20` including `lamp`) and `7/7` adversarial blend drops caught (`pin->spin`, `sin->spin`, `top->stop`, `sop->stop`, `had->hand`, `cap->camp`, `bam->bamp`).

### Next Up
1. Playtest World 2, Level 4 (`Crucible Bastion`, Forge Weavers, Gravity Snare) and World 2, Level 5 (`The Furnace Core`, The Iron Warden boss finale), then push the completed World 2 milestone to GitHub.
2. Begin planning World 3 (Silent-E / Long Vowels) or refresh World 2 Level 1 cutscenes to match the painterly cast lock.

## 2026-11-25 (Part 6): Wave Pacing Rebalance (`waveEvery <= 15`, More Waves, Balanced Locks)

### Completed
- **Fixed `w2-l3` (`Ironrift Crossing`) 30-Word Gap & Starting Crystals (`src/data/level1.ts`)**:
  - Dropped `w2-l3` `waveEvery` from `30` down to `10` words between waves (establishing a strict `15`-word maximum across the entire game), raised `startCrystals` from `155` to `255` to match World 2 economy, and raised `minWaves` from `2` to `4` so players fight four full waves with `7/8` locks (`32` total reads across 4 blends) sealing naturally right before Wave 4.
- **Cross-Level Wave Rhythm & Lock Tuning (`src/data/level1.ts`, `src/game/CanvasBattleEngine.ts`)**:
  - Standardized `waveEvery: 10` across all shipped and upcoming levels (`w1-l1` through `w2-l5`) so every wave break stays quick, fun, and well under the 15-word ceiling.
  - Raised `minWaves` from `2` to `3` on `w1-l1` through `w1-l4`, `w2-l1`, and `w2-l2` (and `4` on `w2-l3` through `w2-l5`), and tuned 2-lock mastery on `w1-l2`, `w1-l3`, and `w2-l1` to `10/11` so Rift Locks seal cleanly right before the Final Wave while delivering more waves and more voice repetition.
  - Updated Bonus Surge wave-clear audio in `CanvasBattleEngine.ts` to use `battle.waveClear.${this.bonusWave}` so both wave-start and wave-clear announcements match the active bonus wave number.
- **Rift Lock Seal Bonus (`src/data/level1.ts`, `src/game/CanvasBattleEngine.ts`, `src/App.tsx`, `src/components/BattleHUD.tsx`)**:
  - Added `FORGE_CONFIG.lockBonus = 100` so every time a student seals any Rift Lock, they immediately earn `+100` bonus crystals with a gold-and-cyan shockwave burst at the Rift Anchor, floating battlefield callout, chime, toast banner, and a golden `+100` popup badge over the Rift Locks bar (with per-run deduplication so each lock pays once cleanly).
- **Locked Pacing Rule in Living Docs (`BUILD.md`, `docs/DESIGN.md`)**:
  - Added the permanent `waveEvery <= 15` (`10` standard, `3` to `4` minimum waves) pacing guardrail to `BUILD.md` and `docs/DESIGN.md`.

### Next Up
1. Playtest the updated 10-word / multi-wave rhythm across World 2, Level 3 (`Ironrift Crossing`) and earlier levels, then push to GitHub once verified.
2. Build World 2, Level 4: `Crucible Bastion` (initial S-blends and final blends `sp`, `st`, `nd`, `mp`, Forge Weavers, Gravity Snare, and multi-voice Azure S-blend/final-blend calibration).

## 2026-11-25 (Part 5): World 2, Level 3 (`Ironrift Crossing`), Armored Flying Rift Shriekers, and Live Playtest Fixes

### Completed
- **World 2, Level 3: `Ironrift Crossing` (`src/data/level1.ts`, `src/game/sprites.ts`, `src/game/CanvasBattleEngine.ts`, `src/components/BattleHUD.tsx`)**:
  - Shipped playable `w2-l3` teaching initial L-blends and R-blends (`bl`, `cl`, `fr`, `gr`) with 24 real words, 8 classroom-safe nonsense runes (`blap`, `bleg`, `clep`, `clug`, `frab`, `frep`, `grem`, `grob`), 5 tuned anti-air plus armor waves, 10 measured tower pads, and 4 bridge trail spots.
  - Added the **Rift Shrieker** (`shrieker`), an armored flying wyvern-gargoyle (`hp: 105`, `speed: 2.35`, `flying: true`, `armor: 0.4`) with elevated hover bob, banking flight tilt, ember-violet sparks, ground contact shadow, and shield icon beside its elevated HP bar.
  - Generated and web-compressed the custom 2.5D hand-inked Ironrift Crossing gorge map, pure-white Rift Shrieker sprite, and painterly cast-locked opening and victory cutscenes anchored to the canonical World 1 Rift Warden artwork.
- **Multi-Voice Azure Blend Calibration (`src/lib/speech.ts`, `src/components/QuickVoiceCheckModal.tsx`, `BUILD.md`)**:
  - Added initial L-blend and R-blend scoring (`bl`, `cl`, `fr`, `gr`, plus other initial L/R blends) checking both lead consonant and liquid `/l/` or `/ɹ/` while honoring Personal Voice Profiles and Speech Accommodations.
  - Benchmarked live against Azure Speech across four voice and mic profiles (female, male `-4st`, teen `+3st`, and Chromebook mic) for `black`, `clap`, `frog`, and `grab` (`16/16` matched) plus 6 adversarial single-consonant drops (`back->black`, `cap->clap`, `lock->block`, `fog->frog`, `gab->grab`, `rock->frock`, `6/6` caught).
  - Added `bl`, `cl`, `fr`, and `gr` contrast calibration profiles (`black`/`back`, `clap`/`cap`, `frog`/`fog`, `grab`/`gab`) to `QuickVoiceCheckModal.tsx`.
- **Leda Audio Packing & Spanish ELL Support (`public/assets/audio/`, `src/data/ellSpanish.ts`, `src/lib/audio.ts`, `server.ts`)**:
  - Generated all 5 `w2-l3` Leda cutscene `.mp3` clips plus shared `Leda_rule-rule-blend-v2.mp3`, synthesized zero-schwa blend phonemes (`snd:bl`, `snd:cl`, `snd:fr`, `snd:gr`), and packed all 44 new words/runes/options into `public/assets/audio/words/sprite.mp3` (`341` total keys, `0` missing across all 8 shipped levels).
  - Added `gemini-3.8-flash-tts` and `gemini-3.8-live` Leda fallbacks in `server.ts` so live TTS stays resilient under free-tier daily caps.
  - Added Spanish rule bridges (`bl`, `cl`, `fr`, `gr`), glosses for all 24 `w2-l3` words, and Spanish captions for all 5 `w2-l3` cutscene beats in `src/data/ellSpanish.ts`.
- **Live GitHub Pages Playtest Fixes (`src/lib/assetUrl.ts`, `src/lib/audio.ts`, `src/components/BattleHUD.tsx`, `src/game/CanvasBattleEngine.ts`)**:
  - **Fixed robotic AI narrator on Sound Rule cards**: Made `assetUrl()` idempotent so pre-cached `Leda_rule-*.mp3` files are never double-prefixed on GitHub Pages (`/rift-runners-studio/rift-runners-studio/...`), fixed concurrent `init()` manifest race loading, and added a Leda static cache fallback when another mentor voice is selected.
  - **Fixed clipped Level 3 specialty upgrade menu**: Positioned the Level 3 specialty picker vertically centered beside the selected tower with viewport height clamping so both specialties (such as Piercing Rail and Shatter Coil, even with Spanish captions on) and the Sell button remain fully visible.
  - **Fixed Bonus Surge wave audio announcement**: Switched Bonus Surge announcements in `CanvasBattleEngine.ts` to use `battle.waveStart.${this.bonusWave}` so Bonus Wave 2 of 3 announces Wave 2 instead of the cumulative wave number.

### Next Up
1. Playtest World 2, Level 3 (`Ironrift Crossing`) and verify the three GitHub Pages playtest fixes, then push to GitHub once verified.
2. Build World 2, Level 4: `Crucible Bastion` (initial S-blends and final blends `sp`, `st`, `nd`, `mp`, Forge Weavers, Gravity Snare, and multi-voice Azure S-blend/final-blend calibration).

## 2026-11-25 (Part 4): World 2, Level 2 (`Smelter Causeway`), Shieldbearers, Rail Turret, and Loadout Selector

### Completed
- **World 2, Level 2: `Smelter Causeway` (`src/data/level1.ts`, `src/game/sprites.ts`, `src/components/BattleHUD.tsx`)**:
  - Shipped playable `w2-l2` teaching `th` (unvoiced and voiced), `wh`, and `-ck` digraphs with 22 real words, 9 classroom-safe nonsense runes (`thab`, `thip`, `thog`, `whep`, `whib`, `whum`, `teck`, `bick`, `zock`), 5 tuned waves, 10 hand-measured stone build pads, and 4 viaduct trail spots.
  - Generated and compressed the custom 2.5D hand-inked Smelter Causeway viaduct map plus painterly cast-locked opening and victory cutscenes anchored to the World 1 Rift Warden reference.
- **Armored Enemy: Shieldbearer (`src/data/level1.ts`, `src/game/CanvasBattleEngine.ts`)**:
  - Added the armored `shieldbearer` enemy (`45%` damage reduction against standard non-piercing hits, with amber shield-deflect sparks and a live shield icon beside its HP bar that cracks cyan when shredded).
  - Updated Meteor and Mega Forge shockwaves to pierce armor cleanly alongside Rail Turret shots.
- **New Defender: Rail Turret + 6-Slot Battle Loadout Selector (`src/data/level1.ts`, `src/game/CanvasBattleEngine.ts`, `src/App.tsx`, `src/lib/audio.ts`)**:
  - Added the electromagnetic `rail` defender prioritizing armored enemies and bosses, with Level 3 specialties **Piercing Rail** (line-piercing beam hitting up to 4 foes) and **Shatter Coil** (heavy armor-cracking round that shreds shields for 5 seconds).
  - Added a clean `Loadout` button and 6-slot selector modal whenever more than 6 defenders are unlocked so the bottom defender bar stays uncluttered on 15-inch Chromebooks as World 2 adds more towers.
- **Audio and Bilingual Spanish ELL Coverage (`src/data/ellSpanish.ts`, `public/assets/audio/`)**:
  - Generated Leda Sound Rule clips (`th`, `wh`, `ck`) and all 5 `w2-l2` cutscene narrations as compact 64 kbps mono `.mp3` files, and packed `w2-l2` words and runes into `public/assets/audio/words/sprite.mp3`.
  - Added Spanish glosses for all 22 `w2-l2` real words, bilingual Rail Turret and specialty descriptions, and Spanish captions for all 5 `w2-l2` cutscene beats.

### Next Up
1. Playtest World 2, Level 2 (`Smelter Causeway`), Rail Turret upgrades, and the 6-slot Loadout picker, then push to GitHub once verified.
2. Build World 2, Level 3: `Ironrift Crossing` (L-blends and R-blends `bl`, `cl`, `fr`, `gr`, armored flying Rift Shriekers, and multi-voice Azure blend calibration).

## 2026-11-25 (Part 3): ELL Batch 3 (Accommodation Snapshot) and 15-Inch Chromebook Layout Polish

### Completed
- **15-Inch Chromebook & Desktop Layout Polish (`RuneForgePanel.tsx`, `SoundRuleModal.tsx`)**:
  - Moved the pattern label, `Slow` blend button, and word speaker into a dedicated flex header row inside the Rune Forge target word card so the `Slow` button never overlaps letter tiles or large words.
  - Widened `SoundRuleModal` to `max-w-2xl`, paired the phoneme tiles beside the whole-word button, tightened vertical spacing, and added `max-h-[92dvh] overflow-y-auto` so the Sound Rule lesson card sits comfortably centered with breathing room on 15-inch Chromebooks and wider monitors even with Spanish bridge tips turned on.
- **ELL Batch 3: Accommodation Snapshot for Teacher / IEP / ELL Notes (`metrics.ts`, `RuneForgePanel.tsx`, `App.tsx`, `ResultsScreen.tsx`, `SettingsModal.tsx`)**:
  - Added per-battle tracking for `slowBlendUsed`, `meaningTapped`, and `voiceFitMatches` alongside `help`, saving a structured `AccommodationSnapshot` on every completed `BattleRecord`.
  - Added an **Accommodation Snapshot (Teacher / IEP Note)** card to `ResultsScreen` showing active ELL supports, reading/display supports, saved voice adaptations, in-battle support usage, and a one-click **`Copy Teacher Note`** button.
  - Added a **Teacher Progress & Accommodation Snapshot** section to `SettingsModal` showing current active supports, the last 5 completed sessions with their active accommodations, and a one-click **`Copy Progress Note`** button formatted for IEP, ELL, and PLAAF logs.

### Next Up
1. Playtest the end-of-battle `Copy Teacher Note` button and Settings `Copy Progress Note` summary, then push this completed ELL suite to GitHub.
2. Build World 2, Level 2: `Smelter Causeway` (`th`/`wh`/`-ck`, Shieldbearer enemy, Rail Turret + Side Loadout Selector), or refresh World 2 Level 1 cutscenes to match the World 1 painterly style.

## 2026-11-25 (Part 2): ELL Batch 2 (Bilingual Sound Rules, Tap-for-Meaning Glosses, and Dual-Language Captions)

### Completed
- **Centralized Spanish Bilingual Data (`src/data/ellSpanish.ts`)**:
  - Placed every Spanish sound rule tip, real-word gloss, defender name and specialty description, hero power description, walkthrough step, and cutscene subtitle in a single file so a native Spanish-speaking colleague can review or refine all text in one place.
  - Covered 100% of shipped real words across World 1 (Levels 1 to 5) and World 2 Level 1 (74 words), all 10 phonics patterns (`a`, `e`, `i`, `o`, `u`, `sh`, `ch`, `th`, `wh`, `ck`), all 6 defenders and 12 specialties, all 3 hero powers, all 7 walkthrough steps, and all 31 shipped cutscene beats.
- **Bilingual Sound Rule Tips (`src/components/SoundRuleModal.tsx`)**:
  - Added a `Puente en español` panel inside Sound Rule modals when `settings.spanishRules` is enabled, giving mouth/tongue placement cues, an English-to-Spanish sound bridge, and an `Escuchar` Spanish audio button.
- **Tap-for-Meaning Glosses & Nonsense Rune Tag (`src/components/RuneForgePanel.tsx`)**:
  - Upgraded the Rune Forge word card when `settings.spanish` is enabled: tapping the Spanish word under any real word speaks it in Spanish and reveals a compact plain-English meaning gloss, while nonsense runes display `Runa mágica · palabra inventada` so ELL readers distinguish invented runes from real vocabulary.
- **Dual-Language Captions (`src/components/CutscenePlayer.tsx`, `src/components/BattleHUD.tsx`, `src/App.tsx`)**:
  - Added Spanish subtitles beneath English lines in all cutscenes (plus a quick `Español` button in the cutscene header), Level 1 walkthrough steps (with Spanish audio playback), bottom defender cards, defender upgrade and Level 3 specialty popovers, hero power tooltips, placement guidance, last-word warnings, and the Victory Milestone card.
- **Full 5-Switch `Español / ELL Support` Menu (`src/components/EllSupportModal.tsx`)**:
  - Activated all 5 switches (`spanishL1Voice`, `slowBlendAudio`, `spanish`, `spanishRules`, `spanishCaptions`) under the `Full Spanish ELL Support` master preset.

### Next Up
1. Playtest ELL Batch 2 (Sound Rule Spanish bridge, Rune Forge tap-for-meaning glosses, and dual-language captions) and push to GitHub once verified.
2. Build ELL Batch 3: Accommodation Snapshot in the End-of-Battle and Teacher Progress summary for IEP/ELL notes.

## 2026-11-25: Español / ELL Support Menu and Batch 1 (Spanish L1 Voice Fit + Slow Blend Audio)

### Completed
- **Dedicated `Español / ELL Support` Modal (`src/components/EllSupportModal.tsx`)**:
  - Added a compact **`Español`** button directly beside `RUNE FORGE` in the battle sidebar header (pausing the wave cleanly when opened), in the Title screen top bar (before cutscenes start), and as a single clean launcher row inside `SettingsModal` to reduce Settings clutter.
  - Included a one-tap **Full Spanish ELL Support** preset (`Soporte completo en español`) alongside individual toggles and a clean preview of upcoming Batch 2 features (Bilingual Sound Rule Tips and Spanish Captions).
- **One-Click Spanish L1 Voice Fit (`src/lib/speech.ts`)**:
  - Added persisted `spanishL1Voice` mode synced with `speech.setSpanishL1Mode(...)`.
  - Adapts five predictable Spanish-to-English sound transfers while continuing to grade every other vowel and consonant strictly: `ch`/`sh` overlap, short `i` stretching toward `/i/` (`ee`), `v`/`b` overlap, `th` (`t`/`s`/`f` for `/θ/`, `d`/`z`/`t` for `/ð/`), and opening `s`-blend epenthesis (`estop` for `stop`).
  - Tags matched reads with `[Spanish L1 fit]` in the live score line and displays `Spanish L1 fit` in the Rune Forge voice bar.
- **Slow Blend Audio Playback (`src/lib/audio.ts`, `src/components/RuneForgePanel.tsx`)**:
  - Added `sound.speakWordSlow(word, tiles, onTileIdx)` using the existing pure human phoneme clips (`snd:*`) packed in `words/sprite.mp3`, playing each sound clearly with steady spacing and live cyan tile highlighting before blending into the full word.
  - Placed the compact `Slow` button neatly beside the word speaker inside the Rune Forge target word card whenever `slowBlendAudio` is active.

### Next Up
1. Playtest the `Español` button, Spanish L1 Voice Fit, and Slow Blend Audio, then push this verified checkpoint to GitHub.
2. Build ELL Batch 2: Bilingual Sound Rule Tips (Spanish mouth placement + audio), Tap-for-Meaning Glosses on real words, and Dual-Language Captions for cutscenes, walkthrough tips, and tower cards.
3. Build ELL Batch 3: Accommodation Snapshot in the End-of-Battle and Teacher Progress summary.

## 2026-11-24 (Part 2): Adaptive Quick Voice Check, Personal Voice Profiles, and Leda Voice Lock

### Completed
- **Built Adaptive Quick Voice Check (`src/components/QuickVoiceCheckModal.tsx`)**:
  - Added structured plain-English speech diagnostics (`pass`, `quiet`, `vowel_swap`, `digraph_swap`, `borderline`, `consonant`, `unclear`), raw observed phoneme tracking, and persisted **Personal Voice Profiles** (`rift_runners_voice_profiles_v1`) plus manual Mic Grace to `src/lib/speech.ts`.
  - Built 2-step Contrast Calibration (`calibratePatternFromSamples`): when a student misses the target word (for example, `ship`), Step 2 listens to the contrast word (`chip`). If their voice clearly separates the two sounds (for example, a mild lisp, accent, or quiet mic), the game saves a personalized scoring floor and verified non-contrast speech signature for all words with that sound.
  - Added explicit **Speech & ELL Voice Accommodations**:
    - **Word-Level Voice Fit** (`rift_runners_word_voices_v1`): Students or teachers can save how a student says a specific word (for example, `"rust"` for `"rush"`) right from `QuickVoiceCheckModal` or the Settings Mic Tester so future encounters count as correct (`[word voice fit]`).
    - **Sound-Level Voice Fit** (`saveSpeechAccommodation` with `allowContrastOverlap: true`): Adapts an entire sound across all words (for example, a native Spanish speaker whose `"ch"` comes out as `"sh"`), accepting that sound while still grading the vowel and every other consonant strictly (`[voice fit]`).
  - Fixed a `useEffect` cleanup bug in `QuickVoiceCheckModal` that caused `azure: cancelled` immediately on starting the mic.
  - Wired automatic adaptive detection in `src/components/RuneForgePanel.tsx`: students who read cleanly experience zero upfront prompts; after 3 cumulative genuine spoken misses on the same phonics pattern within a level (ignoring silence, mic errors, and aligner glitches), the Rune Forge pauses the wave and opens `QuickVoiceCheckModal` for that sound and missed word (at most once automatically per sound per battle).
  - Added immediate green confirmation banners when a voice fit is saved, `(matched your voice profile)` feedback in the Rune Forge, a quiet **"Voice fit on"** / **"Word voice fit on"** indicator in the voice bar, and a **Saved Voice Adaptations** list with individual `Remove` buttons inside `src/components/SettingsModal.tsx`.
- **Updated Living Docs**:
  - Locked Mr. Scott's preference for the **Leda** voice across all future word readings in `BUILD.md` and `docs/DESIGN.md`.
  - Moved Adaptive Quick Voice Check from the backlog to shipped features in `docs/DESIGN.md`.

### Decisions Locked
- **Leda Preferred for Word Readings**: Mr. Scott prefers the Leda voice used in World 2 word readings over the older World 1 Level 1 voice. All future word banks (World 2 Level 2 onward) and any word refreshes will use Leda.
- **Speech & ELL Accommodation Guardrail**: Sound-level accommodations (like Spanish L1 `ch` to `sh`) adapt only the targeted consonant sound while continuing to grade vowels and remaining consonants strictly; word-level fits target specific articulation patterns (like final `-sh` to `-st`) and stay visible and removable in Settings.

### Next Up
1. Playtest Adaptive Quick Voice Check in Speak Mode and Settings, then push verified milestone to GitHub.
2. Optionally refresh World 2, Level 1 (`Ashgate Outpost`) cutscenes to match the World 1 painterly Rift Warden style.
3. Build World 2, Level 2: `Smelter Causeway` (`th`/`wh`/`-ck`, Shieldbearer enemy, Rail Turret + Side Loadout Selector).

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
  - Fixed two live GitHub Pages playtest issues: (1) baked pre-recorded Leda human audio for missing World 2 and World 1 words into `public/assets/audio/words/sprite.mp3` so static hosting never falls back to muddy browser `speechSynthesis` on words like `chot`/`shot`/`cot`, (2) fixed `scoreAzureWord` in `src/lib/speech.ts` so Azure's French loanword guess (`chott -> /ʃ/`) grades cleanly against the true English `/tʃ/` phonics target, and (3) replaced unsafe distractor `'fag'` in World 1 `fog` options.
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
