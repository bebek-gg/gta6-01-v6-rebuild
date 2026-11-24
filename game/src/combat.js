// Combat: fists and a pistol pickup — shooting, ammo, reload, knockdowns.
import * as THREE from 'three';
import { LANDMARKS, clamp } from './config.js';

export class Combat {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;
    this.hasPistol = false;
    this.ammo = 0;
    this.magSize = 12;
    this.reloadTimer = 0;
    this.shootCooldown = 0;
    this.meleeCooldown = 0;
    // Pistol pickup: a floating gun over a glowing ring.
    this.pickup = new THREE.Group();
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.55),
      new THREE.MeshLambertMaterial({ color: 0x222831 }));
    gun.position.y = 0.9;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.1, 20),
      new THREE.MeshBasicMaterial({ color: 0x7ee2ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12;
    this.pickup.add(gun, ring);
    this.pickup.position.set(LANDMARKS.pistol.x, 0, LANDMARKS.pistol.z);
    scene.add(this.pickup);
    this.pickupTaken = false;
  }
  // targets: { peds:[{x,z,down...}], officers:[{mesh...}], copCars:[Car] }
  update(dt, input, player, playerCar, targets, fx, onCrime) {
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) { this.ammo = this.magSize; }
    }
    if (!this.pickupTaken) {
      this.pickup.rotation.y += dt;
      const d = Math.hypot(player.pos.x - LANDMARKS.pistol.x, player.pos.z - LANDMARKS.pistol.z);
      if (d < 2.5) {
        this.pickupTaken = true;
        this.hasPistol = true; this.ammo = this.magSize;
        this.pickup.visible = false;
        this.audio.pickup();
        return [{ type: 'toast', title: 'Pistol picked up', sub: 'Left click to shoot · R to reload' }];
      }
    }
    if (playerCar) return [];
    if (input.pressed('KeyR') && this.hasPistol && this.ammo < this.magSize && this.reloadTimer <= 0) {
      this.reloadTimer = 0.8;
      this.audio.click();
    }
    if (!input.clicked()) return [];
    if (this.hasPistol && this.ammo > 0 && this.shootCooldown <= 0) {
      this.shootCooldown = 0.28;
      this.ammo--;
      this.audio.shot();
      const dir = { x: Math.sin(player.yaw), z: Math.cos(player.yaw) };
      const muzzle = { x: player.pos.x + dir.x * 1.2, y: 1.4, z: player.pos.z + dir.z * 1.2 };
      fx.muzzle(muzzle);
      const hit = this.raycastTargets(player.pos, dir, targets);
      if (hit) {
        fx.blood(hit.x, hit.z);
        return [{ type: 'shotHit', target: hit }];
      }
      return [{ type: 'shotMiss' }];
    }
    if (this.meleeCooldown <= 0) {
      this.meleeCooldown = 0.4;
      player.punch();
      this.audio.punch();
      const dir = { x: Math.sin(player.yaw), z: Math.cos(player.yaw) };
      const hit = this.raycastTargets(player.pos, dir, targets, 2.2, 0.9);
      if (hit) {
        fx.blood(hit.x, hit.z);
        return [{ type: 'punchHit', target: hit }];
      }
    }
    return [];
  }
  // Nearest living target inside a cone from origin along dir.
  raycastTargets(origin, dir, targets, range = 45, cosHalf = 0.86) {
    let best = null, bd = range;
    const consider = (x, z, obj) => {
      const dx = x - origin.x, dz = z - origin.z;
      const d = Math.hypot(dx, dz);
      if (d > range || d < 0.1) return;
      const dot = (dx * dir.x + dz * dir.z) / d;
      if (dot < cosHalf) return;
      if (d < bd) { bd = d; best = { ...obj, x, z, dist: d }; }
    };
    for (const p of targets.peds || []) if (!p.down) consider(p.x, p.z, { kind: 'ped', ref: p });
    for (const o of targets.officers || []) consider(o.mesh.position.x, o.mesh.position.z, { kind: 'officer', ref: o });
    for (const c of targets.copCars || []) consider(c.pos.x, c.pos.z, { kind: 'copCar', ref: c });
    return best;
  }
}
