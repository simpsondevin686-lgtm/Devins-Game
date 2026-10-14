import * as THREE from 'three';

const EYE_HEIGHT  = 1.7;
const WALK_SPEED  = 6.0;
const RUN_SPEED   = 12.0;
const JUMP_SPEED  = 7.0;
const GRAVITY     = 22.0;
const PLAYER_RADIUS = 0.4;

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

    this.pos.y = terrain.height(0, 0) + EYE_HEIGHT;

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
    });
    this.dom.addEventListener('click', () => {
      if (!this.locked) this.dom.requestPointerLock();
    });
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

  update(dt) {
    const fwd   = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3( Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const wish = new THREE.Vector3();
    if (this.keys.has('KeyW')) wish.add(fwd);
    if (this.keys.has('KeyS')) wish.sub(fwd);
    if (this.keys.has('KeyD')) wish.add(right);
    if (this.keys.has('KeyA')) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();

    const speed = this.keys.has('ShiftLeft') ? RUN_SPEED : WALK_SPEED;
    const accel = this.onGround ? 30 : 4;
    const target = wish.multiplyScalar(speed);
    const k = Math.min(1, accel * dt);
    this.vel.x += (target.x - this.vel.x) * k;
    this.vel.z += (target.z - this.vel.z) * k;

    // Gravity + jump
    this.vel.y -= GRAVITY * dt;
    if (this.onGround && this.keys.has('Space')) {
      this.vel.y = JUMP_SPEED;
      this.onGround = false;
    }

    // Integrate XZ first, then clamp Y against terrain
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
