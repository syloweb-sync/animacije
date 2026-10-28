// FILM — window.renderAt(t) draws frame t (seconds) as a pure function of time:
// 3D voxel world (three.js) -> bloom -> 2D UI on top -> PNG data URL.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { B, loadImage, crop, iconBall, iconBoots, iconBottle, iconJersey, upscale } from './textures.js';
import { buildLocker, buildDark, buildStadium, makePlayer, makeBall, KITS, driftParticles, STAD } from './world.js';
import * as UI from './ui.js';

const SC = globalThis.SCORE;
const { W, H, ev, BEAT, S } = SC;
const { clamp, lerp, ease, prog } = UI;
const NOUI = new URLSearchParams(location.search).has('noui'); // debug: 3D only

// ------------------------------------------------------------------ renderer + compositor
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 900);
const SAMPLES = parseInt(new URLSearchParams(location.search).get('samples') ?? '4', 10);
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: SAMPLES }));
const renderPass = new RenderPass(new THREE.Scene(), camera);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.6, 0.45, 0.85);
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(new OutputPass());

const out = document.createElement('canvas'); out.width = W; out.height = H;
const ctx = out.getContext('2d');
const blurCv = document.createElement('canvas'); blurCv.width = W / 2; blurCv.height = H / 2;

// ------------------------------------------------------------------ assets + sets
const [ksvImg, oppImg] = await Promise.all([loadImage('assets/grb-ksv-trenk.png'), loadImage('assets/grb-tsv-leitershofen.png')]);
const ksv = crop(ksvImg, 0, 0, ksvImg.width, ksvImg.height); // supplied crests, trimmed to content (no edits)
const opp = crop(oppImg, 0, 0, oppImg.width, oppImg.height);
const icons = { lopta: upscale(iconBall()), kopacke: upscale(iconBoots()), boca: upscale(iconBottle()), dres: upscale(iconJersey(ksv)) };
UI.setWipeTile(upscale(B.deepslate(), 6));

const LK = buildLocker(ksv), DK = buildDark(), ST = buildStadium(opp);
const pK = makePlayer(KITS.ksv(ksv)); pK.root.position.set(0, 0, -1.2); LK.scene.add(pK.root);
const ballK = makeBall(); pK.hand.add(ballK); ballK.position.set(0, -0.02, 0.12);
const pD = makePlayer(KITS.ksv(ksv)); DK.scene.add(pD.root);
const ballD = makeBall(); DK.scene.add(ballD);
const pH = makePlayer(KITS.opp(opp)); ST.scene.add(pH.root);

// inventory preview: its own little scene, rendered into the black box of the GUI
const PV = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(19, 240 / 350, 0.1, 50), player: makePlayer(KITS.ksv(ksv)) };
PV.scene.add(PV.player.root);
PV.scene.add(new THREE.HemisphereLight(0xffffff, 0x50506a, 1.6));
const pvKey = new THREE.DirectionalLight(0xffffff, 1.8); pvKey.position.set(1.5, 2.5, 4); PV.scene.add(pvKey);
const ballPV = makeBall(); PV.player.hand.add(ballPV); ballPV.position.set(0, -0.02, 0.12);
PV.cam.position.set(0, 1.02, 7.2); PV.cam.lookAt(0, 1.0, 0);

// ------------------------------------------------------------------ helpers
const v3 = (a) => new THREE.Vector3(...a);
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function shoot(pos, look, fov) {
  camera.position.set(...pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(v3(look));
}
const shake = (t, t0, amt = 0.08, dur = 0.3) => {
  const k = 1 - prog(t, t0, dur); if (k <= 0 || t < t0) return [0, 0];
  return [Math.sin(t * 91) * amt * k, Math.cos(t * 77) * amt * k];
};
// lamp switching on: a quick flicker, then steady
const lampOn = (t, t0) => { if (t < t0) return 0; const u = t - t0; if (u < 0.05) return 1; if (u < 0.09) return 0.25; if (u < 0.13) return 1.2; return 1; };
const idle = (t) => ({ bob: Math.sin(t * Math.PI) * 0.01, armRz: 0.06, armLz: -0.06 });

// ------------------------------------------------------------------ SCENE 0+1: KSV crest intro, locker room + inventory
const CAM_CREST = [[0, 4.7, 3.2], [0, 4.7, 2.0], [0, 4.25, -4.85]]; // start, end of the slow push, look-at (below the crest so it sits high)
const CAM_ROOM = [[0.0, 1.5, 7.2], [0.35, 1.6, 3.6], [0, 1.35, -1.6], [0, 1.45, -1.6]];
function sceneLocker(t) {
  const crane = S.intro[1] - BEAT; // crane down from the crest to the player: last beat of the intro into the inventory
  if (t < crane) {
    const k = ease.out(prog(t, 0, crane));
    shoot(lerp3(CAM_CREST[0], CAM_CREST[1], k), CAM_CREST[2], 50);
  } else if (t < ev.invOpen) {
    const k = ease.inOut(prog(t, crane, ev.invOpen - crane));
    shoot(lerp3(CAM_CREST[1], CAM_ROOM[0], k), lerp3(CAM_CREST[2], CAM_ROOM[2], k), 50);
  } else {
    const k = ease.inOut(prog(t, ev.invOpen, S.inv[1] - ev.invOpen));
    shoot(lerp3(CAM_ROOM[0], CAM_ROOM[1], k), lerp3(CAM_ROOM[2], CAM_ROOM[3], k), 50);
  }
  const holding = t >= ev.place;
  ballK.visible = holding;
  const look = t < ev.invOpen ? 0.25 * (1 - prog(t, crane, ev.invOpen - crane)) : 0;
  pK.pose({ ...idle(t), headPitch: 0.15 * (t >= ev.invOpen ? 1 : 0), headYaw: look, armR: holding ? -0.55 : 0 });
  LK.crestFrame.crestMat.color.setScalar(0.9); // keep the crest under the bloom threshold: true colours, no halo
  renderPass.scene = LK.scene;
  bloom.strength = 0.4; bloom.threshold = 0.93;
  renderer.toneMappingExposure = 1.05;
}

function drawPreview(t) {
  return (rect) => {
    const [mx, my] = UI.cursorAt(t);
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h * 0.28;
    const hold = t >= ev.place;
    const yaw = clamp((mx - cx) / 500, -0.9, 0.9), pitch = clamp((my - cy) / 900, -0.5, 0.5);
    PV.player.pose({ ...idle(t), headYaw: t >= ev.cursorIn ? yaw : 0, headPitch: t >= ev.cursorIn ? pitch : 0, bodyYaw: (t >= ev.cursorIn ? yaw : 0) * 0.35, armR: hold ? -0.55 : 0 });
    ballPV.visible = hold;
    PV.cam.aspect = rect.w / rect.h; PV.cam.updateProjectionMatrix();
    renderer.setRenderTarget(null);
    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, rect.w, rect.h); renderer.setScissor(0, 0, rect.w, rect.h);
    renderer.setClearColor(0x000000, 1); renderer.clear();
    renderer.render(PV.scene, PV.cam);
    renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
    ctx.drawImage(renderer.domElement, 0, H - rect.h, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h);
  };
}

// ------------------------------------------------------------------ SCENE 2: dark mission stage
function sceneDark(t) {
  const u = prog(t, S.mission[0], S.mission[1] - S.mission[0]), k = ease.inOut(u);
  const ang = lerp(-0.55, 0.3, k), r = lerp(5.9, 5.1, k), hgt = lerp(0.9, 1.15, k);
  shoot([Math.sin(ang) * r, hgt, Math.cos(ang) * r], [0, 2.75, 0], 60);
  // dribble: the ball hits the floor on the beat, then is caught when the mission is accepted
  const hand = 0.92, floor = 0.15;
  let by = hand, bz = 0.42, armR = -0.55;
  const hits = ev.bounces;
  const hp = BEAT / 2; // half a bounce
  if (t >= hits[0] - hp && t < ev.missionAccept) {
    let best = hits[0]; for (const h of hits) if (Math.abs(t - h) < Math.abs(t - best)) best = h;
    const q = clamp(Math.abs(t - best) / hp);
    by = floor + (hand - floor) * (1 - (1 - q) * (1 - q));
    armR = -0.55 + 0.35 * (1 - q) * (t < best ? 1 : 0.4);
  }
  if (t >= ev.missionAccept) { by = lerp(hand, 1.0, ease.out(prog(t, ev.missionAccept, 0.2))); armR = -0.62; }
  ballD.position.set(-0.38, by, bz);
  ballD.rotation.set(t * 4, t * 2.5, 0);
  const lookDown = t < ev.missionAccept ? 0.22 : lerp(0.22, -0.08, ease.out(prog(t, ev.missionAccept, 0.3)));
  pD.pose({ ...idle(t), headPitch: lookDown, armR, armL: t >= ev.missionAccept ? -0.2 : 0 });
  driftParticles(DK.particles, t, 0.22);
  renderPass.scene = DK.scene;
  bloom.strength = 0.55; bloom.threshold = 0.8;
  renderer.toneMappingExposure = 1.1;
}

// ------------------------------------------------------------------ SCENE 3 + FINAL: stadium
function stadiumLights(t, finalShot) {
  ev.lights.forEach((t0, i) => {
    const on = finalShot ? 1 : lampOn(t, t0);
    ST.banks[i].emissiveIntensity = 2.2 * on;
    const tw = ST.towers[i];
    tw.headMat.emissiveIntensity = 3 * on;
    tw.spot.intensity = 5500 * on;
    tw.beam.material.opacity = 0.022 * on;
  });
  const all = finalShot ? 1 : lampOn(t, ev.lights[3]);
  ST.key.intensity = 650 * all;
  ST.tunnelSpot.intensity = 70 * all;
  ST.tunnelLampMat.emissiveIntensity = 2.5 * all;
  ST.hemi.intensity = 0.35 + 0.45 * all;
  const c = finalShot ? 1 : t < ev.crest ? 0.015 : lampOn(t, ev.crest);
  ST.crestFrame.crestMat.color.setScalar(Math.max(0.015, Math.min(1, c) * 0.88)); // stays under the bloom threshold
  ST.crestFrame.goldM.emissive.setRGB(0.22 * c, 0.16 * c, 0.03 * c);
  ST.crestSpot.intensity = 350 * c;
}

function sceneTunnel(t) {
  // wide on the main stand while its lights clunk on, then a slow dolly down to a low hero angle:
  // the opponent in the lower half, his club crest framed above the tunnel
  const k = ease.inOut(prog(t, S.opp[0], (S.opp[1] - S.opp[0]) * 0.92)), zf = ST.zf;
  const sx = Math.sin(t * 0.8) * 0.25 * (1 - k);
  shoot([sx, lerp(3.6, 0.9, k), zf + lerp(23, 11.5, k)], [0, lerp(8.5, 4.5, k), zf], 56);
  stadiumLights(t, false);
  // the opponent walks out of the tunnel, a footstep on every beat
  const [w0, w1] = ev.walk;
  const wk = prog(t, w0, w1 - w0);
  const z = lerp(zf - 2.5, zf + 5.5, wk);
  pH.root.position.set(0, 0, z);
  pH.root.visible = true;
  if (t >= w0 && t < w1) {
    const ph = (t - w0) / BEAT * Math.PI;
    const sw = Math.sin(ph) * 0.62;
    pH.pose({ legR: sw, legL: -sw, armR: -sw * 0.8, armL: sw * 0.8, bob: Math.abs(Math.sin(ph)) * 0.035, armRz: 0.05, armLz: -0.05 });
  } else {
    const look = t >= w1 ? lerp(0, -0.12, ease.out(prog(t, w1, 0.3))) : 0;
    pH.pose({ ...idle(t), headPitch: look });
  }
  driftParticles(ST.dust, t, 0.15);
  ST.dust.material.opacity = 0.7 * lampOn(t, ev.lights[3]);
  renderPass.scene = ST.scene;
  bloom.strength = 0.5; bloom.threshold = 0.92;
  renderer.toneMappingExposure = 1.0;
}

function sceneFinal(t) {
  const k = ease.out(prog(t, S.final[0], S.final[1] - S.final[0]));
  const [a, b] = shake(t, ev.fin.vs, 0.12, 0.35);
  shoot([lerp(25, 20, k) + a, lerp(3.4, 4.4, k) + b, 0], [-24, lerp(3.2, 4.0, k), 0], 62);
  stadiumLights(t, true);
  pH.root.visible = false;
  driftParticles(ST.dust, t, 0.15);
  ST.dust.material.opacity = 0.8;
  renderPass.scene = ST.scene;
  bloom.strength = 0.6; bloom.threshold = 0.9;
  renderer.toneMappingExposure = 1.0;
}

// ------------------------------------------------------------------ frame
function draw3D() {
  composer.render();
  ctx.drawImage(renderer.domElement, 0, 0);
}

window.renderAt = (t) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  if (t < ev.wipe1) sceneLocker(t);
  else if (t < ev.wipe2) sceneDark(t);
  else if (t < ev.flash) sceneTunnel(t);
  else sceneFinal(t);
  draw3D();
  if (NOUI) return out.toDataURL('image/png');

  // scene 1: dim + blur the world behind the open inventory
  const inv = t < ev.wipe1 ? UI.inventoryOpenAmount(t) : 0;
  if (inv > 0.001) {
    const bg = blurCv.getContext('2d');
    bg.filter = 'blur(5px)'; bg.drawImage(out, 0, 0, W / 2, H / 2); bg.filter = 'none';
    ctx.globalAlpha = clamp(inv); ctx.drawImage(blurCv, 0, 0, W, H); ctx.globalAlpha = 1;
    UI.fill(ctx, '#05060a', 0.5 * clamp(inv));
  }
  UI.vignette(ctx, t >= ev.wipe1 && t < ev.wipe2 ? 0.75 : 0.5);
  if (t < S.intro[1]) UI.drawTitle(ctx, t);
  if (t < ev.wipe1) UI.drawInventory(ctx, t, icons, drawPreview(t));
  UI.drawMission(ctx, t, icons, { opp });
  if (t >= ev.flash) UI.drawFinal(ctx, t, { ksv, opp });

  // transitions
  UI.blockWipe(ctx, t, ev.wipe1);
  UI.blockWipe(ctx, t, ev.wipe2);
  UI.fill(ctx, '#ffffff', 0.9 * (1 - prog(t, ev.flash, 0.4)) * (t >= ev.flash ? 1 : 0));
  UI.fill(ctx, '#000000', 1 - prog(t, ev.fadeIn[0], ev.fadeIn[1]));
  return out.toDataURL('image/png');
};

window.READY = true;
