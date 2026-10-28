# KSV Trenk · 3D voxel najava utakmice (TSV Leitershofen 2 - KSV Trenk)

Instagram Reel (9:16, 1080×1920, 30 fps, 20 s, 90 BPM) u stilu igre od kocaka. Svaki kadar je 3D scena (Three.js) renderirana u pregledniku, a cijela glazba i svi zvučni efekti sintetizirani su u kodu. Slika i zvuk čitaju isti vremenski raspored (`score.js`), pa su uvijek usklađeni.

## Scene
Tekst u videu je na njemačkom.

| vrijeme | scena |
|---|---|
| 0–2,7 s | grb KSV Trenka u svlačionici i naslov KSV TRENK / AUGSBURG |
| 2,7–8 s | igrač u dresu KSV-a, inventar (dres, kopačke, boca, lopta), tooltip „Fußball” |
| 8–12 s | NEUE MISSION · GEGNER: TSV LEITERSHOFEN 2 · ZIEL: 3 PUNKTE · Mission angenommen |
| 12–16 s | reflektori se pale, igrač TSV Leitershofena (žuti dres, crne hlačice) izlazi iz tunela, otkriva se grb |
| 16–20 s | najava: grbovi, VS, TSV Leitershofen 2 - KSV Trenk · 01.11.2026 · 12:00 Uhr · Bergstraße 20, 86391 Stadtbergen |

Dresovi su izrađeni prema stvarnim dresovima klubova. Sponzori (SF Innenausbau, EL Erhardt+Leimer) su samo pikselni natpisi, a ne originalni logotipi.

## Gotov video
- `video/ksv-leitershofen-reel.mp4`: aktualni Reel (H.264 + AAC, 1080×1920, 20 s, −14 LUFS)
- `video/ksv-hellas-reel.mp4`: prethodna najava (KSV Trenk - FC Hellas, hrvatski)
- `video/ksv-sieg-3-punkte.mp4`: video pobjede (KSV Trenk - FC Hellas)
- `video/ksv-gta-reel.mp4`: najava u stilu igre iz 2000-ih (TSV Leitershofen 2 - KSV Trenk)
- `video/naslovnica-*.png`: naslovnice (završni kadar)

## Drugi video: pobjeda „3 PUNKTE” (KSV Trenk - FC Hellas)
Kratki smiješni Reel (~19 s, 100 BPM, njemački) za objavu nakon pobjede:
- prozor misije dobije pečat **ERFÜLLT!**;
- u svlačionici igrači pale TNT, svi popadaju čađavih lica, a iz dima izleti **+3 PUNKTE** s XP kuglicama;
- slijedi čučanj-ples, a igrač FC Hellasa s kišnim oblačićem proviri na vrata, slegne ramenima i zapljeska (fair play);
- na kraju dolazi kartica **SIEG!**.

Datoteke: `score-win.js`, `song-win.js`, `index-win.html`, `src/film-win.js` (koristi isti svijet, likove i UI).

```bash
node song-win.js                       # -> out/music-win.wav
node render.js --film win --preview    # kontakt-list
node render.js --film win              # -> out/ksv-sieg-3-punkte.mp4
```

## Treći video: najava u stilu igre iz 2000-ih (`--film gta`)
Najava (~20 s, 90 BPM) u stilu tadašnjih igara otvorenog svijeta: izbornik prema snimci iz igre (gotički naslov, odrezana slika u kutu s brdom i natpisom TRENK, stavke, zvjezdasti križ), učitavanje, pa niski auto dolazi pred stadion u zlatnom satu i staje. Lik u KSV dresu izađe, zalupi vrata i napravi par koraka, a zatim slijedi kartica utakmice. Glazba je originalna G-funk podloga koja svira kao iz radija u autu: prigušena dok su vrata zatvorena, otvorena dok su otvorena, a punim zvukom svira na kartici. Izbornik je na engleskom, sve ostalo na njemačkom.

Datoteke: `score-gta.js`, `song-gta.js`, `index-gta.html`, `src/film-gta.js`, `src/world-gta.js`, `src/hud-gta.js`, `src/font-gta.js`. Fontovi su UnifrakturMaguntia i Michroma (OFL, Fontsource). Lik, auto, scena i HUD nacrtani su kodom; ne koriste se logo, fontovi, modeli ni glazba iz igre.

**Za drugu utakmicu** mijenja se samo blok `MATCH` u `score-gta.js` (domaći i gostujući klub, grbovi, datum, vrijeme, adresa).

```bash
node song-gta.js                       # -> out/music-gta.wav
node render.js --film gta --preview    # kontakt-list
node render.js --film gta              # -> out/ksv-gta-reel.mp4
```

## Pokretanje
Potrebno: Node 22+, ffmpeg, Playwright s Chromiumom.

```bash
npm install
node song.js                # glazba -> out/music.wav (-14 LUFS)
node render.js --preview    # kontakt-list ključnih kadrova -> out/pregled.png
node render.js --still 12.5 # jedan kadar
node render.js              # cijeli video -> out/<NAME>.mp4 (NAME u score.js)
```

## Gdje se što mijenja
- **Tekstovi, datum, vrijeme i mjesto:** `TEXT` u `score.js`
- **Vrijeme događaja:** `ev` u `score.js` (u dobama; tempo se mijenja preko `BPM`)
- **Dresovi:** `KITS` u `src/world.js`
- **Grbovi:** `assets/` (koriste se originalni, samo uniformno skalirani; TSV grbu je crna pozadina uklonjena maskom)

Audio engine (`engine/`) preuzet je iz skilla animation-studio, pod MIT licencom (`engine/LICENSE`). Sve teksture, ikone, likovi i pikselni font nacrtani su u kodu. Ne koriste se Mojangove teksture ni logotipi.
