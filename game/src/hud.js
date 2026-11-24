// HUD: health, money, wanted stars, objective, speed, toasts and the canvas minimap.
import { WORLD } from './config.js';

export class HUD {
  constructor() {
    this.el = id => document.getElementById(id);
    this.hud = this.el('hud');
    this.healthFill = this.el('healthfill');
    this.hpText = this.el('hptext');
    this.moneyEl = this.el('money');
    this.ammoEl = this.el('ammo');
    this.starsEl = this.el('stars');
    this.objectiveEl = this.el('objective');
    this.speedEl = this.el('speed');
    this.toastEl = this.el('toast');
    this.centerEl = this.el('center');
    this.map = this.el('minimap');
    this.mapCtx = this.map.getContext('2d');
    this.toastTimer = 0;
  }
  show(on) { this.hud.classList.toggle('on', on); }
  toast(title, sub = '', secs = 3) {
    this.toastEl.innerHTML = title + (sub ? `<small>${sub}</small>` : '');
    this.toastTimer = secs;
  }
  prompt(text) { this.centerEl.textContent = text; }
  update(dt, s) {
    this.healthFill.style.width = Math.max(0, s.health) + '%';
    this.hpText.textContent = Math.ceil(Math.max(0, s.health));
    this.moneyEl.textContent = '$' + s.money.toLocaleString('en-US');
    this.ammoEl.textContent = s.hasPistol ? `PISTOL  ${s.ammo} / ${s.magSize}` : 'FISTS — find the pistol at the docks';
    let stars = '';
    for (let i = 0; i < 5; i++) stars += `<span class="${i < s.wanted ? '' : 'off'}">★</span>`;
    this.starsEl.innerHTML = stars;
    this.objectiveEl.innerHTML = '<b>◆</b> ' + s.objective;
    this.speedEl.textContent = s.inCar ? Math.round(Math.abs(s.speed) * 3.6) + ' km/h' : '';
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.textContent = '';
    }
    this.drawMinimap(s);
  }
  drawMinimap(s) {
    const c = this.mapCtx, W = 180, H = 180;
    const toMap = (x, z) => [((x + 220) / 440) * W, ((z + 220) / 440) * H];
    c.fillStyle = '#0e2a3a'; c.fillRect(0, 0, W, H);
    // Sea + sand on the east edge.
    c.fillStyle = '#1d7fb8';
    const [seaX] = toMap(WORLD.seaX, 0); c.fillRect(seaX, 0, W - seaX, H);
    c.fillStyle = '#e9d29b';
    const [beachX] = toMap(WORLD.beachX, 0); c.fillRect(beachX, 0, seaX - beachX, H);
    // Roads.
    c.strokeStyle = '#5a636d'; c.lineWidth = 4;
    for (const r of WORLD.roads) {
      const [x] = toMap(r, 0); c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
      const [, z] = toMap(0, r); c.beginPath(); c.moveTo(0, z); c.lineTo(W, z); c.stroke();
    }
    // Mission marker: pulsing yellow diamond.
    if (s.marker) {
      const [mx, mz] = toMap(s.marker.x, s.marker.z);
      c.fillStyle = '#ffd94d';
      c.beginPath();
      c.moveTo(mx, mz - 7); c.lineTo(mx + 6, mz); c.lineTo(mx, mz + 7); c.lineTo(mx - 6, mz);
      c.closePath(); c.fill();
    }
    // Traffic cars: grey dots. Police: flashing blue/red dots.
    c.fillStyle = '#c8ccd2';
    for (const t of s.traffic || []) { const [x, z] = toMap(t.x, t.z); c.fillRect(x - 1.5, z - 1.5, 3, 3); }
    for (const p of s.cops || []) {
      const [x, z] = toMap(p.x, p.z);
      c.fillStyle = (Math.floor(performance.now() / 300) % 2 === 0) ? '#ff4444' : '#4488ff';
      c.beginPath(); c.arc(x, z, 3.5, 0, Math.PI * 2); c.fill();
    }
    // Player: white triangle pointing along the facing yaw.
    const [px, pz] = toMap(s.player.x, s.player.z);
    c.save();
    c.translate(px, pz);
    c.rotate(Math.PI - s.yaw); // triangle points up; rotate to the facing yaw
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(0, -6); c.lineTo(4.5, 5); c.lineTo(-4.5, 5); c.closePath(); c.fill();
    c.restore();
  }
}
