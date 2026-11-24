// Three.js renderer: sun, sky, fog, shadows, drifting clouds and the chase camera.
import * as THREE from 'three';
import { COLORS, rand } from './config.js';

export class Renderer {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.fog, 120, 520);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
    const sun = new THREE.DirectionalLight(COLORS.sun, 2.4);
    sun.position.set(120, 180, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -220; sun.shadow.camera.right = 220;
    sun.shadow.camera.top = 220; sun.shadow.camera.bottom = -220;
    sun.shadow.camera.far = 600;
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 1.1));
    // Drifting clouds: flat white blobs high above the city.
    this.clouds = [];
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(rand(6, 13), 8, 6), cloudMat);
        s.position.set(j * rand(7, 11) - 14, rand(-1, 1.5), rand(-4, 4));
        s.scale.y = 0.45;
        g.add(s);
      }
      g.position.set(rand(-220, 260), rand(70, 110), rand(-220, 220));
      g.userData.speed = rand(0.8, 2);
      this.scene.add(g);
      this.clouds.push(g);
    }
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  get canvas() { return this.renderer.domElement; }
  // Chase camera: sits behind the target at camYaw, looks slightly ahead of it.
  follow(dt, target, yaw, camYaw, dist, height) {
    const tx = target.x - Math.sin(camYaw) * dist;
    const tz = target.z - Math.cos(camYaw) * dist;
    const k = 1 - Math.pow(0.0001, dt); // smooth ~0.06s
    this.camera.position.x += (tx - this.camera.position.x) * k;
    this.camera.position.y += (height - this.camera.position.y) * k;
    this.camera.position.z += (tz - this.camera.position.z) * k;
    const lx = target.x + Math.sin(yaw) * 4;
    const lz = target.z + Math.cos(yaw) * 4;
    this.camera.lookAt(lx, 1.6, lz);
  }
  updateClouds(dt) {
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 300) c.position.x = -280;
    }
  }
  render() { this.renderer.render(this.scene, this.camera); }
}
