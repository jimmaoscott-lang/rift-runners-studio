# Rift Runners

## Project Overview

Students play a dark-fantasy tower-defense adventure where decoding words powers their defenses. Across worlds they master phonics patterns from short vowels through digraphs and consonant blends, and boss battles build reading fluency. Support for emergent bilingual students, audio guidance, and classroom accessibility features are built in.

- Design: [docs/DESIGN.md](docs/DESIGN.md)
- Progress: [docs/SESSION-LOG.md](docs/SESSION-LOG.md)
- Project directions: [BUILD.md](BUILD.md)
- Recovery and setup: [docs/RECOVERY_AND_SETUP.md](docs/RECOVERY_AND_SETUP.md)

## Development Status

Play: [https://jimmaoscott-lang.github.io/rift-runners-studio/](https://jimmaoscott-lang.github.io/rift-runners-studio/)

Hold the Rift is a 2.5D illustrated tower defense powered by the Rune Forge. World 1 (The Thornwood, Levels 1 to 5) and World 2 (The Sunken Foundry, Levels 1 to 5, culminating in The Furnace Core boss finale) are fully playable, with live Azure Speak Mode, four difficulty tiers, eight defenders with a 6-slot Loadout selector, Spanish ELL accommodations, and Leda voice narration.

## Voice Verification Requirements

Spoken reading checks run through `/api/speech/check` in `server.ts`, which proxies server-to-server to the live Cloudflare Speech Worker (`https://rift-runners-speech.jimmaoscott.workers.dev`) using Azure Pronunciation Assessment. Zero student audio is stored or logged, and private GitHub repository visibility has zero impact on voice verification. Every new phonics target must pass a multi-voice Azure benchmark across four voice and mic profiles plus adversarial sound-swap pairs before shipping (full cutoffs and audio rules live in [BUILD.md](BUILD.md)).

