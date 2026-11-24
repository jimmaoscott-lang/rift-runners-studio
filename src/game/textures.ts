import * as THREE from 'three';

export interface ProceduralTextures {
  groundColor: THREE.CanvasTexture;
  trailColor: THREE.CanvasTexture;
  waterNormal: THREE.CanvasTexture;
  stoneTex: THREE.CanvasTexture;
  runePadTower: THREE.CanvasTexture;
  runePadTrail: THREE.CanvasTexture;
  glowViolet: THREE.CanvasTexture;
  glowCyan: THREE.CanvasTexture;
  glowGold: THREE.CanvasTexture;
  glowOrange: THREE.CanvasTexture;
  glowIce: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function makeGlow(inner: string, mid: string, outer = 'rgba(0,0,0,0)'): THREE.CanvasTexture {
  const [c, g] = makeCanvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner);
  gr.addColorStop(0.32, mid);
  gr.addColorStop(1, outer);
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeStoneTexture(maxAniso: number): THREE.CanvasTexture {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#5a6274';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 650; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 19341.123) % 1;
    const px = Math.abs(x) * 256;
    const py = Math.abs(y) * 256;
    const r = 2 + (i % 7);
    const shade = 70 + (i % 45);
    g.fillStyle = `rgba(${shade}, ${shade + 5}, ${shade + 14}, 0.28)`;
    g.fillRect(px, py, r * 2, r);
  }
  g.strokeStyle = 'rgba(20, 24, 34, 0.35)';
  g.lineWidth = 2;
  for (let row = 0; row < 4; row++) {
    const y = row * 64;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
    const offset = (row % 2) * 48;
    for (let col = 0; col < 3; col++) {
      const x = (col * 96 + offset) % 256;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + 64);
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function makeGroundTexture(maxAniso: number): THREE.CanvasTexture {
  const [c, g] = makeCanvas(512, 512);
  g.fillStyle = '#243a33';
  g.fillRect(0, 0, 512, 512);
  // Layered organic woodland moss and pine needle flecks
  for (let i = 0; i < 3200; i++) {
    const h1 = Math.abs(Math.sin(i * 19.19) * 43758.5453) % 1;
    const h2 = Math.abs(Math.sin(i * 47.73) * 19341.711) % 1;
    const x = h1 * 512;
    const y = h2 * 512;
    const rad = 2 + (i % 9);
    const pick = i % 4;
    if (pick === 0) g.fillStyle = 'rgba(26, 48, 40, 0.35)';
    else if (pick === 1) g.fillStyle = 'rgba(46, 78, 56, 0.28)';
    else if (pick === 2) g.fillStyle = 'rgba(34, 42, 58, 0.25)';
    else g.fillStyle = 'rgba(72, 92, 64, 0.16)';
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 7);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function makeTrailTexture(maxAniso: number): THREE.CanvasTexture {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#4c433d';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1200; i++) {
    const px = (Math.abs(Math.sin(i * 31.7) * 9991) % 1) * 256;
    const py = (Math.abs(Math.sin(i * 63.3) * 7771) % 1) * 256;
    const sz = 2 + (i % 6);
    const v = 64 + (i % 38);
    g.fillStyle = `rgba(${v + 12}, ${v + 4}, ${v - 2}, 0.32)`;
    g.beginPath();
    g.ellipse(px, py, sz, sz * 0.7, (i % 6) * 0.5, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function makeRunePadTexture(colorHex: string, glowHex: string, maxAniso: number): THREE.CanvasTexture {
  const [c, g] = makeCanvas(256, 256);
  g.clearRect(0, 0, 256, 256);
  // Subtle stone disc base
  const gr = g.createRadialGradient(128, 128, 18, 128, 128, 118);
  gr.addColorStop(0, glowHex);
  gr.addColorStop(0.68, 'rgba(30, 41, 59, 0.25)');
  gr.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(128, 128, 120, 0, Math.PI * 2);
  g.fill();

  // Concentric rune rings
  g.strokeStyle = colorHex;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(128, 128, 106, 0, Math.PI * 2);
  g.stroke();

  g.lineWidth = 2;
  g.setLineDash([12, 8]);
  g.beginPath();
  g.arc(128, 128, 86, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);

  // Geometric arcane tick marks
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.beginPath();
    g.moveTo(128 + Math.cos(a) * 68, 128 + Math.sin(a) * 68);
    g.lineTo(128 + Math.cos(a) * 106, 128 + Math.sin(a) * 106);
    g.stroke();
  }

  // Center diamond sigil
  g.beginPath();
  g.moveTo(128, 92);
  g.lineTo(164, 128);
  g.lineTo(128, 164);
  g.lineTo(92, 128);
  g.closePath();
  g.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function makeWaterRippleTexture(maxAniso: number): THREE.CanvasTexture {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#183d59';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 45; i++) {
    const y = (i / 45) * 256;
    g.strokeStyle = i % 2 === 0 ? 'rgba(120, 215, 255, 0.22)' : 'rgba(180, 140, 255, 0.12)';
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= 256; x += 16) {
      const dy = Math.sin((x / 256) * Math.PI * 4 + i * 0.7) * 4;
      if (x === 0) g.moveTo(x, y + dy);
      else g.lineTo(x, y + dy);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 14);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createProceduralTextures(renderer: THREE.WebGLRenderer): ProceduralTextures {
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return {
    groundColor: makeGroundTexture(maxAniso),
    trailColor: makeTrailTexture(maxAniso),
    waterNormal: makeWaterRippleTexture(maxAniso),
    stoneTex: makeStoneTexture(maxAniso),
    runePadTower: makeRunePadTexture('#67e8f9', 'rgba(34, 211, 238, 0.28)', maxAniso),
    runePadTrail: makeRunePadTexture('#d8b4fe', 'rgba(192, 132, 252, 0.28)', maxAniso),
    glowViolet: makeGlow('rgba(255, 235, 255, 1)', 'rgba(186, 85, 255, 0.55)'),
    glowCyan: makeGlow('rgba(235, 255, 255, 1)', 'rgba(56, 224, 255, 0.55)'),
    glowGold: makeGlow('rgba(255, 252, 225, 1)', 'rgba(250, 204, 21, 0.55)'),
    glowOrange: makeGlow('rgba(255, 244, 214, 1)', 'rgba(249, 115, 22, 0.58)'),
    glowIce: makeGlow('rgba(240, 253, 255, 1)', 'rgba(125, 211, 252, 0.52)'),
    contactShadow: makeGlow('rgba(5, 8, 16, 0.55)', 'rgba(5, 8, 16, 0.25)'),
  };
}
