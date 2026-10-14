// Simplex noise (2D) + fBm + ridged, seeded. Compact public-domain style.
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = new Float32Array([
  1,1, -1,1, 1,-1, -1,-1,
  1,0, -1,0, 1,0, -1,0,
  0,1, 0,-1, 0,1, 0,-1
]);

function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export class SimplexNoise {
  constructor(seed = 1337) {
    const rand = mulberry32(seed);
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp;
    }
    this.p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
  }

  noise2D(xin, yin) {
    const p = this.p;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0*x0 - y0*y0;
    if (t0 > 0) { const g = (p[ii + p[jj]] & 7) * 2; t0 *= t0; n0 = t0*t0*(GRAD[g]*x0 + GRAD[g+1]*y0); }
    let t1 = 0.5 - x1*x1 - y1*y1;
    if (t1 > 0) { const g = (p[ii + i1 + p[jj + j1]] & 7) * 2; t1 *= t1; n1 = t1*t1*(GRAD[g]*x1 + GRAD[g+1]*y1); }
    let t2 = 0.5 - x2*x2 - y2*y2;
    if (t2 > 0) { const g = (p[ii + 1 + p[jj + 1]] & 7) * 2; t2 *= t2; n2 = t2*t2*(GRAD[g]*x2 + GRAD[g+1]*y2); }
    return 70 * (n0 + n1 + n2);
  }

  fbm(x, y, { octaves = 5, lacunarity = 2.0, gain = 0.5, freq = 1.0 } = {}) {
    let a = 1, f = freq, sum = 0, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += a * this.noise2D(x * f, y * f);
      norm += a; a *= gain; f *= lacunarity;
    }
    return sum / norm;
  }

  ridged(x, y, { octaves = 5, lacunarity = 2.0, gain = 0.5, freq = 1.0 } = {}) {
    let a = 1, f = freq, sum = 0, norm = 0;
    for (let o = 0; o < octaves; o++) {
      const n = 1 - Math.abs(this.noise2D(x * f, y * f));
      sum += a * n * n;
      norm += a; a *= gain; f *= lacunarity;
    }
    return sum / norm;
  }
}
