// THE SONG — synthesises the whole soundtrack from score.js -> out/music.wav (-14 LUFS).
// D minor game ambience -> dark pulse -> stadium build -> D major anthem on the announcement.
const path = require('path');
const fs = require('fs');
const { SR, Bus, Pink, SVF, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const { m } = require('./engine/music');
const SC = require('./score');
const { ev, BEAT, DURATION } = SC;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), lead = bus(), brass = bus(), fx = bus(), amb = bus();
const verb = bus(), dly = bus();
const notes = (s) => s.split(' ').map(m);
const stereo = (b, x, t, g) => b.addStereo(x.L, x.R, t, g);

// ---------------------------------------------------------------- harmony
const CH = [
  [0, 2, 'D3 F3 A3 C4 E4', 'D2'],      // scene 1: Dm9
  [2, 4, 'Bb2 D3 F3 A3', 'Bb1'],       //          Bbmaj7
  [4, 5, 'G2 Bb2 D3 G3', 'G1'],        // scene 2: Gm
  [5, 6, 'Bb2 D3 F3 Bb3', 'Bb1'],      //          Bb
  [6, 7, 'A2 D3 E3 A3', 'A1'],         //          Asus4
  [7, 8, 'D3 F3 A3 D4', 'D2'],         // scene 3: Dm
  [8, 9, 'Bb2 D3 F3 Bb3', 'Bb1'],      //          Bb
  [9, 10, 'G2 Bb2 D3 G3', 'G1'],       //          Gm (crest)
  [10, 11, 'A2 C#3 E3 A3', 'A1'],      //          A
  [11, 12, 'D3 F#3 A3 D4', 'D2'],      // final:   D
  [12, 13, 'G2 B2 D3 G3', 'G1'],       //          G
  [13, 14, 'A2 C#3 E3 A3', 'A1'],      //          A
  [14, 15, 'D3 F#3 A3 D4 F#4', 'D2'],  //          D (held)
];
const chordAt = (t) => CH.find((c) => t >= c[0] && t < c[1]);

// pads under everything (quiet in the build, open on the final)
for (const [t0, t1, ns] of CH) {
  const fin = t0 >= 11, dark = t0 >= 4 && t0 < 7;
  for (const n of notes(ns)) stereo(pad, I.padNote(n, t1 - t0 + (t0 === 14 ? 0.6 : 0.05), { cutoff: fin ? 2600 : dark ? 700 : 1300, attack: t0 === 0 ? 0.6 : 0.08, release: 0.5 }), t0, fin ? 0.07 : 0.085);
}

// ---------------------------------------------------------------- scene 1: music box over the locker room
const ARP = notes('D5 A4 F5 A4 E5 A4 C5 A4 D5 Bb4 F5 Bb4 A5 F5 D5 Bb4');
for (let i = 0; i < 14; i++) {
  const t = 0.5 + i * BEAT / 2;
  if (t >= ev.invClose) break;
  const x = I.musicBox(ARP[i % ARP.length] + (t >= 2 ? -2 + (ARP[i % ARP.length] % 2) : 0));
  keys.addMono(x, t, 0.14, i % 2 ? 0.3 : -0.3); verb.addMono(x, t, 0.12);
}
// each item landing in its slot plays the next note up
ev.items.forEach((it, i) => {
  const x = I.pluck(notes('A5 C6 D6 F6')[i], { decay: 0.25, cutoff: 5200 });
  keys.addMono(x, it.t, 0.35, -0.2 + i * 0.15); dly.addMono(x, it.t, 0.12);
  fx.addMono(I.pop(1500 + i * 250, 40 + i), it.t, 0.22);
});
fx.addMono(I.woodTick(1.0), ev.invOpen, 0.5); fx.addMono(I.pop(900, 51), ev.invOpen + 0.01, 0.25);
fx.addMono(I.woodTick(2.2), ev.hover, 0.18);
fx.addMono(I.woodTick(1.5), ev.pick, 0.45); fx.addMono(I.pop(2300, 52), ev.pick, 0.25);
fx.addMono(I.woodTick(1.2), ev.place, 0.45); fx.addMono(I.pop(1600, 53), ev.place, 0.25);
{ const b = I.bell(1174.7, 0.5); keys.addMono(b, ev.place, 0.2); verb.addMono(b, ev.place, 0.2); }
fx.addMono(I.woodTick(0.8), ev.invClose, 0.45);
// soft heartbeat creeping in under the end of scene 1
for (const t of [2.0, 2.5, 3.0, 3.5]) drums.addMono(I.kick({ punch: 0.4, tail: 0.25 }), t, 0.18 + (t - 2) * 0.08);

// ---------------------------------------------------------------- transitions
function whoosh(tc) {
  fx.addMono(I.noiseSweep(0.4, 400, 7000, { q: 0.9, pink: true, shape: (x) => x * x }), tc - 0.38, 0.35);
  fx.addMono(I.noiseSweep(0.35, 5000, 300, { q: 0.9, pink: true, shape: (x) => (1 - x) * (1 - x) }), tc, 0.25);
  fx.addMono(I.thud(60, 0.18), tc, 0.5);
}
whoosh(ev.wipe1);
whoosh(ev.wipe2);

// ---------------------------------------------------------------- scene 2: dark pulse + mission UI
for (let i = 0; i < 24; i++) { // chiptune pulse ostinato in 8ths
  const t = ev.wipe1 + i * BEAT / 2;
  if (t >= ev.wipe2 - 0.05) break;
  const c = chordAt(t), root = m(c[3]) + 24;
  const x = I.pulse(i % 4 === 2 ? root + 7 : root, BEAT / 2 * 0.6, { duty: 0.125, decay: 0.09 });
  lead.addMono(x, t, 0.2, i % 2 ? 0.25 : -0.25); dly.addMono(x, t, 0.06);
}
for (let t = ev.wipe1; t < ev.wipe2 - 0.01; t += BEAT) {
  drums.addMono(I.kick({ punch: 0.7 }), t, 0.55);
  bass.addMono(I.bass808(m(chordAt(t)[3]) + 12, BEAT * 0.9, { drive: 1.3, decay: 0.4 }), t, 0.32);
}
for (const t of ev.bounces) fx.addMono(I.thud(150, 0.05, 61), t, 0.5); // the ball hits the floor
fx.addMono(I.tvClick(), ev.missionOpen, 0.3);
const blips = (t0, text, seed) => {
  const scale = notes('D6 F6 G6 A6 C7');
  [...text].forEach((ch, i) => { if (ch !== ' ') fx.addMono(I.pulse(scale[(i * 7 + seed) % 5], 0.025, { duty: 0.5, decay: 0.015 }), t0 + i * 0.03, 0.12); });
};
blips(ev.missionTitle, SC.TEXT.mission[0], 1);
blips(ev.missionGoal, SC.TEXT.mission[1], 3);
// mission accepted: a bright major arpeggio + bell
notes('D5 F#5 A5 D6 F#6').forEach((n, i) => {
  const x = I.pulse(n, 0.12, { duty: 0.25, decay: 0.2 }); lead.addMono(x, ev.missionAccept + i * 0.06, 0.3); dly.addMono(x, ev.missionAccept + i * 0.06, 0.1);
});
{ const b = I.bell(1174.7, 0.9); keys.addMono(b, ev.missionAccept, 0.3); verb.addMono(b, ev.missionAccept, 0.35); }
fx.addMono(I.noiseSweep(1.0, 200, 9000, { q: 1, pink: true, shape: (x) => x * x * x }), ev.wipe2 - 1.0, 0.4); // riser

// ---------------------------------------------------------------- scene 3: lights, footsteps, build
ev.lights.forEach((t, i) => {
  drums.addMono(I.thwack(), t, 0.35, -0.45 + i * 0.3);
  drums.addMono(I.tom(70 + i * 12, 0.35, 70 + i), t, 0.6, -0.45 + i * 0.3);
  fx.addMono(I.thud(48, 0.25, 80 + i), t, 0.5);
  verb.addMono(I.tom(70 + i * 12, 0.35, 70 + i), t, 0.25);
});
for (let t = ev.walk[0]; t < ev.walk[1] - 0.01; t += BEAT) { // a footstep on every beat
  fx.addMono(I.thud(110, 0.045, Math.round(t * 10)), t, 0.4);
  fx.addMono(I.woodTick(0.55), t, 0.08);
}
for (let t = 8.0; t < 10.75; t += BEAT) drums.addMono(I.kick(), t, 0.7);
for (const t of [8.5, 9.5]) { drums.addMono(I.clap(), t, 0.45); verb.addMono(I.clap(), t, 0.25); }
for (let t = 8.0; t < 10.75; t += BEAT / 2) drums.addMono(I.hat(false, 11 + Math.round(t * 4) % 3), t, 0.12, 0.3);
for (let i = 0; i < 8; i++) drums.addMono(I.snare({ decay: 0.08 }), 10.0 + i * BEAT / 4 * (i < 4 ? 1 : 0.75) + (i >= 4 ? 0.125 : 0), 0.18 + i * 0.04, 0.05); // roll into the breath
for (let i = 0; i < 28; i++) { // string ostinato
  const t = 7.0 + i * BEAT / 4 * 2;
  if (t >= 10.75) break;
  const c = chordAt(t), ns = notes(c[2]);
  stereo(keys, I.strings(ns[i % ns.length] + 12, BEAT / 2 * 0.9, { attack: 0.02, release: 0.1, seed: i }), t, 0.12);
}
for (const [t0, t1, , b] of CH.filter((c) => c[0] >= 7 && c[0] < 11)) bass.addMono(I.bass(m(b) + 12, Math.min(t1, 10.75) - t0, { sub: 1 }), t0, 0.5);
// crest reveal: impact + brass chord
drums.addMono(I.crash(18), ev.crest, 0.35, 0.2);
fx.addMono(I.subBoom(1.6), ev.crest, 0.45);
for (const n of notes('G3 D4 G4 Bb4')) { const x = I.brassNote(n, 0.9); stereo(brass, x, ev.crest, 0.22); stereo(verb, x, ev.crest, 0.08); }
fx.addMono(I.noiseSweep(0.75, 300, 10000, { q: 1.1, pink: true, shape: (x) => x * x }), 10.0, 0.4); // riser to the breath at 10.75

// ---------------------------------------------------------------- final: D major anthem
const F = ev.fin;
drums.addMono(I.crash(19), F.ksv, 0.5, -0.2);
fx.addMono(I.subBoom(2.2), F.ksv, 0.75);
fx.addMono(I.thud(55, 0.2), F.ksv, 0.6);
fx.addMono(I.thud(70, 0.16, 91), F.hellas, 0.55);
drums.addMono(I.timpani(m('D2')), F.vs, 0.8);
drums.addMono(I.thwack(), F.vs, 0.45);
drums.addMono(I.crash(20), F.vs, 0.3, 0.25);
for (const n of notes('D3 A3 D4 F#4 A4')) { const x = I.brassNote(n, 0.4, { stab: true }); stereo(brass, x, F.ksv, 0.2); stereo(brass, x, F.vs, 0.2); stereo(verb, x, F.vs, 0.1); }
[F.line1, F.line2, F.line3].forEach((t, i) => { const x = I.pluck(notes('D6 F#6 A6')[i], { decay: 0.2, cutoff: 6000 }); keys.addMono(x, t, 0.3); dly.addMono(x, t, 0.1); fx.addMono(I.pop(1800 + i * 300, 95 + i), t, 0.18); });
const kicks = [];
for (let t = F.ksv; t < 14.0; t += BEAT) { drums.addMono(I.kick(), t, 0.85); kicks.push(t); }
for (let t = F.ksv + BEAT; t < 14.0; t += BEAT * 2) { drums.addMono(I.clap(), t, 0.45); drums.addMono(I.snare(), t, 0.2); verb.addMono(I.clap(), t, 0.2); }
for (let t = F.ksv; t < 14.0; t += BEAT / 2) drums.addMono(I.hat((t * 2) % 2 > 0.9, 21 + Math.round(t * 4) % 3), t + BEAT / 4, 0.14, 0.3);
for (const [t0, t1, , b] of CH.filter((c) => c[0] >= 11)) {
  for (let t = t0; t < Math.min(t1, 14); t += BEAT / 2) bass.addMono(I.bass(m(b) + ((t * 2) % 2 > 0.9 ? 24 : 12), BEAT / 2 * 0.8, { sub: 0.8 }), t, 0.5);
}
bass.addMono(I.bass808(m('D2'), 1.0, { decay: 0.9 }), 14.0, 0.45);
const HOOK = [[11.0, 'D5', 0.5], [11.5, 'F#5', 0.25], [11.75, 'A5', 0.25], [12.0, 'B5', 0.5], [12.5, 'A5', 0.25], [12.75, 'F#5', 0.25],
  [13.0, 'E5', 0.25], [13.25, 'F#5', 0.25], [13.5, 'G5', 0.25], [13.75, 'A5', 0.25], [14.0, 'D6', 0.9]];
for (const [t, n, d] of HOOK) {
  const a = I.brassNote(m(n), d * 0.95), s = I.supersaw(m(n), d * 0.9, { cutoff: 4200, seed: Math.round(t * 4) });
  stereo(brass, a, t, 0.24); stereo(lead, s, t, 0.08); stereo(verb, a, t, 0.08); stereo(dly, s, t, 0.04);
}
drums.addMono(I.crash(22), 14.0, 0.35, 0);
for (const n of notes('D6 A5 F#5 D5 A4')) { const x = I.musicBox(n + 12); keys.addMono(x, 14.0 + (notes('D6 A5 F#5 D5 A4').indexOf(n)) * 0.12, 0.12); verb.addMono(x, 14.0, 0.06); }

// ---------------------------------------------------------------- stadium crowd ambience (swells with the lights, cheers on the final)
{
  const pk = new Pink(7), lo = new SVF(), hi = new SVF(), pk2 = new Pink(9), lo2 = new SVF();
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    let g = 0;
    if (t < 4) g = 0.05 + 0.04 * (t / 4);                          // muffled, behind the locker room wall
    else if (t < 7) g = 0.0;
    else if (t < 11) g = 0.12 + 0.25 * Math.min(1, (t - 7) / 1.2);
    else g = 0.5 * Math.exp(-(t - 11) / 1.6) + 0.3;                 // the cheer, then a steady roar
    const fadeIn = Math.min(1, t / 0.3), fadeOut = Math.min(1, (DURATION - t) / 0.4);
    const wob = 1 + 0.25 * Math.sin(t * 2.3) * Math.sin(t * 0.7);
    const cut = t < 4 ? 600 : 2600;
    const l = hi.hp(lo.lp(pk.next(), cut, 0.6), 250, 0.7), r = lo2.lp(pk2.next(), cut, 0.6);
    amb.L[i] += l * g * wob * fadeIn * fadeOut; amb.R[i] += (r * 0.7 + l * 0.3) * g * wob * fadeIn * fadeOut;
  }
}

// ---------------------------------------------------------------- mix + master
MIX.sidechain([pad, bass, amb], kicks, { depth: 0.35 });
const stems = {
  drums, bass, pad, keys, lead, brass, fx, amb,
  verb: reverb(verb, { room: 0.86, damp: 0.3 }),
  dly: pingpong(dly, BEAT * 0.75, 0.32, 4000),
};
const GAIN = { drums: 0.55, bass: 0.6, pad: 2.2, keys: 1.0, lead: 0.9, brass: 1.6, fx: 0.9, amb: 0.9, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 25);
MIX.gate(mix, 10.75, 11.0, 0.01); // the held breath before the announcement hit
MIX.fadeOut(mix, DURATION - 0.35, DURATION);
const M = MIX.master(mix, 0.8, undefined, { lufs: -14 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION}s, ${M.lufs.toFixed(1)} LUFS)`);
