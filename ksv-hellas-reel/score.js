// THE SCORE — single source of truth for timing. film.js (browser) and song.js (node) both read it,
// so every click, light and footstep lands on the same beat in picture and sound.
(function (root) {
  const W = 1080, H = 1920, FPS = 30, DURATION = 15;
  const BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4; // 1 beat = 0.5 s, 1 bar = 2 s

  // scenes (seconds)
  const S = {
    inv: [0, 4],       // 1: svlačionica + inventar
    mission: [4, 7],   // 2: nova misija
    opp: [7, 11],      // 3: protivnik izlazi iz tunela
    final: [11, 15],   // 4: najava utakmice
  };

  const ev = {
    fadeIn: [0, 0.4],
    invOpen: 0.5,
    // items drop into their slots on 8th notes (each one plays a note of the arpeggio)
    items: [
      { t: 1.0, item: 'dres', slot: 'chest' },
      { t: 1.25, item: 'kopacke', slot: 'feet' },
      { t: 1.5, item: 'boca', slot: 'hot2' },
      { t: 1.75, item: 'lopta', slot: 'inv13' },
    ],
    cursorIn: 1.9,
    hover: 2.5,        // cursor reaches the ball, tooltip
    pick: 3.0,         // click: ball on the cursor
    place: 3.5,        // click: ball into hotbar slot 1 -> player holds it
    invClose: 3.875,
    wipe1: 4.0,        // block wipe into the dark mission screen
    missionOpen: 4.5,
    missionTitle: 4.75,
    missionGoal: 5.25,
    missionAccept: 6.0,
    bounces: [4.5, 5.0, 5.5], // ball hits the floor (on the beat)
    wipe2: 7.0,
    lights: [7.0, 7.25, 7.5, 7.75], // floodlight banks clunk on
    walk: [7.5, 10.0],               // a footstep on every beat
    crest: 9.0,                      // opponent crest lights up
    flash: 11.0,
    fin: { ksv: 11.0, hellas: 11.25, vs: 11.5, line1: 11.75, line2: 12.0, line3: 12.25 },
  };

  const TEXT = {
    tooltip: 'Nogometna lopta',
    mission: ['NOVA MISIJA', 'CILJ: 3 BODA', 'Misija prihvaćena ✓'],
    match: 'KSV Trenk - FC Hellas',
    date: '25.10.2026. · 14:30',
    place: 'Duga Arena, Augsburg',
  };

  const previewTimes = [0.3, 1.2, 2.6, 3.2, 3.7, 4.3, 5.0, 6.4, 7.3, 7.9, 8.8, 9.6, 10.6, 11.3, 11.9, 13.5];

  const SCORE = { W, H, FPS, DURATION, BPM, BEAT, BAR, S, ev, TEXT, previewTimes };
  if (typeof module !== 'undefined' && module.exports) module.exports = SCORE;
  else root.SCORE = SCORE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
