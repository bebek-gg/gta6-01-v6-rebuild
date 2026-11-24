// Wanted system: stars rise with crimes, police cars and foot officers chase and arrest.
import * as THREE from 'three';
import { WORLD, COLORS, clamp, angDiff, rand, pick } from './config.js';
import { Car, makeCarMesh, circleHitsAABB } from './vehicles.js';

function makeOfficerMesh() {
  const g = new THREE.Group();
  const navy = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.72, 0.34), navy);
  body.position.y = 1.08; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), skin);
  head.position.y = 1.6;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 10), navy);
  cap.position.y = 1.78;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.24), navy);
  legL.position.set(-0.16, 0.35, 0);
  const legR = legL.clone(); legR.position.x = 0.16;
  g.add(body, head, cap, legL, legR);
  g.userData.legs = [legL, legR];
  return g;
}

export class Police {
  constructor(scene, colliders, audio) {
    this.scene = scene;
    this.colliders = colliders;
    this.audio = audio;
    this.wanted = 0;          // 0..5 (float)
    this.quietTime = 0;       // seconds since last crime
    this.cars = [];
    this.officers = [];
    this.arrestTimer = 0;
    this.spawnTimer = 0;
    this.flash = 0;
  }
  get stars() { return Math.round(this.wanted); }
  addWanted(n, reason) {
    this.wanted = clamp(this.wanted + n, 0, 5);
    this.quietTime = 0;
    return reason;
  }
  update(dt, player, playerCar, onCrime) {
    this.quietTime += dt;
    // Wanted decays when the player lays low and no cop is near.
    let nearestCop = 999;
    for (const c of this.cars) nearestCop = Math.min(nearestCop, Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z));
    for (const o of this.officers) nearestCop = Math.min(nearestCop, Math.hypot(o.mesh.position.x - player.pos.x, o.mesh.position.z - player.pos.z));
    if (this.wanted > 0 && this.quietTime > 14 && nearestCop > 45) {
      this.wanted = Math.max(0, this.wanted - dt * 0.12);
    }
    // Desired force scales with stars.
    const wantCars = this.stars >= 1 ? Math.min(1 + Math.floor(this.stars / 2), 3) : 0;
    const wantOfficers = this.stars >= 3 ? Math.min(this.stars - 1, 3) : 0;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 2.5;
      if (this.cars.length < wantCars) this.spawnCar(player.pos);
      if (this.officers.length < wantOfficers && !playerCar) this.spawnOfficer(player.pos);
    }
    // Remove the force when wanted clears.
    if (this.stars === 0) {
      for (const c of this.cars) this.scene.remove(c.mesh);
      for (const o of this.officers) this.scene.remove(o.mesh);
      this.cars = []; this.officers = [];
      this.audio.setSiren(false);
      return null;
    }
    this.audio.setSiren(true);
    this.flash += dt;
    const events = [];
    // Cop cars chase and ram.
    for (const cop of this.cars) {
      const dx = player.pos.x - cop.pos.x, dz = player.pos.z - cop.pos.z;
      const dist = Math.hypot(dx, dz);
      const desired = Math.atan2(dx, dz);
      const steer = clamp(angDiff(cop.yaw, desired) * 1.6, -1, 1);
      const throttle = dist > 8 ? 1 : 0.4;
      cop.drive(dt, throttle, steer, this.colliders);
      // Stuck against a building: teleport back to a road near the player.
      cop.stuck = (Math.abs(cop.speed) < 1 && dist > 15) ? (cop.stuck || 0) + dt : 0;
      if (cop.stuck > 3) {
        const a = rand(Math.PI * 2);
        cop.pos.set(player.pos.x + Math.sin(a) * 70, 0, player.pos.z + Math.cos(a) * 70);
        cop.pos.x = clamp(cop.pos.x, -190, 200); cop.pos.z = clamp(cop.pos.z, -190, 190);
        cop.speed = 0; cop.stuck = 0;
      }
      // Ram the player's car.
      if (playerCar && dist < 3.6 && Math.abs(cop.speed) > 6) {
        events.push({ type: 'ram', damage: 6 });
        cop.speed *= 0.4;
      }
      // Flash the light bar.
      if (cop.mesh.userData.policeLights) {
        const [r, b] = cop.mesh.userData.policeLights;
        const on = Math.floor(this.flash * 4) % 2 === 0;
        r.material.color.setHex(on ? 0xff2222 : 0x551111);
        b.material.color.setHex(on ? 0x112266 : 0x2266ff);
      }
    }
    // Foot officers run the player down on foot.
    for (const o of this.officers) {
      const dx = player.pos.x - o.mesh.position.x, dz = player.pos.z - o.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const sp = 9.5;
      o.mesh.position.x += dx / (dist || 1) * sp * dt;
      o.mesh.position.z += dz / (dist || 1) * sp * dt;
      o.mesh.rotation.y = Math.atan2(dx, dz);
      o.phase = (o.phase || 0) + dt * 11;
      const [l1, l2] = o.mesh.userData.legs;
      l1.rotation.x = Math.sin(o.phase) * 0.6;
      l2.rotation.x = -Math.sin(o.phase) * 0.6;
      if (dist < 1.4) {
        this.arrestTimer += dt;
        if (this.arrestTimer > 1.6) {
          this.arrestTimer = 0;
          events.push({ type: 'busted' });
        }
      } else this.arrestTimer = Math.max(0, this.arrestTimer - dt);
    }
    return events;
  }
  spawnCar(playerPos) {
    const a = rand(Math.PI * 2);
    const x = clamp(playerPos.x + Math.sin(a) * 85, -190, 200);
    const z = clamp(playerPos.z + Math.cos(a) * 85, -190, 190);
    const car = new Car(this.scene, x, z, rand(Math.PI * 2), COLORS.police, true);
    car.cruiseSpeed = 30;
    this.cars.push(car);
  }
  spawnOfficer(playerPos) {
    const mesh = makeOfficerMesh();
    const a = rand(Math.PI * 2);
    mesh.position.set(playerPos.x + Math.sin(a) * 25, 0, playerPos.z + Math.cos(a) * 25);
    this.scene.add(mesh);
    this.officers.push({ mesh, phase: 0 });
  }
  clear() {
    this.wanted = 0;
    for (const c of this.cars) this.scene.remove(c.mesh);
    for (const o of this.officers) this.scene.remove(o.mesh);
    this.cars = []; this.officers = [];
    this.audio.setSiren(false);
  }
}
