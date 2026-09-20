/* ==========================================================
   Procedural pixel-art sprites (no external assets)
   Base resolution 16px per tile, rendered scaled 2x.
   ========================================================== */
(function () {
  const D = window.DEFS;
  const S = D.SPR; // 16
  const cache = new Map();

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function ctxOf(c) { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return x; }
  function hash(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function shade(hex, f) { // f>0 lighter, f<0 darker
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  // draw text map: rows of chars; pal maps char->color; '.' transparent. bottom-aligned into (w,h)
  function drawMap(ctx, rows, pal, w, h, ox = 0, oy = null) {
    const top = oy == null ? h - rows.length : oy;
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length && i < w; i++) {
        const ch = row[i]; if (ch === '.' || ch === ' ') continue;
        const c = pal[ch]; if (!c) continue;
        ctx.fillStyle = c; ctx.fillRect(ox + i, top + j, 1, 1);
      }
    }
  }
  function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function P(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }

  // ---------------- TILES ----------------
  const TILE_COLORS = {
    0: ['#2f6fc4', '#3f83d8'], 12: ['#5aaee6', '#7cc4f0'], 1: ['#e9d79f', '#dcc88b'], 2: ['#78c850', '#63b23e'],
    3: ['#4e9e3c', '#41882f'], 4: ['#a6743f', '#8f6134'], 5: ['#8f8f93', '#7a7a80'], 6: ['#eef3f9', '#d7e1ec'],
    7: ['#7b5230', '#93643a'], 8: ['#4c321b', '#5d3f24'], 9: ['#c4914f', '#a97a3f'], 10: ['#b3b3ba', '#9a9aa2'],
    11: ['#cdb98f', '#bba77d'], 13: ['#ececec', '#cfd8dc'], 14: ['#c94a4a', '#b53c3c'],
  };
  function genTile(x, g, v) {
    const { pattern, a, b } = g; R(x, 0, 0, S, S, a);
    const rnd = (i) => hash(v * 7 + 1, i * 13 + 99, 5);
    switch (pattern) {
      case 'plain': for (let i = 0; i < 4; i++) P(x, Math.floor(rnd(i) * 16), Math.floor(rnd(i + 20) * 16), b); break;
      case 'plank': for (let j = 0; j < 16; j += 4) { R(x, 0, j, 16, 1, b); R(x, (j / 4) % 2 ? 8 : 3, j + 1, 1, 3, b); } break;
      case 'brick': for (let j = 0; j < 16; j += 4) { R(x, 0, j, 16, 1, b); const o = (j / 4) % 2 ? 4 : 0; R(x, o, j, 1, 4, b); R(x, o + 8, j, 1, 4, b); } break;
      case 'checker': R(x, 0, 0, 8, 8, b); R(x, 8, 8, 8, 8, b); break;
      case 'diamond': for (let i = 0; i < 8; i++) { P(x, 8 + i, i, b); P(x, 7 - i, i, b); P(x, 8 + i, 15 - i, b); P(x, 7 - i, 15 - i, b); } break;
      case 'tile': R(x, 0, 0, 16, 1, b); R(x, 0, 0, 1, 16, b); R(x, 8, 0, 1, 16, b); R(x, 0, 8, 16, 1, b); P(x, 4, 4, shade(a, 0.15)); P(x, 12, 12, shade(a, 0.15)); break;
      case 'stripe': for (let j = 0; j < 16; j += 4) R(x, 0, j, 16, 2, b); break;
      case 'carpet': R(x, 1, 1, 14, 14, shade(a, 0.1)); R(x, 3, 3, 10, 10, a); for (let i = 3; i < 13; i += 3) { P(x, i, 3, b); P(x, i, 12, b); P(x, 3, i, b); P(x, 12, i, b); } break;
    }
  }
  function tileSprite(id, v, frame) {
    const key = `t${id}_${v}_${frame}`;
    if (cache.has(key)) return cache.get(key);
    const c = mk(S, S), x = ctxOf(c);
    const td = D.TILES[id];
    if (td && td.gen) { genTile(x, td.gen, v); cache.set(key, c); return c; }
    const [a, b] = TILE_COLORS[id] || ['#f0f', '#a0a'];
    R(x, 0, 0, S, S, a);
    const rnd = (i) => hash(v * 7 + 1, i * 13 + id, 5);
    switch (id) {
      case 2: case 3: { // grass tufts
        for (let i = 0; i < 6; i++) { const px = Math.floor(rnd(i) * 16), py = Math.floor(rnd(i + 20) * 16); P(x, px, py, b); if (rnd(i + 40) > 0.5) P(x, px, py - 1, b); }
        for (let i = 0; i < 3; i++) { const px = Math.floor(rnd(i + 60) * 16), py = Math.floor(rnd(i + 80) * 16); P(x, px, py, shade(a, 0.15)); }
        if (v === 3 && id === 2) { P(x, 4, 5, '#f7d94c'); P(x, 11, 10, '#ffffff'); }
        break;
      }
      case 1: case 11: { for (let i = 0; i < 9; i++) { const px = Math.floor(rnd(i) * 16), py = Math.floor(rnd(i + 20) * 16); P(x, px, py, b); } for (let i = 0; i < 4; i++) { const px = Math.floor(rnd(i + 50) * 16), py = Math.floor(rnd(i + 70) * 16); P(x, px, py, shade(a, 0.2)); } break; }
      case 0: case 12: { // water waves, 2 frames
        const off = frame ? 2 : 0;
        for (let i = 0; i < 3; i++) { const py = (i * 6 + off + Math.floor(rnd(i) * 3)) % 16; const px = Math.floor(rnd(i + 9) * 10); R(x, px, py, 4, 1, b); }
        if (id === 12) { for (let i = 0; i < 3; i++) P(x, Math.floor(rnd(i + 30) * 16), Math.floor(rnd(i + 40) * 16), '#e9d79f'); }
        break;
      }
      case 4: { for (let i = 0; i < 8; i++) { P(x, Math.floor(rnd(i) * 16), Math.floor(rnd(i + 20) * 16), b); } for (let i = 0; i < 3; i++) P(x, Math.floor(rnd(i + 40) * 16), Math.floor(rnd(i + 60) * 16), shade(a, 0.15)); break; }
      case 5: { for (let i = 0; i < 6; i++) { const px = Math.floor(rnd(i) * 14), py = Math.floor(rnd(i + 20) * 14); R(x, px, py, 2, 1, b); P(x, px + 2, py + 1, b); } for (let i = 0; i < 3; i++) P(x, Math.floor(rnd(i + 40) * 16), Math.floor(rnd(i + 60) * 16), shade(a, 0.2)); break; }
      case 6: { for (let i = 0; i < 6; i++) P(x, Math.floor(rnd(i) * 16), Math.floor(rnd(i + 20) * 16), b); break; }
      case 7: case 8: { for (let j = 0; j < 16; j += 4) { R(x, 0, j, 16, 1, b); R(x, 0, j + 2, 16, 1, shade(a, 0.08)); } for (let i = 0; i < 4; i++) P(x, Math.floor(rnd(i) * 16), Math.floor(rnd(i + 20) * 16), shade(a, -0.2)); break; }
      case 9: { for (let j = 0; j < 16; j += 4) { R(x, 0, j, 16, 1, b); const o = (j / 4) % 2 ? 8 : 3; R(x, o, j + 1, 1, 3, b); } for (let i = 0; i < 3; i++) P(x, Math.floor(rnd(i) * 16), Math.floor(rnd(i + 20) * 16), shade(a, 0.12)); break; }
      case 10: { R(x, 0, 0, 16, 1, b); R(x, 0, 0, 1, 16, b); R(x, 8, 0, 1, 16, b); R(x, 0, 8, 16, 1, b); P(x, 4, 4, shade(a, 0.15)); P(x, 12, 12, shade(a, 0.15)); break; }
      case 13: { R(x, 0, 0, 8, 8, b); R(x, 8, 8, 8, 8, b); break; }
      case 14: { R(x, 1, 1, 14, 14, shade(a, 0.1)); R(x, 3, 3, 10, 10, a); for (let i = 3; i < 13; i += 3) { P(x, i, 3, b); P(x, i, 12, b); P(x, 3, i, b); P(x, 12, i, b); } break; }
    }
    cache.set(key, c); return c;
  }

  // ---------------- OBJECT MAPS ----------------
  const PAL = {
    o: '#23331b', L: '#3f8f3a', l: '#5fbd55', k: '#2f6e2c', t: '#7a4a22', T: '#5a351a', s: '#8a8a8a', S: '#b5b5b5', d: '#5f5f5f',
    r: '#e63946', w: '#ffffff', y: '#f7d94c', p: '#ff8fab', b: '#8b5a2b', B: '#5e3a17', g: '#9aa3ad', G: '#6c757d', c: '#c9a063', C: '#a37a43',
    q: '#3a2a1a', u: '#4b6bd6', U: '#2b4aa8', e: '#e6e6e6', E: '#bdbdbd', n: '#f28c28', m: '#d62828', z: '#1b1b1b', i: '#f1c27d', v: '#7b3fbf',
    h: '#ffe08a', H: '#ffb347', x: '#c0392b', a: '#43aa8b', A: '#2a9d8f', f: '#ff6b35', F: '#ffd166',
  };
  const MAPS = {
    tree: [
      '......oooo......', '....ooLLLLoo....', '...oLLllLLLLo...', '..oLLlllLLLLLo..', '.oLLllLLLLLLLLo.', '.oLLLLLLLLllLLo.', 'oLLLLLLLLllllLLo',
      'oLLLLLLLLLllLLLo', 'oLLLlLLLLLLLLLLo', 'oLLllLLLLLLLLLLo', '.oLLLLLLkLLLLLo.', '.oLLLLkkkkLLLLo.', '..oLLkkLLkkLLo..', '...ooLLtTLLoo...',
      '.....oLtTLo.....', '......otTo......', '.......tT.......', '.......tT.......', '.......tT.......', '......ttTT......', '.....tttTTT.....'],
    pine: [
      '.......oo.......', '......oLLo......', '.....oLLLLo.....', '....oLllLLLo....', '.....oLLLLo.....', '....oLLLLLLo....', '...oLlLLLLLLo...',
      '..oLLLLLLLLLLo..', '....oLLLLLLo....', '...oLLlLLLLLo...', '..oLLLLLLLLLLo..', '.oLLLLLLLLLLLLo.', 'oLLLLkLLLLLkLLLo', '.oooooLtToooooo.',
      '......otTo......', '.......tT.......', '.......tT.......', '.......tT.......', '......ttTT......', '.....tttTTT.....'],
    palm: [
      '..ooo......ooo..', '.oLLLoo..ooLLLo.', 'oLLllLLooLLllLLo', '.oLLLLLLLLLLLLo.', '..ooLLLLLLLLoo..', '.oLLLLLtTLLLLLo.', 'oLLlLLotTooLLlLo',
      '.oLLoo.tT..ooLo.', '..oo...tT....o..', '.......tT.......', '.......tT.......', '......tTT.......', '......tT........', '......tT........',
      '.....ttTT.......', '....tttTTT......'],
    rock: ['.....ssss.......', '....sSSSss......', '...sSSSSSsss....', '..sSSSSSSSSss...', '..sSSSSsSSSSs...', '.sSSSssSSSSSss..', '.sSSSSSSSssSSs..', '.dsSSSSSSSSSsd..', '..ddsssssssdd...', '...dddddddd.....'],
    bigrock: ['......ssss......', '....ssSSSSss....', '...sSSSSSSSSs...', '..sSSSSSsSSSSs..', '.sSSSSSssSSSSSs.', '.sSSSssSSSSSSSs.', 'sSSSSSSSSSssSSSs', 'sSSSSSSSSSSSSSSs', 'sSSsSSSSSSSSSSss', 'sdSSSSSSSsSSSSds', '.ddssSSSSSSsddd.', '..dddddddddddd..'],
    bush: ['....oooooo......', '..ooLLLLLLoo....', '.oLLlLLLLLLLo...', 'oLLLLLLlLLLLLo..', 'oLLlLLLLLLLlLLo.', 'oLLLLLLLLLLLLLo.', '.oLLLLlLLLLLLo..', '..ooLLLLLLLoo...', '....oooooo......'],
    bush_b: ['....oooooo......', '..ooLLLLLLoo....', '.oLLrLLLLrLLo...', 'oLLLLLLrLLLLLo..', 'oLrLLLLLLLLrLLo.', 'oLLLLLrLLLLLLLo.', '.oLLrLLLLLrLLo..', '..ooLLLLLLLoo...', '....oooooo......'],
    flower: ['................', '................', '......pp..y.....', '.....pypp.yy....', '......pp...L....', '..r....L..L.....', '.ryr...L..L.....', '..r..L.L.L......', '..L..LLL.L......', '..L...L..L......'],
    mushroom: ['................', '......rrrr......', '.....rwrrwr.....', '....rrrrrrrr....', '....rrwrrrrr....', '.....eeeeee.....', '......eeee......', '......eeee......', '......EeeE......'],
    sapling: ['................', '................', '.......L........', '......LlL.......', '.....LLtLL......', '......LtL.......', '.......t........', '.......t........', '......TtT.......'],
    wall_wood: ['bbbbbbbbbbbbbbbb', 'bccccccccccccccb', 'bcCcccccccccccCb', 'bccccccccccccccb', 'bBBBBBBBBBBBBBBb', 'bccccccccccccccb', 'bccccccccCcccccb', 'bccccccccccccccb', 'bBBBBBBBBBBBBBBb', 'bccccccccccccccb', 'bcccCcccccccccCb', 'bccccccccccccccb', 'bBBBBBBBBBBBBBBb', 'bccccccccccccccb', 'bccccccccccccccb', 'bccccccccccccccb', 'bBBBBBBBBBBBBBBb', 'bccccccccccccccb', 'bcCcccccccccccCb', 'bccccccccccccccb', 'bBBBBBBBBBBBBBBb', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB'],
    wall_stone: ['dddddddddddddddd', 'dSSSSdSSSSSSdSSd', 'dSSSSdSSSSSSdSSd', 'dddddddddddddddd', 'dSSdSSSSSdSSSSSd', 'dSSdSSSSSdSSSSSd', 'dddddddddddddddd', 'dSSSSSdSSSSSdSSd', 'dSSSSSdSSSSSdSSd', 'dddddddddddddddd', 'dSSdSSSSSdSSSSSd', 'dSSdSSSSSdSSSSSd', 'dddddddddddddddd', 'dSSSSSdSSSSSdSSd', 'dSSSSSdSSSSSdSSd', 'dddddddddddddddd', 'dSSdSSSSSdSSSSSd', 'dSSdSSSSSdSSSSSd', 'dddddddddddddddd', 'dSSSSSdSSSSSdSSd', 'dSSSSSdSSSSSdSSd', 'dddddddddddddddd', 'ssssssssssssssss', 'ssssssssssssssss'],
    wall_brick: ['xxxxxxxxxxxxxxxx', 'xmmmmxmmmmmmxmmx', 'xmmmmxmmmmmmxmmx', 'xxxxxxxxxxxxxxxx', 'xmmxmmmmmxmmmmmx', 'xmmxmmmmmxmmmmmx', 'xxxxxxxxxxxxxxxx', 'xmmmmmxmmmmmxmmx', 'xmmmmmxmmmmmxmmx', 'xxxxxxxxxxxxxxxx', 'xmmxmmmmmxmmmmmx', 'xmmxmmmmmxmmmmmx', 'xxxxxxxxxxxxxxxx', 'xmmmmmxmmmmmxmmx', 'xmmmmmxmmmmmxmmx', 'xxxxxxxxxxxxxxxx', 'xmmxmmmmmxmmmmmx', 'xmmxmmmmmxmmmmmx', 'xxxxxxxxxxxxxxxx', 'xmmmmmxmmmmmxmmx', 'xmmmmmxmmmmmxmmx', 'xxxxxxxxxxxxxxxx', 'qqqqqqqqqqqqqqqq', 'qqqqqqqqqqqqqqqq'],
    window: ['bbbbbbbbbbbbbbbb', 'bccccccccccccccb', 'bccccccccccccccb', 'bcBBBBBBBBBBBBcb', 'bcBuuuuuBuuuuBcb', 'bcBuwuuuBuuuuBcb', 'bcBuuuuuBuuuuBcb', 'bcBuuuuuBuuuuBcb', 'bcBBBBBBBBBBBBcb', 'bcBuuuuuBuuuuBcb', 'bcBuuuuuBuuuuBcb', 'bcBuuuuuBuuwuBcb', 'bcBuuuuuBuuuuBcb', 'bcBBBBBBBBBBBBcb', 'bccccccccccccccb', 'bccccccccccccccb', 'bBBBBBBBBBBBBBBb', 'bccccccccccccccb', 'bccccccccccccccb', 'bccccccccccccccb', 'bBBBBBBBBBBBBBBb', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB'],
    door: ['bbbbbbbbbbbbbbbb', 'bBBBBBBBBBBBBBBb', 'bBccccccccccccBb', 'bBcCccccccccCcBb', 'bBccccccccccccBb', 'bBccccccccccccBb', 'bBccBBBBBBBBccBb', 'bBccccccccccccBb', 'bBccccccccccccBb', 'bBccccccccccccBb', 'bBccccccccccccBb', 'bBccccccccccccBb', 'bBcccccccccyyBb.', 'bBcccccccccyyBb.', 'bBccccccccccccBb', 'bBccccccccccccBb', 'bBccccccccccccBb', 'bBccccccccccccBb', 'bBccccccccccccBb', 'bBccccccccccccBb', 'bBccccccccccccBb', 'bBccccccccccccBb', 'bBBBBBBBBBBBBBBb', 'bbbbbbbbbbbbbbbb'],
    fence: ['................', '................', '..bb........bb..', '..cb........cb..', '.bccbbbbbbbbccb.', '.bccccccccccccb.', '.bccbbbbbbbbccb.', '..cb........cb..', '.bccbbbbbbbbccb.', '.bccccccccccccb.', '.bccbbbbbbbbccb.', '..cb........cb..', '..cb........cb..', '..BB........BB..', '................', '................'],
    gate: ['................', '................', '.bb..........bb.', '.cb..........bc.', '.cbbbb....bbbbc.', '.ccccc....ccccc.', '.cbbbb....bbbbc.', '.cb.b......b.bc.', '.cb.b......b.bc.', '.cbbbb....bbbbc.', '.ccccc....ccccc.', '.cbbbb....bbbbc.', '.cb..........bc.', '.BB..........BB.', '................', '................'],
    bed: ['................', '..bbbbbbbbbbbb..', '.bBBBBBBBBBBBBb.', '.bBwwwwwwwwwwBb.', '.bBweewwwwwwwBb.', '.bBwwwwwwwwwwBb.', '.bBrrrrrrrrrrBb.', '.bBrxrrrrrrrrBb.', '.bBrrrrrrrxrrBb.', '.bBrrrrrrrrrrBb.', '.bBrrrrxrrrrrBb.', '.bBrrrrrrrrrrBb.', '.bBrrrrrrrrrrBb.', '.bBrrrrrrrrrrBb.', '.bBxxxxxxxxxxBb.', '.bBBBBBBBBBBBBb.', '.bb..........bb.', '.bb..........bb.', '.bb..........bb.', '.BB..........BB.'],
    chair: ['................', '....bbbbbbbb....', '....bccccccb....', '....bcCccCcb....', '....bccccccb....', '....bccccccb....', '....bccccccb....', '...bbbbbbbbbb...', '...bccccccccb...', '...bbbbbbbbbb...', '...bb......bb...', '...bb......bb...', '...bb......bb...', '...BB......BB...', '................', '................'],
    sofa: ['................', '.uuuuuuuuuuuuuu.', 'uUUUUUUUUUUUUUUu', 'uUuuuuuuuuuuuuUu', 'uUuuuuuuuuuuuuUu', 'uUuuuuuuuuuuuuUu', 'uUuuuuuuuuuuuuUu', 'uUUUUUUUUUUUUUUu', 'uUuuuuuuUuuuuuUu', 'uUuuuuuuUuuuuuUu', 'uUuuuuuuUuuuuuUu', 'uUUUUUUUUUUUUUUu', '.bb..........bb.', '.BB..........BB.', '................', '................'],
    table: ['................', '................', '................', '.bbbbbbbbbbbbbb.', 'bccccccccccccccb', 'bcCccccccCccccCb', 'bccccccccccccccb', 'bBBBBBBBBBBBBBBb', '.bb..........bb.', '.bb..........bb.', '.bb..........bb.', '.bb..........bb.', '.BB..........BB.', '................', '................', '................'],
    tv: ['................', '................', '..zzzzzzzzzzzz..', '.zzuuuuuuuuuuzz.', '.zzuwuuuuauuuzz.', '.zzuuuuaaauuuzz.', '.zzuuuaaaaauuzz.', '.zzuuuuaaauuuzz.', '.zzuuuuuauuuuzz.', '.zzuuuuuuuuuuzz.', '.zzzzzzzzzzzzzz.', '..zzzzzzzzzzzz..', '.......zz.......', '.....zzzzzz.....', '................', '................'],
    fridge: ['................', '................', '...eeeeeeeeeee..', '..eEEEEEEEEEEEe.', '..eEeeeeeeeeeEe.', '..eEeeeeeeeeeEe.', '..eEeeeeeeeeEEe.', '..eEeeeeeeeeEEe.', '..eEeeeeeeeeeEe.', '..eEEEEEEEEEEEe.', '..eEeeeeeeeeeEe.', '..eEeeeeeeeeeEe.', '..eEeeeeeeeeEEe.', '..eEeeeeeeeeEEe.', '..eEeeeeeeeeEEe.', '..eEeeeeeeeeeEe.', '..eEeeeeeeeeeEe.', '..eEeeeeeeeeeEe.', '..eEEEEEEEEEEEe.', '..eeeeeeeeeeeee.', '..zz.........zz.', '................'],
    stove: ['................', '................', '..gggggggggggg..', '.gGGGGGGGGGGGGg.', '.gGzzzGGGGzzzGg.', '.gGzfzGGGGzfzGg.', '.gGzzzGGGGzzzGg.', '.gGGGGGGGGGGGGg.', '.gggggggggggggg.', '.gGGGGGGGGGGGGg.', '.gGzzzzzzzzzzGg.', '.gGzzzzzzzzzzGg.', '.gGGGGGGGGGGGGg.', '.gggggggggggggg.', '.zz..........zz.', '................'],
    lamp: ['................', '.....hhhhhh.....', '....hHHHHHHh....', '...hHHHHHHHHh...', '...hHHHHHHHHh...', '..hHHHHHHHHHHh..', '..hhhhhhhhhhhh..', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.....zzzzzz.....', '....zzzzzzzz....'],
    shelf: ['................', '.bbbbbbbbbbbbbb.', '.bccccccccccccb.', '.bcrruuyyaavvcb.', '.bcrruuyyaavvcb.', '.bcrruuyyaavvcb.', '.bbbbbbbbbbbbbb.', '.bccccccccccccb.', '.bcuuaarryyvvcb.', '.bcuuaarryyvvcb.', '.bcuuaarryyvvcb.', '.bbbbbbbbbbbbbb.', '.bccccccccccccb.', '.bcyyrraauuxxcb.', '.bcyyrraauuxxcb.', '.bcyyrraauuxxcb.', '.bbbbbbbbbbbbbb.', '.bccccccccccccb.', '.bbbbbbbbbbbbbb.', '.BB..........BB.'],
    plant: ['................', '................', '......LlL.......', '....LLlLLlL.....', '...LlLLLLLlL....', '....LLLlLLL.....', '.....LLLLL......', '......LtL.......', '....nnnnnnnn....', '.....nnnnnn.....', '.....nnnnnn.....', '.....xxxxxx.....', '................', '................', '................', '................'],
    bathtub: ['................', '................', '................', '.eeeeeeeeeeeeee.', 'eEEEEEEEEEEEEEEe', 'eEuuuuuuuuuuuuEe', 'eEuwuuuuuuuuuuEe', 'eEuuuuuuuuuwuuEe', 'eEuuuuuuuuuuuuEe', 'eEEEEEEEEEEEEEEe', '.eeeeeeeeeeeeee.', '..ee........ee..', '..EE........EE..', '................', '................', '................'],
    toilet: ['................', '................', '.....eeeeee.....', '....eEEEEEEe....', '....eEeeeeEe....', '....eEeeeeEe....', '....eEEEEEEe....', '....eeeeeeee....', '...eeeeeeeeee...', '..eEEEEEEEEEEe..', '..eEuuuuuuuuEe..', '..eEEEEEEEEEEe..', '...eeeeeeeeee...', '....eEEEEEEe....', '....eeeeeeee....', '................'],
    campfire: ['................', '................', '................', '.......ff.......', '......fFff......', '.....fFFFff.....', '.....fFhFFf.....', '....ffFhhFff....', '....fFFhhFFf....', '....fFFFFFFf....', '..t..ffffff..t..', '...tt..ff..tt...', '.tttttttttttttt.', 'ssTTTTTTTTTTTTss', '.ssssssssssssss.', '................'],
    campfire2: ['................', '................', '.......f........', '......ff.f......', '.....fFff.......', '....ffFFff......', '.....fFhFFf.....', '....fFFhhFff....', '....fFFhhFFf....', '....fFFFFFFf....', '..t..ffffff..t..', '...tt..ff..tt...', '.tttttttttttttt.', 'ssTTTTTTTTTTTTss', '.ssssssssssssss.', '................'],
    chest: ['................', '................', '................', '..bbbbbbbbbbbb..', '.bccccccccccccb.', '.bccccccccccccb.', '.bBBBBBByyBBBBb.', '.bccccccyyccccb.', '.bccccccccccccb.', '.bccccccccccccb.', '.bccccccccccccb.', '.bBBBBBBBBBBBBb.', '..bbbbbbbbbbbb..', '................', '................', '................'],
    sign: ['................', '..bbbbbbbbbbbb..', '.bccccccccccccb.', '.bcBBBBBBBBBBcb.', '.bccccccccccccb.', '.bcBBBBBBBBcccb.', '.bccccccccccccb.', '.bcBBBBBBBBBBcb.', '.bccccccccccccb.', '..bbbbbbbbbbbb..', '.......bb.......', '.......bb.......', '.......bb.......', '.......bb.......', '......BBBB......', '................'],
    torch: ['................', '................', '.......h........', '......hHh.......', '......fHf.......', '.....ffFff......', '.....fFFFf......', '......fff.......', '......zzz.......', '......ttt.......', '......ttt.......', '......ttt.......', '......ttt.......', '......ttt.......', '......TTT.......', '................'],
    torch2: ['................', '................', '........h.......', '.......hH.......', '......fHf.......', '......fFff......', '.....fFFFf......', '......fff.......', '......zzz.......', '......ttt.......', '......ttt.......', '......ttt.......', '......ttt.......', '......ttt.......', '......TTT.......', '................'],
    scarecrow: ['................', '.....hhhhhh.....', '....hHHHHHHh....', '...hhhhhhhhhh...', '.....iiiiii.....', '.....izii zi....', '.....iiiiii.....', '......iiii......', 'tttttttttttttttt', 'tttcccccccccctt.', '...cccrcccrccc..', '...cccccccccc...', '...ccrccccccc...', '...cccccccccc...', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..hh.h.hh.h.hh..', '.......tt.......', '.......tt.......', '.......tt.......', '.......tt.......', '.......tt.......', '......TTTT......', '................'],
    fountain: ['................', '................', '................', '................', '................', '................', '................', '................', '................', '................', '.......ww.......', '......wuuw......', '.......uu.......', '......Suuw......', '.....SuuuuS.....', '....SSuuuuSS....', '.....SsuusS.....', '......Suus......', '...SSSSsuSSSS...', '..SuuuuuuuuuuS..', '.SuuuwuuuuuwuuuS', '.SuuuuuuuuuuuuuS', '.SSSSSSSSSSSSSSS', '.SssssssssssssS.', '..SSSSSSSSSSSS..', '................'],
    streetlamp: ['......hhhh......', '.....hHHHHh.....', '....hHHHHHHh....', '....zHHHHHHz....', '....zzzzzzzz....', '......zzzz......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '.......zz.......', '......zzzz......', '.....zzzzzz.....', '................', '................'],
    computer: ['................', '................', '...zzzzzzzzzz...', '..zuuuuuuuuuuz..', '..zuwuuaauuuuz..', '..zuuuaaaauuuz..', '..zuuuuaauuuuz..', '..zuuuuuuuuuuz..', '..zzzzzzzzzzzz..', '......zzzz......', '..eeeeeeeeeeee..', '..eEEEEEEEEEEe..', '..eEEEEEEEEEEe..', '..eeeeeeeeeeee..', '................', '................'],
    shop: ['................', '.rrrrwwrrrrwwrr.', 'rrrrwwrrrrwwrrrr', 'rrrrwwrrrrwwrrrr', 'wwwwwwwwwwwwwwww', '.bb..........bb.', '.bb.yyy.rr.LL.bb', '.bb.yyy.rr.LL.bb', '.bb.nnn.pp.aa.bb', '.bbbbbbbbbbbbbb.', '.bccccccccccccb.', '.bcBBBBBBBBBBcb.', '.bccccccccccccb.', '.bccccccccccccb.', '.bBBBBBBBBBBBBb.', '.bb..........bb.', '.bb..........bb.', '.BB..........BB.', '................', '................', '................', '................', '................', '................', '................', '................', '................', '................', '................', '................', '................', '................'],
  };

  // ---------------- VEHICLES ----------------
  const VMAPS = {
    raft: ['........................', '........................', '........................', '........................', '.bbbbbbbbbbbbbbbbbbbbbb.', 'bccccccccccccccccccccccb', 'bBBBBqBBBBBBBBBBBqBBBBBb', 'bccccqcccccccccccqccccbb', 'bBBBBqBBBBBBBBBBBqBBBBBb', 'bccccccccccccccccccccccb', '.bbbbbbbbbbbbbbbbbbbbbb.', '........................'],
    boat: ['........................', '........................', '........................', '........................', '........................', '.b....................b.', '.bb..................bb.', '.bccbbbbbbbbbbbbbbbbccb.', '.bccccccccccccccccccccb.', '..bccccccccccccccccccb..', '..bBBBBBBBBBBBBBBBBBBb..', '...bBBBBBBBBBBBBBBBBb...', '....bbbbbbbbbbbbbbbb....', '........................'],
    speedboat: ['........................', '........................', '........................', '..............ee........', '.............eEEe.......', '.eeeeeeeeeeeeEEEEeeee...', '.ewwwwwwwwwwwwwwwwwwwe..', '.ewwwwwwwwwwwwwwwwwwwwe.', '..euuuuuuuuuuuuuuuuuuue.', '..ewwwwwwwwwwwwwwwwwwe..', '...eEEEEEEEEEEEEEEEEe...', '....eeeeeeeeeeeeeeee....', '........................', '........................'],
    horse: ['..............qq........', '.............bbqb.......', '............bbbbbbb.....', '...........bbbbbbbb.....', '..........bbbbb.bzb.....', '.q.......bbbbbb.bbb.....', '.qq.....bbbbbbb..bb.....', '.qqbbbbbbbbbbbb.........', '..qbbbbbbbbbbbb.........', '...bbbbbbbbbbbb.........', '...bbbbbbbbbbbb.........', '...bbb.bb..bb.bb........', '...bb..bb..bb..bb.......', '...bb..bb..bb..bb.......', '...BB..BB..BB..BB.......', '........................'],
    helicopter: ['....zzzzzzzzzzzzzzzzz...', '.............z..........', '............zzz.........', '.....zzzz..zuuuzz.......', '...zz...zzzuuuuuuz......', '..z........zuwwuuuz.....', '..z........zuwwuuuuz....', '...zz.....zzuuuuuuuz....', '.....zzzzzzzuuuuuuz.....', '............zzzzzz......', '..............z.z.......', '.............zzzzz......', '........................', '........................'],
    helicopter2: ['........zzzzzzzzz.......', '.............z..........', '............zzz.........', '.....zzzz..zuuuzz.......', '...zz...zzzuuuuuuz......', '..z........zuwwuuuz.....', '..z........zuwwuuuuz....', '...zz.....zzuuuuuuuz....', '.....zzzzzzzuuuuuuz.....', '............zzzzzz......', '..............z.z.......', '.............zzzzz......', '........................', '........................'],
    horse_v: ['................', '......bbbb......', '.....bbqqbb.....', '.....bbbbbb.....', '......bbbb......', '.....bbbbbb.....', '....bbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....', '....bb....bb....', '....bb....bb....', '....BB....BB....'],
  };
  function circle(ctx, cx, cy, r, color) { for (let a = 0; a < 32; a++) { const x = Math.round(cx + Math.cos(a / 32 * Math.PI * 2) * r), y = Math.round(cy + Math.sin(a / 32 * Math.PI * 2) * r); ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); } }
  function vehicleSprite(id, dir, frame) {
    const vert = dir === 'up' || dir === 'down';
    const key = `v_${id}_${vert ? 'v' : 's'}_${frame}`;
    if (cache.has(key)) return cache.get(key);
    const vdef = D.VEHICLES[id];
    if (vdef && vdef.base) { const basec = vehicleSprite(vdef.base, dir, frame); const c = mk(basec.width, basec.height); ctxOf(c).drawImage(basec, 0, 0); tint(c, vdef.color); cache.set(key, c); return c; }
    let c;
    if (vert && ['horse', 'bicycle', 'motorbike', 'car'].includes(id)) {
      c = mk(16, 16); const x = ctxOf(c);
      if (id === 'horse') drawMap(x, VMAPS.horse_v, PAL, 16, 16);
      else if (id === 'bicycle') { R(x, 7, 5, 2, 10, '#555'); R(x, 4, 4, 8, 1, '#777'); R(x, 6, 7, 4, 1, '#c0392b'); R(x, 7, 14, 2, 1, '#222'); }
      else if (id === 'motorbike') { R(x, 6, 4, 4, 11, '#333'); R(x, 5, 6, 6, 5, '#c0392b'); R(x, 3, 4, 10, 1, '#777'); R(x, 6, 14, 4, 1, '#111'); P(x, 7, 5, '#ffe08a'); P(x, 8, 5, '#ffe08a'); }
      else if (id === 'car') { R(x, 2, 3, 12, 11, '#1b1b1b'); R(x, 3, 4, 10, 9, '#e63946'); R(x, 4, 5, 8, 3, '#9fd8ff'); R(x, 3, 11, 10, 1, '#b02a35'); P(x, 3, 12, '#ffe08a'); P(x, 12, 12, '#ffe08a'); R(x, 2, 14, 3, 1, '#111'); R(x, 11, 14, 3, 1, '#111'); }
    } else {
      c = mk(24, 16); const x = ctxOf(c);
      if (VMAPS[id]) {
        let rows = VMAPS[id]; if (id === 'helicopter' && frame) rows = VMAPS.helicopter2;
        drawMap(x, rows, PAL, 24, 16);
      } else if (id === 'bicycle') {
        circle(x, 6, 11, 4, '#333'); circle(x, 17, 11, 4, '#333'); P(x, 6, 11, '#777'); P(x, 17, 11, '#777');
        x.fillStyle = '#c0392b'; for (let i = 0; i < 6; i++) { P(x, 6 + i, 11 - i, '#c0392b'); P(x, 12 + i, 5 + i, '#c0392b'); } R(x, 6, 5, 8, 1, '#c0392b'); R(x, 11, 5, 1, 6, '#c0392b');
        R(x, 9, 4, 4, 1, '#222'); R(x, 15, 3, 3, 1, '#222'); P(x, 16, 4, '#222');
      } else if (id === 'motorbike') {
        circle(x, 5, 11, 4, '#222'); circle(x, 18, 11, 4, '#222'); R(x, 4, 10, 3, 3, '#555'); R(x, 17, 10, 3, 3, '#555');
        R(x, 7, 7, 10, 4, '#c0392b'); R(x, 9, 5, 6, 2, '#333'); R(x, 15, 4, 3, 3, '#333'); R(x, 18, 3, 1, 3, '#777'); R(x, 6, 6, 3, 2, '#333'); P(x, 19, 6, '#ffe08a'); R(x, 8, 11, 9, 1, '#444');
      } else if (id === 'car') {
        R(x, 1, 7, 22, 6, '#1b1b1b'); R(x, 2, 7, 20, 5, '#e63946'); R(x, 6, 3, 12, 4, '#1b1b1b'); R(x, 7, 4, 10, 3, '#9fd8ff'); R(x, 12, 4, 1, 3, '#1b1b1b');
        R(x, 2, 8, 20, 1, '#f08a94'); P(x, 21, 9, '#ffe08a'); P(x, 2, 9, '#ff5555'); circle(x, 6, 12, 2, '#111'); circle(x, 18, 12, 2, '#111'); R(x, 5, 11, 3, 3, '#111'); R(x, 17, 11, 3, 3, '#111'); P(x, 6, 12, '#888'); P(x, 18, 12, '#888');
      }
    }
    cache.set(key, c); return c;
  }

  // procedural shape renderer for generated era objects (recolored by pal)
  const SHAPE_ALIAS = { wall: 'wall_wood', door: 'door', window: 'window', fence: 'fence', gate: 'gate', bed: 'bed', chair: 'chair', table: 'table', sofa: 'sofa', shelf: 'shelf', plant: 'plant', tv: 'tv', stove: 'stove', bathtub: 'bathtub', fountain: 'fountain', streetlamp: 'streetlamp', torch2: 'torch', stonebath: 'bathtub', tub: 'bathtub', firepit: 'campfire', hearth: 'stove', cabinet: 'fridge', oven: 'stove' };
  function drawShape(x, shape, pal, h, frame) {
    const H = S * h, base = H; const c = pal.c || '#c9a063', b = pal.b || shade(c, -0.35), B = pal.B || shade(c, -0.5), sCol = pal.s || '#8a8a8a', u = pal.u || '#4b6bd6', r = pal.r || '#e63946', y = pal.y || '#f7d94c', g = pal.g || '#7a7a80', G = pal.G || '#3f3f45', e = pal.e || '#ececec', z = pal.z || '#1b1b1b', L = pal.L || '#5fbd55', w = pal.w || '#ffffff', hl = pal.h || '#ffe08a', fl = pal.f || '#ff6b35';
    const flick = frame ? 1 : 0;
    switch (shape) {
      // ---- pillars / statues ----
      case 'totem': R(x, 5, 2, 6, H - 4, c); R(x, 5, 2, 6, 1, B); for (let i = 0; i < 3; i++) { R(x, 4, 4 + i * 9, 8, 3, i % 2 ? r : u); P(x, 6, 5 + i * 9, z); P(x, 9, 5 + i * 9, z); } R(x, 3, H - 2, 10, 2, B); break;
      case 'skullpole': R(x, 7, 8, 2, H - 10, b); R(x, 4, 2, 8, 7, e); P(x, 6, 4, z); P(x, 9, 4, z); R(x, 6, 7, 4, 1, z); R(x, 5, H - 2, 6, 2, B); break;
      case 'stonestatue': case 'statue': case 'knightarmor': R(x, 3, H - 4, 10, 4, B); R(x, 4, H - 5, 8, 1, sCol); R(x, 6, 3, 4, 4, shape === 'knightarmor' ? g : sCol); R(x, 4, 7, 8, 9, shape === 'knightarmor' ? G : sCol); R(x, 2, 8, 2, 6, shape === 'knightarmor' ? g : sCol); R(x, 12, 8, 2, 6, shape === 'knightarmor' ? g : sCol); if (shape === 'knightarmor') { R(x, 6, 4, 4, 1, z); R(x, 12, 4, 1, 10, e); } R(x, 5, 16, 2, H - 20, shape === 'knightarmor' ? G : sCol); R(x, 9, 16, 2, H - 20, shape === 'knightarmor' ? G : sCol); break;
      case 'robot': R(x, 4, 2, 8, 7, e); R(x, 5, 3, 6, 3, u); P(x, 6, 4, w); P(x, 9, 4, w); R(x, 3, 9, 10, 9, g); R(x, 5, 11, 6, 4, z); P(x, 6, 12, r); P(x, 9, 12, L); R(x, 1, 10, 2, 7, g); R(x, 13, 10, 2, 7, g); R(x, 4, 18, 3, H - 20, G); R(x, 9, 18, 3, H - 20, G); P(x, 7, 0, r); P(x, 7, 1, g); break;
      case 'hologram': R(x, 3, H - 3, 10, 3, G); R(x, 5, H - 4, 6, 1, u); for (let i = 0; i < 10; i++) { const yy = 4 + i * 2; if ((i + flick) % 2 === 0) R(x, 6 - (i % 3), yy, 4 + (i % 3) * 2, 1, pal.u || '#7cf2ff'); } R(x, 6, 4, 4, 4, '#bfe3ff'); break;
      // ---- boxes / machines ----
      case 'crate': R(x, 2, 4, 12, 11, c); R(x, 2, 4, 12, 1, b); R(x, 2, 14, 12, 1, B); R(x, 2, 4, 1, 11, B); R(x, 13, 4, 1, 11, B); for (let i = 0; i < 10; i++) { P(x, 3 + i, 5 + i, B); P(x, 12 - i, 5 + i, B); } break;
      case 'barrel': R(x, 3, 2, 10, 13, c); R(x, 3, 2, 10, 1, B); R(x, 3, 14, 10, 1, B); R(x, 2, 5, 12, 1, g); R(x, 2, 11, 12, 1, g); R(x, 5, 3, 1, 11, shade(c, 0.15)); break;
      case 'vending': R(x, 2, 1, 12, H - 2, r); R(x, 3, 2, 10, 8, '#bfe3ff'); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) R(x, 4 + i * 3, 3 + j * 3, 2, 2, [u, y, L][i]); R(x, 3, 12, 10, 3, z); R(x, 4, H - 5, 8, 2, y); break;
      case 'arcade': R(x, 2, 1, 12, H - 2, u); R(x, 3, 3, 10, 7, z); R(x, 4, 4, 8, 5, '#1b2a44'); P(x, 6, 6, y); P(x, 9, 5, r); P(x, 8, 7, L); R(x, 3, 12, 10, 3, G); P(x, 5, 13, r); P(x, 8, 13, y); P(x, 11, 13, L); break;
      case 'speaker': R(x, 3, 1, 10, H - 2, z); for (let i = 0; i < 2; i++) { R(x, 5, 3 + i * 9, 6, 6, G); R(x, 6, 4 + i * 9, 4, 4, g); P(x, 7, 5 + i * 9, z); P(x, 8, 5 + i * 9, z); } if (flick) R(x, 2, 6, 1, 4, u); break;
      case 'aquarium': R(x, 1, 3, 14, 11, G); R(x, 2, 4, 12, 9, u); P(x, 4, 6 + flick, y); P(x, 5, 6 + flick, y); P(x, 10, 9 - flick, r); P(x, 11, 9 - flick, r); R(x, 3, 11, 10, 1, '#e9d79f'); R(x, 12, 5, 1, 6, L); break;
      case 'steamengine': R(x, 1, 6, 14, 9, g); R(x, 2, 7, 12, 7, G); R(x, 3, 2, 4, 5, g); R(x, 4, 0 + flick, 2, 2, e); R(x, 9, 8, 4, 4, sCol); P(x, 10, 9, r); R(x, 1, 15, 14, 1, z); break;
      case 'radio': R(x, 2, 6, 12, 8, c); R(x, 3, 7, 5, 6, G); R(x, 9, 8, 4, 1, z); R(x, 9, 10, 4, 1, z); P(x, 12, 12, r); R(x, 7, 3, 1, 3, g); break;
      case 'typewriter': R(x, 2, 8, 12, 6, G); R(x, 3, 5, 10, 3, g); for (let i = 0; i < 4; i++) { P(x, 4 + i * 2, 10, e); P(x, 5 + i * 2, 12, e); } R(x, 4, 3, 8, 2, w); break;
      case 'gramophone': R(x, 3, 10, 10, 5, c); R(x, 3, 10, 10, 1, B); R(x, 8, 5, 2, 5, g); for (let i = 0; i < 5; i++) R(x, 9 + i, 1 + i, 1, 5 - i, y); R(x, 9, 0, 6, 1, y); break;
      case 'mailbox': R(x, 7, 8, 2, H - 8, b); R(x, 3, 2, 10, 7, u); R(x, 3, 2, 10, 1, shade(u, -0.3)); R(x, 12, 3, 1, 3, r); R(x, 5, 5, 6, 1, w); break;
      case 'anvil': R(x, 2, 6, 12, 3, g); R(x, 5, 9, 6, 3, G); R(x, 3, 12, 10, 3, g); R(x, 1, 6, 3, 2, g); break;
      case 'drum': R(x, 3, 5, 10, 9, c); R(x, 3, 5, 10, 2, e); R(x, 3, 13, 10, 1, B); R(x, 4, 7, 1, 6, B); R(x, 11, 7, 1, 6, B); break;
      case 'rockpile': R(x, 4, 10, 8, 5, sCol); R(x, 2, 12, 5, 3, shade(sCol, -0.2)); R(x, 9, 11, 5, 4, shade(sCol, 0.15)); R(x, 6, 7, 5, 4, shade(sCol, 0.1)); break;
      case 'solar': R(x, 1, 5, 14, 8, '#1b2a44'); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) R(x, 2 + i * 4, 6 + j * 3, 3, 2, '#2e5fb0'); R(x, 7, 13, 2, 3, g); R(x, 4, 15, 8, 1, G); break;
      case 'clocktower': R(x, 5, 4, 6, H - 6, c); R(x, 5, 4, 6, 1, B); R(x, 4, 2, 8, 2, B); R(x, 5, 6, 6, 6, w); R(x, 5, 6, 6, 1, z); R(x, 5, 11, 6, 1, z); R(x, 8, 8, 1, 2, z); R(x, 8, 9, 2, 1, z); R(x, 7, 14, 2, H - 18, y); R(x, 4, H - 2, 8, 2, B); break;
      case 'gearwheel': for (let a = 0; a < 8; a++) { const px = 8 + Math.round(Math.cos(a * Math.PI / 4 + flick * 0.4) * 6), py = 8 + Math.round(Math.sin(a * Math.PI / 4 + flick * 0.4) * 6); R(x, px - 1, py - 1, 2, 2, g); } for (let i = 0; i < 24; i++) { const px = 8 + Math.round(Math.cos(i / 24 * Math.PI * 2) * 4), py = 8 + Math.round(Math.sin(i / 24 * Math.PI * 2) * 4); P(x, px, py, G); } R(x, 7, 7, 2, 2, z); break;
      case 'piano': R(x, 1, 3, 14, 10, z); R(x, 2, 9, 12, 3, w); for (let i = 3; i < 14; i += 2) P(x, i, 9, z); R(x, 2, 13, 1, 3, z); R(x, 13, 13, 1, 3, z); break;
      case 'telescope': R(x, 7, 9, 2, 6, g); R(x, 4, 14, 8, 1, G); for (let i = 0; i < 7; i++) R(x, 4 + i, 8 - i, 2, 2, sCol); R(x, 10, 1, 3, 3, G); break;
      case 'drone': R(x, 5, 8, 6, 3, G); R(x, 6, 9, 4, 1, u); R(x, 1, 6 + flick, 5, 1, g); R(x, 10, 6 + flick, 5, 1, g); P(x, 3, 7, z); P(x, 12, 7, z); P(x, 7, 12, r); break;
      case 'bell': R(x, 6, 1, 4, 2, B); R(x, 5, 3, 6, 6, y); R(x, 4, 9, 8, 2, shade(y, -0.2)); P(x, 7, 11, z); R(x, 2, 0, 12, 1, b); break;
      case 'globe': R(x, 4, 3, 8, 8, u); R(x, 5, 4, 2, 2, L); R(x, 8, 7, 3, 2, L); R(x, 7, 11, 2, 2, c); R(x, 5, 13, 6, 1, B); R(x, 12, 2, 1, 9, y); break;
      case 'harp': R(x, 3, 2, 2, 12, y); R(x, 3, 13, 10, 2, y); for (let i = 0; i < 5; i++) R(x, 5 + i * 2, 4 + i, 1, 9 - i, e); for (let i = 0; i < 9; i++) P(x, 5 + i, 2 + Math.floor(i * i / 12), y); break;
      case 'bookstand': R(x, 7, 6, 2, 8, b); R(x, 4, 14, 8, 1, B); R(x, 3, 2, 10, 5, c); R(x, 4, 3, 8, 3, w); R(x, 8, 3, 1, 3, r); break;
      case 'throne': R(x, 3, 1, 10, 9, r); R(x, 3, 1, 10, 1, y); R(x, 2, 6, 12, 5, shade(r, -0.2)); R(x, 2, 11, 12, 1, y); R(x, 2, 12, 2, 4, y); R(x, 12, 12, 2, 4, y); P(x, 5, 3, y); P(x, 10, 3, y); break;
      case 'strawmat': R(x, 1, 5, 14, 8, c); for (let j = 6; j < 13; j += 2) R(x, 1, j, 14, 1, B); R(x, 1, 5, 14, 1, shade(c, 0.2)); break;
      // ---- wall art ----
      case 'cavepaint': case 'painting': case 'tapestry': case 'banner': case 'shield': case 'bonehang': case 'neon': case 'weaponrack': {
        const fr = shape === 'painting' ? y : shape === 'neon' ? z : b; R(x, 2, 2, 12, H - 4, fr); R(x, 3, 3, 10, H - 6, shape === 'cavepaint' ? '#c9a063' : shape === 'tapestry' ? r : shape === 'banner' ? u : shape === 'neon' ? z : shape === 'shield' ? sCol : shape === 'weaponrack' ? c : e);
        if (shape === 'cavepaint') { R(x, 5, 6, 3, 2, B); R(x, 9, 9, 4, 2, r); P(x, 6, 12, B); } else if (shape === 'painting') { R(x, 4, 4, 8, 4, u); R(x, 4, 8, 8, 6, L); P(x, 10, 5, y); } else if (shape === 'tapestry') { R(x, 5, 6, 6, 6, y); P(x, 7, 8, r); P(x, 8, 9, r); } else if (shape === 'banner') { R(x, 6, 6, 4, 6, y); } else if (shape === 'shield') { R(x, 5, 6, 6, 8, r); R(x, 7, 4, 2, 12, y); } else if (shape === 'bonehang') { R(x, 5, 5, 6, 1, e); R(x, 6, 6, 1, 6, e); R(x, 9, 6, 1, 5, e); P(x, 6, 12, e); } else if (shape === 'neon') { R(x, 4, 6 + flick, 8, 2, pal.u || '#7cf2ff'); R(x, 5, 10, 6, 2, '#ff8fab'); } else { R(x, 5, 5, 1, 9, g); R(x, 8, 4, 1, 10, g); R(x, 11, 6, 1, 8, g); R(x, 4, 4, 3, 1, sCol); R(x, 7, 3, 3, 1, sCol); }
        break;
      }
      // ---- lamps ----
      case 'brazier': R(x, 3, 12, 10, 3, sCol); R(x, 5, 9, 6, 3, shade(sCol, -0.2)); R(x, 6, 4 + flick, 4, 5, fl); R(x, 7, 2 + flick, 2, 3, hl); P(x, 5, 6 - flick, fl); P(x, 10, 5 + flick, fl); break;
      case 'stonelamp': R(x, 6, 10, 4, H - 10, sCol); R(x, 4, 6, 8, 4, shade(sCol, -0.2)); R(x, 5, 7, 6, 2, hl); R(x, 3, 4, 10, 2, sCol); break;
      case 'oillamp': case 'lantern': case 'gaslamp': R(x, 7, 0, 2, H - 8, g); R(x, 4, H - 10, 8, 8, G); R(x, 5, H - 9, 6, 6, hl); R(x, 6, H - 8, 4, 4 - flick, fl); if (shape === 'gaslamp') { R(x, 3, H - 11, 10, 1, g); } break;
      case 'candle': case 'candelabra': { const n = shape === 'candle' ? 2 : 3; for (let i = 0; i < n; i++) { const cx = 4 + i * (n === 2 ? 6 : 4); R(x, cx, 6, 2, 7, e); R(x, cx, 4 - flick, 2, 2, fl); P(x, cx, 3 - flick, hl); } R(x, 3, 13, 10, 2, y); R(x, 7, 15, 2, 1, y); break; }
      case 'chandelier': R(x, 7, 0, 2, 6, y); R(x, 2, 6, 12, 2, y); for (let i = 0; i < 4; i++) { const cx = 3 + i * 3; R(x, cx, 3 - flick, 1, 3, fl); P(x, cx, 2 - flick, hl); } R(x, 4, 8, 8, 2, shade(y, -0.2)); for (let i = 0; i < 5; i++) P(x, 4 + i * 2, 10 + (i % 2), '#bfe3ff'); break;
      case 'ledlamp': R(x, 7, 6, 2, H - 8, e); R(x, 3, 2, 10, 4, w); R(x, 4, 3, 8, 2, pal.u || '#7cf2ff'); R(x, 4, H - 2, 8, 2, g); break;
      case 'floorlamp': R(x, 7, 8, 2, H - 10, g); R(x, 3, 2, 10, 6, e); R(x, 4, 3, 8, 4, hl); R(x, 4, H - 2, 8, 2, G); break;
      // ---- pots ----
      case 'potplant': case 'vase': R(x, 5, 8, 6, 7, c); R(x, 4, 7, 8, 1, B); R(x, 6, 15, 4, 1, B); R(x, 5, 9, 1, 5, shade(c, 0.2)); if (shape === 'potplant') { R(x, 7, 3, 2, 5, '#3f8f3a'); R(x, 5, 4, 2, 2, L); R(x, 9, 2, 2, 2, L); } else { R(x, 6, 3, 4, 2, r); R(x, 7, 1, 2, 2, r); } break;
      default: R(x, 3, 3, 10, H - 6, c); R(x, 3, 3, 10, 1, B); R(x, 3, H - 4, 10, 1, B);
    }
  }
  function objSprite(obj, frame) {
    const t = obj.t;
    const gdef = D.OBJ[t] && D.OBJ[t].gen;
    if (gdef) {
      const key = `og_${t}_${frame ? 1 : 0}`;
      if (cache.has(key)) return cache.get(key);
      const h = D.OBJ[t].h || 1; const c = mk(S, S * h), x = ctxOf(c);
      const base = SHAPE_ALIAS[gdef.shape] || gdef.shape;
      if (MAPS[base]) drawMap(x, MAPS[base], { ...PAL, ...gdef.pal }, S, S * h); else drawShape(x, gdef.shape, gdef.pal, h, frame);
      cache.set(key, c); return c;
    }
    let name = t;
    if (t === 'bush') name = obj.b ? 'bush_b' : 'bush';
    if (t === 'campfire') name = frame ? 'campfire2' : 'campfire';
    if (t === 'torch') name = frame ? 'torch2' : 'torch';
    if (t === 'crop') return cropSprite(obj.c, obj.s || 0, obj.w && obj.w > Date.now());
    const v = obj.v || 0;
    const key = `o_${name}_${v}`;
    if (cache.has(key)) return cache.get(key);
    const def = D.OBJ[t] || { h: 2 };
    const h = (t === 'shop') ? 2 : (def.h || 1);
    const c = mk(S, S * h), x = ctxOf(c);
    const rows = MAPS[name];
    if (rows) {
      let pal = PAL;
      if ((t === 'tree' || t === 'pine' || t === 'bush' || t === 'palm') && v) {
        pal = { ...PAL, L: shade(PAL.L, v === 1 ? 0.1 : -0.12), l: shade(PAL.l, v === 1 ? 0.1 : -0.1) };
      }
      if (t === 'flower' && v) pal = { ...PAL, p: v === 1 ? '#a78bfa' : '#ffffff', r: v === 1 ? '#f97316' : '#60a5fa', y: v === 1 ? '#fde047' : '#f472b6' };
      drawMap(x, rows, pal, S, S * h);
    } else { R(x, 2, 2, 12, 12, '#f0f'); }
    cache.set(key, c); return c;
  }

  function cropSprite(cropId, stage, wet) {
    const key = `c_${cropId}_${stage}`;
    if (cache.has(key)) return cache.get(key);
    const cd = D.CROPS[cropId] || { color: '#f00', leaf: '#3a3' };
    const h = cd.tall ? 2 : 1;
    const c = mk(S, S * h), x = ctxOf(c);
    const base = S * h;
    const L = cd.leaf, Ld = shade(cd.leaf, -0.25), F = cd.color, Fd = shade(cd.color, -0.25);
    if (stage === 0) { P(x, 7, base - 3, L); P(x, 8, base - 3, L); P(x, 7, base - 4, Ld); P(x, 6, base - 2, L); P(x, 9, base - 2, L); }
    else if (stage === 1) { R(x, 7, base - 5, 2, 4, Ld); P(x, 5, base - 4, L); P(x, 6, base - 5, L); P(x, 10, base - 4, L); P(x, 9, base - 5, L); P(x, 6, base - 2, L); P(x, 9, base - 2, L); }
    else if (stage === 2) { R(x, 7, base - 7, 2, 6, Ld); R(x, 4, base - 5, 3, 2, L); R(x, 9, base - 6, 3, 2, L); R(x, 5, base - 8, 2, 2, L); R(x, 9, base - 8, 2, 2, L); P(x, 4, base - 2, L); P(x, 11, base - 2, L); }
    else if (stage === 3) {
      R(x, 7, base - 9, 2, 8, Ld); R(x, 3, base - 6, 4, 2, L); R(x, 9, base - 7, 4, 2, L); R(x, 4, base - 9, 3, 2, L); R(x, 9, base - 10, 3, 2, L); R(x, 6, base - 11, 4, 2, L);
      P(x, 5, base - 4, Fd); P(x, 10, base - 5, Fd);
      if (cd.tall) { R(x, 7, base - 14, 2, 5, Ld); R(x, 5, base - 13, 2, 1, L); R(x, 9, base - 12, 2, 1, L); }
    } else {
      R(x, 7, base - 10, 2, 9, Ld); R(x, 3, base - 7, 4, 2, L); R(x, 9, base - 8, 4, 2, L); R(x, 4, base - 10, 3, 2, L); R(x, 9, base - 11, 3, 2, L); R(x, 6, base - 12, 4, 2, L);
      if (cropId === 'pumpkin') { R(x, 3, base - 6, 6, 5, F); R(x, 4, base - 7, 4, 1, Fd); P(x, 5, base - 8, Ld); R(x, 9, base - 5, 4, 4, F); P(x, 10, base - 6, Fd); }
      else if (cropId === 'cabbage') { R(x, 4, base - 8, 8, 7, F); R(x, 5, base - 9, 6, 1, Fd); R(x, 3, base - 6, 1, 4, Fd); R(x, 12, base - 6, 1, 4, Fd); P(x, 6, base - 6, shade(F, 0.2)); P(x, 8, base - 4, shade(F, 0.2)); }
      else if (cropId === 'carrot') { R(x, 6, base - 4, 4, 3, F); R(x, 7, base - 2, 2, 1, Fd); P(x, 7, base - 5, F); P(x, 8, base - 5, F); }
      else if (cd.tall) { R(x, 7, base - 16, 2, 7, Ld); R(x, 4, base - 15, 3, 1, L); R(x, 9, base - 14, 3, 1, L); R(x, 4, base - 13, 2, 5, F); R(x, 10, base - 12, 2, 5, F); P(x, 5, base - 9, Fd); P(x, 11, base - 8, Fd); if (cropId === 'rice') { R(x, 6, base - 17, 4, 2, F); } }
      else { R(x, 4, base - 6, 2, 2, F); R(x, 10, base - 7, 2, 2, F); R(x, 6, base - 10, 2, 2, F); R(x, 9, base - 4, 2, 2, F); P(x, 5, base - 5, Fd); P(x, 11, base - 6, Fd); P(x, 7, base - 9, Fd); }
    }
    cache.set(key, c); return c;
  }

  // ---------------- CHARACTER ----------------
  const OUT = '#2b1d0e';
  function charSprite(look, dir, frame, opts = {}) {
    const key = `ch_${JSON.stringify(look)}_${dir}_${frame}_${opts.closed ? 1 : 0}`;
    if (cache.has(key)) return cache.get(key);
    const c = mk(16, 24), x = ctxOf(c);
    const skin = look.skin || '#f1c27d', hair = look.hair || '#3b2a1a', shirt = look.shirt || '#2a9d8f', pants = look.pants || '#264653', eyes = look.eyes || '#2b2b2b';
    const skinD = shade(skin, -0.2), shirtD = shade(shirt, -0.25), pantsD = shade(pants, -0.25), hairD = shade(hair, -0.25);
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    const oy = -bob;
    const mirror = dir === 'right';
    if (mirror) { x.translate(16, 0); x.scale(-1, 1); }
    const side = dir === 'left' || dir === 'right';
    const back = dir === 'up';
    // legs
    const legY = 17 + oy;
    const lUp = frame === 1 ? 1 : 0, rUp = frame === 3 ? 1 : 0;
    if (side) {
      // legs one behind the other
      R(x, 5 + (frame === 1 ? 1 : frame === 3 ? -1 : 0), legY, 3, 5 - lUp, pantsD);
      R(x, 7 + (frame === 3 ? 1 : frame === 1 ? -1 : 0), legY, 3, 5 - rUp, pants);
      R(x, 5 + (frame === 1 ? 1 : frame === 3 ? -1 : 0), 22 + oy - lUp, 3, 1 + lUp, OUT);
      R(x, 7 + (frame === 3 ? 1 : frame === 1 ? -1 : 0), 22 + oy - rUp, 3, 1 + rUp, OUT);
    } else {
      R(x, 5, legY, 2, 5 - lUp, pants); R(x, 9, legY, 2, 5 - lUp * 0 - rUp, pants);
      R(x, 7, legY, 2, 3, pantsD);
      R(x, 5, 22 + oy - lUp, 2, 1, OUT); R(x, 9, 22 + oy - rUp, 2, 1, OUT);
      R(x, 4, legY, 1, 4, pantsD); R(x, 11, legY, 1, 4, pantsD);
    }
    // torso
    R(x, 4, 11 + oy, 8, 7, OUT);
    R(x, 5, 11 + oy, 6, 6, shirt);
    if (!back) { R(x, 7, 12 + oy, 2, 4, shirtD); }
    // arms
    if (side) {
      R(x, 6, 12 + oy, 3, 5, shirtD); R(x, 6, 12 + oy, 3, 4, shirt); R(x, 6, 16 + oy, 3, 1, skin);
    } else {
      R(x, 3, 12 + oy, 2, 5, OUT); R(x, 11, 12 + oy, 2, 5, OUT);
      R(x, 3, 12 + oy, 2, 4, shirtD); R(x, 11, 12 + oy, 2, 4, shirtD);
      R(x, 3, 16 + oy, 2, 1, skin); R(x, 11, 16 + oy, 2, 1, skin);
    }
    // head
    R(x, 3, 2 + oy, 10, 10, OUT);
    R(x, 4, 3 + oy, 8, 8, skin);
    R(x, 4, 10 + oy, 8, 1, skinD);
    if (!back) {
      if (side) {
        if (opts.closed) R(x, 5, 7 + oy, 2, 1, OUT); else { P(x, 5, 7 + oy, eyes); P(x, 5, 6 + oy, '#fff'); }
        P(x, 4, 8 + oy, shade(skin, -0.1));
      } else {
        if (opts.closed) { R(x, 5, 7 + oy, 2, 1, OUT); R(x, 9, 7 + oy, 2, 1, OUT); }
        else { P(x, 6, 7 + oy, eyes); P(x, 9, 7 + oy, eyes); P(x, 6, 6 + oy, '#fff'); P(x, 9, 6 + oy, '#fff'); }
        P(x, 7, 9 + oy, '#c0392b'); P(x, 8, 9 + oy, '#c0392b');
        P(x, 5, 8 + oy, '#f4a6a6'); P(x, 10, 8 + oy, '#f4a6a6');
      }
    }
    // hair
    const hs = look.hairStyle || 'short';
    if (hs !== 'bald') {
      R(x, 4, 2 + oy, 8, 2, hair); R(x, 3, 3 + oy, 1, 2, hair); R(x, 12, 3 + oy, 1, 2, hair);
      if (!back && !side) { P(x, 4, 4 + oy, hair); P(x, 11, 4 + oy, hair); P(x, 7, 4 + oy, hair); }
      if (back) R(x, 4, 4 + oy, 8, 3, hair);
      if (side) { R(x, 8, 4 + oy, 5, 3, hair); R(x, 4, 4 + oy, 2, 1, hair); }
      switch (hs) {
        case 'long': R(x, 3, 4 + oy, 1, 8, hair); R(x, 12, 4 + oy, 1, 8, hair); if (back) R(x, 4, 4 + oy, 8, 9, hair); if (side) R(x, 10, 4 + oy, 3, 8, hair); P(x, 3, 11 + oy, hairD); P(x, 12, 11 + oy, hairD); break;
        case 'bob': R(x, 3, 4 + oy, 1, 5, hair); R(x, 12, 4 + oy, 1, 5, hair); if (back) R(x, 4, 4 + oy, 8, 5, hair); if (side) R(x, 9, 4 + oy, 4, 5, hair); break;
        case 'spiky': P(x, 4, 1 + oy, hair); P(x, 6, 0 + oy, hair); P(x, 6, 1 + oy, hair); P(x, 9, 1 + oy, hair); P(x, 11, 0 + oy, hair); P(x, 11, 1 + oy, hair); P(x, 8, 1 + oy, hairD); break;
        case 'bun': R(x, 6, 0 + oy, 4, 2, hair); P(x, 6, 0 + oy, hairD); if (back) R(x, 4, 4 + oy, 8, 3, hair); break;
        case 'ponytail': if (back) { R(x, 6, 4 + oy, 4, 10, hair); P(x, 6, 13 + oy, hairD); } if (side) { R(x, 12, 4 + oy, 2, 8, hair); P(x, 13, 11 + oy, hairD); } break;
        case 'curly': P(x, 3, 1 + oy, hair); P(x, 5, 1 + oy, hair); P(x, 7, 1 + oy, hair); P(x, 9, 1 + oy, hair); P(x, 11, 1 + oy, hair); P(x, 13, 3 + oy, hair); P(x, 2, 3 + oy, hair); R(x, 3, 4 + oy, 1, 3, hair); R(x, 12, 4 + oy, 1, 3, hair); if (back) R(x, 4, 4 + oy, 8, 4, hair); break;
      }
      P(x, 5, 2 + oy, shade(hair, 0.25));
    }
    // hat
    const hat = look.hat || 'none';
    if (hat === 'cap') { R(x, 3, 1 + oy, 10, 2, '#c0392b'); R(x, 4, 0 + oy, 8, 1, '#c0392b'); if (!back) R(x, side ? 0 : 3, 3 + oy, side ? 5 : 10, 1, '#96281b'); }
    else if (hat === 'straw') { R(x, 4, 0 + oy, 8, 2, '#e9c46a'); R(x, 1, 2 + oy, 14, 1, '#e9c46a'); R(x, 1, 3 + oy, 14, 1, '#d4a93f'); P(x, 5, 1 + oy, '#c0392b'); }
    else if (hat === 'beanie') { R(x, 3, 0 + oy, 10, 3, '#8e44ad'); R(x, 3, 3 + oy, 10, 1, '#6c3483'); P(x, 7, -1 + oy < 0 ? 0 : -1 + oy, '#ffffff'); }
    else if (hat === 'crown') { R(x, 4, 0 + oy, 8, 2, '#f7d94c'); P(x, 4, -1 + oy < 0 ? 0 : 0, '#f7d94c'); P(x, 7, 0 + oy, '#e63946'); P(x, 11, 0 + oy, '#f7d94c'); }
    else if (hat === 'flower') { P(x, 11, 2 + oy, '#ff8fab'); P(x, 12, 1 + oy, '#ff8fab'); P(x, 10, 1 + oy, '#ff8fab'); P(x, 11, 1 + oy, '#f7d94c'); }
    if (mirror) x.setTransform(1, 0, 0, 1, 0, 0);
    cache.set(key, c); return c;
  }

  // ---------------- ITEM ICONS ----------------
  const ICON_MAPS = {
    wood: ['................', '................', '....bbbbbbbb....', '...bccccccccb...', '..bcCcccccccCb..', '..bcccBBBBcccb..', '..bccBccccBccb..', '..bccBcBBcBccb..', '..bccBccccBccb..', '..bcccBBBBcccb..', '..bcccccccccb...', '...bbbbbbbbb....', '................', '................', '................', '................'],
    stone: ['................', '................', '................', '.....ssss.......', '....sSSSSs......', '...sSSSSSSs.....', '..sSSSsSSSSs....', '..sSSSSSSSSs....', '.sSSSSSSSsSSs...', '.sdSSSSSSSSSs...', '..ddssssssdd....', '...dddddddd.....', '................', '................', '................', '................'],
    ore: ['................', '................', '................', '.....ssss.......', '....sSSSSs......', '...sSnnSSSs.....', '..sSSnnSSSSs....', '..sSSSSSnnSs....', '.sSnnSSSnnSSs...', '.sdnnSSSSSSSs...', '..ddssssssdd....', '...dddddddd.....', '................', '................', '................', '................'],
    berry: ['................', '................', '......L.........', '.....LL.L.......', '....rr.LL.......', '...rrrr..rr.....', '...rwrr.rrrr....', '...rrrr.rwrr....', '....rr..rrrr....', '.........rr.....', '..rr............', '.rrrr...rr......', '.rwrr..rrrr.....', '.rrrr..rwrr.....', '..rr...rrrr.....', '........rr......'],
    flower: ['................', '................', '.....pp.........', '....pypp........', '.....pp.....yy..', '......L....yryy.', '......L.....yy..', '......L....L....', '..rr..L...L.....', '.ryrr.LL.L......', '..rr...LL.......', '...L...L........', '...LL..L........', '....LLL.........', '......L.........', '................'],
    mushroom: ['................', '................', '.....rrrrrr.....', '....rrwrrrrr....', '...rrrrrrwrrr...', '...rrrrrrrrrr...', '...rrrrrrrrrr...', '....eeeeeeee....', '......eeee......', '......eeee......', '......eeee......', '......eeee......', '.....eEEEEe.....', '................', '................', '................'],
    coconut: ['................', '................', '......bbbb......', '....bbBBBBbb....', '...bBBBBBBBBb...', '...bBBqqBBBBb...', '..bBBBqqBBBBBb..', '..bBBBBBBBBBBb..', '..bBBBBBBBqqBb..', '...bBBBBBBqqb...', '...bBBBBBBBBb...', '....bbBBBBbb....', '......bbbb......', '................', '................', '................'],
    sapling: ['................', '................', '.......L........', '......LlL.......', '.....LLtLL......', '....LLLtLLL.....', '.....LLtLL......', '......LtL.......', '.......t........', '.......t........', '.......t........', '....bbbbbbb.....', '.....bbbbb......', '................', '................', '................'],
    bread: ['................', '................', '................', '.....HHHHHH.....', '...HHhhhhhhHH...', '..HhhhhhhhhhhH..', '..HhhHhhhhHhhH..', '..HhhhhhhhhhhH..', '...HHHHHHHHHH...', '....CCCCCCCC....', '................', '................', '................', '................', '................', '................'],
    salad: ['................', '................', '....LlLLlL......', '...LlLrLLlLL....', '..LLLLLLnLLLL...', '..LrLLLlLLLrL...', '.eEEEEEEEEEEEe..', '.eEEEEEEEEEEEe..', '..eEEEEEEEEEe...', '...eeeeeeeee....', '................', '................', '................', '................', '................', '................'],
    soup: ['................', '................', '................', '..eeeeeeeeeeee..', '.eEnnnnnnnnnnEe.', '.eEnnHnnnnHnnEe.', '.eEnnnnnnnnnnEe.', '..eEEEEEEEEEEe..', '...eeeeeeeeee...', '....eEEEEEEe....', '.....eeeeee.....', '................', '................', '................', '................', '................'],
    fried_rice: ['................', '................', '................', '..hhhhhhhhhhhh..', '.hhHhhyhhhrhhhh.', '.hhhhLhhhhhhHhh.', '.hhrhhhhyhhhhhh.', '..eeeeeeeeeeee..', '..eEEEEEEEEEEe..', '...eeeeeeeeee...', '................', '................', '................', '................', '................', '................'],
    somtam: ['................', '................', '...LL...........', '..LLLL.rr.......', '..hhhhhhhhhhh...', '.hhhrhhhhhrhhh..', '.hhhhhhLhhhhhh..', '.hhhLhhhhhhrhh..', '..bbbbbbbbbbb...', '..bBBBBBBBBBb...', '...bbbbbbbbb....', '................', '................', '................', '................', '................'],
    axe: ['................', '.......sss......', '......sSSSs.....', '.....sSSSSs.....', '....sSSSSss.....', '....sSSSSs......', '....ssssbb......', '.......bb.......', '......bb........', '......bb........', '.....bb.........', '.....bb.........', '....bb..........', '....bb..........', '...bb...........', '................'],
    pickaxe: ['................', '......ssss......', '....ssSSSSss....', '...sSSSSSSSSs...', '...sSsssbsssSs..', '...ss...bb..ss..', '........bb......', '.......bb.......', '.......bb.......', '......bb........', '......bb........', '.....bb.........', '.....bb.........', '....bb..........', '................', '................'],
    hoe: ['................', '..........sss...', '.........sSSSs..', '........sSSSss..', '........bbSSs...', '.......bb.ss....', '......bb........', '......bb........', '.....bb.........', '.....bb.........', '....bb..........', '....bb..........', '...bb...........', '...bb...........', '................', '................'],
    can: ['................', '................', '................', '......aaaaa.....', '.....aAAAAAa....', '..aa.aAAAAAaaa..', '.a.a.aAAAAAaaa..', '.a..aaAAAAAaa...', '..a.aAAAAAAa....', '..aaaAAAAAAa....', '.....aAAAAAa....', '.....aAAAAAa....', '.....aaaaaaa....', '................', '................', '................'],
    hammer: ['................', '......ssssss....', '.....sSSSSSSs...', '.....sSSSSSSs...', '.....sSSbbSSs...', '.....ssssbbss...', '........bb......', '........bb......', '.......bb.......', '.......bb.......', '......bb........', '......bb........', '.....bb.........', '.....bb.........', '................', '................'],
    hand: ['................', '................', '......ii........', '.....iiii.ii....', '.....iiiiiii....', '....iiiiiiii....', '..i.iiiiiiii....', '..iiiiiiiiii....', '...iiiiiiiii....', '....iiiiiii.....', '....iiiiiii.....', '.....iiiii......', '.....iiiii......', '................', '................', '................'],
    seed: ['................', '................', '................', '....bbbbbbbb....', '...bccccccccb...', '...bcCcccCccb...', '...bccccccccb...', '...bcBBBBBBcb...', '...bcB....Bcb...', '...bcB....Bcb...', '...bcBBBBBBcb...', '...bccccccccb...', '...bccccccccb...', '....bbbbbbbb....', '................', '................'],
  };
  const CROP_ICON = { carrot: ['................', '.......L.L......', '......LLLL......', '.......LL.......', '......nnnn......', '.....nnnnnn.....', '.....nnnnnn.....', '.....nnnnnn.....', '......nnnn......', '......nnnn......', '......nnnn......', '.......nn.......', '.......nn.......', '................', '................', '................'],
    tomato: ['................', '................', '.......LL.......', '......LLLL......', '....rrrrrrrr....', '...rrrrrrrrrr...', '..rrwrrrrrrrrr..', '..rrrrrrrrrrrr..', '..rrrrrrrrrrrr..', '..rrrrrrrrrrrr..', '...rrrrrrrrrr...', '....rrrrrrrr....', '................', '................', '................', '................'],
    corn: ['................', '......LL........', '.....LyyL.......', '....LyyyyL......', '....LyyyyL......', '...LyyyyyyL.....', '...LyyyyyyL.....', '...LyyyyyyL.....', '...LLyyyyLL.....', '....LyyyyL......', '....LLyyLL......', '.....LLLL.......', '......LL........', '................', '................', '................'],
    pumpkin: ['................', '................', '.......LL.......', '......LL........', '...nnnnnnnnnn...', '..nnnnnnnnnnnn..', '.nnnnnnnnnnnnnn.', '.nnnnnnnnnnnnnn.', '.nnnnnnnnnnnnnn.', '.nnnnnnnnnnnnnn.', '..nnnnnnnnnnnn..', '...nnnnnnnnnn...', '................', '................', '................', '................'],
    strawberry: ['................', '................', '......LLLL......', '.....LLLLLL.....', '....rrrrrrrr....', '...rrrwrrrrrr...', '...rrrrrrwrrr...', '...rrwrrrrrrr...', '....rrrrrwrr....', '....rrrrrrrr....', '.....rrrrrr.....', '......rrrr......', '.......rr.......', '................', '................', '................'],
    cabbage: ['................', '................', '.....LLLLLL.....', '....LlllllLL....', '...LlllllllLL...', '..LllllllllllL..', '..LlllllllllLL..', '..LlllllllllLL..', '..LlllllllllLL..', '...LlllllllLL...', '....LLLLLLLL....', '................', '................', '................', '................', '................'],
    chili: ['................', '................', '.........LL.....', '........LL......', '.......rr.......', '......rrr.......', '.....rrrr.......', '.....rrr........', '....rrrr........', '....rrr.........', '...rrr..........', '...rr...........', '..rr............', '................', '................', '................'],
    rice: ['................', '................', '................', '................', '....hhhhhhhh....', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..eEEEEEEEEEEe..', '..eEEEEEEEEEEe..', '...eEEEEEEEEe...', '....eeeeeeee....', '................', '................', '................', '................', '................'],
  };
  function fishIcon(fid) {
    const f = D.FISH[fid]; const c = mk(16, 16), x = ctxOf(c);
    const col = f.color, col2 = f.color2, dark = shade(col, -0.35);
    const shp = f.shape;
    if (shp === 'round') { R(x, 4, 4, 8, 8, col); R(x, 5, 3, 6, 1, col); R(x, 5, 12, 6, 1, col); R(x, 3, 6, 1, 4, col); R(x, 12, 6, 1, 4, col); R(x, 6, 6, 4, 3, col2); R(x, 1, 5, 2, 6, dark); P(x, 2, 7, col); P(x, 10, 5, '#fff'); P(x, 11, 5, '#111'); }
    else if (shp === 'long') { R(x, 2, 7, 12, 3, col); R(x, 4, 6, 8, 1, col2); R(x, 4, 10, 8, 1, dark); R(x, 0, 6, 2, 5, dark); P(x, 1, 8, col); P(x, 12, 7, '#111'); R(x, 6, 5, 3, 1, col2); }
    else if (shp === 'flat') { R(x, 5, 3, 6, 10, col); R(x, 4, 5, 8, 6, col); R(x, 6, 5, 4, 6, col2); R(x, 12, 6, 2, 4, dark); R(x, 3, 1, 2, 3, dark); R(x, 3, 12, 2, 3, dark); P(x, 6, 6, '#fff'); P(x, 6, 7, '#111'); }
    else if (shp === 'big') { R(x, 2, 5, 11, 7, col); R(x, 4, 4, 7, 1, col); R(x, 4, 12, 7, 1, dark); R(x, 5, 7, 6, 2, col2); R(x, 0, 4, 2, 9, dark); P(x, 1, 8, col); R(x, 6, 2, 3, 2, dark); P(x, 11, 6, '#fff'); P(x, 12, 6, '#111'); }
    else { R(x, 3, 6, 10, 5, col); R(x, 5, 5, 6, 1, col); R(x, 5, 11, 6, 1, dark); R(x, 6, 7, 4, 2, col2); R(x, 1, 5, 2, 7, dark); P(x, 2, 8, col); R(x, 7, 4, 2, 1, dark); P(x, 11, 7, '#fff'); P(x, 12, 7, '#111'); }
    if (f.rarity >= 4) { P(x, 2, 2, '#ffe08a'); P(x, 13, 13, '#ffe08a'); P(x, 13, 2, '#ffffff'); }
    return c;
  }
  function itemIcon(id) {
    const key = `i_${id}`;
    if (cache.has(key)) return cache.get(key);
    const it = D.ITEMS[id] || {};
    let c;
    if (it.fish) {
      c = fishIcon(it.fish);
    } else if (it.tool === 'rod') {
      c = mk(16, 16); const x = ctxOf(c); const col = { 1: '#8b5a2b', 2: '#c8863c', 3: '#6c7a89', 4: '#b08d57', 5: '#1b1b1b' }[it.tier] || '#8b5a2b';
      for (let i = 0; i < 11; i++) P(x, 2 + i, 13 - i, col); for (let i = 0; i < 11; i++) P(x, 3 + i, 13 - i, shade(col, -0.3)); R(x, 13, 2, 1, 8, '#e0e0e0'); P(x, 12, 10, '#e0e0e0'); P(x, 12, 11, '#c0392b'); P(x, 13, 11, '#c0392b'); P(x, 12, 12, '#8a8a8a');
    } else if (it.cat === 'mat' && it.color) { // ingot / bundle
      c = mk(16, 16); const x = ctxOf(c); const col = it.color; R(x, 3, 6, 10, 6, col); R(x, 3, 6, 10, 1, shade(col, 0.3)); R(x, 3, 11, 10, 1, shade(col, -0.35)); R(x, 12, 6, 1, 6, shade(col, -0.35)); R(x, 2, 9, 12, 4, shade(col, -0.15)); R(x, 2, 12, 12, 1, shade(col, -0.4));
    } else if (it.cat === 'weapon') {
      c = mk(16, 16); const x = ctxOf(c); const gun = /gun|rifle|revolver|laser|taser|smg|rail|shot/.test(id) || id === 'sling' || id === 'bow' || id === 'crossbow';
      if (gun) { R(x, 2, 7, 11, 3, '#3a3a3a'); R(x, 11, 6, 3, 2, '#555'); R(x, 4, 10, 3, 4, '#7a4a22'); R(x, 7, 10, 2, 2, '#3a3a3a'); if (/laser|plasma|rail|taser/.test(id)) R(x, 3, 8, 8, 1, '#7cf2ff'); }
      else { for (let i = 0; i < 9; i++) R(x, 3 + i, 12 - i, 2, 1, '#d6e4f0'); for (let i = 0; i < 9; i++) P(x, 4 + i, 12 - i, '#8fa3b8'); R(x, 2, 12, 4, 1, '#f7d94c'); R(x, 2, 13, 2, 2, '#7a4a22'); if (/club|mace|hammer|axe/.test(id)) { R(x, 9, 2, 5, 5, '#8a8a8a'); } }
    } else if (id === 'egg' || id === 'dino_egg') {
      c = mk(16, 16); const x = ctxOf(c); const col = id === 'egg' ? '#f5e6c8' : '#9fd59a'; R(x, 5, 3, 6, 10, col); R(x, 4, 5, 8, 6, col); R(x, 6, 4, 2, 2, '#ffffff'); if (id === 'dino_egg') { P(x, 6, 8, '#4e9e3c'); P(x, 9, 10, '#4e9e3c'); P(x, 8, 6, '#4e9e3c'); }
    } else if (id === 'meat' || id === 'poultry' || id === 'dino_meat') {
      c = mk(16, 16); const x = ctxOf(c); const col = id === 'poultry' ? '#e8b4a0' : id === 'dino_meat' ? '#8e2a2a' : '#c0392b'; R(x, 3, 5, 9, 7, col); R(x, 4, 4, 7, 1, shade(col, 0.2)); R(x, 11, 8, 4, 2, '#e8e0c8'); P(x, 14, 7, '#e8e0c8'); P(x, 14, 10, '#e8e0c8'); P(x, 6, 7, shade(col, 0.3));
    } else if (it.food && !ICON_MAPS[id] && !CROP_ICON[id]) {
      c = mk(16, 16); const x = ctxOf(c); const h = hash(id.length, id.charCodeAt(0), 7); const col = ['#f28c28', '#e63946', '#f5d33f', '#9fd59a', '#ffe08a', '#d62828', '#c9a063'][Math.floor(h * 7)];
      R(x, 2, 10, 12, 3, '#ececec'); R(x, 3, 13, 10, 1, '#bdbdbd'); R(x, 4, 6, 8, 4, col); R(x, 5, 5, 6, 1, shade(col, 0.3)); P(x, 6, 7, shade(col, -0.3)); P(x, 9, 8, shade(col, 0.4)); if (/tea|coffee|shake|smoothie|wine/.test(id)) { R(x, 5, 3, 6, 9, col); R(x, 5, 3, 6, 1, '#ffffff'); R(x, 4, 12, 8, 1, '#ececec'); }
    } else if (it.vehicle) {
      const spr = vehicleSprite(it.vehicle, 'right', 0); c = mk(16, 16); const x = ctxOf(c);
      if (spr.width === 24) x.drawImage(spr, 0, 0, 24, 16, 0, 3, 16, 11); else x.drawImage(spr, 0, 0);
    } else if (id === 'axe_iron' || id === 'pickaxe_iron') {
      c = mk(16, 16); const x = ctxOf(c); drawMap(x, ICON_MAPS[id.replace('_iron', '')], { ...PAL, s: '#5d6d7e', S: '#d6e4f0', b: '#3b2a1a' }, 16, 16);
    } else if (it.obj) { // use object sprite, fit into 16x16
      const spr = objSprite({ t: it.obj, b: 1 }, 0);
      c = mk(16, 16); const x = ctxOf(c);
      if (spr.height > 16) x.drawImage(spr, 0, 0, 16, spr.height, 3, 0, 10, 16); else x.drawImage(spr, 0, 0);
    } else if (it.tile != null) {
      const spr = tileSprite(it.tile, 0, 0);
      c = mk(16, 16); const x = ctxOf(c); x.drawImage(spr, 2, 2, 12, 12); R(x, 1, 1, 14, 1, '#00000055'); R(x, 1, 1, 1, 14, '#00000055');
    } else {
      c = mk(16, 16); const x = ctxOf(c);
      if (it.crop) { drawMap(x, ICON_MAPS.seed, PAL, 16, 16); const cd = D.CROPS[it.crop]; R(x, 6, 8, 4, 3, cd.color); P(x, 7, 7, cd.leaf); P(x, 8, 7, cd.leaf); }
      else if (CROP_ICON[id]) drawMap(x, CROP_ICON[id], PAL, 16, 16);
      else if (ICON_MAPS[id]) drawMap(x, ICON_MAPS[id], PAL, 16, 16);
      else { R(x, 3, 3, 10, 10, '#c9a063'); }
    }
    cache.set(key, c); return c;
  }
  function iconDataURL(id) {
    const key = `iu_${id}`;
    if (cache.has(key)) return cache.get(key);
    const u = itemIcon(id).toDataURL(); cache.set(key, u); return u;
  }

  // ---------------- MOBS ----------------
  const SLIME = [
    ['................', '................', '................', '.....mmmmmm.....', '...mmMMMMMMmm...', '..mMMMMMMMMMMm..', '..mMMwMMMMwMMm..', '.mMMMzMMMMzMMMm.', '.mMMMMMMMMMMMMm.', '.mMMMMMzzMMMMMm.', '.mMMMMMMMMMMMMm.', '..mmMMMMMMMMmm..', '...mmmmmmmmmm...', '................', '................', '................'],
    ['................', '................', '................', '................', '................', '....mmmmmmmm....', '..mmMMMMMMMMmm..', '.mMMMwMMMMwMMMm.', '.mMMMzMMMMzMMMm.', 'mMMMMMMMMMMMMMMm', 'mMMMMMMzzMMMMMMm', 'mMMMMMMMMMMMMMMm', '.mmmmmmmmmmmmmm.', '................', '................', '................'],
  ];
  function mobSprite(t, v, frame, hurt) {
    const key = `mob_${t}_${v}_${frame}_${hurt ? 1 : 0}`;
    if (cache.has(key)) return cache.get(key);
    const c = mk(S, S), x = ctxOf(c);
    const col = (D.MOBS[t] && D.MOBS[t].variants[v] && D.MOBS[t].variants[v].color) || '#5fbd55';
    const pal = { m: hurt ? '#ffffff' : shade(col, -0.35), M: hurt ? '#ffdddd' : col, w: '#ffffff', z: '#1b1b1b' };
    drawMap(x, SLIME[frame ? 1 : 0], pal, S, S);
    if (!hurt) { P(x, 5, frame ? 7 : 5, shade(col, 0.45)); P(x, 6, frame ? 7 : 5, shade(col, 0.45)); }
    cache.set(key, c); return c;
  }

  // ---------------- ANIMALS (procedural, 32x32 grid, facing right) ----------------
  function animalSprite(id, frame, hurt) {
    const key = `an_${id}_${frame ? 1 : 0}_${hurt ? 1 : 0}`;
    if (cache.has(key)) return cache.get(key);
    const a = D.ANIMALS[id]; const c = mk(32, 32), x = ctxOf(c);
    const C = hurt ? '#ffffff' : a.color, C2 = hurt ? '#ffdddd' : a.color2, Cd = shade(a.color, -0.35), eye = '#111', beak = '#f28c28';
    const f = frame ? 1 : 0; const B = 32; // baseline at y=30
    const legs = (x0, w, n, h, gap) => { for (let i = 0; i < n; i++) { const off = (i % 2 === f) ? 1 : 0; R(x, x0 + i * gap, B - 2 - h + off, w, h - off, Cd); } };
    const has = (k) => a.drops.some(d => d[0] === k);
    switch (a.shape) {
      case 'quad_s': case 'quad': case 'quad_b': case 'tall': {
        const big = a.shape === 'quad_b', small = a.shape === 'quad_s', tall = a.shape === 'tall';
        const bh = big ? 12 : small ? 7 : 9, bw = big ? 20 : small ? 12 : 16, bx = 4, by = B - 2 - (big ? 7 : small ? 5 : 6) - bh;
        R(x, bx, by, bw, bh, C); R(x, bx + 2, by + bh - 3, bw - 4, 3, C2); // body + belly
        // head
        const hx = bx + bw - 2, hy = tall ? by - 12 : by - (big ? 4 : 3); const hw = big ? 9 : small ? 6 : 7, hh = big ? 8 : small ? 5 : 6;
        if (tall) { R(x, hx - 1, by - 10, 4, 11, C); for (let i = 0; i < 4; i++) P(x, hx, by - 8 + i * 3, C2); }
        R(x, hx, hy, hw, hh, C); P(x, hx + hw - 2, hy + 2, eye); R(x, hx + hw - 1, hy + hh - 2, 1, 1, Cd);
        R(x, hx + 1, hy - 2, 2, 2, C); R(x, hx + hw - 3, hy - 2, 2, 2, C); // ears
        if (has('horn')) { R(x, hx + 1, hy - 5, 1, 4, '#e8e0c8'); R(x, hx + hw - 2, hy - 5, 1, 4, '#e8e0c8'); }
        if (has('ivory')) { R(x, hx + hw - 1, hy + hh - 4, 3, 1, '#fdf6e3'); R(x, hx + hw, hy + hh - 1, 2, 5, C); } // tusk + trunk
        if (a.id === 'lion') { R(x, hx - 2, hy - 2, 4, hh + 4, '#8a5a2a'); }
        if (a.id === 'tiger' || a.id === 'zebra') for (let i = 0; i < bw; i += 4) R(x, bx + i, by, 1, bh, C2);
        if (a.id === 'leopard' || a.id === 'snow_leopard' || a.id === 'giraffe') for (let i = 2; i < bw - 2; i += 4) for (let j = 1; j < bh - 2; j += 4) P(x, bx + i, by + j, C2);
        if (a.id === 'cow' || a.id === 'panda' || a.id === 'buffalo') { R(x, bx + 3, by + 1, 4, 4, C2); R(x, bx + bw - 7, by + 2, 4, 3, C2); }
        if (a.id === 'sheep' || a.id === 'yak' || a.id === 'mammoth') { for (let i = 0; i < bw; i += 3) P(x, bx + i, by - 1, C2); }
        if (a.id === 'unicorn') { R(x, hx + 3, hy - 6, 1, 5, '#ffd166'); }
        R(x, bx - 3, by + 1, 3, 2, Cd); // tail
        legs(bx + 1, big ? 3 : 2, big ? 4 : 4, big ? 7 : small ? 5 : 6, big ? 5 : small ? 3 : 4);
        break;
      }
      case 'small': { R(x, 8, 18, 14, 9, C); R(x, 10, 24, 10, 3, C2); R(x, 19, 14, 8, 7, C); P(x, 25, 16, eye); R(x, 20, 12, 2, 2, C); R(x, 24, 12, 2, 2, C); R(x, 4, 16, 4, 3, Cd); legs(10, 2, 3, 3, 4); if (a.id === 'pangolin' || a.id === 'turtle') for (let i = 0; i < 12; i += 3) R(x, 9 + i, 18, 2, 1, Cd); break; }
      case 'long': { for (let i = 0; i < 24; i++) { const yy = 22 + Math.round(Math.sin((i + f * 2) / 3) * 2); R(x, 3 + i, yy, 1, 5, i % 4 < 2 ? C : C2); } R(x, 25, 19, 6, 6, C); P(x, 29, 21, eye); R(x, 31, 23, 1, 1, '#e63946'); if (a.id === 'croc' || a.id === 'lizard') { legs(8, 2, 2, 3, 10); for (let i = 0; i < 6; i++) P(x, 5 + i * 4, 20, Cd); } break; }
      case 'bird': case 'bird_b': {
        const big = a.shape === 'bird_b'; const bw = big ? 12 : 9, bh = big ? 8 : 6, bx = 8, by = B - 2 - (big ? 9 : 4) - bh;
        R(x, bx, by, bw, bh, C); R(x, bx + 2, by + bh - 2, bw - 4, 2, C2);
        if (big) { R(x, bx + bw - 2, by - 8, 3, 9, C); R(x, bx + bw - 3, by - 12, 6, 5, C); P(x, bx + bw + 1, by - 10, eye); R(x, bx + bw + 3, by - 9, 3, 2, beak); }
        else { R(x, bx + bw - 2, by - 4, 5, 5, C); P(x, bx + bw + 1, by - 2, eye); R(x, bx + bw + 3, by - 1, 3, 1, beak); }
        R(x, bx + 1, by + 1, 5, 3, C2); // wing
        R(x, bx - 3, by - 1, 3, 2, C2); // tail
        if (a.id === 'peacock') for (let i = 0; i < 5; i++) { R(x, bx - 4 - i, by - 6 + i, 2, 8 - i, i % 2 ? C2 : C); }
        legs(bx + 3, 1, 2, big ? 9 : 4, 4);
        break;
      }
      case 'fly': case 'fly_b': {
        const big = a.shape === 'fly_b'; const bw = big ? 12 : 8, bh = big ? 6 : 4, bx = 10, by = 14;
        R(x, bx, by, bw, bh, C); R(x, bx + bw - 1, by - 2, 5, 4, C); P(x, bx + bw + 2, by - 1, eye); R(x, bx + bw + 4, by, 3, 1, beak);
        const wy = f ? by - 6 : by + 2; const wh = 5;
        for (let i = 0; i < (big ? 10 : 7); i++) { R(x, bx + 1 + i, f ? wy + i * 0.6 : wy + 3 - i * 0.5, 1, wh, i % 2 ? C2 : C); R(x, bx + bw - 2 - i, f ? wy + i * 0.6 : wy + 3 - i * 0.5, 1, wh, i % 2 ? C2 : C); }
        R(x, bx - 3, by + 1, 3, 2, C2);
        break;
      }
      case 'raptor': case 'trex': {
        const big = a.shape === 'trex'; const bw = big ? 14 : 10, bh = big ? 10 : 6, bx = 8, by = B - 2 - (big ? 10 : 7) - bh;
        for (let i = 0; i < 8; i++) R(x, bx - 8 + i, by + 3 + Math.round(i * 0.4), 1, big ? 4 - Math.floor(i / 3) : 3 - Math.floor(i / 3), C); // tail
        R(x, bx, by, bw, bh, C); R(x, bx + 2, by + bh - 3, bw - 4, 3, C2);
        const hw = big ? 11 : 7, hh = big ? 8 : 5; const hx = bx + bw - 3, hy = by - hh + 2;
        R(x, hx, hy, hw, hh, C); P(x, hx + hw - 3, hy + 2, eye); R(x, hx + 2, hy + hh - 1, hw - 3, 1, Cd);
        if (big) for (let i = 0; i < hw - 4; i += 2) P(x, hx + 2 + i, hy + hh - 2, '#fff'); // teeth
        R(x, bx + bw - 3, by + bh - 1, 2, 3, Cd); // arm
        if (a.id === 'dilo' || a.id === 'carnotaurus') { R(x, hx + 3, hy - 3, 2, 3, C2); R(x, hx + hw - 4, hy - 3, 2, 3, C2); }
        if (a.id === 'parasaur') R(x, hx + 1, hy - 5, 2, 6, C2);
        if (a.id === 'dino_king') { R(x, hx + 2, hy - 4, 7, 4, '#ffd166'); P(x, hx + 3, hy - 5, '#ffd166'); P(x, hx + 7, hy - 5, '#ffd166'); }
        legs(bx + 3, big ? 4 : 3, 2, big ? 10 : 7, big ? 7 : 5);
        break;
      }
      case 'sauro': {
        R(x, 6, 16, 16, 9, C); R(x, 8, 22, 12, 3, C2);
        for (let i = 0; i < 9; i++) R(x, 5 - i * 0.5, 17 + i * 0.3, 1, 4 - Math.floor(i / 3), C); // tail
        for (let i = 0; i < 10; i++) R(x, 21 + i * 0.6, 15 - i, 3, 2, C); // neck
        R(x, 25, 3, 6, 4, C); P(x, 29, 4, eye); legs(8, 3, 4, 7, 4);
        break;
      }
      case 'cera': {
        R(x, 6, 16, 16, 9, C); R(x, 8, 22, 12, 3, C2); R(x, 2, 18, 4, 3, C);
        R(x, 20, 9, 8, 10, C2); R(x, 22, 12, 9, 7, C); P(x, 29, 14, eye); // frill + head
        R(x, 27, 8, 1, 5, '#e8e0c8'); R(x, 30, 9, 1, 4, '#e8e0c8'); R(x, 31, 15, 1, 3, '#e8e0c8');
        legs(8, 3, 4, 7, 4);
        break;
      }
      case 'stego': {
        R(x, 6, 17, 17, 8, C); R(x, 8, 22, 13, 3, C2); for (let i = 0; i < 6; i++) { R(x, 7 + i * 3, 11 + (i % 2) * 2, 2, 6 - (i % 2) * 2, C2); }
        R(x, 22, 19, 7, 5, C); P(x, 27, 21, eye); R(x, 2, 19, 4, 3, C); P(x, 1, 18, '#e8e0c8'); P(x, 1, 22, '#e8e0c8');
        legs(8, 3, 4, 7, 4);
        if (a.id === 'dimetrodon') { for (let i = 0; i < 12; i++) R(x, 8 + i, 8 + Math.abs(i - 6), 1, 10 - Math.abs(i - 6), i % 2 ? C2 : C); }
        break;
      }
      case 'anky': {
        R(x, 4, 19, 20, 7, C); R(x, 6, 24, 16, 2, C2); for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) P(x, 6 + i * 2, 20 + j * 3, Cd);
        R(x, 23, 20, 7, 5, C); P(x, 28, 22, eye); R(x, 0, 21, 4, 2, C); R(x, 0, 19, 3, 5, Cd); legs(7, 3, 4, 5, 4);
        break;
      }
      case 'ptero': {
        const wy = f ? 8 : 16;
        for (let i = 0; i < 12; i++) { R(x, 3 + i, f ? wy + i : wy + 6 - i * 0.5, 1, 4, i % 3 ? C2 : C); R(x, 28 - i, f ? wy + i : wy + 6 - i * 0.5, 1, 4, i % 3 ? C2 : C); }
        R(x, 12, 17, 9, 5, C); R(x, 20, 14, 7, 4, C); R(x, 26, 15, 5, 2, Cd); R(x, 19, 10, 3, 5, C2); P(x, 24, 15, eye);
        break;
      }
      default: R(x, 8, 16, 16, 12, C);
    }
    cache.set(key, c); return c;
  }

  // ---------------- UI ICONS (no emoji) ----------------
  const UI_MAPS = {
    heart: ['................', '..rrr.....rrr...', '.rrrrr...rrrrr..', 'rrrrrrr.rrrrrrr.', 'rrrwrrrrrrrrrrr.', 'rrwwrrrrrrrrrrr.', 'rrrrrrrrrrrrrrr.', '.rrrrrrrrrrrrr..', '..rrrrrrrrrrr...', '...rrrrrrrrr....', '....rrrrrrr.....', '.....rrrrr......', '......rrr.......', '.......r........', '................', '................'],
    bolt: ['................', '........yyyy....', '.......yyyy.....', '......yyyy......', '.....yyyy.......', '....yyyyyyyy....', '...yyyyyyyy.....', '......yyyy......', '.....yyyy.......', '....yyyy........', '...yyyy.........', '..yyy...........', '..yy............', '................', '................', '................'],
    star: ['................', '.......yy.......', '.......yy.......', '......yyyy......', '......yyyy......', '.yyyyyyyyyyyyyy.', '..yyyyyyyyyyyy..', '...yyyyyyyyyy...', '....yyyyyyyy....', '....yyyyyyyy....', '...yyyyyyyyyy...', '...yyyy..yyyy...', '..yyy......yyy..', '..y..........y..', '................', '................'],
    drop: ['................', '.......uu.......', '.......uu.......', '......uuuu......', '......uuuu......', '.....uuuuuu.....', '....uuuuuuuu....', '....uuwuuuuu....', '...uuuwuuuuuu...', '...uuwuuuuuuu...', '...uuuuuuuuuu...', '....uuuuuuuu....', '.....uuuuuu.....', '.......uu.......', '................', '................'],
    coin: ['................', '.....yyyyyy.....', '...yyHHHHHHyy...', '..yHHhhhhhhHHy..', '.yHhhhhhhhhhhHy.', '.yHhhhHHHHhhhHy.', '.yHhhHhhhhhhhHy.', '.yHhhHhhhhhhhHy.', '.yHhhHhhhhhhhHy.', '.yHhhhHHHHhhhHy.', '.yHhhhhhhhhhhHy.', '..yHHhhhhhhHHy..', '...yyHHHHHHyy...', '.....yyyyyy.....', '................', '................'],
    bread: ICON_MAPS.bread,
    warn: ['................', '.......rr.......', '......rrrr......', '......rrrr......', '.....rrwwrr.....', '.....rrwwrr.....', '....rrrwwrrr....', '....rrrwwrrr....', '...rrrrwwrrrr...', '...rrrrrrrrrr...', '..rrrrrwwrrrrr..', '..rrrrrwwrrrrr..', '.rrrrrrrrrrrrrr.', '.rrrrrrrrrrrrrr.', '................', '................'],
    scroll: ['................', '...bbbbbbbbbb...', '..bccccccccccb..', '..bccccccccccb..', '..bcBBBBBBBBcb..', '..bccccccccccb..', '..bcBBBBBBcccb..', '..bccccccccccb..', '..bcBBBBBBBBcb..', '..bccccccccccb..', '..bcBBBBBcccccb.', '..bccccccccccb..', '..bccccccccccb..', '...bbbbbbbbbb...', '................', '................'],
    map: ['................', '.oooooooooooooo.', '.oLLLuuLLLLLLLo.', '.oLLuuuuLLLccLo.', '.oLLLuuuuLLLcLo.', '.oLLLLuuuLLLLLo.', '.oLLLLLuuLLLLLo.', '.oLLLLLLuuLLLLo.', '.oLLccLLLuuLLLo.', '.oLLccLLLLuuLLo.', '.oLLLLLLLLLuuLo.', '.oLLLLLLLLLLuLo.', '.oLLLLLLLLLLLLo.', '.oooooooooooooo.', '................', '................'],
    friends: ['................', '....uu....UU....', '...uuuu..UUUU...', '...uuuu..UUUU...', '....uu....UU....', '..uuuuuuUUUUUU..', '.uuuuuuuUUUUUUU.', '.uuuuuuuUUUUUUU.', '.uuuuuuuUUUUUUU.', '.uuuuuuuUUUUUUU.', '.uuuuuuuUUUUUUU.', '.uuuuuuuUUUUUUU.', '................', '................', '................', '................'],
    gear: ['................', '......gggg......', '..gg.gggggg.gg..', '..gggggggggggg..', '...gggg..gggg...', '..ggg......ggg..', '.gggg......gggg.', '.gggg......gggg.', '..ggg......ggg..', '...gggg..gggg...', '..gggggggggggg..', '..gg.gggggg.gg..', '......gggg......', '................', '................', '................'],
    sun: ['................', '.......y........', '...y...y...y....', '....y.yyy.y.....', '.....yyyyy......', '..y.yyyyyyy.y...', '....yyyyyyy.....', '.yy.yyyyyyy.yy..', '....yyyyyyy.....', '..y.yyyyyyy.y...', '.....yyyyy......', '....y.yyy.y.....', '...y...y...y....', '.......y........', '................', '................'],
    moon: ['................', '......yyyy......', '....yyyyyy......', '...yyyyy........', '..yyyy..........', '..yyyy..........', '..yyyy..........', '..yyyy..........', '..yyyyy.........', '...yyyyy........', '....yyyyyyyy....', '......yyyyyy....', '................', '................', '................', '................'],
    dusk: ['................', '................', '.......n........', '...n.......n....', '.....nnnnn......', '....nnnnnnn.....', '...nnnnnnnnn....', '.n.nnnnnnnnn.n..', '...nnnnnnnnn....', 'oooooooooooooooo', 'oooooooooooooooo', '................', '................', '................', '................', '................'],
    bag: ['................', '......bbbb......', '.....bBBBBb.....', '....bbbbbbbb....', '...brrrrrrrrb...', '...brrrrrrrrb...', '..bbrrrrrrrrbb..', '..bRrrrrrrrrRb..', '..bRrrbbbbrrRb..', '..bRrrbBBbrrRb..', '..bRrrbbbbrrRb..', '..bRrrrrrrrrRb..', '..bbrrrrrrrrbb..', '...bbbbbbbbbb...', '................', '................'],
    list: ['................', '..bbbbbbbbbbbb..', '..bccccccccccb..', '..bcBcBBBBBBcb..', '..bccccccccccb..', '..bcBcBBBBBBcb..', '..bccccccccccb..', '..bcBcBBBBBBcb..', '..bccccccccccb..', '..bcBcBBBBcccb..', '..bccccccccccb..', '..bbbbbbbbbbbb..', '................', '................', '................', '................'],
    shop: ['................', '.rrrrwwrrrrwwrr.', 'rrrrwwrrrrwwrrrr', 'wwwwwwwwwwwwwwww', '.bccccccccccccb.', '.bccccccccccccb.', '.bcBBBBccBBBBcb.', '.bcByyBccBuuBcb.', '.bcByyBccBuuBcb.', '.bcBBBBccBBBBcb.', '.bccccccccccccb.', '.bbbbbbbbbbbbbb.', '................', '................', '................', '................'],
    home: ['................', '.......rr.......', '......rrrr......', '.....rrrrrr.....', '....rrrrrrrr....', '...rrrrrrrrrr...', '..rrrrrrrrrrrr..', '.rrrrrrrrrrrrrr.', '..bccccccccccb..', '..bccBBccuucb...', '..bccBBccuuccb..', '..bccBBccccccb..', '..bccBBccccccb..', '..bbbbbbbbbbbb..', '................', '................'],
    pin: ['................', '......rrrr......', '.....rrrrrr.....', '....rrrwwrrr....', '....rrrwwrrr....', '....rrrrrrrr....', '.....rrrrrr.....', '......rrrr......', '.......rr.......', '.......rr.......', '.......rr.......', '................', '................', '................', '................', '................'],
    globe: ['................', '.....uuuuuu.....', '...uuLLuuuuuu...', '..uLLLLuuuLLuu..', '.uuLLLLLuuLLLuu.', '.uuuLLLuuuLLLuu.', '.uuuuLuuuuuuuuu.', '.uuLLLLLuuuLLuu.', '.uuLLLLLLuuLLuu.', '..uuLLLLLuuuuu..', '...uuLLLuuuuu...', '.....uuuuuu.....', '................', '................', '................', '................'],
    chat: ['................', '..uuuuuuuuuuuu..', '.uuuuuuuuuuuuuu.', '.uuwwuuwwuuwwuu.', '.uuwwuuwwuuwwuu.', '.uuuuuuuuuuuuuu.', '..uuuuuuuuuuuu..', '....uuu.........', '...uu...........', '................', '................', '................', '................', '................', '................', '................'],
    cook: ['................', '.....b.....b....', '......b...b.....', '..bbbbbbbbbbbb..', '..bccccccccccb..', '.bbbbbbbbbbbbbb.', '..bssssssssssb..', '..bsSssssssssb..', '..bssssssssssb..', '..bssssssssssb..', '...bbbbbbbbbb...', '................', '................', '................', '................', '................'],
    help: ['................', '.....uuuuuu.....', '....uuuuuuuu....', '...uuu....uuu...', '...uu......uu...', '..........uuu...', '.........uuu....', '........uuu.....', '.......uuu......', '.......uu.......', '................', '.......uu.......', '.......uu.......', '................', '................', '................'],
    shirt: ['................', '..uu.......uu...', '.uuuuuuuuuuuuu..', 'uuuuuuuuuuuuuuu.', 'uuuuuuuuuuuuuuu.', 'uuu.uuuuuuu.uuu.', 'uuu.uuuuuuu.uuu.', '....uuuuuuu.....', '....uuuuuuu.....', '....uuuuuuu.....', '....uuuuuuu.....', '....uuuuuuu.....', '....uuuuuuu.....', '................', '................', '................'],
    zoom: ['................', '....uuuuu.......', '...uu...uu......', '..uu.....uu.....', '..uu.....uu.....', '..uu.....uu.....', '...uu...uu......', '....uuuuuuu.....', '..........bb....', '...........bb...', '............bb..', '................', '................', '................', '................', '................'],
    go: ['................', '................', '........b.......', '.........b......', '..........b.....', '.bbbbbbbbbbb....', '.bbbbbbbbbbbb...', '.bbbbbbbbbbb....', '..........b.....', '.........b......', '........b.......', '................', '................', '................', '................', '................'],
    plus: ['................', '................', '......bb........', '......bb........', '......bb........', '..bbbbbbbbbb....', '..bbbbbbbbbb....', '......bb........', '......bb........', '......bb........', '................', '................', '................', '................', '................', '................'],
    check: ['................', '................', '............aa..', '...........aa...', '..........aa....', '..aa.....aa.....', '...aa...aa......', '....aa.aa.......', '.....aaa........', '......a.........', '................', '................', '................', '................', '................', '................'],
    lock: ['................', '.....bbbbbb.....', '....bb....bb....', '....bb....bb....', '....bb....bb....', '..BBBBBBBBBBBB..', '..BBBBBBBBBBBB..', '..BBBBByyBBBBB..', '..BBBBByyBBBBB..', '..BBBBBByBBBBB..', '..BBBBBBBBBBBB..', '..BBBBBBBBBBBB..', '................', '................', '................', '................'],
    hand: ICON_MAPS.hand,
    zz: ['................', '..wwww..........', '....ww..........', '..ww............', '..wwww..wwwww...', '..........ww....', '........ww......', '......ww........', '......wwwww.....', '................', '................', '................', '................', '................', '................', '................'],
    spark: ['................', '.......y........', '.......y........', '......yyy.......', '..y..yyyyy..y...', '...yyyyyyyyy....', '....yyyyyyy.....', '...yyyyyyyyy....', '..y..yyyyy..y...', '......yyy.......', '.......y........', '.......y........', '................', '................', '................', '................'],
    dice: ['................', '..bbbbbbbbbbbb..', '.bwwwwwwwwwwwwb.', '.bwzzwwwwwwzzwb.', '.bwzzwwwwwwzzwb.', '.bwwwwwwwwwwwwb.', '.bwwwwwzzwwwwwb.', '.bwwwwwzzwwwwwb.', '.bwwwwwwwwwwwwb.', '.bwzzwwwwwwzzwb.', '.bwzzwwwwwwzzwb.', '.bwwwwwwwwwwwwb.', '..bbbbbbbbbbbb..', '................', '................', '................'],
    cls_knight: ['................', '.....gggggg.....', '....gGGGGGGg....', '....gGGGGGGg....', '....gGzGGzGg....', '....gGGGGGGg....', '.....gggggg.....', '....SSSSSSSS....', '...SSSSssSSSS...', '...SSSSssSSSS...', '...SSSSSSSSSS...', '...SSSSSSSSSS...', '................', '................', '................', '................'],
    cls_hunter: ['................', '.....LLLLLL.....', '....LLLLLLLL....', '....LLLLLLLL....', '.....iiiiii.....', '.....iziizi.....', '.....iiiiii.....', '......iiii......', '....LLLLLLLL....', '...LLLLLLLLLL...', '...LLbbbbbbLL...', '...LLLLLLLLLL...', '...LLLLLLLLLL...', '................', '................', '................'],
    cls_ninja: ['................', '.....zzzzzz.....', '....zzzzzzzz....', '....zzzzzzzz....', '....ziiiiiiz....', '....zizwwziz....', '....zzzzzzzz....', '.....zzzzzz.....', '....zzzzzzzz....', '...zzzrrrrzzz...', '...zzzzzzzzzz...', '...zzzzzzzzzz...', '...zzzzzzzzzz...', '................', '................', '................'],
    cls_doctor: ['................', '.....wwwwww.....', '....wwwrrwww....', '....wwrrrrww....', '....wwwrrwww....', '.....iiiiii.....', '.....iziizi.....', '.....iiiiii.....', '......iiii......', '....wwwwwwww....', '...wwwwwwwwww...', '...wwwrrrrwww...', '...wwwwwwwwww...', '................', '................', '................'],
    cls_monk: ['................', '.....iiiiii.....', '....iiiiiiii....', '....iiiiiiii....', '....iiiiiiii....', '....iziiiizi....', '....iiiiiiii....', '.....iiiiii.....', '....nnnnnnnn....', '...nnnnnnnnnn...', '...nnnnHHnnnn...', '...nnnnnnnnnn...', '...nnnnnnnnnn...', '................', '................', '................'],
    cls_bard: ['................', '....vvvvvvv.....', '...vvvvvvvvvv...', '....vvvvvvvv....', '.....iiiiii.....', '.....iziizi.....', '.....iiiiii.....', '......iiii......', '....uuuuuuuu....', '...uuuuuuuuuu...', '...uubbbbbbuu...', '...uubbbbbbuu...', '...uuuuuuuuuu...', '................', '................', '................'],
    cls_merchant: ['................', '.....yyyyyy.....', '....yyyyyyyy....', '....yyyyyyyy....', '.....iiiiii.....', '.....iziizi.....', '.....iiiiii.....', '......iiii......', '....HHHHHHHH....', '...HHHHHHHHHH...', '...HHyyyyyyHH...', '...HHHHHHHHHH...', '...HHHHHHHHHH...', '................', '................', '................'],
    cls_chef: ['................', '....wwwwwwww....', '...wwwwwwwwww...', '....wwwwwwww....', '....wwwwwwww....', '.....iiiiii.....', '.....iziizi.....', '.....iiiiii.....', '......iiii......', '....wwwwwwww....', '...wwwwwwwwww...', '...wwwwwwwwww...', '...wwwwwwwwww...', '................', '................', '................'],
    cls_explorer: ['................', '.....cccccc.....', '....cccccccc....', '..cccccccccccc..', '.....iiiiii.....', '.....iziizi.....', '.....iiiiii.....', '......iiii......', '....cccccccc....', '...cccccccccc...', '...ccbbbbbbcc...', '...cccccccccc...', '...cccccccccc...', '................', '................', '................'],
    cls_miner: ['................', '.....yyyyyy.....', '....yyyyyyyy....', '....yyyhhyyy....', '....yyyyyyyy....', '.....iiiiii.....', '.....iziizi.....', '.....iiiiii.....', '......iiii......', '....nnnnnnnn....', '...nnnnnnnnnn...', '...nnnnnnnnnn...', '...nnnnnnnnnn...', '................', '................', '................'],
    cls_farmer: ['................', '......hhhh......', '.....hhhhhh.....', '...hhhhhhhhhh...', '..HHHHHHHHHHHH..', '.....iiiiii.....', '.....iziizi.....', '.....iiiiii.....', '......iiii......', '....LLLLLLLL....', '...LLLLLLLLLL...', '...LLLLLLLLLL...', '...LLLLLLLLLL...', '................', '................', '................'],
    cls_builder: ['................', '......yyyy......', '.....yyyyyy.....', '....yyyyyyyy....', '....YYYYYYYY....', '.....iiiiii.....', '.....iziizi.....', '.....iiiiii.....', '......iiii......', '....nnnnnnnn....', '...nnnnnnnnnn...', '...nnnnnnnnnn...', '...nnnnnnnnnn...', '................', '................', '................'],
    cls_wizard: ['................', '.......v........', '......vvv.......', '.....vvvvv......', '....vvvvvvv.....', '...vvvvvvvvv....', '..VVVVVVVVVVV...', '.....iiiiii.....', '.....iziizi.....', '.....iiiiii.....', '....vvvvvvvv....', '...vvvyvvvvvv...', '...vvvvvvyvvv...', '...vvvvvvvvvv...', '................', '................'],
    cls_gunner: ['................', '....bbbbbbbb....', '...bbBBBBBBbb...', '..bbbbbbbbbbbb..', '.....iiiiii.....', '.....iziizi.....', '.....iiiiii.....', '......iiii......', '....qqqqqqqq....', '...qqqqqqqqqq...', '...qqqqqqqqqq...', '...qqqqqqqqqzzz.', '............zz..', '................', '................', '................'],
    sk_sow: ['................', '................', '....b...........', '...bbb..........', '....b.....LL....', '.........LLL....', '..b......LL.....', '.bbb.....L......', '..b......L......', '....b.LLLLLLL...', '...bbbLLLLLLL...', '....b.LLLLLLL...', '......LLLLLLL...', '................', '................', '................'],
    sk_water: ['................', '.....u..........', '....uuu.........', '.....u.....u....', '..........uuu...', '...u.......u....', '..uuu...........', '...u......u.....', '.........uuu....', '.....u....u.....', '....uuu.........', '.....u..........', '................', '................', '................', '................'],
    sk_reap: ['................', '......ssssss....', '....ssSSSSSSs...', '...sSSs...ss....', '...sS...........', '...sS...........', '....s...........', '.....bb.........', '......bb........', '.......bb.......', '........bb......', '.........bb.....', '..........bb....', '................', '................', '................'],
    sk_vigor: ['................', '.......yy.......', '......yyyy......', '.....yyyyyy.....', '....yyyyyyyy....', '...yyyyyyyyyy...', '..yyyyyyyyyyyy..', '......yyyy......', '......yyyy......', '......yyyy......', '......yyyy......', '......yyyy......', '................', '................', '................', '................'],
    sk_floor: ['................', '..bbbbbbbbbbbb..', '..bccBBccBBccb..', '..bccBBccBBccb..', '..bBBccBBccBBb..', '..bBBccBBccBBb..', '..bccBBccBBccb..', '..bccBBccBBccb..', '..bBBccBBccBBb..', '..bBBccBBccBBb..', '..bbbbbbbbbbbb..', '................', '................', '................', '................', '................'],
    sk_wall: ['................', '.xxxxxxxxxxxxxx.', '.xmmxmmmmxmmmmx.', '.xmmxmmmmxmmmmx.', '.xxxxxxxxxxxxxx.', '.xmmmmxmmmmxmmx.', '.xmmmmxmmmmxmmx.', '.xxxxxxxxxxxxxx.', '.xmmxmmmmxmmmmx.', '.xmmxmmmmxmmmmx.', '.xxxxxxxxxxxxxx.', '................', '................', '................', '................', '................'],
    sk_demolish: ['................', '..........sss...', '.........sSSs...', '........sSSs....', '.......sSSs.....', '......bbSs......', '.....bbb........', '....bbb.........', '...bbb..........', '..bbb...........', '.bb.............', '................', '..rr....rr......', '.rrrr..rrrr.....', '..rr....rr......', '................'],
    sk_quarry: ['................', '.......n........', '......nyn.......', '.....nyyyn......', '....nyyyyyn.....', '...nyyyyyyyn....', '..nyyyfffyyyn...', '..nyyffffffyn...', '..nyyffffffyn...', '..nyyyfffyyyn...', '...nyyyyyyyn....', '....nyyyyyn.....', '.....nnnnn......', '................', '................', '................'],
    sk_rain: ['................', '....eeeeeeee....', '..eeeeeeeeeeee..', '.eeeeeeeeeeeeee.', '.eeeeeeeeeeeeee.', '..eeeeeeeeeeee..', '................', '...u...u...u....', '..uu..uu..uu....', '................', '.u...u...u......', 'uu..uu..uu......', '................', '................', '................', '................'],
    sk_grow: ['................', '.......LL.......', '......LLLL......', '.....LLLLLL.....', '....LLLLLLLL....', '.......LL.......', '.......LL.......', '..LL...LL...LL..', '...LL..LL..LL...', '....LL.LL.LL....', '.....LLLLLL.....', '.......LL.......', '.......LL.......', '................', '................', '................'],
    sk_fire: ['................', '.......f........', '......ff........', '.....fff.f......', '....ffffff......', '...fffFfff......', '...ffFFFfff.....', '..ffFFhFFff.....', '..ffFFhhFFf.....', '..fFFhhhhFFf....', '..fFFhhhhFFf....', '...fFFhhFFf.....', '....ffFFff......', '.....ffff.......', '................', '................'],
    sk_blink: ['................', '.....vv.........', '....vvvv........', '...vv..vv.......', '..vv....vv......', '.vv......vv.....', '..vv....vv..w...', '...vv..vv..www..', '....vvvv..wwwww.', '.....vv....www..', '............w...', '................', '................', '................', '................', '................'],
    sk_shoot: ['................', '................', '................', '...zzzzzzzzzzzz.', '..zzzzzzzzzzzzzz', '..zzzzzzzzzzzzz.', '..zzzzzzz.......', '..zzzz..........', '..zzzz..........', '..zzz...........', '..zzz...........', '................', '................', '................', '................', '................'],
    sk_snipe: ['................', '.......rr.......', '.....rrrrrr.....', '....rr....rr....', '...rr..rr..rr...', '...r..rrrr..r...', 'rrrrr.rrrr.rrrrr', '...r..rrrr..r...', '...rr..rr..rr...', '....rr....rr....', '.....rrrrrr.....', '.......rr.......', '................', '................', '................', '................'],
    sk_fan: ['................', '.......zz.......', '..z....zz....z..', '...z...zz...z...', '....z..zz..z....', '.....z.zz.z.....', '......zzzz......', '.zzzzzzzzzzzzzz.', '......zzzz......', '.....z.zz.z.....', '....z..zz..z....', '...z...zz...z...', '..z....zz....z..', '.......zz.......', '................', '................'],
    sk_dash: ['................', '................', '................', '..........b.....', '...........b....', '............b...', '.bbbbbbbbbbbbb..', '..bbbbbbbbbbbbb.', '.bbbbbbbbbbbbb..', '............b...', '...........b....', '..........b.....', '................', '................', '................', '................'],
    era_stone: ['................', '................', '.....ssss.......', '....sSSSSs......', '...sSSSSSSs.....', '..sSSSsSSSSs....', '..sSSSSSSSSs....', '.sSSSSSSSsSSs...', '.sdSSSSSSSSSs...', '..ddssssssdd....', '...dddddddd.....', '................', '................', '................', '................', '................'],
    era_iron: ['................', '......ssssss....', '.....sSSSSSSs...', '.....sSSSSSSs...', '.....sSSbbSSs...', '.....ssssbbss...', '........bb......', '........bb......', '.......bb.......', '.......bb.......', '......bb........', '......bb........', '.....bb.........', '................', '................', '................'],
    era_medieval: ['................', '.gg.gg.gg.gg.gg.', '.gggggggggggggg.', '.gggggggggggggg.', '..gggggggggggg..', '..ggggGGGGgggg..', '..ggggGGGGgggg..', '..gggggggggggg..', '..gggggggggggg..', '..ggggGGGGgggg..', '..ggggGGGGgggg..', '..ggggGGGGgggg..', '.gggggggggggggg.', '................', '................', '................'],
    era_industrial: ['................', '..gg............', '..gg............', '..gg.....ss.....', '..gg....ssss....', '..gggggggggggg..', '..gggggggggggg..', '..gggggggggggg..', '..gGGggGGggGGg..', '..gGGggGGggGGg..', '..gggggggggggg..', '..gggggggggggg..', '..gggggggggggg..', '................', '................', '................'],
    era_modern: ['................', '.....uu.........', '.....uu...gg....', '..gg.uu...gg....', '..gg.uu.uugg....', '..gguuuuuugg....', '..ggu.uuu.gg....', '..gguuuuuugguu..', '..ggu.uuu.gguu..', '..gguuuuuugguu..', '..ggu.uuu.gguu..', '..gguuuuuugguu..', '..gguuuuuugguu..', '................', '................', '................'],
    fish: ['................', '................', '................', '.....uuuuuu.....', '...uuuuuuuuuu...', '..uuuuwuuuuuuu..', '.Uuuuuzuuuuuuuu.', 'UUuuuuuuuuuuuUU.', '.UuuuuuuuuuuuUU.', '..uuuuuuuuuuuu..', '...uuuuuuuuuu...', '.....uuuuuu.....', '................', '................', '................', '................'],
    xp: ['................', '................', '.......aa.......', '......aaaa......', '.....aaaaaa.....', '....aaaaaaaa....', '...aaaaaaaaaa...', '.....aaaaaa.....', '.....aaaaaa.....', '.....aaaaaa.....', '.....aaaaaa.....', '.....aaaaaa.....', '................', '................', '................', '................'],
  };
  // recolor saturated pixels toward a target hue/sat (keeps lightness) - used for vehicle variants
  function tint(c, hex) {
    const n = parseInt(hex.slice(1), 16); const tr = (n >> 16) / 255, tg = ((n >> 8) & 255) / 255, tb = (n & 255) / 255;
    const tmax = Math.max(tr, tg, tb), tmin = Math.min(tr, tg, tb); const tl = (tmax + tmin) / 2; let th = 0, ts = 0;
    if (tmax !== tmin) { const dd = tmax - tmin; ts = tl > 0.5 ? dd / (2 - tmax - tmin) : dd / (tmax + tmin); if (tmax === tr) th = (tg - tb) / dd + (tg < tb ? 6 : 0); else if (tmax === tg) th = (tb - tr) / dd + 2; else th = (tr - tg) / dd + 4; th /= 6; }
    const x = c.getContext('2d'); const img = x.getImageData(0, 0, c.width, c.height); const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue; const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255; const max = Math.max(r, g, b), min = Math.min(r, g, b); const l = (max + min) / 2; if (max === min) continue; const dd = max - min; const sat = l > 0.5 ? dd / (2 - max - min) : dd / (max + min); if (sat < 0.25) continue;
      const q = l < 0.5 ? l * (1 + ts) : l + ts - l * ts, pp = 2 * l - q; const f = (t) => { t = ((t % 1) + 1) % 1; if (t < 1 / 6) return pp + (q - pp) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6; return pp; };
      if (ts < 0.1) { const v = Math.round(l * 255); d[i] = v; d[i + 1] = v; d[i + 2] = v; } else { d[i] = Math.round(f(th + 1 / 3) * 255); d[i + 1] = Math.round(f(th) * 255); d[i + 2] = Math.round(f(th - 1 / 3) * 255); }
    }
    x.putImageData(img, 0, 0); return c;
  }
  function hueShift(c, deg) {
    const x = c.getContext('2d'); const img = x.getImageData(0, 0, c.width, c.height); const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b); let h = 0, sat = 0; const l = (max + min) / 2;
      if (max !== min) { const dd = max - min; sat = l > 0.5 ? dd / (2 - max - min) : dd / (max + min); if (max === r) h = (g - b) / dd + (g < b ? 6 : 0); else if (max === g) h = (b - r) / dd + 2; else h = (r - g) / dd + 4; h /= 6; }
      if (sat < 0.15) continue; // keep grays/whites/blacks
      h = (h + deg / 360) % 1;
      const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat, pp = 2 * l - q;
      const f = (t) => { t = ((t % 1) + 1) % 1; if (t < 1 / 6) return pp + (q - pp) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6; return pp; };
      d[i] = Math.round(f(h + 1 / 3) * 255); d[i + 1] = Math.round(f(h) * 255); d[i + 2] = Math.round(f(h - 1 / 3) * 255);
    }
    x.putImageData(img, 0, 0); return c;
  }
  function uiIconCanvas(spec) {
    const key = `uic_${spec}`;
    if (cache.has(key)) return cache.get(key);
    const [name, vs] = String(spec).split(':'); const variant = Number(vs) || 0;
    if (variant) { const base = uiIconCanvas(name); const c = mk(16, 16); ctxOf(c).drawImage(base, 0, 0); hueShift(c, variant * 62); cache.set(key, c); return c; }
    const c = mk(16, 16), x = ctxOf(c);
    if (UI_MAPS[name]) drawMap(x, UI_MAPS[name], { ...PAL, y: '#f2c94c', H: '#d9962b', h: '#ffe08a', r: '#e04848', R: '#a83232', w: '#ffffff', u: '#4b8fe0', U: '#2f5fb0', a: '#43aa8b', L: '#78c850', o: '#3b6b2a', g: '#7a7a80', G: '#3f3f45', n: '#f28c28', c: '#f3dfb5', b: '#8b5a2b', B: '#5e3a17', s: '#8a8a8a', S: '#b5b5b5', d: '#5f5f5f', i: '#f1c27d', z: '#1b1b1b', v: '#7b3fbf', V: '#4a2380', Y: '#c9a227', e: '#c9d1d9', f: '#ff6b35', F: '#ffb347', q: '#3a2a1a', x: '#c0392b', m: '#d62828' }, 16, 16);
    cache.set(key, c); return c;
  }
  function uiIconURL(name) {
    const key = `ui_${name}`;
    if (cache.has(key)) return cache.get(key);
    const u = uiIconCanvas(name).toDataURL(); cache.set(key, u); return u;
  }

  const BOBBER = ['................', '................', '................', '................', '................', '.......rr.......', '......rrrr......', '......rrrr......', '......wwww......', '......wwww......', '.......ww.......', '................', '................', '................', '................', '................'];
  function bobberSprite(bite) { const key = 'bobber' + (bite ? 1 : 0); if (cache.has(key)) return cache.get(key); const c = mk(16, 16), x = ctxOf(c); drawMap(x, BOBBER, { r: '#e63946', w: '#ffffff' }, 16, 16); if (bite) { R(x, 5, 3, 6, 1, '#7cc4f0'); R(x, 4, 11, 8, 1, '#7cc4f0'); } cache.set(key, c); return c; }
  window.Sprites = { uiIcon: uiIconURL, uiIconCanvas, mob: mobSprite, bobber: bobberSprite, fishIcon, animal: animalSprite, tile: tileSprite, obj: objSprite, crop: cropSprite, char: charSprite, vehicle: vehicleSprite, item: itemIcon, iconURL: iconDataURL, hash, shade, mk, ctxOf };
})();
