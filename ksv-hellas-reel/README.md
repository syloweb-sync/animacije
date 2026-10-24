# KSV Trenk – FC Hellas · 3D voxel najava utakmice

Instagram Reel (9:16, 1080×1920, 30 fps, 20 s, 90 BPM) u stilu igre od kocaka. Svaki kadar je 3D scena (Three.js) renderirana u pregledniku, a cijela glazba i svi zvučni efekti sintetizirani su u kodu. Slika i zvuk čitaju isti vremenski raspored (`score.js`), pa su uvijek usklađeni.

## Scene
| vrijeme | scena |
|---|---|
| 0–2,7 s | KSV Trenk grb u svlačionici + naslov KSV TRENK / AUGSBURG |
| 2,7–8 s | igrač u dresu KSV-a, inventar (dres, kopačke, boca, lopta), odabire loptu |
| 8–12 s | NOVA MISIJA · PROTIVNIK: FC HELLAS · CILJ: 3 BODA · Misija prihvaćena ✓ |
| 12–16 s | reflektori se pale, igrač FC Hellasa izlazi iz tunela, otkriva se njihov grb |
| 16–20 s | najava: grbovi, VS, KSV Trenk - FC Hellas · 25.10.2026. · 14:30 · Duga Arena, Augsburg |

Dresovi su izrađeni prema stvarnim dresovima klubova. Sponzori (SF Innenausbau, GYROLAND) su samo pikselni natpisi, a ne originalni logotipi.

## Gotov video
- `video/ksv-hellas-reel.mp4`: Reel (H.264 + AAC, 1080×1920, 20 s, −14 LUFS)
- `video/naslovnica.png`: naslovnica (završni kadar)

## Pokretanje
Potrebno: Node 22+, ffmpeg, Playwright s Chromiumom.

```bash
npm install
node song.js                # glazba -> out/music.wav (-14 LUFS)
node render.js --preview    # kontakt-list ključnih kadrova -> out/pregled.png
node render.js --still 12.5 # jedan kadar
node render.js              # cijeli video -> out/ksv-hellas-reel.mp4
```

## Gdje se što mijenja
- **Tekstovi, datum, vrijeme i mjesto:** `TEXT` u `score.js`
- **Vrijeme događaja:** `ev` u `score.js` (u dobama; tempo se mijenja preko `BPM`)
- **Dresovi:** `KITS` u `src/world.js`
- **Grbovi:** `assets/` (koriste se originalni, samo uniformno skalirani)

Audio engine (`engine/`) preuzet je iz skilla animation-studio, pod MIT licencom (`engine/LICENSE`). Sve teksture, ikone, likovi i pikselni font nacrtani su u kodu. Ne koriste se Mojangove teksture ni logotipi.
