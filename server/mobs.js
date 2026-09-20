/* Creatures: slimes (night monsters) + wildlife (land, birds, dinosaurs). Spawn by biome/time/zone, AI by behavior. */
const D = require('../public/js/defs.js');
const W = require('./world');

const mobs = new Map();
let nextId = 1;
const MAX = 360;
const RAR_W = [0, 50, 28, 14, 6, 2];

function isNight(time) { const h = (time / D.DAY_SECONDS) * 24; return h >= 19 || h < 5.5; }
function distTown(x, y) { return Math.hypot(x - D.SPAWN.x, y - D.SPAWN.y); }
function nearTown(x, y) { return Math.max(Math.abs(x - D.SPAWN.x), Math.abs(y - D.SPAWN.y)) <= 28; }
function biomeAt(x, y) {
  const t = W.getTile(x, y);
  if (t === D.T.WATER || t === D.T.SHALLOW) return 'water';
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const tt = W.getTile(x + dx, y + dy); if (tt === D.T.WATER || tt === D.T.SHALLOW) return 'water'; }
  return t === D.T.GRASS ? 'grass' : t === D.T.DARKGRASS ? 'forest' : t === D.T.SAND ? 'sand' : t === D.T.STONE ? 'stone' : t === D.T.SNOW ? 'snow' : t === D.T.DIRT ? 'grass' : null;
}
function dinoZone(x, y) { const d = distTown(x, y); const t = W.getTile(x, y); return d > 300 || ((t === D.T.STONE || t === D.T.SNOW) && d > 140); }
function defOf(m) { return m.t === 'slime' ? { ...D.MOBS.slime.variants[m.v], behavior: 'hostile', xp: D.MOBS.slime.variants[m.v].xp, drops: D.MOBS.slime.drops, group: 'slime', size: 1, th: D.MOBS.slime.variants[m.v].th } : D.ANIMALS[m.t]; }
function isFly(a) { return a.shape === 'fly' || a.shape === 'fly_b' || a.shape === 'ptero'; }
function isAquatic(a) { return a.biomes.includes('water') && (a.group === 'dino' || ['croc', 'hippo', 'otter', 'duck', 'goose', 'swan', 'pelican', 'lizard', 'frog_big', 'turtle', 'buffalo', 'tapir'].includes(a.id)); }
function passable(m, x, y) {
  if (x < 0 || y < 0 || x >= D.WORLD_SIZE || y >= D.WORLD_SIZE) return false;
  if (m.fly) return true;
  if (m.aquatic) { const t = W.getTile(x, y); if (t === D.T.WATER || t === D.T.SHALLOW) return true; }
  if (m.t === 'plesio' || m.t === 'mosa') return false; // water only
  return W.walkable(x, y);
}
function clearAround(x, y, r) { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const o = W.getObj(x + dx, y + dy); if ((o && o.o) || W.tileOwner(x + dx, y + dy)) return false; } return true; }

function make(t, v, x, y) {
  const m = { id: nextId++, t, v: v || 0, x, y, tx: x, ty: y, next: 0, lastAtk: 0, born: Date.now(), seen: Date.now(), a: 0, d: 'right' };
  const def = defOf(m); m.hp = def.hp; m.mh = def.hp; m.behavior = def.behavior; m.speed = def.speed; m.dmg = def.dmg;
  if (t !== 'slime') { m.fly = isFly(def); m.aquatic = isAquatic(def); m.size = def.size; m.group = def.group; }
  mobs.set(m.id, m); return m;
}
function spawnSlimeNear(px, py, level) {
  for (let tries = 0; tries < 10; tries++) {
    const a = Math.random() * Math.PI * 2, r = 11 + Math.random() * 8;
    const x = Math.floor(px + Math.cos(a) * r), y = Math.floor(py + Math.sin(a) * r);
    if (nearTown(x, y)) continue;
    const t = W.getTile(x, y); if (!(t === D.T.GRASS || t === D.T.DARKGRASS || t === D.T.DIRT) || W.getObj(x, y) || W.tileOwner(x, y) || !clearAround(x, y, 3)) continue;
    const roll = Math.random(); const lv = level || 1;
    const v = roll < (lv >= 15 ? 0.15 : 0.04) ? 2 : roll < (lv >= 6 ? 0.45 : 0.2) ? 1 : 0;
    return make('slime', v, x + 0.5, y + 0.5);
  }
  return null;
}
function spawnAnimalNear(px, py, level, night, forceGroup) {
  for (let tries = 0; tries < 12; tries++) {
    const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 10;
    const x = Math.floor(px + Math.cos(a) * r), y = Math.floor(py + Math.sin(a) * r);
    if (nearTown(x, y) || !clearAround(x, y, 2)) continue;
    const biome = biomeAt(x, y); if (!biome) continue;
    const dz = dinoZone(x, y); const lv = level || 1;
    let cand = D.ANIMAL_LIST.filter(an => (an.when === 2 || (an.when === 1) === night) && an.lv <= lv + 3 && (an.group === 'dino' ? (dz && (an.biomes.includes('dino') || an.biomes.includes(biome))) : an.biomes.includes(biome)) && (!forceGroup || an.group === forceGroup));
    if (dz && !forceGroup && Math.random() < 0.7) { const dc = cand.filter(an => an.group === 'dino'); if (dc.length) cand = dc; }
    if (!cand.length) continue;
    const weights = cand.map(an => RAR_W[an.rarity]); let rr = Math.random() * weights.reduce((s, w) => s + w, 0); let pick = cand[0];
    for (let i = 0; i < cand.length; i++) { if (rr < weights[i]) { pick = cand[i]; break; } rr -= weights[i]; }
    const fly = isFly(pick); const tile = W.getTile(x, y);
    if (!fly) { if (pick.biomes.includes('water') && (tile === D.T.WATER || tile === D.T.SHALLOW)) { if (!isAquatic(pick)) continue; } else if (!W.walkable(x, y)) continue; }
    if ((pick.id === 'plesio' || pick.id === 'mosa') && !(tile === D.T.WATER || tile === D.T.SHALLOW)) continue;
    return make(pick.id, 0, x + 0.5, y + 0.5);
  }
  return null;
}
function spawnNear(px, py, level) { return spawnSlimeNear(px, py, level); }

// ctx: { sessions, time, hurt(session, dmg, mob), now, spawnTick }
function tick(ctx) {
  const now = ctx.now; const players = [...ctx.sessions].filter(s => s.p);
  const night = isNight(ctx.time);
  if (ctx.spawnTick && mobs.size < MAX) {
    for (const s of players) {
      if (nearTown(s.p.x, s.p.y)) continue;
      let ns = 0, na = 0; for (const m of mobs.values()) if (Math.abs(m.x - s.p.x) < 24 && Math.abs(m.y - s.p.y) < 24) { if (m.t === 'slime') ns++; else na++; }
      if (night && ns < 4 && Math.random() < 0.6) spawnSlimeNear(s.p.x, s.p.y, s.p.level);
      if (na < 7 && Math.random() < 0.8) spawnAnimalNear(s.p.x, s.p.y, s.p.level, night);
    }
  }
  const out = [];
  for (const m of mobs.values()) {
    const def = defOf(m);
    let nearest = null, nd = 1e9;
    for (const s of players) { const d = Math.hypot(s.p.x - m.x, s.p.y - m.y); if (d < nd) { nd = d; nearest = s; } }
    if (nearest && nd < 40) m.seen = now;
    const wrongTime = m.t === 'slime' ? !night : (def.when === 0 && night) || (def.when === 1 && !night);
    if ((wrongTime && now - m.born > 5000 && Math.random() < 0.02) || now - m.seen > 40000) { mobs.delete(m.id); out.push({ t: 'mob_gone', id: m.id }); continue; }
    m.a = 0;
    if (m.stun && m.stun > now) continue;
    const spd = m.speed * 0.2 * (m.slow > now ? 0.4 : 1);
    const move = (dx, dy, mult) => { const d = Math.hypot(dx, dy) || 1; const step = spd * (mult || 1); const nx = m.x + dx / d * step, ny = m.y + dy / d * step; let moved = false; if (passable(m, Math.floor(nx), Math.floor(m.y))) { m.x = nx; moved = true; } if (passable(m, Math.floor(m.x), Math.floor(ny))) { m.y = ny; moved = true; } if (Math.abs(dx) > 0.05) m.d = dx > 0 ? 'right' : 'left'; return moved; };
    // flee (passive hit)
    if (m.flee && m.flee.until > now) { move(m.x - m.flee.x, m.y - m.flee.y, 1.4); continue; }
    // target selection
    let target = null;
    if (m.behavior === 'hostile' || (m.aggro && m.aggro.until > now)) {
      const range = m.behavior === 'hostile' ? (m.size >= 1.8 ? 10 : 7) : 12;
      const aggroS = m.aggro && m.aggro.until > now ? m.aggro.s : null;
      const cand = aggroS && aggroS.p ? aggroS : nearest;
      if (cand && cand.p) { const d = Math.hypot(cand.p.x - m.x, cand.p.y - m.y); const veh = cand.p.vehicle && D.VEHICLES[cand.p.vehicle]; if (d <= range && !(veh && (veh.enclosed || veh.fly)) && !nearTown(cand.p.x, cand.p.y)) target = cand; }
    }
    if (target) {
      const dx = target.p.x - m.x, dy = target.p.y - m.y, d = Math.hypot(dx, dy);
      const reach = 0.9 + (m.size || 1) * 0.3;
      if (d > reach) move(dx, dy, 1); else if (now - m.lastAtk > 1500) { m.lastAtk = now; m.a = 1; ctx.hurt(target, m.dmg || 3, m); }
    } else if (now >= m.next) {
      m.next = now + 1500 + Math.random() * 3500;
      const rr = m.fly ? 8 : 4; const tx = m.x + (Math.random() * 2 - 1) * rr, ty = m.y + (Math.random() * 2 - 1) * rr;
      if (passable(m, Math.floor(tx), Math.floor(ty)) && !nearTown(tx, ty)) { m.tx = tx; m.ty = ty; }
    } else {
      const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy);
      if (d > 0.15) { if (!move(dx, dy, m.fly ? 0.9 : 0.5)) { m.tx = m.x; m.ty = m.y; } }
    }
  }
  return out;
}
function damage(m, dmg, fromX, fromY, s) {
  m.hp -= dmg;
  const now = Date.now();
  if (m.behavior === 'passive') m.flee = { x: fromX, y: fromY, until: now + 4000 };
  else if (m.behavior === 'neutral' && s) m.aggro = { s, until: now + 15000 };
  if (fromX != null && (m.size || 1) < 1.6) { const dx = m.x - fromX, dy = m.y - fromY, d = Math.hypot(dx, dy) || 1; const nx = m.x + dx / d * 0.6, ny = m.y + dy / d * 0.6; if (passable(m, Math.floor(nx), Math.floor(ny))) { m.x = nx; m.y = ny; } }
  return m.hp <= 0;
}
function kill(m) { mobs.delete(m.id); }
function near(x, y, r) { const out = []; for (const m of mobs.values()) if (Math.abs(m.x - x) <= r && Math.abs(m.y - y) <= r) out.push(m); return out; }
function within(x, y, r) { const out = []; for (const m of mobs.values()) if (Math.hypot(m.x - x, m.y - y) <= r + ((m.size || 1) - 1) * 0.4) out.push(m); return out; }
function at(x, y) { let best = null, bd = 1e9; for (const m of mobs.values()) { const d = Math.hypot(m.x - (x + 0.5), m.y - (y + 0.5)); const rad = 0.9 + ((m.size || 1) - 1) * 0.5; if (d < rad && d < bd) { bd = d; best = m; } } return best; }
function pub(m) { return { id: m.id, t: m.t, v: m.v, x: +m.x.toFixed(2), y: +m.y.toFixed(2), hp: Math.max(0, Math.round(m.hp)), mh: m.mh, a: m.a, d: m.d, f: m.flee && m.flee.until > Date.now() ? 1 : 0 }; }

module.exports = { mobs, tick, damage, kill, near, within, at, pub, isNight, spawnNear, spawnSlimeNear, spawnAnimalNear, defOf, dinoZone };
