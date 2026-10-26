export interface ViewTransform {
  scale: number;
  ox: number;
  oy: number;
}

interface Stick {
  pointerId: number | null;
  ox: number;
  oy: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  active: boolean;
}

function normalizedCode(e: KeyboardEvent): string {
  if (e.code) return e.code;
  const key = e.key;
  if (key === " " || key === "Spacebar") return "Space";
  if (key === "Esc") return "Escape";
  if (key === "Up" || key === "Down" || key === "Left" || key === "Right") {
    return `Arrow${key}`;
  }
  if (key.length === 1) return `Key${key.toUpperCase()}`;
  return key;
}

const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyE",
  "KeyQ",
  "KeyF",
  "ShiftLeft",
  "ShiftRight",
  "Space",
  "KeyP",
  "Escape",
]);

export class Input {
  keys = new Set<string>();
  readonly hasTouch: boolean;
  private view: ViewTransform = { scale: 1, ox: 0, oy: 0 };
  private mouse = { x: 0, y: 0, down: false, inside: false };
  private left: Stick = this.blankStick();
  private right: Stick = this.blankStick();
  private bombQueued = false;
  private activeQueued = false;
  private skillQueued = false;
  private gamepadPauseQueued = false;
  private gamepad = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, aimActive: false, connected: false };
  private prevButtons: boolean[] = [];
  private listeners: (() => void)[] = [];
  onFirstInput?: () => void;
  private firedFirst = false;

  constructor(private canvas: HTMLCanvasElement) {
    const forced = new URLSearchParams(location.search).has("touch");
    this.hasTouch = forced || matchMedia("(hover: none) and (pointer: coarse)").matches;

    const keydown = (e: KeyboardEvent) => {
      const code = normalizedCode(e);
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (GAME_KEYS.has(code)) e.preventDefault();
      if (!e.repeat) {
        if (code === "KeyE" || code === "Space") this.bombQueued = true;
        if (code === "KeyQ") this.activeQueued = true;
        if (code === "KeyF" || code === "ShiftLeft" || code === "ShiftRight") {
          this.skillQueued = true;
        }
        this.signalFirst();
      }
      this.keys.add(code);
    };
    const keyup = (e: KeyboardEvent) => {
      this.keys.delete(normalizedCode(e));
    };
    const blur = () => {
      this.keys.clear();
      this.left = this.blankStick();
      this.right = this.blankStick();
      this.mouse.down = false;
    };
    window.addEventListener("keydown", keydown, { passive: false });
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    const toLocal = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const resetStick = (stick: Stick) => {
      stick.pointerId = null;
      stick.active = false;
      stick.dx = 0;
      stick.dy = 0;
    };

    canvas.addEventListener("pointerdown", (e) => {
      this.signalFirst();
      const p = toLocal(e);
      if (e.pointerType === "mouse") {
        this.mouse.x = p.x;
        this.mouse.y = p.y;
        this.mouse.down = e.button === 0;
        this.mouse.inside = true;
        return;
      }
      if (e.pointerType === "pen" || e.pointerType === "touch") {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        const rect = canvas.getBoundingClientRect();
        const isLeft = e.clientX - rect.left < rect.width / 2;
        const stick = isLeft ? this.left : this.right;
        if (stick.active) return;
        stick.pointerId = e.pointerId;
        stick.active = true;
        stick.ox = p.x;
        stick.oy = p.y;
        stick.x = p.x;
        stick.y = p.y;
        stick.dx = 0;
        stick.dy = 0;
        e.preventDefault();
      }
    });

    canvas.addEventListener("pointermove", (e) => {
      const p = toLocal(e);
      if (e.pointerType === "mouse") {
        this.mouse.x = p.x;
        this.mouse.y = p.y;
        this.mouse.inside = true;
        return;
      }
      for (const stick of [this.left, this.right]) {
        if (stick.pointerId === e.pointerId && stick.active) {
          stick.x = p.x;
          stick.y = p.y;
          let dx = p.x - stick.ox;
          let dy = p.y - stick.oy;
          const len = Math.hypot(dx, dy);
          const max = 54;
          if (len > max) {
            dx = (dx / len) * max;
            dy = (dy / len) * max;
          }
          stick.dx = dx / max;
          stick.dy = dy / max;
          e.preventDefault();
        }
      }
    });

    const end = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        this.mouse.down = false;
        this.mouse.inside = false;
        return;
      }
      for (const stick of [this.left, this.right]) {
        if (stick.pointerId === e.pointerId) resetStick(stick);
      }
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") this.mouse.inside = false;
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    this.addCleanup(() => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
    });
  }

  private blankStick(): Stick {
    return {
      pointerId: null,
      ox: 0,
      oy: 0,
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      active: false,
    };
  }

  private signalFirst(): void {
    if (this.firedFirst) return;
    this.firedFirst = true;
    this.onFirstInput?.();
  }

  private addCleanup(fn: () => void): void {
    this.listeners.push(fn);
  }

  setView(view: ViewTransform): void {
    this.view = view;
  }

  private viewToRoom(x: number, y: number): { x: number; y: number } {
    const { scale, ox, oy } = this.view;
    return { x: (x - ox) / scale - 64, y: (y - oy) / scale - 112 };
  }

  movement(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has("KeyA")) x -= 1;
    if (this.keys.has("KeyD")) x += 1;
    if (this.keys.has("KeyW")) y -= 1;
    if (this.keys.has("KeyS")) y += 1;
    const keyboard = Math.hypot(x, y);
    if (keyboard > 0.1) {
      return { x: x / keyboard, y: y / keyboard };
    }
    if (this.left.active) {
      const len = Math.hypot(this.left.dx, this.left.dy);
      if (len > 0.16) return { x: this.left.dx / len, y: this.left.dy / len };
    }
    if (this.gamepad.connected) {
      const len = Math.hypot(this.gamepad.moveX, this.gamepad.moveY);
      if (len > 0.22) return { x: this.gamepad.moveX / len, y: this.gamepad.moveY / len };
    }
    return { x: 0, y: 0 };
  }

  arrowAim(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("ArrowRight")) x += 1;
    if (this.keys.has("ArrowUp")) y -= 1;
    if (this.keys.has("ArrowDown")) y += 1;
    const l = Math.hypot(x, y);
    return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }

  stickAim(): { x: number; y: number; active: boolean } {
    if (!this.right.active) return { x: 0, y: 0, active: false };
    const len = Math.hypot(this.right.dx, this.right.dy);
    if (len < 0.2) return { x: 0, y: 0, active: false };
    return { x: this.right.dx / len, y: this.right.dy / len, active: true };
  }

  gamepadAim(): { x: number; y: number; active: boolean } {
    if (!this.gamepad.connected || !this.gamepad.aimActive) return { x: 0, y: 0, active: false };
    return { x: this.gamepad.aimX, y: this.gamepad.aimY, active: true };
  }

  mouseAimRoom(): { x: number; y: number; active: boolean } {
    if (!this.mouse.down || !this.mouse.inside) return { x: 0, y: 0, active: false };
    const p = this.viewToRoom(this.mouse.x, this.mouse.y);
    return { x: p.x, y: p.y, active: true };
  }

  wantsBomb(): boolean {
    if (this.bombQueued) {
      this.bombQueued = false;
      return true;
    }
    return false;
  }

  queueBomb(): void {
    this.bombQueued = true;
  }

  wantsActive(): boolean {
    if (this.activeQueued) {
      this.activeQueued = false;
      return true;
    }
    return false;
  }

  wantsSkill(): boolean {
    if (this.skillQueued) {
      this.skillQueued = false;
      return true;
    }
    return false;
  }

  queueSkill(): void {
    this.skillQueued = true;
  }

  consumeGamepadPause(): boolean {
    if (this.gamepadPauseQueued) {
      this.gamepadPauseQueued = false;
      return true;
    }
    return false;
  }

  pollGamepad(): void {
    const pads = navigator.getGamepads?.();
    const pad = pads ? Array.from(pads).find((p) => p && p.connected) : null;
    if (!pad) {
      this.gamepad.connected = false;
      this.prevButtons = [];
      return;
    }
    this.gamepad.connected = true;
    const dead = (v: number) => (Math.abs(v) < 0.22 ? 0 : v);
    this.gamepad.moveX = dead(pad.axes[0] ?? 0);
    this.gamepad.moveY = dead(pad.axes[1] ?? 0);
    const ax = dead(pad.axes[2] ?? 0);
    const ay = dead(pad.axes[3] ?? 0);
    const len = Math.hypot(ax, ay);
    this.gamepad.aimActive = len > 0.28;
    this.gamepad.aimX = len > 0 ? ax / len : 0;
    this.gamepad.aimY = len > 0 ? ay / len : 0;
    const pressed = (i: number) => Boolean(pad.buttons[i]?.pressed);
    if (pressed(0) && !this.prevButtons[0]) this.bombQueued = true;
    if (pressed(1) && !this.prevButtons[1]) this.activeQueued = true;
    if (pressed(2) && !this.prevButtons[2]) this.skillQueued = true;
    if (pressed(9) && !this.prevButtons[9]) this.gamepadPauseQueued = true;
    this.prevButtons = pad.buttons.map((b) => b.pressed);
  }

  clearBomb(): void {
    this.bombQueued = false;
  }

  sticks(): { left: Stick; right: Stick } {
    return { left: this.left, right: this.right };
  }

  clear(): void {
    this.keys.clear();
    this.clearBomb();
    this.activeQueued = false;
    this.skillQueued = false;
    this.gamepadPauseQueued = false;
    this.left = this.blankStick();
    this.right = this.blankStick();
    this.mouse.down = false;
  }

  destroy(): void {
    for (const fn of this.listeners) fn();
    this.listeners = [];
  }
}
