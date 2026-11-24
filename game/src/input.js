// Keyboard + mouse input state, with edge-triggered "pressed" keys.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.mouseDX = 0; this.mouseDY = 0;
    this.mouseDown = false; this.mouseClicked = false;
    this.wheel = 0;
    this.dragging = false;
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressedKeys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.dragging = false; });
    canvas.addEventListener('mousedown', e => {
      if (e.button === 0) { this.mouseDown = true; this.mouseClicked = true; this.dragging = true; }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) { this.mouseDown = false; this.dragging = false; }
    });
    window.addEventListener('mousemove', e => {
      if (this.dragging) { this.mouseDX += e.movementX || 0; this.mouseDY += e.movementY || 0; }
    });
    window.addEventListener('wheel', e => { this.wheel += e.deltaY; }, { passive: true });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }
  down(code) { return this.keys.has(code); }
  // True once, on the frame the key went down.
  pressed(code) { return this.pressedKeys.has(code); }
  clicked() { return this.mouseClicked; }
  // Consume the per-frame edge state after the game loop reads it.
  endFrame() {
    this.pressedKeys.clear();
    this.mouseClicked = false;
    this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0;
  }
  // -1..1 steering / movement axes from WASD + arrows.
  moveAxis() {
    let x = 0, z = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) z -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) z += 1;
    return { x, z };
  }
}
