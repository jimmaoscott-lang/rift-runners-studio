# Rift Runners: Game Design and World Roadmap

This document holds the core game design, pedagogical rules, economy numbers, tower roster, and multi-world roadmap for Rift Runners. Update this file whenever gameplay numbers, unlocked content, or planned levels change.

## 1. Core Pillars and Pedagogical Guardrails

- **Target Audience**: High school struggling readers who deserve a mature dark-fantasy tower-defense game with respectful tone and real strategy.
- **Reading Powers Defense**: Decoding real words and nonsense runes in the Rune Forge generates crystals to place and upgrade defenders while enemy waves advance.
- **Zero Reading Timers**: Students never face a ticking clock on an individual word card. They decode at their own pace while managing battlefield waves.
- **Zero Negative Feedback**: Missed reads never deduct crystals, damage the Anchor, or trigger harsh failure buzzers. Calm retry cues and guided sound help keep students moving forward.
- **Sticky Rift Locks**: Each level displays target phonics locks in the bottom-left bar. Once sealed, a lock stays sealed for that run and never regresses unless manually cleared. While open locks remain, 75% of Rune Forge draws focus on the remaining open locks.
- **Emergent Bilingual and Accessibility Support**: Includes optional Spanish translations, cognate hints, human audio pronunciation (preferring `Leda` for all new word banks and narration), pure phoneme Sound Rule cards, selectable mentor voices, and high-contrast readable typography.
- **Adaptive Quick Voice Check (Shipped)**: Keeps Speak Mode completely frictionless for students who pass words cleanly. Only after 3 consecutive spoken misses on the same phonics pattern does the game pause waves and offer a quick single-sound check with plain-English coaching, optional per-sound Mic Grace for accents or noisy Chromebooks, and one-tap switching to Listen & Pick. Also available on demand from Settings.

## 2. Difficulty Tiers (`DIFFICULTIES` in `src/data/level1.ts`)

| Tier | Enemy HP Mult | Enemy Speed Mult | Notes |
| :--- | :---: | :---: | :--- |
| Easy | `0.76` | `0.92` | About 30% lighter waves so students can focus on decoding |
| Normal | `0.84` | `0.95` | About 20% lighter than Expert; balanced steady runs |
| Hard | `0.92` | `0.98` | About 10% lighter than Expert; rewards smart upgrades |
| Expert | `1.00` | `1.00` | Full original wave strength for veteran Rift Runners |

## 3. Rune Forge Economy (`FORGE_CONFIG` in `src/data/level1.ts`)

- **Real word reward**: `12` crystals
- **Nonsense rune reward**: `25` crystals
- **Speak Mode bonus**: `18` crystals
- **Guided help share**: `0.3` (30% crystal payout when audio help is used)
- **Word cards displayed**: `3` simultaneous options
- **Mega Charge**: Triggers at `8` streak pips (`megaPips: 8`), granting `115` crystals plus a `25`-damage battlefield blast (`megaBlast: 25`)
- **Rift Lock Seal Bonus**: Sealing any Rift Lock immediately awards `+100` bonus crystals (`lockBonus: 100`) with a gold-and-cyan crystal burst at the Anchor, a chime, and a floating bonus badge above the Rift Locks bar
- **Fast-guess guard**: `1500ms` threshold, cooldown `5s` first / `10s` later
- **Wave Pacing Cap (`waveEvery <= 15`)**: Every level uses `10` words between waves (strictly `15` maximum) paired with `3` to `4` minimum waves (`minWaves`) and calibrated Rift Lock targets (`9/10` on Level 1, `10/11` on 2-lock stages, `7/8` on 3-lock and 4-lock stages, `5/6` to `6/7` on 5-lock stages) so locks seal naturally right before the Final Wave while keeping gameplay snappy and engaging.
- **Playtest Simulation Tools**: Keep the 10-word Playtest buttons (`Fluent`, `Steady`, `Guided`) available in the Rune Forge for fast pacing and crystal balance testing.

## 4. Defenders and Hero Powers

### Active Defenders (`src/data/level1.ts`)

1. **Archer Tower** (`Sharpshooter Tower` / `Volley Tower`)
2. **Spike Pit** (`Blade Pit` / `Tar Pit`)
3. **Stone Golem** (`Mountain Golem` / `Quake Golem`)
4. **Frost Totem** (`Glacier Totem` / `Blizzard Totem`)
5. **Ember Cannon** (`Inferno Mortar` / `Cinder Repeater`, unlocked after World 1, Level 1)
6. **Tesla Spire** (`Storm Conduit` / `Overcharge Beam`, unlocked after World 1, Level 4)
7. **Rail Turret** (`Piercing Rail` / `Shatter Coil`, armor-piercing electromagnetic turret + 6-slot Side Loadout Selector, unlocked in World 2, Level 2)
8. **Gravity Snare** (`Singularity Well` / `Stasis Anchor`, vortex trail trap pulling ground and flying enemies backward, unlocked in World 2, Level 4)

### Hero Powers

- **Rally** (tower attack speed boost)
- **Meteor** (targeted area damage strike)
- **Time Freeze** (temporary global enemy freeze)

## 5. World 1: The Thornwood (Short Vowels)

Status: **Complete (Levels 1 to 5 Shipped)**

| Level | ID | Name | Phonics Focus | Enemies | Unlocks / Notes |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `w1-l1` | Thornwood Edge | Short `a`, short `i` + runes | Rift Wisps, Thornbacks | Core 4 defenders; unlocks Ember Cannon |
| 2 | `w1-l2` | Bramble Crossing | Short `o`, short `u` + runes | Rift Wisps, Thornbacks, Bramble Stalkers | Opens Hollow Bridge |
| 3 | `w1-l3` | Hollow Bridge | Short `e`, short `i` + runes | Rift Bats (flying), Thornbacks, Bramble Stalkers | Anti-air pressure; opens Sunless Ruins |
| 4 | `w1-l4` | Sunless Ruins | All 5 short vowels (`a, e, i, o, u`) + runes | Rift Splitters, Rift Bats, Bramble Stalkers | Unlocks Tesla Spire and Boss stage |
| 5 | `w1-l5` | Thornking's Heart | Boss Finale: all 5 short vowels + runes | Ironbark Brutes, Rift Splitters, The Thornking | Unlocks World 2: The Sunken Foundry |

## 6. World 2: The Sunken Foundry (Digraphs and Blends)

Status: **Complete (Levels 1 to 5 Shipped)**

| Level | ID | Name | Status | Phonics Focus | Enemies | Unlocks / Notes |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `w2-l1` | Ashgate Outpost | **Shipped** | `sh`, `ch` digraphs + runes | Cinder Imps, Rift Bats, Bramble Stalkers | Playtested and cleared on Hard. Pure Leda `snd:sh` and `snd:ch` phoneme clips shipped; multi-voice Azure calibrated. |
| 2 | `w2-l2` | Smelter Causeway | **Shipped** | `th` (unvoiced + voiced), `wh`, `-ck` digraphs + runes | Shieldbearers (armored), Cinder Imps, Bramble Stalkers | Unlocks Rail Turret + 6-slot Side Loadout Selector. Leda audio, Spanish ELL support, and multi-voice Azure cutoffs active. |
| 3 | `w2-l3` | Ironrift Crossing | **Shipped** | Initial L-blends and R-blends (`bl`, `cl`, `fr`, `gr`) + runes | Rift Shriekers (armored flyers), Shieldbearers, Cinder Imps | Anti-air + armor challenge across all 7 defenders. Multi-voice Azure blend calibration, Leda audio, painterly cutscenes, and Spanish ELL support active. |
| 4 | `w2-l4` | Crucible Bastion | **Shipped** | Initial S-blends and final blends (`sp`, `st`, `nd`, `mp`) + runes | Forge Weavers (healers/shielders), Rift Shriekers, Shieldbearers | Unlocks Gravity Snare and The Furnace Core boss finale. Multi-voice Azure S-blend/final-blend calibration, Leda audio, painterly cutscenes, and Spanish ELL support active. |
| 5 | `w2-l5` | The Furnace Core | **Shipped** | Boss Finale: World 2 digraphs and blends (`sh`, `th`, `bl`, `st`, `mp`) + runes | The Iron Warden (Boss), Forge Weavers, Rift Shriekers, Shieldbearers | Full 8-defender World 2 toolkit finale with Iron Aegis shield slams and Cinder Imp summons. |

## 7. Approved Feature Backlog

1. **World 2, Level 1 Painterly Cutscene Refresh**: Regenerate the `w2-l1` opening, victory, and defeat cutscenes using `/src/assets/images/cutscene_opening_warden_1795457392314.jpg` as the visual anchor so they match World 1's painterly style and canonical Rift Warden/Runner cast.
2. **Optional World 1 Level 1 Word Voice Refresh**: Because Mr. Scott prefers the Leda voice used in World 2 word readings, World 1 Level 1's older recorded words can be refreshed to Leda in a future pass if desired.
