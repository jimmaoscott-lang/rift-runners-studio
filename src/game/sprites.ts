import { LevelId } from '../data/level1';
import { assetUrl } from '../lib/assetUrl';

export type SpriteKey =
  | 'archer'
  | 'spike'
  | 'golem'
  | 'frost'
  | 'ember'
  | 'tesla'
  | 'rail'
  | 'gravity'
  | 'thornback'
  | 'wisp'
  | 'bramble'
  | 'bat'
  | 'splitter'
  | 'brute'
  | 'thornking'
  | 'cinderimp'
  | 'shieldbearer'
  | 'shrieker'
  | 'weaver'
  | 'ironwarden'
  | 'warden';

export interface SpriteAsset {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  dataUrl: string;
}

export interface GameSpriteBank {
  map: HTMLImageElement;
  maps: Record<LevelId, HTMLImageElement>;
  sprites: Record<SpriteKey, SpriteAsset>;
}

export const MAP_IMAGE_URL = '/src/assets/images/map_thornwood_edge_1795459979542.jpg';

export const MAP_URLS: Record<LevelId, string> = {
  'w1-l1': '/src/assets/images/map_thornwood_edge_1795459979542.jpg',
  'w1-l2': '/src/assets/images/map_bramble_crossing_1795467449380.jpg',
  'w1-l3': '/src/assets/images/map_hollow_bridge_1795470435009.jpg',
  'w1-l4': '/src/assets/images/map_sunless_ruins_1795470434690.jpg',
  'w1-l5': '/src/assets/images/map_thornking_heart_1795470435461.jpg',
  'w2-l1': '/src/assets/images/map_w2_l1_ashgate_1795525102099.jpg',
  'w2-l2': '/src/assets/images/map_w2_l2_smelter_causeway_1795606908338.jpg',
  'w2-l3': '/src/assets/images/map_w2_l3_ironrift_crossing_1795608963074.jpg',
  'w2-l4': '/src/assets/images/map_w2_l4_crucible_bastion_1795713145019.jpg',
  'w2-l5': '/src/assets/images/map_w2_l5_furnace_core_1795713148001.jpg',
};

export const SPRITE_URLS: Record<SpriteKey, string> = {
  archer: '/src/assets/images/sprite_archer_tower_1795459978495.jpg',
  spike: '/src/assets/images/sprite_spike_pit_1795459979609.jpg',
  golem: '/src/assets/images/sprite_stone_golem_1795459980272.jpg',
  frost: '/src/assets/images/sprite_frost_totem_1795459978997.jpg',
  ember: '/src/assets/images/sprite_ember_cannon_1795467448994.jpg',
  tesla: '/src/assets/images/sprite_tesla_spire_1795474930821.jpg',
  rail: '/src/assets/images/sprite_rail_turret_1795606909483.jpg',
  gravity: '/src/assets/images/sprite_gravity_snare_1795713153066.jpg',
  thornback: '/src/assets/images/sprite_thornback_1795459978268.jpg',
  wisp: '/src/assets/images/sprite_rift_wisp_1795459979373.jpg',
  bramble: '/src/assets/images/sprite_bramble_stalker_1795467449198.jpg',
  bat: '/src/assets/images/sprite_rift_bat_1795470435199.jpg',
  splitter: '/src/assets/images/sprite_rift_splitter_1795470433781.jpg',
  brute: '/src/assets/images/sprite_ironbark_brute_1795470435150.jpg',
  thornking: '/src/assets/images/sprite_thornking_boss_1795470435149.jpg',
  cinderimp: '/src/assets/images/sprite_cinder_imp_1795525101831.jpg',
  shieldbearer: '/src/assets/images/sprite_shieldbearer_1795606908368.jpg',
  shrieker: '/src/assets/images/sprite_rift_shrieker_1795608970938.jpg',
  weaver: '/src/assets/images/sprite_forge_weaver_1795713147323.jpg',
  ironwarden: '/src/assets/images/sprite_iron_warden_boss_1795713149232.jpg',
  warden: '/src/assets/images/sprite_rift_warden_1795459980237.jpg',
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = assetUrl(url);
  });
}

/**
 * Removes the pure white studio background around an ink-outlined illustrated sprite
 * using 4-edge BFS flood fill so interior white/cyan highlights remain 100% intact,
 * applies a soft 1px anti-aliased edge de-fringe, and trims transparent margins.
 */
function cutoutWhiteBackground(img: HTMLImageElement, maxDim = 320): SpriteAsset {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const w = Math.max(1, Math.round((img.naturalWidth || maxDim) * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || maxDim) * scale));

  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const ctx = work.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { canvas: work, width: w, height: h, dataUrl: '' };
  }
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const total = w * h;
  const bgMask = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qHead = 0;
  let qTail = 0;

  const isNearWhite = (idx: number): boolean => {
    const o = idx * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const minC = Math.min(r, g, b);
    const maxC = Math.max(r, g, b);
    // Pure or near-white neutral pixels outside the dark ink outline
    return minC >= 220 && maxC - minC <= 28;
  };

  const enqueue = (idx: number) => {
    if (visited[idx]) return;
    visited[idx] = 1;
    if (isNearWhite(idx)) {
      bgMask[idx] = 1;
      queue[qTail++] = idx;
    }
  };

  // Seed flood fill from all 4 outer borders
  for (let x = 0; x < w; x++) {
    enqueue(x);
    enqueue((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    enqueue(y * w);
    enqueue(y * w + (w - 1));
  }

  while (qHead < qTail) {
    const idx = queue[qHead++];
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) enqueue(idx - 1);
    if (x < w - 1) enqueue(idx + 1);
    if (y > 0) enqueue(idx - w);
    if (y < h - 1) enqueue(idx + w);
  }

  // Clear exterior background pixels
  for (let i = 0; i < total; i++) {
    if (bgMask[i]) {
      data[i * 4 + 3] = 0;
    }
  }

  // 2-pass gentle edge feather & white-matte decontamination on border pixels adjacent to transparency
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (bgMask[idx]) continue;
        const o = idx * 4;
        if (data[o + 3] === 0) continue;

        const touchesBg =
          bgMask[idx - 1] ||
          bgMask[idx + 1] ||
          bgMask[idx - w] ||
          bgMask[idx + w];

        if (!touchesBg) continue;

        const r = data[o];
        const g = data[o + 1];
        const b = data[o + 2];
        const minC = Math.min(r, g, b);
        const maxC = Math.max(r, g, b);
        const lum = (r + g + b) / 3;

        if (lum > 185 && maxC - minC < 36) {
          // Softly blend residual anti-aliased white halo into transparent
          const factor = Math.max(0, Math.min(1, (242 - lum) / 68));
          data[o + 3] = Math.round(data[o + 3] * factor);
          // De-matte RGB slightly toward dark ink
          data[o] = Math.max(0, Math.round(r * 0.72));
          data[o + 1] = Math.max(0, Math.round(g * 0.72));
          data[o + 2] = Math.max(0, Math.round(b * 0.74));
          if (data[o + 3] < 24) {
            data[o + 3] = 0;
            bgMask[idx] = 1;
          }
        } else if (minC > 140 && pass === 0) {
          // Subtle darkening of light edge fringes
          data[o] = Math.round(r * 0.9);
          data[o + 1] = Math.round(g * 0.9);
          data[o + 2] = Math.round(b * 0.9);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Compute tight non-transparent bounding box
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    return { canvas: work, width: w, height: h, dataUrl: work.toDataURL('image/png') };
  }

  const pad = 2;
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(w - sx, maxX - minX + 1 + pad * 2);
  const sh = Math.min(h - sy, maxY - minY + 1 + pad * 2);

  const trimmed = document.createElement('canvas');
  trimmed.width = sw;
  trimmed.height = sh;
  const tctx = trimmed.getContext('2d');
  if (tctx) {
    tctx.drawImage(work, sx, sy, sw, sh, 0, 0, sw, sh);
  }

  let dataUrl = '';
  try {
    dataUrl = trimmed.toDataURL('image/png');
  } catch {
    dataUrl = '';
  }

  return {
    canvas: trimmed,
    width: sw,
    height: sh,
    dataUrl,
  };
}

let cachedPromise: Promise<GameSpriteBank> | null = null;

export function loadGameSprites(): Promise<GameSpriteBank> {
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    const mapIds = Object.keys(MAP_URLS) as LevelId[];
    const spriteKeys = Object.keys(SPRITE_URLS) as SpriteKey[];
    const [mapImgs, spriteImgs] = await Promise.all([
      Promise.all(mapIds.map((id) => loadImage(MAP_URLS[id]))),
      Promise.all(spriteKeys.map((k) => loadImage(SPRITE_URLS[k]))),
    ]);

    const maps = {} as Record<LevelId, HTMLImageElement>;
    mapIds.forEach((id, idx) => {
      maps[id] = mapImgs[idx];
    });

    const sprites = {} as Record<SpriteKey, SpriteAsset>;
    spriteKeys.forEach((k, idx) => {
      sprites[k] = cutoutWhiteBackground(spriteImgs[idx], 340);
    });

    return {
      map: maps['w1-l1'],
      maps,
      sprites,
    };
  })();
  return cachedPromise;
}
