// THE SONG — victory film "3 PUNKTE": everything synthesised from score-win.js -> out/music-win.wav (-14 LUFS).
// dark mission pulse -> stamp + jingle -> sneaky pizzicato, fuse hiss, the comic pause -> BOOM + ear ring
// -> XP dings + level-up -> bouncy D major dance -> SIEG! anthem and a held chord.
const path = require('path');
const fs = require('fs');
const { SR, Bus, Pink, SVF, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const { m, mtof } = require('./engine/music');
const SC = require('./score-win');
const { ev, S, BEAT, DURATION, b } = SC;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), lead = bus(), brass = bus(), fx = bus(), amb = bus();
const verb = bus(), dly = bus();
const notes = (s) => s.split(' ').map(m);
const stereo = (bs, x, t, g) => bs.addStereo(x.L, x.R, t, g);
const beats = (b0, b1, step, fn) => { for (let k = b0; k < b1 - 1e-6; k += step) fn(b(k), k); };
const buf = (sec) => new Float32Array(Math.max(1, Math.ceil(sec * SR)));

// ---------------------------------------------------------------- harmony (beats)
const CH = [
  [0, 2.5, 'G2 Bb2 D3 G3', 'G1'], [2.5, 5, 'D3 F#3 A3 D4', 'D2'],          // mission -> ERFÜLLT!
  [5, 9, 'D3 F3 A3', 'D2'],                                                 // sneaky locker room (thin); the stare is music-free
  [14, 16, 'D3 F#3 A3 D4', 'D2'], [16, 18, 'G2 B2 D3 G3', 'G1'],            // dance
  [18, 20, 'A2 C#3 E3 A3', 'A1'], [20, 22, 'D3 F#3 A3 D4', 'D2'],
  [22, 24, 'D3 F#3 A3 D4', 'D2'], [24, 26, 'G2 B2 D3 G3', 'G1'],            // SIEG!
  [26, 27, 'A2 C#3 E3 A3', 'A1'], [27, 32, 'D3 F#3 A3 D4 F#4', 'D2'],
].map(([b0, b1, ns, r]) => [b(b0), b(b1), ns, r]);
const chordAt = (t) => CH.find((c) => t >= c[0] && t < c[1]);
for (const [t0, t1, ns] of CH) {
  const fin = t0 >= ev.flash, sneaky = t0 >= ev.wipe1 && t0 < ev.boom;
  for (const n of notes(ns)) stereo(pad, I.padNote(n, t1 - t0 + (t1 >= DURATION ? 0.6 : 0.05), { cutoff: fin ? 2600 : sneaky ? 600 : 1400, attack: 0.08, release: 0.5 }), t0, sneaky ? 0.05 : 0.075);
}

// ---------------------------------------------------------------- 1: mission (dark pulse) and the stamp
beats(0, 2.5, 0.5, (t, k) => {
  const x = I.pulse(m('G3') + (Math.round(k * 2) % 4 === 2 ? 7 : 0), BEAT / 2 * 0.6, { duty: 0.125, decay: 0.1 });
  lead.addMono(x, t, 0.18, Math.round(k * 2) % 2 ? 0.25 : -0.25);
});
beats(0, 2.5, 1, (t) => drums.addMono(I.kick({ punch: 0.6 }), t, 0.45));
fx.addMono(I.thud(70, 0.22), ev.stamp, 0.8);
fx.addMono(I.thwack(), ev.stamp, 0.5);
drums.addMono(I.crash(17), ev.stamp, 0.35);
for (const n of notes('D3 A3 D4 F#4 A4')) { const x = I.brassNote(n, 0.45, { stab: true }); stereo(brass, x, ev.stamp, 0.2); stereo(verb, x, ev.stamp, 0.08); }
{ const bl = I.bell(1174.7, 0.9); keys.addMono(bl, ev.stamp + 0.05, 0.3); verb.addMono(bl, ev.stamp, 0.3); }
notes('D5 F#5 A5 D6 A5 D6 F#6').forEach((n, i) => { const x = I.pulse(n, 0.12, { duty: 0.25, decay: 0.2 }); const t = ev.stamp + BEAT + i * BEAT / 4; lead.addMono(x, t, 0.26); dly.addMono(x, t, 0.08); });
fx.addMono(I.noiseSweep(0.45, 400, 7000, { q: 0.9, pink: true, shape: (x) => x * x }), ev.wipe1 - 0.43, 0.35); // wipe
fx.addMono(I.thud(60, 0.18), ev.wipe1, 0.45);

// ---------------------------------------------------------------- 2: sneaky pizzicato, the fuse, the stare
const SNEAK = [[5, 'D3'], [5.5, 'F3'], [6, 'G3'], [6.5, 'G#3'], [7, 'A3'], [8, 'D3'], [8.5, 'F3']];
for (const [bt, n] of SNEAK) { const x = I.pizz(m(n), { seed: Math.round(bt * 4) }); keys.addMono(x, b(bt), 0.45, -0.15); verb.addMono(x, b(bt), 0.08); }
beats(5, 9, 1, (t) => bass.addMono(I.bass(m('D2'), BEAT * 0.35, { bright: 0.4 }), t, 0.4));
fx.addMono(I.woodTick(1.3), ev.light, 0.3);
// fuse: crackling hiss from the light to the boom
{
  const len = ev.boom - ev.light, x = buf(len), pk = new Pink(5), hp = new SVF();
  let seed = 7;
  for (let i = 0; i < x.length; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const crack = (seed % 900 === 0) ? 1 : 0, u = i / x.length;
    x[i] = (hp.hp(pk.next(), 5000, 0.7) * (0.35 + 0.4 * u) + crack * 0.8) * Math.min(1, i / 400);
  }
  fx.addMono(x, ev.light, 0.5, 0.05);
}
beats(7, 10, 0.5, (t) => fx.addMono(I.woodTick(1.8), t, 0.2, 0.3));          // ticking
beats(9, 10, 0.25, (t) => fx.addMono(I.woodTick(2.2), t, 0.16, -0.3));         // ... faster
for (const [t, n] of [[ev.lookEach, 'A4'], [ev.lookEach + BEAT / 2, 'C5']]) keys.addMono(I.pizz(m(n), { seed: 3 }), t, 0.4); // "huh?"
{ // swell: a rising tone into the boom
  const len = ev.boom - ev.swell, x = buf(len); let ph = 0;
  for (let i = 0; i < x.length; i++) { const u = i / x.length; ph += (200 + 1400 * u * u) / SR; x[i] = Math.sin(2 * Math.PI * ph) * 0.3 * u; }
  fx.addMono(x, ev.swell, 0.5);
}

// ---------------------------------------------------------------- 3: BOOM + ear ring
fx.addMono(I.subBoom(2.6, 70, 24), ev.boom, 1.0);
fx.addMono(I.noiseSweep(1.4, 9000, 150, { q: 0.6, pink: true, shape: (x) => Math.pow(1 - x, 2) }), ev.boom, 0.9);
drums.addMono(I.crash(23), ev.boom, 0.6);
drums.addMono(I.thwack(), ev.boom, 0.6);
drums.addMono(I.tom(55, 0.5, 9), ev.boom, 0.8);
verb.addMono(I.thwack(), ev.boom, 0.4);
{ // comic tinnitus: a thin high beep fading out
  const x = buf(1.6);
  for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = Math.sin(2 * Math.PI * 3600 * t) * 0.12 * Math.exp(-t / 0.55) * Math.min(1, t / 0.05); }
  fx.addMono(x, ev.boom + 0.12, 0.6);
}

// ---------------------------------------------------------------- 4: XP dings + level up
ev.dings.forEach((t, i) => {
  const x = I.pulse(notes('A6 C#7 E7')[i], 0.09, { duty: 0.5, decay: 0.08 }); lead.addMono(x, t, 0.35); dly.addMono(x, t, 0.12);
  const bl = I.bell(mtof(notes('A6 C#7 E7')[i]), 0.35); keys.addMono(bl, t, 0.2);
});
notes('D5 F#5 A5 D6').forEach((n, i) => { const x = I.brassNote(n, 0.22); stereo(brass, x, b(12.5) + i * BEAT / 4, 0.2); stereo(verb, x, b(12.5) + i * BEAT / 4, 0.06); });
// coughs
for (const t of [ev.sitUp + BEAT * 0.6, ev.sitUp + BEAT * 0.95]) fx.addMono(I.noiseSweep(0.12, 900, 500, { q: 2.5, pink: true }), t, 0.5);
// drum fill into the dance
for (let i = 0; i < 6; i++) drums.addMono(I.tom(140 - i * 14, 0.22, 30 + i), b(13.5) + i * BEAT / 6, 0.45, -0.4 + i * 0.16);

// ---------------------------------------------------------------- 5+6: bouncy D major dance -> SIEG!
const kicks = [];
beats(14.5, 28, 1, (t) => { drums.addMono(I.kick(), t, 0.8); kicks.push(t); });
beats(15.5, 28, 2, (t) => { drums.addMono(I.clap(), t, 0.42); verb.addMono(I.clap(), t, 0.18); });
beats(14.5, 28, 0.5, (t, k) => drums.addMono(I.hat(Math.round(k * 2) % 2 === 1, 21 + Math.round(k * 4) % 3), t + BEAT / 4, 0.12, 0.3));
for (const [t0, t1, , r] of CH.filter((c) => c[0] >= b(14) && c[0] < ev.end)) {
  for (let t = Math.max(t0, b(14.5)), i = 0; t < Math.min(t1, ev.end) - 1e-6; t += BEAT / 2, i++) bass.addMono(I.bass(m(r) + (i % 2 ? 24 : 12), BEAT / 2 * 0.6, { sub: 0.8 }), t, 0.5);
}
beats(14.5, 22, 0.5, (t) => fx.addMono(I.pop(2600, Math.round(t * 10)), t, 0.06)); // a tiny squeak per crouch
const TUNE = [[14.5, 'D5', 0.5], [15, 'F#5', 0.5], [15.5, 'A5', 0.5], [16, 'B5', 0.5], [16.5, 'A5', 0.5], [17, 'F#5', 0.5], [17.5, 'D5', 0.5],
  [18, 'E5', 0.5], [18.5, 'C#5', 0.5], [19, 'A4', 1], [20, 'D5', 0.5], [20.5, 'F#5', 0.5], [21, 'A5', 0.5], [21.5, 'D6', 0.5]];
for (const [bt, n, d] of TUNE) { const x = I.pulse(m(n), b(d) * 0.7, { duty: 0.25, decay: 0.25 }); lead.addMono(x, b(bt), 0.24, 0.1); dly.addMono(x, b(bt), 0.06); keys.addMono(I.pluck(m(n), { decay: 0.2 }), b(bt), 0.18, -0.1); }
// the shrug: a sad trombone "wah-wah"; the claps answer
[['A3', 0], ['G#3', 0.35], ['G3', 0.7]].forEach(([n, d], i) => { const x = I.brassNote(m(n), i === 2 ? 0.5 : 0.3); stereo(brass, x, ev.shrug + d, 0.14); });
for (const t of ev.claps) { fx.addMono(I.clap({ decay: 0.1, seed: 40 }), t, 0.5, 0.35); }

// SIEG! card
const F = ev.fin;
drums.addMono(I.crash(19), ev.flash, 0.5, -0.2);
fx.addMono(I.subBoom(2.2), ev.flash, 0.6);
drums.addMono(I.timpani(m('D2')), F.sieg, 0.7);
for (const n of notes('D3 A3 D4 F#4 A4')) { const x = I.brassNote(n, 0.5, { stab: true }); stereo(brass, x, F.sieg, 0.22); stereo(verb, x, F.sieg, 0.1); }
fx.addMono(I.thud(70, 0.16, 91), F.ksv, 0.45); fx.addMono(I.thud(70, 0.16, 92), F.opp, 0.45);
[F.plus, F.line1, F.line2].forEach((t, i) => { const x = I.pluck(notes('D6 F#6 A6')[i], { decay: 0.25, cutoff: 6000 }); keys.addMono(x, t, 0.3); dly.addMono(x, t, 0.1); });
const HOOK = [[22, 'D5', 1], [23, 'F#5', 0.5], [23.5, 'A5', 0.5], [24, 'B5', 0.75], [24.75, 'A5', 0.25],
  [25, 'E5', 0.25], [25.25, 'F#5', 0.25], [25.5, 'G5', 0.25], [25.75, 'A5', 0.25], [26, 'F#5', 0.5], [26.5, 'E5', 0.5], [27, 'D6', 1], [28, 'D6', 2.5]];
for (const [bt, n, d] of HOOK) {
  const t = b(bt), dur = b(d);
  const a = I.brassNote(m(n), dur * 0.95), sw = I.supersaw(m(n), dur * 0.9, { cutoff: 4200, seed: Math.round(bt * 4) });
  stereo(brass, a, t, 0.24); stereo(lead, sw, t, 0.08); stereo(verb, a, t, 0.08); stereo(dly, sw, t, 0.04);
}
drums.addMono(I.crash(22), ev.end, 0.35);
bass.addMono(I.bass808(m('D2'), b(3), { decay: 1.4 }), ev.end, 0.45);
notes('D6 A5 F#5 D5 A4').forEach((n, i) => keys.addMono(I.musicBox(n + 12), ev.end + i * 0.15, 0.12));

// ---------------------------------------------------------------- crowd: muffled in the locker room, a roar on SIEG!
{
  const pk = new Pink(7), lo = new SVF(), hi = new SVF(), pk2 = new Pink(9), lo2 = new SVF();
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    let g = 0;
    if (t >= ev.wipe1 && t < ev.flash) g = t < ev.boom ? 0.03 : 0.06;
    else if (t >= ev.flash) g = 0.55 * Math.exp(-(t - ev.flash) / 2.0) + 0.3;
    const fadeOut = Math.min(1, (DURATION - t) / 0.6), wob = 1 + 0.25 * Math.sin(t * 2.3) * Math.sin(t * 0.7);
    const cut = t < ev.flash ? 600 : 2600;
    const l = hi.hp(lo.lp(pk.next(), cut, 0.6), 250, 0.7), r = lo2.lp(pk2.next(), cut, 0.6);
    amb.L[i] += l * g * wob * fadeOut; amb.R[i] += (r * 0.7 + l * 0.3) * g * wob * fadeOut;
  }
}

// ---------------------------------------------------------------- mix + master
MIX.sidechain([pad, bass, amb], kicks, { depth: 0.35 });
const stems = { drums, bass, pad, keys, lead, brass, fx, amb, verb: reverb(verb, { room: 0.86, damp: 0.3 }), dly: pingpong(dly, BEAT * 0.75, 0.32, 4000) };
const GAIN = { drums: 0.55, bass: 0.6, pad: 2.2, keys: 1.0, lead: 0.9, brass: 1.6, fx: 0.9, amb: 0.9, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 25);
MIX.fadeOut(mix, DURATION - 0.6, DURATION);
const M = MIX.master(mix, 0.8, undefined, { lufs: -14 });
MIX.writeWav(path.join(out, SC.MUSIC), mix);
console.log(`wrote out/${SC.MUSIC} (${DURATION.toFixed(1)}s, ${M.lufs.toFixed(1)} LUFS)`);
