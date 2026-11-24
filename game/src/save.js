// Save / load through localStorage — money, health, mission progress, pistol, position.
const KEY = 'solmar-save-v1';
export const SaveSys = {
  save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) { return false; }
  },
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (typeof s.money !== 'number' || typeof s.missionIndex !== 'number') return null;
      return s;
    } catch (e) { return null; }
  },
  clear() { try { localStorage.removeItem(KEY); } catch (e) {} },
  exists() { return !!this.load(); },
};
