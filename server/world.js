/* World generation (simplex noise), chunk storage, and world simulation tick */
const D = require('../public/js/defs.js');
const db = require('./db');

const { CHUNK, WORLD_SIZE, T } = D;
const NCH = WORLD_SIZE / CHUNK;

// ---------- seeded RNG + simplex noise ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function makeSimplex(seed) {
  const rnd = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512), permMod = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; permMod[i] = perm[i] % 12; }
  const grad3 = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return function noise(xin, yin) {
    let n0 = 0, n1 = 0, n2 = 0;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { const g = grad3[permMod[ii + perm[jj]]]; t0 *= t0; n0 = t0 * t0 * (g[0] * x0 + g[1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { const g = grad3[permMod[ii + i1 + perm[jj + j1]]]; t1 *= t1; n1 = t1 * t1 * (g[0] * x1 + g[1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { const g = grad3[permMod[ii + 1 + perm[jj + 1]]]; t2 *= t2; n2 = t2 * t2 * (g[0] * x2 + g[1] * y2); }
    return 70 * (n0 + n1 + n2);
  };
}

const seed = db.world.seed;
const nElev = makeSimplex(seed), nMoist = makeSimplex(seed + 101), nDetail = makeSimplex(seed + 202), nRiver = makeSimplex(seed + 303);
function fbm(noise, x, y, oct) {
  let v = 0, amp = 1, freq = 1, sum = 0;
  for (let o = 0; o < oct; o++) { v += noise(x * freq, y * freq) * amp; sum += amp; amp *= 0.5; freq *= 2; }
  return v / sum;
}
// deterministic per-tile hash 0..1
function hash2(x, y, salt) {
  let h = (x * 374761393 + y * 668265263 + salt * 1274126177 + seed) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

// ---------- terrain ----------
function elevationAt(x, y) {
  const cx = WORLD_SIZE / 2, cy = WORLD_SIZE / 2;
  const dx = (x - cx) / cx, dy = (y - cy) / cy;
  const d = Math.sqrt(dx * dx + dy * dy);             // 0 center .. ~1.41 corner
  let e = fbm(nElev, x / 260, y / 260, 5) * 0.9 + 0.55; // ~0.1..1
  e += fbm(nDetail, x / 40, y / 40, 2) * 0.06;
  e -= Math.pow(Math.max(0, d - 0.45), 2.0) * 1.6;     // ocean toward edges
  const spawnD = Math.hypot(x - D.SPAWN.x, y - D.SPAWN.y);
  if (spawnD < 60) e = Math.max(e, 0.55 - spawnD * 0.001); // make sure spawn is land
  return e;
}
function tileAt(x, y) {
  const e = elevationAt(x, y);
  if (e < 0.30) return T.WATER;
  if (e < 0.345) return T.SHALLOW;
  if (e < 0.39) return T.SAND;
  // rivers / ponds
  const r = nRiver(x / 90, y / 90);
  if (e < 0.75 && Math.abs(r) < 0.018) return T.SHALLOW;
  if (e < 0.75 && Math.abs(r) < 0.03) return T.SAND;
  if (e < 0.74) {
    const m = fbm(nMoist, x / 140, y / 140, 3);
    const dt = nDetail(x / 12, y / 12);
    if (dt > 0.62) return T.DIRT;
    return m > 0.12 ? T.DARKGRASS : T.GRASS;
  }
  if (e < 0.86) return T.STONE;
  return T.SNOW;
}
function naturalObjAt(x, y, tile) {
  const r = hash2(x, y, 1);
  const spawnD = Math.hypot(x - D.SPAWN.x, y - D.SPAWN.y);
  if (spawnD < 14) return null;
  const e = elevationAt(x, y);
  let t = null;
  switch (tile) {
    case T.GRASS:
      if (r < 0.035) t = 'tree'; else if (r < 0.06) t = 'flower'; else if (r < 0.072) t = 'bush';
      else if (r < 0.079) t = 'rock'; else if (r < 0.082) t = 'mushroom'; break;
    case T.DARKGRASS:
      if (r < 0.20) t = e > 0.62 ? 'pine' : 'tree'; else if (r < 0.215) t = 'bush'; else if (r < 0.23) t = 'mushroom';
      else if (r < 0.24) t = 'rock'; else if (r < 0.25) t = 'flower'; break;
    case T.SAND:
      if (r < 0.03) t = 'palm'; else if (r < 0.035) t = 'rock'; break;
    case T.STONE:
      if (r < 0.10) t = 'rock'; else if (r < 0.135) t = 'bigrock'; else if (r < 0.15) t = 'pine'; break;
    case T.SNOW:
      if (r < 0.06) t = 'pine'; else if (r < 0.10) t = 'rock'; break;
    case T.DIRT:
      if (r < 0.02) t = 'rock'; else if (r < 0.03) t = 'mushroom'; break;
  }
  if (!t) return null;
  const o = { t, v: Math.floor(hash2(x, y, 2) * 3) };
  const def = D.OBJ[t];
  if (def.hp > 1) o.hp = def.hp;
  if (t === 'bush') o.b = 1;
  return o;
}

// ---------- chunks ----------
const chunks = new Map();     // key -> chunk
const dynamic = new Set();    // chunk keys that contain timed objects
const key = (cx, cy) => cx + ',' + cy;

function generateChunk(cx, cy) {
  const tiles = new Uint8Array(CHUNK * CHUNK);
  const objs = {};
  const bx = cx * CHUNK, by = cy * CHUNK;
  for (let j = 0; j < CHUNK; j++) for (let i = 0; i < CHUNK; i++) {
    const x = bx + i, y = by + j;
    let t = tileAt(x, y);
    // town square around spawn
    const sd = Math.max(Math.abs(x - D.SPAWN.x), Math.abs(y - D.SPAWN.y));
    if (sd <= 5) t = T.PATH; else if (sd <= 7 && (Math.abs(x - D.SPAWN.x) <= 1 || Math.abs(y - D.SPAWN.y) <= 1)) t = T.PATH;
    tiles[j * CHUNK + i] = t;
    const o = naturalObjAt(x, y, t);
    if (o) objs[i + ',' + j] = o;
  }
  // town decorations
  const deco = [[0, -4, 'shop'], [-4, -4, 'lamp'], [4, -4, 'lamp'], [-4, 4, 'lamp'], [4, 4, 'lamp'], [0, 3, 'sign'], [-5, 0, 'plant'], [5, 0, 'plant']];
  for (const [dx, dy, t] of deco) {
    const x = D.SPAWN.x + dx, y = D.SPAWN.y + dy;
    if (x >= bx && x < bx + CHUNK && y >= by && y < by + CHUNK) {
      const o = { t, town: 1 };
      if (t === 'sign') o.txt = 'ยินดีต้อนรับสู่ Kuak World! เดินสำรวจ เก็บไม้ สร้างบ้าน ปลูกผัก และหาเพื่อนใหม่';
      objs[(x - bx) + ',' + (y - by)] = o;
    }
  }
  return { cx, cy, tiles, objs, own: {}, wet: {}, mod: false, last: Date.now() };
}

function getChunk(cx, cy) {
  if (cx < 0 || cy < 0 || cx >= NCH || cy >= NCH) return null;
  const k = key(cx, cy);
  let c = chunks.get(k);
  if (c) { c.last = Date.now(); return c; }
  const saved = db.loadChunk(cx, cy);
  if (saved) {
    c = { cx, cy, tiles: new Uint8Array(Buffer.from(saved.tiles, 'base64')), objs: saved.objs || {}, own: saved.own || {}, wet: saved.wet || {}, mod: true, last: Date.now() };
    for (const [pos, o] of Object.entries(c.objs)) if (isDynamic(o)) { dynamic.add(k); break; }
    if (Object.keys(c.wet).length) dynamic.add(k);
  } else c = generateChunk(cx, cy);
  chunks.set(k, c);
  return c;
}
function isDynamic(o) { return o.t === 'crop' || o.t === 'sapling' || (o.t === 'bush' && !o.b); }
function touch(c) { c.mod = true; db.markDirty('chunk:' + c.cx + '_' + c.cy); }

function serializeChunk(c) {
  return { t: 'chunk', cx: c.cx, cy: c.cy, tiles: Buffer.from(c.tiles).toString('base64'), objs: c.objs, own: c.own, wet: c.wet };
}

function chunkOf(x, y) { return getChunk(Math.floor(x / CHUNK), Math.floor(y / CHUNK)); }
function local(x, y) { return [((x % CHUNK) + CHUNK) % CHUNK, ((y % CHUNK) + CHUNK) % CHUNK]; }
function inWorld(x, y) { return x >= 0 && y >= 0 && x < WORLD_SIZE && y < WORLD_SIZE; }

function getTile(x, y) {
  if (!inWorld(x, y)) return T.WATER;
  const c = chunkOf(x, y); const [i, j] = local(x, y);
  return c.tiles[j * CHUNK + i];
}
function setTile(x, y, t, owner) {
  const c = chunkOf(x, y); const [i, j] = local(x, y);
  c.tiles[j * CHUNK + i] = t;
  const pos = i + ',' + j;
  if (owner) c.own[pos] = owner; else delete c.own[pos];
  touch(c);
  return { t: 'tile', x, y, tile: t, o: owner || 0 };
}
function tileOwner(x, y) { const c = chunkOf(x, y); const [i, j] = local(x, y); return c.own[i + ',' + j] || 0; }
function getObj(x, y) {
  if (!inWorld(x, y)) return null;
  const c = chunkOf(x, y); const [i, j] = local(x, y);
  return c.objs[i + ',' + j] || null;
}
function setObj(x, y, o) {
  const c = chunkOf(x, y); const [i, j] = local(x, y);
  const pos = i + ',' + j;
  if (o) c.objs[pos] = o; else delete c.objs[pos];
  if (o && isDynamic(o)) dynamic.add(key(c.cx, c.cy));
  touch(c);
  return { t: 'obj', x, y, obj: o };
}
function setWet(x, y, until) {
  const c = chunkOf(x, y); const [i, j] = local(x, y);
  const pos = i + ',' + j;
  if (until) { c.wet[pos] = until; dynamic.add(key(c.cx, c.cy)); } else delete c.wet[pos];
  touch(c);
}
function walkable(x, y) {
  if (!inWorld(x, y)) return false;
  const tdef = D.TILES[getTile(x, y)];
  if (!tdef || !tdef.walk) return false;
  const o = getObj(x, y);
  if (o && (o.t === 'shop' || (D.OBJ[o.t] && D.OBJ[o.t].solid))) return false;
  return true;
}
function passableFor(vehicle, x, y) {
  if (!inWorld(x, y)) return false;
  const v = vehicle && D.VEHICLES[vehicle];
  if (v && v.fly) return true;
  if (v && v.water) {
    const t = getTile(x, y);
    if (!(t === T.WATER || t === T.SHALLOW || t === T.SAND)) return false;
    const o = getObj(x, y);
    return !(o && (o.t === 'shop' || (D.OBJ[o.t] && D.OBJ[o.t].solid)));
  }
  return walkable(x, y);
}
function findFreeNear(x, y, r = 4) {
  x = Math.floor(x); y = Math.floor(y);
  if (walkable(x, y)) return { x, y };
  for (let d = 1; d <= r; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
    if (walkable(x + dx, y + dy)) return { x: x + dx, y: y + dy };
  }
  return { x, y };
}

// ---------- simulation ----------
// returns list of update messages to broadcast
function tick(now) {
  const out = [];
  const NOW = now || Date.now();
  for (const k of [...dynamic]) {
    const c = chunks.get(k);
    if (!c) { dynamic.delete(k); continue; }
    let still = false;
    const bx = c.cx * CHUNK, by = c.cy * CHUNK;
    for (const [pos, o] of Object.entries(c.objs)) {
      const [i, j] = pos.split(',').map(Number);
      const x = bx + i, y = by + j;
      if (o.t === 'crop') {
        const cd = D.CROPS[o.c];
        if (!cd) { delete c.objs[pos]; touch(c); out.push({ t: 'obj', x, y, obj: null }); continue; }
        if (o.s < 4) {
          const wet = o.w && o.w > NOW;
          o.p = (o.p || 0) + (wet ? 2 : 1);
          const ns = Math.min(4, Math.floor(o.p / cd.stageSec));
          if (ns !== o.s) { o.s = ns; touch(c); out.push({ t: 'obj', x, y, obj: o }); }
          still = true;
        }
        if (o.w && o.w <= NOW) { o.w = 0; touch(c); out.push({ t: 'obj', x, y, obj: o }); out.push(setTile(x, y, T.TILLED, 0)); }
        else if (o.w) still = true;
      } else if (o.t === 'sapling') {
        o.p = (o.p || 0) + 1;
        if (o.p >= D.OBJ.sapling.growSec) { const no = { t: 'tree', v: Math.floor(Math.random() * 3), hp: D.OBJ.tree.hp }; c.objs[pos] = no; touch(c); out.push({ t: 'obj', x, y, obj: no }); }
        else still = true;
      } else if (o.t === 'bush' && !o.b) {
        o.p = (o.p || 0) + 1;
        if (o.p >= D.OBJ.bush.regrowSec) { o.b = 1; delete o.p; touch(c); out.push({ t: 'obj', x, y, obj: o }); }
        else still = true;
      }
    }
    for (const [pos, until] of Object.entries(c.wet)) {
      if (until <= NOW) {
        delete c.wet[pos]; touch(c);
        const [i, j] = pos.split(',').map(Number);
        const x = bx + i, y = by + j;
        if (c.tiles[j * CHUNK + i] === T.TILLED_WET && !c.objs[pos]) out.push(setTile(x, y, T.TILLED, 0));
      } else still = true;
    }
    if (!still) dynamic.delete(k);
  }
  return out;
}

// natural regrowth: every call, respawn a few trees/rocks/bushes in modified chunks on tiles that were natural
function regrow() {
  const out = [];
  for (const c of chunks.values()) {
    if (!c.mod) continue;
    const bx = c.cx * CHUNK, by = c.cy * CHUNK;
    let n = 0;
    for (let tries = 0; tries < 24 && n < 3; tries++) {
      const i = Math.floor(Math.random() * CHUNK), j = Math.floor(Math.random() * CHUNK);
      const pos = i + ',' + j;
      if (c.objs[pos] || c.own[pos]) continue;
      const x = bx + i, y = by + j;
      const t = c.tiles[j * CHUNK + i];
      const nat = naturalObjAt(x, y, t);
      if (!nat || tileAt(x, y) !== t) continue;
      // don't regrow next to player-built stuff
      let nearBuilt = false;
      for (let dy = -2; dy <= 2 && !nearBuilt; dy++) for (let dx = -2; dx <= 2; dx++) {
        const o = getObj(x + dx, y + dy); if (o && o.o) { nearBuilt = true; break; }
        if (tileOwner(x + dx, y + dy)) { nearBuilt = true; break; }
      }
      if (nearBuilt) continue;
      c.objs[pos] = nat; touch(c); n++;
      out.push({ t: 'obj', x, y, obj: nat });
    }
  }
  return out;
}

// evict unmodified idle chunks
function evict() {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [k, c] of chunks) if (!c.mod && c.last < cutoff) chunks.delete(k);
}

module.exports = { getChunk, serializeChunk, getTile, setTile, tileOwner, getObj, setObj, setWet, walkable, passableFor, findFreeNear, tick, regrow, evict, chunkKey: key, chunks, NCH, tileAt };
