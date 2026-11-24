// Marco on foot: third-person character, walk/run/jump, building collision, walk cycle.
import * as THREE from 'three';
import { PLAYER, WORLD, clamp } from './config.js';
import { collideCircle } from './vehicles.js';

export class Player {
  constructor(scene) {
    this.group = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
    const shirt = new THREE.MeshLambertMaterial({ color: 0x2e6fd2 });
    const pants = new THREE.MeshLambertMaterial({ color: 0x2b3440 });
    const hair = new THREE.MeshLambertMaterial({ color: 0x1c1410 });
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), shirt);
    this.torso.position.y = 1.08;
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), skin);
    this.head.position.y = 1.62;
    this.hair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    this.hair.position.y = 1.66;
    this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.26), pants);
    this.legL.position.set(-0.17, 0.36, 0);
    this.legR = this.legL.clone();
    this.legR.position.x = 0.17;
    this.armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.22), shirt);
    this.armL.position.set(-0.42, 1.08, 0);
    this.armR = this.armL.clone();
    this.armR.position.x = 0.42;
    for (const m of [this.torso, this.head, this.hair, this.legL, this.legR, this.armL, this.armR]) {
      m.castShadow = true;
      this.group.add(m);
    }
    scene.add(this.group);
    this.pos = new THREE.Vector3(0, 0, 10);
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI; // facing the plaza
    this.onGround = true;
    this.walkPhase = 0;
    this.punchTimer = 0;
  }
  reset(x, z) {
    this.pos.set(x, 0, z);
    this.vel.set(0, 0, 0);
    this.yaw = Math.PI;
  }
  update(dt, input, colliders, camYaw) {
    const ax = input.moveAxis();
    const run = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    // Movement is relative to the camera yaw: the camera looks along (sin, cos),
    // so W must move the player along that view direction, D along its right.
    const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    let mx = -ax.z * sin - ax.x * cos, mz = -ax.z * cos + ax.x * sin;
    const len = Math.hypot(mx, mz);
    if (len > 0.01) {
      mx /= len; mz /= len;
      this.yaw = Math.atan2(mx, mz);
      this.walkPhase += dt * (run ? 13 : 9);
    }
    const target = new THREE.Vector3(mx * speed, 0, mz * speed);
    this.vel.x += (target.x - this.vel.x) * Math.min(1, dt * 12);
    this.vel.z += (target.z - this.vel.z) * Math.min(1, dt * 12);
    if (input.pressed('Space') && this.onGround) { this.vel.y = PLAYER.jumpSpeed; this.onGround = false; }
    this.vel.y += WORLD.gravity * dt;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y += this.vel.y * dt;
    if (this.pos.y <= 0) { this.pos.y = 0; this.vel.y = 0; this.onGround = true; }
    // Keep inside the playable city (beach allowed, sea blocked).
    this.pos.x = clamp(this.pos.x, -WORLD.cityHalf, WORLD.beachX + 8);
    this.pos.z = clamp(this.pos.z, -WORLD.cityHalf, WORLD.cityHalf);
    collideCircle(this.pos, PLAYER.radius, colliders);
    // Walk cycle + punch swing.
    const swing = len > 0.01 ? Math.sin(this.walkPhase) * 0.55 : 0;
    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    this.armL.rotation.x = -swing * 0.8;
    this.armR.rotation.x = swing * 0.8;
    if (this.punchTimer > 0) {
      this.punchTimer -= dt;
      this.armR.rotation.x = -1.6 * Math.max(0, this.punchTimer / 0.25);
    }
    this.group.position.copy(this.pos);
    this.group.position.y = this.pos.y;
    this.group.rotation.y = this.yaw;
  }
  punch() { this.punchTimer = 0.25; }
}
