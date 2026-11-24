// SOLMAR shared constants and small math helpers.
export const WORLD = {
  pitch: 62,            // road centre spacing
  roadHalf: 7,          // half road width
  block: 48,            // building block size
  roads: [-186, -124, -62, 0, 62, 124, 186],
  cityHalf: 200,        // playable half-extent
  beachX: 214,          // sand starts here
  seaX: 246,            // ocean starts here
  gravity: -30,
};
export const PLAYER = {
  walkSpeed: 8, runSpeed: 13, jumpSpeed: 11, radius: 0.7, height: 1.8,
};
export const CAR = {
  maxSpeed: 40, accel: 22, brake: 34, reverseMax: 12, steer: 1.9, grip: 6,
};
export const COLORS = {
  sky: 0x8ec8ee, fog: 0xa8d4ea, sun: 0xfff0c8,
  road: 0x3c4147, roadLine: 0xd8d2c0, sidewalk: 0xb9b2a2,
  sand: 0xe9d29b, sea: 0x1d7fb8, grass: 0x7fb069,
  buildings: [0xe8a87c, 0xf2d492, 0x7fb8a4, 0xe07a7a, 0xf5ead6, 0x8fb8d8, 0xd8a7c8, 0xa8c686, 0xf0b429, 0x6fa8a0],
  cars: [0xd23c2e, 0x2e6fd2, 0xf2c230, 0x3aa655, 0xe8e8e8, 0x222831, 0x7a4fd0, 0xd07a2e],
  police: 0x1c2733, policeLight: 0x3a86ff,
};
export const MISSIONS = [
  { id: 1, name: 'First Delivery', pay: 500, brief: 'Pick up the package at the docks and deliver it to the Sunset Motel.' },
  { id: 2, name: 'Heat Escape', pay: 800, brief: 'The cops are onto you. Lose the tail and reach the hideout.' },
  { id: 3, name: 'The Marina Job', pay: 1500, brief: 'Steal the marked coupe and bring it to the marina yacht. The whole force is after you.' },
];
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
// Shortest signed angle difference, and an angle lerp that wraps correctly.
export function angDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export const angLerp = (a, b, t) => a + angDiff(a, b) * t;
// Is (x,z) on a road (within roadHalf of a road centre line, either axis)?
export function onRoad(x, z) {
  for (const r of WORLD.roads) {
    if (Math.abs(x - r) <= WORLD.roadHalf || Math.abs(z - r) <= WORLD.roadHalf) return true;
  }
  return false;
}
// Nearest road centre coordinate on one axis.
export function nearestRoad(v) {
  let best = WORLD.roads[0];
  for (const r of WORLD.roads) if (Math.abs(r - v) < Math.abs(best - v)) best = r;
  return best;
}
