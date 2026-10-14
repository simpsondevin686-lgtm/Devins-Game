import * as THREE from 'three';
import { Terrain } from './terrain.js';
import { Player } from './player.js';

const SKY = new THREE.Color(0x9fc4e8);

const scene = new THREE.Scene();
scene.background = SKY;
scene.fog = new THREE.Fog(SKY, 70, 260);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 3000);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- Lights ---
const sun = new THREE.DirectionalLight(0xfff3d6, 2.0);
sun.position.set(120, 220, 90);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 500;
sun.shadow.camera.left   = -120;
sun.shadow.camera.right  =  120;
sun.shadow.camera.top    =  120;
sun.shadow.camera.bottom = -120;
sun.shadow.bias = -0.0005;
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x3a2e1e, 0.55);
scene.add(hemi);

// --- World + player ---
const terrain = new Terrain(scene, 42);
const player = new Player(camera, terrain, renderer.domElement);

// Build a first ring of chunks around spawn so we don't fall through air.
terrain.update(player.pos);

// --- Resize ---
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// --- HUD ---
const hud = document.getElementById('hud');
const overlay = document.getElementById('overlay');
document.addEventListener('pointerlockchange', () => {
  overlay.style.display = document.pointerLockElement ? 'none' : 'flex';
});

// --- Loop ---
const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(0.05, clock.getDelta());

  player.update(dt);
  terrain.update(player.pos);

  // Keep the shadow frustum around the player
  sun.position.set(player.pos.x + 100, player.pos.y + 200, player.pos.z + 70);
  sun.target.position.copy(player.pos);
  sun.target.updateMatrixWorld();

  const p = player.pos;
  hud.textContent = `x ${p.x.toFixed(1)}  y ${p.y.toFixed(1)}  z ${p.z.toFixed(1)}  ·  ${player.onGround ? 'grounded' : 'airborne'}`;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
