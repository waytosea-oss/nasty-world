// Bladder Brawl - Fluid Lab. Hybrid: 2D painted art + 3D particle liquid (CPU PBF-lite / Clavet relaxation)
// rendered with screen-space fluid (depth + thickness -> bilateral blur -> normals -> refractive shading).
import * as THREE from './three.module.min.js';

const Q = new URLSearchParams(location.search);
const ART = '../../bladder-brawl/art/';
const $ = id => document.getElementById(id);

// ---------- calibrated scene (meters, Blender coords: x right, y away from wall, z up) ----------
// Camera + bowl fitted (least squares, scipy) so the projected bowl rim/drain match plate5c's painted urinal.
// Start point: Blender study (eye 1.65m, 0.57m from wall, pitch -50, 26mm/36mm). Fit result below.
const CAL = {
  fov: 58.156, pitch: -59.59, eye: [0, 0.7337, 1.5269],
  c: [0, 0.2874, 0.8443], r: [0.0989, 0.2625, 0.2804], n: 3, // superellipsoid cavity (x/z exponent n)
  yf: 0.35,                   // urinal front face (cavity open in front of this)
  box: [-0.125, 0.125, 0, 0.35, 0.50, 1.15], // outer porcelain body
  plate: [840, 1700],
};
const C = new THREE.Vector3(...CAL.c), R = CAL.r, NEXP = CAL.n;
const DRAIN = new THREE.Vector3(CAL.c[0], CAL.c[1], CAL.c[2] - R[2] * 0.97);

// implicit cavity function F<0 inside cavity; gradient
const IRX = 1 / R[0], IRY = 1 / R[1], IRZ = 1 / R[2];
function F(x, y, z) { // superellipsoid, exponent 3 in x/z (no Math.pow: fast on phones)
  const X = Math.abs((x - C.x) * IRX), Z = Math.abs((z - C.z) * IRZ), dy = (y - C.y) * IRY;
  const c = Math.cbrt(X * X * X + Z * Z * Z);
  return c * c + dy * dy - 1;
}
const G = [0, 0, 0];
function gradF(x, y, z) {
  const X = (x - C.x) * IRX, Z = (z - C.z) * IRZ, ax = Math.abs(X), az = Math.abs(Z);
  const c = Math.cbrt(ax * ax * ax + az * az * az) || 1e-6;
  G[0] = 2 * X * ax / c * IRX; G[1] = 2 * (y - C.y) * IRY * IRY; G[2] = 2 * Z * az / c * IRZ;
  return G;
}

// visible through the opening? (porcelain body occludes the hidden upper back of the cavity)
let CX = 0, CY = 0, CZ = 0; const FWD = new THREE.Vector3(), UPV = new THREE.Vector3();
function visible(x, y, z) {
  if (y >= CAL.yf) return true;
  const s = (CAL.yf - CY) / (y - CY); const qx = CX + (x - CX) * s, qz = CZ + (z - CZ) * s;
  if (qx < CAL.box[0] || qx > CAL.box[1] || qz < CAL.box[4] || qz > CAL.box[5]) {
    // ray may pass over the top face of the body instead
    if (z < CAL.box[5]) { const u = (CAL.box[5] - CZ) / (z - CZ); const tx = CX + (x - CX) * u, ty = CY + (y - CY) * u; if (u > 0 && u < 1 && tx > CAL.box[0] && tx < CAL.box[1] && ty > 0 && ty < CAL.yf) return false; }
    return true;
  }
  return F(qx, CAL.yf, qz) < 0;
}
// ---------- renderer / camera ----------
const canvas = $('gl');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!Q.get('shot') }); }
catch (e) { $('err').style.display = 'block'; $('err').textContent = 'WebGL not available: ' + e.message; throw e; }
renderer.autoClear = false;
const cam = new THREE.PerspectiveCamera(CAL.fov, CAL.plate[0] / CAL.plate[1], 0.05, 5);
cam.up.set(0, 0, 1);
cam.position.set(...CAL.eye);
{ const p = THREE.MathUtils.degToRad(CAL.pitch); cam.lookAt(CAL.eye[0], CAL.eye[1] - Math.cos(p), CAL.eye[2] + Math.sin(p)); }
cam.updateMatrixWorld();
CX = cam.position.x; CY = cam.position.y; CZ = cam.position.z;
cam.getWorldDirection(FWD); UPV.set(0, 1, 0).applyQuaternion(cam.quaternion);

// ---------- quality ----------
const LEVELS = [
  { name: 'Low', sub: 60, maxN: 700, rate: 520, rt: 0.42, dpr: 1, blur: 5 },
  { name: 'Med', sub: 90, maxN: 1100, rate: 700, rt: 0.5, dpr: 1.25, blur: 7 },
  { name: 'High', sub: 120, maxN: 2000, rate: 1000, rt: 0.7, dpr: 1.5, blur: 8 },
  { name: 'Ultra', sub: 120, maxN: 2800, rate: 1250, rt: 0.9, dpr: 2, blur: 10 },
];
let qAuto = !Q.get('q'), qi = Q.get('q') ? Math.max(0, Math.min(3, +Q.get('q'))) : 3;
const MAXN = 3200;

// ---------- layout ----------
let W = 0, H = 0, DPR = 1, PL = { s: 1, ox: 0, oy: 0 };
const bg = document.createElement('canvas'), bgx = bg.getContext('2d');
const stain = document.createElement('canvas'), stx = stain.getContext('2d');
const ov = document.getElementById('ov'), ovx = ov.getContext('2d');
let bgTex, RT = {};
function rtNew(w, h, depth) {
  const t = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!depth });
  return t;
}
function layout() {
  W = window.innerWidth; H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, LEVELS[qi].dpr);
  renderer.setPixelRatio(DPR); renderer.setSize(W, H, false);
  // framing: zoom the plate so the urinal (plate px x 180..672, flushometer top y 216, lip y 1196) fills ~95% of the width,
  // with a thin wall band on top and the lip just above the button bar. ?frame=old = v1/v2 cover-fit framing.
  let s, ox, oy;
  if (Q.get('frame') === 'old') { s = Math.max(W / CAL.plate[0], H / CAL.plate[1]); ox = (W - CAL.plate[0] * s) / 2; oy = (H - CAL.plate[1] * s) * 0.5; }
  else {
    const UX0 = 180, UX1 = 672, UY0 = 216, UY1 = 1196, band = 30, bottomUI = 78;
    s = Math.min(0.95 * W / (UX1 - UX0), (H - band - bottomUI) / (UY1 - UY0));
    s = Math.max(s, W / CAL.plate[0], H / CAL.plate[1]);
    ox = W / 2 - (UX0 + UX1) / 2 * s;
    const freeY = H - bottomUI - (UY1 - UY0) * s; oy = Math.min(band, Math.max(8, freeY * 0.35)) - UY0 * s;
    ox = Math.min(0, Math.max(W - CAL.plate[0] * s, ox)); oy = Math.min(0, Math.max(H - CAL.plate[1] * s, oy));
  }
  const pw = CAL.plate[0] * s, ph = CAL.plate[1] * s;
  PL = { s, ox, oy, pw, ph };
  cam.aspect = pw / ph;
  cam.setViewOffset(pw, ph, -PL.ox, -PL.oy, W, H);
  cam.updateProjectionMatrix();
  const bs = Math.min(qi >= 2 ? 1.25 : 1, DPR);
  bg.width = Math.round(W * bs); bg.height = Math.round(H * bs); bgx.setTransform(bs, 0, 0, bs, 0, 0);
  ov.width = Math.round(W * Math.min(2, window.devicePixelRatio || 1)); ov.height = Math.round(H * Math.min(2, window.devicePixelRatio || 1)); ovx.setTransform(ov.width / W, 0, 0, ov.width / W, 0, 0);
  stain.width = Math.round(W * 0.5); stain.height = Math.round(H * 0.5);
  if (bgTex) bgTex.dispose();
  bgTex = new THREE.CanvasTexture(bg); bgTex.minFilter = THREE.LinearFilter; bgTex.generateMipmaps = false; bgTex.colorSpace = THREE.NoColorSpace;
  const rw = Math.max(2, Math.round(W * DPR * LEVELS[qi].rt)), rh = Math.max(2, Math.round(H * DPR * LEVELS[qi].rt));
  for (const k in RT) if (RT[k].dispose) RT[k].dispose();
  RT = { depth: rtNew(rw, rh, true), thick: rtNew(rw, rh, false), a: rtNew(rw, rh, false), b: rtNew(rw, rh, false), ta: rtNew(rw, rh, false), tb: rtNew(rw, rh, false) };
  RT.size = [rw, rh];
  if (mats) { mats.comp.uniforms.bg.value = bgTex; }
}

// ---------- images ----------
const IMG = {};
function load(n, ext) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = ART + n + ext; IMG[n] = i; }); }
const webp = (() => { try { return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0; } catch (e) { return false; } })();
function whiteOf(im) { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); return c; }

// ---------- particles (CPU) ----------
const P = {
  n: 0, x: new Float32Array(MAXN), y: new Float32Array(MAXN), z: new Float32Array(MAXN),
  vx: new Float32Array(MAXN), vy: new Float32Array(MAXN), vz: new Float32Array(MAXN),
  ox: new Float32Array(MAXN), oy: new Float32Array(MAXN), oz: new Float32Array(MAXN),
  age: new Float32Array(MAXN), water: new Uint8Array(MAXN), touched: new Uint8Array(MAXN), gen: new Uint8Array(MAXN), wet: new Uint8Array(MAXN), rho: new Float32Array(MAXN),
};
function kill(i) { const j = --P.n; for (const k of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'ox', 'oy', 'oz', 'age', 'water', 'touched', 'gen', 'wet', 'rho']) P[k][i] = P[k][j]; }
const RAD = 0.0062;       // render radius (m)
const HH = 0.017;         // interaction radius
const HMASK = 8191, hStart = new Int32Array(HMASK + 2), hOf = new Int32Array(MAXN), sorted = new Int32Array(MAXN);
const CI = new Int32Array(MAXN), CJ = new Int32Array(MAXN), CK = new Int32Array(MAXN);
const MAXNB = 24, nbI = new Int32Array(MAXN * MAXNB), nbQ = new Float32Array(MAXN * MAXNB), nbN = new Uint8Array(MAXN);
const K_ST = 9, K_NEAR = 26, RHO0 = 2.6, XSPH = 0.06, GRAV = -9.81, IHH = 1 / HH;
const hsh = (i, j, k) => (Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(k, 83492791)) & HMASK;
function buildGrid() {
  hStart.fill(0);
  for (let i = 0; i < P.n; i++) { const a = Math.floor(P.x[i] * IHH), b = Math.floor(P.y[i] * IHH), c = Math.floor(P.z[i] * IHH); CI[i] = a; CJ[i] = b; CK[i] = c; const h = P.touched[i] ? hsh(a, b, c) : -1; hOf[i] = h; if (h >= 0) hStart[h + 1]++; }
  for (let h = 0; h <= HMASK; h++) hStart[h + 1] += hStart[h];
  const fill = hStart.slice(0, HMASK + 1);
  for (let i = 0; i < P.n; i++) { const h = hOf[i]; if (h >= 0) sorted[fill[h]++] = i; }
}
function relax(dt) {
  const dt2 = dt * dt, H2 = HH * HH;
  buildGrid();
  for (let i = 0; i < P.n; i++) {
    nbN[i] = 0; if (hOf[i] < 0) continue;
    const xi = P.x[i], yi = P.y[i], zi = P.z[i], ci = CI[i], cj = CJ[i], ck = CK[i];
    let rho = 0, rhoN = 0, cnt = 0; const base = i * MAXNB;
    for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const h = hsh(ci + di, cj + dj, ck + dk);
      for (let s = hStart[h], e = hStart[h + 1]; s < e; s++) {
        const j = sorted[s]; if (j === i) continue;
        const dx = P.x[j] - xi, dy = P.y[j] - yi, dz = P.z[j] - zi, r2 = dx * dx + dy * dy + dz * dz;
        if (r2 >= H2 || r2 < 1e-12) continue;
        const q = 1 - Math.sqrt(r2) * IHH; rho += q * q; rhoN += q * q * q;
        if (cnt < MAXNB && j > i) { nbI[base + cnt] = j; nbQ[base + cnt] = q; cnt++; }
      }
    }
    nbN[i] = cnt; P.rho[i] = rho;
    PR[i] = P.water[i] ? 4 * (rho - 0.6) : K_ST * (rho - RHO0); PN[i] = K_NEAR * rhoN;
  }
  // pairwise displacement (each pair once) + XSPH viscosity
  for (let i = 0; i < P.n; i++) {
    const cnt = nbN[i]; if (!cnt) continue; const base = i * MAXNB;
    for (let k = 0; k < cnt; k++) {
      const j = nbI[base + k], q = nbQ[base + k];
      const dx = P.x[j] - P.x[i], dy = P.y[j] - P.y[i], dz = P.z[j] - P.z[i], r = (1 - q) * HH || 1e-6;
      const pr = 0.5 * (PR[i] + PR[j]), pn = 0.5 * (PN[i] + PN[j]);
      const D = Math.max(-0.08, Math.min(0.08, dt2 * (pr * q + pn * q * q) * 0.5 / r));
      P.x[j] += dx * D; P.y[j] += dy * D; P.z[j] += dz * D; P.x[i] -= dx * D; P.y[i] -= dy * D; P.z[i] -= dz * D;
      const wx = (P.vx[j] - P.vx[i]) * q * XSPH * 0.5, wy = (P.vy[j] - P.vy[i]) * q * XSPH * 0.5, wz = (P.vz[j] - P.vz[i]) * q * XSPH * 0.5;
      P.vx[i] += wx; P.vy[i] += wy; P.vz[i] += wz; P.vx[j] -= wx; P.vy[j] -= wy; P.vz[j] -= wz;
    }
  }
}
const PR = new Float32Array(MAXN), PN = new Float32Array(MAXN);
const BX = CAL.box;
let LIPZ = 0; { let lo = 0, hi = 0.5; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (F(C.x, CAL.yf, C.z - m) < 0) lo = m; else hi = m; } LIPZ = C.z - R[2] * 0.3; }
function collide(i) {
  let x = P.x[i], y = P.y[i], z = P.z[i];
  if (y < 0.004) { y = 0.004; if (P.vy[i] < 0) { P.vy[i] *= -0.1; } P.vx[i] *= 0.9; P.vz[i] *= 0.95; }
  if (z < 0) { return false; }
  const inBox = x > BX[0] && x < BX[1] && y < BX[3] && z > BX[4] && z < BX[5];
  if (inBox) {
    const f = F(x, y, z);
    if (f > 0) {
      // penetration into porcelain: choose nearest exit (cavity surface or outer faces)
      const g = gradF(x, y, z), gl = Math.hypot(g[0], g[1], g[2]) || 1;
      const dc = f / gl;
      const dTop = BX[5] - z, dFront = BX[3] - y, dL = x - BX[0], dR = BX[1] - x, dBot = z - BX[4];
      const m = Math.min(dc, dTop, dFront, dL, dR, dBot);
      let nx = 0, ny = 0, nz = 0;
      if (m === dc) {
        for (let it = 0; it < 3; it++) { const ff = F(x, y, z); if (ff <= 0) break; const gg = gradF(x, y, z), g2 = gg[0] * gg[0] + gg[1] * gg[1] + gg[2] * gg[2] || 1; x -= gg[0] * ff / g2 * 1.05; y -= gg[1] * ff / g2 * 1.05; z -= gg[2] * ff / g2 * 1.05; }
        const gg = gradF(x, y, z), l = Math.hypot(gg[0], gg[1], gg[2]) || 1; nx = -gg[0] / l; ny = -gg[1] / l; nz = -gg[2] / l;
        P.wet[i] = 1; P.touched[i] = 1;
      } else if (m === dTop) { z = BX[5] + 1e-4; nz = 1; }
      else if (m === dFront) { y = BX[3] + 1e-4; ny = 1; }
      else if (m === dL) { x = BX[0] - 1e-4; nx = -1; }
      else if (m === dR) { x = BX[1] + 1e-4; nx = 1; }
      else { z = BX[4] - 1e-4; nz = -1; }
      const vn = P.vx[i] * nx + P.vy[i] * ny + P.vz[i] * nz;
      if (vn < 0) {
        const e = 0.04 + (P.gen[i] ? 0.15 : 0); // mostly sticky film; splash droplets bounce a bit more
        P.vx[i] -= (1 + e) * vn * nx; P.vy[i] -= (1 + e) * vn * ny; P.vz[i] -= (1 + e) * vn * nz;
        const fr = 0.985; P.vx[i] *= fr; P.vy[i] *= fr; P.vz[i] *= fr;
      }
    }
  }
  // front lip: the bowl floor is closed in front up to the painted lower rim (water pools, then drains)
  if (y > CAL.yf - 0.025 && y < CAL.yf + 0.05 && z < LIPZ && z > BX[4] && x > BX[0] && x < BX[1] && P.oy[i] <= CAL.yf - 0.02) { y = CAL.yf - 0.025; if (P.vy[i] > 0) P.vy[i] *= -0.1; }
  P.x[i] = x; P.y[i] = y; P.z[i] = z;
  return true;
}

// ---------- jet ----------
const aim = { x: 0, y: 0.06, z: 0.80, tx: 0, ty: 0.06, tz: 0.8 };
const ORIG = new THREE.Vector3();
let lastO = null, lastV = null, emitAcc = 0, flowOn = true;
const JH = [], JH_MAX = 160; // jet emission history: {t,o,v} per substep
function emitterOrigin(t) {
  // the player's body is above/behind the camera: emit from just behind+above the eye, so every point the
  // camera can see is reachable by a near-straight jet through the urinal opening; the jet enters from the top edge.
  ORIG.copy(cam.position).addScaledVector(FWD, -0.05).addScaledVector(UPV, 0.07);
  ORIG.x += (aim.x - C.x) * 0.3 + Math.sin(t * 1.3) * 0.004; ORIG.z += Math.sin(t * 2.1) * 0.003;
  return ORIG;
}
function emit(dt, t) {
  if (!flowOn || flushT > 0) { lastO = null; return; } // flush: the stream pauses so the clear sheet reads clean
  const L = LEVELS[qi];
  aim.x += (aim.tx - aim.x) * Math.min(1, dt * 14); aim.y += (aim.ty - aim.y) * Math.min(1, dt * 14); aim.z += (aim.tz - aim.z) * Math.min(1, dt * 14);
  const o = emitterOrigin(t).clone();
  // flight time: shortest ballistic arc that enters through the opening (front face) without clipping the rim
  const T = 0.2;
  window.__T = [T, o.x, o.y, o.z];
  const v = new THREE.Vector3((aim.x - o.x) / T, (aim.y - o.y) / T, (aim.z - o.z - 0.5 * GRAV * T * T) / T);
  JH.push({ t, ox: o.x, oy: o.y, oz: o.z, vx: v.x, vy: v.y, vz: v.z }); if (JH.length > JH_MAX) JH.shift();
  const pulse = 1 + 0.12 * Math.sin(t * 9);
  emitAcc += L.rate * 1.3 * dt * pulse;
  const n = Math.floor(emitAcc); emitAcc -= n;
  for (let k = 0; k < n && P.n < Math.min(MAXN, L.maxN); k++) {
    const f = (k + Math.random()) / Math.max(1, n);
    const i = P.n++;
    const ox = lastO ? lastO.x + (o.x - lastO.x) * f : o.x, oy = lastO ? lastO.y + (o.y - lastO.y) * f : o.y, oz = lastO ? lastO.z + (o.z - lastO.z) * f : o.z;
    const jit = 0.0009, sv = 0.02;
    const back = (1 - f) * dt; // sub-frame advance so the column is continuous
    const vx = v.x + (Math.random() - .5) * sv, vy = v.y + (Math.random() - .5) * sv, vz = v.z + (Math.random() - .5) * sv;
    P.x[i] = ox + (Math.random() - .5) * jit + vx * back; P.y[i] = oy + (Math.random() - .5) * jit + vy * back; P.z[i] = oz + (Math.random() - .5) * jit + (vz + 0.5 * GRAV * back) * back;
    P.vx[i] = vx; P.vy[i] = vy; P.vz[i] = vz + GRAV * back;
    P.age[i] = 0; P.gen[i] = 0; P.wet[i] = 0; P.touched[i] = 0; P.water[i] = 0;
  }
  lastO = o;
}

// ---------- flush: big volume of clear water from the rim inlet, sheeting over the whole bowl ----------
let flushT = 0, flushAcc = 0, flushes = 0;
const FLUSH_DUR = 2.8;
function startFlush() { if (flushT > 0) return; flushT = 0.0001; flushes++; }
function emitFlush(dt) {
  if (flushT <= 0) return;
  flushT += dt; if (flushT > FLUSH_DUR) { flushT = 0; return; }
  const ramp = Math.min(1, flushT / 0.25) * Math.max(0.25, Math.min(1, (2.0 - flushT) / 0.8)) * (flushT < 2.4 ? 1 : 0);
  flushAcc += 3000 * dt * ramp * (0.6 + 0.4 * LEVELS[qi].rt / 0.75);
  const n = Math.floor(flushAcc); flushAcc -= n;
  for (let k = 0; k < n && P.n < MAXN; k++) {
    const a = (Math.random() - 0.5) * 2.7, el = 0.42 + Math.random() * 0.22;
    const dx = Math.sin(a) * Math.cos(el), dz = Math.sin(el), dy = -Math.abs(Math.cos(a)) * Math.cos(el) - 0.05;
    const l = Math.hypot(dx, dy, dz), p = surfacePoint(dx / l, dy / l, dz / l);
    const g = gradF(p.x, p.y, p.z), gl = Math.hypot(g[0], g[1], g[2]); const nx = -g[0] / gl, ny = -g[1] / gl, nz = -g[2] / gl;
    const i = P.n++;
    P.x[i] = p.x + nx * 0.004; P.y[i] = p.y + ny * 0.004; P.z[i] = p.z + nz * 0.004;
    const sp = 0.9 + Math.random() * 0.6; // downward along the porcelain, fanning out from the inlet
    P.vx[i] = Math.sin(a) * 0.5 * sp + (Math.random() - .5) * 0.2; P.vy[i] = ny * 0.3; P.vz[i] = -sp;
    P.age[i] = 0; P.gen[i] = 0; P.wet[i] = 1; P.touched[i] = 1; P.water[i] = 1;
  }
}

// ---------- bugs ----------
const BUGS = [], POPS = [], FLOAT = [];
let score = 0, kills = 0, escaped = 0;
const TYPES = { fly: { img: 'en-fly', r: 0.016, hp: 60, spd: 0.026, pts: 10 }, roach: { img: 'en-roach', r: 0.021, hp: 120, spd: 0.018, pts: 25 } };
function surfacePoint(dirx, diry, dirz) {
  // march from center along dir to the cavity surface
  let lo = 0, hi = 0.6;
  for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (F(C.x + dirx * m, C.y + diry * m, C.z + dirz * m) < 0) lo = m; else hi = m; }
  return new THREE.Vector3(C.x + dirx * lo, C.y + diry * lo, C.z + dirz * lo);
}
function projectToSurface(p) {
  for (let it = 0; it < 4; it++) { const f = F(p.x, p.y, p.z); const g = gradF(p.x, p.y, p.z), g2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2] || 1; p.x -= g[0] * f / g2; p.y -= g[1] * f / g2; p.z -= g[2] * f / g2; }
  return p;
}
function spawnBug() {
  const type = Math.random() < 0.55 ? 'fly' : 'roach', T = TYPES[type];
  const a = (Math.random() - 0.5) * 2.0, el = -0.55 - Math.random() * 0.35; // lower part of the back wall
  const dx = Math.sin(a) * Math.cos(el), dz = Math.sin(el), dy = -Math.abs(Math.cos(a) * Math.cos(el)) - 0.15;
  const l = Math.hypot(dx, dy, dz);
  const p = surfacePoint(dx / l, dy / l, dz / l);
  if (!visible(p.x, p.y, p.z + 0.06) || p.z < DRAIN.z + 0.04) return;
  BUGS.push({ type, T, p, hp: T.hp, max: T.hp, dir: Math.PI / 2 + (Math.random() - .5), flash: 0, wob: Math.random() * 9, push: new THREE.Vector3(), dead: 0, born: 0 });
}
function updateBugs(dt) {
  for (let b = BUGS.length - 1; b >= 0; b--) {
    const B = BUGS[b];
    B.born = Math.min(1, B.born + dt * 2);
    if (B.dead) { B.dead += dt; if (B.dead > 0.45) BUGS.splice(b, 1); continue; }
    B.flash = Math.max(0, B.flash - dt * 6); B.wob += dt;
    // tangent frame: "up the wall" = projection of +z onto tangent plane
    const g = gradF(B.p.x, B.p.y, B.p.z), gl = Math.hypot(g[0], g[1], g[2]); const n = new THREE.Vector3(-g[0] / gl, -g[1] / gl, -g[2] / gl);
    const up = new THREE.Vector3(0, 0, 1).addScaledVector(n, -n.z).normalize();
    const side = new THREE.Vector3().crossVectors(n, up).normalize();
    B.dir += (Math.sin(B.wob * 1.7 + b) * 0.9 + (Math.random() - .5) * 2) * dt;
    B.dir += (Math.PI / 2 - B.dir) * dt * 0.6;
    const slow = (B.flash > 0 ? 0.35 : 1) * (Math.sin(B.wob * 0.9 + b * 2) > 0.55 ? 0.1 : 1);
    const step = B.T.spd * dt * slow;
    const mv = side.clone().multiplyScalar(Math.cos(B.dir) * step).addScaledVector(up, Math.sin(B.dir) * step).add(B.push.clone().multiplyScalar(dt));
    B.push.multiplyScalar(Math.pow(flushT > 0 ? 0.3 : 0.02, dt)); if (B.push.length() > 0.5) B.push.setLength(0.5);
    if (B.p.z < DRAIN.z + 0.002) mv.z = Math.max(mv.z, 0); B.p.add(mv); projectToSurface(B.p);
    if (B.p.y > CAL.yf - 0.03) { B.p.y = CAL.yf - 0.03; projectToSurface(B.p); B.dir = Math.PI - B.dir; }
    B.heading = mv;
    if (B.swept && B.p.distanceTo(DRAIN) < 0.05) { damage(B, 1e9, 0, 0, 0); FLOAT.push({ txt: 'flushed! +' + B.T.pts, p: B.p.clone(), t: 0, col: '#9fe8ff' }); continue; }
    if (B.push.length() > 0.08) B.dir += 0;
    if (!visible(B.p.x, B.p.y, B.p.z + B.T.r)) { escaped++; BUGS.splice(b, 1); FLOAT.push({ txt: 'escaped!', p: B.p.clone(), t: 0, col: '#ff6b6b' }); continue; }
  }
  const want = 5;
  if (BUGS.filter(b => !b.dead).length < want && Math.random() < dt * 1.5) spawnBug();
}
function damage(B, d, sx, sy, sz) {
  if (B.dead) return;
  B.hp -= d; B.flash = 1;
  B.push.x += sx * 0.0; B.push.z -= Math.min(0.06, d * 0.01);
  if (B.hp <= 0) {
    B.dead = 0.001; kills++; score += B.T.pts;
    POPS.push({ p: B.p.clone(), t: 0, r: B.T.r });
    if (!B.swept) FLOAT.push({ txt: '+' + B.T.pts, p: B.p.clone(), t: 0, col: '#ffe14d' });
    // death pop: burst of droplets
    for (let k = 0; k < 18 && P.n < MAXN; k++) { const i = P.n++; const a = Math.random() * 6.283, s = 0.4 + Math.random() * 0.8; P.x[i] = B.p.x; P.y[i] = B.p.y + 0.01; P.z[i] = B.p.z; P.vx[i] = Math.cos(a) * s * 0.6; P.vy[i] = 0.1 + Math.random() * 0.2; P.vz[i] = Math.sin(a) * s * 0.6 + 0.3; P.age[i] = 0; P.gen[i] = 2; P.wet[i] = 0; P.touched[i] = 1; P.water[i] = 0; }
  }
}
let hitsJet = 0, hitsSplash = 0;
function bugCollide(i) {
  for (const B of BUGS) {
    if (B.dead) continue;
    const r = B.T.r * 1.1;
    // swept test along this step's motion (no tunnelling at low sim rates)
    const sx = P.x[i] - P.ox[i], sy = P.y[i] - P.oy[i], sz = P.z[i] - P.oz[i], sl = sx * sx + sy * sy + sz * sz;
    let u = sl > 1e-12 ? ((B.p.x - P.ox[i]) * sx + (B.p.y - P.oy[i]) * sy + (B.p.z - P.oz[i]) * sz) / sl : 1; u = u < 0 ? 0 : u > 1 ? 1 : u;
    const dx = P.ox[i] + sx * u - B.p.x, dy = P.oy[i] + sy * u - B.p.y, dz = P.oz[i] + sz * u - B.p.z;
    const d2 = dx * dx + dy * dy + dz * dz; if (d2 > r * r) continue;
    const d = Math.sqrt(d2) || 1e-4, nx = dx / d, ny = dy / d, nz = dz / d;
    const vn = P.vx[i] * nx + P.vy[i] * ny + P.vz[i] * nz;
    if (vn >= 0) { P.x[i] = B.p.x + nx * r; P.y[i] = B.p.y + ny * r; P.z[i] = B.p.z + nz * r; continue; }
    const speed = Math.hypot(P.vx[i], P.vy[i], P.vz[i]);
    if (P.water[i]) { // flush water: drags the bug down toward the drain
      const ex = DRAIN.x - B.p.x, ey = DRAIN.y - B.p.y, ez = DRAIN.z - B.p.z, el = Math.hypot(ex, ey, ez) || 1;
      B.push.x += ex / el * 0.05; B.push.y += ey / el * 0.05; B.push.z += ez / el * 0.05 - 0.02; B.flash = Math.max(B.flash, 0.4); B.swept = 1;
      P.x[i] = B.p.x + nx * r; P.y[i] = B.p.y + ny * r; P.z[i] = B.p.z + nz * r; continue;
    }
    const gen = P.gen[i];
    // damage proportional to impact momentum (unit mass): direct jet full, ricochet droplets reduced
    const mult = gen === 0 ? 1 : gen === 1 ? 0.35 : 0.12;
    damage(B, 0.16 * (-vn + 0.3 * speed) * mult, P.vx[i], P.vy[i], P.vz[i]);
    if (gen === 0) { hitsJet++; if (Math.random() < 0.6 && P.n < MAXN) { const k = P.n++; const a = Math.random() * 6.283, sp2 = speed * (0.25 + Math.random() * 0.3);
        P.x[k] = B.p.x + nx * r; P.y[k] = B.p.y + ny * r; P.z[k] = B.p.z + nz * r; P.vx[k] = Math.cos(a) * sp2 + nx * 0.4; P.vy[k] = Math.abs(ny) * 0.3 + Math.random() * 0.25; P.vz[k] = Math.abs(Math.sin(a)) * sp2 * 0.8 + 0.3;
        P.ox[k] = P.x[k]; P.oy[k] = P.y[k]; P.oz[k] = P.z[k]; P.age[k] = 0; P.gen[k] = 1; P.wet[k] = 0; P.touched[k] = 1; P.water[k] = 0; } } else hitsSplash++;
    // ricochet as a droplet: reflect + random spray, mostly outward (towards camera / sideways)
    const e = 0.45 + Math.random() * 0.25;
    P.vx[i] -= (1 + e) * vn * nx; P.vy[i] -= (1 + e) * vn * ny; P.vz[i] -= (1 + e) * vn * nz;
    const sp = speed * 0.35;
    P.vx[i] = P.vx[i] * 0.5 + (Math.random() - .5) * sp * 1.4; P.vy[i] = Math.min(P.vy[i] * 0.4, 0.6) + Math.random() * sp * 0.25; P.vz[i] = P.vz[i] * 0.5 + (Math.random() - .1) * sp;
    P.x[i] = B.p.x + nx * r; P.y[i] = B.p.y + ny * r; P.z[i] = B.p.z + nz * r;
    P.gen[i] = Math.min(2, gen + 1); P.touched[i] = 1;
    return;
  }
}

// ---------- simulation step ----------
let drained = 0;
function step(dt, t) {
  emit(dt, t); emitFlush(dt);
  const n = P.n;
  for (let i = 0; i < n; i++) {
    P.vz[i] += GRAV * dt;
    // air drag for small droplets
    if (!P.wet[i]) { const d = 1 - 0.15 * dt; P.vx[i] *= d; P.vy[i] *= d; P.vz[i] *= d; }
    P.ox[i] = P.x[i]; P.oy[i] = P.y[i]; P.oz[i] = P.z[i];
    P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.z[i] += P.vz[i] * dt;
    P.age[i] += dt;
  }
  relax(dt);
  for (let i = 0; i < P.n; i++) {
    P.vx[i] = (P.x[i] - P.ox[i]) / dt; P.vy[i] = (P.y[i] - P.oy[i]) / dt; P.vz[i] = (P.z[i] - P.oz[i]) / dt;
    const sp2 = P.vx[i] ** 2 + P.vy[i] ** 2 + P.vz[i] ** 2; if (sp2 > 64) { const s = 8 / Math.sqrt(sp2); P.vx[i] *= s; P.vy[i] *= s; P.vz[i] *= s; }
  }
  for (let i = P.n - 1; i >= 0; i--) {
    bugCollide(i);
    P.wet[i] = 0;
    if (!collide(i)) { kill(i); continue; }
    const dx = P.x[i] - DRAIN.x, dy = P.y[i] - DRAIN.y, dz = P.z[i] - DRAIN.z;
    const dd = dx * dx + dy * dy + dz * dz;
    const dr = flushT > 0 ? 0.045 : 0.03; if (dd < dr * dr) { kill(i); drained++; continue; }
    if (P.wet[i] && dd < 0.15 * 0.15) { const s = 2.2 * dt; P.vx[i] -= dx / Math.sqrt(dd) * s; P.vy[i] -= dy / Math.sqrt(dd) * s; } // funnel toward drain
    if (P.age[i] > 7 || P.z[i] < BX[4] || (P.y[i] > CAL.yf + 0.005 && P.z[i] < LIPZ + 0.02) || (!P.water[i] && P.touched[i] && P.age[i] > 2.6)) { kill(i); continue; }
    if (P.wet[i]) { const m = Math.sin(i * 1.7 + P.z[i] * 55) + 0.5 * Math.sin(i * 0.37 + P.z[i] * 130); P.vx[i] += m * 0.5 * dt; } // irregular rivulets
  }
}

// ---------- shaders ----------
const QUAD = new THREE.PlaneGeometry(2, 2);
const vsQuad = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
let mats = null, pGeo, pts, quadScene, quadCam, quadMesh, dbgScene;
function initGL() {
  pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXN * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('gen', new THREE.BufferAttribute(new Float32Array(MAXN * 4), 1).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('sz', new THREE.BufferAttribute(new Float32Array(MAXN * 4), 1).setUsage(THREE.DynamicDrawUsage));
  pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.3, 0.8), 5);
  const pv = `uniform float uScale, uRad; attribute float gen; attribute float sz; varying float vZ; varying float vR; varying float vP; varying float vJ; varying float vT;
    void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); float w=step(3.5,gen); float g=gen-4.*w; vP=1.-w; vJ=step(1.5,g)*step(2.5,-g+5.)*(1.-w)*step(g,2.5);
      // jet: thin, and narrower near the camera (top of screen); splash: fine droplets; film: thin; water sheet: wide
      float jr = 0.40*clamp(-mv.z/0.75,0.55,1.0);
      vR=uRad*sz*(g>1.5?jr:(g>0.5?0.28:(w<0.5?0.95:0.85)))*(1.+0.9*w);
      vT=(g<0.5&&w<0.5)?0.55:1.0; gl_PointSize=max(1.5, vR*uScale/-mv.z); vZ=-mv.z; gl_Position=projectionMatrix*mv; }`;
  const depthMat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 1 }, uRad: { value: RAD } }, vertexShader: pv,
    fragmentShader: `varying float vZ; varying float vR; varying float vP; varying float vJ; varying float vT; void main(){ vec2 c=gl_PointCoord*2.-1.; c.y=-c.y; float r2=dot(c,c); if(r2>1.) discard; float nz=sqrt(1.-r2); gl_FragColor=vec4(vZ-nz*vR*(vT<0.9?0.04:(vP<0.5?0.3:1.)),0.,0.,1.); }`,
    depthTest: true, depthWrite: true, blending: THREE.NoBlending,
  });
  const thickMat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 1 }, uRad: { value: RAD } }, vertexShader: pv,
    fragmentShader: `varying float vZ; varying float vR; varying float vP; varying float vJ; varying float vT; void main(){ vec2 c=gl_PointCoord*2.-1.; float r2=dot(c,c); if(r2>1.) discard; float nz=sqrt(1.-r2); float t=nz*vR*2.*100.*vT*(vJ>0.5?4.0:1.0); gl_FragColor=vec4(t,t*vP,t*vJ,1.); }`,
    depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
  });
  const blurDepth = new THREE.ShaderMaterial({
    uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() }, rad: { value: 6 }, fall: { value: 0.02 } }, vertexShader: vsQuad,
    fragmentShader: `uniform sampler2D tex; uniform vec2 dir; uniform float rad; uniform float fall; varying vec2 vUv;
      void main(){ float d0=texture2D(tex,vUv).r; if(d0<=0.){ // fill tiny gaps from neighbours (closes holes between particles)
          float s=0.,w=0.; for(int i=-3;i<=3;i++){ float d=texture2D(tex,vUv+dir*float(i)).r; if(d>0.){ s+=d; w+=1.; } } gl_FragColor=vec4(w>=4.?s/w:0.,0.,0.,1.); return; }
        float s=0., w=0.; float sig=rad*0.5;
        for(int i=-12;i<=12;i++){ float fi=float(i); if(abs(fi)>rad) continue; float d=texture2D(tex,vUv+dir*fi).r; if(d<=0.) continue;
          float ws=exp(-fi*fi/(2.*sig*sig)); float dz=(d-d0)/fall; float wr=exp(-dz*dz); s+=d*ws*wr; w+=ws*wr; }
        gl_FragColor=vec4(s/max(w,1e-5),0.,0.,1.); }`,
    depthTest: false, depthWrite: false,
  });
  const blurThick = new THREE.ShaderMaterial({
    uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() }, rad: { value: 6 } }, vertexShader: vsQuad,
    fragmentShader: `uniform sampler2D tex; uniform vec2 dir; uniform float rad; varying vec2 vUv;
      void main(){ vec3 s2=vec3(0.); float w=0.; float sig=rad*0.5; for(int i=-12;i<=12;i++){ float fi=float(i); if(abs(fi)>rad) continue; float ws=exp(-fi*fi/(2.*sig*sig)); s2+=texture2D(tex,vUv+dir*fi).rgb*ws; w+=ws; } gl_FragColor=vec4(s2/w,1.); }`,
    depthTest: false, depthWrite: false,
  });
  const comp = new THREE.ShaderMaterial({
    uniforms: { bg: { value: bgTex }, dep: { value: null }, thk: { value: null }, invP: { value: new THREE.Matrix4() }, texel: { value: new THREE.Vector2() }, show: { value: 1 } },
    vertexShader: vsQuad,
    fragmentShader: `uniform sampler2D bg, dep, thk; uniform mat4 invP; uniform vec2 texel; uniform float show; varying vec2 vUv;
      vec3 vpos(vec2 uv, float d){ vec4 v=invP*vec4(uv*2.-1.,-1.,1.); v/=v.w; return v.xyz/(-v.z)*d; }
      void main(){
        vec3 base=texture2D(bg,vUv).rgb;
        float d=texture2D(dep,vUv).r; vec3 tk=texture2D(thk,vUv).rgb; float th=tk.r; float pf=clamp(tk.g/max(th,1e-4),0.,1.); float jf=clamp(tk.b/max(th,1e-4),0.,1.);
        if(d<=0.||show<0.5||th<0.02){ gl_FragColor=vec4(base,1.); return; }
        vec3 p=vpos(vUv,d);
        float dr=texture2D(dep,vUv+vec2(texel.x,0.)).r, dl=texture2D(dep,vUv-vec2(texel.x,0.)).r;
        float du=texture2D(dep,vUv+vec2(0.,texel.y)).r, dd=texture2D(dep,vUv-vec2(0.,texel.y)).r;
        vec3 ddx = (dr>0.) ? vpos(vUv+vec2(texel.x,0.),dr)-p : p-vpos(vUv-vec2(texel.x,0.),dl);
        vec3 ddx2= (dl>0.) ? p-vpos(vUv-vec2(texel.x,0.),dl) : ddx; if(abs(ddx2.z)<abs(ddx.z)) ddx=ddx2;
        vec3 ddy = (du>0.) ? vpos(vUv+vec2(0.,texel.y),du)-p : p-vpos(vUv-vec2(0.,texel.y),dd);
        vec3 ddy2= (dd>0.) ? p-vpos(vUv-vec2(0.,texel.y),dd) : ddy; if(abs(ddy2.z)<abs(ddy.z)) ddy=ddy2;
        vec3 n=normalize(cross(ddx,ddy)); if(n.z<0.) n=-n; n=normalize(mix(n,vec3(0.,0.,1.),0.93*(1.-jf)));
        vec3 v=normalize(-p);
        float t=clamp(th,0.,6.)*mix(0.4,1.,jf); t=min(t,0.9+1.5*jf);
        // refraction of the painted background through the liquid
        vec2 ruv=vUv + n.xy*(0.004+0.0025*t)*vec2(1.,0.6);
        vec3 refr=texture2D(bg,clamp(ruv,0.001,0.999)).rgb;
        vec3 absorb=mix(vec3(0.03,0.015,0.008),vec3(0.004,0.014,0.07),pf);              // pale yellow tint grows with thickness
        vec3 trans=refr*exp(-absorb*t*0.9)*1.04 + vec3(0.012,0.010,0.0)*min(t,1.)*pf + vec3(0.02,0.03,0.04)*min(t,2.)*(1.-pf);
        float ndv=max(dot(n,v),0.); float fres=0.03+0.97*pow(1.-ndv,5.);
        vec3 L1=normalize(vec3(-0.4,0.8,0.6)), L2=normalize(vec3(0.6,0.3,0.7));
        vec3 h1=normalize(L1+v), h2=normalize(L2+v);
        float spec=pow(max(dot(n,h1),0.),90.)*1.6 + pow(max(dot(n,h2),0.),40.)*0.35;
        vec3 r=reflect(-v,n); vec3 env=mix(refr*0.9+0.08,vec3(1.0,0.97,0.9),smoothstep(-0.1,0.9,r.y));
        vec3 col=mix(trans,env,fres*0.85)+spec*vec3(1.,0.98,0.9)*(1.+jf);
        col += jf*vec3(1.,0.96,0.80)*0.28*smoothstep(0.55,1.0,ndv); // bright glassy core of the jet
        col += vec3(0.05,0.04,0.0)*smoothstep(0.4,0.0,ndv)*jf;
        float a=mix(smoothstep(0.05,0.5,th),smoothstep(0.01,0.25,th),jf)*mix(mix(0.42,0.7,1.-pf),0.8,jf); col+=spec*vec3(1.,0.98,0.9)*0.6*(1.-jf);
        gl_FragColor=vec4(mix(base,col,a),1.);
      }`,
    depthTest: false, depthWrite: false,
  });
  mats = { depthMat, thickMat, blurDepth, blurThick, comp };
  pts = new THREE.Points(pGeo, depthMat); pts.frustumCulled = false;
  quadCam = new THREE.Camera(); quadMesh = new THREE.Mesh(QUAD, comp); quadMesh.frustumCulled = false; quadScene = new THREE.Scene(); quadScene.add(quadMesh);
  // debug: collision mesh wireframe
  dbgScene = new THREE.Scene();
  const segs = [];
  const pushRing = (pts3) => { for (let k = 0; k < pts3.length - 1; k++) { const a = pts3[k], b = pts3[k + 1]; if (visible(a.x, a.y, a.z) && visible(b.x, b.y, b.z)) segs.push(a, b); } };
  for (let a = 0; a <= 24; a++) { const ring = []; const th = a / 24 * Math.PI * 2; for (let b = 0; b <= 24; b++) { const ph = -Math.PI / 2 + b / 24 * Math.PI; const dx = Math.cos(ph) * Math.cos(th), dz = Math.cos(ph) * Math.sin(th), dy = -Math.abs(Math.sin(ph)); const p = surfacePoint(dx, dy, dz); if (p.y <= CAL.yf) ring.push(p); } pushRing(ring); }
  for (let b = 1; b < 12; b++) { const ring = []; const ph = b / 12 * Math.PI / 2; for (let a = 0; a <= 64; a++) { const th = a / 64 * Math.PI * 2; const dx = Math.cos(ph) * Math.cos(th), dz = Math.cos(ph) * Math.sin(th), dy = -Math.sin(ph); ring.push(surfacePoint(dx, dy, dz)); } pushRing(ring); }
  { const ring = []; for (let a = 0; a <= 96; a++) { const th = a / 96 * Math.PI * 2; let lo = 0, hi = 0.5; for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (F(C.x + Math.cos(th) * m, CAL.yf, C.z + Math.sin(th) * m) < 0) lo = m; else hi = m; } ring.push(new THREE.Vector3(C.x + Math.cos(th) * lo, CAL.yf, C.z + Math.sin(th) * lo)); } pushRing(ring); }
  const lg = new THREE.BufferGeometry().setFromPoints(segs);
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.75, depthTest: false }));
  dbgScene.add(lines);
  const bx = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BX[1] - BX[0], BX[3] - BX[2], BX[5] - BX[4])), new THREE.LineBasicMaterial({ color: 0xff44ff, depthTest: false }));
  bx.position.set((BX[0] + BX[1]) / 2, (BX[2] + BX[3]) / 2, (BX[4] + BX[5]) / 2); dbgScene.add(bx);
  const dm = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 8), new THREE.MeshBasicMaterial({ color: 0xff3030, wireframe: true, depthTest: false })); dm.position.copy(DRAIN); dbgScene.add(dm);
}
function runQuad(mat, target) { quadMesh.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); }

// ---------- 2D layer (art + bugs) ----------
const V = new THREE.Vector3();
function toScreen(p) { V.copy(p).project(cam); return [(V.x + 1) / 2 * W, (1 - V.y) / 2 * H, V.z]; }
function pxPerM(p) { const d = V.copy(p).applyMatrix4(cam.matrixWorldInverse).z; return cam.projectionMatrix.elements[5] * H / 2 / -d; }
const WHITE = {};
let stainDirty = 0;
function drawBG(dt) {
  let c = bgx;
  c.fillStyle = '#111'; c.fillRect(0, 0, W, H);
  if (IMG.plate5c) c.drawImage(IMG.plate5c, PL.ox, PL.oy, PL.pw, PL.ph);
  // wet stain accumulating where the liquid ran
  stx.globalCompositeOperation = 'destination-out'; stx.fillStyle = `rgba(0,0,0,${Math.min(1, dt * (flushT > 0 ? 1.5 : 0.08))})`; stx.fillRect(0, 0, stain.width, stain.height);
  stx.globalCompositeOperation = 'source-over'; stx.fillStyle = 'rgba(150,128,50,0.012)';
  for (let i = 0; i < P.n; i += 3) { if (!P.wet[i] || P.water[i]) continue; V.set(P.x[i], P.y[i], P.z[i]).project(cam); const x = (V.x + 1) / 4 * W, y = (1 - V.y) / 4 * H; stx.fillRect(x - 1.5, y - 1.5, 3, 3); }
  c.drawImage(stain, 0, 0, W, H);
  // bugs
  for (const B of BUGS) {
    const [sx, sy] = toScreen(B.p); const ppm = pxPerM(B.p);
    const h = B.T.r * 2.6 * ppm * (B.born * 0.3 + 0.7);
    let ang = 0; if (B.heading) { const [hx, hy] = toScreen(V.copy(B.p).add(B.heading.clone().multiplyScalar(30))); ang = Math.atan2(hy - sy, hx - sx) + Math.PI / 2; }
    const im = IMG[B.T.img]; if (!im) continue;
    const w = h * im.naturalWidth / im.naturalHeight;
    c.save(); c.translate(sx, sy);
    if (B.dead) { const k = B.dead / 0.45; c.globalAlpha = 1 - k; c.scale(1 + k * 0.6, 1 + k * 0.6); c.rotate(k * 3); }
    c.save(); c.rotate(ang);
    c.globalAlpha *= 0.35; c.fillStyle = '#000'; c.beginPath(); c.ellipse(2, 3, w * 0.36, h * 0.42, 0, 0, 6.283); c.fill(); c.globalAlpha = B.dead ? c.globalAlpha / 0.35 : 1;
    const wig = Math.sin(B.wob * 30) * 0.06; c.rotate(wig);
    c.drawImage(im, -w / 2, -h / 2, w, h);
    if (B.flash > 0) { if (!WHITE[B.T.img]) WHITE[B.T.img] = whiteOf(im); c.globalAlpha = B.flash * 0.75; c.drawImage(WHITE[B.T.img], -w / 2, -h / 2, w, h); }
    c.restore();
    if (!B.dead) { const bw = Math.max(26, w * 0.9); c.globalAlpha = 1; c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(-bw / 2 - 1, -h * 0.62 - 6, bw + 2, 6); c.fillStyle = B.hp / B.max > 0.4 ? '#7CFC4A' : '#ff5a3c'; c.fillRect(-bw / 2, -h * 0.62 - 5, bw * Math.max(0, B.hp / B.max), 4); }
    c.restore();
  }
  bgTex.needsUpdate = true;
  c = ovx; c.clearRect(0, 0, W, H);
  for (let i = POPS.length - 1; i >= 0; i--) { const p = POPS[i]; p.t += dt; if (p.t > 0.4) { POPS.splice(i, 1); continue; } const [sx, sy] = toScreen(p.p); const r = p.r * pxPerM(p.p) * (1 + p.t * 6); c.strokeStyle = `rgba(255,240,150,${1 - p.t / 0.4})`; c.lineWidth = 3; c.beginPath(); c.arc(sx, sy, r, 0, 6.283); c.stroke(); }
  for (let i = FLOAT.length - 1; i >= 0; i--) { const f = FLOAT[i]; f.t += dt; if (f.t > 1) { FLOAT.splice(i, 1); continue; } const [sx, sy] = toScreen(f.p); c.globalAlpha = 1 - f.t; c.font = '800 18px system-ui,sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = '#000'; c.strokeText(f.txt, sx, sy - 20 - f.t * 30); c.fillStyle = f.col; c.fillText(f.txt, sx, sy - 20 - f.t * 30); c.globalAlpha = 1; }
  bgTex.needsUpdate = true;
}

// ---------- render ----------
let showMesh = !!Q.get('mesh');
function render() {
  const n = P.n, pos = pGeo.attributes.position.array, gen = pGeo.attributes.gen.array, szA = pGeo.attributes.sz.array;
  let m = 0, ms = 0; const spA = spGeo.attributes.position.array;
  for (let i = 0; i < n; i++) { if (!P.water[i] && P.gen[i] && P.vx[i] * P.vx[i] + P.vy[i] * P.vy[i] + P.vz[i] * P.vz[i] > 0.06) { if (visible(P.x[i], P.y[i], P.z[i])) { spA[ms * 3] = P.x[i]; spA[ms * 3 + 1] = P.y[i]; spA[ms * 3 + 2] = P.z[i]; ms++; } continue; }
    if ((P.x[i] - CX) * FWD.x + (P.y[i] - CY) * FWD.y + (P.z[i] - CZ) * FWD.z < 0.13 || !visible(P.x[i], P.y[i], P.z[i])) continue; pos[m * 3] = P.x[i]; pos[m * 3 + 1] = P.y[i]; pos[m * 3 + 2] = P.z[i]; gen[m] = (P.gen[i] ? 1 : (P.touched[i] ? 0 : 2)) + (P.water[i] ? 4 : 0); szA[m] = (!P.water[i] && P.touched[i] && !P.gen[i]) ? Math.max(0.3, 1 - Math.max(0, P.age[i] - 0.7) / 1.9) : 1; m++;
    if (!P.touched[i] && !P.water[i]) { // airborne jet: gap-fill splats back along the path -> continuous, organic column
      for (let k = 1; k <= 3; k++) { const f = k / 4 / 120; pos[m * 3] = P.x[i] - P.vx[i] * f; pos[m * 3 + 1] = P.y[i] - P.vy[i] * f; pos[m * 3 + 2] = P.z[i] - P.vz[i] * f; gen[m] = 2; szA[m] = 0.9 + 0.2 * Math.sin(i * 2.3 + k); m++; }
    } else if (P.touched[i] && m < MAXN * 4 - 2) { // landed liquid: extra small splats around each particle -> continuous fine film, no blobs
      const sz0 = szA[m - 1], g0 = gen[m - 1], j = 0.0045;
      for (let k = 0; k < 2; k++) { const a = i * 1.618 + k * 3.14; pos[m * 3] = P.x[i] + Math.cos(a) * j; pos[m * 3 + 1] = P.y[i] + Math.sin(a) * j * 0.5; pos[m * 3 + 2] = P.z[i] + Math.sin(a) * j; gen[m] = g0; szA[m] = sz0; m++; }
    }
  }
  spGeo.attributes.position.needsUpdate = true; spGeo.setDrawRange(0, ms);
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.gen.needsUpdate = true; pGeo.attributes.sz.needsUpdate = true; pGeo.setDrawRange(0, m);
  const [rw, rh] = RT.size, L = LEVELS[qi];
  const scale = cam.projectionMatrix.elements[5] * rh / 2;
  mats.depthMat.uniforms.uScale.value = scale * 2; mats.thickMat.uniforms.uScale.value = scale * 2;
  const sc = new THREE.Scene(); sc.add(pts);
  // depth
  pts.material = mats.depthMat; renderer.setRenderTarget(RT.depth); renderer.setClearColor(0x000000, 0); renderer.clear(true, true); renderer.render(sc, cam);
  pts.material = mats.thickMat; renderer.setRenderTarget(RT.thick); renderer.clear(true, false); renderer.render(sc, cam);
  // blur
  const bd = mats.blurDepth.uniforms, bt = mats.blurThick.uniforms;
  bd.rad.value = L.blur; bt.rad.value = Math.max(2, L.blur * 0.5);
  bd.tex.value = RT.depth.texture; bd.dir.value.set(1 / rw, 0); runQuad(mats.blurDepth, RT.a);
  bd.tex.value = RT.a.texture; bd.dir.value.set(0, 1 / rh); runQuad(mats.blurDepth, RT.b);
  bd.tex.value = RT.b.texture; bd.dir.value.set(0.7 / rw, 0.7 / rh); runQuad(mats.blurDepth, RT.a);
  bt.tex.value = RT.thick.texture; bt.dir.value.set(1 / rw, 0); runQuad(mats.blurThick, RT.ta);
  bt.tex.value = RT.ta.texture; bt.dir.value.set(0, 1 / rh); runQuad(mats.blurThick, RT.tb);
  const cu = mats.comp.uniforms;
  cu.bg.value = bgTex; cu.dep.value = RT.a.texture; cu.thk.value = RT.tb.texture; cu.invP.value.copy(cam.projectionMatrixInverse); cu.texel.value.set(1 / rw, 1 / rh);
  renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1); renderer.clear();
  runQuad(mats.comp, null);
  renderer.getDrawingBufferSize(ribMat.uniforms.res.value); ribMat.uniforms.bg.value = bgTex;
  spMat.uniforms.px.value = Math.max(2, 1.6 * renderer.getPixelRatio());
  renderer.autoClear = false; renderer.render(fxScene, cam);
  if (showMesh) renderer.render(dbgScene, cam);
  renderer.autoClear = true;
}
// ---------- falling jet: smooth analytic ribbon (tube impostor) through the emission history ----------
const RIBN = 420; let ribGeo, ribMat, spGeo, spMat, fxScene;
function initFX() {
  ribGeo = new THREE.BufferGeometry();
  const A = (n, k) => new THREE.BufferAttribute(new Float32Array(RIBN * 2 * n), n).setUsage(THREE.DynamicDrawUsage);
  ribGeo.setAttribute('position', A(3)); ribGeo.setAttribute('nxt', A(3)); ribGeo.setAttribute('side', A(1)); ribGeo.setAttribute('rad', A(1)); ribGeo.setAttribute('al', A(1)); ribGeo.setAttribute('s', A(1));
  const idx = []; for (let i = 0; i < RIBN - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } ribGeo.setIndex(idx);
  ribGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.3, 0.8), 5);
  ribMat = new THREE.ShaderMaterial({
    uniforms: { bg: { value: null }, res: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `attribute vec3 nxt; attribute float side, rad, al, s; uniform vec2 res; varying float vU, vA, vS;
      void main(){ vec4 c=projectionMatrix*modelViewMatrix*vec4(position,1.); vec4 n=projectionMatrix*modelViewMatrix*vec4(nxt,1.);
        vec2 a=c.xy/c.w, b=n.xy/n.w; vec2 d=(b-a)*res; d=length(d)>1e-6?normalize(d):vec2(0.,1.); vec2 pp=vec2(-d.y,d.x);
        float pr=max(rad*projectionMatrix[1][1]/c.w*res.y*0.5, 1.4); // half-width in px
        c.xy += pp*(pr+1.)*side/res*2.*c.w; vU=side*(pr+1.)/pr; vA=al; vS=s; gl_Position=c; }`,
    fragmentShader: `uniform sampler2D bg; uniform vec2 res; varying float vU, vA, vS;
      void main(){ float u=vU; float au=abs(u); float aw=fwidth(u)*1.2; float edge=1.-smoothstep(1.-aw,1.+aw,au); if(edge<=0.) discard;
        float uc=clamp(u,-1.,1.); float nz=sqrt(max(0.,1.-uc*uc));
        vec2 uv=gl_FragCoord.xy/res; vec3 refr=texture2D(bg,clamp(uv+vec2(-uc*0.010*(1.-nz*0.6),0.002*nz),0.001,0.999)).rgb;
        vec3 col=refr*vec3(1.0,0.97,0.82)*(0.84+0.22*nz);            // pale straw glass
        col*=mix(0.62,1.,smoothstep(0.,0.55,nz));                    // edge darkening
        col+=vec3(1.,0.98,0.9)*(exp(-pow((u+0.32)/0.12,2.))*0.5+exp(-pow((u-0.5)/0.08,2.))*0.18); // specular core lines
        gl_FragColor=vec4(col,edge*vA*mix(0.7,0.95,nz)); }`,
    transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
  });
  const rib = new THREE.Mesh(ribGeo, ribMat); rib.frustumCulled = false;
  spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXN * 3), 3).setUsage(THREE.DynamicDrawUsage));
  spGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.3, 0.8), 5);
  spMat = new THREE.ShaderMaterial({ uniforms: { px: { value: 2 } },
    vertexShader: `uniform float px; void main(){ gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_PointSize=px; }`,
    fragmentShader: `void main(){ vec2 c=gl_PointCoord*2.-1.; float r=dot(c,c); if(r>1.) discard; gl_FragColor=vec4(vec3(1.,0.97,0.82)*(1.-r*0.5),0.75*(1.-r)); }`,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const sp = new THREE.Points(spGeo, spMat); sp.frustumCulled = false;
  fxScene = new THREE.Scene(); fxScene.add(sp); // v4: ribbon tube retired (jet is screen-space fluid again)
}
const TJ = 0.2;
function buildRibbon() {
  const pa = ribGeo.attributes.position.array, na = ribGeo.attributes.nxt.array, sd = ribGeo.attributes.side.array, ra = ribGeo.attributes.rad.array, al = ribGeo.attributes.al.array, sa = ribGeo.attributes.s.array;
  // samples from newest (at the body) to oldest (at impact), densified by interpolating emission state
  const pts = []; const H = JH.length;
  for (let h = H - 1; h > 0 && pts.length < RIBN; h--) {
    const A = JH[h], B = JH[h - 1];
    for (let k = 0; k < 3 && pts.length < RIBN; k++) {
      const f = k / 3, te = A.t + (B.t - A.t) * f, a = simT - te;
      if (a < 0) continue; if (a > TJ) { h = 0; break; }
      const vx = A.vx + (B.vx - A.vx) * f, vy = A.vy + (B.vy - A.vy) * f, vz = A.vz + (B.vz - A.vz) * f;
      const s = a / TJ, wob = Math.sin(a * 60 - simT * 23) * 0.0011 * s;
      const x = A.ox + (B.ox - A.ox) * f + vx * a + wob, y = A.oy + (B.oy - A.oy) * f + vy * a, z = A.oz + (B.oz - A.oz) * f + vz * a + 0.5 * GRAV * a * a;
      const fd = (x - CX) * FWD.x + (y - CY) * FWD.y + (z - CZ) * FWD.z;
      let alpha = Math.min(1, Math.max(0, (fd - 0.13) / 0.05)) * (visible(x, y, z) ? 1 : 0) * (1 - Math.max(0, (s - 0.86) / 0.14));
      let r = RAD * 0.85 * (0.72 + 0.28 * s);
      if (s > 0.75) r *= 1 + 0.35 * Math.sin(a * 900 + simT * 40) * (s - 0.75) * 4; // slight breakup near impact
      pts.push(x, y, z, r, alpha, s);
    }
  }
  const N = pts.length / 6;
  for (let i = 0; i < RIBN; i++) {
    const j = Math.min(i, N - 1), jn = Math.min(j + 1, N - 1), jp = j === jn ? Math.max(0, j - 1) : j;
    for (let q = 0; q < 2; q++) {
      const v = i * 2 + q;
      if (N < 2) { al[v] = 0; continue; }
      pa[v * 3] = pts[j * 6]; pa[v * 3 + 1] = pts[j * 6 + 1]; pa[v * 3 + 2] = pts[j * 6 + 2];
      // direction: towards next sample (or away from the previous at the tail)
      const dn = j === jn ? -1 : 1, o = j === jn ? jp : jn;
      na[v * 3] = pa[v * 3] + (pts[o * 6] - pts[j * 6]) * dn; na[v * 3 + 1] = pa[v * 3 + 1] + (pts[o * 6 + 1] - pts[j * 6 + 1]) * dn; na[v * 3 + 2] = pa[v * 3 + 2] + (pts[o * 6 + 2] - pts[j * 6 + 2]) * dn;
      sd[v] = q ? 1 : -1; ra[v] = pts[j * 6 + 3]; al[v] = i < N ? pts[j * 6 + 4] : 0; sa[v] = pts[j * 6 + 5];
    }
  }
  for (const k of ['position', 'nxt', 'side', 'rad', 'al', 's']) ribGeo.attributes[k].needsUpdate = true;
}

// ---------- input ----------
const ray = new THREE.Raycaster();
function aimAt(clientX, clientY) {
  const nd = new THREE.Vector2(clientX / W * 2 - 1, -(clientY / H) * 2 + 1);
  ray.setFromCamera(nd, cam);
  const o = ray.ray.origin, d = ray.ray.direction;
  // march to the back wall of the cavity (first transition inside->solid after entering the cavity)
  let inside = false, prev = 0;
  for (let t = 0.2; t < 2.5; t += 0.004) {
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    const f = y < CAL.yf ? F(x, y, z) : -1;
    if (y < CAL.yf && f < 0) inside = true;
    if (inside && f > 0) { let lo = prev, hi = t; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; const ff = F(o.x + d.x * m, o.y + d.y * m, o.z + d.z * m); if (ff > 0) hi = m; else lo = m; } aim.tx = o.x + d.x * lo; aim.ty = o.y + d.y * lo; aim.tz = o.z + d.z * lo; return; }
    if (y < 0) { aim.tx = x; aim.ty = 0.01; aim.tz = z; return; }
    prev = t;
  }
}
let dragging = false;
canvas.addEventListener('pointerdown', e => { dragging = true; aimAt(e.clientX, e.clientY); $('tip').style.opacity = 0; });
window.addEventListener('pointermove', e => { if (dragging) aimAt(e.clientX, e.clientY); });
window.addEventListener('pointerup', () => dragging = false);
const QN = ['Auto', 'Low', 'Med', 'High', 'Ultra'];
let qSel = qAuto ? 0 : qi + 1;
$('bq').textContent = 'Quality: ' + QN[qSel];
$('bq').onclick = () => { qSel = (qSel + 1) % 5; qAuto = qSel === 0; if (!qAuto) { qi = qSel - 1; layout(); } $('bq').textContent = 'Quality: ' + QN[qSel]; };
$('bm').onclick = () => { showMesh = !showMesh; $('bm').classList.toggle('on', showMesh); };
$('bm').classList.toggle('on', showMesh);
$('bf').onclick = () => startFlush(); window.__flush = startFlush;
let paused = false; $('bp').onclick = () => { paused = !paused; $('bp').textContent = paused ? 'Play' : 'Pause'; };
window.addEventListener('resize', layout);

// ---------- loop ----------
let bgMs = 0, glMs = 0, simMs = 0, last = 0, simT = 0, acc = 0, fpsT = 0, frames = 0, fps = 0, ftAvg = 16, goodT = 0;
const AUTO = Q.get('auto') != null; const FIXED = Q.get('fixed') ? 1 / +Q.get('fixed') : 0;
function autoAim(t) { // demo: sweep the stream across the bugs
  let tgt = null, best = 1e9; for (const B of BUGS) { if (B.dead || !visible(B.p.x, B.p.y, B.p.z + 0.03)) continue; const d = Math.abs(B.p.z - aim.z) + Math.abs(B.p.x - aim.x); if (d < best) { best = d; tgt = B; } }
  if (tgt && Math.sin(t * 0.6) > -0.3) { aim.tx = tgt.p.x + Math.sin(t * 5) * 0.01; aim.ty = tgt.p.y; aim.tz = tgt.p.z - 0.005; }
  else { const s = surfacePoint(Math.sin(t * 0.9) * 0.6, -0.7, Math.sin(t * 0.5) * 0.35 - 0.1); aim.tx = s.x; aim.ty = s.y; aim.tz = s.z; }
}
function frame(now) {
  requestAnimationFrame(frame);
  now /= 1000; let dt = last ? now - last : 1 / 60; last = now; if (dt > 0.1) dt = 0.1;
  if (FIXED) { if (!window.__go) return; window.__go--; dt = FIXED; }
  frames++; fpsT += dt; ftAvg += (dt * 1000 - ftAvg) * 0.05;
  if (fpsT >= 0.5) { fps = frames / fpsT; frames = 0; fpsT = 0; }
  if (qAuto && !FIXED && simT > 1.5) {
    if (ftAvg > 21 && qi > 0) { qi--; ftAvg = 16; layout(); goodT = 0; }
    else if (ftAvg < 14.5) { goodT += dt; if (goodT > 3 && qi < 3) { qi++; layout(); goodT = 0; ftAvg = 16; } } else goodT = 0;
  }
  if (!paused) {
    if (AUTO) { autoAim(simT); const fe = +(Q.get('flushevery') || 0); if (fe && simT % fe < dt && simT > 1) startFlush(); }
    const SUB = 1 / LEVELS[qi].sub; acc += dt; let k = 0;
    const t0 = performance.now();
    while (acc >= SUB - 1e-9 && k < (FIXED ? 8 : 3)) { step(SUB, simT); simT += SUB; acc -= SUB; k++; }
    if (k === 3) acc = 0;
    simMs += ((performance.now() - t0) / Math.max(1, k) - simMs) * 0.1;
    updateBugs(dt);
  }
  const tb = performance.now(); drawBG(dt); const tr = performance.now(); render(); const te = performance.now();
  bgMs += (tr - tb - bgMs) * 0.1; glMs += (te - tr - glMs) * 0.1;
  $('score').textContent = score;
  $('hud').textContent = `FPS ${fps.toFixed(0)}  ${ftAvg.toFixed(1)}ms  sim ${simMs.toFixed(1)}/step 2d ${bgMs.toFixed(1)} gl ${glMs.toFixed(1)}\nparticles ${P.n}/${LEVELS[qi].maxN}\nquality ${LEVELS[qi].name}${qAuto ? ' (auto)' : ''}\nkills ${kills}  escaped ${escaped}${flushT > 0 ? '\nFLUSHING' : ''}`;
  window.__fr = (window.__fr || 0) + 1;
  window.__lab = { bgMs, glMs, simMs, fps, ft: ftAvg, n: P.n, q: LEVELS[qi].name, kills, score, hitsJet, hitsSplash, drained, bugs: BUGS.length };
}
(async function main() {
  const ext = webp ? '.webp' : '.png';
  await Promise.all([load('plate5c', webp ? '.webp' : '.jpg'), load('en-fly', ext), load('en-roach', ext)]);
  layout(); initGL(); initFX(); layout(); if (AUTO) $('tip').style.opacity = 0;
  for (let k = 0; k < 400 && BUGS.length < 4; k++) spawnBug();
  requestAnimationFrame(frame);
})();
window.__aim = (x, y) => aimAt(x, y); window.__dbg = () => { const o = []; for (let i = 0; i < P.n; i += 40) { const s = toScreen(new THREE.Vector3(P.x[i], P.y[i], P.z[i])); o.push([+P.x[i].toFixed(3), +P.y[i].toFixed(3), +P.z[i].toFixed(3), s.map(v => +v.toFixed(2)), P.age[i].toFixed(2)]); } return { o, aim, R: RT.size, ext: renderer.extensions.has("EXT_color_buffer_float") }; };
