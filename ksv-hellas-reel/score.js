// THE SCORE — single source of truth for timing. film.js (browser) and song.js (node) both read it,
// so every click, light and footstep lands on the same beat in picture and sound.
// Everything is placed in beats (b(n) = n beats in seconds) so the tempo can change in one line.
(function (root) {
  const W = 1080, H = 1920, FPS = 30;
  const BPM = 90, BEAT = 60 / BPM, BAR = BEAT * 4; // 1 beat = 0.667 s, 1 bar = 2.667 s
  const b = (n) => n * BEAT;
  const DURATION = b(30);                          // 20 s

  // scenes (seconds)
  const S = {
    intro: [0, b(4)],        // 0: KSV Trenk grb + naslov u svlačionici
    inv: [b(4), b(12)],      // 1: inventar
    mission: [b(12), b(18)], // 2: nova misija
    opp: [b(18), b(24)],     // 3: protivnik izlazi iz tunela
    final: [b(24), b(30)],   // 4: najava utakmice
  };

  const ev = {
    fadeIn: [0, 0.5],
    title: b(0.5),           // KSV TRENK AUGSBURG appears under the crest
    invOpen: b(4.5),
    // items drop into their slots on 8th notes (each one plays a note of the arpeggio)
    items: [
      { t: b(5.5), item: 'dres', slot: 'chest' },
      { t: b(6), item: 'kopacke', slot: 'feet' },
      { t: b(6.5), item: 'boca', slot: 'hot2' },
      { t: b(7), item: 'lopta', slot: 'inv13' },
    ],
    cursorIn: b(7.5),
    hover: b(8.5),           // cursor reaches the ball, tooltip
    pick: b(9.5),            // click: ball on the cursor
    place: b(10.5),          // click: ball into hotbar slot 1 -> player holds it
    invClose: b(11.5),
    wipe1: b(12),            // block wipe into the dark mission screen
    missionOpen: b(12.5),
    missionTitle: b(13),
    missionOpp: b(14),
    missionGoal: b(15),
    missionAccept: b(16),
    bounces: [b(13), b(14), b(15)], // ball hits the floor (on the beat)
    wipe2: b(18),
    lights: [b(18), b(18.5), b(19), b(19.5)], // floodlight banks clunk on
    walk: [b(19.5), b(22.5)],                 // a footstep on every beat
    crest: b(21),                             // opponent crest lights up
    breath: b(23.5),                          // half a beat of silence before the hit
    flash: b(24),
    fin: { ksv: b(24), hellas: b(24.5), vs: b(25), line1: b(25.5), line2: b(26), line3: b(26.5) },
    end: b(28),                               // the last chord
  };

  const TEXT = {
    title: ['KSV TRENK', 'AUGSBURG'],
    tooltip: 'Nogometna lopta',
    mission: ['NOVA MISIJA', 'PROTIVNIK: FC HELLAS', 'CILJ: 3 BODA', 'Misija prihvaćena ✓'],
    match: 'KSV Trenk - FC Hellas',
    date: '25.10.2026. · 14:30',
    place: 'Duga Arena, Augsburg',
  };

  const previewTimes = [0.3, 1.2, 2.3, 3.5, 5.0, 6.6, 7.3, 8.6, 9.6, 10.9, 12.4, 13.4, 14.3, 15.6, 16.6, 19.0];

  const SCORE = { W, H, FPS, DURATION, BPM, BEAT, BAR, b, S, ev, TEXT, previewTimes };
  if (typeof module !== 'undefined' && module.exports) module.exports = SCORE;
  else root.SCORE = SCORE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
