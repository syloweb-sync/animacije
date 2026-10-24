// THE SCORE — victory film "3 PUNKTE" (KSV Trenk - FC Hellas). Read by film-win.js and song-win.js.
// Field names that the shared UI uses (ev.mission*, ev.wipe2, TEXT.mission) keep their meaning.
(function (root) {
  const W = 1080, H = 1920, FPS = 30;
  const BPM = 100, BEAT = 60 / BPM, BAR = BEAT * 4; // 1 beat = 0.6 s
  const b = (n) => n * BEAT;
  const DURATION = b(32);                           // 19.2 s

  const S = {
    mission: [0, b(5)],      // 1: misija -> ERFÜLLT!
    locker: [b(5), b(22)],   // 2-5: TNT, bum, +3 PUNKTE, ples
    final: [b(22), b(32)],   // 6: SIEG! kartica
  };

  const ev = {
    fadeIn: [0, 0.35],
    // the mission window is already open and filled in when the film starts
    missionOpen: -1, missionTitle: -10, missionOpp: -10, missionGoal: -10, missionAccept: Infinity,
    stamp: b(2.5),           // ERFÜLLT! slams onto the objective
    wipe1: b(5),             // block wipe into the locker room
    wipe2: b(5),             // (shared UI) the mission window disappears here
    light: b(6.5),           // torch touches the fuse
    lookEach: b(8),          // players look at each other ...
    lookCam: b(9),           // ... then at the camera
    swell: b(9.6),           // TNT swells
    boom: b(10),             // BUM
    plus: b(10.5),           // +3 PUNKTE rises out of the smoke
    dings: [b(11), b(11.5), b(12)],
    sitUp: b(13),            // first player sits up, coughs
    standUp: b(14),          // everybody back on their feet
    dance: [b(14.5), b(21.5)],
    peek: b(17),             // FC Hellas player peeks through the door
    shrug: b(18.5),
    claps: [b(19.5), b(20)],
    wave: b(19),
    flash: b(22),            // to the victory card
    fin: { sieg: b(22.25), ksv: b(23), opp: b(23.5), plus: b(24), line1: b(25), line2: b(25.5) },
    end: b(28),
  };

  const TEXT = {
    tooltip: '',
    mission: { title: 'NEUE MISSION', oppLabel: 'GEGNER:', opp: 'FC HELLAS', goal: 'ZIEL: 3 PUNKTE', accept: '' },
    stamp: 'ERFÜLLT!',
    plus: '+3 PUNKTE',
    sieg: 'SIEG!',
    match: 'KSV Trenk - FC Hellas',
    thanks: 'Danke für eure Unterstützung!',
  };
  const NAME = 'ksv-sieg-3-punkte', MUSIC = 'music-win.wav';

  const previewTimes = [b(1), b(3), b(6.6), b(8.5), b(9.5), b(10.2), b(10.8), b(11.7), b(13.4), b(15), b(17.8), b(18.8), b(19.6), b(21), b(23.2), b(26), b(30)];

  const SCORE = { W, H, FPS, DURATION, BPM, BEAT, BAR, b, S, ev, TEXT, NAME, MUSIC, previewTimes };
  if (typeof module !== 'undefined' && module.exports) module.exports = SCORE;
  else root.SCORE = SCORE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
