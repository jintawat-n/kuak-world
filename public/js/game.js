/* ==========================================================
   Game engine: world cache, rendering, input, local player
   ========================================================== */
window.Game = (() => {
  const D = window.DEFS, SP = window.Sprites, S = D.SPR, CH = D.CHUNK;
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const mini = document.getElementById('minimap');
  const mctx = mini.getContext('2d');
  let dpr = 1, W = 0, H = 0, zoom = 2, TILE = 32;
  const light = document.createElement('canvas'); const lctx = light.getContext('2d');

  const st = {
    me: null, id: 0, pos: { x: 0, y: 0 }, dir: 'down', moving: false, run: false, state: null,
    players: new Map(), chunks: new Map(), requested: new Map(),
    cam: { x: 0, y: 0 }, time: 0, timeAt: 0, hover: null, sel: { zone: 'tool', i: 0 },
    hits: new Map(), particles: [], floats: [], bubbles: new Map(), anim: null, tags: [],
    keys: {}, running: false, lastMoveSend: 0, lastSent: null, joy: { dx: 0, dy: 0 }, friendsPos: [],
    ox: 0, oy: 0, lastChunkReq: 0, lastMini: 0, lastUse: 0, onlineN: 1,
    npcs: new Map(), mobs: new Map(), fx: [], hurtAt: 0, cds: {}, targeting: null, mobHits: new Map(), buffs: {}, fishing: null,
  };

  // ---------- helpers ----------
  const ck = (cx, cy) => cx + ',' + cy;
  function chunkAt(x, y) { return st.chunks.get(ck(Math.floor(x / CH), Math.floor(y / CH))); }
  function lpos(x, y) { return [((x % CH) + CH) % CH, ((y % CH) + CH) % CH]; }
  function tileAt(x, y) { const c = chunkAt(x, y); if (!c) return -1; const [i, j] = lpos(x, y); return c.tiles[j * CH + i]; }
  function objAt(x, y) { const c = chunkAt(x, y); if (!c) return null; const [i, j] = lpos(x, y); return c.objs[i + ',' + j] || null; }
  function ownerAt(x, y) { const c = chunkAt(x, y); if (!c) return 0; const [i, j] = lpos(x, y); return c.own[i + ',' + j] || 0; }
  function walkable(x, y) {
    if (x < 0 || y < 0 || x >= D.WORLD_SIZE || y >= D.WORLD_SIZE) return false;
    const t = tileAt(x, y); if (t < 0) return false;
    const td = D.TILES[t]; if (!td || !td.walk) return false;
    const o = objAt(x, y);
    if (o && (o.t === 'shop' || (D.OBJ[o.t] && D.OBJ[o.t].solid))) return false;
    return true;
  }
  function baseWalkable(x, y) { const t = tileAt(x, y); return t >= 0 && D.TILES[t] && D.TILES[t].walk; }
  function myVehicle() { return st.me && st.me.vehicle ? D.VEHICLES[st.me.vehicle] : null; }
  function passable(x, y) {
    const v = myVehicle();
    if (v && v.fly) return x >= 0 && y >= 0 && x < D.WORLD_SIZE && y < D.WORLD_SIZE && tileAt(x, y) >= 0;
    if (v && v.water) {
      const t = tileAt(x, y); if (!(t === 0 || t === 12 || t === 1)) return false;
      const o = objAt(x, y); return !(o && (o.t === 'shop' || (D.OBJ[o.t] && D.OBJ[o.t].solid)));
    }
    return walkable(x, y);
  }
  function selectedId() {
    if (!st.me) return 'hand';
    if (st.sel.zone === 'tool') { const k = D.TOOL_KINDS[st.sel.i]; return (k && D.bestTool(st.me.inv, k.kind)) || 'hand'; }
    const id = st.me.hotbar[st.sel.i];
    if (!id || !D.ITEMS[id]) return 'hand';
    if (!(st.me.inv[id] > 0)) return 'hand';
    return id;
  }
  function facing() {
    const dx = st.dir === 'left' ? -1 : st.dir === 'right' ? 1 : 0, dy = st.dir === 'up' ? -1 : st.dir === 'down' ? 1 : 0;
    return { x: Math.floor(st.pos.x + dx * 0.9), y: Math.floor(st.pos.y + dy * 0.9 + (dy === 0 ? 0.1 : 0)) };
  }
  function hourOf() { const t = st.time + (st.timeAt ? (performance.now() - st.timeAt) / 1000 : 0); return ((t % D.DAY_SECONDS) / D.DAY_SECONDS) * 24; }

  // ---------- resize ----------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.width = Math.floor(innerWidth * dpr); H = canvas.height = Math.floor(innerHeight * dpr);
    light.width = W; light.height = H;
    TILE = Math.round(S * zoom * dpr);
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener('resize', resize);
  function setZoom(z) { zoom = Math.max(1, Math.min(4, z)); resize(); }

  // ---------- chunks ----------
  function updateChunks(now) {
    if (now - st.lastChunkReq < 300) return; st.lastChunkReq = now;
    const pcx = Math.floor(st.pos.x / CH), pcy = Math.floor(st.pos.y / CH);
    const hw = Math.ceil(W / TILE / 2 / CH) + 1, hh = Math.ceil(H / TILE / 2 / CH) + 1;
    const need = [];
    for (let cy = pcy - hh; cy <= pcy + hh; cy++) for (let cx = pcx - hw; cx <= pcx + hw; cx++) {
      if (cx < 0 || cy < 0 || cx >= D.WORLD_SIZE / CH || cy >= D.WORLD_SIZE / CH) continue;
      const k = ck(cx, cy);
      if (st.chunks.has(k)) continue;
      const r = st.requested.get(k); if (r && now - r < 4000) continue;
      st.requested.set(k, now); need.push([cx, cy]);
    }
    need.sort((a, b) => (Math.abs(a[0] - pcx) + Math.abs(a[1] - pcy)) - (Math.abs(b[0] - pcx) + Math.abs(b[1] - pcy)));
    if (need.length) Net.send({ t: 'chunks', list: need.slice(0, 40) });
    for (const [k, c] of st.chunks) if (Math.abs(c.cx - pcx) > 6 || Math.abs(c.cy - pcy) > 6) st.chunks.delete(k);
  }

  // ---------- local player ----------
  function canStand(x, y) {
    const hw = 0.26, top = y - 0.1, bot = y + 0.2;
    return passable(Math.floor(x - hw), Math.floor(top)) && passable(Math.floor(x + hw), Math.floor(top)) && passable(Math.floor(x - hw), Math.floor(bot)) && passable(Math.floor(x + hw), Math.floor(bot));
  }
  function tryMove(mx, my) {
    const stuck = !canStand(st.pos.x, st.pos.y);
    const nx = st.pos.x + mx;
    if (canStand(nx, st.pos.y) || (stuck && baseWalkable(Math.floor(nx), Math.floor(st.pos.y)))) st.pos.x = nx;
    const ny = st.pos.y + my;
    if (canStand(st.pos.x, ny) || (stuck && baseWalkable(Math.floor(st.pos.x), Math.floor(ny)))) st.pos.y = ny;
    st.pos.x = Math.max(0.5, Math.min(D.WORLD_SIZE - 0.5, st.pos.x)); st.pos.y = Math.max(0.5, Math.min(D.WORLD_SIZE - 0.5, st.pos.y));
  }
  function updateLocal(dt) {
    if (!st.me) return;
    let dx = 0, dy = 0;
    const k = st.keys;
    if (!UI.typing()) {
      if (k.w || k.arrowup) dy -= 1; if (k.s || k.arrowdown) dy += 1;
      if (k.a || k.arrowleft) dx -= 1; if (k.d || k.arrowright) dx += 1;
    }
    dx += st.joy.dx; dy += st.joy.dy;
    const len = Math.hypot(dx, dy);
    if (len > 0.01) {
      dx /= Math.max(1, len); dy /= Math.max(1, len);
      if (st.state) { st.state = null; Net.send({ t: 'wake' }); }
      if (st.fishing) st.fishing = null;
    }
    let speed = st.run ? 6.6 : 4.3;
    const n = st.me.needs; if (n.hunger < 8 || n.energy < 8) speed *= 0.55;
    const veh = myVehicle(); const cls = st.me.cls;
    const bs = st.buffs && st.buffs.speed && st.buffs.speed.until > Date.now() ? st.buffs.speed.val : 1;
    if (veh) speed = 4.3 * veh.speed * (st.run ? 1.25 : 1) * (1 + D.passive(cls, 'vehicleSpeed') / 100);
    else {
      speed *= (1 + D.passive(cls, 'speed') / 100) * bs;
      if (tileAt(Math.floor(st.pos.x), Math.floor(st.pos.y)) === D.T.SHALLOW) speed *= 0.6 * (1 + D.passive(cls, 'swim') / 100);
    }
    st.moving = len > 0.01;
    if (st.moving) {
      if (Math.abs(dx) > Math.abs(dy)) st.dir = dx > 0 ? 'right' : 'left'; else st.dir = dy > 0 ? 'down' : 'up';
      tryMove(dx * speed * dt, dy * speed * dt);
    }
    const now = performance.now();
    if (now - st.lastMoveSend > 100) {
      const sig = st.pos.x.toFixed(2) + ',' + st.pos.y.toFixed(2) + st.dir + (st.moving ? 1 : 0);
      if (sig !== st.lastSent) { st.lastSent = sig; st.lastMoveSend = now; Net.send({ t: 'move', x: +st.pos.x.toFixed(2), y: +st.pos.y.toFixed(2), d: st.dir, m: st.moving ? 1 : 0 }); }
    }
    // camera
    const kk = 1 - Math.exp(-dt * 8);
    st.cam.x += (st.pos.x - st.cam.x) * kk; st.cam.y += (st.pos.y - 0.4 - st.cam.y) * kk;
  }
  function updateOthers(dt) {
    const now = performance.now();
    for (const [id, p] of st.players) {
      if (now - p.seen > 2000) { st.players.delete(id); continue; }
      const kk = 1 - Math.exp(-dt * 12);
      if (Math.abs(p.tx - p.x) > 3 || Math.abs(p.ty - p.y) > 3) { p.x = p.tx; p.y = p.ty; }
      else { p.x += (p.tx - p.x) * kk; p.y += (p.ty - p.y) * kk; }
    }
  }

  // ---------- actions ----------
  function npcAt(tx, ty) { for (const n of st.npcs.values()) if (Math.floor(n.x) === tx && Math.floor(n.y) === ty) return n; return null; }
  function mobAt(tx, ty) { let best = null, bd = 1e9; for (const m of st.mobs.values()) { const a = D.ANIMALS[m.t]; const rad = 0.95 + ((a ? a.size : 1) - 1) * 0.5; const d = Math.hypot(m.x - (tx + 0.5), m.y - (ty + 0.5)); if (d < rad && d < bd) { bd = d; best = m; } } return best; }
  function useAt(tx, ty, itemId) {
    if (!st.me) return;
    const now = performance.now();
    if (st.targeting) { const sk = st.targeting; st.targeting = null; UI.refreshSkills(); castSkill(sk, tx, ty); return; }
    if (st.fishing) { Net.send({ t: 'reel' }); return; }
    if (now - st.lastUse < 220) return; st.lastUse = now;
    const npc = npcAt(tx, ty);
    if (npc) { if (Math.max(Math.abs(st.pos.x - npc.x), Math.abs(st.pos.y - npc.y)) > 3.5) { UI.toast('เดินเข้าไปใกล้ ' + npc.name + ' ก่อน', 'error'); return; } Net.send({ t: 'talk', npc: npc.id }); return; }
    const mob = mobAt(tx, ty);
    if (mob) {
      const reach = 1.9 + ((D.ANIMALS[mob.t] ? D.ANIMALS[mob.t].size : 1) - 1) * 0.5;
      if (Math.hypot(st.pos.x - mob.x, st.pos.y - mob.y) > reach) { UI.toast('เข้าใกล้อีกนิดถึงจะตีได้ (หรือใช้สกิลระยะไกล)', 'error'); return; }
      const ddx = mob.x - st.pos.x, ddy = mob.y - st.pos.y; if (Math.abs(ddx) > Math.abs(ddy)) st.dir = ddx > 0 ? 'right' : 'left'; else st.dir = ddy > 0 ? 'down' : 'up';
      st.anim = { a: (D.ITEMS[itemId] || {}).tool || 'hand', until: now + 300, icon: itemId, tx, ty };
      Net.send({ t: 'attack', id: mob.id, item: itemId }); return;
    }
    const d = Math.max(Math.abs(st.pos.x - (tx + 0.5)), Math.abs(st.pos.y - (ty + 0.5)));
    if (d > 3.2) { UI.toast('ไกลเกินไป เดินเข้าไปใกล้กว่านี้', 'error'); return; }
    const ddx = tx + 0.5 - st.pos.x, ddy = ty + 0.5 - st.pos.y;
    if (Math.abs(ddx) > Math.abs(ddy) + 0.3) st.dir = ddx > 0 ? 'right' : 'left'; else if (Math.abs(ddy) > 0.3) st.dir = ddy > 0 ? 'down' : 'up';
    const item = D.ITEMS[itemId] || D.ITEMS.hand;
    st.anim = { a: item.tool || 'place', until: now + 350, icon: itemId, tx, ty };
    Net.send({ t: 'use', x: tx, y: ty, item: itemId });
  }
  function mySkills() { return st.me && st.me.cls && D.CLASSES[st.me.cls] ? D.CLASSES[st.me.cls].skills : []; }
  function castSkill(sk, tx, ty) {
    if (!st.me) return;
    const until = st.cds[sk.id] || 0; if (until > Date.now()) { UI.toast(`${sk.th} ยังคูลดาวน์อยู่ (${Math.ceil((until - Date.now()) / 1000)} วิ)`, 'error', 1200); return; }
    if (st.me.needs.energy < sk.energy) { UI.toast(`พลังงานไม่พอ (ต้องการ ${sk.energy})`, 'error', 1500); return; }
    const msg = { t: 'skill', id: sk.id, x: tx, y: ty };
    const cur = selectedId(); if (cur !== 'hand') msg.item = cur;
    if (sk.target !== 'self' && tx != null) { const ddx = tx + 0.5 - st.pos.x, ddy = ty + 0.5 - st.pos.y; if (Math.abs(ddx) > Math.abs(ddy) + 0.3) st.dir = ddx > 0 ? 'right' : 'left'; else if (Math.abs(ddy) > 0.3) st.dir = ddy > 0 ? 'down' : 'up'; }
    Net.send(msg);
  }
  // key / button press: self skills fire now; targeted skills use the hovered tile (keyboard) or enter targeting mode (button)
  function triggerSkill(i, fromButton) {
    const sk = mySkills()[i]; if (!sk) { if (st.me && !st.me.cls) UI.toast('ยังไม่มีอาชีพ ไปหาครูเพชรกลางเมืองเพื่อเลือกอาชีพ (หรือกด J)', 'info'); return; }
    if (sk.target === 'self') { castSkill(sk, null, null); return; }
    if (!fromButton && st.hover) { castSkill(sk, st.hover.x, st.hover.y); return; }
    st.targeting = st.targeting && st.targeting.id === sk.id ? null : sk; UI.refreshSkills();
    if (st.targeting) UI.toast(`${sk.th}: คลิกจุดที่ต้องการ (ระยะ ${sk.range} ช่อง)`, 'info', 1500);
  }
  function selectTool(i) { const n = D.TOOL_KINDS.length; st.sel = { zone: 'tool', i: ((i % n) + n) % n }; UI.refreshHotbar(); }
  function selectItem(i) { const n = D.ITEM_SLOTS; st.sel = { zone: 'item', i: ((i % n) + n) % n }; UI.refreshHotbar(); }
  function selectSlot(i) { if (st.sel.zone === 'tool') selectTool(i); else selectItem(i); }
  // cycle across both zones: tools first, then items
  function cycle(dir) {
    const nt = D.TOOL_KINDS.length, ni = D.ITEM_SLOTS, total = nt + ni;
    let idx = st.sel.zone === 'tool' ? st.sel.i : nt + st.sel.i;
    idx = ((idx + dir) % total + total) % total;
    if (idx < nt) selectTool(idx); else selectItem(idx - nt);
  }

  // ---------- particles / effects ----------
  function burst(x, y, color, n, spread = 0.4, up = 2.5) {
    for (let i = 0; i < n; i++) st.particles.push({ x: x + 0.5 + (Math.random() - 0.5) * spread, y: y + 0.5 + (Math.random() - 0.5) * spread, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * up, life: 0.6 + Math.random() * 0.5, color: Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color });
  }
  function objColor(o) {
    if (!o) return '#fff';
    if (['tree', 'pine', 'palm', 'bush', 'sapling'].includes(o.t)) return ['#5fbd55', '#3f8f3a', '#7a4a22'];
    if (['rock', 'bigrock'].includes(o.t)) return ['#b5b5b5', '#8a8a8a', '#f28c28'];
    if (o.t === 'crop') return ['#5fbd55', (D.CROPS[o.c] || {}).color || '#fff'];
    return ['#c9a063', '#8b5a2b', '#ffffff'];
  }
  function float(text, color = '#fff', x = st.pos.x, y = st.pos.y - 1.6) { st.floats.push({ text, color, x, y, life: 1.4 }); }
  function updateFx(dt) {
    for (const p of st.particles) { p.life -= dt; p.vy += (p.g == null ? 6 : p.g) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    st.particles = st.particles.filter(p => p.life > 0);
    for (const f of st.fx) f.life -= dt; st.fx = st.fx.filter(f => f.life > 0);
    for (const m of st.mobs.values()) { const kk = 1 - Math.exp(-dt * 12); if (Math.abs(m.tx - m.x) > 3 || Math.abs(m.ty - m.y) > 3) { m.x = m.tx; m.y = m.ty; } else { m.x += (m.tx - m.x) * kk; m.y += (m.ty - m.y) * kk; } }
    for (const n of st.npcs.values()) { const kk = 1 - Math.exp(-dt * 10); n.x += (n.tx - n.x) * kk; n.y += (n.ty - n.y) * kk; }
    for (const f of st.floats) { f.life -= dt; f.y -= dt * 0.6; }
    st.floats = st.floats.filter(f => f.life > 0);
  }

  // ---------- rendering ----------
  const MINI = { 0: '#2f6fc4', 12: '#5aaee6', 1: '#e9d79f', 2: '#78c850', 3: '#4e9e3c', 4: '#a6743f', 5: '#8f8f93', 6: '#eef3f9', 7: '#7b5230', 8: '#4c321b', 9: '#c4914f', 10: '#b3b3ba', 11: '#cdb98f', 13: '#ececec', 14: '#c94a4a' };
  function sortKey(o, y) { const def = D.OBJ[o.t]; if (o.t === 'shop') return y + 0.98; if (!def) return y + 0.02; return (def.solid || def.h === 2) ? y + 0.98 : y + 0.02; }

  function draw(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#14202c'; ctx.fillRect(0, 0, W, H);
    const ox = st.ox = Math.round(W / 2 - st.cam.x * TILE), oy = st.oy = Math.round(H / 2 - st.cam.y * TILE);
    const x0 = Math.floor(st.cam.x - W / 2 / TILE) - 1, x1 = Math.ceil(st.cam.x + W / 2 / TILE) + 1;
    const y0 = Math.floor(st.cam.y - H / 2 / TILE) - 1, y1 = Math.ceil(st.cam.y + H / 2 / TILE) + 2;
    const wf = Math.floor(now / 600) % 2;
    // tiles
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = tileAt(x, y);
      const sx = ox + x * TILE, sy = oy + y * TILE;
      if (t < 0) { ctx.fillStyle = '#1c2a38'; ctx.fillRect(sx, sy, TILE, TILE); continue; }
      const v = Math.floor(SP.hash(x, y, 3) * 4);
      ctx.drawImage(SP.tile(t, v, (t === 0 || t === 12) ? wf : 0), sx, sy, TILE, TILE);
      if (t === 0 || t === 12) { // foam where water meets land
        const up = tileAt(x, y - 1), left = tileAt(x - 1, y), right = tileAt(x + 1, y), down = tileAt(x, y + 1);
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        const e = Math.max(1, Math.round(TILE / 16));
        if (up >= 0 && up !== 0 && up !== 12) ctx.fillRect(sx, sy, TILE, e);
        if (down >= 0 && down !== 0 && down !== 12) ctx.fillRect(sx, sy + TILE - e, TILE, e);
        if (left >= 0 && left !== 0 && left !== 12) ctx.fillRect(sx, sy, e, TILE);
        if (right >= 0 && right !== 0 && right !== 12) ctx.fillRect(sx + TILE - e, sy, e, TILE);
      }
    }
    // home marker
    if (st.me && st.me.home) {
      const hx = ox + st.me.home.x * TILE, hy = oy + st.me.home.y * TILE;
      ctx.strokeStyle = 'rgba(255,200,80,.8)'; ctx.lineWidth = 2 * dpr; ctx.strokeRect(hx + 2, hy + 2, TILE - 4, TILE - 4);
    }
    // hover + ghost
    drawHover(ox, oy, now);
    // entities
    st.tags = [];
    const ents = [];
    for (let y = y0; y <= y1 + 1; y++) for (let x = x0; x <= x1; x++) { const o = objAt(x, y); if (o) ents.push({ k: sortKey(o, y), o, x, y }); }
    for (const p of st.players.values()) if (p.id !== st.id && p.look) ents.push({ k: p.y, p });
    for (const n of st.npcs.values()) ents.push({ k: n.y, p: { ...n, id: 'npc:' + n.id, npc: true } });
    for (const m of st.mobs.values()) ents.push({ k: m.y + 0.3, mob: m });
    if (st.me) ents.push({ k: st.pos.y, me: true });
    ents.sort((a, b) => a.k - b.k);
    for (const e of ents) {
      if (e.o) drawObj(e, ox, oy, now);
      else if (e.mob) drawMob(e.mob, ox, oy, now);
      else if (e.p) drawPlayer(e.p, ox, oy, now, false);
      else drawPlayer({ x: st.pos.x, y: st.pos.y, d: st.dir, look: st.me.look, name: st.me.name, id: st.id, cls: st.me.cls }, ox, oy, now, true);
    }
    // particles
    for (const p of st.particles) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(ox + p.x * TILE - dpr, oy + p.y * TILE - dpr, 3 * dpr, 3 * dpr); }
    ctx.globalAlpha = 1;
    if (st.fishing && st.fishing.state !== 'catch') {
      const f = st.fishing; const bob = Math.sin(now / 250) * 1.5 * dpr; const bx = ox + (f.x + 0.5) * TILE, by = oy + (f.y + 0.5) * TILE + bob;
      // line from player
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1 * dpr; ctx.beginPath(); ctx.moveTo(ox + st.pos.x * TILE, oy + (st.pos.y - 1.1) * TILE); ctx.lineTo(bx, by - 4 * dpr); ctx.stroke();
      ctx.drawImage(SP.bobber(f.state === 'bite'), bx - TILE / 2, by - TILE / 2, TILE, TILE);
      if (f.state === 'bite') { const s2 = 1 + Math.sin(now / 80) * 0.15; ctx.drawImage(SP.uiIconCanvas('warn'), bx - 10 * dpr * s2, by - 30 * dpr, 20 * dpr * s2, 20 * dpr * s2); if (Math.floor(now / 100) % 2 === 0) burst(f.x, f.y, '#7cc4f0', 1, 0.5, 1.5); }
    }
    drawFx(ox, oy, now);
    // lighting
    drawLighting(now, ox, oy, x0, y0, x1, y1);
    // hurt vignette
    if (st.hurtAt && now - st.hurtAt < 350) { const a = (1 - (now - st.hurtAt) / 350) * 0.45; const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, 'rgba(200,0,0,0)'); g.addColorStop(1, `rgba(200,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    // tags, bubbles, floats
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (const t of st.tags) {
      const sx = ox + t.x * TILE, sy = oy + (t.y - 1.5) * TILE;
      ctx.font = `600 ${11 * dpr}px ${getComputedStyle(document.body).fontFamily}`;
      ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(t.name, sx, sy);
      ctx.fillStyle = t.npc ? '#ffd166' : t.isMe ? '#ffe08a' : t.friend ? '#9be7a1' : '#fff'; ctx.fillText(t.name, sx, sy);
      const sub = t.npc ? t.role : (t.cls && D.CLASSES[t.cls] ? D.CLASSES[t.cls].th : null);
      if (sub) { ctx.font = `${9 * dpr}px ${getComputedStyle(document.body).fontFamily}`; ctx.strokeText(sub, sx, sy - 11 * dpr); ctx.fillStyle = t.npc ? '#ffe9b0' : '#cfe8ff'; ctx.fillText(sub, sx, sy - 11 * dpr); }
      const b = st.bubbles.get(t.id);
      if (b && b.until > now) drawBubble(sx, sy - 14 * dpr, b.text);
      if (t.state === 'sleep') { ctx.drawImage(SP.uiIconCanvas('zz'), sx + 8 * dpr + Math.sin(now / 400) * 3 * dpr, sy - 22 * dpr - (now / 30 % 10) * dpr, 16 * dpr, 16 * dpr); }
    }
    for (const f of st.floats) {
      ctx.globalAlpha = Math.min(1, f.life); ctx.font = `700 ${13 * dpr}px ${getComputedStyle(document.body).fontFamily}`;
      const sx = ox + f.x * TILE, sy = oy + f.y * TILE;
      ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(f.text, sx, sy); ctx.fillStyle = f.color; ctx.fillText(f.text, sx, sy);
    }
    ctx.globalAlpha = 1;
    drawMini(now);
  }
  function drawMob(m, ox, oy, now) {
    const hurt = (st.mobHits.get(m.id) || 0) > now;
    const cx = ox + m.x * TILE, cy = oy + m.y * TILE;
    if (m.t === 'slime') {
      const frame = Math.floor((now + m.id * 137) / 260) % 2;
      const spr = SP.mob(m.t, m.v, frame, hurt);
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(cx, cy + TILE * 0.28, TILE * 0.32, TILE * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      const squash = m.a ? 1.15 : 1;
      ctx.drawImage(spr, Math.round(cx - TILE / 2 * squash), Math.round(cy - TILE * 0.62), TILE * squash, TILE);
      if (m.hp < m.mh) { const bw = TILE * 0.7, bx = cx - bw / 2, by = cy - TILE * 0.72; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx, by, bw, 3 * dpr); ctx.fillStyle = '#ff5c5c'; ctx.fillRect(bx, by, bw * (m.hp / m.mh), 3 * dpr); }
      if (st.hover && Math.floor(m.x) === st.hover.x && Math.floor(m.y) === st.hover.y) { const def = D.MOBS[m.t].variants[m.v]; nameTag(cx, cy - TILE * 0.78, `${def.th} ${m.hp}/${m.mh}`, '#ffb3b3'); }
      return;
    }
    const a = D.ANIMALS[m.t]; if (!a) return;
    const moving = Math.abs(m.tx - m.x) > 0.02 || Math.abs(m.ty - m.y) > 0.02 || m.f;
    const fly = a.shape === 'fly' || a.shape === 'fly_b' || a.shape === 'ptero';
    const frame = (moving || fly) ? Math.floor((now + m.id * 91) / (fly ? 140 : 220)) % 2 : 0;
    const spr = SP.animal(m.t, frame, hurt);
    const size = a.size * TILE * 1.25; const hover = fly ? TILE * 0.6 + Math.sin(now / 300 + m.id) * 3 * dpr : 0;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(cx, cy + TILE * 0.2, size * 0.35, TILE * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    const flip = m.d === 'left';
    ctx.translate(cx, cy + TILE * 0.25 - hover); if (flip) ctx.scale(-1, 1);
    const squash = m.a ? 1.12 : 1;
    ctx.drawImage(spr, -size / 2 * squash, -size * (30 / 32), size * squash, size);
    ctx.restore();
    const top = cy + TILE * 0.25 - hover - size * (30 / 32);
    if (m.hp < m.mh) { const bw = Math.max(TILE * 0.6, size * 0.6), bx = cx - bw / 2, by = top - 6 * dpr; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx, by, bw, 3 * dpr); ctx.fillStyle = '#ff5c5c'; ctx.fillRect(bx, by, bw * (m.hp / m.mh), 3 * dpr); }
    const hx = Math.floor(m.x), hy = Math.floor(m.y);
    if (st.hover && Math.abs(st.hover.x + 0.5 - m.x) <= a.size * 0.6 + 0.5 && Math.abs(st.hover.y + 0.5 - m.y) <= a.size * 0.6 + 0.5) {
      const col = a.behavior === 'hostile' ? '#ff8080' : a.behavior === 'neutral' ? '#ffe08a' : '#c8f7c5';
      nameTag(cx, top - 8 * dpr, `${a.th} ${m.hp}/${m.mh}${a.behavior === 'hostile' ? ' (ดุร้าย)' : a.behavior === 'neutral' ? ' (สู้กลับ)' : ''}`, col);
    }
  }
  function nameTag(cx, y, text, color) { ctx.font = `600 ${10 * dpr}px ${getComputedStyle(document.body).fontFamily}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(text, cx, y); ctx.fillStyle = color; ctx.fillText(text, cx, y); }
  function drawFx(ox, oy, now) {
    for (const f of st.fx) {
      const t = 1 - f.life / f.max; const sx = ox + (f.x + 0.5) * TILE, sy = oy + (f.y + 0.5) * TILE;
      ctx.save();
      if (f.kind === 'shot') {
        const fx0 = ox + f.from.x * TILE, fy0 = oy + (f.from.y - 0.7) * TILE; const ex = ox + f.x * TILE, ey = oy + f.y * TILE;
        ctx.globalAlpha = 1 - t; ctx.strokeStyle = f.big ? '#ffe08a' : '#fff'; ctx.lineWidth = (f.big ? 3 : 1.5) * dpr; ctx.beginPath(); ctx.moveTo(fx0, fy0); ctx.lineTo(ex, ey); ctx.stroke();
      } else if (f.kind === 'fire') {
        const r = (0.4 + t * f.r) * TILE; ctx.globalAlpha = (1 - t) * 0.8; const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#ff8c42'); g.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      } else if (f.kind === 'boom') {
        const r = (0.3 + t * f.r) * TILE; ctx.globalAlpha = (1 - t) * 0.7; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3 * dpr; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.stroke();
      } else if (f.kind === 'fan') {
        const r = t * f.r * TILE; ctx.globalAlpha = (1 - t) * 0.8; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.stroke();
      } else if (f.kind === 'rain' || f.kind === 'grow') {
        const r = f.r * TILE; ctx.globalAlpha = (1 - t) * 0.35; ctx.fillStyle = f.kind === 'rain' ? '#4b8fe0' : '#7ee787'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      } else if (f.kind === 'blink' || f.kind === 'buff') {
        const r = (0.2 + t * 0.9) * TILE; ctx.globalAlpha = (1 - t); ctx.strokeStyle = f.kind === 'blink' ? '#c084fc' : '#ffe08a'; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.arc(sx, sy - TILE * 0.5, r, 0, Math.PI * 2); ctx.stroke();
      } else if (f.kind === 'splash') {
        const r = (0.2 + t * 1.2) * TILE; ctx.globalAlpha = (1 - t) * 0.9; ctx.strokeStyle = '#bfe3ff'; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.stroke();
      } else if (f.kind === 'ping') {
        const r = (0.5 + (now / 300 % 1)) * TILE; ctx.globalAlpha = 0.8 - (now / 300 % 1) * 0.6; ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3 * dpr; ctx.beginPath(); ctx.arc(ox + (f.x + 0.5) * TILE, oy + (f.y + 0.5) * TILE, r, 0, Math.PI * 2); ctx.stroke();
        // off-screen arrow toward the target
        const sxp = ox + (f.x + 0.5) * TILE, syp = oy + (f.y + 0.5) * TILE;
        if (sxp < 0 || syp < 0 || sxp > W || syp > H) { const cx = W / 2, cy = H / 2; const a = Math.atan2(syp - cy, sxp - cx); const ax = cx + Math.cos(a) * Math.min(W, H) * 0.4, ay = cy + Math.sin(a) * Math.min(W, H) * 0.4; ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(ax + Math.cos(a) * 14 * dpr, ay + Math.sin(a) * 14 * dpr); ctx.lineTo(ax + Math.cos(a + 2.5) * 10 * dpr, ay + Math.sin(a + 2.5) * 10 * dpr); ctx.lineTo(ax + Math.cos(a - 2.5) * 10 * dpr, ay + Math.sin(a - 2.5) * 10 * dpr); ctx.closePath(); ctx.fill(); }
      } else if (f.kind === 'dash') {
        ctx.globalAlpha = (1 - t) * 0.6; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * dpr; ctx.beginPath(); ctx.moveTo(sx, sy - TILE * 0.5); ctx.lineTo(ox + f.to.x * TILE, oy + (f.to.y - 0.5) * TILE); ctx.stroke();
      }
      ctx.restore();
    }
    // targeting range ring
    if (st.targeting && st.me) {
      const sk = st.targeting; const cx = ox + st.pos.x * TILE, cy = oy + st.pos.y * TILE;
      ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffe08a'; ctx.setLineDash([6 * dpr, 4 * dpr]); ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.arc(cx, cy, (sk.range + 0.5) * TILE, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }
  function drawBubble(sx, sy, text) {
    ctx.font = `${12 * dpr}px ${getComputedStyle(document.body).fontFamily}`;
    const maxW = 180 * dpr; let lines = [];
    let cur = '';
    for (const ch of text) { if (ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch; }
    if (cur) lines.push(cur); lines = lines.slice(-4);
    const lh = 14 * dpr, w = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width))) + 14 * dpr, h = lines.length * lh + 8 * dpr;
    const bx = sx - w / 2, by = sy - h;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = '#3b2410'; ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath(); ctx.roundRect(bx, by, w, h, 6 * dpr); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - 4 * dpr, by + h); ctx.lineTo(sx, by + h + 5 * dpr); ctx.lineTo(sx + 4 * dpr, by + h); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill();
    ctx.fillStyle = '#222'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    lines.forEach((l, i) => ctx.fillText(l, sx, by + 4 * dpr + (i + 1) * lh));
  }
  function drawObj(e, ox, oy, now) {
    const o = e.o;
    const spr = SP.obj(o, Math.floor(now / 250) % 2);
    const h = spr.height / S;
    let sx = ox + e.x * TILE, sy = oy + (e.y - (h - 1)) * TILE;
    const hit = st.hits.get(e.x + ',' + e.y);
    if (hit && hit > now) sx += Math.round(Math.sin(now / 25) * 2 * dpr);
    ctx.drawImage(spr, sx, sy, TILE, TILE * h);
    const odef = D.OBJ[o.t];
    if (odef && odef.natural && odef.hp > 1 && o.hp != null && o.hp < odef.hp) {
      const bw = TILE * 0.8, bx = sx + TILE * 0.1, by = sy + TILE * h - 3 * dpr;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx, by, bw, 3 * dpr);
      ctx.fillStyle = '#7ee787'; ctx.fillRect(bx, by, bw * (o.hp / odef.hp), 3 * dpr);
    }
    if (o.t === 'crop' && o.s >= 4) { // ripe indicator
      const bob = Math.sin(now / 300) * 2 * dpr;
      ctx.drawImage(SP.uiIconCanvas('spark'), sx + TILE / 2 - 6 * dpr, sy - 14 * dpr + bob, 12 * dpr, 12 * dpr);
    }
    if (o.o && o.o !== st.id && D.OBJ[o.t] && D.OBJ[o.t].build && st.hover && st.hover.x === e.x && st.hover.y === e.y) {
      ctx.fillStyle = 'rgba(255,80,80,.25)'; ctx.fillRect(ox + e.x * TILE, oy + e.y * TILE, TILE, TILE);
    }
  }
  function drawPlayer(p, ox, oy, now, isMe) {
    const moving = isMe ? st.moving : p.m;
    const state = isMe ? st.state : p.s;
    const frame = (moving && !state) ? Math.floor(now / 130) % 4 : 0;
    const spr = SP.char(p.look, p.d || 'down', frame, { closed: state === 'sleep' });
    const cx = ox + p.x * TILE, fy = oy + p.y * TILE;
    const vid = isMe ? (st.me.vehicle || null) : (p.v || null);
    const vdef = vid ? D.VEHICLES[vid] : null;
    if (vdef) {
      const d = p.d || 'down'; const vs = SP.vehicle(vid, d, Math.floor(now / 80) % 2);
      const hover = vdef.fly ? TILE * 0.5 + Math.sin(now / 200) * 2 * dpr : 0;
      const vw = vs.width / S * TILE, vh = vs.height / S * TILE;
      const vx = Math.round(cx - vw / 2), vy = Math.round(fy + TILE * 0.15 - vh - hover);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(cx, fy + TILE * 0.05, vw * 0.4, TILE * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      const ride = vdef.ride / S * TILE;
      const drawVeh = () => { ctx.save(); if (d === 'left') { ctx.translate(vx + vw, vy); ctx.scale(-1, 1); ctx.drawImage(vs, 0, 0, vw, vh); } else ctx.drawImage(vs, vx, vy, vw, vh); ctx.restore(); };
      if (vdef.enclosed) {
        // head visible above the body
        ctx.drawImage(spr, 0, 0, 16, 12, Math.round(cx - TILE / 2), Math.round(fy - TILE * 1.44 + TILE * 0.35 - hover), TILE, TILE * 0.75);
        drawVeh();
      } else {
        drawVeh();
        ctx.drawImage(spr, Math.round(cx - TILE / 2), Math.round(fy - TILE * 1.44 - ride), TILE, TILE * 1.5);
      }
      st.tags.push({ x: p.x, y: p.y - (vdef.fly ? 0.6 : 0.2), name: p.name, isMe, id: p.id, state, friend: !isMe && UI.isFriend(p.id) });
      return;
    }
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(cx, fy + TILE * 0.04, TILE * 0.3, TILE * 0.11, 0, 0, Math.PI * 2); ctx.fill();
    if (state === 'sleep') {
      ctx.save(); ctx.translate(cx, fy - TILE * 0.45); ctx.rotate(-Math.PI / 2); ctx.drawImage(spr, -TILE * 0.7, -TILE * 0.5, TILE, TILE * 1.5); ctx.restore();
    } else {
      const dy = state === 'sit' ? TILE * 0.12 : state === 'bath' ? TILE * 0.28 : 0;
      ctx.drawImage(spr, Math.round(cx - TILE / 2), Math.round(fy - TILE * 1.44 + dy), TILE, TILE * 1.5);
    }
    // tool swing
    const anim = isMe ? st.anim : (p.a ? { a: p.a, until: p.aUntil, icon: p.a } : null);
    if (anim && anim.until > now && anim.a !== 'hand' && anim.icon) {
      const icon = D.ITEMS[anim.icon] ? SP.item(anim.icon) : anim.a === 'gun' ? SP.uiIconCanvas('sk_shoot') : null;
      if (icon) {
        const t = 1 - (anim.until - now) / 350;
        const ang = (p.d === 'left' ? -1 : 1) * (-0.8 + t * 2.2);
        const hx = cx + (p.d === 'left' ? -TILE * 0.35 : p.d === 'right' ? TILE * 0.35 : TILE * 0.3), hy = fy - TILE * 0.7;
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.drawImage(icon, -TILE * 0.2, -TILE * 0.6, TILE * 0.7, TILE * 0.7); ctx.restore();
      }
    }
    st.tags.push({ x: p.x, y: p.y, name: p.name, isMe, id: p.id, state, friend: !isMe && UI.isFriend(p.id), npc: !!p.npc, role: p.role, cls: p.cls });
  }
  function drawHover(ox, oy, now) {
    if (!st.hover || !st.me) return;
    const { x, y } = st.hover;
    const inRange = Math.max(Math.abs(st.pos.x - (x + 0.5)), Math.abs(st.pos.y - (y + 0.5))) <= 3.2;
    const sx = ox + x * TILE, sy = oy + y * TILE;
    const id = selectedId(); const item = D.ITEMS[id];
    let valid = null;
    if (item && item.tool === 'rod') { const t = tileAt(x, y); valid = (t === 0 || t === 12) && Math.max(Math.abs(st.pos.x - (x + 0.5)), Math.abs(st.pos.y - (y + 0.5))) <= 4.5; }
    if (item && (item.obj || item.tile != null || item.crop || item.plant)) {
      const t = tileAt(x, y), td = D.TILES[t] || {}, o = objAt(x, y), own = ownerAt(x, y);
      if (item.obj) valid = !o && td.walk && !td.soil;
      else if (item.tile != null) valid = td.walk && t !== 12 && (!own || own === st.id) && t !== item.tile;
      else if (item.crop) valid = !o && td.soil;
      else if (item.plant) valid = !o && [2, 3, 4].includes(t);
      valid = valid && inRange && !(Math.max(Math.abs(x - D.SPAWN.x), Math.abs(y - D.SPAWN.y)) <= 9);
      ctx.globalAlpha = 0.55;
      if (item.obj) { const spr = SP.obj({ t: item.obj, b: 1 }, 0); const h = spr.height / S; ctx.drawImage(spr, sx, sy - (h - 1) * TILE, TILE, TILE * h); }
      else if (item.tile != null) ctx.drawImage(SP.tile(item.tile, 0, 0), sx, sy, TILE, TILE);
      else if (item.crop) ctx.drawImage(SP.crop(item.crop, 4, false), sx, sy - (D.CROPS[item.crop].tall ? TILE : 0), TILE, TILE * (D.CROPS[item.crop].tall ? 2 : 1));
      else if (item.plant) ctx.drawImage(SP.obj({ t: 'sapling' }, 0), sx, sy, TILE, TILE);
      ctx.globalAlpha = 1;
    }
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = valid === null ? (inRange ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.35)') : valid ? 'rgba(80,255,120,.9)' : 'rgba(255,80,80,.9)';
    ctx.strokeRect(sx + dpr, sy + dpr, TILE - 2 * dpr, TILE - 2 * dpr);
  }
  function drawLighting(now, ox, oy, x0, y0, x1, y1) {
    const h = hourOf();
    let dark = 0;
    if (h >= 18 && h < 20) dark = (h - 18) / 2; else if (h >= 20 || h < 5) dark = 1; else if (h >= 5 && h < 7) dark = (7 - h) / 2;
    dark *= 0.74;
    if (dark <= 0.01) return;
    lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, W, H);
    lctx.fillStyle = `rgba(8,12,44,${dark})`; lctx.fillRect(0, 0, W, H);
    lctx.globalCompositeOperation = 'destination-out';
    const lights = [];
    for (let y = y0 - 6; y <= y1 + 6; y++) for (let x = x0 - 6; x <= x1 + 6; x++) {
      const o = objAt(x, y); if (!o) continue; const def = D.OBJ[o.t];
      if (def && def.light) lights.push({ x: x + 0.5, y: y + (def.h === 2 ? -0.2 : 0.3), r: def.light * (o.t === 'campfire' || o.t === 'torch' ? 0.9 + 0.1 * Math.sin(now / 90 + x) : 1), warm: o.t === 'campfire' || o.t === 'torch' });
    }
    for (const p of st.players.values()) if (p.id !== st.id) lights.push({ x: p.x, y: p.y - 0.5, r: 2.2 });
    if (st.me) lights.push({ x: st.pos.x, y: st.pos.y - 0.5, r: 3 + D.passive(st.me.cls, 'light') + (st.buffs && st.buffs.light && st.buffs.light.until > now ? 5 : 0) });
    for (const l of lights) {
      const sx = ox + l.x * TILE, sy = oy + l.y * TILE, r = l.r * TILE;
      const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g; lctx.beginPath(); lctx.arc(sx, sy, r, 0, Math.PI * 2); lctx.fill();
    }
    ctx.drawImage(light, 0, 0);
    // warm glow
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) if (l.warm) {
      const sx = ox + l.x * TILE, sy = oy + l.y * TILE, r = l.r * TILE * 0.8;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, `rgba(255,140,40,${0.18 * dark})`); g.addColorStop(1, 'rgba(255,140,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawMini(now) {
    if (now - st.lastMini < 400 || !st.me) return; st.lastMini = now;
    const R = 40, px = Math.floor(st.pos.x), py = Math.floor(st.pos.y), s = 2;
    mctx.fillStyle = '#1c2a38'; mctx.fillRect(0, 0, 160, 160);
    for (let dy = -R; dy < R; dy++) for (let dx = -R; dx < R; dx++) {
      const x = px + dx, y = py + dy; const t = tileAt(x, y); if (t < 0) continue;
      let c = MINI[t] || (D.TILES[t] && D.TILES[t].gen ? D.TILES[t].gen.a : '#f0f');
      const o = objAt(x, y);
      if (o) { if (['tree', 'pine', 'palm'].includes(o.t)) c = '#2e6b2a'; else if (o.t === 'rock' || o.t === 'bigrock') c = '#666'; else if (o.o || o.t === 'shop') c = o.t === 'crop' ? '#e0a020' : '#f3dfb5'; }
      mctx.fillStyle = c; mctx.fillRect((dx + R) * s, (dy + R) * s, s, s);
    }
    for (const m of st.mobs.values()) { const dx = m.x - px, dy = m.y - py; if (Math.abs(dx) < R && Math.abs(dy) < R) { const a = D.ANIMALS[m.t]; mctx.fillStyle = !a || a.behavior === 'hostile' ? '#ff5c5c' : a.behavior === 'neutral' ? '#ffd166' : '#ffffff'; mctx.fillRect((dx + R) * s, (dy + R) * s, 2, 2); } }
    for (const p of st.players.values()) { if (p.id === st.id) continue; const dx = p.x - px, dy = p.y - py; if (Math.abs(dx) < R && Math.abs(dy) < R) { mctx.fillStyle = UI.isFriend(p.id) ? '#4ade80' : '#ffd166'; mctx.fillRect((dx + R) * s - 1, (dy + R) * s - 1, 4, 4); } }
    if (st.me.home) { const dx = st.me.home.x - px, dy = st.me.home.y - py; if (Math.abs(dx) < R && Math.abs(dy) < R) { mctx.fillStyle = '#ff8c42'; mctx.fillRect((dx + R) * s - 2, (dy + R) * s - 2, 6, 6); } }
    mctx.fillStyle = '#fff'; mctx.fillRect(R * s - 2, R * s - 2, 5, 5);
    // direction arrows to town/home when off-map
    const arrow = (tx, ty, color) => { const dx = tx - st.pos.x, dy = ty - st.pos.y; if (Math.abs(dx) < R && Math.abs(dy) < R) return; const a = Math.atan2(dy, dx); const cx = 80 + Math.cos(a) * 72, cy = 80 + Math.sin(a) * 72; mctx.fillStyle = color; mctx.beginPath(); mctx.arc(cx, cy, 4, 0, Math.PI * 2); mctx.fill(); };
    arrow(D.SPAWN.x, D.SPAWN.y, '#ff5d8f'); if (st.me.home) arrow(st.me.home.x, st.me.home.y, '#ff8c42');
    for (const f of st.friendsPos) arrow(f.x, f.y, '#4ade80');
  }

  // ---------- loop ----------
  let last = 0;
  function loop(now) {
    if (!st.running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    updateLocal(dt); updateOthers(dt); updateFx(dt); updateChunks(now);
    draw(now);
    requestAnimationFrame(loop);
  }

  // ---------- input ----------
  function bindInput() {
    window.addEventListener('keydown', (e) => {
      if (UI.typing()) { if (e.key === 'Escape') document.activeElement.blur(); return; }
      const k = e.key.toLowerCase();
      if (k === 'escape' && st.targeting) { st.targeting = null; UI.refreshSkills(); return; }
      st.keys[k] = true;
      if (k === 'shift') st.run = true;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (k >= '1' && k <= '5') selectItem(+k - 1);
      else if (k >= '6' && k <= '9') selectTool(+k - 6);
      else if (k === '0') selectTool(4);
      else if (k === '-') selectTool(5);
      else if (k === '=') selectTool(6);
      else if (k === 'tab') { if (st.sel.zone === 'tool') selectTool(st.sel.i + 1); else selectTool(0); e.preventDefault(); }
      else if (k === 'e') { const f = facing(); useAt(f.x, f.y, 'hand'); }
      else if (k === ' ') { e.preventDefault(); if (st.fishing) { Net.send({ t: 'reel' }); return; } const f = facing(); useAt(f.x, f.y, selectedId()); }
      else if (D.SKILL_KEYS.includes(k)) triggerSkill(D.SKILL_KEYS.indexOf(k), false);
      else if (k === 'g') { if (st.me && st.me.vehicle) Net.send({ t: 'mount' }); else UI.toast('ยังไม่ได้ขึ้นพาหนะ: เปิดกระเป๋า (I) แล้วกด "ขี่" ที่พาหนะ', 'info'); }
      else if (k === 'q') cycle(-1);
      else if (k === 'r') cycle(1);
      else UI.hotkey(k, e);
    });
    window.addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); st.keys[k] = false; if (k === 'shift') st.run = false; });
    window.addEventListener('blur', () => { st.keys = {}; st.run = false; });
    const toTile = (ev) => { const r = canvas.getBoundingClientRect(); const mx = (ev.clientX - r.left) * dpr, my = (ev.clientY - r.top) * dpr; return { x: Math.floor((mx - st.ox) / TILE), y: Math.floor((my - st.oy) / TILE) }; };
    canvas.addEventListener('mousemove', (e) => { st.hover = toTile(e); });
    canvas.addEventListener('mouseleave', () => { st.hover = null; });
    canvas.addEventListener('mousedown', (e) => {
      if (UI.typing()) document.activeElement.blur();
      const t = toTile(e); st.hover = t;
      if (e.button === 2 && st.targeting) { st.targeting = null; UI.refreshSkills(); return; }
      if (e.button === 0) useAt(t.x, t.y, selectedId()); else if (e.button === 2) useAt(t.x, t.y, 'hand');
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (e.ctrlKey || e.metaKey) setZoom(zoom + (e.deltaY < 0 ? 0.25 : -0.25)); else cycle(e.deltaY > 0 ? 1 : -1); }, { passive: false });
    // touch: joystick
    const joy = document.getElementById('joy'), knob = document.getElementById('joyKnob');
    let jid = null, jc = null;
    joy.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; jid = t.identifier; const r = joy.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; e.preventDefault(); }, { passive: false });
    joy.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === jid) { let dx = (t.clientX - jc.x) / 45, dy = (t.clientY - jc.y) / 45; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } st.joy = { dx, dy }; knob.style.transform = `translate(${dx * 35}px,${dy * 35}px)`; } e.preventDefault(); }, { passive: false });
    const jend = (e) => { for (const t of e.changedTouches) if (t.identifier === jid) { jid = null; st.joy = { dx: 0, dy: 0 }; knob.style.transform = ''; } };
    joy.addEventListener('touchend', jend); joy.addEventListener('touchcancel', jend);
    document.getElementById('btnAct').addEventListener('touchstart', (e) => { e.preventDefault(); const f = facing(); useAt(f.x, f.y, 'hand'); }, { passive: false });
    let tapStart = null;
    canvas.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; tapStart = { x: t.clientX, y: t.clientY, at: Date.now(), id: t.identifier }; }, { passive: true });
    canvas.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (tapStart && t.identifier === tapStart.id) { if (Date.now() - tapStart.at < 400 && Math.hypot(t.clientX - tapStart.x, t.clientY - tapStart.y) < 12) { const tt = toTile(t); st.hover = tt; useAt(tt.x, tt.y, selectedId()); } tapStart = null; } });
  }

  // ---------- network ----------
  function bindNet() {
    Net.on('chunk', (m) => {
      const tiles = Uint8Array.from(atob(m.tiles), c => c.charCodeAt(0));
      st.chunks.set(ck(m.cx, m.cy), { cx: m.cx, cy: m.cy, tiles, objs: m.objs || {}, own: m.own || {}, wet: m.wet || {} });
      st.requested.delete(ck(m.cx, m.cy));
    });
    Net.on('tile', (m) => { const c = chunkAt(m.x, m.y); if (!c) return; const [i, j] = lpos(m.x, m.y); c.tiles[j * CH + i] = m.tile; if (m.o) c.own[i + ',' + j] = m.o; else delete c.own[i + ',' + j]; });
    Net.on('obj', (m) => {
      const c = chunkAt(m.x, m.y); if (!c) return; const [i, j] = lpos(m.x, m.y);
      const old = c.objs[i + ',' + j];
      if (m.obj) c.objs[i + ',' + j] = m.obj; else delete c.objs[i + ',' + j];
      if (old && !m.obj) burst(m.x, m.y, objColor(old), 10, 0.6, 3);
      else if (!old && m.obj && m.obj.o) burst(m.x, m.y, '#ffffff', 6, 0.8, 1.5);
      else if (old && m.obj && old.t === 'crop' && m.obj.t === 'crop' && old.s >= 4 && m.obj.s < old.s) burst(m.x, m.y, objColor(old), 8);
    });
    Net.on('hit', (m) => { st.hits.set(m.x + ',' + m.y, performance.now() + 250); burst(m.x, m.y, objColor(objAt(m.x, m.y)), 5, 0.5, 2); });
    Net.on('players', (m) => {
      const now = performance.now(); st.onlineN = m.n;
      for (const e of m.list) {
        if (e.id === st.id) continue;
        let p = st.players.get(e.id);
        if (!p) { p = { id: e.id, x: e.x, y: e.y, tx: e.x, ty: e.y, look: null, name: '' }; st.players.set(e.id, p); }
        p.tx = e.x; p.ty = e.y; p.d = e.d; p.m = e.m; p.s = e.s || null; p.v = e.v || null; p.seen = now;
        if (e.look) { p.look = e.look; p.name = e.name; p.username = e.username; }
        if (e.a) { if (p.a !== e.a || !p.aUntil || p.aUntil < now - 200) { p.aUntil = now + 350; } p.a = e.a; } else p.a = null;
      }
    });
    Net.on('leave', (m) => st.players.delete(m.id));
    Net.on('players', (m) => {
      const seen = new Set();
      for (const n of m.npcs || []) { seen.add(n.id); let o = st.npcs.get(n.id); if (!o) { o = { ...n, tx: n.x, ty: n.y }; st.npcs.set(n.id, o); } else { o.tx = n.x; o.ty = n.y; o.d = n.d; o.m = n.m; } }
      for (const id of st.npcs.keys()) if (!seen.has(id)) st.npcs.delete(id);
      const seenM = new Set();
      for (const e of m.mobs || []) { seenM.add(e.id); let o = st.mobs.get(e.id); if (!o) { o = { ...e, tx: e.x, ty: e.y }; st.mobs.set(e.id, o); } else { o.tx = e.x; o.ty = e.y; o.hp = e.hp; o.a = e.a; o.d = e.d; o.f = e.f; } }
      for (const id of st.mobs.keys()) if (!seenM.has(id)) st.mobs.delete(id);
    });
    Net.on('mob_hit', (m) => { st.mobHits.set(m.id, performance.now() + 150); float(`-${m.dmg}`, '#ffb3b3', m.x, m.y - 0.9); const mob = st.mobs.get(m.id); if (mob) mob.hp = Math.max(0, mob.hp - m.dmg); const col = mob && mob.t !== 'slime' ? '#e04848' : (D.MOBS.slime.variants[mob ? mob.v : 0] || {}).color || '#5fbd55'; burst(Math.floor(m.x), Math.floor(m.y), col, 4, 0.5, 2); });
    Net.on('mob_die', (m) => { st.mobs.delete(m.id); const col = m.k && m.k !== 'slime' ? [D.ANIMALS[m.k] ? D.ANIMALS[m.k].color : '#e04848', '#e04848'] : D.MOBS.slime.variants[m.v].color; burst(Math.floor(m.x), Math.floor(m.y), col, 10 + Math.round((m.size || 1) * 6), 0.7 * (m.size || 1), 3); });
    Net.on('mob_gone', (m) => st.mobs.delete(m.id));
    Net.on('hurt', (m) => { st.hurtAt = performance.now(); float(`-${m.dmg}`, '#ff6b6b'); if (st.me) st.me.hp = m.hp; UI.refreshNeeds(); });
    Net.on('fx', (m) => { const max = m.kind === 'shot' ? 0.12 : m.kind === 'fire' ? 0.5 : m.kind === 'dash' ? 0.25 : 0.7; st.fx.push({ ...m, life: max, max }); if (m.kind === 'rain') for (let i = 0; i < 24; i++) st.particles.push({ x: m.x + 0.5 + (Math.random() - 0.5) * m.r * 2, y: m.y - 2 + Math.random() * 2, vx: 0, vy: 4 + Math.random() * 3, g: 0, life: 0.5 + Math.random() * 0.4, color: '#7cc4f0' }); if (m.kind === 'grow') burst(m.x, m.y, ['#7ee787', '#43aa8b'], 12, m.r * 2, 2); });
    Net.on('skill_ok', (m) => { st.cds[m.id] = m.until; UI.refreshSkills(); });
    Net.on('ping', (m) => { if (m.at) st.fx.push({ kind: 'ping', x: m.at.x, y: m.at.y, life: 6, max: 6 }); });
    Net.on('buffs', (m) => { st.buffs = m.b || {}; });
    Net.on('fish_state', (m) => {
      if (!m.state || m.state === 'miss') { st.fishing = null; if (m.state === 'miss') burst(st.fishing ? st.fishing.x : Math.floor(st.pos.x), st.fishing ? st.fishing.y : Math.floor(st.pos.y), '#7cc4f0', 6, 0.6, 2); return; }
      if (m.state === 'catch') { const f = D.FISH[m.fish]; burst(m.x, m.y, ['#7cc4f0', f.color], 14, 0.8, 3); float(`${f.th} ${m.size} ซม.`, D.RARITY_COLOR[f.rarity] || '#fff'); st.fishing = null; st.anim = { a: 'rod', until: performance.now() + 500, icon: 'rod_wood' }; return; }
      st.fishing = { x: m.x, y: m.y, state: m.state, since: performance.now() };
      if (m.state === 'bite') { float('!', '#ffe08a'); }
    });
    Net.on('fx', (m) => { if (m.kind === 'splash') for (let i = 0; i < 8; i++) st.particles.push({ x: m.x + 0.5 + (Math.random() - 0.5) * 0.6, y: m.y + 0.5, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 2, life: 0.5 + Math.random() * 0.3, color: '#bfe3ff' }); });
    Net.on('warp', (m) => { st.pos.x = m.x; st.pos.y = m.y; st.cam.x = m.x; st.cam.y = m.y; st.lastSent = null; });
    Net.on('me', (m) => { if (!st.me) return; Object.assign(st.me, m.patch); if ('state' in m.patch) st.state = m.patch.state; UI.onMe(Object.keys(m.patch)); });
    Net.on('time', (m) => { st.time = m.time; st.timeAt = performance.now(); st.onlineN = m.online; });
    Net.on('chat', (m) => { if (m.scope === 'local') st.bubbles.set(m.from.id, { text: m.text, until: performance.now() + 6000 }); });
    Net.on('fpos', (m) => { st.friendsPos = m.list; });
    Net.on('toast', (m) => { if (m.kind === 'get') float(m.text.split('  ')[0], '#9be7a1'); });
  }

  function start(init) {
    st.me = init.me; st.id = init.me.id;
    st.pos = { x: init.me.x, y: init.me.y }; st.cam = { x: init.me.x, y: init.me.y };
    st.time = init.world.time; st.timeAt = performance.now();
    st.chunks.clear(); st.requested.clear(); st.players.clear(); st.npcs.clear(); st.mobs.clear(); st.fx = []; st.cds = {}; st.targeting = null; st.buffs = {}; st.fishing = null; st.lastSent = null; st.state = null;
    resize();
    if (!st.running) { st.running = true; last = performance.now(); requestAnimationFrame(loop); }
  }
  function stop() { st.running = false; }
  function init() { resize(); bindInput(); bindNet(); }

  return { st, init, start, stop, setZoom, getZoom: () => zoom, tileAt, objAt, selectedId, selectSlot, selectTool, selectItem, useAt, float, hourOf, burst, passable, triggerSkill, mySkills };
})();
