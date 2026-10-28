// THE SCORE — third film, an early-2000s open-world game look: pause-menu -> loading -> a lowrider pulls up
// at the stadium, the player gets out, shuts the door, a few steps -> match card. Read by film-gta.js and song-gta.js.
(function (root) {
  const W = 1080, H = 1920, FPS = 30;
  const BPM = 90, BEAT = 60 / BPM, BAR = BEAT * 4; // 1 beat = 0.667 s
  const b = (n) => n * BEAT;
  const DURATION = b(30);                           // 20 s

  // ---- the next match: the only block to edit for another fixture (crests go in assets/) ----
  const MATCH = {
    home: 'TSV Leitershofen 2', homeCrest: 'assets/grb-tsv-leitershofen.png',
    away: 'KSV Trenk', awayCrest: 'assets/grb-ksv-trenk.png',
    date: '01.11.2026', time: '12:00 Uhr',
    place: ['Bergstraße 20', '86391 Stadtbergen'],
  };

  const S = {
    menu: [0, b(7.5)],        // pause menu -> START NEW GAME
    loading: [b(7.5), b(9)],
    street: [b(9), b(20)],    // arrival, door, a few steps
    card: [b(20), b(30)],     // match card
  };

  const ev = {
    fadeIn: [0, 0.4],
    menuMove: b(3),           // highlight jumps MAP -> START NEW GAME
    menuSelect: b(5),         // confirm; the item blinks
    menuOut: [b(6.5), b(7.5)],
    loadBar: [b(7.6), b(8.8)],
    streetIn: [b(9), b(9.6)], // fade up from black
    carStop: b(13),           // the car comes to rest
    doorOpen: b(13.5),
    exit: [b(13.75), b(15.25)],
    turn: [b(15.25), b(15.9)],
    doorClose: [b(15.9), b(16.3)],   // slam at the end
    walk: [b(16.5), b(20)],
    stepPeriod: BEAT * 0.75,         // one footstep every 0.5 s
    zone: [b(10.5), b(15)],          // AUGSBURG zone title
    hud: [b(9.5), b(20)],
    card: b(20),
    bars: [b(20), b(20.6)],
    fin: { title: b(20.5), home: b(21.5), away: b(22), vs: b(22.5), line1: b(23.5), line2: b(24), line3: b(24.5) },
    end: b(28),
  };

  // the car: drives in along +x and eases to a stop at x = 0 (shared so engine sound follows the picture)
  const CAR = { x0: -32, stopX: 0, lane: -2 };
  const carX = (t) => {
    const [t0, t1] = [S.street[0] - 0.2, ev.carStop];
    if (t >= t1) return CAR.stopX;
    if (t <= t0) return CAR.x0;
    const u = (t - t0) / (t1 - t0);
    return CAR.x0 + (CAR.stopX - CAR.x0) * (1 - (1 - u) * (1 - u)); // constant deceleration
  };
  const carSpeed = (t) => (carX(t + 0.005) - carX(t - 0.005)) / 0.01;

  const TEXT = {
    menuTitle: 'Pause Menu',
    menu: ['RESUME', 'START NEW GAME', 'MAP', 'STATS', 'BRIEF', 'OPTIONS', 'QUIT GAME'],
    zone: 'Augsburg',
    cardTitle: 'Nächstes Spiel',
    clock: '19:42',
    money: 350,
  };
  const NAME = 'ksv-gta-reel', MUSIC = 'music-gta.wav';

  const previewTimes = [0.6, 2.5, 4.0, 5.4, 6.4, 7.3, 8.3, 9.2, 9.8, 10.5, 11.0, 11.8, 12.8, 14.2, 16.0, 19.0];

  const SCORE = { W, H, FPS, DURATION, BPM, BEAT, BAR, b, S, ev, CAR, carX, carSpeed, MATCH, TEXT, NAME, MUSIC, previewTimes };
  if (typeof module !== 'undefined' && module.exports) module.exports = SCORE;
  else root.SCORE = SCORE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
