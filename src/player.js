import * as THREE from 'three';

const EYE_HEIGHT  = 1.7;
const WALK_SPEED  = 6.0;
const RUN_SPEED   = 12.0;
const JUMP_SPEED  = 7.0;
const GRAVITY     = 22.0;

const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

export class Player {
  constructor(camera, terrain, domElement) {
    this.camera = camera;
    this.terrain = terrain;
    this.dom = domElement;
    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = -0.1;
    this.onGround = false;
    this.keys = new Set();
    this.locked = false;
    this.isTouch = IS_TOUCH;

    // Touch state
    this.moveVec = { x: 0, y: 0 };   // joystick output (-1..1)
    this.jumpPressed = false;
    this.lookPointerId = null;
    this.movePointerId = null;
    this.jumpPointerId = null;
    this.lastLook = { x: 0, y: 0 };

    this.pos.y = terrain.height(0, 0) + EYE_HEIGHT;

    if (IS_TOUCH) {
      document.body.classList.add('touch');
      document.getElementById('ovHelp').textContent =
        'Left thumb: move · Right side: look · JUMP button';
      this._setupTouchUI();
    } else {
      document.getElementById('ovHelp').textContent =
        'WASD move · Shift run · Space jump · Esc release';
      this._setupDesktop();
    }

    // Overlay dismiss
    const overlay = document.getElementById('overlay');
    const dismiss = (e) => {
      e.preventDefault();
      overlay.style.display = 'none';
      if (!IS_TOUCH) this.dom.requestPointerLock();
    };
    overlay.addEventListener('click', dismiss);
    overlay.addEventListener('touchstart', dismiss, { passive: false });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      if (!IS_TOUCH) {
        overlay.style.display = this.locked ? 'none' : 'flex';
      }
    });
  }

  _setupDesktop() {
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw   -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      const lim = Math.PI / 2 - 0.01;
      this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
    });
    document.addEventListener('keydown', e => this.keys.add(e.code));
    document.addEventListener('keyup',   e => this.keys.delete(e.code));
  }

  _setupTouchUI() {
    const joy = document.getElementById('joy');
    const knob = document.getElementById('joyKnob');
    const jump = document.getElementById('jump');
    const MAX_R = 48;

    const setKnob = (dx, dy) => {
      const len = Math.hypot(dx, dy);
      const k = len > MAX_R ? MAX_R / len : 1;
      knob.style.transform = `translate(${dx*k}px, ${dy*k}px)`;
      this.moveVec.x = (dx * k) / MAX_R;
      this.moveVec.y = (dy * k) / MAX_R;
    };
    const resetKnob = () => {
      knob.style.transform = 'translate(0,0)';
      this.moveVec.x = 0; this.moveVec.y = 0;
    };
    const joyRect = () => joy.getBoundingClientRect();

    // --- Joystick ---
    joy.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.movePointerId = t.identifier;
      const r = joyRect();
      setKnob(t.clientX - (r.left + r.width/2), t.clientY - (r.top + r.height/2));
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.movePointerId) {
          const r = joyRect();
          setKnob(t.clientX - (r.left + r.width/2), t.clientY - (r.top + r.height/2));
        } else if (t.identifier === this.lookPointerId) {
          const dx = t.clientX - this.lastLook.x;
          const dy = t.clientY - this.lastLook.y;
          this.lastLook.x = t.clientX;
          this.lastLook.y = t.clientY;
          this.yaw   -= dx * 0.005;
          this.pitch -= dy * 0.005;
          const lim = Math.PI / 2 - 0.01;
          this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
        }
      }
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.movePointerId) { this.movePointerId = null; resetKnob(); }
        if (t.identifier === this.lookPointerId) { this.lookPointerId = null; }
        if (t.identifier === this.jumpPointerId) { this.jumpPointerId = null; this.jumpPressed = false; }
      }
    });
    document.addEventListener('touchcancel', () => {
      this.movePointerId = null; this.lookPointerId = null;
      this.jumpPointerId = null; this.jumpPressed = false; resetKnob();
    });

    // --- Look: any touch on the canvas that isn't the joystick/jump ---
    this.dom.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        const el = document.elementFromPoint(t.clientX, t.clientY);
        if (el && (el.id === 'joy' || el.id === 'joyKnob' ||
                   el.id === 'jump' || el.closest('#joy'))) continue;
        if (this.lookPointerId === null) {
          this.lookPointerId = t.identifier;
          this.lastLook.x = t.clientX;
          this.lastLook.y = t.clientY;
        }
      }
    }, { passive: false });

    // --- Jump button ---
    jump.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.jumpPointerId = t.identifier;
      this.jumpPressed = true;
    }, { passive: false });
  }

  update(dt) {
    const fwd   = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3( Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const wish = new THREE.Vector3();
    let wantRun = false;

    if (this.isTouch) {
      // Joystick: y is inverted (down = forward in screen space means push up)
      const mx = this.moveVec.x;
      const my = this.moveVec.y;
      if (Math.hypot(mx, my) > 0.05) {
        wish.add(fwd.clone().multiplyScalar(-my));
        wish.add(right.clone().multiplyScalar(mx));
        if (wish.lengthSq() > 0) wish.normalize();
      }
      wantRun = Math.hypot(mx, my) > 0.9;
    } else {
      if (this.keys.has('KeyW')) wish.add(fwd);
      if (this.keys.has('KeyS')) wish.sub(fwd);
      if (this.keys.has('KeyD')) wish.add(right);
      if (this.keys.has('KeyA')) wish.sub(right);
      if (wish.lengthSq() > 0) wish.normalize();
      wantRun = this.keys.has('ShiftLeft');
    }

    const speed = wantRun ? RUN_SPEED : WALK_SPEED;
    const accel = this.onGround ? 30 : 4;
    const target = wish.multiplyScalar(speed);
    const k = Math.min(1, accel * dt);
    this.vel.x += (target.x - this.vel.x) * k;
    this.vel.z += (target.z - this.vel.z) * k;

    this.vel.y -= GRAVITY * dt;

    const jumpWanted = this.isTouch ? this.jumpPressed : this.keys.has('Space');
    if (this.onGround && jumpWanted) {
      this.vel.y = JUMP_SPEED;
      this.onGround = false;
      this.jumpPressed = false;
    }

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    const groundY = this.terrain.height(this.pos.x, this.pos.z) + EYE_HEIGHT;
    this.pos.y += this.vel.y * dt;
    if (this.pos.y <= groundY) {
      this.pos.y = groundY;
      this.vel.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    this.camera.position.copy(this.pos);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(this.yaw);
    this.camera.rotateX(this.pitch);
  }
}
