import * as THREE from 'three';
import { DefenderType } from '../data/level1';
import { ProceduralTextures } from './textures';

export interface ModelLibrary {
  mats: ReturnType<typeof createMaterialLibrary>;
  createContactShadow: (radius: number) => THREE.Mesh;
  createRiftPortal: () => {
    group: THREE.Group;
    update: (t: number, dt: number, intensity: number) => void;
  };
  createAnchorAndCamp: () => {
    group: THREE.Group;
    anchorCore: THREE.Mesh;
    anchorLight: THREE.PointLight;
    warden: THREE.Group;
    update: (t: number, dt: number, hpRatio: number, flash: number, castPulse: number) => void;
  };
  createDefender: (
    type: DefenderType,
    level: number,
    spec: 'a' | 'b' | null
  ) => {
    group: THREE.Group;
    turret?: THREE.Object3D;
    crystal?: THREE.Object3D;
    spikes?: THREE.Object3D;
    arms?: THREE.Object3D[];
    auraRing?: THREE.Mesh;
    update: (t: number, dt: number, active: boolean, down: boolean) => void;
  };
  createWisp: () => {
    group: THREE.Group;
    hitMeshes: THREE.Mesh[];
    update: (t: number, dt: number, speedMult: number) => void;
  };
  createThornback: () => {
    group: THREE.Group;
    hitMeshes: THREE.Mesh[];
    update: (t: number, dt: number, speedMult: number) => void;
  };
  createArrowMesh: (spec: 'a' | 'b' | null) => THREE.Group;
}

function createMaterialLibrary(tex: ProceduralTextures) {
  return {
    stone: new THREE.MeshStandardMaterial({
      color: 0x7c8699,
      map: tex.stoneTex,
      roughness: 0.82,
      metalness: 0.1,
    }),
    stoneDark: new THREE.MeshStandardMaterial({
      color: 0x3f4758,
      map: tex.stoneTex,
      roughness: 0.88,
      metalness: 0.14,
    }),
    obsidian: new THREE.MeshStandardMaterial({
      color: 0x1a1329,
      roughness: 0.32,
      metalness: 0.45,
      emissive: 0x3b126b,
      emissiveIntensity: 0.38,
    }),
    wood: new THREE.MeshStandardMaterial({
      color: 0x7a5130,
      roughness: 0.85,
      metalness: 0.04,
    }),
    woodDark: new THREE.MeshStandardMaterial({
      color: 0x4b311d,
      roughness: 0.9,
      metalness: 0.05,
    }),
    slateRoof: new THREE.MeshStandardMaterial({
      color: 0x26395f,
      roughness: 0.62,
      metalness: 0.22,
    }),
    iron: new THREE.MeshStandardMaterial({
      color: 0x8f9bb0,
      roughness: 0.34,
      metalness: 0.82,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.26,
      metalness: 0.86,
    }),
    cyanCrystal: new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.5,
      roughness: 0.18,
      metalness: 0.2,
    }),
    violetCrystal: new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 1.65,
      roughness: 0.2,
      metalness: 0.25,
    }),
    magentaEye: new THREE.MeshStandardMaterial({
      color: 0xff66d9,
      emissive: 0xf43f5e,
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.1,
    }),
    frostMarble: new THREE.MeshStandardMaterial({
      color: 0xcfe9f7,
      roughness: 0.35,
      metalness: 0.12,
      emissive: 0x0e4f73,
      emissiveIntensity: 0.28,
    }),
    frostCrystal: new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.4,
      roughness: 0.14,
      metalness: 0.25,
    }),
    tar: new THREE.MeshStandardMaterial({
      color: 0x18181f,
      roughness: 0.18,
      metalness: 0.3,
      emissive: 0x2b123f,
      emissiveIntensity: 0.25,
    }),
    thornHide: new THREE.MeshStandardMaterial({
      color: 0x2b243d,
      roughness: 0.78,
      metalness: 0.15,
    }),
    thornPlate: new THREE.MeshStandardMaterial({
      color: 0x4c2870,
      roughness: 0.42,
      metalness: 0.32,
      emissive: 0x4c1d95,
      emissiveIntensity: 0.45,
    }),
    thornSpike: new THREE.MeshStandardMaterial({
      color: 0xe6d29a,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.3,
      roughness: 0.38,
      metalness: 0.25,
    }),
    wardenCoat: new THREE.MeshStandardMaterial({
      color: 0x164e56,
      roughness: 0.75,
      metalness: 0.08,
    }),
    wardenHair: new THREE.MeshStandardMaterial({
      color: 0xb53c24,
      roughness: 0.68,
      metalness: 0.05,
    }),
    wardenSkin: new THREE.MeshStandardMaterial({
      color: 0xe8c4ad,
      roughness: 0.72,
      metalness: 0.02,
    }),
    fireGlow: new THREE.MeshStandardMaterial({
      color: 0xfdba74,
      emissive: 0xf97316,
      emissiveIntensity: 2.2,
      roughness: 0.3,
    }),
    bannerTeal: new THREE.MeshStandardMaterial({
      color: 0x0e7490,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }),
  };
}

function addPart(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  parent: THREE.Object3D,
  castShadow = true
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = castShadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function makeSprite(
  tex: THREE.CanvasTexture,
  size: number,
  x: number,
  y: number,
  z: number,
  parent: THREE.Object3D,
  opacity = 0.9
): THREE.Sprite {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity,
    })
  );
  s.scale.set(size, size, 1);
  s.position.set(x, y, z);
  parent.add(s);
  return s;
}

export function createModelLibrary(tex: ProceduralTextures): ModelLibrary {
  const mats = createMaterialLibrary(tex);

  function createContactShadow(radius: number): THREE.Mesh {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2, radius * 2),
      new THREE.MeshBasicMaterial({
        map: tex.contactShadow,
        transparent: true,
        depthWrite: false,
        opacity: 0.52,
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.03;
    return m;
  }

  // -------------------------------------------------------------------------
  // Dimensional Rift Portal (12-part obsidian arch + spinning vortex + shards)
  // -------------------------------------------------------------------------
  function createRiftPortal() {
    const group = new THREE.Group();

    // Jagged obsidian ground plinth
    addPart(new THREE.CylinderGeometry(3.4, 4.1, 0.45, 9), mats.obsidian, 0, 0.22, 0, group);

    // Twin curving obsidian pillars forming a torn archway
    for (const side of [-1, 1]) {
      const p1 = addPart(new THREE.ConeGeometry(0.95, 5.4, 6), mats.obsidian, side * 2.1, 2.7, 0, group);
      p1.rotation.z = side * 0.16;
      const p2 = addPart(new THREE.ConeGeometry(0.65, 3.6, 5), mats.violetCrystal, side * 2.7, 1.8, 0.5, group);
      p2.rotation.z = -side * 0.28;
      const p3 = addPart(new THREE.ConeGeometry(0.55, 2.8, 5), mats.obsidian, side * 1.4, 4.8, -0.2, group);
      p3.rotation.z = side * 0.65;
    }

    // Outer swirling vortex torus
    const outerRing = addPart(
      new THREE.TorusGeometry(2.15, 0.22, 10, 28),
      mats.violetCrystal,
      0,
      2.9,
      0,
      group,
      false
    );

    const innerRing = addPart(
      new THREE.TorusGeometry(1.45, 0.14, 8, 24),
      mats.cyanCrystal,
      0,
      2.9,
      0.08,
      group,
      false
    );

    // Tear core membrane
    const core = new THREE.Mesh(
      new THREE.CircleGeometry(1.85, 24),
      new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
      })
    );
    core.position.set(0, 2.9, 0);
    group.add(core);

    const halo = makeSprite(tex.glowViolet, 8.2, 0, 3.0, 0.15, group, 0.92);

    // Floating orbiting crystal shards
    const shards: Array<{ mesh: THREE.Mesh; angle: number; r: number; y: number; speed: number }> = [];
    for (let i = 0; i < 6; i++) {
      const m = addPart(
        new THREE.OctahedronGeometry(0.28 + (i % 3) * 0.1, 0),
        i % 2 === 0 ? mats.violetCrystal : mats.obsidian,
        0,
        2.5,
        0,
        group,
        false
      );
      shards.push({
        mesh: m,
        angle: (i / 6) * Math.PI * 2,
        r: 2.5 + (i % 2) * 0.7,
        y: 1.6 + (i % 3) * 1.1,
        speed: 0.8 + (i % 3) * 0.35,
      });
    }

    const riftLight = new THREE.PointLight(0xb84dff, 6, 22, 1.6);
    riftLight.position.set(0, 3.4, 1.2);
    group.add(riftLight);

    return {
      group,
      update(t: number, dt: number, intensity: number) {
        outerRing.rotation.z += dt * (0.9 + intensity * 1.4);
        innerRing.rotation.z -= dt * (1.6 + intensity * 2.0);
        const pulse = 1 + Math.sin(t * 3.4) * 0.08 + intensity * 0.18;
        core.scale.set(pulse, pulse * 1.08, 1);
        halo.scale.set(8.2 * pulse, 8.2 * pulse, 1);
        riftLight.intensity = 5.5 + Math.sin(t * 4.2) * 1.4 + intensity * 4.5;
        for (const s of shards) {
          s.angle += dt * s.speed * (1 + intensity);
          s.mesh.position.set(
            Math.cos(s.angle) * s.r,
            s.y + Math.sin(t * 2.2 + s.angle) * 0.35,
            Math.sin(s.angle) * (s.r * 0.55)
          );
          s.mesh.rotation.x += dt * 1.4;
          s.mesh.rotation.y += dt * 1.8;
        }
      },
    };
  }

  // -------------------------------------------------------------------------
  // Rift Anchor Sanctuary + Campfire + The Rift Warden Hero Figure
  // -------------------------------------------------------------------------
  function createAnchorAndCamp() {
    const group = new THREE.Group();

    // Stepped stone sanctuary dais
    addPart(new THREE.CylinderGeometry(3.5, 4.0, 0.38, 8), mats.stoneDark, 0, 0.19, 0, group);
    addPart(new THREE.CylinderGeometry(2.3, 2.7, 0.36, 8), mats.stone, 0, 0.56, 0, group);

    // Four carved corner rune pylons
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      addPart(
        new THREE.BoxGeometry(0.5, 1.5, 0.5),
        mats.stoneDark,
        Math.cos(a) * 2.55,
        1.1,
        Math.sin(a) * 2.55,
        group
      );
      addPart(
        new THREE.OctahedronGeometry(0.22, 0),
        mats.cyanCrystal,
        Math.cos(a) * 2.55,
        2.05,
        Math.sin(a) * 2.55,
        group,
        false
      );
    }

    // Central ancient carved monolith
    addPart(new THREE.CylinderGeometry(0.68, 0.92, 2.7, 6), mats.stone, 0, 2.0, 0, group);
    addPart(new THREE.CylinderGeometry(0.82, 0.72, 0.35, 6), mats.stoneDark, 0, 3.4, 0, group);

    // Levitating cyan power crystal core
    const anchorCore = addPart(
      new THREE.OctahedronGeometry(0.75, 0),
      mats.cyanCrystal.clone(),
      0,
      4.55,
      0,
      group,
      false
    );
    const orbitRingA = addPart(
      new THREE.TorusGeometry(1.18, 0.06, 8, 24),
      mats.cyanCrystal,
      0,
      4.55,
      0,
      group,
      false
    );
    const orbitRingB = addPart(
      new THREE.TorusGeometry(1.42, 0.045, 8, 24),
      mats.gold,
      0,
      4.55,
      0,
      group,
      false
    );
    const anchorHalo = makeSprite(tex.glowCyan, 4.4, 0, 4.55, 0, group, 0.85);
    const anchorLight = new THREE.PointLight(0x38e0ff, 6, 22, 1.6);
    anchorLight.position.set(0, 4.9, 0);
    group.add(anchorLight);

    // Warm Campfire beside the dais
    const fireGroup = new THREE.Group();
    fireGroup.position.set(-4.0, 0, -1.3);
    group.add(fireGroup);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      addPart(new THREE.DodecahedronGeometry(0.25, 0), mats.stoneDark, Math.cos(a) * 0.72, 0.14, Math.sin(a) * 0.72, fireGroup);
    }
    const log1 = addPart(new THREE.CylinderGeometry(0.11, 0.12, 1.1, 6), mats.woodDark, 0, 0.16, 0, fireGroup);
    log1.rotation.z = Math.PI / 2;
    log1.rotation.y = 0.5;
    const log2 = addPart(new THREE.CylinderGeometry(0.11, 0.12, 1.1, 6), mats.woodDark, 0, 0.2, 0, fireGroup);
    log2.rotation.z = Math.PI / 2;
    log2.rotation.y = -0.65;
    const flame = addPart(new THREE.ConeGeometry(0.32, 0.9, 6), mats.fireGlow, 0, 0.55, 0, fireGroup, false);
    const fireHalo = makeSprite(tex.glowOrange, 2.8, 0, 0.7, 0, fireGroup, 0.75);
    const fireLight = new THREE.PointLight(0xff8c2b, 4.2, 14, 1.8);
    fireLight.position.set(0, 1.1, 0);
    fireGroup.add(fireLight);

    // Canvas tent silhouette at camp edge
    const tent = new THREE.Group();
    tent.position.set(4.1, 0, 1.0);
    tent.rotation.y = -0.55;
    addPart(new THREE.ConeGeometry(1.75, 2.2, 4), mats.wardenCoat, 0, 1.1, 0, tent);
    addPart(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 5), mats.wood, 0, 1.2, 0, tent);
    group.add(tent);

    // The Rift Warden (Veteran guardian in dark-teal coat, iron pauldrons, red hair, glowing cyan staff)
    const warden = new THREE.Group();
    warden.position.set(-2.3, 0, -2.2);
    warden.rotation.y = -2.4;
    group.add(warden);
    warden.add(createContactShadow(0.75));
    // Long dark-teal coat + legs
    addPart(new THREE.CylinderGeometry(0.28, 0.48, 1.15, 8), mats.wardenCoat, 0, 0.58, 0, warden);
    // Torso with leather cross-straps
    addPart(new THREE.CylinderGeometry(0.32, 0.27, 0.75, 8), mats.wardenCoat, 0, 1.42, 0, warden);
    addPart(new THREE.TorusGeometry(0.3, 0.04, 6, 12), mats.woodDark, 0, 1.15, 0, warden).rotation.x = Math.PI / 2;
    // Iron shoulder pauldrons
    addPart(new THREE.SphereGeometry(0.22, 8, 6), mats.iron, -0.4, 1.66, 0, warden);
    addPart(new THREE.SphereGeometry(0.22, 8, 6), mats.iron, 0.4, 1.66, 0, warden);
    // Head + vivid red hair bun
    addPart(new THREE.SphereGeometry(0.24, 10, 8), mats.wardenSkin, 0, 2.02, 0, warden);
    addPart(new THREE.SphereGeometry(0.25, 8, 8), mats.wardenHair, 0, 2.08, -0.05, warden);
    addPart(new THREE.SphereGeometry(0.14, 7, 7), mats.wardenHair, 0, 2.06, -0.25, warden);
    // Gnarled wooden staff topped with glowing cyan crystal
    const staffGroup = new THREE.Group();
    staffGroup.position.set(0.52, 0, 0.18);
    warden.add(staffGroup);
    addPart(new THREE.CylinderGeometry(0.05, 0.07, 2.55, 6), mats.woodDark, 0, 1.28, 0, staffGroup);
    const staffCrystal = addPart(new THREE.OctahedronGeometry(0.24, 0), mats.cyanCrystal, 0, 2.7, 0, staffGroup, false);
    const staffHalo = makeSprite(tex.glowCyan, 1.5, 0, 2.7, 0, staffGroup, 0.8);

    return {
      group,
      anchorCore,
      anchorLight,
      warden,
      update(t: number, dt: number, hpRatio: number, flash: number, castPulse: number) {
        anchorCore.position.y = 4.55 + Math.sin(t * 2.3) * 0.22;
        anchorCore.rotation.y += dt * 1.1;
        orbitRingA.rotation.x = t * 0.9;
        orbitRingA.rotation.y = t * 0.7;
        orbitRingB.rotation.x = -t * 0.65 + 1.1;
        orbitRingB.rotation.z = t * 0.85;

        const matCore = anchorCore.material as THREE.MeshStandardMaterial;
        if (flash > 0) {
          matCore.emissive.setHex(0xff3b5c);
          matCore.emissiveIntensity = 2.6;
        } else {
          matCore.emissive.setHex(hpRatio < 0.35 ? 0xf59e0b : 0x22d3ee);
          matCore.emissiveIntensity = 0.7 + hpRatio * 1.1;
        }
        anchorHalo.material.opacity = 0.35 + hpRatio * 0.55;
        anchorLight.intensity = 2.5 + hpRatio * 4.5;

        // Campfire flicker
        const flick = 0.88 + Math.sin(t * 14) * 0.1 + Math.cos(t * 23) * 0.07;
        flame.scale.set(1, flick * 1.15, 1);
        fireHalo.scale.set(2.6 * flick, 2.6 * flick, 1);
        fireLight.intensity = 3.8 * flick;

        // Warden idle breathing & staff glow during Hero Power cast
        warden.position.y = Math.sin(t * 2.1) * 0.04;
        staffCrystal.rotation.y += dt * (1.8 + castPulse * 6);
        const sGlow = 1.5 + castPulse * 2.4;
        staffHalo.scale.set(sGlow, sGlow, 1);
      },
    };
  }

  // -------------------------------------------------------------------------
  // Defenders (Composite 5-10 part PBR models with visual tier/spec upgrades)
  // -------------------------------------------------------------------------
  function createDefender(type: DefenderType, level: number, spec: 'a' | 'b' | null) {
    const group = new THREE.Group();
    const scaleBoost = 1 + (level - 1) * 0.07 + (spec ? 0.08 : 0);

    if (type === 'archer') {
      group.add(createContactShadow(1.65));
      // Stone foundation + timber tower shaft
      addPart(new THREE.CylinderGeometry(1.25, 1.48, 0.8, 8), mats.stoneDark, 0, 0.4, 0, group);
      const shaftMat = level >= 2 ? mats.stone : mats.wood;
      addPart(new THREE.CylinderGeometry(0.92, 1.15, 2.6, 8), shaftMat, 0, 2.05, 0, group);
      // Four corner support beams
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        addPart(new THREE.BoxGeometry(0.22, 2.75, 0.22), mats.woodDark, Math.cos(a) * 0.92, 2.05, Math.sin(a) * 0.92, group);
      }
      // Battlement platform
      addPart(new THREE.CylinderGeometry(1.38, 1.12, 0.42, 8), mats.stoneDark, 0, 3.52, 0, group);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        addPart(new THREE.BoxGeometry(0.36, 0.42, 0.24), mats.stone, Math.cos(a) * 1.2, 3.85, Math.sin(a) * 1.2, group).rotation.y = -a;
      }
      // Hanging cyan rune banner
      addPart(new THREE.PlaneGeometry(0.55, 1.25), mats.bannerTeal, 0, 2.35, 1.1, group, false);
      // Turret group (rotates toward target)
      const turret = new THREE.Group();
      turret.position.set(0, 4.15, 0);
      group.add(turret);
      // Archer/Crossbow mount
      addPart(new THREE.CylinderGeometry(0.35, 0.42, 0.55, 7), mats.iron, 0, 0.25, 0, turret);
      const bowCount = spec === 'b' ? 3 : 1;
      for (let b = 0; b < bowCount; b++) {
        const offX = bowCount === 3 ? (b - 1) * 0.42 : 0;
        const railLen = spec === 'a' ? 1.85 : 1.25;
        addPart(new THREE.BoxGeometry(0.14, 0.14, railLen), mats.woodDark, offX, 0.52, 0.35, turret);
        const limbs = addPart(
          new THREE.BoxGeometry(spec === 'a' ? 1.5 : 1.05, 0.1, 0.14),
          spec === 'a' ? mats.gold : mats.iron,
          offX,
          0.55,
          0.65,
          turret
        );
        limbs.rotation.y = 0;
      }
      const crystalMat = spec === 'a' ? mats.gold : mats.cyanCrystal;
      const crystal = addPart(new THREE.OctahedronGeometry(0.28, 0), crystalMat, 0, 1.08, -0.1, turret, false);
      makeSprite(spec === 'a' ? tex.glowGold : tex.glowCyan, 1.4, 0, 1.08, -0.1, turret, 0.75);

      if (level >= 3 || spec) {
        // Pointed slate spire accent on rear
        addPart(new THREE.ConeGeometry(0.55, 1.1, 6), mats.slateRoof, 0, 1.45, -0.55, turret);
      }
      group.scale.setScalar(scaleBoost);

      return {
        group,
        turret,
        crystal,
        update(t: number, dt: number) {
          crystal.rotation.y += dt * 2.2;
          crystal.position.y = 1.08 + Math.sin(t * 3.1) * 0.08;
        },
      };
    }

    if (type === 'spike') {
      // Flush iron-framed rune grate embedded on the trail
      addPart(new THREE.CylinderGeometry(1.75, 1.9, 0.16, 8), mats.stoneDark, 0, 0.08, 0, group, false);
      const poolMat = spec === 'b' ? mats.tar : mats.obsidian;
      addPart(new THREE.CylinderGeometry(1.48, 1.48, 0.18, 12), poolMat, 0, 0.1, 0, group, false);
      addPart(new THREE.TorusGeometry(1.56, 0.1, 6, 16), spec === 'a' ? mats.gold : mats.iron, 0, 0.18, 0, group, false).rotation.x = Math.PI / 2;

      const spikes = new THREE.Group();
      group.add(spikes);
      const spikeMat = spec === 'a' ? mats.gold : mats.iron;
      const count = level >= 3 || spec === 'a' ? 11 : 7;
      for (let i = 0; i < count; i++) {
        const ring = i === 0 ? 0 : i < 7 ? 0.65 : 1.15;
        const angle = (i / Math.max(1, count - 1)) * Math.PI * 2;
        const h = (spec === 'a' ? 1.15 : 0.78) + (i === 0 ? 0.25 : 0);
        addPart(
          new THREE.ConeGeometry(0.15, h, 5),
          spikeMat,
          Math.cos(angle) * ring,
          h * 0.5,
          Math.sin(angle) * ring,
          spikes
        );
      }
      if (spec === 'b') {
        makeSprite(tex.glowViolet, 2.6, 0, 0.35, 0, group, 0.48);
      }
      let thrust = 0;
      return {
        group,
        spikes,
        update(t: number, dt: number, active: boolean) {
          const target = active ? 0.25 + Math.abs(Math.sin(t * 9)) * 0.42 : 0;
          thrust = THREE.MathUtils.damp(thrust, target, 12, dt);
          spikes.position.y = thrust - 0.18;
          if (spec === 'a' && active) {
            spikes.rotation.y += dt * 4.5;
          }
        },
      };
    }

    if (type === 'golem') {
      group.add(createContactShadow(1.5));
      const bodyMat = spec === 'a' ? mats.stoneDark : mats.stone;
      const coreMat = spec === 'b' ? mats.fireGlow : mats.cyanCrystal;
      // Heavy legs
      addPart(new THREE.BoxGeometry(0.55, 0.9, 0.62), mats.stoneDark, -0.45, 0.45, 0, group);
      addPart(new THREE.BoxGeometry(0.55, 0.9, 0.62), mats.stoneDark, 0.45, 0.45, 0, group);
      // Broad beveled torso
      addPart(new THREE.DodecahedronGeometry(0.95, 0), bodyMat, 0, 1.55, 0, group);
      // Glowing rune chest core
      const crystal = addPart(new THREE.OctahedronGeometry(0.36, 0), coreMat, 0, 1.62, 0.72, group, false);
      makeSprite(spec === 'b' ? tex.glowOrange : tex.glowCyan, 1.8, 0, 1.62, 0.76, group, 0.78);
      // Shoulder pauldrons
      const pauldronMat = spec === 'a' ? mats.cyanCrystal : mats.iron;
      addPart(new THREE.DodecahedronGeometry(0.46, 0), pauldronMat, -1.05, 2.08, 0, group);
      addPart(new THREE.DodecahedronGeometry(0.46, 0), pauldronMat, 1.05, 2.08, 0, group);
      // Head + glowing eyes
      addPart(new THREE.BoxGeometry(0.68, 0.56, 0.64), bodyMat, 0, 2.52, 0.12, group);
      addPart(new THREE.BoxGeometry(0.16, 0.09, 0.1), coreMat, -0.17, 2.56, 0.44, group, false);
      addPart(new THREE.BoxGeometry(0.16, 0.09, 0.1), coreMat, 0.17, 2.56, 0.44, group, false);

      // Articulated swinging arms
      const leftArm = new THREE.Group();
      leftArm.position.set(-1.15, 1.85, 0);
      addPart(new THREE.BoxGeometry(0.46, 1.25, 0.52), bodyMat, 0, -0.55, 0.15, leftArm);
      if (spec === 'b') addPart(new THREE.OctahedronGeometry(0.32, 0), mats.fireGlow, 0, -1.15, 0.25, leftArm, false);
      group.add(leftArm);

      const rightArm = new THREE.Group();
      rightArm.position.set(1.15, 1.85, 0);
      addPart(new THREE.BoxGeometry(0.46, 1.25, 0.52), bodyMat, 0, -0.55, 0.15, rightArm);
      if (spec === 'b') addPart(new THREE.OctahedronGeometry(0.32, 0), mats.fireGlow, 0, -1.15, 0.25, rightArm, false);
      group.add(rightArm);

      group.scale.setScalar(scaleBoost * (spec === 'a' ? 1.15 : 1.0));
      return {
        group,
        crystal,
        arms: [leftArm, rightArm],
        update(t: number, dt: number, active: boolean, down: boolean) {
          if (down) {
            group.scale.y = THREE.MathUtils.damp(group.scale.y, 0.35, 6, dt);
            crystal.rotation.y += dt * 4;
            return;
          }
          group.scale.y = THREE.MathUtils.damp(group.scale.y, scaleBoost * (spec === 'a' ? 1.15 : 1.0), 6, dt);
          if (active) {
            leftArm.rotation.x = Math.sin(t * 7.5) * 0.9 - 0.35;
            rightArm.rotation.x = -Math.sin(t * 7.5) * 0.9 - 0.35;
          } else {
            leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, Math.sin(t * 1.8) * 0.1, 6, dt);
            rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -Math.sin(t * 1.8) * 0.1, 6, dt);
          }
        },
      };
    }

    // Frost Totem
    group.add(createContactShadow(1.55));
    addPart(new THREE.CylinderGeometry(1.15, 1.4, 0.65, 6), mats.stoneDark, 0, 0.32, 0, group);
    addPart(new THREE.CylinderGeometry(0.62, 0.95, 2.2, 6), mats.frostMarble, 0, 1.65, 0, group);
    // Ice ribs around column
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      addPart(new THREE.ConeGeometry(0.22, 1.5, 4), mats.frostCrystal, Math.cos(a) * 0.72, 1.45, Math.sin(a) * 0.72, group);
    }
    // Levitating crystal prism
    const crystal = addPart(new THREE.OctahedronGeometry(0.65, 0), mats.frostCrystal, 0, 3.55, 0, group, false);
    const orbit = addPart(new THREE.TorusGeometry(0.98, 0.055, 8, 22), mats.cyanCrystal, 0, 3.55, 0, group, false);
    makeSprite(tex.glowIce, 3.1, 0, 3.55, 0, group, 0.85);

    const auraRing = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.0, 32),
      new THREE.MeshBasicMaterial({
        color: spec === 'b' ? 0x38bdf8 : 0xbae6fd,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = 0.07;
    group.add(auraRing);
    group.scale.setScalar(scaleBoost);

    return {
      group,
      crystal,
      auraRing,
      update(t: number, dt: number) {
        crystal.rotation.y += dt * 1.8;
        crystal.position.y = 3.55 + Math.sin(t * 2.8) * 0.22;
        orbit.rotation.x = t * 1.3;
        orbit.rotation.z = t * 0.9;
        const p = 1 + Math.sin(t * 2.2) * 0.06;
        auraRing.scale.set(p, p, 1);
      },
    };
  }

  // -------------------------------------------------------------------------
  // Creatures: Rift Wisp & Thornback (multi-part animated models)
  // -------------------------------------------------------------------------
  function createWisp() {
    const group = new THREE.Group();
    group.add(createContactShadow(0.65));
    const core = addPart(new THREE.OctahedronGeometry(0.42, 1), mats.violetCrystal.clone(), 0, 1.25, 0, group, false);
    const halo = makeSprite(tex.glowViolet, 2.1, 0, 1.25, 0, group, 0.95);
    const ring = addPart(new THREE.TorusGeometry(0.62, 0.06, 6, 14), mats.magentaEye, 0, 1.25, 0, group, false);
    // Trailing energy tail cones
    const tail = addPart(new THREE.ConeGeometry(0.24, 1.0, 5), mats.violetCrystal, 0, 1.25, -0.75, group, false);
    tail.rotation.x = -Math.PI / 2;
    const hitMeshes = [core];

    return {
      group,
      hitMeshes,
      update(t: number, dt: number, speedMult: number) {
        core.position.y = 1.25 + Math.sin(t * 6.5) * 0.24;
        ring.position.y = core.position.y;
        halo.position.y = core.position.y;
        tail.position.y = core.position.y;
        ring.rotation.x += dt * 3.8 * speedMult;
        ring.rotation.y += dt * 2.6 * speedMult;
        core.rotation.y -= dt * 3.0 * speedMult;
      },
    };
  }

  function createThornback() {
    const group = new THREE.Group();
    group.add(createContactShadow(1.3));
    const hitMeshes: THREE.Mesh[] = [];

    // Heavy quadrupedal armored body
    const body = addPart(new THREE.BoxGeometry(1.28, 0.95, 1.85), mats.thornHide.clone(), 0, 1.05, 0, group);
    hitMeshes.push(body);
    // Armored crystal back carapace
    const shell = addPart(new THREE.DodecahedronGeometry(0.88, 0), mats.thornPlate.clone(), 0, 1.38, -0.05, group);
    shell.scale.set(1.05, 0.72, 1.35);
    hitMeshes.push(shell);

    // Jagged dorsal crystal spikes
    const spikeCoords: [number, number, number, number][] = [
      [0, 1.98, 0.35, 0.75],
      [0, 2.08, -0.25, 0.92],
      [0, 1.88, -0.78, 0.65],
      [-0.45, 1.78, 0.05, 0.6],
      [0.45, 1.78, 0.05, 0.6],
    ];
    for (const [sx, sy, sz, sh] of spikeCoords) {
      const sp = addPart(new THREE.ConeGeometry(0.18, sh, 5), mats.thornSpike, sx, sy, sz, group);
      sp.rotation.x = -0.22;
      sp.rotation.z = sx < 0 ? 0.32 : sx > 0 ? -0.32 : 0;
    }

    // Hunched horned head + burning magenta eyes
    const head = addPart(new THREE.BoxGeometry(0.86, 0.72, 0.82), mats.thornHide.clone(), 0, 1.15, 1.15, group);
    hitMeshes.push(head);
    addPart(new THREE.ConeGeometry(0.14, 0.55, 5), mats.thornSpike, -0.35, 1.52, 1.32, group).rotation.x = 0.55;
    addPart(new THREE.ConeGeometry(0.14, 0.55, 5), mats.thornSpike, 0.35, 1.52, 1.32, group).rotation.x = 0.55;
    addPart(new THREE.BoxGeometry(0.16, 0.1, 0.1), mats.magentaEye, -0.22, 1.24, 1.56, group, false);
    addPart(new THREE.BoxGeometry(0.16, 0.1, 0.1), mats.magentaEye, 0.22, 1.24, 1.56, group, false);

    // Articulated stomping legs
    const legs: THREE.Mesh[] = [];
    const legPos: [number, number][] = [
      [-0.64, 0.68],
      [0.64, 0.68],
      [-0.64, -0.68],
      [0.64, -0.68],
    ];
    for (const [lx, lz] of legPos) {
      const leg = addPart(new THREE.BoxGeometry(0.38, 0.92, 0.42), mats.thornPlate, lx, 0.46, lz, group);
      legs.push(leg);
    }

    return {
      group,
      hitMeshes,
      update(t: number, _dt: number, speedMult: number) {
        const step = t * 5.6 * Math.max(0.15, speedMult);
        legs[0].rotation.x = Math.sin(step) * 0.42;
        legs[3].rotation.x = Math.sin(step) * 0.42;
        legs[1].rotation.x = -Math.sin(step) * 0.42;
        legs[2].rotation.x = -Math.sin(step) * 0.42;
        body.position.y = 1.05 + Math.abs(Math.sin(step)) * 0.08;
      },
    };
  }

  function createArrowMesh(spec: 'a' | 'b' | null): THREE.Group {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, spec === 'a' ? 1.35 : 0.95, 5),
      spec === 'a' ? mats.gold : mats.cyanCrystal
    );
    shaft.rotation.x = Math.PI / 2;
    g.add(shaft);
    makeSprite(spec === 'a' ? tex.glowGold : tex.glowCyan, spec === 'a' ? 1.15 : 0.85, 0, 0, 0.3, g, 0.9);
    return g;
  }

  return {
    mats,
    createContactShadow,
    createRiftPortal,
    createAnchorAndCamp,
    createDefender,
    createWisp,
    createThornback,
    createArrowMesh,
  };
}
