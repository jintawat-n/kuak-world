/* Night monsters: spawn near players in the wild, chase, attack, drop loot */
const D = require('../public/js/defs.js');
const W = require('./world');

const mobs = new Map();
let nextId = 1;
const MAX = 240;

function isNight(time) { const h = (time / D.DAY_SECONDS) * 24; return h >= 19 || h < 5.5; }
function nearTown(x, y) { return Math.max(Math.abs(x - D.SPAWN.x), Math.abs(y - D.SPAWN.y)) <= 28; }
function spawnable(x, y) {
  const t = W.getTile(x, y);
  if (!(t === D.T.GRASS || t === D.T.DARKGRASS || t === D.T.DIRT)) return false;
  if (W.getObj(x, y) || W.tileOwner(x, y)) return false;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const o = W.getObj(x + dx, y + dy); if ((o && o.o) || W.tileOwner(x + dx, y + dy)) return false; }
  return true;
}
function spawnNear(px, py, level) {
  for (let tries = 0; tries < 10; tries++) {
    const a = Math.random() * Math.PI * 2, r = 11 + Math.random() * 8;
    const x = Math.floor(px + Math.cos(a) * r), y = Math.floor(py + Math.sin(a) * r);
    if (nearTown(x, y) || !spawnable(x, y)) continue;
    const roll = Math.random(); const lv = level || 1;
    const v = roll < (lv >= 15 ? 0.15 : 0.04) ? 2 : roll < (lv >= 6 ? 0.45 : 0.2) ? 1 : 0;
    const def = D.MOBS.slime.variants[v];
    const m = { id: nextId++, t: 'slime', v, x: x + 0.5, y: y + 0.5, hp: def.hp, mh: def.hp, tx: x + 0.5, ty: y + 0.5, next: 0, lastAtk: 0, born: Date.now(), seen: Date.now(), a: 0 };
    mobs.set(m.id, m); return m;
  }
  return null;
}

// ctx: { sessions, time, hurt(session, dmg, mob), now }
function tick(ctx) {
  const now = ctx.now; const players = [...ctx.sessions].filter(s => s.p);
  const night = isNight(ctx.time);
  // spawn
  if (night && mobs.size < MAX && ctx.spawnTick) {
    for (const s of players) {
      if (nearTown(s.p.x, s.p.y)) continue;
      let n = 0; for (const m of mobs.values()) if (Math.abs(m.x - s.p.x) < 24 && Math.abs(m.y - s.p.y) < 24) n++;
      if (n < 4 && Math.random() < 0.7) spawnNear(s.p.x, s.p.y, s.p.level);
    }
  }
  const out = [];
  for (const m of mobs.values()) {
    const def = D.MOBS.slime.variants[m.v];
    // despawn: day, or nobody around for 40s
    let nearest = null, nd = 1e9;
    for (const s of players) { const d = Math.hypot(s.p.x - m.x, s.p.y - m.y); if (d < nd) { nd = d; nearest = s; } }
    if (nearest && nd < 40) m.seen = now;
    if ((!night && now - m.born > 5000 && Math.random() < 0.02) || now - m.seen > 40000) { mobs.delete(m.id); out.push({ t: 'mob_gone', id: m.id }); continue; }
    m.a = 0;
    if (m.stun && m.stun > now) continue;
    const canTarget = nearest && nd <= 7 && !(nearest.p.vehicle && D.VEHICLES[nearest.p.vehicle].enclosed) && !(nearest.p.vehicle && D.VEHICLES[nearest.p.vehicle].fly) && !nearTown(nearest.p.x, nearest.p.y);
    if (canTarget) {
      const dx = nearest.p.x - m.x, dy = nearest.p.y - m.y;
      if (nd > 0.9) {
        const step = def.speed * 0.2 * (m.slow > now ? 0.4 : 1);
        const nx = m.x + dx / nd * step, ny = m.y + dy / nd * step;
        if (W.walkable(Math.floor(nx), Math.floor(m.y))) m.x = nx;
        if (W.walkable(Math.floor(m.x), Math.floor(ny))) m.y = ny;
      } else if (now - m.lastAtk > 1500) { m.lastAtk = now; m.a = 1; ctx.hurt(nearest, def.dmg, m); }
    } else if (now >= m.next) {
      m.next = now + 1500 + Math.random() * 3000;
      const tx = m.x + (Math.random() * 6 - 3), ty = m.y + (Math.random() * 6 - 3);
      if (W.walkable(Math.floor(tx), Math.floor(ty)) && !nearTown(tx, ty)) { m.tx = tx; m.ty = ty; }
    } else {
      const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy);
      if (d > 0.15) { const step = Math.min(d, 1.0 * 0.2); const nx = m.x + dx / d * step, ny = m.y + dy / d * step; if (W.walkable(Math.floor(nx), Math.floor(ny))) { m.x = nx; m.y = ny; } else { m.tx = m.x; m.ty = m.y; } }
    }
  }
  return out;
}
function damage(m, dmg, fromX, fromY) {
  m.hp -= dmg;
  if (fromX != null) { const dx = m.x - fromX, dy = m.y - fromY, d = Math.hypot(dx, dy) || 1; const nx = m.x + dx / d * 0.6, ny = m.y + dy / d * 0.6; if (W.walkable(Math.floor(nx), Math.floor(ny))) { m.x = nx; m.y = ny; } }
  return m.hp <= 0;
}
function kill(m) { mobs.delete(m.id); }
function near(x, y, r) { const out = []; for (const m of mobs.values()) if (Math.abs(m.x - x) <= r && Math.abs(m.y - y) <= r) out.push(m); return out; }
function within(x, y, r) { const out = []; for (const m of mobs.values()) if (Math.hypot(m.x - x, m.y - y) <= r) out.push(m); return out; }
function at(x, y) { let best = null, bd = 1e9; for (const m of mobs.values()) { const d = Math.hypot(m.x - (x + 0.5), m.y - (y + 0.5)); if (d < 0.9 && d < bd) { bd = d; best = m; } } return best; }
function pub(m) { return { id: m.id, t: m.t, v: m.v, x: +m.x.toFixed(2), y: +m.y.toFixed(2), hp: Math.max(0, Math.round(m.hp)), mh: m.mh, a: m.a }; }

module.exports = { mobs, tick, damage, kill, near, within, at, pub, isNight, spawnNear };
