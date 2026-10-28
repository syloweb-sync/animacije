// THE SONG — synthesises the whole soundtrack from score.js -> out/music.wav (-14 LUFS).
// D minor game ambience -> dark pulse -> stadium build -> D major anthem on the announcement.
// All times are beats (b(n)) or events from the score, so the music follows any tempo change.
const path = require('path');
const fs = require('fs');
const { SR, Bus, Pink, SVF, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const { m } = require('./engine/music');
const SC = require('./score');
const { ev, S, BEAT, DURATION, b } = SC;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), lead = bus(), brass = bus(), fx = bus(), amb = bus();
const verb = bus(), dly = bus();
const notes = (s) => s.split(' ').map(m);
const stereo = (bs, x, t, g) => bs.addStereo(x.L, x.R, t, g);
const beats = (b0, b1, step, fn) => { for (let k = b0; k < b1 - 1e-6; k += step) fn(b(k), k); };

// ---------------------------------------------------------------- harmony (in beats)
const CH = [
  [0, 4, 'D3 F3 A3 C4 E4', 'D2'],      // intro: Dm9 under the crest
  [4, 8, 'Bb2 D3 F3 A3', 'Bb1'],       // inventory: Bbmaj7
  [8, 12, 'G2 Bb2 D3 F3', 'G1'],       //            Gm7
  [12, 14, 'G2 Bb2 D3 G3', 'G1'],      // mission:   Gm
  [14, 16, 'Bb2 D3 F3 Bb3', 'Bb1'],    //            Bb
  [16, 18, 'A2 D3 E3 A3', 'A1'],       //            Asus4
  [18, 20, 'D3 F3 A3 D4', 'D2'],       // opponent:  Dm
  [20, 21, 'Bb2 D3 F3 Bb3', 'Bb1'],    //            Bb
  [21, 22.5, 'G2 Bb2 D3 G3', 'G1'],    //            Gm (crest)
  [22.5, 24, 'A2 C#3 E3 A3', 'A1'],    //            A
  [24, 26, 'D3 F#3 A3 D4', 'D2'],      // final:     D
  [26, 27, 'G2 B2 D3 G3', 'G1'],       //            G
  [27, 28, 'A2 C#3 E3 A3', 'A1'],      //            A
  [28, 30, 'D3 F#3 A3 D4 F#4', 'D2'],  //            D (held)
].map(([b0, b1, ns, root]) => [b(b0), b(b1), ns, root]);
const chordAt = (t) => CH.find((c) => t >= c[0] && t < c[1]) || CH[CH.length - 1];

for (const [t0, t1, ns] of CH) {
  const fin = t0 >= ev.flash, dark = t0 >= S.mission[0] && t0 < S.opp[0];
  for (const n of notes(ns)) stereo(pad, I.padNote(n, t1 - t0 + (t1 >= DURATION ? 0.6 : 0.05), { cutoff: fin ? 2600 : dark ? 700 : 1300, attack: t0 === 0 ? 0.8 : 0.08, release: 0.6 }), t0, fin ? 0.07 : 0.085);
}

// ---------------------------------------------------------------- intro: the KSV Trenk title hit
fx.addMono(I.subBoom(2.4), ev.title, 0.6);
drums.addMono(I.timpani(m('D2'), { decay: 1.4 }), ev.title, 0.7);
drums.addMono(I.crash(17), ev.title, 0.28, -0.1);
for (const n of notes('D3 A3 D4 F4 A4')) { const x = I.strings(n, BEAT * 2.5, { attack: 0.05, release: 0.8, seed: n }); stereo(keys, x, ev.title, 0.1); stereo(verb, x, ev.title, 0.08); }
{ const bl = I.bell(587.3, 1.2); keys.addMono(bl, ev.title + BEAT / 2, 0.22); verb.addMono(bl, ev.title + BEAT / 2, 0.3); }

// ---------------------------------------------------------------- scene 1: music box over the locker room
const ARP = notes('D5 A4 F5 A4 E5 A4 C5 A4 D5 Bb4 F5 Bb4 A5 F5 D5 Bb4 G4 D5 Bb4 D5 F5 D5 G5 D5');
beats(0.5, 11.5, 0.5, (t, k) => {
  const x = I.musicBox(ARP[Math.round(k * 2) % ARP.length]);
  keys.addMono(x, t, 0.13, Math.round(k * 2) % 2 ? 0.3 : -0.3); verb.addMono(x, t, 0.12);
});
// each item landing in its slot plays the next note up
ev.items.forEach((it, i) => {
  const x = I.pluck(notes('A5 C6 D6 F6')[i], { decay: 0.3, cutoff: 5200 });
  keys.addMono(x, it.t, 0.35, -0.2 + i * 0.15); dly.addMono(x, it.t, 0.12);
  fx.addMono(I.pop(1500 + i * 250, 40 + i), it.t, 0.22);
});
fx.addMono(I.woodTick(1.0), ev.invOpen, 0.5); fx.addMono(I.pop(900, 51), ev.invOpen + 0.01, 0.25);
fx.addMono(I.woodTick(2.2), ev.hover, 0.18);
fx.addMono(I.woodTick(1.5), ev.pick, 0.45); fx.addMono(I.pop(2300, 52), ev.pick, 0.25);
fx.addMono(I.woodTick(1.2), ev.place, 0.45); fx.addMono(I.pop(1600, 53), ev.place, 0.25);
{ const bl = I.bell(1174.7, 0.5); keys.addMono(bl, ev.place, 0.2); verb.addMono(bl, ev.place, 0.2); }
fx.addMono(I.woodTick(0.8), ev.invClose, 0.45);
beats(9, 12, 1, (t, k) => drums.addMono(I.kick({ punch: 0.4, tail: 0.25 }), t, 0.16 + (k - 9) * 0.08)); // heartbeat creeping in

// ---------------------------------------------------------------- transitions
function whoosh(tc) {
  fx.addMono(I.noiseSweep(0.45, 400, 7000, { q: 0.9, pink: true, shape: (x) => x * x }), tc - 0.43, 0.35);
  fx.addMono(I.noiseSweep(0.4, 5000, 300, { q: 0.9, pink: true, shape: (x) => (1 - x) * (1 - x) }), tc, 0.25);
  fx.addMono(I.thud(60, 0.18), tc, 0.5);
}
whoosh(ev.wipe1);
whoosh(ev.wipe2);

// ---------------------------------------------------------------- scene 2: dark pulse + mission UI
beats(12, 18, 0.5, (t, k) => { // chiptune pulse ostinato in 8ths
  const root = m(chordAt(t)[3]) + 24, i = Math.round(k * 2);
  const x = I.pulse(i % 4 === 2 ? root + 7 : root, BEAT / 2 * 0.6, { duty: 0.125, decay: 0.11 });
  lead.addMono(x, t, 0.2, i % 2 ? 0.25 : -0.25); dly.addMono(x, t, 0.06);
});
beats(12, 18, 1, (t) => {
  drums.addMono(I.kick({ punch: 0.7 }), t, 0.55);
  bass.addMono(I.bass808(m(chordAt(t)[3]) + 12, BEAT * 0.9, { drive: 1.3, decay: 0.45 }), t, 0.32);
});
for (const t of ev.bounces) fx.addMono(I.thud(150, 0.05, 61), t, 0.5); // the ball hits the floor
fx.addMono(I.tvClick(), ev.missionOpen, 0.3);
const blips = (t0, text, seed) => {
  const scale = notes('D6 F6 G6 A6 C7');
  [...text].forEach((ch, i) => { if (ch !== ' ') fx.addMono(I.pulse(scale[(i * 7 + seed) % 5], 0.025, { duty: 0.5, decay: 0.015 }), t0 + i * 0.03, 0.12); });
};
const MT = SC.TEXT.mission;
blips(ev.missionTitle, MT.title, 1);
blips(ev.missionOpp, MT.oppLabel + ' ' + MT.opp, 2);
blips(ev.missionGoal, MT.goal, 3);
fx.addMono(I.thud(90, 0.12, 63), ev.missionOpp, 0.35);
// mission accepted: a bright major arpeggio + bell
notes('D5 F#5 A5 D6 F#6').forEach((n, i) => {
  const x = I.pulse(n, 0.14, { duty: 0.25, decay: 0.22 }); lead.addMono(x, ev.missionAccept + i * 0.07, 0.3); dly.addMono(x, ev.missionAccept + i * 0.07, 0.1);
});
{ const bl = I.bell(1174.7, 0.9); keys.addMono(bl, ev.missionAccept, 0.3); verb.addMono(bl, ev.missionAccept, 0.35); }
fx.addMono(I.noiseSweep(b(1.5), 200, 9000, { q: 1, pink: true, shape: (x) => x * x * x }), ev.wipe2 - b(1.5), 0.4); // riser

// ---------------------------------------------------------------- scene 3: lights, footsteps, build
ev.lights.forEach((t, i) => {
  drums.addMono(I.thwack(), t, 0.35, -0.45 + i * 0.3);
  drums.addMono(I.tom(70 + i * 12, 0.4, 70 + i), t, 0.6, -0.45 + i * 0.3);
  fx.addMono(I.thud(48, 0.25, 80 + i), t, 0.5);
  verb.addMono(I.tom(70 + i * 12, 0.4, 70 + i), t, 0.25);
});
for (let t = ev.walk[0]; t < ev.walk[1] - 0.01; t += BEAT) { // a footstep on every beat
  fx.addMono(I.thud(110, 0.05, Math.round(t * 10)), t, 0.4);
  fx.addMono(I.woodTick(0.55), t, 0.08);
}
const breath = ev.breath;
beats(20, 23.5, 1, (t) => drums.addMono(I.kick(), t, 0.7));
for (const t of [b(21), b(23)]) { drums.addMono(I.clap(), t, 0.45); verb.addMono(I.clap(), t, 0.25); }
beats(20, 23.5, 0.5, (t, k) => drums.addMono(I.hat(false, 11 + Math.round(k * 2) % 3), t, 0.12, 0.3));
for (let i = 0; i < 8; i++) drums.addMono(I.snare({ decay: 0.08 }), b(22.5) + i * BEAT / 8, 0.18 + i * 0.04, 0.05); // roll into the breath
beats(18, 23.5, 0.5, (t, k) => { // string ostinato
  const ns = notes(chordAt(t)[2]), i = Math.round(k * 2);
  stereo(keys, I.strings(ns[i % ns.length] + 12, BEAT / 2 * 0.9, { attack: 0.02, release: 0.12, seed: i }), t, 0.12);
});
for (const [t0, t1, , r] of CH.filter((c) => c[0] >= S.opp[0] && c[0] < S.final[0])) bass.addMono(I.bass(m(r) + 12, Math.min(t1, breath) - t0, { sub: 1 }), t0, 0.5);
// crest reveal: impact + brass chord
drums.addMono(I.crash(18), ev.crest, 0.35, 0.2);
fx.addMono(I.subBoom(1.8), ev.crest, 0.45);
for (const n of notes('G3 D4 G4 Bb4')) { const x = I.brassNote(n, BEAT * 1.4); stereo(brass, x, ev.crest, 0.22); stereo(verb, x, ev.crest, 0.08); }
fx.addMono(I.noiseSweep(b(1), 300, 10000, { q: 1.1, pink: true, shape: (x) => x * x }), breath - b(1), 0.4); // riser to the breath

// ---------------------------------------------------------------- final: D major anthem
const F = ev.fin;
drums.addMono(I.crash(19), F.ksv, 0.5, -0.2);
fx.addMono(I.subBoom(2.4), F.ksv, 0.75);
fx.addMono(I.thud(55, 0.2), F.ksv, 0.6);
fx.addMono(I.thud(70, 0.16, 91), F.opp, 0.55);
drums.addMono(I.timpani(m('D2')), F.vs, 0.8);
drums.addMono(I.thwack(), F.vs, 0.45);
drums.addMono(I.crash(20), F.vs, 0.3, 0.25);
for (const n of notes('D3 A3 D4 F#4 A4')) { const x = I.brassNote(n, 0.45, { stab: true }); stereo(brass, x, F.ksv, 0.2); stereo(brass, x, F.vs, 0.2); stereo(verb, x, F.vs, 0.1); }
[F.line1, F.line2, F.line3, F.line4].forEach((t, i) => { const x = I.pluck(notes('D6 F#6 A6 D7')[i], { decay: 0.25, cutoff: 6000 }); keys.addMono(x, t, 0.3); dly.addMono(x, t, 0.1); fx.addMono(I.pop(1800 + i * 300, 95 + i), t, 0.18); });
const kicks = [];
beats(24, 28, 1, (t) => { drums.addMono(I.kick(), t, 0.85); kicks.push(t); });
beats(25, 28, 2, (t) => { drums.addMono(I.clap(), t, 0.45); drums.addMono(I.snare(), t, 0.2); verb.addMono(I.clap(), t, 0.2); });
beats(24, 28, 0.5, (t, k) => drums.addMono(I.hat(Math.round(k * 2) % 2 === 1, 21 + Math.round(k * 4) % 3), t + BEAT / 4, 0.14, 0.3));
for (const [t0, t1, , r] of CH.filter((c) => c[0] >= S.final[0] && c[0] < ev.end)) {
  for (let t = t0, i = 0; t < Math.min(t1, ev.end) - 1e-6; t += BEAT / 2, i++) bass.addMono(I.bass(m(r) + (i % 2 ? 24 : 12), BEAT / 2 * 0.8, { sub: 0.8 }), t, 0.5);
}
bass.addMono(I.bass808(m('D2'), b(2), { decay: 1.2 }), ev.end, 0.45);
const HOOK = [[24, 'D5', 1], [25, 'F#5', 0.5], [25.5, 'A5', 0.5], [26, 'B5', 0.75], [26.75, 'A5', 0.25],
  [27, 'E5', 0.25], [27.25, 'F#5', 0.25], [27.5, 'G5', 0.25], [27.75, 'A5', 0.25], [28, 'D6', 1.75]];
for (const [bt, n, d] of HOOK) {
  const t = b(bt), dur = b(d);
  const a = I.brassNote(m(n), dur * 0.95), sw = I.supersaw(m(n), dur * 0.9, { cutoff: 4200, seed: Math.round(bt * 4) });
  stereo(brass, a, t, 0.24); stereo(lead, sw, t, 0.08); stereo(verb, a, t, 0.08); stereo(dly, sw, t, 0.04);
}
drums.addMono(I.crash(22), ev.end, 0.35, 0);
notes('D6 A5 F#5 D5 A4').forEach((n, i) => { const x = I.musicBox(n + 12); keys.addMono(x, ev.end + i * 0.15, 0.12); verb.addMono(x, ev.end + i * 0.15, 0.06); });

// ---------------------------------------------------------------- stadium crowd ambience (swells with the lights, cheers on the final)
{
  const pk = new Pink(7), lo = new SVF(), hi = new SVF(), pk2 = new Pink(9), lo2 = new SVF();
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    let g = 0;
    if (t < S.mission[0]) g = 0.05 + 0.04 * (t / S.mission[0]);           // muffled, behind the locker room wall
    else if (t < S.opp[0]) g = 0.0;
    else if (t < S.final[0]) g = 0.12 + 0.25 * Math.min(1, (t - S.opp[0]) / 1.5);
    else g = 0.5 * Math.exp(-(t - S.final[0]) / 2.0) + 0.3;               // the cheer, then a steady roar
    const fadeIn = Math.min(1, t / 0.4), fadeOut = Math.min(1, (DURATION - t) / 0.6);
    const wob = 1 + 0.25 * Math.sin(t * 2.3) * Math.sin(t * 0.7);
    const cut = t < S.mission[0] ? 600 : 2600;
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
MIX.gate(mix, breath, ev.flash, 0.01); // the held breath before the announcement hit
MIX.fadeOut(mix, DURATION - 0.6, DURATION);
const M = MIX.master(mix, 0.8, undefined, { lufs: -14 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(1)}s, ${M.lufs.toFixed(1)} LUFS)`);
