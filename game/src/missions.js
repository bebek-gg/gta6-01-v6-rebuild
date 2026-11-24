// Marco's story: three chained missions with markers, objectives and cash rewards.
import * as THREE from 'three';
import { MISSIONS } from './config.js';
import { LANDMARKS } from './city.js';

function makeMarkerMesh() {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 15;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.9),
    new THREE.MeshBasicMaterial({ color: 0xffd94d }));
  gem.position.y = 4.5;
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.4, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15;
  g.add(beam, gem, ring);
  g.userData.gem = gem;
  return g;
}

export class Missions {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;
    this.index = 0;            // mission 0..2, 3 = all done
    this.stage = 0;            // step inside the mission
    this.active = false;
    this.marker = makeMarkerMesh();
    this.marker.visible = false;
    scene.add(this.marker);
    this.markerPos = { x: 0, z: 0 };
    this.specialCar = null;    // mission 3's marked coupe
    this.completeTimer = 0;
  }
  get current() { return MISSIONS[this.index]; }
  get done() { return this.index >= MISSIONS.length; }
  start() {
    if (this.done) return;
    this.active = true;
    this.stage = 0;
    this.setMarkerForStage();
  }
  setMarkerForStage() {
    const m = this.current;
    if (this.index === 0) this.markerPos = this.stage === 0 ? LANDMARKS.docks : LANDMARKS.motel;
    else if (this.index === 1) this.markerPos = LANDMARKS.hideout;
    else if (this.index === 2) this.markerPos = this.stage === 0 ? LANDMARKS.plaza : LANDMARKS.marina;
    this.marker.position.set(this.markerPos.x, 0, this.markerPos.z);
    this.marker.visible = true;
  }
  objective() {
    if (this.done) return 'All jobs done — Solmar is yours, Marco.';
    const m = this.current;
    if (this.index === 0) return this.stage === 0
      ? `M1 ${m.name}: pick up the package at the docks`
      : `M1 ${m.name}: deliver it to the Sunset Motel`;
    if (this.index === 1) return `M2 ${m.name}: lose the cops — reach the hideout`;
    return this.stage === 0
      ? `M3 ${m.name}: steal the gold coupe at the plaza`
      : `M3 ${m.name}: bring the coupe to the marina yacht`;
  }
  // Called every frame; returns events for the game to act on.
  update(dt, playerPos, playerCar, game) {
    if (!this.active || this.done) return [];
    const events = [];
    this.marker.userData.gem.position.y = 4.5 + Math.sin(performance.now() * 0.003) * 0.5;
    this.marker.userData.gem.rotation.y += dt * 2;
    const d = Math.hypot(playerPos.x - this.markerPos.x, playerPos.z - this.markerPos.z);
    const reach = playerCar ? 6 : 4;
    if (d < reach) {
      if (this.index === 0 && this.stage === 0) {
        this.stage = 1; this.setMarkerForStage();
        events.push({ type: 'toast', title: 'Package collected', sub: 'Deliver it to the Sunset Motel' });
        this.audio.pickup();
      } else if (this.index === 0) {
        events.push(this.completeMission(game));
      } else if (this.index === 1) {
        events.push(this.completeMission(game));
      } else if (this.index === 2 && this.stage === 1) {
        events.push(this.completeMission(game));
      }
    }
    // Mission 3 stage 0: entering the marked coupe advances the stage.
    if (this.index === 2 && this.stage === 0 && playerCar && this.specialCar && playerCar === this.specialCar) {
      this.stage = 1; this.setMarkerForStage();
      events.push({ type: 'toast', title: 'Coupe stolen!', sub: 'Get it to the marina — the whole force is coming' });
      game.police.addWanted(2, 'grand theft auto');
    }
    return events;
  }
  completeMission(game) {
    const m = this.current;
    this.index++;
    this.stage = 0;
    this.audio.missionDone();
    if (this.index === 1) game.police.addWanted(2, 'heat');
    if (this.done) {
      this.marker.visible = false;
      this.active = false;
      return { type: 'missionComplete', pay: m.pay, title: `${m.name} complete!`, sub: `+$${m.pay} — All jobs done. SOLMAR KING!` };
    }
    this.setMarkerForStage();
    return { type: 'missionComplete', pay: m.pay, title: `${m.name} complete!`, sub: `+$${m.pay} — Next: ${MISSIONS[this.index].name}` };
  }
  // Spawn the gold coupe for mission 3 (called by the game when mission 3 starts).
  spawnSpecialCar(CarClass, color) {
    const car = new CarClass(this.scene, LANDMARKS.plaza.x + 6, LANDMARKS.plaza.z, Math.PI / 2, color);
    this.specialCar = car;
    return car;
  }
}
