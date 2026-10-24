// WORLD — voxel builders: block grids, blocky players, the voxel ball, crest frames,
// and the three sets (locker room, dark mission stage, stadium with tunnel).
import * as THREE from 'three';
import { B, tex, rng, makeSkin, cv } from './textures.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ map: tex(c), ...o });
const glow = (c, color = 0xffffff) => new THREE.MeshLambertMaterial({ map: tex(c), emissive: color, emissiveMap: tex(c), emissiveIntensity: 1 });

// ------------------------------------------------------------------ voxel grid -> instanced meshes
export class Voxels {
  constructor() { this.m = new Map(); }
  k(x, y, z) { return `${x},${y},${z}`; }
  set(x, y, z, t) { this.m.set(this.k(x, y, z), t); }
  get(x, y, z) { return this.m.get(this.k(x, y, z)); }
  del(x, y, z) { this.m.delete(this.k(x, y, z)); }
  fill(x0, y0, z0, x1, y1, z1, t) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) (t ? this.set(x, y, z, t) : this.del(x, y, z));
  }
  build(mats, { cast = true } = {}) {
    const groups = {}, has = (x, y, z) => this.m.has(this.k(x, y, z));
    for (const [key, t] of this.m) {
      const [x, y, z] = key.split(',').map(Number);
      if (has(x + 1, y, z) && has(x - 1, y, z) && has(x, y + 1, z) && has(x, y - 1, z) && has(x, y, z + 1) && has(x, y, z - 1)) continue;
      (groups[t] ||= []).push(x, y, z);
    }
    const root = new THREE.Group(), m4 = new THREE.Matrix4();
    for (const t in groups) {
      const a = groups[t], n = a.length / 3;
      const mesh = new THREE.InstancedMesh(BOX, mats[t], n);
      for (let i = 0; i < n; i++) mesh.setMatrixAt(i, m4.makeTranslation(a[3 * i] + 0.5, a[3 * i + 1] + 0.5, a[3 * i + 2] + 0.5));
      mesh.castShadow = cast; mesh.receiveShadow = true; mesh.name = t;
      root.add(mesh);
    }
    return root;
  }
}

// ------------------------------------------------------------------ players
const U = 1 / 16;
export function makePlayer(spec) {
  const sk = makeSkin(spec);
  const mats = (f) => ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map((k) => new THREE.MeshLambertMaterial({ map: tex(f[k]) }));
  const part = (w, h, d, faces, x, y, z) => {
    const g = new THREE.BoxGeometry(w * U, h * U, d * U); g.translate(x * U, y * U, z * U);
    const m = new THREE.Mesh(g, mats(faces)); m.castShadow = true; m.receiveShadow = true; return m;
  };
  const pivot = (x, y, z, mesh) => { const g = new THREE.Group(); g.position.set(x * U, y * U, z * U); g.add(mesh); return g; };
  const root = new THREE.Group(), hips = new THREE.Group(); root.add(hips);
  hips.add(part(8, 12, 4, sk.body, 0, 18, 0));
  const head = pivot(0, 24, 0, part(8, 8, 8, sk.head, 0, 4, 0));
  const armR = pivot(-6, 22, 0, part(4, 12, 4, sk.arm, 0, -4, 0));
  const armL = pivot(6, 22, 0, part(4, 12, 4, sk.arm, 0, -4, 0));
  const legR = pivot(-2, 12, 0, part(4, 12, 4, sk.legR, 0, -6, 0));
  const legL = pivot(2, 12, 0, part(4, 12, 4, sk.legL, 0, -6, 0));
  hips.add(head, armR, armL, legR, legL);
  const hand = new THREE.Group(); hand.position.set(0, -11 * U, 2.6 * U); armR.add(hand);
  return {
    root, hips, head, armR, armL, legR, legL, hand,
    pose(p = {}) {
      head.rotation.set(p.headPitch || 0, p.headYaw || 0, 0);
      armR.rotation.set(p.armR || 0, 0, p.armRz || 0);
      armL.rotation.set(p.armL || 0, 0, p.armLz || 0);
      legR.rotation.set(p.legR || 0, 0, 0);
      legL.rotation.set(p.legL || 0, 0, 0);
      hips.position.y = p.bob || 0;
      hips.rotation.y = p.bodyYaw || 0;
    },
  };
}

export const KITS = {
  ksv: (crest) => ({
    skin: '#e0a985', skinShade: '#c98f6c', hair: '#4a2e17', eyes: '#2f63c9', mouth: '#9a5640',
    shirt: '#1f4fbf', collar: '#ffffff', sleeve: '#ffffff', cuff: '#1f4fbf',
    shorts: '#ffffff', shortsStripe: '#1f4fbf', socks: '#1f4fbf', sockBand: '#ffffff', boots: '#17181d', bootAccent: '#ffffff',
    crest, number: '10', numberColor: '#ffffff',
  }),
  hellas: (crest) => ({
    skin: '#c9906a', skinShade: '#b07a57', hair: '#17110d', beard: '#231912', eyes: '#5a3a1e', mouth: '#7a4232',
    shirt: '#ffffff', stripes: '#3a3589', collar: '#3a3589', sleeve: '#3a3589', cuff: '#ffffff',
    shorts: '#2f2b78', shortsStripe: '#ffffff', socks: '#ffffff', sockBand: '#3a3589', boots: '#17181d', bootAccent: '#e3c770',
    crest, number: '7', numberColor: '#3a3589', numberShadow: 'rgba(0,0,0,0.15)',
  }),
};

// ------------------------------------------------------------------ voxel football
export function makeBall(size = 0.3) {
  const n = 7, vs = size / n, phi = (1 + Math.sqrt(5)) / 2;
  const dirs = [[0, 1, phi], [0, -1, phi], [0, 1, -phi], [0, -1, -phi], [1, phi, 0], [-1, phi, 0], [1, -phi, 0], [-1, -phi, 0], [phi, 0, 1], [-phi, 0, 1], [phi, 0, -1], [-phi, 0, -1]]
    .map((d) => new THREE.Vector3(...d).normalize());
  const white = [], dark = [], v = new THREE.Vector3();
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
    v.set(i - 3, j - 3, k - 3); const r = v.length();
    if (r > 3.45 || r < 2.0) continue;
    v.normalize();
    (Math.max(...dirs.map((d) => d.dot(v))) > 0.9 ? dark : white).push([i - 3, j - 3, k - 3]);
  }
  const g = new THREE.Group(), geo = new THREE.BoxGeometry(vs, vs, vs), m4 = new THREE.Matrix4();
  for (const [list, color] of [[white, 0xf4f4f4], [dark, 0x161c40]]) {
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color }), list.length);
    list.forEach((p, i) => mesh.setMatrixAt(i, m4.makeTranslation(p[0] * vs, p[1] * vs, p[2] * vs)));
    mesh.castShadow = true; g.add(mesh);
  }
  return g;
}

// ------------------------------------------------------------------ crest in a pixel frame
export function crestFrame(img, height, { nearest = false } = {}) {
  const g = new THREE.Group();
  const h = height, w = h * img.width / img.height, pad = 0.45, bw = 0.28;
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + pad * 2, h + pad * 2, 0.2), lam(B.planks('#5a3d22', 41)));
  back.position.z = -0.1; back.receiveShadow = true; g.add(back);
  const goldM = new THREE.MeshLambertMaterial({ map: tex(B.gold()), emissive: 0x000000 });
  const bar = (bx, by, sx, sy) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.32), goldM); m.position.set(bx, by, 0); g.add(m); };
  const W2 = w / 2 + pad, H2 = h / 2 + pad;
  bar(0, H2, (W2 + bw / 2) * 2, bw); bar(0, -H2, (W2 + bw / 2) * 2, bw); bar(-W2, 0, bw, H2 * 2); bar(W2, 0, bw, H2 * 2);
  const t = tex(img, { smooth: !nearest });
  const crestMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, color: 0xffffff });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), crestMat); plane.position.z = 0.02; g.add(plane);
  return { group: g, crestMat, goldM };
}

// ------------------------------------------------------------------ shared materials
function blockMats() {
  const grassSide = lam(B.grassSide()), dirt = lam(B.dirt());
  return {
    planks: lam(B.planks()), darkPlanks: lam(B.planks('#6b4c2c', 33)), stoneBricks: lam(B.stoneBricks()),
    deepBricks: lam(B.stoneBricks('#4a4a52', 35)), stone: lam(B.stone()), deepslate: lam(B.deepslate()),
    grass: [grassSide, grassSide, lam(B.grassTop()), dirt, grassSide, grassSide],
    pitchA: lam(B.pitch('#4f9a2f', 43)), pitchB: lam(B.pitch('#5daa38', 45)), line: lam(B.line()),
    track: lam(B.pitch('#3f7d29', 47)),
    gray: lam(B.concrete('#8c8f96', 49)), blue: lam(B.wool('#2347b3', 51)), white: lam(B.wool('#e9ebf0', 53)),
    navy: lam(B.wool('#182c78', 55)), black: lam(B.black()), iron: lam(B.iron()),
  };
}

// ------------------------------------------------------------------ set 1: locker room
export function buildLocker(crestKsv) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d14);
  scene.fog = new THREE.Fog(0x0b0d14, 10, 22);
  const M = blockMats(), V = new Voxels();
  V.fill(-6, -1, -6, 5, -1, 7, 'planks');
  V.fill(-6, 0, -6, 5, 5, -6, 'stoneBricks');
  V.fill(-7, 0, -6, -7, 5, 7, 'stoneBricks');
  V.fill(6, 0, -6, 6, 5, 7, 'stoneBricks');
  V.fill(-7, 6, -6, 6, 6, 7, 'darkPlanks');
  // blue/white tile stripe along the walls
  for (let x = -6; x <= 5; x++) V.set(x, 0, -6, x % 2 ? 'blue' : 'white');
  for (let z = -6; z <= 7; z++) { V.set(-7, 0, z, z % 2 ? 'blue' : 'white'); V.set(6, 0, z, z % 2 ? 'blue' : 'white'); }
  const lampM = glow(B.lamp(), 0xfff1d6);
  V.set(-3, 6, -2, 'lamp'); V.set(2, 6, -2, 'lamp'); V.set(-3, 6, 3, 'lamp'); V.set(2, 6, 3, 'lamp');
  scene.add(V.build({ ...M, lamp: lampM }));

  // lockers (1 x 2 blocks) along the back wall, alternating club colours
  const lockerFront = { blue: lam(B.locker('#2550c4', 61)), white: lam(B.locker('#e4e7ee', 63)) };
  const side = { blue: new THREE.MeshLambertMaterial({ color: 0x1e3f9c }), white: new THREE.MeshLambertMaterial({ color: 0xc8ccd6 }) };
  for (let x = -6; x <= 5; x++) {
    const c = x % 2 ? 'blue' : 'white';
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.8), [side[c], side[c], side[c], side[c], lockerFront[c], side[c]]);
    m.position.set(x + 0.5, 2, -4.6); m.castShadow = m.receiveShadow = true; scene.add(m);
  }
  // shelf + bench
  const spruce = lam(B.planks('#7a5530', 65));
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 1.0), spruce); shelf.position.set(0, 3.1, -4.5); shelf.receiveShadow = shelf.castShadow = true; scene.add(shelf);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 1.1), spruce); bench.position.set(0, 0.55, -3.4); bench.castShadow = bench.receiveShadow = true; scene.add(bench);
  for (const x of [-4.4, 0, 4.4]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.9), spruce); l.position.set(x, 0.2, -3.4); scene.add(l); }
  // carpet: blue with white border
  const carpet = cv(48, 48), cg = carpet.getContext('2d');
  cg.fillStyle = '#e9ebf0'; cg.fillRect(0, 0, 48, 48); cg.fillStyle = '#2347b3'; cg.fillRect(4, 4, 40, 40);
  const cm = new THREE.Mesh(new THREE.BoxGeometry(3, 0.06, 3), lam(carpet)); cm.position.set(0, 0.03, -1); cm.receiveShadow = true; scene.add(cm);
  // the club crest in a frame above the lockers
  const fr = crestFrame(crestKsv, 1.9, { nearest: true }); fr.group.position.set(0, 4.55, -4.85); scene.add(fr.group);

  scene.add(new THREE.HemisphereLight(0xbfd2ff, 0x3a2a1a, 0.55));
  const key = new THREE.SpotLight(0xfff0dc, 110, 30, 0.6, 0.6, 2); key.position.set(2.5, 5.6, 4); key.target.position.set(0, 1, -1.5);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0008; scene.add(key, key.target);
  for (const [x, z] of [[-2.5, -1.5], [2.5, -1.5], [-2.5, 3.5], [2.5, 3.5]]) { const p = new THREE.PointLight(0xffe2b8, 10, 12, 2); p.position.set(x, 5.4, z); scene.add(p); }
  const rim = new THREE.SpotLight(0x7fa6ff, 30, 20, 0.7, 0.8, 2); rim.position.set(-3, 4, -2.8); rim.target.position.set(0, 1.4, -1); scene.add(rim, rim.target);
  return { scene, crestFrame: fr };
}

// ------------------------------------------------------------------ set 2: dark mission stage
export function buildDark() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  scene.fog = new THREE.FogExp2(0x04060c, 0.075);
  const M = blockMats(), V = new Voxels(), R = rng(77);
  for (let x = -4; x <= 3; x++) for (let z = -4; z <= 3; z++) if (Math.hypot(x + 0.5, z + 0.5) < 4.3) V.set(x, -1, z, (x + z) % 3 ? 'deepslate' : 'deepBricks');
  for (let i = 0; i < 40; i++) { // floating blocks in the dark
    const a = R() * Math.PI * 2, d = 7 + R() * 14, y = -3 + R() * 10;
    V.set(Math.round(Math.cos(a) * d), Math.round(y), Math.round(Math.sin(a) * d) - 4, R() < 0.5 ? 'deepslate' : 'deepBricks');
  }
  scene.add(V.build(M));
  scene.add(new THREE.HemisphereLight(0x3a4c80, 0x05060a, 0.35));
  const top = new THREE.SpotLight(0xd8e6ff, 60, 18, 0.42, 0.55, 2); top.position.set(0.5, 7, 1.5); top.target.position.set(0, 0, 0);
  top.castShadow = true; top.shadow.mapSize.set(1024, 1024); top.shadow.bias = -0.0008; scene.add(top, top.target);
  const rim = new THREE.SpotLight(0x3f7cff, 55, 16, 0.6, 0.6, 2); rim.position.set(-2.5, 3.5, -4.5); rim.target.position.set(0, 1.3, 0); scene.add(rim, rim.target);
  const rim2 = new THREE.SpotLight(0x6fb0ff, 35, 16, 0.6, 0.6, 2); rim2.position.set(3, 3, -4); rim2.target.position.set(0, 1.3, 0); scene.add(rim2, rim2.target);
  const front = new THREE.SpotLight(0xc9d8ff, 55, 20, 0.5, 0.7, 2); front.position.set(-1.5, 3, 6); front.target.position.set(0, 1.1, 0); scene.add(front, front.target);
  const particles = makeParticles(260, 14, 8, 0x8fb8ff, 79, 0.06);
  scene.add(particles);
  return { scene, particles };
}

export function makeParticles(n, spread, height, color, seed, size = 0.08) {
  const R = rng(seed), pos = new Float32Array(n * 3), base = [];
  for (let i = 0; i < n; i++) { const p = [(R() - 0.5) * spread, R() * height - 1, (R() - 0.5) * spread]; base.push(p, R()); pos.set(p, i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.userData = { base, n, height };
  pts.frustumCulled = false;
  return pts;
}
// drift particles as a pure function of t
export function driftParticles(pts, t, speed = 0.25) {
  const { base, n, height } = pts.userData, a = pts.geometry.attributes.position;
  for (let i = 0; i < n; i++) {
    const p = base[2 * i], ph = base[2 * i + 1];
    a.setXYZ(i, p[0] + Math.sin(t * 0.7 + ph * 9) * 0.3, ((p[1] + 1 + t * speed * (0.5 + ph)) % height) - 1, p[2] + Math.cos(t * 0.5 + ph * 7) * 0.3);
  }
  a.needsUpdate = true;
}

// ------------------------------------------------------------------ set 3: stadium with the players' tunnel
export const STAD = { L: 32, Wd: 20, tunnelZ: -25, crestY: 6.6 };
export function buildStadium(crestHellas) {
  const scene = new THREE.Scene();
  const M = blockMats(), V = new Voxels();
  const { L, Wd } = STAD;
  // ground: pitch with mowing stripes and markings, darker run-off around it
  const isLine = (x, z) => {
    const xc = x + 0.5, zc = z + 0.5;
    if (z === -Wd || z === Wd - 1 || x === -L || x === L - 1) return true;
    if (x === 0) return true; // halfway line
    const r = Math.hypot(xc, zc); if (Math.abs(r - 7) < 0.55) return true;
    for (const s of [-1, 1]) {
      const gx = s < 0 ? -L : L - 1, depth = 10, half = 11, dx = s < 0 ? x - gx : gx - x;
      if (dx >= 0 && dx <= depth && (z === -half || z === half - 1)) return true;
      if (dx === depth && z >= -half && z <= half - 1) return true;
      if (dx >= 0 && dx <= 4 && (z === -5 || z === 4)) return true;
      if (dx === 4 && z >= -5 && z <= 4) return true;
    }
    return false;
  };
  for (let x = -L - 6; x <= L + 5; x++) for (let z = -Wd - 5; z <= Wd + 4; z++) {
    const inside = x >= -L && x < L && z >= -Wd && z < Wd;
    V.set(x, -1, z, !inside ? 'track' : isLine(x, z) ? 'line' : (Math.floor((x + L) / 4) % 2 ? 'pitchA' : 'pitchB'));
  }
  // stands: long sides (z) and ends (x). column k steps up and back
  const stand = (along, fixed, dir, axis, len0, len1) => {
    for (let s = len0; s <= len1; s++) for (let k = 0; k < 12; k++) {
      const depth = fixed + dir * k, top = 3 + k;
      for (let y = 0; y < top; y++) {
        let t = 'gray';
        if (k === 0) t = y === top - 1 ? 'deepBricks' : 'stoneBricks';
        else if (y === top - 1) t = (Math.floor((s + 100) / 6) % 2 ? 'blue' : 'white');
        if (k === 0 && y === 0) t = 'stoneBricks';
        axis === 'z' ? V.set(s, y, depth, t) : V.set(depth, y, s, t);
      }
    }
    // back wall
    for (let s = len0; s <= len1; s++) for (let y = 0; y < 18; y++) axis === 'z' ? V.set(s, y, fixed + dir * 12, 'stoneBricks') : V.set(fixed + dir * 12, y, s, 'stoneBricks');
  };
  stand('x', -Wd - 5, -1, 'z', -L - 6, L + 5);   // main stand (tunnel side)
  stand('x', Wd + 4, 1, 'z', -L - 6, L + 5);     // opposite stand
  stand('z', -L - 6, -1, 'x', -Wd - 4, Wd + 3);  // ends
  stand('z', L + 5, 1, 'x', -Wd - 4, Wd + 3);

  // players' tunnel in the middle of the main stand, framed in dark bricks
  const zf = -Wd - 5; // front column of the main stand (= -25)
  for (let z = zf; z >= zf - 9; z--) for (let x = -2; x <= 1; x++) { for (let y = 0; y <= 2; y++) V.del(x, y, z); V.set(x, -1, z, 'stoneBricks'); }
  for (let z = zf; z >= zf - 9; z--) for (let y = 0; y <= 3; y++) { V.set(-3, y, z, 'stoneBricks'); V.set(2, y, z, 'stoneBricks'); }
  for (let z = zf; z >= zf - 9; z--) for (let x = -3; x <= 2; x++) V.set(x, 3, z, 'stoneBricks');
  for (let x = -2; x <= 1; x++) for (let y = 0; y <= 2; y++) V.set(x, y, zf - 10, 'black');
  for (let y = 0; y <= 3; y++) { V.set(-3, y, zf, 'deepBricks'); V.set(2, y, zf, 'deepBricks'); }
  for (let x = -3; x <= 2; x++) V.set(x, 3, zf, 'deepBricks');

  // roof-edge lights on the main stand (4 banks) + the opposite stand
  const lampOff = new THREE.MeshLambertMaterial({ map: tex(B.lamp()), emissive: 0xfff4dc, emissiveMap: tex(B.lamp()), emissiveIntensity: 0 });
  const banks = [0, 1, 2, 3].map(() => lampOff.clone());
  scene.add(V.build({ ...M }));
  const lampGeo = new THREE.BoxGeometry(1, 1, 1);
  const bankMeshes = banks.map((mat, b) => {
    const xs = []; for (let x = -L - 6 + b * 19; x < -L - 6 + (b + 1) * 19 && x <= L + 5; x += 2) xs.push(x);
    const mesh = new THREE.InstancedMesh(lampGeo, mat, xs.length), m4 = new THREE.Matrix4();
    xs.forEach((x, i) => mesh.setMatrixAt(i, m4.makeTranslation(x + 0.5, 18.5, zf - 12 + 0.5)));
    scene.add(mesh); return mesh;
  });
  // tunnel lamps either side of the mouth
  const tunnelLampMat = lampOff.clone();
  for (const x of [-4, 3]) { const m = new THREE.Mesh(lampGeo, tunnelLampMat); m.position.set(x + 0.5, 2.5, zf + 0.5); scene.add(m); }

  // floodlight towers behind the far end + behind the camera end
  const towers = [];
  const ironM = M.iron;
  for (const [x, z] of [[-L - 15, -13], [-L - 15, 13], [L + 15, -13], [L + 15, 13]]) {
    const tw = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.BoxGeometry(1, 30, 1), ironM); pole.position.y = 15; tw.add(pole);
    const headMat = lampOff.clone();
    const head = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 1), [ironM, ironM, ironM, ironM, headMat, ironM]);
    head.position.set(0, 31, 0.3); tw.add(head);
    const frameM = new THREE.Mesh(new THREE.BoxGeometry(6.6, 4.6, 0.8), ironM); frameM.position.set(0, 31, -0.2); tw.add(frameM);
    tw.position.set(x, 0, z); tw.lookAt(0, 0, 0); scene.add(tw);
    const spot = new THREE.SpotLight(0xf3f6ff, 0, 0, 0.42, 0.5, 2); spot.position.set(x, 31, z); spot.target.position.set(x * 0.2, 0, z * 0.2); scene.add(spot, spot.target);
    // fake volumetric beam
    const beamLen = Math.hypot(x * 0.8, 31, z * 0.8);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(9, beamLen, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.set(x * 0.6, 31 / 2 + 0.5, z * 0.6);
    beam.lookAt(x, 31, z); beam.rotateX(Math.PI / 2);
    scene.add(beam);
    towers.push({ headMat, spot, beam, x, z });
  }

  // lights: moonlit night, tunnel spot, crest spot
  const hemi = new THREE.HemisphereLight(0x5874b8, 0x0c140c, 0.35); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x8aa6ff, 0.5); moon.position.set(-20, 40, 30); scene.add(moon);
  const key = new THREE.SpotLight(0xfff6ea, 0, 0, 0.5, 0.5, 2); key.position.set(4, 14, zf + 16); key.target.position.set(0, 1, zf + 4);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0006; scene.add(key, key.target);
  const tunnelSpot = new THREE.SpotLight(0xffe6c0, 0, 0, 0.7, 0.6, 2); tunnelSpot.position.set(0, 5.5, zf + 3); tunnelSpot.target.position.set(0, 0, zf - 2); scene.add(tunnelSpot, tunnelSpot.target);

  // opponent crest framed above the tunnel
  const fr = crestFrame(crestHellas, 4.0); fr.group.position.set(0, STAD.crestY, zf + 1.3); scene.add(fr.group);
  const crestSpot = new THREE.SpotLight(0xffffff, 0, 0, 0.35, 0.5, 2); crestSpot.position.set(0, 2, zf + 14); crestSpot.target.position.set(0, STAD.crestY, zf); scene.add(crestSpot, crestSpot.target);

  // sky: gradient, square stars, square moon
  const sky = cv(4, 256), sg = sky.getContext('2d'), grad = sg.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#050a1c'); grad.addColorStop(0.55, '#0e1a3e'); grad.addColorStop(1, '#22325f');
  sg.fillStyle = grad; sg.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;
  const R = rng(91), starPos = [];
  for (let i = 0; i < 700; i++) { const a = R() * Math.PI * 2, e = 0.12 + R() * 1.3, r = 400; starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(sgeo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.2, sizeAttenuation: false, fog: false })));
  const moonM = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ color: 0xf2f5ff, fog: false }));
  moonM.position.set(-300, 210, -120); moonM.lookAt(0, 0, 0); scene.add(moonM);
  scene.fog = new THREE.FogExp2(0x0c1428, 0.0085);

  const dust = makeParticles(500, 60, 22, 0xfff3d8, 93, 0.12); scene.add(dust);
  return { scene, banks, bankMeshes, tunnelLampMat, towers, key, tunnelSpot, crestSpot, crestFrame: fr, hemi, dust, zf };
}
