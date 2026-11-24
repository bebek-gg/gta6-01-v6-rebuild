// Ambient life: AI traffic cars cruising the road grid and pedestrians on sidewalks.
import * as THREE from 'three';
import { WORLD, rand, randi, pick, clamp, nearestRoad, onRoad } from './config.js';
import { Car, makeCarMesh, randomCarColor, circleHitsAABB } from './vehicles.js';

function makePedMesh(color) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color });
  const skin = new THREE.MeshLambertMaterial({ color: pick([0xe8b98a, 0xc98d5f, 0x8a5a3b, 0xf0c8a0]) });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), shirt);
  body.position.y = 1.05; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skin);
  head.position.y = 1.58;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.68, 0.22), new THREE.MeshLambertMaterial({ color: 0x2b3440 }));
  legL.position.set(-0.15, 0.34, 0);
  const legR = legL.clone(); legR.position.x = 0.15;
  g.add(body, head, legL, legR);
  g.userData.legs = [legL, legR];
  return g;
}

export class Traffic {
  constructor(scene, colliders) {
    this.scene = scene;
    this.colliders = colliders;
    this.cars = [];
    this.peds = [];
    // Parked cars the player can steal, placed along roads.
    this.parked = [];
    for (let i = 0; i < 8; i++) {
      const road = pick(WORLD.roads);
      const along = pick(WORLD.roads);
      const x = road + pick([-1, 1]) * 4.5, z = along + rand(-20, 20);
      const car = new Car(scene, x, z, pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), randomCarColor());
      this.parked.push(car);
    }
    for (let i = 0; i < 10; i++) this.spawnTrafficCar();
    for (let i = 0; i < 16; i++) this.spawnPed();
  }
  spawnTrafficCar() {
    const axis = pick(['x', 'z']);
    const line = pick(WORLD.roads);
    const along = rand(-180, 180);
    const dir = pick([-1, 1]);
    const x = axis === 'x' ? along : line + dir * 2.5;
    const z = axis === 'x' ? line + dir * 2.5 : along;
    const yaw = axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const car = new Car(this.scene, x, z, yaw, randomCarColor());
    car.cruiseSpeed = rand(9, 14);
    car.axis = axis; car.line = line; car.dir = dir;
    car.nextTurn = rand(20, 80);
    this.cars.push(car);
  }
  spawnPed() {
    const road = pick(WORLD.roads);
    const along = rand(-180, 180);
    const side = pick([-1, 1]);
    const mesh = makePedMesh(pick([0xd23c2e, 0x2e6fd2, 0xf2c230, 0x3aa655, 0xe8e8e8, 0x7a4fd0]));
    this.scene.add(mesh);
    const ped = {
      mesh, x: road + side * 10, z: along, axis: 'x', dir: pick([-1, 1]),
      speed: rand(1.4, 2.6), phase: rand(6), down: false, downTimer: 0, flee: 0,
    };
    if (Math.random() < 0.5) { ped.axis = 'z'; const t = ped.x; ped.x = ped.z; ped.z = t; }
    this.peds.push(ped);
  }
  update(dt, playerCar, playerPos, playerSpeed) {
    const events = [];
    // Traffic cars: cruise their lane, turn at intersections sometimes.
    for (const car of this.cars) {
      const fwd = car.axis === 'x' ? car.pos.x : car.pos.z;
      const distToNext = Math.abs(nearestRoad(fwd + car.dir * 8) - fwd);
      car.nextTurn -= Math.abs(car.speed) * dt;
      if (distToNext < 6 && car.nextTurn <= 0 && Math.random() < 0.02) {
        // Turn onto the crossing road.
        const cross = nearestRoad(fwd);
        car.axis = car.axis === 'x' ? 'z' : 'x';
        car.line = cross;
        car.dir = pick([-1, 1]);
        car.yaw = car.axis === 'x' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
        car.nextTurn = rand(30, 90);
      }
      // Brake for the car ahead (player or traffic).
      let throttle = 0.55;
      const ahead = this.carAhead(car, 12);
      if (ahead) throttle = 0;
      const desiredYaw = car.axis === 'x' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
      const steer = clamp(((desiredYaw - car.yaw + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 2, -1, 1);
      // Stay in lane: nudge toward the lane centre.
      const lateral = car.axis === 'x' ? car.pos.z - (car.line + car.dir * 2.5) : car.pos.x - (car.line + car.dir * 2.5);
      const laneSteer = clamp(-lateral * 0.15 * car.dir, -0.5, 0.5);
      car.drive(dt, throttle, clamp(steer + laneSteer, -1, 1), this.colliders);
      if (Math.abs(car.speed) > car.cruiseSpeed) car.speed = car.cruiseSpeed * Math.sign(car.speed);
    }
    // Pedestrians: stroll the sidewalks, flee fast cars, fall when hit.
    for (const ped of this.peds) {
      if (ped.down) {
        ped.downTimer -= dt;
        ped.mesh.rotation.x = -Math.PI / 2 * 0.9;
        if (ped.downTimer <= 0) { ped.down = false; ped.mesh.rotation.x = 0; }
        continue;
      }
      const dx = ped.x - playerPos.x, dz = ped.z - playerPos.z;
      const d = Math.hypot(dx, dz);
      if (playerCar && playerSpeed > 8 && d < 9) ped.flee = 1.2;
      if (ped.flee > 0) {
        ped.flee -= dt;
        ped.x += (dx / (d || 1)) * 5 * dt;
        ped.z += (dz / (d || 1)) * 5 * dt;
      } else {
        const step = ped.speed * dt * ped.dir;
        if (ped.axis === 'x') ped.x += step; else ped.z += step;
        if (Math.abs(ped.x) > 195 || Math.abs(ped.z) > 195) ped.dir *= -1;
        if (Math.random() < 0.002) ped.dir *= -1;
      }
      ped.x = clamp(ped.x, -198, 210); ped.z = clamp(ped.z, -198, 198);
      ped.phase += dt * ped.speed * 4;
      const [l1, l2] = ped.mesh.userData.legs;
      l1.rotation.x = Math.sin(ped.phase) * 0.5;
      l2.rotation.x = -Math.sin(ped.phase) * 0.5;
      ped.mesh.position.set(ped.x, 0, ped.z);
      ped.mesh.rotation.y = ped.axis === 'x' ? (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (ped.dir > 0 ? 0 : Math.PI);
      // Hit by the player's car?
      if (playerCar && d < 2.4 && Math.abs(playerSpeed) > 3) {
        ped.down = true; ped.downTimer = 4;
        events.push({ type: 'hitPed', ped });
      }
    }
    return events;
  }
  carAhead(car, dist) {
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    for (const other of this.cars) {
      if (other === car) continue;
      const dx = other.pos.x - car.pos.x, dz = other.pos.z - car.pos.z;
      if (dx * fx + dz * fz > 0 && dx * fx + dz * fz < dist && Math.abs(dx * fz - dz * fx) < 3) return other;
    }
    return null;
  }
  // Nearest parked car to a point (for stealing).
  nearestParked(x, z, maxDist = 4) {
    let best = null, bd = maxDist;
    for (const c of this.parked) {
      const d = Math.hypot(c.pos.x - x, c.pos.z - z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  removeParked(car) {
    const i = this.parked.indexOf(car);
    if (i >= 0) this.parked.splice(i, 1);
  }
}
