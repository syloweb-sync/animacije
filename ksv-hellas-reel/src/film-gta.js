// FILM (game style) — pause menu -> loading -> the lowrider pulls up, the player gets out, shuts the
// door and takes a few steps -> match card. window.renderAt(t) is a pure function of time.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { loadImage, crop } from './textures.js';
import { buildStreet, makeCar, makeDude, walkPose } from './world-gta.js';
import { loadFonts } from './font-gta.js';
import * as HUD from './hud-gta.js';

const SC = globalThis.SCORE;
const { W, H, ev, S, CAR, MATCH, carX, carSpeed } = SC;
const { clamp, lerp, ease, prog } = HUD;
const NOUI = new URLSearchParams(location.search).has('noui');

// ------------------------------------------------------------------ renderer + post chain
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 1200);
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
const renderPass = new RenderPass(new THREE.Scene(), camera);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.5, 0.6, 0.95);
// the era's look: warm sepia-orange cast, lifted milky shadows, softer saturation, S-curve, vignette,
// a hint of chromatic fringing towards the edges and fine film grain
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, res: { value: new THREE.Vector2(W, H) }, amount: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; uniform vec2 res; uniform float amount; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5; float r = length(d * vec2(0.62, 1.0)) * 1.5;
      vec2 off = d * r * 0.0035 * amount;
      vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      vec3 o = c;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, 0.78);
      c = c * vec3(1.10, 0.97, 0.76) + vec3(0.06, 0.04, 0.005);
      c = mix(c, smoothstep(0.0, 1.0, c), 0.3);
      c = mix(o, c, amount);
      c *= 1.0 - amount * 0.5 * smoothstep(0.45, 1.05, r);
      c += (hash(vUv * res + fract(time) * 91.7) - 0.5) * 0.035 * amount;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(new OutputPass()); composer.addPass(grade);
const out = document.createElement('canvas'); out.width = W; out.height = H;
const ctx = out.getContext('2d');

// ------------------------------------------------------------------ assets + set
await loadFonts();
const [homeImg, awayImg, ksvImg] = await Promise.all([loadImage(MATCH.homeCrest), loadImage(MATCH.awayCrest), loadImage('assets/grb-ksv-trenk.png')]);
const whole = (im) => crop(im, 0, 0, im.width, im.height);
const crests = { home: whole(homeImg), away: whole(awayImg) }, ksv = whole(ksvImg);

const ST = buildStreet({ crestKsv: ksv });
renderPass.scene = ST.scene;
const car = makeCar(); ST.scene.add(car.group);
const dude = makeDude({ crest: ksv }); ST.scene.add(dude.root);

// ------------------------------------------------------------------ helpers
const v3 = (a) => new THREE.Vector3(...a);
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function shoot(pos, look, fov = 52) { camera.position.set(...pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(v3(look)); }
const hand = (t, amt = 0.03) => [Math.sin(t * 1.3) * amt + Math.sin(t * 3.1) * amt * 0.3, Math.sin(t * 1.7 + 1) * amt * 0.7, 0]; // handheld drift
const smooth = (x) => x * x * (3 - 2 * x);

// ------------------------------------------------------------------ the car
function carState(t) {
  const x = carX(t), v = carSpeed(t);
  car.group.position.set(x, 0, CAR.lane);
  car.wheels.forEach((w) => { w.rotation.y = -(x - CAR.x0) / 0.36; });
  // braking dive, then a soft lowrider rebound after the stop
  const tStop = ev.carStop;
  let pitch = 0;
  if (t < tStop && v > 0.1) pitch = -0.02 * clamp((tStop - t) < 1.6 ? 1 - (tStop - t) / 1.6 : 0) - 0.008;
  if (t >= tStop) { const u = t - tStop; pitch = -0.035 * Math.cos(u * 9) * Math.exp(-u * 3.2); }
  car.body.rotation.z = pitch;
  car.body.position.y = t >= tStop ? -0.02 * Math.exp(-(t - tStop) * 3) * Math.cos((t - tStop) * 9) : 0;
  // door: opens, then is slammed shut
  let door = 0;
  if (t >= ev.doorOpen) door = -1.12 * ease.out(prog(t, ev.doorOpen, 0.45));
  if (t >= ev.doorClose[0]) door = -1.12 * (1 - ease.in(prog(t, ev.doorClose[0], ev.doorClose[1] - ev.doorClose[0])));
  if (t >= ev.doorClose[1]) door = 0.02 * Math.sin((t - ev.doorClose[1]) * 40) * Math.exp(-(t - ev.doorClose[1]) * 12); // rattle
  car.door.rotation.y = door;
}

// ------------------------------------------------------------------ the player
const SEAT = [0.12, CAR.lane - 0.42], OUT = [-0.45, -3.95];
const PATH = [[-0.45, -3.95], [1.5, -4.55], [3.9, -5.45]]; // a short arc onto the sidewalk, towards camera
const bez = (u) => {
  const [a, b, c] = PATH, m = 1 - u;
  return [m * m * a[0] + 2 * m * u * b[0] + u * u * c[0], m * m * a[1] + 2 * m * u * b[1] + u * u * c[1]];
};
const bezT = (u) => { const [a, b, c] = PATH; return [2 * (1 - u) * (b[0] - a[0]) + 2 * u * (c[0] - b[0]), 2 * (1 - u) * (b[1] - a[1]) + 2 * u * (c[1] - b[1])]; };
const kerbY = (z) => (z < -4.12 ? 0.15 : z < -3.98 ? 0.15 * (-(z + 3.98) / 0.14) : 0);

function dudeState(t) {
  const visible = t >= ev.doorOpen - 0.05;
  dude.root.visible = visible;
  if (!visible) return;
  const [e0, e1] = ev.exit, [w0, w1] = ev.walk;
  let pos = [...SEAT], yaw = Math.PI, pose = {};
  if (t < e1) {
    // seated -> one leg out -> stand up beside the car
    const u = prog(t, e0, e1 - e0), up = smooth(clamp((u - 0.3) / 0.7));
    pos = [lerp(SEAT[0], OUT[0], smooth(u)), lerp(SEAT[1], OUT[1], smooth(u))];
    yaw = Math.PI - 0.25 * Math.sin(u * Math.PI);
    pose = {
      drop: lerp(0.52, 0, up), thL: lerp(-1.45, -0.1, smooth(clamp(u * 1.6))), thR: lerp(-1.45, 0, up),
      knL: lerp(1.45, 0.15, smooth(clamp(u * 1.6))), knR: lerp(1.45, 0.1, up), lean: lerp(-0.25, 0.04, up) + 0.25 * Math.sin(up * Math.PI),
      shL: lerp(-0.4, 0.05, up), shR: lerp(-0.9, 0.05, up), elR: lerp(1.0, 0.2, up), headPitch: 0.15 * Math.sin(up * Math.PI),
    };
  } else if (t < w0) {
    // turn to the door and shove it shut
    pos = [...OUT];
    const u = prog(t, ev.turn[0], ev.turn[1] - ev.turn[0]);
    yaw = lerp(Math.PI, 1.35, smooth(u));
    const push = t >= ev.doorClose[0] - 0.15 ? Math.sin(prog(t, ev.doorClose[0] - 0.15, 0.55) * Math.PI) : 0;
    pose = { shR: -1.25 * push, elR: 0.3, shOutR: 0.12, twist: -0.2 * push, lean: 0.05, headYaw: -0.15 * push, ...idle(t) };
  } else {
    // a few steps with swagger; then stop and stand facing the camera
    const u = prog(t, w0, w1 - w0);
    const p = bez(ease.inOut(u) * 0.15 + u * 0.85);
    pos = p;
    const [tx, tz] = bezT(clamp(u, 0.02, 0.98));
    yaw = Math.atan2(tx, tz);
    const ph = (t - w0) / ev.stepPeriod * Math.PI, fade = clamp((w1 - t) / 0.35) * clamp((t - w0) / 0.2);
    pose = walkPose(ph, t < w1 ? 1 : 0);
    if (t >= w1 - 0.35) pose = { ...mixPose(idle(t), pose, fade) };
  }
  if (t >= ev.card) { // attitude: weight back, chin up, a slow nod on the title
    const k = ease.out(prog(t, ev.card, 0.6)), nod = Math.sin(prog(t, ev.fin.title, 0.5) * Math.PI);
    pose = { ...idle(t), lean: -0.06 * k, headPitch: -0.08 * k + 0.12 * nod, shOutL: 0.25, shOutR: 0.25, elL: 0.4, elR: 0.4, thOutL: 0.08, thOutR: 0.08 };
    yaw = lerp(yaw, 1.35, k);
  }
  dude.root.position.set(pos[0], kerbY(pos[1]), pos[1]);
  dude.root.rotation.y = yaw;
  dude.pose(pose);
}
const idle = (t) => ({ bob: 0.006 * Math.sin(t * 2.2), sway: 0.015 * Math.sin(t * 1.1), elL: 0.2, elR: 0.2 });
function mixPose(a, b, k) { const o = {}; for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) o[key] = lerp(a[key] || 0, b[key] || 0, k); return o; }

// ------------------------------------------------------------------ cameras
function streetCamera(t) {
  const [s0] = S.street, stop = ev.carStop;
  const A0 = [11.5, 1.15, -5.7], A1 = [10.2, 1.3, -5.8];               // on the sidewalk ahead, the car comes at us
  const B = [4.7, 1.55, -6.5];                                          // closer, on the door
  const C = [7.6, 1.6, -6.7], D = [6.8, 1.55, -6.55];                   // he walks towards us; slow push for the card
  const chest = () => { const p = dude.root.position; return [p.x, p.y + 1.2, p.z]; };
  let pos, look;
  const carLook = [carX(t) + 1.2, 0.8, CAR.lane];
  if (t < stop) {
    const k = smooth(prog(t, s0, stop - s0));
    pos = mix3(A0, A1, k); look = carLook;
  } else if (t < ev.walk[0]) {
    const k = ease.inOut(prog(t, stop, 1.1));
    pos = mix3(A1, B, k); look = mix3(carLook, [0.0, 1.05, -3.4], k);
  } else if (t < ev.card) {
    const k = ease.inOut(prog(t, ev.walk[0], ev.card - ev.walk[0]));
    pos = mix3(B, C, k); look = mix3([0.0, 1.05, -3.4], chest(), ease.inOut(prog(t, ev.walk[0], 0.8)));
  } else {
    const k = ease.out(prog(t, ev.card, S.card[1] - ev.card));
    pos = mix3(C, D, k); look = chest();
  }
  const h = hand(t);
  shoot([pos[0] + h[0], pos[1] + h[1], pos[2]], look, 50);
}

// the menu art: the hillside sign at dusk
function menuCamera(t) {
  const k = prog(t, 0, S.menu[1]);
  shoot([-126 - k * 3, 11, 20], [-180, 18, 37], 58);
}

// ------------------------------------------------------------------ frame
function render3D(t) {
  grade.uniforms.time.value = t;
  composer.render();
  ctx.drawImage(renderer.domElement, 0, 0);
}

function headingAndRadar() {
  const f = new THREE.Vector3(); camera.getWorldDirection(f);
  const heading = Math.atan2(f.x, -f.z);                       // map up = camera forward (map y grows to +z)
  const p = dude.root.visible ? dude.root.position : car.group.position;
  return { heading, player: [p.x, p.z], target: [14, -9.4] };
}

window.renderAt = (t) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  carState(t); dudeState(t);

  if (t < S.menu[1]) {
    menuCamera(t); render3D(t);
    if (NOUI) return out.toDataURL('image/png');
    const art = document.createElement('canvas'); art.width = W; art.height = H; art.getContext('2d').drawImage(out, 0, 0);
    HUD.drawMenu(ctx, t, art, [0, 560, W, 800]);
    HUD.fill(ctx, '#000', 1 - prog(t, ev.fadeIn[0], ev.fadeIn[1]));
    HUD.fill(ctx, '#000', prog(t, ev.menuOut[0], ev.menuOut[1] - ev.menuOut[0]));
    return out.toDataURL('image/png');
  }
  if (t < S.loading[1]) { HUD.drawLoading(ctx, t); return out.toDataURL('image/png'); }

  streetCamera(t); render3D(t);
  if (NOUI) return out.toDataURL('image/png');
  HUD.vignette(ctx, 0.35);
  if (t < ev.card) { HUD.drawHUD(ctx, t, headingAndRadar()); HUD.drawZone(ctx, t); }
  HUD.drawCard(ctx, t, crests);
  // the cut into the card: a quick white pop, like walking into a mission marker
  HUD.fill(ctx, '#fff4e0', t >= ev.card ? 0.85 * (1 - prog(t, ev.card, 0.35)) : 0);
  HUD.fill(ctx, '#000', 1 - prog(t, ev.streetIn[0], ev.streetIn[1] - ev.streetIn[0]));
  HUD.fill(ctx, '#000', prog(t, S.card[1] - 0.4, 0.4));
  return out.toDataURL('image/png');
};

window.READY = true;
