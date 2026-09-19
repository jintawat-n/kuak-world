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
    }
    let speed = st.run ? 6.6 : 4.3;
    const n = st.me.needs; if (n.hunger < 8 || n.energy < 8) speed *= 0.55;
    const veh = myVehicle();
    if (veh) speed = 4.3 * veh.speed * (st.run ? 1.25 : 1);
    else if (tileAt(Math.floor(st.pos.x), Math.floor(st.pos.y)) === D.T.SHALLOW) speed *= 0.6;
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
  function useAt(tx, ty, itemId) {
    if (!st.me) return;
    const now = performance.now();
    if (now - st.lastUse < 220) return; st.lastUse = now;
    const d = Math.max(Math.abs(st.pos.x - (tx + 0.5)), Math.abs(st.pos.y - (ty + 0.5)));
    if (d > 3.2) { UI.toast('ไกลเกินไป เดินเข้าไปใกล้กว่านี้', 'error'); return; }
    const ddx = tx + 0.5 - st.pos.x, ddy = ty + 0.5 - st.pos.y;
    if (Math.abs(ddx) > Math.abs(ddy) + 0.3) st.dir = ddx > 0 ? 'right' : 'left'; else if (Math.abs(ddy) > 0.3) st.dir = ddy > 0 ? 'down' : 'up';
    const item = D.ITEMS[itemId] || D.ITEMS.hand;
    st.anim = { a: item.tool || 'place', until: now + 350, icon: itemId, tx, ty };
    Net.send({ t: 'use', x: tx, y: ty, item: itemId });
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
    for (const p of st.particles) { p.life -= dt; p.vy += 6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    st.particles = st.particles.filter(p => p.life > 0);
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
    if (st.me) ents.push({ k: st.pos.y, me: true });
    ents.sort((a, b) => a.k - b.k);
    for (const e of ents) {
      if (e.o) drawObj(e, ox, oy, now);
      else if (e.p) drawPlayer(e.p, ox, oy, now, false);
      else drawPlayer({ x: st.pos.x, y: st.pos.y, d: st.dir, look: st.me.look, name: st.me.name, id: st.id }, ox, oy, now, true);
    }
    // particles
    for (const p of st.particles) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(ox + p.x * TILE - dpr, oy + p.y * TILE - dpr, 3 * dpr, 3 * dpr); }
    ctx.globalAlpha = 1;
    // lighting
    drawLighting(now, ox, oy, x0, y0, x1, y1);
    // tags, bubbles, floats
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (const t of st.tags) {
      const sx = ox + t.x * TILE, sy = oy + (t.y - 1.5) * TILE;
      ctx.font = `600 ${11 * dpr}px ${getComputedStyle(document.body).fontFamily}`;
      ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(t.name, sx, sy);
      ctx.fillStyle = t.isMe ? '#ffe08a' : t.friend ? '#9be7a1' : '#fff'; ctx.fillText(t.name, sx, sy);
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
      const icon = D.ITEMS[anim.icon] ? SP.item(anim.icon) : null;
      if (icon) {
        const t = 1 - (anim.until - now) / 350;
        const ang = (p.d === 'left' ? -1 : 1) * (-0.8 + t * 2.2);
        const hx = cx + (p.d === 'left' ? -TILE * 0.35 : p.d === 'right' ? TILE * 0.35 : TILE * 0.3), hy = fy - TILE * 0.7;
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.drawImage(icon, -TILE * 0.2, -TILE * 0.6, TILE * 0.7, TILE * 0.7); ctx.restore();
      }
    }
    st.tags.push({ x: p.x, y: p.y, name: p.name, isMe, id: p.id, state, friend: !isMe && UI.isFriend(p.id) });
  }
  function drawHover(ox, oy, now) {
    if (!st.hover || !st.me) return;
    const { x, y } = st.hover;
    const inRange = Math.max(Math.abs(st.pos.x - (x + 0.5)), Math.abs(st.pos.y - (y + 0.5))) <= 3.2;
    const sx = ox + x * TILE, sy = oy + y * TILE;
    const id = selectedId(); const item = D.ITEMS[id];
    let valid = null;
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
    if (st.me) lights.push({ x: st.pos.x, y: st.pos.y - 0.5, r: 3 });
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
      let c = MINI[t] || '#f0f';
      const o = objAt(x, y);
      if (o) { if (['tree', 'pine', 'palm'].includes(o.t)) c = '#2e6b2a'; else if (o.t === 'rock' || o.t === 'bigrock') c = '#666'; else if (o.o || o.t === 'shop') c = o.t === 'crop' ? '#e0a020' : '#f3dfb5'; }
      mctx.fillStyle = c; mctx.fillRect((dx + R) * s, (dy + R) * s, s, s);
    }
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
      st.keys[k] = true;
      if (k === 'shift') st.run = true;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (k >= '1' && k <= '5') selectItem(+k - 1);
      else if (k >= '6' && k <= '9') selectTool(+k - 6);
      else if (k === '0') selectTool(4);
      else if (k === 'tab') { if (st.sel.zone === 'tool') selectTool(st.sel.i + 1); else selectTool(0); e.preventDefault(); }
      else if (k === 'e') { const f = facing(); useAt(f.x, f.y, 'hand'); }
      else if (k === ' ') { const f = facing(); useAt(f.x, f.y, selectedId()); e.preventDefault(); }
      else if (k === 'v') { if (st.me && st.me.vehicle) Net.send({ t: 'mount' }); else UI.toast('ยังไม่ได้ขึ้นพาหนะ: เปิดกระเป๋า (I) แล้วกด "ขี่" ที่พาหนะ', 'info'); }
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
    st.chunks.clear(); st.requested.clear(); st.players.clear(); st.lastSent = null; st.state = null;
    resize();
    if (!st.running) { st.running = true; last = performance.now(); requestAnimationFrame(loop); }
  }
  function stop() { st.running = false; }
  function init() { resize(); bindInput(); bindNet(); }

  return { st, init, start, stop, setZoom, getZoom: () => zoom, tileAt, objAt, selectedId, selectSlot, selectTool, selectItem, useAt, float, hourOf, burst, passable };
})();
