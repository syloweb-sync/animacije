// VICTORY FILM — "3 PUNKTE": the mission gets stamped ERFÜLLT!, a celebration TNT in the locker room
// knocks everybody over, +3 PUNKTE flies out of the smoke, crouch dance, SIEG! card.
// window.renderAt(t) is a pure function of time, like film.js.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { B, loadImage, crop, iconBall, upscale } from './textures.js';
import { buildLocker, buildDark, buildStadium, makePlayer, makeBall, KITS, driftParticles, makeTNT, makeSmoke, makeRainCloud, makeTorch } from './world.js';
import * as UI from './ui.js';

const SC = globalThis.SCORE;
const { W, H, ev, BEAT, S } = SC;
const { clamp, lerp, ease, prog } = UI;

// ------------------------------------------------------------------ renderer + compositor (as in film.js)
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 900);
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
const renderPass = new RenderPass(new THREE.Scene(), camera);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.5, 0.45, 0.9);
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(new OutputPass());
const out = document.createElement('canvas'); out.width = W; out.height = H;
const ctx = out.getContext('2d');

// ------------------------------------------------------------------ assets + sets
const [ksvImg, oppImg] = await Promise.all([loadImage('assets/grb-ksv-trenk.png'), loadImage('assets/grb-fc-hellas.png')]);
const ksv = crop(ksvImg, 0, 0, ksvImg.width, ksvImg.height);
const opp = crop(oppImg, 112, 0, 576, 800);
const icons = { lopta: upscale(iconBall()) };
UI.setWipeTile(upscale(B.deepslate(), 6));

const DK = buildDark(), LK = buildLocker(ksv, { door: true }), ST = buildStadium(opp);
LK.crestFrame.crestMat.color.setScalar(0.9);

// mission screen: the KSV player with the ball, as in the announcement
const pD = makePlayer(KITS.ksv(ksv)); DK.scene.add(pD.root);
const ballD = makeBall(); pD.hand.add(ballD); ballD.position.set(0, -0.02, 0.12);

// locker room: three KSV players around the TNT, FC Hellas player behind the door
const kit = KITS.ksv(ksv);
const crew = [
  { p: makePlayer({ ...kit, number: '10' }), pos: [0, -2.3], yaw: 0 },
  { p: makePlayer({ ...kit, number: '7', hair: '#c9a24a', eyes: '#3c7a3c' }), pos: [-1.55, -1.0], yaw: 0.55 },
  { p: makePlayer({ ...kit, number: '9', hair: '#1a120c', skin: '#b57d58', skinShade: '#9c6848' }), pos: [1.55, -1.0], yaw: -0.55 },
];
for (const c of crew) { c.p.root.position.set(c.pos[0], 0, c.pos[1]); c.p.root.rotation.y = c.yaw; LK.scene.add(c.p.root); }
const tnt = makeTNT(); tnt.group.position.set(0, 0, -0.75); LK.scene.add(tnt.group);
const torch = makeTorch(); crew[0].p.hand.add(torch.group); torch.group.rotation.x = Math.PI / 2; torch.group.position.set(0, 0, 0.05);
const smoke = makeSmoke(); LK.scene.add(smoke.mesh);
const cough = makeSmoke(10, 131); LK.scene.add(cough.mesh);
const pH = makePlayer(KITS.hellas(opp)); LK.scene.add(pH.root);
const cloud = makeRainCloud(); pH.root.add(cloud.group); cloud.group.position.set(0, 2.55, 0);
const boomLight = new THREE.PointLight(0xffd8a0, 0, 14, 2); boomLight.position.set(0, 1.2, -0.75); LK.scene.add(boomLight);

// ------------------------------------------------------------------ helpers
const v3 = (a) => new THREE.Vector3(...a);
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function shoot(pos, look, fov) { camera.position.set(...pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(v3(look)); }
const shake = (t, t0, amt, dur) => { const k = 1 - prog(t, t0, dur); if (t < t0 || k <= 0) return [0, 0, 0]; return [Math.sin(t * 91) * amt * k, Math.cos(t * 77) * amt * k, Math.sin(t * 53) * amt * k]; };
const idle = (t, ph = 0) => ({ bob: Math.sin(t * Math.PI + ph) * 0.01, armRz: 0.06, armLz: -0.06 });
const bounce = (x) => { // ease-out bounce for the fall
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
};

// ------------------------------------------------------------------ 1: mission window, ERFÜLLT!
function sceneMission(t) {
  const k = ease.inOut(prog(t, S.mission[0], S.mission[1] - S.mission[0]));
  const ang = lerp(-0.35, 0.25, k), r = lerp(5.6, 5.0, k);
  shoot([Math.sin(ang) * r, lerp(0.95, 1.1, k), Math.cos(ang) * r], [0, 2.75, 0], 60);
  // the stamp makes him jump for joy
  const j = t >= ev.stamp ? Math.max(0, Math.sin(Math.min(1, (t - ev.stamp) / 0.45) * Math.PI)) : 0;
  const arms = t >= ev.stamp ? ease.out(prog(t, ev.stamp, 0.2)) : 0;
  pD.root.position.y = 0.45 * j;
  pD.pose({ ...idle(t), armR: lerp(-0.55, -3.0, arms), armL: lerp(0, -3.0, arms), armRz: 0.4 * arms, armLz: -0.4 * arms, headPitch: lerp(0.1, -0.15, arms) });
  driftParticles(DK.particles, t, 0.22);
  renderPass.scene = DK.scene;
  bloom.strength = 0.55; bloom.threshold = 0.8; renderer.toneMappingExposure = 1.1;
}

// ------------------------------------------------------------------ 2-5: locker room
function sceneLocker(t) {
  // camera: push in on the lit fuse, jolt on the boom, pull back for the mess and the dance
  let pos, look;
  if (t < ev.boom) { const k = ease.inOut(prog(t, S.locker[0], ev.boom - S.locker[0])); pos = lerp3([0, 2.5, 5.6], [0, 1.9, 3.7], k); look = lerp3([0, 1.1, -1.2], [0, 1.0, -1.0], k); }
  else { const k = ease.inOut(prog(t, ev.boom, 1.2)), k2 = ease.inOut(prog(t, ev.dance[0], ev.dance[1] - ev.dance[0]));
    pos = lerp3([0, 2.6, 6.0], [-0.7, 2.3, 5.3], k2); pos[1] += 0.25 * (1 - k); look = lerp3([0.2, 1.3, -1.6], [0.9, 1.3, -2.4], k2); }
  const [sx, sy, sz] = shake(t, ev.boom, 0.35, 0.7);
  shoot([pos[0] + sx, pos[1] + sy, pos[2] + sz], look, 52);

  // TNT: lit fuse, white flashing faster and faster, swelling, then gone
  const lit = t >= ev.light && t < ev.boom;
  tnt.group.visible = t < ev.boom;
  tnt.spark.visible = lit; tnt.spark.position.y = 1.24 + (lit ? Math.sin(t * 40) * 0.02 : 0);
  const rate = lit ? lerp(2, 9, prog(t, ev.light, ev.boom - ev.light)) : 0;
  const flash = lit ? (Math.sin((t - ev.light) * rate * Math.PI * 2) > 0 ? 0.55 : 0) : 0;
  for (const m of tnt.mats) m.emissiveIntensity = flash;
  const sw = t >= ev.swell ? 1 + 0.22 * ease.in(prog(t, ev.swell, ev.boom - ev.swell)) : 1;
  tnt.box.scale.setScalar(sw); tnt.box.position.y = 0.5 * sw;
  smoke.update(t - ev.boom, { x: 0, y: 0.6, z: -0.75 });
  boomLight.intensity = t >= ev.boom ? 40 * Math.exp(-(t - ev.boom) * 8) : 0;
  torch.group.visible = t < ev.boom;

  // lockers rattle after the boom
  LK.lockers.forEach((m, i) => { const k = t >= ev.boom ? Math.exp(-(t - ev.boom) * 3) : 0; m.rotation.z = Math.sin((t - ev.boom) * 30 + i) * 0.05 * k; });

  // the three KSV players
  crew.forEach((c, i) => {
    const p = c.p, ph = i * 1.3;
    p.setSoot(t >= ev.boom);
    let pose = { ...idle(t, ph) };
    // look at the TNT, at each other, at the camera
    const toTnt = { headPitch: 0.35, headYaw: 0 };
    if (t < ev.lookEach) pose = { ...pose, ...toTnt };
    else if (t < ev.lookCam) pose = { ...pose, headPitch: 0.05, headYaw: [0.7, -0.9, 0.9][i] * ease.out(prog(t, ev.lookEach, 0.15)) };
    else if (t < ev.boom) pose = { ...pose, headPitch: -0.05, headYaw: -c.yaw * ease.out(prog(t, ev.lookCam, 0.12)) };
    if (i === 0 && t < ev.boom) { // the one with the torch lights the fuse
      const bend = t < ev.light ? ease.inOut(prog(t, S.locker[0] + BEAT, ev.light - S.locker[0] - BEAT)) : 1 - ease.out(prog(t, ev.light + BEAT * 0.3, 0.4));
      pose = { ...pose, sneak: 0.7 * bend, armR: lerp(-0.9, -1.25, bend) };
    }
    // the boom: flat on the back (bounce), then sit up / stand up
    if (t >= ev.boom) {
      const down = bounce(clamp((t - ev.boom - i * 0.04) / 0.45));
      const upAt = ev.standUp + i * 0.15, sitting = i === 1 && t >= ev.sitUp && t < upAt;
      let fall = down;
      if (sitting) fall = lerp(1, 0.45, ease.out(prog(t, ev.sitUp, 0.25)));
      if (t >= upAt) fall = (i === 1 ? 0.45 : 1) * (1 - ease.out(prog(t, upAt, 0.35)));
      const hop = t >= upAt ? Math.max(0, Math.sin(prog(t, upAt, 0.4) * Math.PI)) * 0.3 : 0;
      pose = { ...pose, fall, armRz: lerp(0.06, 1.1, fall), armLz: lerp(-0.06, -1.1, fall), legR: -0.2 * fall, legL: 0.15 * fall, headPitch: 0, headYaw: 0, bob: hop };
      // crouch dance: sneak spam on 8th notes, arms pumping on the beat
      const [d0, d1] = ev.dance;
      if (t >= d0 && t < d1) {
        const step = Math.floor((t - d0) / (BEAT / 2) + i * 0.5);
        const sn = step % 2 ? 1 : 0, u = ((t - d0) / (BEAT / 2) + i * 0.5) % 1;
        const sneak = sn ? Math.min(1, u * 6) : Math.max(0, 1 - u * 6);
        const pump = Math.abs(Math.sin((t - d0) / BEAT * Math.PI + i));
        pose = { ...pose, sneak, armR: -2.6 * pump, armL: -2.6 * (1 - pump), armRz: 0.2, armLz: -0.2, headYaw: Math.sin(t * 3 + i) * 0.2 };
        if (i === 0 && t >= ev.wave && t < ev.wave + BEAT * 2.5) { // waves at the FC Hellas player
          pose = { ...pose, sneak: 0, headYaw: -0.7, armR: -2.9, armRz: 0.35 + Math.sin((t - ev.wave) * 14) * 0.35, armL: 0 };
        }
      }
    }
    p.pose(pose);
  });
  // cough: a small puff out of the one who sat up
  cough.update(t - (ev.sitUp + BEAT * 0.6), { x: crew[1].pos[0] + 0.25, y: 1.0, z: crew[1].pos[1] + 0.7 });
  cough.mesh.scale.setScalar(0.45);

  // FC Hellas player peeks through the door with a small rain cloud, shrugs, claps (fair play); the cloud clears
  const doorX = LK.doorX;
  const inK = ease.out(prog(t, ev.peek, 0.45));
  pH.root.visible = t >= ev.peek - 0.1;
  pH.root.position.set(lerp(doorX + 1.6, doorX + 0.15, inK), 0, -6.3);
  pH.root.rotation.y = -0.35;
  let hp = { ...idle(t, 2), lean: -0.18 * inK, headYaw: 0.2 };
  if (t >= ev.shrug && t < ev.shrug + BEAT * 1.2) { const s = Math.sin(prog(t, ev.shrug, BEAT * 1.2) * Math.PI); hp = { ...hp, armRz: 0.06 + 0.7 * s, armLz: -0.06 - 0.7 * s, armR: -0.4 * s, armL: -0.4 * s, headPitch: 0.15 * s }; }
  for (const c of ev.claps) if (t >= c - 0.12 && t < c + 0.15) { const s = 1 - Math.abs(t - c) / 0.15; hp = { ...hp, armR: -1.3, armL: -1.3, armRz: -0.42 * s + 0.2, armLz: 0.42 * s - 0.2 }; }
  pH.pose(hp);
  cloud.update(t);
  const clear = ease.in(prog(t, ev.claps[1] + 0.2, 0.4));
  cloud.group.scale.setScalar(Math.max(0.0001, 1 - clear));

  renderPass.scene = LK.scene;
  bloom.strength = 0.45; bloom.threshold = 0.9; renderer.toneMappingExposure = 1.05;
}

// ------------------------------------------------------------------ 6: SIEG! card over the lit stadium
function sceneFinal(t) {
  const k = ease.out(prog(t, S.final[0], S.final[1] - S.final[0]));
  shoot([lerp(25, 20, k), lerp(3.4, 4.4, k), 0], [-24, lerp(3.2, 4.0, k), 0], 62);
  ST.banks.forEach((m) => { m.emissiveIntensity = 2.2; });
  ST.towers.forEach((tw) => { tw.headMat.emissiveIntensity = 3; tw.spot.intensity = 5500; tw.beam.material.opacity = 0.022; });
  ST.key.intensity = 650; ST.hemi.intensity = 0.8;
  driftParticles(ST.dust, t, 0.15); ST.dust.material.opacity = 0.8;
  renderPass.scene = ST.scene;
  bloom.strength = 0.6; bloom.threshold = 0.9; renderer.toneMappingExposure = 1.0;
}

// ------------------------------------------------------------------ frame
window.renderAt = (t) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  if (t < ev.wipe1) sceneMission(t);
  else if (t < ev.flash) sceneLocker(t);
  else sceneFinal(t);
  composer.render();
  ctx.drawImage(renderer.domElement, 0, 0);

  UI.vignette(ctx, t < ev.wipe1 ? 0.75 : 0.5);
  if (t < ev.wipe1) {
    const [sx, sy] = shake(t, ev.stamp, 14, 0.3); // the stamp shakes the window
    ctx.save(); ctx.translate(sx, sy);
    UI.drawMission(ctx, t, icons, { opp });
    UI.drawStamp(ctx, t);
    ctx.restore();
  }
  if (t >= ev.boom && t < ev.flash) UI.drawPlusPoints(ctx, t);
  if (t >= ev.flash) UI.drawVictory(ctx, t, { ksv, opp });

  UI.blockWipe(ctx, t, ev.wipe1);
  UI.fill(ctx, '#ffffff', t >= ev.boom ? 0.95 * (1 - prog(t, ev.boom, 0.4)) : 0);
  UI.fill(ctx, '#ffffff', t >= ev.flash ? 0.9 * (1 - prog(t, ev.flash, 0.4)) : 0);
  UI.fill(ctx, '#000000', 1 - prog(t, ev.fadeIn[0], ev.fadeIn[1]));
  return out.toDataURL('image/png');
};

window.READY = true;
