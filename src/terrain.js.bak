import * as THREE from 'three';
import { SimplexNoise } from './noise.js';

export const CHUNK_SIZE = 64;   // world units per chunk
export const CHUNK_RES  = 64;   // quads per side (1 unit per quad)
const VIEW_RADIUS = 4;          // chunks out from player

export class Terrain {
  constructor(scene, seed = 1337) {
    this.scene = scene;
    this.noise = new SimplexNoise(seed);
    this.chunks = new Map();
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.95, metalness: 0.0,
    });
  }

  // Shared height field — used both for the mesh and player collision.
  height(x, z) {
    const n = this.noise;
    const cont = n.fbm(x * 0.0025, z * 0.0025, { octaves: 4 });     // continents
    const mtn  = n.ridged(x * 0.012, z * 0.012, { octaves: 5 });    // mountains
    const det  = n.fbm(x * 0.09, z * 0.09, { octaves: 3 });         // surface detail

    let h = cont * 55;
    h += Math.max(0, mtn - 0.42) * 90 * Math.max(0, cont + 0.25);
    h += det * 1.6;
    return h;
  }

  colorAt(h, x, z) {
    // Slope-aware would be nicer; for now elevation + slight noise.
    const c = new THREE.Color();
    const jitter = (this.noise.noise2D(x * 0.1, z * 0.1) * 0.03);
    if (h < -6)       c.setRGB(0.16, 0.26, 0.36);  // underwater-ish
    else if (h < 1)   c.setRGB(0.42, 0.44, 0.30);  // shore
    else if (h < 22)  c.setRGB(0.24, 0.38, 0.20);  // grass
    else if (h < 45)  c.setRGB(0.34, 0.32, 0.28);  // rock
    else              c.setRGB(0.90, 0.92, 0.96);  // snow
    c.r += jitter; c.g += jitter; c.b += jitter;
    return c;
  }

  buildChunk(cx, cz) {
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, CHUNK_RES, CHUNK_RES);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const ox = cx * CHUNK_SIZE, oz = cz * CHUNK_SIZE;

    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + ox;
      const wz = pos.getZ(i) + oz;
      const h = this.height(wx, wz);
      pos.setY(i, h);
      const c = this.colorAt(h, wx, wz);
      colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, this.material);
    mesh.position.set(ox, 0, oz);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.frustumCulled = true;
    return mesh;
  }

  update(playerPos) {
    const pcx = Math.floor(playerPos.x / CHUNK_SIZE);
    const pcz = Math.floor(playerPos.z / CHUNK_SIZE);
    const needed = new Set();

    for (let dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz++) {
      for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
        const cx = pcx + dx, cz = pcz + dz;
        const key = `${cx},${cz}`;
        needed.add(key);
        if (!this.chunks.has(key)) {
          const m = this.buildChunk(cx, cz);
          this.chunks.set(key, m);
          this.scene.add(m);
        }
      }
    }
    for (const [key, mesh] of this.chunks) {
      if (!needed.has(key)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        this.chunks.delete(key);
      }
    }
  }
}
