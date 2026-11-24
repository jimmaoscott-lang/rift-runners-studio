# Rift Runners: Recovery and Local Setup Guide

This guide explains how to recover, run, and deploy Rift Runners from this GitHub repository if an environment is ever reset or moved.

## 1. Architecture Overview

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS 4, HTML5 Canvas battle engine (`src/engine/CanvasBattleEngine.ts`).
- **Backend Server (`server.ts`)**: Express server running on port `3000` (serves Vite middleware in dev and static `dist/` in production).
- **Live Speech Verification Proxy**: `server.ts` forwards `/api/speech/health` and `/api/speech/check` server-to-server to the live Cloudflare Worker at `https://rift-runners-speech.jimmaoscott.workers.dev` (which calls Azure Pronunciation Assessment). No Azure keys are stored in this repository, and zero student audio is stored or logged.
- **Narration and Word Audio**: Pre-recorded human word clips and pure zero-schwa phoneme clips are packed into `public/assets/audio/words/sprite.mp3` (indexed by `public/assets/audio/words/manifest.json`), used UI sound cues are packed into `public/assets/audio/ui/sprite.mp3` (indexed by `public/assets/audio/ui/manifest.json`), and pre-generated Gemini TTS (`Leda`) cutscene and rule narrations live in `public/assets/audio/tts-cache/` as 64 kbps mono MP3 clips (with `.wav` fallback). Runtime fallback TTS uses `/api/tts` when `GEMINI_API_KEY` is configured.

## 2. Key Directories and Files

- `README.md`: Repository landing page with status and links to all living documents.
- `BUILD.md`: Project directions, art style locks, speech calibration rules, audio standards, and writing constraints.
- `docs/`: Living project documentation (`DESIGN.md`, `SESSION-LOG.md`, `RECOVERY_AND_SETUP.md`).
- `server.ts`: Express server, Azure speech worker proxy, and Gemini TTS route with disk cache.
- `src/App.tsx`: Top-level world/level navigation, cutscenes, battlefield wrapper, and results screen flow.
- `src/data/level1.ts`: Master data file containing `DIFFICULTIES`, `FORGE_CONFIG`, `SPEECH_SCORE_CONFIG`, towers, enemies, word/rune pools, cutscenes, and `LEVELS` / `WORLDS` definitions.
- `src/engine/CanvasBattleEngine.ts`: 2.5D battlefield simulation, pathing, tower targeting, hero powers, and sprite rendering.
- `src/components/`: UI components (`RuneForge.tsx`, `BattleHUD.tsx`, `WorldMap.tsx`, `CutscenePlayer.tsx`, `ResultsScreen.tsx`, `SettingsModal.tsx`).
- `src/lib/speech.ts`: Mic capture, VAD, Azure scoring (`scoreAzureWord`), digraph cutoffs, and alignment-drop recovery.
- `src/lib/audio.ts`: Web Audio SFX (`fxMasterGain` ducking), word/phoneme clip playback, and phonetic TTS pronunciation overrides.
- `src/assets/images/`: Battlefield maps, cutscenes, and tower/enemy sprites.
- `public/assets/audio/`: Pre-baked word MP3s, pure phoneme clips, UI audio, and cached Leda WAV clips.

## 3. Environment Variables

Copy `.env.example` to `.env` when running outside AI Studio:

- `GEMINI_API_KEY`: Optional at runtime if all audio clips are already cached in `public/assets/audio/tts-cache/`; required to generate new Gemini TTS narrations on the fly.
- `APP_URL`: Public host URL when deployed.
- `PORT`: Defaults to `3000`.

## 4. Running and Building Locally

```bash
npm install
npm run dev
```

- Development server runs at `http://localhost:3000`.
- Type check: `npm run lint` (`tsc --noEmit`).
- Production build: `npm run build` (`vite build`), then start with `npm start` (`tsx server.ts`).

## 5. GitHub Backup Hygiene

- `.gitignore` excludes `node_modules/`, `dist/`, `.env*`, and `public/assets/aistudio/` (chat screenshot uploads) so temporary screenshots never bloat the repository or cause GitHub sync timeouts.
- Always keep `BUILD.md`, `docs/DESIGN.md`, and `docs/SESSION-LOG.md` committed alongside code changes so a fresh session or machine can resume with full art, gameplay, and speech context.
