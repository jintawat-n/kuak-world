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
  function tileSprite(id, v, frame) {
    const key = `t${id}_${v}_${frame}`;
    if (cache.has(key)) return cache.get(key);
    const c = mk(S, S), x = ctxOf(c);
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

  function objSprite(obj, frame) {
    const t = obj.t;
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
  function itemIcon(id) {
    const key = `i_${id}`;
    if (cache.has(key)) return cache.get(key);
    const it = D.ITEMS[id] || {};
    let c;
    if (it.vehicle) {
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

  window.Sprites = { tile: tileSprite, obj: objSprite, crop: cropSprite, char: charSprite, vehicle: vehicleSprite, item: itemIcon, iconURL: iconDataURL, hash, shade, mk, ctxOf };
})();
