// Solmar: procedural coastal city — ground, roads, buildings, beach, ocean, pier, props.
// Returns colliders (AABBs) and landmark positions used by missions and spawns.
import * as THREE from 'three';
import { WORLD, COLORS, rand, randi, pick } from './config.js';

export const LANDMARKS = {
  playerStart: { x: 0, z: 10 },
  docks: { x: -178, z: -124 },       // mission 1 pickup
  motel: { x: 124, z: 124 },         // mission 1 delivery
  hideout: { x: -124, z: 124 },      // mission 2 escape point
  marina: { x: 200, z: 62 },         // mission 3 finale
  pistol: { x: -155, z: -93 },       // pistol pickup
  plaza: { x: 0, z: 0 },
};

function facadeTexture(base, floors, cols) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, 128, 10);
  for (let f = 0; f < floors; f++) {
    for (let w = 0; w < cols; w++) {
      const lit = Math.random() < 0.22;
      g.fillStyle = lit ? '#ffe9a8' : 'rgba(20,40,60,0.55)';
      g.fillRect(10 + w * (108 / cols), 22 + f * (220 / floors), 108 / cols - 8, 220 / floors - 10);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildCity(scene) {
  const colliders = [];
  const addBox = (x, y, z, w, h, d, mat, collide = false) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.receiveShadow = true; m.castShadow = h > 2;
    scene.add(m);
    if (collide) colliders.push({ x, z, hx: w / 2, hz: d / 2 });
    return m;
  };
  const mat = color => new THREE.MeshLambertMaterial({ color });
  // Ground: grass base, sand strip, ocean.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat(COLORS.grass));
  ground.rotation.x = -Math.PI / 2; ground.position.set(60, -0.1, 0); ground.receiveShadow = true;
  scene.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(60, 560), mat(COLORS.sand));
  sand.rotation.x = -Math.PI / 2; sand.position.set(WORLD.beachX + 16, 0.02, 0); sand.receiveShadow = true;
  scene.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(420, 700), new THREE.MeshLambertMaterial({ color: COLORS.sea, transparent: true, opacity: 0.94 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(WORLD.seaX + 190, 0.05, 0);
  scene.add(sea);
  // Roads: dark strips on both axes + sidewalk borders.
  const roadMat = mat(COLORS.road), sideMat = mat(COLORS.sidewalk), lineMat = mat(COLORS.roadLine);
  for (const r of WORLD.roads) {
    addBox(r, 0.05, 0, WORLD.roadHalf * 2, 0.1, 420, roadMat);
    addBox(0, 0.05, r, 420, 0.1, WORLD.roadHalf * 2, roadMat);
    addBox(r, 0.06, 0, WORLD.roadHalf * 2 + 4, 0.1, 420, sideMat).position.y = 0.02;
    addBox(0, 0.06, r, 420, 0.1, WORLD.roadHalf * 2 + 4, sideMat).position.y = 0.02;
  }
  // Centre dashes along every road.
  const dashGeo = new THREE.BoxGeometry(4, 0.12, 0.8);
  for (const r of WORLD.roads) {
    for (let v = -196; v <= 196; v += 16) {
      const d1 = new THREE.Mesh(dashGeo, lineMat); d1.position.set(v, 0.12, r); scene.add(d1);
      const d2 = new THREE.Mesh(dashGeo, lineMat); d2.position.set(r, 0.12, v); d2.rotation.y = Math.PI / 2; scene.add(d2);
    }
  }
  // Buildings: pastel boxes with windowed facades, 2x2 lots per block.
  const facades = COLORS.buildings.slice(0, 4).map(c => facadeTexture('#' + c.toString(16).padStart(6, '0'), randi(4, 9), randi(3, 5)));
  const lotCenters = [-155, -93, -31, 31, 93, 155];
  for (const bx of lotCenters) {
    for (const bz of lotCenters) {
      if (bx === 0 && bz === 0) continue; // central plaza stays open
      if (Math.random() < 0.14) { // park lot: palms + grass
        for (let i = 0; i < 4; i++) addPalm(scene, bx + rand(-16, 16), bz + rand(-16, 16));
        continue;
      }
      for (const dx of [-11, 11]) for (const dz of [-11, 11]) {
        if (Math.random() < 0.18) continue;
        const h = randi(8, 34) + (Math.abs(bx) < 70 && Math.abs(bz) < 70 ? 14 : 0);
        const w = rand(16, 20), d = rand(16, 20);
        const tex = pick(facades);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
          new THREE.MeshLambertMaterial({ map: tex, color: pick(COLORS.buildings) }));
        m.position.set(bx + dx, h / 2, bz + dz);
        m.castShadow = true; m.receiveShadow = true;
        scene.add(m);
        colliders.push({ x: bx + dx, z: bz + dz, hx: w / 2, hz: d / 2 });
        // Roof rim.
        addBox(bx + dx, h + 0.3, bz + dz, w + 0.6, 0.6, d + 0.6, mat(0x2c343c));
      }
    }
  }
  // Central plaza: fountain + palms.
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 1.2, 20), mat(0x9fc8e8));
  fountain.position.set(0, 0.6, 0); scene.add(fountain);
  for (let i = 0; i < 8; i++) addPalm(scene, Math.cos(i / 8 * Math.PI * 2) * 22, Math.sin(i / 8 * Math.PI * 2) * 22);
  // Beach palms, umbrellas and the pier.
  for (let z = -180; z <= 180; z += 30) {
    addPalm(scene, WORLD.beachX + rand(2, 14), z + rand(-8, 8));
    if (Math.random() < 0.6) addUmbrella(scene, WORLD.beachX + rand(6, 20), z + rand(-6, 6));
  }
  const pierMat = mat(0x8a6b48);
  for (let x = WORLD.beachX; x < WORLD.seaX + 70; x += 4) addBox(x, 0.5, 62, 3.6, 0.5, 8, pierMat);
  addBox(WORLD.seaX + 66, 0.5, 62, 26, 0.5, 22, pierMat);
  // Street lamps along roads.
  const lampPole = mat(0x2c343c);
  const lampBulb = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const r of WORLD.roads) {
    for (let v = -170; v <= 170; v += 62) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), lampPole);
      p.position.set(r + 8.5, 3, v); scene.add(p);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lampBulb);
      b.position.set(r + 8.5, 6.1, v); scene.add(b);
    }
  }
  return { colliders, landmarks: LANDMARKS };
}

function addPalm(scene, x, z) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 6, 6),
    new THREE.MeshLambertMaterial({ color: 0x8a6b48 }));
  trunk.position.set(x, 3, z); trunk.rotation.z = rand(-0.08, 0.08);
  scene.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.9), leafMat);
    leaf.position.set(x, 6.1, z);
    leaf.rotation.y = i * Math.PI / 3;
    leaf.rotation.z = 0.5;
    leaf.translateX(1.4);
    scene.add(leaf);
  }
}
function addUmbrella(scene, x, z) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6),
    new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }));
  pole.position.set(x, 1.2, z); scene.add(pole);
  const top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.9, 8),
    new THREE.MeshLambertMaterial({ color: pick([0xe84a5f, 0x2e9fd2, 0xf2c230]) }));
  top.position.set(x, 2.8, z); scene.add(top);
}
