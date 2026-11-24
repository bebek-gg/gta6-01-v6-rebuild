// Juice: dust puffs, muzzle flashes, explosions and hit sparks — pooled meshes, no textures.
import * as THREE from 'three';
import { rand } from './config.js';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.parts = [];
    this.geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    // Each particle owns its material so fading one never fades the others.
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
      m.visible = false;
      scene.add(m);
      this.parts.push({ mesh: m, life: 0, maxLife: 1, vel: new THREE.Vector3(), grow: 1 });
    }
    this.flashLight = new THREE.PointLight(0xffc861, 0, 18, 1.6);
    scene.add(this.flashLight);
    this.explodeLight = new THREE.PointLight(0xff6a00, 0, 40, 1.4);
    scene.add(this.explodeLight);
    this.flashTimer = 0;
    this.explodeTimer = 0;
  }
  spawn(pos, color, n, speed, life, up = 1, grow = 1) {
    let placed = 0;
    for (const p of this.parts) {
      if (placed >= n) break;
      if (p.life > 0) continue;
      p.life = p.maxLife = life * rand(0.7, 1.3);
      p.mesh.visible = true;
      p.mesh.material.color.setHex(color);
      p.mesh.material.opacity = 0.9;
      p.mesh.position.set(pos.x + rand(-0.3, 0.3), (pos.y || 0) + rand(0, 0.4), pos.z + rand(-0.3, 0.3));
      const s = rand(0.5, 1.4) * grow;
      p.mesh.scale.set(s, s, s);
      p.vel.set(rand(-1, 1) * speed, rand(0.2, 1) * speed * up, rand(-1, 1) * speed);
      p.grow = grow;
      placed++;
    }
  }
  dust(x, y, z) { this.spawn({ x, y, z }, 0xd8cdb8, 3, 1.6, 0.7, 0.6, 1.6); }
  blood(x, z) { this.spawn({ x, y: 1.1, z }, 0xffe14d, 5, 3, 0.4, 0.8, 0.7); }
  muzzle(pos) {
    this.spawn(pos, 0xffe14d, 4, 4, 0.12, 0.2, 1);
    this.flashLight.position.set(pos.x, pos.y, pos.z);
    this.flashLight.intensity = 26;
    this.flashTimer = 0.07;
  }
  explosion(pos) {
    this.spawn(pos, 0xff7a1e, 22, 7, 0.8, 1.2, 2.2);
    this.spawn(pos, 0x555555, 10, 3, 1.6, 1.6, 3);
    this.explodeLight.position.set(pos.x, 2, pos.z);
    this.explodeLight.intensity = 60;
    this.explodeTimer = 0.5;
  }
  update(dt) {
    for (const p of this.parts) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 2 * dt;
      p.vel.multiplyScalar(1 - dt * 1.4);
      const k = p.life / p.maxLife;
      p.mesh.material.opacity = k * 0.9;
      const s = p.mesh.scale.x * (1 + dt * p.grow);
      p.mesh.scale.set(s, s, s);
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flashLight.intensity = 0;
    }
    if (this.explodeTimer > 0) {
      this.explodeTimer -= dt;
      this.explodeLight.intensity = Math.max(0, this.explodeTimer * 120);
    }
  }
}
