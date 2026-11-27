# Rift Runners: Session Log

Chronological log of major milestones, design decisions, bug fixes, speech calibrations, and next steps. Add a new entry at the top after every major build or change.

## 2026-11-27: Director Workflow Setup & Mr. Scott's Decisions Sync (`BUILD.md`)

### Completed
- **Director Repo Sync (`jimmaoscott-lang/rift-runners`)**:
  - Read `AI-STUDIO.md` and verified read access to `docs/STUDIO-PROMPTS.md` (confirmed prompt `S-01: Teacher lock for test and setup tools`).
  - Added the `Mr. Scott's decisions` section near the top of `BUILD.md` with all 11 settled decisions copied word for word from `AI-STUDIO.md`.
  - Added the prompt-workflow instruction line to Section 1 of `BUILD.md`: prompts come from `docs/STUDIO-PROMPTS.md` in `jimmaoscott-lang/rift-runners`, run only when Mr. Scott names a prompt, and check `AI-STUDIO.md` for new decisions before each task.
- **Resolved Conflicts with Older Rules in `BUILD.md`**:
  - **Repository visibility (Section 6)**: Old rule labeled `jimmaoscott-lang/rift-runners-studio` as "Primary Private Backup Repo". Updated to reflect that both repos are public and must never contain student data.
  - **Cutscene generation and narration (Sections 2A & 5)**: Old rules directed generating painterly cutscenes and Leda cutscene narration for new levels and World 2 refreshes. Updated both sections to enforce the Nov 27 cutscene pause (no new cutscene images, narration, or story scripts until the final static cutscene pass).
  - **GitHub sync cadence (Sections 1 & 6)**: Old wording reminded to push "before starting the next big set of changes" / "after changes pass his checks". Updated to match the decision to sync to GitHub after every build.
- **Zero game code modified** in this setup task.

### Next Up
1. Wait for Mr. Scott's instruction to run a named prompt (such as `Run S-01`).

## 2026-11-26 (Part 9): Strict Lava Pit & Terrain Exclusion Masking for Free Placement

### Completed
- **Pixel-Accurate Map Hazard Masking (`src/game/CanvasBattleEngine.ts`)**:
  - Added an offscreen `320x180` terrain mask sampled once when each level's battlefield artwork loads (`initTerrainMask()` + `sampleTerrainHazard()`), checking a 17-point disc under the tower's foundation footprint to automatically reject glowing molten lava pits and streams (World 2), river basins (World 1), and sky/cloud cliff drops (World 3) regardless of irregular bridge or pit shapes.
  - Added polygon exclusion support (`isInsideNoBuildPoly()` with `12px` edge clearance) alongside wider river clearance (`46px`) so tower bases never overlap cliff faces, lava rims, or ruined walls.
- **Visually Audited `noBuildPolys` Across All 11 Campaign Maps (`src/data/level1.ts`)**:
  - Audited every battlefield map (`w1-l1` through `w3-l1`) and traced exact polygon exclusion zones over under-bridge molten lava chasms (including `Smelter Causeway`'s central viaduct lava pit), foundry cranes and furnace walls, volcanic cliffs, deep canyon gorges, giant thorn chasms, ruined sanctuary walls, dense pine borders, boulders, and alpine cliff drop-offs while preserving full free placement on all open stone and grass terrain.

### Next Up
1. Playtest tower placement around lava pits, bridges, cliffs, and rivers (especially `Smelter Causeway`, `Ironrift Crossing`, `Crucible Bastion`, `The Furnace Core`, and `Dawnbreak Terrace`), then push to GitHub.
2. Continue World 3 with Level 2 (`o_e`, `u_e`).

## 2026-11-26 (Part 8): Enemy Damage & Control Resistances, DoT Bug Fix, & Gravity/Frost Rebalance

### Completed
- **Fixed Per-Frame DoT Rounding Exploit (`src/game/CanvasBattleEngine.ts`)**:
  - `damageCreature()` previously applied `Math.max(1, Math.round(mitigated))` on every animation frame for continuous DoT towers (`Blizzard Totem`, `Spike Pit`, `Gravity Snare`), turning 5 DPS into 60 DPS at 60 FPS (or 120 DPS on 120Hz displays) and letting 1 Blizzard + 1 Archer or 1 Singularity Well solo entire levels.
  - Added exact floating-point `isDot` damage subtraction with accumulated floating damage readouts (`dotAccum`) and removed hidden DPS multipliers on Spike Pit and Gravity Snare so tower DPS matches stats honestly across all refresh rates.
- **Gravity Snare & Frost Totem Rebalance (`src/data/level1.ts`, `src/game/CanvasBattleEngine.ts`)**:
  - Added a `5.5s` gravity pull recovery window (`pullImmuneTimer`) so no single Singularity Well can infinitely pull enemies backward until death, trimmed Gravity Snare DPS/slow/pull strength, and kept Singularity Well's armor-shredding tactical support role without armor-piercing DoT.
  - Made `Glacier Totem` and `Stasis Anchor` freezes respect enemy `slowResist` / `gravityResist`, boss freeze reduction (`0.45x`), and a `3.5s` post-freeze recovery window (`freezeImmuneTimer`), while Hero Power `Time Freeze` retains full impact.
- **Multi-Type Enemy Resistance Matrix & Visual Badges (`src/data/level1.ts`, `src/game/CanvasBattleEngine.ts`)**:
  - Added `gravityResist`, `fireResist`, `electricResist`, and `arrowResist` alongside `armor` and `slowResist` across the 13-creature roster: `Thornback` (25% arrow resist), `Bramble Stalker` (45% frost/slow resist), `Rift Splitter` (50% shock resist), `Ironbark Brute` (30% armor, 85% gravity resist), `The Thornking` (30% armor, 55% slow resist, 90% gravity resist), `Cinder Imp` (85% frost/slow resist, 65% fire resist), `Shieldbearer` (50% armor, 45% arrow resist, 50% gravity resist), `Rift Shrieker` (flying, 40% armor, 70% gravity resist), `Forge Weaver` (20% armor, 60% fire resist, 45% shock resist), `The Iron Warden` (50% armor, 65% slow resist, 95% gravity resist, 50% fire resist), and `Gale Wraith` (15% armor, 25% arrow resist, 50% shock resist, 90% gravity resist).
  - Rendered compact color-coded resistance pips (`I` Ice, `G` Gravity, `F` Fire, `Z` Shock, `A` Arrow) beside enemy HP bars and throttled floating resistance callouts (`FIRE RESIST`, `SHOCK RESIST`, `ARROW RESIST`, `FROST RESIST!`, `GRAV RESIST!`).
- **Richer Mixed-Resistance Waves (`src/data/level1.ts`)**:
  - Enriched `W2-L4`, `W2-L5`, and `W3-L1` (`Dawnbreak Terrace`) waves with combined mixes of `Cinder Imps`, `Shieldbearers`, `Gale Wraiths`, `Rift Shriekers`, `Forge Weavers`, `Rift Splitters`, and `Ironbark Brutes` plus firmer late-wave HP scaling so players must combine complementary towers and targeting modes.

### Next Up
1. Playtest World 2 (`Crucible Bastion`, `The Furnace Core`) and World 3 (`Dawnbreak Terrace`) with Gravity Singularity, Frost Blizzard/Glacier, and mixed defenses, then push to GitHub.
2. Continue World 3 with Level 2 (`o_e`, `u_e`).

## 2026-11-26 (Part 7): Tower Targeting Priority (First / Last / Strong)

### Completed
- **Per-Tower Targeting Engine (`src/game/CanvasBattleEngine.ts`)**:
  - Exported `TargetPriority` (`'first' | 'last' | 'strong'`) and added `targetMode` to `DefenderRuntime` and `SelectedDefenderInfo`.
  - Defaulted `Rail Turret` to `'strong'` (preserving its natural armored/boss sniping behavior while allowing manual override) and `Archer Tower`, `Ember Cannon`, and `Tesla Spire` to `'first'`.
  - Added unified `sortTargetsByPriority()` sorting across all 4 ranged targeting towers (`archer` including multi-shot, `ember`, `tesla` both Chain Lightning and Overcharge Beam, and `rail` with armored-target preference when set to `strong`).
  - Added `setSelectedTargetMode(mode)` which resets an active Overcharge Beam lock for immediate retargeting, plays tactile tap audio, floats a `TARGET: FIRST / LAST / STRONG` callout above the tower, and emits an updated HUD snapshot.
- **Tower Inspector Target Selector (`src/components/BattleHUD.tsx`, `src/App.tsx`)**:
  - Added a 3-button segmented **Target** selector (`First` / `Last` / `Strong`, with bilingual Spanish captions `Objetivo`: `Primero` / `Último` / `Fuerte` when enabled) inside the placed-tower popover for ranged towers (`archer`, `ember`, `tesla`, `rail`), omitting it on area/zone defenders (`spike`, `frost`, `gravity`, `golem`).

### Next Up
1. Playtest First / Last / Strong targeting across ranged towers (including multi-shot Archer, Overcharge Beam Tesla, and Rail Turret), then push the verified milestone to GitHub.
2. Continue World 3 with Level 2 (`o_e`, `u_e`).

## 2026-11-26 (Part 6): Bigger Multi-Stage Explosions & Layered Weapon Sound Effects

### Completed
- **Layered Web Audio Weapon & Explosion Sound Engine (`src/lib/audio.ts`)**:
  - Added a shared `DynamicsCompressorNode` limiter on `fxMasterGain` so simultaneous explosions sound huge without speaker clipping while preserving instant mic ducking (`duck(2)`).
  - Added a lazily cached broadband white-noise buffer and resonant filtered noise synthesizer (`noise()`) plus subtle pitch randomization so rapid shots stay organic and punchy.
  - Overhauled all weapon and combat SFX with distinct multi-layered synthesis: bowstring twang plus feathered whoosh (`arrow`), woody impact (`arrowHit`), heavy mortar launch (`cannonFire`), booming multi-layer fiery detonation (`cannon`/`explosion`), screaming sky-fall whistle (`meteorLaunch`), seismic megablast (`meteorImpact`), high-voltage electric arc crack-snap (`zap`), hypervelocity railgun chirp plus sonic boom (`rail`), seismic boulder crush (`golemSlam`), crystalline ice shatter (`frost`), metallic blade slice (`spike`), graviton vortex implosion (`gravity`), enemy shatter pops (`enemyDie`), and boss chain-detonations (`bossDie`).
- **Multi-Stage Explosions, Craters & Weapon VFX (`src/game/CanvasBattleEngine.ts`)**:
  - Added a dedicated `ExplosionFX` multi-lobe billowing fireball/plasma/frost/earth/gravity/boss explosion renderer (`drawExplosions`) with additive hot flash cores, directional streaking sparks (`streak`), rotating crystal/rock shrapnel (`shard`), rising dark smoke clouds (`smoke`), and fading glowing ground scorch craters (`drawCraters`).
  - Added live smoke-and-ember flight trails behind Ember Cannon shells and falling Meteors, fiery muzzle flash blasts on Ember Cannon and Rail Turret, secondary crackling lightning filaments on Tesla Spire and Rail Turret, tactile micro screen-shake on big impacts (respecting `focusMode`), and corrected the World 2 boss defeat callout to display `IRON WARDEN FALLS!`.

### Next Up
1. Playtest the upgraded explosions, craters, and layered weapon sound effects across World 1, World 2, and World 3, then push the verified milestone to GitHub.
2. Continue World 3 with Level 2 (`o_e`, `u_e`).

## 2026-11-26 (Part 5): 5-to-7 Wave Siege Expansion & One-Third Slower Combat Tempo

### Completed
- **One-Third Slower Attackers & Proportional Defender Damage (`src/data/level1.ts`)**:
  - Slowed all 13 creature types' movement `speed` by one-third (`~0.67x`) and scaled melee `hit` damage against Stone Golems (`~0.75x`) so battles feel readable and tactical instead of rushed.
  - Scaled all 8 defenders' `dmg` and `dps` values proportionally by one-third (`~0.67x`) across Levels 1 to 3 and both Level 3 Specialties (`archer`, `spike`, `golem`, `frost` Blizzard DPS, `ember`, `tesla`, `rail`, `gravity`), keeping damage-per-tile-traveled balanced alongside `HERO_POWERS.meteor.dmg` (`55`).
- **5-to-7 Wave Siege Arc Across All 11 Campaign Levels (`src/data/level1.ts`, `src/game/CanvasBattleEngine.ts`, `src/App.tsx`, `src/data/ellSpanish.ts`)**:
  - Expanded all 11 campaign stages (`w1-l1` through `w3-l1`) from `3` to `4` waves up to `5` to `7` handcrafted escalating waves (`minWaves`: `5` on `w1-l1` to `w1-l3`, `6` on `w1-l4` to `w2-l3`, `7` on `w2-l4`, `w2-l5`, and `w3-l1`) with bigger multi-group formations suited for Free Placement.
  - Tightened wave cadence to `waveEvery: 8` on World 1 and early World 2 (`w1-l1` to `w2-l3`) and `waveEvery: 7` on late World 2 and World 3 (`w2-l4`, `w2-l5`, `w3-l1`), while keeping `BASIC_TRAINING_LEVEL` as a fast placement battle (`waveEvery: 8`, `minWaves: 1`).
  - Updated the Level 1 walkthrough Step 5 copy (`8 words` / `8 palabras`) and the "All Rift Locks filled" toast in `CanvasBattleEngine.ts` to report remaining waves clearly when locks finish ahead of the Final Wave.

### Next Up
1. Playtest the calmer attacker pace, proportional tower damage, and longer 5-to-7 wave siege arc across World 1, World 2, and World 3, then push to GitHub once verified.
2. Continue World 3 with Level 2 (`o_e`, `u_e`).

## 2026-11-26 (Part 4): Runner Basic Training (Adaptive Phonics Placement Level) & Real Level Unlocking

### Completed
- **Runner Basic Training (`src/data/placement.ts`, `src/data/level1.ts`, `src/game/sprites.ts`, `src/game/CanvasBattleEngine.ts`, `src/App.tsx`)**:
  - Built a full playable Free Placement proving-grounds level (`id: 'placement'`, `worldId: 'training'`, `startCrystals: 145`, `waveEvery: 8`, `minWaves: 1`, core 4 defenders) with a custom sunlit proving-grounds battlefield (`map_basic_training_1795737203102.jpg`, `155 KB`) and cast-locked opening/victory briefing art (`cutscene_basic_training_1795737205953.jpg`, `98 KB`).
  - Implemented an 8-stage adaptive skill staircase covering every shipped skill (`a/i`, `o/u`, `e/CVC`, `sh/ch`, `th/wh/-ck`, `L/R Blends`, `S & End Blends`, `Silent-E a_e/i_e`) using 32 verified Leda-voiced words and nonsense runes (3 real + 1 rune per tier).
  - Clearing `>= 3/4` clean first-try reads on a tier triggers a golden-emerald Anchor celebration (`triggerPlacementTierClear`), grants `+75` bonus crystals, immediately saves newly opened campaign levels to `progress.placement`, and steps to the next skill tier.
  - Scoring `< 3/4` on a tier (or clearing all 8 tiers) settles with zero shame, opens the student's matched starting level, triggers the Final Graduation Wave, and switches the Rune Forge into confidence-zone practice words from their assigned level.
- **Real Campaign Level Unlocking, Placement HUD, & Teacher Controls (`src/lib/metrics.ts`, `src/components/TitleScreen.tsx`, `src/components/BattleHUD.tsx`, `src/components/RuneForgePanel.tsx`, `src/components/ResultsScreen.tsx`, `src/components/SettingsModal.tsx`)**:
  - Added `getUnlockedLevelIds(progress)` so campaign levels open progressively via Runner Basic Training, by beating prior levels, or all at once via the new **Unlock All Levels (Teacher Preview)** toggle in Settings (`settings.unlockAllLevels`), alongside a **Reset Placement** button.
  - Added a Runner Basic Training mission strip and lock/open/recommended indicators on the Title Screen while keeping locked levels clickable to preview with direct CTAs to Basic Training or Settings.
  - Added the compact 8-stage Placement Skill Ladder in `BattleHUD.tsx`, sequential tier progress line in `RuneForgePanel.tsx`, full Placement Report + `Start [Recommended Level]` button + copyable IEP/PLAAF `formatPlacementTeacherNote()` in `ResultsScreen.tsx`, and added the missing `gravity` defender thumbnail in `App.tsx`.
- **Leda Audio & Spanish ELL (`public/assets/audio/tts-cache/`, `src/data/ellSpanish.ts`)**:
  - Generated 4 Leda cutscene `.mp3` clips (`bt-open-v1-1`, `bt-open-v1-2`, `bt-vic-v1-1`, `bt-def-v1-1`) at 48 kbps mono with loudnorm and added bilingual Spanish cutscene subtitles in `SPANISH_CUTSCENE_CAPTIONS`.

### Next Up
1. Playtest Runner Basic Training (clearing early tiers, settling cleanly, checking Title Screen unlocks, ResultsScreen Placement Report, and Teacher Unlock All toggle), then push to GitHub.
2. Continue World 3 with Level 2 (`o_e`, `u_e`).

## 2026-11-26 (Part 3): Game-Wide Free Tower Placement & Rebuilt Level 1 Walkthrough

### Completed
- **Free Placement Across All 11 Levels (`src/data/level1.ts`, `src/game/CanvasBattleEngine.ts`, `src/components/TitleScreen.tsx`, `src/App.tsx`)**:
  - Enabled `freePlacement: true` across all 10 World 1 and World 2 levels (`w1-l1` through `w2-l5`) so every level in the game uses unified open-terrain ranged placement and smooth road snapping for trail defenders (`Spike Pit`, `Stone Golem`, `Gravity Snare`).
  - Audited all 10 World 1 and World 2 maps visually and configured biome-labeled `noBuildZones` (`Dense forest`, `Bramble thicket`, `Deep gorge`, `Ruin wall`, `Thorn chasm`, `Molten lava`, `Furnace core`) alongside automatic `riverPath` water and lava checks (`38px` clearance) and tuned trail clearance (`36px`).
  - Updated `CanvasBattleEngine.ts` to highlight the glowing cyan trail immediately as soon as a trail defender is selected (before hovering onto the canvas), use biome-neutral placement hints across all worlds, and skip legacy static pads whenever `freePlacement` is active.
  - Updated bottom-bar placement prompts, Spanish placement hints, Battle Loadout labels (`Open ground` / `On trail`), and level card skill tags across `App.tsx` and `TitleScreen.tsx`.
- **Rebuilt Level 1 Tutorial Walkthrough & Opening Briefing (`src/App.tsx`, `src/components/BattleHUD.tsx`, `src/data/level1.ts`, `src/data/ellSpanish.ts`, `public/assets/audio/tts-cache/`)**:
  - Rewrote Level 1 walkthrough Steps 2, 3, 6, and 7 (plus Spanish translations in `SPANISH_WALKTHROUGH_STEPS`) to teach green-ring open-ground placement, right-click cancel, trail snapping with the remaining `45` crystals, selling to reposition, and the `+100` Rift Lock crystal bonus.
  - Bumped the walkthrough audio cache key (`walkthrough-free-step-${stepNum}`) in `BattleHUD.tsx` so voiced walkthrough tips read the new steps cleanly.
  - Updated Level 1 opening briefing beat 2 (`l01-open-v2-2`, English and Spanish) and refreshed `Leda_l01-open-v2-2.mp3` so the Rift Warden directs recruits to open ground beside the trail.

### Next Up
1. Playtest the rebuilt Level 1 walkthrough and Free Placement across World 1, World 2, and World 3, then push the verified milestone to GitHub.
2. Continue World 3 with Level 2 (`o_e`, `u_e`).

## 2026-11-26 (Part 2): World 3, Level 1 (`Dawnbreak Terrace`) & Free Tower Placement

### Completed
- **Free Tower Placement System (`src/data/level1.ts`, `src/game/CanvasBattleEngine.ts`, `src/App.tsx`, `src/components/TitleScreen.tsx`)**:
  - Added `freePlacement?: boolean` and `noBuildZones` to `LevelConfig` so World 3 levels allow open-terrain placement while World 1 and World 2 pad-based levels remain untouched.
  - Implemented live placement previews in `CanvasBattleEngine.ts` with a translucent defender ghost sprite, emerald or rose attack-range circle, oval ground footprint ring, invalid-spot reason badge (`On road`, `Too close`, `Cliff`, `Off terrace`), and right-click placement cancel.
  - Added smooth road-polyline snapping (`SmoothPath.nearestPoint()`) for trail defenders (`Spike Pit`, `Stone Golem`, `Gravity Snare`), dynamic build-pad creation on placement, and automatic pad cleanup when selling towers.
- **World 3, Level 1: `Dawnbreak Terrace` (`src/data/level1.ts`, `src/game/sprites.ts`, `src/game/CanvasBattleEngine.ts`, `src/components/BattleHUD.tsx`)**:
  - Launched **World 3: The Silver Spires** with playable `w3-l1` (`Dawnbreak Terrace`, `freePlacement: true`), teaching Silent-E long vowels (`a_e`, `i_e`) across 20 classroom-safe real words, 8 clean VCe nonsense runes (`bape`, `dake`, `zate`, `mave`, `bipe`, `zime`, `tibe`, `kide`), 5 balanced waves (`waveEvery: 10`, `minWaves: 3`, `startCrystals: 260`), and sky-indigo World 3 UI styling (`#0e1c2b` letterbox).
  - Added the **Gale Wraith** (`galewraith`, `hp: 96`, `speed: 2.05`, `armor: 0.1`), a wind-cloaked alpine spirit that surges forward with a periodic `GALE DASH!` (`1.85x` speed for `1.15s` every `4.8s` unless slowed, frozen, or held) with cyan slipstream particles.
  - Generated and web-compressed all 4 visual assets (`437 KB` total): open-terrain 2.5D Dawnbreak Terrace alpine map (zero painted stone pads), pure-white Gale Wraith sprite, and painterly cast-locked opening and victory cutscenes.
- **Silent-E Phonics Teaching, Multi-Voice Azure Calibration, Leda Audio, & Spanish ELL (`src/lib/speech.ts`, `src/lib/audio.ts`, `src/components/RuneForgePanel.tsx`, `src/components/SoundRuleModal.tsx`, `src/components/QuickVoiceCheckModal.tsx`, `src/data/ellSpanish.ts`, `public/assets/audio/`)**:
  - Added paired Silent-E tile highlighting (`a` + silent `e`, `i` + silent `e`) and slow-blend audio skipping of the silent `e` across `RuneForgePanel.tsx`, `SoundRuleModal.tsx`, and `audio.ts`.
  - Added Silent-E (`a_e`, `i_e`, `o_e`, `u_e`) vowel scoring and dropped-e short-vowel rejection in `scoreAzureWord()`, plus `cape`/`cap` and `bite`/`bit` calibration profiles in `QuickVoiceCheckModal.tsx`.
  - Benchmarked live against Azure Speech across four voice and mic profiles (female, male `-4st`, teen `+3st`, Chromebook mic): `16/16` positive matches (`cape`, `tape`, `bite`, `pine`) and `6/6` adversarial short-vowel drops caught (`cap->cape`, `tap->tape`, `bit->bite`, `pin->pine`, `kit->kite`, `mad->made`).
  - Generated all 5 `w3-l1` Leda cutscene `.mp3` clips, packed missing Sound Rule clips (`rule.magice.v1`, `rule.sh.v2`, `rule.ch.v2`, `rule.blend.v2`) into `ui/sprite.mp3`, and packed all 53 new words/runes/options plus pure long-vowel phonemes (`snd:a_e`, `snd:i_e`) into `words/sprite.mp3` at 48 kbps mono (`478` total English keys, `0` missing across all 11 levels).
  - Added Spanish Silent-E tips (`a_e`, `i_e`), glosses for all 20 `w3-l1` real words, and Spanish captions for all 5 `w3-l1` cutscene beats in `src/data/ellSpanish.ts`.

### Next Up
1. Playtest World 3, Level 1 (`Dawnbreak Terrace`) Free Placement, Gale Wraith dashes, and Silent-E voice checks, then push to GitHub once verified.
2. Decide whether Free Placement stays a World 3 unlockable reward or expands to World 1 and World 2, then build World 3, Level 2 (`o_e`, `u_e`).

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
