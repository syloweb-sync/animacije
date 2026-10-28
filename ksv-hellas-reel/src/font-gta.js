// FONTS — smooth canvas text for the game-style film: a blackletter for titles and zone names,
// a wide geometric sans for menu items and info, a condensed bold sans for HUD numbers.
// Faces are OFL fonts from Fontsource (node_modules/@fontsource), loaded with the FontFace API.
export const F = { gothic: 'UnifrakturMaguntia', wide: 'Michroma', hud: 'Liberation Sans' };

export async function loadFonts() {
  const faces = [
    new FontFace(F.gothic, 'url(/node_modules/@fontsource/unifrakturmaguntia/files/unifrakturmaguntia-latin-400-normal.woff2)'),
    new FontFace(F.wide, 'url(/node_modules/@fontsource/michroma/files/michroma-latin-400-normal.woff2)'),
    new FontFace(F.wide, 'url(/node_modules/@fontsource/michroma/files/michroma-latin-ext-400-normal.woff2)', { unicodeRange: 'U+0100-024F, U+1E00-1EFF' }),
  ];
  for (const f of faces) document.fonts.add(await f.load());
  await document.fonts.load(`700 40px "${F.hud}"`);
}

// text(ctx, str, x, y, opts): y is the baseline. Options:
//   font, size, weight, color (string or CanvasGradient), align, spacing (px), stretch (x scale),
//   outline (colour), outlineW, shadow (colour), shadowOff ([dx, dy])
export function text(ctx, str, x, y, o = {}) {
  const { font = F.hud, size = 40, weight = 400, color = '#ffffff', align = 'left', spacing = 0, stretch = 1,
    outline = null, outlineW = 0, shadow = null, shadowOff = [0, 0] } = o;
  ctx.save();
  ctx.font = `${weight} ${size}px "${font}"`;
  ctx.letterSpacing = `${spacing}px`;
  ctx.textBaseline = 'alphabetic';
  // measure in unstretched units, then place by hand so stretch + align agree
  const w = ctx.measureText(str).width - spacing; // trailing spacing does not count
  const x0 = align === 'center' ? x - (w * stretch) / 2 : align === 'right' ? x - w * stretch : x;
  ctx.translate(x0, y); ctx.scale(stretch, 1);
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(str, shadowOff[0] / stretch, shadowOff[1]); }
  if (outline && outlineW > 0) { ctx.strokeStyle = outline; ctx.lineWidth = outlineW / stretch * 1.0; ctx.strokeText(str, 0, 0); }
  ctx.fillStyle = color; ctx.fillText(str, 0, 0);
  ctx.restore();
  return w * stretch;
}

export function measure(ctx, str, o = {}) {
  const { font = F.hud, size = 40, weight = 400, spacing = 0, stretch = 1 } = o;
  ctx.save(); ctx.font = `${weight} ${size}px "${font}"`; ctx.letterSpacing = `${spacing}px`;
  const w = (ctx.measureText(str).width - spacing) * stretch; ctx.restore();
  return w;
}

// largest size (down from `size`) at which str fits in maxW
export function fit(ctx, str, maxW, o) {
  let s = o.size;
  while (s > 8 && measure(ctx, str, { ...o, size: s }) > maxW) s -= 1;
  return s;
}
