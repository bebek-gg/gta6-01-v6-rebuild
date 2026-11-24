// Cars: low-poly car meshes and arcade driving physics with building collision.
import * as THREE from 'three';
import { CAR, WORLD, clamp, angLerp, pick, COLORS } from './config.js';

// Push a circle (x,z,r) out of every AABB it overlaps. Mutates pos.
export function collideCircle(pos, r, colliders) {
  for (const c of colliders) {
    const cx = clamp(pos.x, c.x - c.hx, c.x + c.hx);
    const cz = clamp(pos.z, c.z - c.hz, c.z + c.hz);
    const dx = pos.x - cx, dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        pos.x = cx + dx / d * r;
        pos.z = cz + dz / d * r;
      } else {
        pos.x = c.x + c.hx + r;
      }
    }
  }
}
export function circleHitsAABB(x, z, r, c) {
  const cx = clamp(x, c.x - c.hx, c.x + c.hx);
  const cz = clamp(z, c.z - c.hz, c.z + c.hz);
  const dx = x - cx, dz = z - cz;
  return dx * dx + dz * dz < r * r;
}

export function makeCarMesh(color, isPolice = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x18242e });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.55; body.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glassMat);
  cabin.position.set(0, 1.05, -0.2); cabin.castShadow = true;
  g.add(body, cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14181c });
  g.userData.wheels = [];
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.36, z);
    g.add(w); g.userData.wheels.push(w);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const x of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.08), lightMat);
    h.position.set(x, 0.62, 2.22); g.add(h);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    bar.position.set(0, 1.42, -0.2); g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.42), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(-0.32, 1.52, -0.2); g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.42), new THREE.MeshBasicMaterial({ color: 0x2266ff }));
    blue.position.set(0.32, 1.52, -0.2); g.add(blue);
    g.userData.policeLights = [red, blue];
  }
  return g;
}

export class Car {
  constructor(scene, x, z, yaw, color, isPolice = false) {
    this.mesh = makeCarMesh(color, isPolice);
    scene.add(this.mesh);
    this.pos = new THREE.Vector3(x, 0, z);
    this.yaw = yaw;
    this.speed = 0;
    this.steer = 0;
    this.health = 100;
    this.isPolice = isPolice;
    this.color = color;
    this.wheelSpin = 0;
    this.syncMesh();
  }
  syncMesh() {
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;
  }
  // Arcade drive: throttle -1..1, steer -1..1. Returns speed for HUD/audio.
  drive(dt, throttle, steerInput, colliders, handbrake = false) {
    const maxF = CAR.maxSpeed, maxR = CAR.reverseMax;
    if (throttle > 0) this.speed += CAR.accel * throttle * dt;
    else if (throttle < 0) this.speed += (this.speed > 0.5 ? -CAR.brake : -CAR.accel * 0.6) * dt;
    else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 8 * dt);
    if (handbrake) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 26 * dt);
    this.speed = clamp(this.speed, -maxR, maxF);
    const steerTarget = steerInput * CAR.steer * clamp(Math.abs(this.speed) / 8, 0, 1);
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    this.yaw += this.steer * (this.speed / maxF) * dt * 2.4;
    const nx = this.pos.x + Math.sin(this.yaw) * this.speed * dt;
    const nz = this.pos.z + Math.cos(this.yaw) * this.speed * dt;
    const test = { x: nx, z: nz };
    let hit = false;
    for (const c of colliders) if (circleHitsAABB(nx, nz, 2.0, c)) { hit = true; break; }
    if (hit) {
      if (Math.abs(this.speed) > 12) this.health -= Math.abs(this.speed) * 0.5;
      this.speed *= -0.25;
    } else {
      this.pos.x = nx; this.pos.z = nz;
    }
    this.pos.x = clamp(this.pos.x, -WORLD.cityHalf, WORLD.beachX + 6);
    this.pos.z = clamp(this.pos.z, -WORLD.cityHalf, WORLD.cityHalf);
    this.wheelSpin += this.speed * dt * 2;
    for (const w of this.mesh.userData.wheels) w.rotation.x = this.wheelSpin;
    this.syncMesh();
    return this.speed;
  }
  dispose(scene) { scene.remove(this.mesh); }
}
export function randomCarColor() { return pick(COLORS.cars); }
