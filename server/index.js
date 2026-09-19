/* Kuak World server: HTTP (auth + static) and WebSocket game server */
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { WebSocketServer } = require('ws');
const D = require('../public/js/defs.js');
const db = require('./db');
const W = require('./world');

const PORT = process.env.PORT || 4488;
const app = express();
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: 0 }));

// ---------------- auth ----------------
function hashPass(pw, salt) { return crypto.scryptSync(pw, salt, 32).toString('hex'); }
function validUsername(u) { return /^[a-zA-Z0-9_]{3,16}$/.test(u); }
function issueToken(uid) {
  const tok = crypto.randomBytes(24).toString('hex');
  db.users.tokens[tok] = { uid, at: Date.now() };
  db.markDirty('users');
  return tok;
}
app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!validUsername(username || '')) return res.status(400).json({ error: 'ชื่อผู้ใช้ต้องเป็น a-z, 0-9, _ ยาว 3-16 ตัว' });
  if (!password || password.length < 4) return res.status(400).json({ error: 'รหัสผ่านอย่างน้อย 4 ตัวอักษร' });
  const key = username.toLowerCase();
  if (db.users.byName[key]) return res.status(409).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
  const salt = crypto.randomBytes(8).toString('hex');
  const id = db.users.nextId++;
  db.users.byName[key] = { id, username, salt, hash: hashPass(password, salt), createdAt: Date.now() };
  db.markDirty('users');
  res.json({ token: issueToken(id), username });
});
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const u = db.users.byName[(username || '').toLowerCase()];
  if (!u || u.hash !== hashPass(password || '', u.salt)) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  res.json({ token: issueToken(u.id), username: u.username });
});
app.get('/api/stats', (req, res) => {
  res.json({ online: online.size, users: Object.keys(db.users.byName).length, time: db.world.time });
});

let mapCache = null;
app.get('/api/map', (req, res) => {
  if (!mapCache) {
    const N = 256, step = D.WORLD_SIZE / N; const buf = Buffer.alloc(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) buf[y * N + x] = W.tileAt(Math.floor(x * step + step / 2), Math.floor(y * step + step / 2));
    mapCache = { n: N, tiles: buf.toString('base64') };
  }
  res.json(mapCache);
});

function userById(id) { for (const u of Object.values(db.users.byName)) if (u.id === Number(id)) return u; return null; }

// ---------------- player helpers ----------------
const STARTER = { axe: 1, pickaxe: 1, hoe: 1, can: 1, hammer: 1, seed_carrot: 6, seed_tomato: 4, wood: 20, stone: 10, bread: 2 };
function newPlayer(u, name, look) {
  const sp = W.findFreeNear(D.SPAWN.x + (Math.random() * 6 - 3) | 0, D.SPAWN.y + 2 + (Math.random() * 3) | 0, 6);
  return {
    id: u.id, username: u.username, name, look,
    x: sp.x + 0.5, y: sp.y + 0.5, d: 'down',
    inv: { ...STARTER }, hotbar: ['seed_carrot', 'seed_tomato', 'wood', 'bread', null],
    coins: 100, needs: { hunger: 90, energy: 100, fun: 80, hygiene: 90 },
    home: null, friends: [], reqIn: [], reqOut: [], unread: {},
    stats: { wood: 0, stone: 0, harvest: 0, built: 0 },
    level: 1, xp: 0, vehicle: null,
    createdAt: Date.now(), lastSeen: Date.now(), state: null,
  };
}
function give(p, item, n) {
  if (!D.ITEMS[item] || n <= 0) return 0;
  const cap = D.ITEMS[item].stack || 99;
  const cur = p.inv[item] || 0;
  const add = Math.min(n, Math.max(0, cap - cur));
  if (add > 0) p.inv[item] = cur + add;
  return add;
}
function take(p, item, n) {
  if ((p.inv[item] || 0) < n) return false;
  p.inv[item] -= n;
  if (p.inv[item] <= 0) delete p.inv[item];
  return true;
}
function has(p, item, n = 1) { return (p.inv[item] || 0) >= n; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function addXp(s, n) {
  const p = s.p; if (!n) return;
  p.level = p.level || 1; p.xp = (p.xp || 0) + n;
  let leveled = false;
  while (p.xp >= D.xpNeed(p.level)) {
    p.xp -= D.xpNeed(p.level); p.level++; leveled = true;
    const bonus = 20 * p.level; p.coins += bonus;
    const unlocks = [];
    for (const r of D.RECIPES) if (r.lv === p.level) unlocks.push(D.ITEMS[r.out].th);
    for (const [k, lv] of Object.entries(D.SHOP.lv)) if (lv === p.level) unlocks.push(D.ITEMS[k].th + ' (ร้านค้า)');
    const era = D.ERAS.find(e => e.lv === p.level);
    send(s.ws, { t: 'levelup', level: p.level, bonus, unlocks, era: era ? era.th : null, eraIcon: era ? era.icon : null });
  }
  sendMe(s, leveled ? ['xp', 'level', 'coins'] : ['xp']);
  if (leveled) db.putPlayer(p);
}
function lvOk(s, lv) { if ((s.p.level || 1) < lv) { err(s, `ต้องถึงเลเวล ${lv} (${D.eraOf(lv).th}) ก่อน`); return false; } return true; }
function publicInfo(p, onlineFlag) {
  return { id: p.id, name: p.name, username: p.username, look: p.look, online: !!onlineFlag };
}

// ---------------- sessions ----------------
const online = new Map(); // uid -> session
let sessions = new Set();

function send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function toast(s, text, kind) { send(s.ws, { t: 'toast', text, kind: kind || 'info' }); }
function err(s, text) { send(s.ws, { t: 'toast', text, kind: 'error' }); }
function sendMe(s, fields) {
  const p = s.p; const patch = {};
  for (const f of fields) patch[f] = p[f];
  send(s.ws, { t: 'me', patch });
}
function broadcastWorld(msg) {
  const cx = Math.floor(msg.x / D.CHUNK), cy = Math.floor(msg.y / D.CHUNK);
  const k = W.chunkKey(cx, cy);
  const str = JSON.stringify(msg);
  for (const s of sessions) if (s.p && s.sentChunks.has(k) && s.ws.readyState === 1) s.ws.send(str);
}
function broadcastAll(msg, except) {
  const str = JSON.stringify(msg);
  for (const s of sessions) if (s.p && s !== except && s.ws.readyState === 1) s.ws.send(str);
}
function nearbySessions(x, y, r) {
  const out = [];
  for (const s of sessions) if (s.p && Math.abs(s.p.x - x) <= r && Math.abs(s.p.y - y) <= r) out.push(s);
  return out;
}
function dist(s, x, y) { return Math.max(Math.abs(s.p.x - (x + 0.5)), Math.abs(s.p.y - (y + 0.5))); }
function playerOnTile(x, y) {
  for (const s of sessions) if (s.p && Math.floor(s.p.x) === x && Math.floor(s.p.y) === y) return true;
  return false;
}
function notifyFriends(p, msg) {
  for (const fid of p.friends) { const fs = online.get(Number(fid)); if (fs) send(fs.ws, msg); }
}
function friendList(p) {
  return p.friends.map(id => { const fp = db.getPlayer(id); return fp ? publicInfo(fp, online.has(Number(id))) : null; }).filter(Boolean);
}
function reqList(p) {
  return p.reqIn.map(id => { const fp = db.getPlayer(id); return fp ? publicInfo(fp, online.has(Number(id))) : null; }).filter(Boolean);
}
function warp(s, x, y) {
  const f = W.findFreeNear(x, y, 6);
  s.p.x = f.x + 0.5; s.p.y = f.y + 0.5; s.p.state = null;
  if (s.p.vehicle) { s.p.vehicle = null; sendMe(s, ['vehicle']); }
  send(s.ws, { t: 'warp', x: s.p.x, y: s.p.y });
}

// ---------------- game actions ----------------
function doUse(s, m) {
  const p = s.p;
  const x = Math.floor(m.x), y = Math.floor(m.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  if (dist(s, x, y) > 3.2) return err(s, 'ไกลเกินไป');
  const itemId = m.item || 'hand';
  const item = D.ITEMS[itemId];
  if (!item) return;
  if (itemId !== 'hand' && !has(p, itemId)) return err(s, 'ไม่มีไอเทมนี้');
  const tool = item.tool || null;
  const obj = W.getObj(x, y);
  const tile = W.getTile(x, y);
  const tdef = D.TILES[tile];
  p.state = null;
  s.anim = { a: tool && tool !== 'hand' ? tool : 'hand', until: Date.now() + 350, tx: x, ty: y };

  if (obj) {
    if (obj.t === 'shop') { send(s.ws, { t: 'open', panel: 'shop' }); return; }
    if (obj.t === 'crop') return useCrop(s, x, y, obj, item);
    const def = D.OBJ[obj.t];
    if (!def) return;
    if (obj.town) { if (obj.t === 'sign') send(s.ws, { t: 'sign', x, y, txt: obj.txt }); return; }
    if (def.use && (tool === 'hand' || !tool)) return useFurniture(s, x, y, obj, def);
    if (obj.t === 'sign' && (tool === 'hand' || !tool)) { send(s.ws, { t: 'sign', x, y, txt: obj.txt || '', own: obj.o === p.id }); return; }
    if (def.build && obj.o && obj.o !== p.id) return err(s, 'สิ่งนี้เป็นของคนอื่น แก้ไขไม่ได้');
    if (def.tool && tool !== def.tool) {
      const need = { axe: 'ขวาน', pickaxe: 'อีเต้อ', hammer: 'ค้อน', hand: 'มือเปล่า' }[def.tool];
      return err(s, `ต้องใช้${need}กับ${def.th}`);
    }
    // hit
    if (obj.t === 'bush') {
      if (!obj.b) return err(s, 'พุ่มนี้ยังไม่มีผล รอสักครู่');
      obj.b = 0; obj.p = 0;
      const n = 1 + Math.floor(Math.random() * 3);
      give(p, 'berry', n); toast(s, `+${n} เบอร์รี่`, 'get');
      broadcastWorld(W.setObj(x, y, obj));
      p.needs.fun = clamp(p.needs.fun + 1, 0, 100);
      sendMe(s, ['inv']); addXp(s, D.XP.gather); db.putPlayer(p); return;
    }
    obj.hp = (obj.hp || def.hp || 1) - (item.dmg || 1);
    if (obj.hp > 0) { broadcastWorld({ t: 'hit', x, y, hp: obj.hp }); W.setObj(x, y, obj); return; }
    // removed → drops
    const got = [];
    for (const [it, mn, mx, ch] of def.drops || []) {
      if (Math.random() > ch) continue;
      const n = mn + Math.floor(Math.random() * (mx - mn + 1));
      const a = give(p, it, n);
      if (a > 0) got.push(`+${a} ${D.ITEMS[it].th}`);
      if (it === 'wood') p.stats.wood += a; if (it === 'stone') p.stats.stone += a;
    }
    broadcastWorld(W.setObj(x, y, null));
    if (got.length) toast(s, got.join('  '), 'get');
    sendMe(s, ['inv']);
    if (def.natural) addXp(s, def.tool === 'axe' ? D.XP.chop : def.tool === 'pickaxe' ? D.XP.mine : D.XP.gather);
    db.putPlayer(p);
    return;
  }

  // ---- empty tile ----
  if (item.crop) {
    if (!tdef.soil) return err(s, 'ต้องพรวนดินด้วยจอบก่อนปลูก');
    take(p, itemId, 1);
    const crop = { t: 'crop', c: item.crop, s: 0, p: 0, w: tile === D.T.TILLED_WET ? Date.now() + 240000 : 0, o: p.id };
    broadcastWorld(W.setObj(x, y, crop));
    sendMe(s, ['inv']); addXp(s, D.XP.plant); db.putPlayer(p); return;
  }
  if (item.plant === 'sapling') {
    if (![D.T.GRASS, D.T.DARKGRASS, D.T.DIRT].includes(tile)) return err(s, 'ปลูกกล้าไม้ได้บนหญ้าหรือดินเท่านั้น');
    take(p, itemId, 1);
    broadcastWorld(W.setObj(x, y, { t: 'sapling', p: 0, o: p.id }));
    sendMe(s, ['inv']); db.putPlayer(p); return;
  }
  if (tool === 'hoe') {
    if (tdef.soil) { // un-till
      if (W.tileOwner(x, y) && W.tileOwner(x, y) !== p.id) return err(s, 'แปลงของคนอื่น');
      broadcastWorld(W.setTile(x, y, D.T.DIRT, 0)); return;
    }
    if (!tdef.hoe) return err(s, 'พรวนได้เฉพาะหญ้าและดิน');
    if (nearTown(x, y)) return err(s, 'ห้ามขุดในเขตเมือง');
    broadcastWorld(W.setTile(x, y, D.T.TILLED, p.id)); return;
  }
  if (tool === 'can') {
    if (tile === D.T.TILLED) { W.setWet(x, y, Date.now() + 240000); broadcastWorld(W.setTile(x, y, D.T.TILLED_WET, W.tileOwner(x, y))); addXp(s, D.XP.water); return; }
    if (tile === D.T.TILLED_WET) return;
    if (tile === D.T.WATER || tile === D.T.SHALLOW) return toast(s, 'เติมน้ำแล้ว (บัวรดน้ำไม่มีวันหมด)', 'info');
    return err(s, 'รดน้ำได้เฉพาะดินพรวน');
  }
  if (tool === 'pickaxe' && tdef.floor) {
    const own = W.tileOwner(x, y);
    if (own && own !== p.id) return err(s, 'พื้นของคนอื่น');
    if (nearTown(x, y) && !own) return err(s, 'ห้ามขุดในเขตเมือง');
    const back = Object.entries(D.ITEMS).find(([k, v]) => v.tile === tile);
    if (back) give(p, back[0], 1);
    broadcastWorld(W.setTile(x, y, D.T.DIRT, 0));
    sendMe(s, ['inv']); db.putPlayer(p); return;
  }
  if (item.tile != null) {
    if (tile === D.T.WATER || tile === D.T.SHALLOW) return err(s, 'วางบนน้ำไม่ได้');
    const own = W.tileOwner(x, y);
    if (own && own !== p.id) return err(s, 'พื้นของคนอื่น');
    if (nearTown(x, y)) return err(s, 'ห้ามสร้างในเขตเมือง');
    if (tile === item.tile) return;
    take(p, itemId, 1);
    if (tdef.floor) { const back = Object.entries(D.ITEMS).find(([k, v]) => v.tile === tile); if (back) give(p, back[0], 1); }
    p.stats.built++;
    broadcastWorld(W.setTile(x, y, item.tile, p.id));
    sendMe(s, ['inv']); addXp(s, D.XP.build); db.putPlayer(p); return;
  }
  if (item.obj) {
    if (!tdef.walk) return err(s, 'วางบนน้ำไม่ได้');
    if (nearTown(x, y)) return err(s, 'ห้ามสร้างในเขตเมือง');
    const odef = D.OBJ[item.obj];
    if (odef.solid && playerOnTile(x, y)) return err(s, 'มีคนยืนอยู่ตรงนั้น');
    if (tdef.soil) return err(s, 'วางบนดินพรวนไม่ได้');
    take(p, itemId, 1);
    p.stats.built++;
    const o = { t: item.obj, o: p.id };
    if (item.obj === 'sign') o.txt = '';
    broadcastWorld(W.setObj(x, y, o));
    sendMe(s, ['inv']); addXp(s, D.XP.build); db.putPlayer(p); return;
  }
  if (item.cat === 'food') return eat(s, itemId);
}
function nearTown(x, y) { return Math.max(Math.abs(x - D.SPAWN.x), Math.abs(y - D.SPAWN.y)) <= 9; }

function useCrop(s, x, y, obj, item) {
  const p = s.p;
  const cd = D.CROPS[obj.c];
  const tool = item.tool;
  if (tool === 'can') {
    obj.w = Date.now() + 240000;
    W.setWet(x, y, 0);
    broadcastWorld(W.setObj(x, y, obj));
    broadcastWorld(W.setTile(x, y, D.T.TILLED_WET, W.tileOwner(x, y)));
    addXp(s, D.XP.water);
    return;
  }
  if (obj.s >= 4) {
    if (obj.o && obj.o !== p.id) return err(s, 'ผักของคนอื่น');
    const n = cd.n[0] + Math.floor(Math.random() * (cd.n[1] - cd.n[0] + 1));
    give(p, cd.yield, n); p.stats.harvest += n;
    toast(s, `เก็บเกี่ยว +${n} ${D.ITEMS[cd.yield].th}`, 'get');
    p.needs.fun = clamp(p.needs.fun + 2, 0, 100);
    if (cd.regrow) { obj.s = 2; obj.p = 2 * cd.stageSec; broadcastWorld(W.setObj(x, y, obj)); }
    else { broadcastWorld(W.setObj(x, y, null)); }
    sendMe(s, ['inv', 'needs']); addXp(s, D.XP.harvest); db.putPlayer(p); return;
  }
  if (tool === 'hoe' || tool === 'pickaxe') {
    if (obj.o && obj.o !== p.id) return err(s, 'ผักของคนอื่น');
    broadcastWorld(W.setObj(x, y, null)); return;
  }
  const wet = obj.w > Date.now();
  toast(s, `${cd.th} ระยะ ${obj.s + 1}/5 ${wet ? '(รดน้ำแล้ว)' : '(ยังไม่รดน้ำ)'}`, 'info');
}

function useFurniture(s, x, y, obj, def) {
  const p = s.p; const now = Date.now();
  s.cool = s.cool || {};
  const use = def.use;
  if (p.vehicle && ['sleep', 'sit', 'bath'].includes(use)) { p.vehicle = null; sendMe(s, ['vehicle']); }
  if (use === 'fountain') {
    if ((s.cool.fountain || 0) > now) return toast(s, 'เพิ่งเล่นน้ำพุไป รอสักครู่', 'info');
    s.cool.fountain = now + 15000; p.needs.fun = clamp(p.needs.fun + 10, 0, 100); p.needs.hygiene = clamp(p.needs.hygiene + 5, 0, 100);
    toast(s, '⛲ เล่นน้ำพุ ความสนุก +10', 'info'); sendMe(s, ['needs']); return;
  }
  if (use === 'pc') {
    if ((s.cool.pc || 0) > now) return toast(s, 'เพิ่งเล่นคอมไป รอสักครู่', 'info');
    s.cool.pc = now + 20000; p.needs.fun = clamp(p.needs.fun + 25, 0, 100); p.needs.energy = clamp(p.needs.energy - 2, 0, 100);
    toast(s, '💻 เล่นคอมพิวเตอร์ ความสนุก +25', 'info'); sendMe(s, ['needs']); return;
  }
  if (use === 'sleep') {
    p.x = x + 0.5; p.y = y + 0.5; p.state = 'sleep';
    if (obj.o === p.id) { p.home = { x, y }; sendMe(s, ['home']); }
    send(s.ws, { t: 'warp', x: p.x, y: p.y }); sendMe(s, ['state']);
    toast(s, 'zZz นอนหลับ... (ขยับเพื่อตื่น)', 'info'); db.putPlayer(p); return;
  }
  if (use === 'sit') { p.x = x + 0.5; p.y = y + 0.5; p.state = 'sit'; send(s.ws, { t: 'warp', x: p.x, y: p.y }); sendMe(s, ['state']); return; }
  if (use === 'bath') { p.x = x + 0.5; p.y = y + 0.5; p.state = 'bath'; send(s.ws, { t: 'warp', x: p.x, y: p.y }); sendMe(s, ['state']); toast(s, 'อาบน้ำ... สดชื่น', 'info'); return; }
  if (use === 'toilet') { p.needs.hygiene = clamp(p.needs.hygiene + 15, 0, 100); p.needs.fun = clamp(p.needs.fun + 2, 0, 100); sendMe(s, ['needs']); return; }
  if (use === 'tv') {
    if ((s.cool.tv || 0) > now) return toast(s, 'ดูทีวีไปแล้ว รอสักครู่', 'info');
    s.cool.tv = now + 20000; p.needs.fun = clamp(p.needs.fun + 20, 0, 100); p.needs.energy = clamp(p.needs.energy + 3, 0, 100);
    toast(s, '📺 ดูทีวี ความสนุก +20', 'info'); sendMe(s, ['needs']); return;
  }
  if (use === 'read') {
    if ((s.cool.read || 0) > now) return toast(s, 'เพิ่งอ่านไป รอสักครู่', 'info');
    s.cool.read = now + 20000; p.needs.fun = clamp(p.needs.fun + 12, 0, 100);
    toast(s, '📖 อ่านหนังสือ ความสนุก +12', 'info'); sendMe(s, ['needs']); return;
  }
  if (use === 'fridge') {
    if (p.coins < 5) return err(s, 'ไม่มีเงินซื้อของกิน (5 เหรียญ)');
    if ((s.cool.fridge || 0) > now) return toast(s, 'เพิ่งกินไป รอสักครู่', 'info');
    s.cool.fridge = now + 15000; p.coins -= 5; p.needs.hunger = clamp(p.needs.hunger + 25, 0, 100);
    toast(s, '🥪 หยิบของกินจากตู้เย็น ความหิว +25 (-5 เหรียญ)', 'info'); sendMe(s, ['needs', 'coins']); db.putPlayer(p); return;
  }
  if (use === 'cook') { send(s.ws, { t: 'open', panel: 'cook' }); return; }
}

function eat(s, itemId) {
  const p = s.p; const it = D.ITEMS[itemId];
  if (!it || !it.food) return;
  if (!take(p, itemId, 1)) return err(s, 'ไม่มีไอเทมนี้');
  p.needs.hunger = clamp(p.needs.hunger + (it.food.h || 0), 0, 100);
  p.needs.energy = clamp(p.needs.energy + (it.food.e || 0), 0, 100);
  p.needs.fun = clamp(p.needs.fun + (it.food.f || 0), 0, 100);
  toast(s, `กิน${it.th} 😋 ความหิว +${it.food.h || 0}`, 'info');
  s.anim = { a: 'eat', until: Date.now() + 600 };
  sendMe(s, ['inv', 'needs']); db.putPlayer(p);
}
function useMisc(s, itemId) {
  const p = s.p; const it = D.ITEMS[itemId];
  if (!it || !it.use) return;
  if (!take(p, itemId, 1)) return;
  p.needs.fun = clamp(p.needs.fun + (it.use.f || 0), 0, 100);
  toast(s, `${it.th} 🌸 ความสนุก +${it.use.f || 0}`, 'info');
  sendMe(s, ['inv', 'needs']); db.putPlayer(p);
}
function craft(s, id, n, cooking) {
  const p = s.p;
  const list = cooking ? D.COOKING : D.RECIPES;
  const r = list.find(r => r.id === id);
  if (!r) return;
  n = clamp(Number(n) || 1, 1, 50);
  if (!cooking && r.lv && !lvOk(s, r.lv)) return;
  if (cooking) {
    let near = false;
    const px = Math.floor(p.x), py = Math.floor(p.y);
    for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3; dx++) { const o = W.getObj(px + dx, py + dy); if (o && (o.t === 'stove' || o.t === 'campfire')) { near = true; break; } }
    if (!near) return err(s, 'ต้องอยู่ใกล้เตาหรือกองไฟ');
  }
  for (const [it, q] of Object.entries(r.in)) if (!has(p, it, q * n)) return err(s, `วัตถุดิบไม่พอ: ต้องการ ${D.ITEMS[it].th} x${q * n}`);
  for (const [it, q] of Object.entries(r.in)) take(p, it, q * n);
  const got = give(p, r.out, r.n * n);
  toast(s, `${cooking ? 'ทำอาหาร' : 'คราฟต์'} +${got} ${D.ITEMS[r.out].th}`, 'get');
  if (cooking) p.needs.fun = clamp(p.needs.fun + 3, 0, 100);
  sendMe(s, ['inv', 'needs']); addXp(s, cooking ? D.XP.cook : D.XP.craft); db.putPlayer(p);
}
function shop(s, buy, itemId, n) {
  const p = s.p; n = clamp(Number(n) || 1, 1, 99);
  if (buy) {
    const price = D.SHOP.buy[itemId]; if (!price) return;
    if (D.SHOP.lv[itemId] && !lvOk(s, D.SHOP.lv[itemId])) return;
    if (p.coins < price * n) return err(s, 'เหรียญไม่พอ');
    const got = give(p, itemId, n); if (!got) return err(s, 'ช่องเก็บของเต็ม');
    p.coins -= price * got; toast(s, `ซื้อ ${D.ITEMS[itemId].th} x${got} (-${price * got} เหรียญ)`, 'get');
  } else {
    const price = D.SHOP.sell[itemId]; if (!price) return;
    n = Math.min(n, p.inv[itemId] || 0); if (!n) return;
    take(p, itemId, n); p.coins += price * n; toast(s, `ขาย ${D.ITEMS[itemId].th} x${n} (+${price * n} เหรียญ)`, 'get');
    addXp(s, Math.min(n, 20) * D.XP.sell);
  }
  sendMe(s, ['inv', 'coins']); db.putPlayer(p);
}

// ---------------- chat & friends ----------------
function chat(s, m) {
  const p = s.p; const now = Date.now();
  if ((s.lastChat || 0) > now - 400) return;
  s.lastChat = now;
  const text = String(m.text || '').slice(0, 300).trim();
  if (!text) return;
  const msg = { t: 'chat', scope: m.scope === 'global' ? 'global' : 'local', from: { id: p.id, name: p.name }, text, ts: now };
  if (msg.scope === 'global') {
    db.chat.push({ from: msg.from, text, ts: now }); if (db.chat.length > 300) db.chat.shift(); db.markDirty('chat');
    broadcastAll(msg);
  } else {
    for (const o of nearbySessions(p.x, p.y, 28)) send(o.ws, msg);
  }
}
function dm(s, m) {
  const p = s.p; const now = Date.now();
  const to = Number(m.to); const text = String(m.text || '').slice(0, 1000).trim();
  if (!to || !text || to === p.id) return;
  const tp = db.getPlayer(to); if (!tp) return err(s, 'ไม่พบผู้ใช้');
  const msg = { from: p.id, to, text, ts: now };
  db.appendDM(p.id, to, msg);
  send(s.ws, { t: 'dm', ...msg });
  const ts = online.get(to);
  if (ts) send(ts.ws, { t: 'dm', ...msg, fromInfo: publicInfo(p, true) });
  else { tp.unread = tp.unread || {}; tp.unread[p.id] = (tp.unread[p.id] || 0) + 1; db.putPlayer(tp); }
  if (ts) { tp.unread = tp.unread || {}; tp.unread[p.id] = (tp.unread[p.id] || 0) + 1; db.putPlayer(tp); }
}
function findUser(name) {
  const u = db.users.byName[String(name || '').toLowerCase()];
  return u ? db.getPlayer(u.id) : null;
}
function friendReq(s, name) {
  const p = s.p; const tp = findUser(name);
  if (!tp) return err(s, 'ไม่พบผู้ใช้ชื่อนี้');
  if (tp.id === p.id) return err(s, 'เพิ่มตัวเองไม่ได้');
  if (p.friends.includes(tp.id)) return toast(s, 'เป็นเพื่อนกันอยู่แล้ว', 'info');
  if (tp.reqIn.includes(p.id)) return toast(s, 'ส่งคำขอไปแล้ว รอตอบรับ', 'info');
  if (p.reqIn.includes(tp.id)) return friendAccept(s, tp.id);
  tp.reqIn.push(p.id); if (!p.reqOut.includes(tp.id)) p.reqOut.push(tp.id);
  db.putPlayer(tp); db.putPlayer(p);
  toast(s, `ส่งคำขอเป็นเพื่อนถึง ${tp.name} แล้ว`, 'info');
  const ts = online.get(tp.id); if (ts) send(ts.ws, { t: 'friend_req', from: publicInfo(p, true), reqs: reqList(tp) });
}
function friendAccept(s, id) {
  const p = s.p; id = Number(id);
  if (!p.reqIn.includes(id)) return;
  const tp = db.getPlayer(id); if (!tp) return;
  p.reqIn = p.reqIn.filter(x => x !== id); tp.reqOut = tp.reqOut.filter(x => x !== p.id);
  if (!p.friends.includes(id)) p.friends.push(id);
  if (!tp.friends.includes(p.id)) tp.friends.push(p.id);
  db.putPlayer(p); db.putPlayer(tp);
  send(s.ws, { t: 'friends', list: friendList(p), reqs: reqList(p) });
  toast(s, `คุณกับ ${tp.name} เป็นเพื่อนกันแล้ว 🎉`, 'get');
  const ts = online.get(id); if (ts) { send(ts.ws, { t: 'friends', list: friendList(tp), reqs: reqList(tp) }); toast(ts, `${p.name} ตอบรับคำขอเป็นเพื่อนแล้ว 🎉`, 'get'); }
}
function friendDecline(s, id) {
  const p = s.p; id = Number(id);
  p.reqIn = p.reqIn.filter(x => x !== id); db.putPlayer(p);
  const tp = db.getPlayer(id); if (tp) { tp.reqOut = tp.reqOut.filter(x => x !== p.id); db.putPlayer(tp); }
  send(s.ws, { t: 'friends', list: friendList(p), reqs: reqList(p) });
}
function friendRemove(s, id) {
  const p = s.p; id = Number(id);
  p.friends = p.friends.filter(x => x !== id); db.putPlayer(p);
  const tp = db.getPlayer(id); if (tp) { tp.friends = tp.friends.filter(x => x !== p.id); db.putPlayer(tp); const ts = online.get(id); if (ts) send(ts.ws, { t: 'friends', list: friendList(tp), reqs: reqList(tp) }); }
  send(s.ws, { t: 'friends', list: friendList(p), reqs: reqList(p) });
}
function visit(s, id) {
  const p = s.p; id = Number(id);
  if (!p.friends.includes(id)) return err(s, 'ต้องเป็นเพื่อนกันก่อน');
  if ((s.warpCool || 0) > Date.now()) return err(s, 'รอสักครู่ก่อนวาร์ปอีกครั้ง');
  const ts = online.get(id);
  if (ts) { s.warpCool = Date.now() + 8000; warp(s, ts.p.x + 1, ts.p.y); toast(s, `วาร์ปไปหา ${ts.p.name} แล้ว`, 'info'); toast(ts, `${p.name} มาหาคุณ 👋`, 'info'); return; }
  const tp = db.getPlayer(id);
  if (tp && tp.home) { s.warpCool = Date.now() + 8000; warp(s, tp.home.x + 1, tp.home.y + 1); toast(s, `${tp.name} ออฟไลน์ ไปที่บ้านของเขาแทน`, 'info'); return; }
  err(s, 'เพื่อนออฟไลน์และยังไม่มีบ้าน');
}

// ---------------- websocket ----------------
const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });

wss.on('connection', (ws) => {
  const s = { ws, p: null, sentChunks: new Set(), known: new Set(), anim: null, lastMoveAt: 0 };
  sessions.add(s);
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    try { handle(s, m); } catch (e) { console.error('handle error', m && m.t, e); }
  });
  ws.on('close', () => {
    sessions.delete(s);
    if (s.p) {
      if (online.get(s.p.id) === s) online.delete(s.p.id);
      s.p.lastSeen = Date.now(); s.p.state = null; db.putPlayer(s.p);
      notifyFriends(s.p, { t: 'presence', id: s.p.id, online: false });
      broadcastAll({ t: 'leave', id: s.p.id }, s);
    }
  });
  ws.on('error', () => {});
});

function handle(s, m) {
  if (m.t === 'auth') {
    const tk = db.users.tokens[m.token];
    if (!tk) return send(s.ws, { t: 'auth_fail' });
    const u = userById(tk.uid);
    if (!u) return send(s.ws, { t: 'auth_fail' });
    s.uid = u.id; s.user = u;
    const p = db.getPlayer(u.id);
    if (!p) return send(s.ws, { t: 'need_create', username: u.username });
    return enter(s, p);
  }
  if (m.t === 'create') {
    if (!s.user) return;
    if (db.getPlayer(s.user.id)) return enter(s, db.getPlayer(s.user.id));
    const name = String(m.name || '').trim().slice(0, 16) || s.user.username;
    const look = sanitizeLook(m.look);
    const p = newPlayer(s.user, name, look);
    db.putPlayer(p);
    return enter(s, p);
  }
  if (!s.p) return;
  const p = s.p;
  if (m.t !== 'move' && m.t !== 'chunks' && m.t !== 'ping') s.lastActive = Date.now();
  switch (m.t) {
    case 'move': {
      const x = Number(m.x), y = Number(m.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const dx = x - p.x, dy = y - p.y;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) return send(s.ws, { t: 'warp', x: p.x, y: p.y });
      if (!W.passableFor(p.vehicle, Math.floor(x), Math.floor(y))) return send(s.ws, { t: 'warp', x: p.x, y: p.y });
      if (p.state && (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05)) p.state = null;
      p.x = x; p.y = y; p.d = ['up', 'down', 'left', 'right'].includes(m.d) ? m.d : p.d; s.moving = !!m.m;
      if (s.moving || Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) s.lastActive = Date.now();
      s.dirtyPos = true;
      return;
    }
    case 'chunks': {
      const list = Array.isArray(m.list) ? m.list.slice(0, 40) : [];
      const pcx = Math.floor(p.x / D.CHUNK), pcy = Math.floor(p.y / D.CHUNK);
      for (const [cx, cy] of list) {
        if (Math.abs(cx - pcx) > 6 || Math.abs(cy - pcy) > 6) continue;
        const c = W.getChunk(cx, cy); if (!c) continue;
        s.sentChunks.add(W.chunkKey(cx, cy));
        send(s.ws, W.serializeChunk(c));
      }
      return;
    }
    case 'use': return doUse(s, m);
    case 'eat': return eat(s, String(m.item));
    case 'usemisc': return useMisc(s, String(m.item));
    case 'craft': return craft(s, String(m.id), m.n, false);
    case 'cook': return craft(s, String(m.id), m.n, true);
    case 'buy': return shop(s, true, String(m.item), m.n);
    case 'sell': return shop(s, false, String(m.item), m.n);
    case 'hotbar': if (Array.isArray(m.items)) { p.hotbar = m.items.slice(0, D.ITEM_SLOTS).map(x => (x && D.ITEMS[x] && D.ITEMS[x].cat !== 'tool') ? x : null); db.putPlayer(p); } return;
    case 'chat': return chat(s, m);
    case 'dm': return dm(s, m);
    case 'dm_history': {
      const withId = Number(m.with); if (!withId) return;
      const msgs = db.getConv(p.id, withId).slice(-80);
      const tp = db.getPlayer(withId);
      return send(s.ws, { t: 'dm_history', with: withId, info: tp ? publicInfo(tp, online.has(withId)) : null, msgs });
    }
    case 'dm_read': { const id = Number(m.with); if (p.unread && p.unread[id]) { delete p.unread[id]; db.putPlayer(p); } return; }
    case 'search_user': {
      const q = String(m.q || '').toLowerCase().slice(0, 16);
      const out = [];
      for (const u of Object.values(db.users.byName)) {
        if (u.id === p.id) continue;
        const tp = db.getPlayer(u.id); if (!tp) continue;
        if (u.username.toLowerCase().includes(q) || tp.name.toLowerCase().includes(q)) out.push(publicInfo(tp, online.has(u.id)));
        if (out.length >= 12) break;
      }
      return send(s.ws, { t: 'search_result', list: out, q });
    }
    case 'friend_req': return friendReq(s, m.name);
    case 'friend_accept': return friendAccept(s, m.id);
    case 'friend_decline': return friendDecline(s, m.id);
    case 'friend_remove': return friendRemove(s, m.id);
    case 'visit': return visit(s, m.id);
    case 'home': {
      if (!p.home) return err(s, 'ยังไม่มีบ้าน: วางเตียงแล้วนอน หรือกด "ตั้งจุดนี้เป็นบ้าน"');
      if ((s.warpCool || 0) > Date.now()) return err(s, 'รอสักครู่ก่อนวาร์ปอีกครั้ง');
      s.warpCool = Date.now() + 8000; warp(s, p.home.x, p.home.y + 1); return;
    }
    case 'sethome': { p.home = { x: Math.floor(p.x), y: Math.floor(p.y) }; db.putPlayer(p); sendMe(s, ['home']); toast(s, 'ตั้งจุดนี้เป็นบ้านแล้ว 🏠', 'get'); return; }
    case 'town': { if ((s.warpCool || 0) > Date.now()) return err(s, 'รอสักครู่ก่อนวาร์ปอีกครั้ง'); s.warpCool = Date.now() + 8000; warp(s, D.SPAWN.x, D.SPAWN.y + 2); return; }
    case 'wake': { p.state = null; return; }
    case 'mount': {
      const px = Math.floor(p.x), py = Math.floor(p.y);
      if (p.vehicle) {
        if (!W.walkable(px, py)) return err(s, 'ต้องจอดบนพื้นที่เดินได้ก่อน (ชายหาด/พื้นดิน)');
        toast(s, `ลงจาก${D.VEHICLES[p.vehicle].th}แล้ว`, 'info'); p.vehicle = null; db.putPlayer(p); sendMe(s, ['vehicle']); return;
      }
      const it = D.ITEMS[String(m.item)]; if (!it || !it.vehicle || !has(p, m.item)) return;
      const v = D.VEHICLES[it.vehicle];
      if (!lvOk(s, v.lv)) return;
      if (v.water) {
        let ok = false;
        for (let dy = -1; dy <= 1 && !ok; dy++) for (let dx = -1; dx <= 1; dx++) { const t = W.getTile(px + dx, py + dy); if (t === D.T.WATER || t === D.T.SHALLOW || t === D.T.SAND) { ok = true; break; } }
        if (!ok) return err(s, 'ต้องอยู่ริมน้ำหรือบนชายหาดถึงจะลงน้ำได้');
      }
      p.vehicle = it.vehicle; p.state = null; db.putPlayer(p); sendMe(s, ['vehicle']);
      toast(s, `🚀 ขึ้น${v.th} (ความเร็ว x${v.speed}) กด V เพื่อลง`, 'get'); return;
    }
    case 'sign_text': {
      const x = Math.floor(m.x), y = Math.floor(m.y); const o = W.getObj(x, y);
      if (!o || o.t !== 'sign' || o.o !== p.id) return;
      o.txt = String(m.text || '').slice(0, 120); broadcastWorld(W.setObj(x, y, o)); return;
    }
    case 'setlook': { p.look = sanitizeLook(m.look); if (m.name) p.name = String(m.name).trim().slice(0, 16) || p.name; db.putPlayer(p); s.lookVer = (s.lookVer || 0) + 1; for (const o of sessions) o.known.delete(p.id); sendMe(s, ['look', 'name']); return; }
    case 'ping': return send(s.ws, { t: 'pong', ts: m.ts });
  }
}
function sanitizeLook(l) {
  l = l || {};
  const pick = (arr, v, def) => arr.includes(v) ? v : (def !== undefined ? def : arr[0]);
  return {
    skin: pick(D.LOOKS.skin, l.skin), hair: pick(D.LOOKS.hair, l.hair), hairStyle: pick(D.LOOKS.hairStyle, l.hairStyle),
    shirt: pick(D.LOOKS.shirt, l.shirt), pants: pick(D.LOOKS.pants, l.pants), eyes: pick(D.LOOKS.eyes, l.eyes), hat: pick(D.LOOKS.hat, l.hat, 'none'),
  };
}
function enter(s, p) {
  const prev = online.get(p.id);
  if (prev && prev !== s) { send(prev.ws, { t: 'kick', reason: 'มีการเข้าสู่ระบบจากที่อื่น' }); prev.p = null; prev.ws.close(); sessions.delete(prev); }
  s.p = p; p.lastSeen = Date.now(); p.state = null; s.lastActive = Date.now();
  p.level = p.level || 1; p.xp = p.xp || 0; p.vehicle = p.vehicle || null;
  // migrate old 8-slot hotbar (tools mixed in) -> item-only zone
  if (!Array.isArray(p.hotbar) || p.hotbar.length !== D.ITEM_SLOTS || p.hotbar.some(x => x && D.ITEMS[x] && D.ITEMS[x].cat === 'tool')) {
    const items = (p.hotbar || []).filter(x => x && D.ITEMS[x] && D.ITEMS[x].cat !== 'tool');
    p.hotbar = items.slice(0, D.ITEM_SLOTS); while (p.hotbar.length < D.ITEM_SLOTS) p.hotbar.push(null);
  }
  if (p.vehicle && !D.VEHICLES[p.vehicle]) p.vehicle = null;
  online.set(p.id, s);
  // make sure not stuck
  if (!W.passableFor(p.vehicle, Math.floor(p.x), Math.floor(p.y))) { p.vehicle = null; const f = W.findFreeNear(p.x, p.y, 8); p.x = f.x + 0.5; p.y = f.y + 0.5; }
  send(s.ws, {
    t: 'init', me: p, friends: friendList(p), reqs: reqList(p),
    world: { size: D.WORLD_SIZE, chunk: D.CHUNK, time: db.world.time, spawn: D.SPAWN },
    global: db.chat.slice(-60), online: online.size,
  });
  notifyFriends(p, { t: 'presence', id: p.id, online: true });
  db.putPlayer(p);
}

// ---------------- loops ----------------
// presence broadcast 10Hz
setInterval(() => {
  const now = Date.now();
  const arr = [...sessions].filter(s => s.p);
  for (const s of arr) {
    const list = [];
    for (const o of arr) {
      if (Math.abs(o.p.x - s.p.x) > 40 || Math.abs(o.p.y - s.p.y) > 30) { s.known.delete(o.p.id); continue; }
      const e = { id: o.p.id, x: +o.p.x.toFixed(2), y: +o.p.y.toFixed(2), d: o.p.d, m: o.moving ? 1 : 0, s: o.p.state || 0, v: o.p.vehicle || 0 };
      if (o.anim && o.anim.until > now) { e.a = o.anim.a; e.tx = o.anim.tx; e.ty = o.anim.ty; }
      if (!s.known.has(o.p.id)) { e.name = o.p.name; e.look = o.p.look; e.username = o.p.username; s.known.add(o.p.id); }
      list.push(e);
    }
    send(s.ws, { t: 'players', list, n: arr.length });
    // prune far chunks
    const pcx = Math.floor(s.p.x / D.CHUNK), pcy = Math.floor(s.p.y / D.CHUNK);
    for (const k of s.sentChunks) { const [cx, cy] = k.split(',').map(Number); if (Math.abs(cx - pcx) > 6 || Math.abs(cy - pcy) > 6) s.sentChunks.delete(k); }
  }
}, 100);

// world tick 1Hz: crops, needs, time
let tickN = 0;
setInterval(() => {
  tickN++;
  db.world.time = (db.world.time + 1) % D.DAY_SECONDS;
  const updates = W.tick(Date.now());
  for (const u of updates) broadcastWorld(u);
  for (const s of sessions) {
    if (!s.p) continue;
    const p = s.p; const n = p.needs;
    // idle (no input for 2 min) and not in a restoring state -> needs stop draining
    const idle = !p.state && Date.now() - (s.lastActive || 0) > 120000;
    if (idle) continue;
    n.hunger = clamp(n.hunger - 0.035, 0, 100);
    n.hygiene = clamp(n.hygiene - 0.025, 0, 100);
    if (p.state === 'sleep') { n.energy = clamp(n.energy + 2.5, 0, 100); if (n.energy >= 100) { p.state = null; sendMe(s, ['state']); toast(s, 'ตื่นแล้ว พลังงานเต็ม ☀️', 'info'); } }
    else if (p.state === 'sit') { n.energy = clamp(n.energy + 0.4, 0, 100); n.fun = clamp(n.fun + 0.3, 0, 100); }
    else if (p.state === 'bath') { n.hygiene = clamp(n.hygiene + 4, 0, 100); if (n.hygiene >= 100) { p.state = null; sendMe(s, ['state']); toast(s, 'อาบน้ำเสร็จ สะอาดสดชื่น ✨', 'info'); } }
    else { n.energy = clamp(n.energy - (s.moving ? 0.05 : 0.02), 0, 100); n.fun = clamp(n.fun - 0.04, 0, 100); }
    if (tickN % 5 === 0) { sendMe(s, ['needs']); db.putPlayer(p); }
  }
  if (tickN % 5 === 0) {
    broadcastAll({ t: 'time', time: db.world.time, online: online.size });
    for (const s of sessions) if (s.p) {
      const list = [];
      for (const fid of s.p.friends) { const fs = online.get(Number(fid)); if (fs && fs.p) list.push({ id: Number(fid), x: Math.round(fs.p.x), y: Math.round(fs.p.y) }); }
      send(s.ws, { t: 'fpos', list });
    }
  }
  if (tickN % 5 === 0) { db.markDirty('world'); db.flush((cx, cy) => W.chunks.get(W.chunkKey(cx, cy))); }
  if (tickN % 60 === 0) W.evict();
  if (tickN % 300 === 0) { for (const u of W.regrow()) broadcastWorld(u); }
}, 1000);

function shutdown() {
  console.log('saving...');
  for (const s of sessions) if (s.p) db.putPlayer(s.p);
  db.markDirty('world');
  db.flush((cx, cy) => W.chunks.get(W.chunkKey(cx, cy)));
  process.exit(0);
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);

server.listen(PORT, () => console.log(`Kuak World server → http://localhost:${PORT}  (seed ${db.world.seed})`));
