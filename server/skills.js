/* Generic skill engine: executes fx types from classes.js. ctx supplies game helpers from index.js */
const D = require('../public/js/defs.js');
const W = require('./world');
const MOBS = require('./mobs');

module.exports = function (ctx) {
  const { give, take, has, clamp, toast, err, send, sendMe, broadcastWorld, broadcastNear, addXp, warp, nearTown, playerOnTile, mobKill, sessions, online, db } = ctx;
  const fx = (kind, x, y, extra) => broadcastNear(x, y, { t: 'fx', kind, x, y, ...(extra || {}) });

  function buffs(s) { s.buffs = s.buffs || {}; const now = Date.now(); for (const k of Object.keys(s.buffs)) if (s.buffs[k].until <= now) delete s.buffs[k]; return s.buffs; }
  function buffVal(s, k, def) { const b = buffs(s)[k]; return b ? b.val : def; }
  function setBuff(s, k, val, dur) { buffs(s)[k] = { val, until: Date.now() + dur * 1000 }; sendBuffs(s); }
  function sendBuffs(s) { const b = buffs(s); send(s.ws, { t: 'buffs', b: Object.fromEntries(Object.entries(b).map(([k, v]) => [k, { val: v.val, until: v.until }])) }); }
  function skillDmg(s, base) { return Math.round(base * (1 + D.passive(s.p.cls, 'skillDmg') / 100) * buffVal(s, 'dmg', 1)); }
  function hitMob(s, mob, dmg) { broadcastNear(mob.x, mob.y, { t: 'mob_hit', id: mob.id, dmg, x: mob.x, y: mob.y }); if (MOBS.damage(mob, dmg, s.p.x, s.p.y)) mobKill(s, mob); }

  function waterTile(x, y, now) {
    const t = W.getTile(x, y); const o = W.getObj(x, y);
    if (o && o.t === 'crop') { o.w = now + 240000; W.setWet(x, y, 0); broadcastWorld(W.setObj(x, y, o)); if (t !== D.T.TILLED_WET) broadcastWorld(W.setTile(x, y, D.T.TILLED_WET, W.tileOwner(x, y))); return true; }
    if (t === D.T.TILLED) { W.setWet(x, y, now + 240000); broadcastWorld(W.setTile(x, y, D.T.TILLED_WET, W.tileOwner(x, y))); return true; }
    return false;
  }
  function nearestPlayers(s, r) { const out = []; for (const o of sessions) if (o.p && o !== s && Math.hypot(o.p.x - s.p.x, o.p.y - s.p.y) <= r) out.push(o); return out; }
  function findNearest(s, what) {
    const p = s.p; const px = Math.floor(p.x), py = Math.floor(p.y); let best = null, bd = 1e9;
    if (what === 'mob') { for (const m of MOBS.mobs.values()) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = { x: m.x, y: m.y }; } } }
    else if (what === 'player') { for (const o of sessions) if (o.p && o !== s) { const d = Math.hypot(o.p.x - p.x, o.p.y - p.y); if (d < bd) { bd = d; best = { x: o.p.x, y: o.p.y, name: o.p.name }; } } }
    else {
      for (let r = 1; r <= 60 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = px + dx, y = py + dy;
        if (what === 'water') { const t = W.getTile(x, y); if (t === D.T.WATER || t === D.T.SHALLOW) { best = { x, y }; break; } continue; }
        const o = W.getObj(x, y); if (!o) continue;
        if (what === 'tree' && ['tree', 'pine', 'palm'].includes(o.t)) { best = { x, y }; break; }
        if (what === 'rock' && (o.t === 'rock' || o.t === 'bigrock')) { best = { x, y }; break; }
        if (what === 'bigrock' && o.t === 'bigrock') { best = { x, y }; break; }
        if (what === 'bush' && o.t === 'bush' && o.b) { best = { x, y }; break; }
      }
      if (best) bd = Math.hypot(best.x + 0.5 - p.x, best.y + 0.5 - p.y);
    }
    return best ? { ...best, d: bd } : null;
  }
  const DIRS = ['ตะวันออก', 'ตะวันออกเฉียงใต้', 'ใต้', 'ตะวันตกเฉียงใต้', 'ตะวันตก', 'ตะวันตกเฉียงเหนือ', 'เหนือ', 'ตะวันออกเฉียงเหนือ'];
  function dirName(dx, dy) { const a = Math.atan2(dy, dx); let i = Math.round(a / (Math.PI / 4)); i = ((i % 8) + 8) % 8; return DIRS[i]; }

  function useSkill(s, m) {
    const p = s.p; const now = Date.now();
    if (!p.cls) return err(s, 'ยังไม่มีอาชีพ ไปหาครูเพชรในเมืองหรือกด J เพื่อเลือกอาชีพ');
    const cls = D.CLASSES[p.cls]; const sk = cls.skills.find(k => k.id === m.id); if (!sk) return;
    s.cool = s.cool || {};
    if ((s.cool['sk_' + sk.id] || 0) > now) return;
    const cost = Math.max(0, Math.round(sk.energy * (1 - D.passive(p.cls, 'skillCost') / 100)));
    if (p.needs.energy < cost) return err(s, `พลังงานไม่พอ (ต้องการ ${cost})`);
    let tx = Math.floor(Number(m.x)), ty = Math.floor(Number(m.y));
    if (sk.target === 'self') { tx = Math.floor(p.x); ty = Math.floor(p.y); }
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;
    if (sk.range && Math.hypot(tx + 0.5 - p.x, ty + 0.5 - p.y) > sk.range + 0.5) return err(s, 'ไกลเกินระยะสกิล');
    const px = Math.floor(p.x), py = Math.floor(p.y);
    let count = 0;
    switch (sk.fx) {
      case 'shot': {
        const mob = MOBS.at(tx, ty) || MOBS.within(tx + 0.5, ty + 0.5, 1.0)[0];
        fx('shot', mob ? mob.x : tx + 0.5, mob ? mob.y : ty + 0.5, { from: { x: p.x, y: p.y }, big: sk.dmg >= 30 });
        s.anim = { a: 'gun', until: now + 250, tx, ty };
        if (mob) hitMob(s, mob, skillDmg(s, sk.dmg));
        break;
      }
      case 'aoe': {
        const cx = sk.range ? tx + 0.5 : p.x, cy = sk.range ? ty + 0.5 : p.y;
        fx(sk.range ? 'fire' : 'fan', sk.range ? tx : px, sk.range ? ty : py, { r: sk.r, from: { x: p.x, y: p.y } });
        for (const mob of MOBS.within(cx, cy, sk.r + 0.1)) { hitMob(s, mob, skillDmg(s, sk.dmg)); count++; }
        break;
      }
      case 'line': {
        const dx = tx + 0.5 - p.x, dy = ty + 0.5 - p.y, d = Math.hypot(dx, dy) || 1; const ux = dx / d, uy = dy / d;
        const ex = p.x + ux * sk.range, ey = p.y + uy * sk.range;
        fx('shot', ex, ey, { from: { x: p.x, y: p.y }, big: true });
        for (const mob of MOBS.mobs.values()) { const vx = mob.x - p.x, vy = mob.y - p.y; const t = vx * ux + vy * uy; if (t < 0 || t > sk.range) continue; const perp = Math.abs(vx * uy - vy * ux); if (perp <= 0.9) { hitMob(s, mob, skillDmg(s, sk.dmg)); count++; } }
        break;
      }
      case 'blink': {
        if (!W.passableFor(p.vehicle, tx, ty)) return err(s, 'วาร์ปไปตรงนั้นไม่ได้');
        fx('blink', px, py); p.x = tx + 0.5; p.y = ty + 0.5; send(s.ws, { t: 'warp', x: p.x, y: p.y }); fx('blink', tx, ty); break;
      }
      case 'dash': {
        const dx = p.d === 'left' ? -1 : p.d === 'right' ? 1 : 0, dy = p.d === 'up' ? -1 : p.d === 'down' ? 1 : 0;
        let nx = p.x, ny = p.y;
        for (let i = 0; i < sk.tiles * 2; i++) { const cx = nx + dx * 0.5, cy = ny + dy * 0.5; if (!W.passableFor(p.vehicle, Math.floor(cx), Math.floor(cy))) break; nx = cx; ny = cy; }
        fx('dash', px, py, { to: { x: nx, y: ny } }); p.x = nx; p.y = ny; send(s.ws, { t: 'warp', x: p.x, y: p.y }); break;
      }
      case 'heal': {
        const v = sk.v; if (v.hp) p.hp = clamp(p.hp + v.hp, 0, 100);
        for (const k of ['energy', 'hunger', 'fun', 'hygiene']) if (v[k]) p.needs[k] = clamp(p.needs[k] + v[k], 0, 100);
        fx('buff', px, py); sendMe(s, ['needs', 'hp']); break;
      }
      case 'healArea': {
        p.hp = clamp(p.hp + sk.hp, 0, 100); sendMe(s, ['hp']); fx('buff', px, py);
        for (const o of nearestPlayers(s, sk.r)) { o.p.hp = clamp(o.p.hp + sk.hp, 0, 100); sendMe(o, ['hp']); toast(o, `${p.name} รักษาให้คุณ +${sk.hp} เลือด`, 'get'); fx('buff', Math.floor(o.p.x), Math.floor(o.p.y)); count++; }
        toast(s, `รักษา ${count + 1} คน`, 'get'); break;
      }
      case 'funArea': {
        p.needs.fun = clamp(p.needs.fun + sk.fun, 0, 100); sendMe(s, ['needs']); fx('buff', px, py);
        for (const o of nearestPlayers(s, sk.r)) { o.p.needs.fun = clamp(o.p.needs.fun + sk.fun, 0, 100); sendMe(o, ['needs']); toast(o, `${p.name} ทำให้คุณสนุกขึ้น +${sk.fun}`, 'get'); count++; }
        break;
      }
      case 'buff': {
        if (sk.kind === 'speed' || sk.kind === 'dmg' || sk.kind === 'def' || sk.kind === 'regen' || sk.kind === 'xp' || sk.kind === 'loot' || sk.kind === 'shield' || sk.kind === 'cook' || sk.kind === 'light' || sk.kind === 'yield') setBuff(s, sk.kind, sk.val, sk.dur);
        fx('buff', px, py); toast(s, `${sk.th} เริ่มทำงาน ${sk.dur} วิ`, 'info'); break;
      }
      case 'water': {
        const cx = sk.range ? tx : px, cy = sk.range ? ty : py; const rr = sk.r * sk.r + 1;
        for (let dy = -sk.r; dy <= sk.r; dy++) for (let dx = -sk.r; dx <= sk.r; dx++) if (dx * dx + dy * dy <= rr) count += waterTile(cx + dx, cy + dy, now) ? 1 : 0;
        if (!count) return err(s, 'ไม่มีแปลงให้รดตรงนั้น');
        fx('rain', cx, cy, { r: sk.r }); addXp(s, Math.min(count, 20) * D.XP.water); break;
      }
      case 'grow': {
        const cx = sk.range ? tx : px, cy = sk.range ? ty : py;
        for (let dy = -sk.r; dy <= sk.r; dy++) for (let dx = -sk.r; dx <= sk.r; dx++) { const x = cx + dx, y = cy + dy; const o = W.getObj(x, y); if (!o || o.t !== 'crop' || o.s >= 4) continue; const cd = D.CROPS[o.c]; o.s += 1; o.p = Math.max(o.p || 0, o.s * cd.stageSec); count++; broadcastWorld(W.setObj(x, y, o)); }
        if (!count) return err(s, 'ไม่มีผักที่ยังไม่โตตรงนั้น');
        fx('grow', cx, cy, { r: sk.r }); toast(s, `เร่งโต ${count} ต้น`, 'get'); addXp(s, Math.min(count, 10) * D.XP.plant); break;
      }
      case 'sow': {
        const seedId = m.item; const it = D.ITEMS[seedId]; if (!it || !it.crop) return err(s, 'เลือกเมล็ดในช่องอุปกรณ์ก่อน');
        for (let dy = -sk.r; dy <= sk.r; dy++) for (let dx = -sk.r; dx <= sk.r; dx++) { const x = tx + dx, y = ty + dy; if (!has(p, seedId)) break; const t = W.getTile(x, y); if (!D.TILES[t].soil || W.getObj(x, y)) continue; take(p, seedId, 1); count++; broadcastWorld(W.setObj(x, y, { t: 'crop', c: it.crop, s: 0, p: 0, w: t === D.T.TILLED_WET ? now + 240000 : 0, o: p.id, g: D.passive(p.cls, 'cropSpeed') || 0 })); }
        if (!count) return err(s, 'ไม่มีดินพรวนว่างตรงนั้น');
        addXp(s, count * D.XP.plant); sendMe(s, ['inv']); break;
      }
      case 'reap': {
        const bonus = D.passive(p.cls, 'harvestPlus') + (buffVal(s, 'yield', 0));
        for (let dy = -sk.r; dy <= sk.r; dy++) for (let dx = -sk.r; dx <= sk.r; dx++) { const x = px + dx, y = py + dy; const o = W.getObj(x, y); if (!o || o.t !== 'crop' || o.s < 4 || (o.o && o.o !== p.id)) continue; const cd = D.CROPS[o.c]; const n = cd.n[0] + Math.floor(Math.random() * (cd.n[1] - cd.n[0] + 1)) + bonus; give(p, cd.yield, n); p.stats.harvest += n; count++; if (cd.regrow) { o.s = 2; o.p = 2 * cd.stageSec; broadcastWorld(W.setObj(x, y, o)); } else broadcastWorld(W.setObj(x, y, null)); }
        if (!count) return err(s, 'ไม่มีผักสุกรอบตัว');
        toast(s, `เก็บเกี่ยว ${count} ต้น`, 'get'); addXp(s, count * D.XP.harvest); sendMe(s, ['inv']); break;
      }
      case 'gather': {
        const bonus = D.passive(p.cls, 'gatherPlus') + buffVal(s, 'yield', 0); const got = {};
        for (let dy = -sk.r; dy <= sk.r; dy++) for (let dx = -sk.r; dx <= sk.r; dx++) { const x = px + dx, y = py + dy; const o = W.getObj(x, y); if (!o) continue;
          if (o.t === 'bush' && o.b) { const n = 1 + Math.floor(Math.random() * 3) + bonus; give(p, 'berry', n); got.berry = (got.berry || 0) + n; o.b = 0; o.p = 0; broadcastWorld(W.setObj(x, y, o)); count++; }
          else if (o.t === 'flower' || o.t === 'mushroom') { const it = o.t; const n = (o.t === 'mushroom' ? 1 + Math.floor(Math.random() * 2) : 1) + bonus; give(p, it, n); got[it] = (got[it] || 0) + n; broadcastWorld(W.setObj(x, y, null)); count++; } }
        if (!count) return err(s, 'ไม่มีของป่ารอบตัว');
        toast(s, 'เก็บได้ ' + Object.entries(got).map(([k, v]) => `${D.ITEMS[k].th} +${v}`).join(' '), 'get'); addXp(s, count * D.XP.gather); sendMe(s, ['inv']); break;
      }
      case 'floor': {
        const it = D.ITEMS[m.item]; if (!it || it.tile == null) return err(s, 'เลือกพื้นในช่องอุปกรณ์ก่อน');
        for (let dy = -sk.r; dy <= sk.r; dy++) for (let dx = -sk.r; dx <= sk.r; dx++) { const x = tx + dx, y = ty + dy; if (!has(p, m.item)) break; const t = W.getTile(x, y), td = D.TILES[t]; const own = W.tileOwner(x, y); if (!td.walk || t === D.T.SHALLOW || (own && own !== p.id) || nearTown(x, y) || t === it.tile || td.soil) continue; take(p, m.item, 1); count++; if (td.floor) { const back = Object.entries(D.ITEMS).find(([k, v]) => v.tile === t); if (back) give(p, back[0], 1); } broadcastWorld(W.setTile(x, y, it.tile, p.id)); }
        if (!count) return err(s, 'ปูตรงนั้นไม่ได้');
        p.stats.built += count; addXp(s, count * D.XP.build); sendMe(s, ['inv']); break;
      }
      case 'wall': {
        const it = D.ITEMS[m.item]; if (!it || !it.obj || !D.OBJ[it.obj].build) return err(s, 'เลือกผนัง/รั้วในช่องอุปกรณ์ก่อน');
        const horiz = p.d === 'left' || p.d === 'right'; const half = Math.floor(sk.len / 2);
        for (let i = -half; i <= half; i++) { const x = horiz ? tx + i : tx, y = horiz ? ty : ty + i; if (!has(p, m.item)) break; const t = W.getTile(x, y), td = D.TILES[t]; if (!td.walk || td.soil || W.getObj(x, y) || nearTown(x, y) || playerOnTile(x, y)) continue; take(p, m.item, 1); count++; broadcastWorld(W.setObj(x, y, { t: it.obj, o: p.id })); }
        if (!count) return err(s, 'วางตรงนั้นไม่ได้');
        p.stats.built += count; addXp(s, count * D.XP.build); sendMe(s, ['inv']); break;
      }
      case 'demolish': {
        for (let dy = -sk.r; dy <= sk.r; dy++) for (let dx = -sk.r; dx <= sk.r; dx++) { const x = tx + dx, y = ty + dy; const o = W.getObj(x, y); if (o && o.o === p.id && D.OBJ[o.t] && D.OBJ[o.t].build) { for (const [it2, mn] of D.OBJ[o.t].drops || []) give(p, it2, mn); broadcastWorld(W.setObj(x, y, null)); count++; } const t = W.getTile(x, y); if (D.TILES[t].floor && W.tileOwner(x, y) === p.id) { const back = Object.entries(D.ITEMS).find(([k, v]) => v.tile === t); if (back) give(p, back[0], 1); broadcastWorld(W.setTile(x, y, D.T.DIRT, 0)); count++; } }
        if (!count) return err(s, 'ไม่มีสิ่งก่อสร้างของคุณตรงนั้น');
        toast(s, `รื้อ ${count} ชิ้น คืนของเข้ากระเป๋าแล้ว`, 'info'); sendMe(s, ['inv']); break;
      }
      case 'quarry': {
        const woodP = D.passive(p.cls, 'woodPlus'), stoneP = D.passive(p.cls, 'stonePlus');
        for (let dy = -sk.r; dy <= sk.r; dy++) for (let dx = -sk.r; dx <= sk.r; dx++) { const x = tx + dx, y = ty + dy; const o = W.getObj(x, y); if (!o) continue; const def = D.OBJ[o.t]; if (!def || !def.natural || o.t === 'bush' || o.t === 'flower' || o.t === 'mushroom') continue;
          for (const [it2, mn, mx, ch] of def.drops || []) { let chance = ch; if (it2 === 'ore') chance += D.passive(p.cls, 'oreChance') / 100; if (Math.random() > chance) continue; let n = mn + Math.floor(Math.random() * (mx - mn + 1)) + sk.bonus; if (it2 === 'wood') n += woodP; if (it2 === 'stone') n += stoneP; give(p, it2, n); }
          broadcastWorld(W.setObj(x, y, null)); count++; }
        if (!count) return err(s, 'ไม่มีหินหรือต้นไม้ตรงนั้น');
        fx('boom', tx, ty, { r: sk.r + 0.5 }); toast(s, `ทำลาย ${count} ชิ้น ได้ของเข้ากระเป๋า`, 'get'); addXp(s, count * D.XP.mine); sendMe(s, ['inv']); break;
      }
      case 'slow': { for (const mob of MOBS.within(p.x, p.y, sk.r)) { mob.slow = now + sk.dur * 1000; count++; } fx('rain', px, py, { r: sk.r }); toast(s, `${sk.th}: มอนสเตอร์ ${count} ตัวช้าลง`, 'info'); break; }
      case 'stun': { const cx = sk.range ? tx + 0.5 : p.x, cy = sk.range ? ty + 0.5 : p.y; for (const mob of MOBS.within(cx, cy, sk.r)) { mob.stun = now + sk.dur * 1000; count++; } fx('fan', sk.range ? tx : px, sk.range ? ty : py, { r: sk.r }); toast(s, `${sk.th}: มอนสเตอร์ ${count} ตัวหยุดนิ่ง`, 'info'); break; }
      case 'push': { for (const mob of MOBS.within(p.x, p.y, sk.r)) { const dx = mob.x - p.x, dy = mob.y - p.y, d = Math.hypot(dx, dy) || 1; const nx = mob.x + dx / d * sk.force, ny = mob.y + dy / d * sk.force; if (W.walkable(Math.floor(nx), Math.floor(ny))) { mob.x = nx; mob.y = ny; } mob.stun = now + 800; count++; } fx('fan', px, py, { r: sk.r }); break; }
      case 'poison': { const mob = MOBS.at(tx, ty) || MOBS.within(tx + 0.5, ty + 0.5, 1.0)[0]; if (!mob) return err(s, 'ไม่มีเป้าหมายตรงนั้น'); mob.dot = { dps: skillDmg(s, sk.dps), until: now + sk.dur * 1000, by: s }; fx('shot', mob.x, mob.y, { from: { x: p.x, y: p.y } }); break; }
      case 'drain': { const mob = MOBS.at(tx, ty) || MOBS.within(tx + 0.5, ty + 0.5, 1.0)[0]; if (!mob) return err(s, 'ไม่มีเป้าหมายตรงนั้น'); const dmg = skillDmg(s, sk.dmg); fx('shot', mob.x, mob.y, { from: { x: p.x, y: p.y }, big: true }); hitMob(s, mob, dmg); p.hp = clamp(p.hp + Math.floor(dmg / 2), 0, 100); sendMe(s, ['hp']); break; }
      case 'warp': { if (sk.where === 'home') { if (!p.home) return err(s, 'ยังไม่มีบ้าน'); warp(s, p.home.x, p.home.y + 1); } else warp(s, D.SPAWN.x, D.SPAWN.y + 2); break; }
      case 'find': { const r = findNearest(s, sk.what); if (!r) return err(s, 'ไม่พบในระยะค้นหา'); toast(s, `${sk.th}: ${r.name ? r.name + ' ' : ''}อยู่ทาง${dirName(r.x - p.x, r.y - p.y)} ห่าง ${Math.round(r.d)} ช่อง`, 'info'); send(s.ws, { t: 'ping', at: { x: r.x, y: r.y } }); break; }
      case 'treasure': { const [it, a, b] = sk.table[Math.floor(Math.random() * sk.table.length)]; const n = a + Math.floor(Math.random() * (b - a + 1)); give(p, it, n); toast(s, `${sk.th}: ได้ ${D.ITEMS[it].th} x${n}`, 'get'); fx('buff', px, py); sendMe(s, ['inv']); break; }
      case 'panel': { if (sk.which === 'cook') setBuff(s, 'cook', 1, 120); send(s.ws, { t: 'open', panel: sk.which }); break; }
      case 'lure': { if (nearTown(px, py)) return err(s, 'ในเมืองปลอดภัย ล่อมอนสเตอร์ไม่ได้'); for (let i = 0; i < sk.num; i++) if (MOBS.spawnNear(p.x, p.y, p.level)) count++; if (!count) return err(s, 'ไม่มีที่ให้มอนสเตอร์เกิดแถวนี้'); toast(s, `ล่อมอนสเตอร์มา ${count} ตัว`, 'info'); break; }
      case 'coins': { p.coins += sk.num; toast(s, `${sk.th}: +${sk.num} เหรียญ`, 'get'); sendMe(s, ['coins']); break; }
      case 'convert': { const [a, b] = sk.ratio; const sets = Math.min(10, Math.floor((p.inv[sk.from] || 0) / a)); if (!sets) return err(s, `ต้องมี ${D.ITEMS[sk.from].th} อย่างน้อย ${a} ชิ้น`); take(p, sk.from, sets * a); const got = give(p, sk.to, sets * b); toast(s, `${sk.th}: ${D.ITEMS[sk.from].th} -${sets * a} → ${D.ITEMS[sk.to].th} +${got}`, 'get'); fx('buff', px, py); addXp(s, D.XP.craft); sendMe(s, ['inv']); break; }
      default: return;
    }
    const cd = sk.cd * (1 - D.passive(p.cls, 'cdr') / 100);
    s.cool['sk_' + sk.id] = now + cd * 1000;
    p.needs.energy = clamp(p.needs.energy - cost, 0, 100);
    send(s.ws, { t: 'skill_ok', id: sk.id, until: s.cool['sk_' + sk.id] });
    sendMe(s, ['needs']);
  }

  // per-second: buffs regen, poison dots
  function tick(now) {
    for (const s of sessions) { if (!s.p) continue; const b = buffs(s); if (b.regen) { s.p.hp = clamp(s.p.hp + b.regen.val, 0, 100); } }
    for (const mob of MOBS.mobs.values()) { if (mob.dot) { if (mob.dot.until <= now) { delete mob.dot; continue; } const by = mob.dot.by; if (by && by.p) { hitMob(by, mob, mob.dot.dps); } } }
  }

  return { useSkill, buffs, buffVal, setBuff, sendBuffs, tick, waterTile };
};
