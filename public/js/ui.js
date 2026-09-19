/* ==========================================================
   UI: HUD, panels (inventory/craft/shop/friends/map), chat
   ========================================================== */
window.UI = (() => {
  const D = window.DEFS, SP = window.Sprites;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const G = () => Game.st;
  let friends = [], reqs = [], unread = {}, wcScope = 'local', wcMsgs = { local: [], global: [] };
  const wins = new Map();
  let invCat = 'all', craftCat = 'all', shopMode = 'buy', searchResults = [], signPos = null, mapCanvas = null, clockTimer = null, started = false;
  const HAIR_TH = { short: 'สั้น', long: 'ยาว', spiky: 'ตั้ง', bob: 'บ๊อบ', bun: 'มวย', ponytail: 'หางม้า', curly: 'หยิก', bald: 'โล้น' };
  const HAT_TH = { none: 'ไม่ใส่', cap: 'แก๊ป', straw: 'ฟาง', beanie: 'บีนนี่', crown: 'มงกุฎ', flower: 'ดอกไม้' };

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function typing() { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); }
  function isFriend(id) { return friends.some(f => f.id === id); }
  function friendInfo(id) { return friends.find(f => f.id === id) || null; }
  function fmtTime(ts) { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function icon(id) { return `<img src="${SP.iconURL(id)}" alt="">`; }
  function avatarCanvas(look) { const c = document.createElement('canvas'); c.width = 16; c.height = 24; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(SP.char(look || {}, 'down', 0), 0, 0); return c; }

  function toast(text, kind = 'info', ms = 2800) {
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = text;
    const box = $('#toasts'); box.appendChild(t); while (box.children.length > 5) box.firstChild.remove();
    setTimeout(() => t.remove(), ms); return t;
  }

  // ---------- panels ----------
  function openPanel(id) { $$('.modal-panel').forEach(p => p.classList.add('hidden')); $('#modal').classList.remove('hidden'); $('#' + id).classList.remove('hidden'); refreshPanel(id); }
  function closePanels() { $('#modal').classList.add('hidden'); $$('.modal-panel').forEach(p => p.classList.add('hidden')); }
  function panelOpen() { return !$('#modal').classList.contains('hidden'); }
  function currentPanel() { const p = $$('.modal-panel').find(p => !p.classList.contains('hidden')); return panelOpen() && p ? p.id : null; }
  function toggle(id) { if (currentPanel() === id) closePanels(); else openPanel(id); }
  function refreshPanel(id) { const f = { pInv: refreshInv, pCraft: refreshCraft, pCook: refreshCook, pShop: refreshShop, pFriends: refreshFriends, pMap: drawBigMap, pEra: refreshEra }[id]; if (f) f(); }
  function hotkey(k, e) {
    switch (k) {
      case 'i': toggle('pInv'); break; case 'c': toggle('pCraft'); break; case 'b': toggle('pShop'); break;
      case 'm': toggle('pMap'); break; case 'f': toggle('pFriends'); break; case 'h': Net.send({ t: 'home' }); break; case 'l': toggle('pEra'); break;
      case 'escape': if (panelOpen()) closePanels(); else openPanel('pMenu'); break;
      case 'enter': $('#worldChat').classList.remove('collapsed'); $('#worldChat').classList.add('expanded'); $('#wcInput').focus(); e.preventDefault(); break;
    }
  }

  // ---------- HUD ----------
  const NEED_FIX = {
    hunger: 'หิวมาก เดินช้าลง → กินอาหาร: เปิดกระเป๋า (I) คลิกขวาที่อาหาร หรือเก็บเบอร์รี่/เห็ด',
    energy: 'หมดแรง เดินช้าลง → นอนบนเตียง (คราฟต์เตียงแล้วคลิก) หรือนั่งเก้าอี้พัก',
    fun: 'เบื่อมาก → เก็บดอกไม้ ดูทีวี อ่านหนังสือ เล่นน้ำพุ หรือกินของอร่อย',
    hygiene: 'ตัวสกปรก → อาบน้ำในอ่างอาบน้ำ หรือใช้ชักโครก (คราฟต์ได้ในยุคอุตสาหกรรม)',
  };
  function refreshNeeds() {
    const me = G().me; const n = me.needs; let worst = null;
    for (const [k, v] of Object.entries(n)) {
      const row = $(`.need[data-n="${k}"]`); if (!row) continue;
      row.querySelector('i').style.width = v + '%';
      row.classList.toggle('crit', v < 15); row.classList.toggle('low', v >= 15 && v < 35);
      const pc = row.querySelector('.pc'); pc.textContent = Math.round(v) + '%'; pc.classList.toggle('ok', v >= 35);
      row.title = `${D.NEEDS[k]} ${Math.round(v)}% · ${NEED_FIX[k]}`;
      if (v < 15 && (!worst || v < n[worst])) worst = k;
    }
    const hp = me.hp == null ? 100 : me.hp; const hpRow = $('.stat.hp');
    $('#hpBar').style.width = hp + '%'; $('#hpText').textContent = `${Math.round(hp)}/100`; hpRow.classList.toggle('crit', hp < 25);
    const chev = $('#needsToggle .chev'); if (chev) chev.classList.toggle('alert', !!worst || hp < 25);
    const h = $('#needHint');
    if (hp < 25) { h.querySelector('span').textContent = 'เลือดใกล้หมด! กินอาหารและพักผ่อนก่อนจะเป็นลม'; h.classList.remove('hidden'); }
    else if (worst) { h.querySelector('span').textContent = NEED_FIX[worst]; h.classList.remove('hidden'); }
    else h.classList.add('hidden');
  }
  function refreshCoins() { $('#coins').textContent = G().me.coins; $('#shopCoins').textContent = `· มี ${G().me.coins} เหรียญ`; }
  function refreshProfile() { const me = G().me; $('#hudName').textContent = me.name; const av = $('#hudAvatar'); av.innerHTML = ''; av.appendChild(avatarCanvas(me.look)); }
  function refreshLevel() {
    const me = G().me; const lv = me.level || 1, xp = me.xp || 0, need = D.xpNeed(lv); const era = D.eraOf(lv);
    $('#lvl').textContent = `Lv ${lv}`; $('#era').textContent = era.th;
    $('#xpBar').style.width = Math.min(100, xp / need * 100) + '%'; $('#xpText').textContent = `${xp}/${need} XP`;
    $('#craftHint').textContent = `เลเวล ${lv} · ${era.th} · สูตรที่ล็อกจะปลดเมื่อถึงเลเวลที่กำหนด`;
  }
  function refreshVehicle() {
    const me = G().me; const tag = $('#vehicleTag');
    if (me.vehicle && D.VEHICLES[me.vehicle]) { tag.classList.remove('hidden'); tag.innerHTML = `${icon(me.vehicle)} กำลังขี่ <b>${D.VEHICLES[me.vehicle].th}</b> · กด V เพื่อลง`; tag.querySelector('img') && (tag.querySelector('img').style.cssText = 'width:16px;height:16px;vertical-align:middle;image-rendering:pixelated'); }
    else tag.classList.add('hidden');
  }
  function refreshHotbar() {
    const me = G().me; const hb = $('#hbZones'); hb.innerHTML = '';
    while (me.hotbar.length < D.ITEM_SLOTS) me.hotbar.push(null);
    const sel = G().sel;
    // ---- zone 1: tools (auto from inventory) ----
    const zt = document.createElement('div'); zt.className = 'zone';
    zt.innerHTML = '<div class="zl">🛠️ เครื่องมือ <small>6-0 · Tab</small></div>';
    const rt = document.createElement('div'); rt.className = 'slots';
    D.TOOL_KINDS.forEach((k, i) => {
      const id = D.bestTool(me.inv, k.kind);
      const sl = document.createElement('div'); sl.className = 'slot tool' + (sel.zone === 'tool' && sel.i === i ? ' active' : '') + (id ? '' : ' empty');
      sl.innerHTML = (id ? icon(id) : `<span class="ph">${{ axe: '🪓', pickaxe: '⛏️', hoe: '🌱', can: '💧', hammer: '🔨' }[k.kind]}</span>`) + `<span class="k">${i === 4 ? 0 : i + 6}</span>` + (id && D.ITEMS[id].dmg ? '<span class="tier">★</span>' : '');
      sl.title = id ? `${D.ITEMS[id].th}${D.ITEMS[id].dmg ? ' (แรง x' + D.ITEMS[id].dmg + ')' : ''}` : `ยังไม่มี${k.th} (คราฟต์หรือซื้อที่ร้าน)`;
      sl.onclick = () => Game.selectTool(i);
      rt.appendChild(sl);
    });
    zt.appendChild(rt); hb.appendChild(zt);
    const div = document.createElement('div'); div.className = 'zdiv'; hb.appendChild(div);
    // ---- zone 2: items (player arranged) ----
    const zi = document.createElement('div'); zi.className = 'zone';
    zi.innerHTML = '<div class="zl">🎒 อุปกรณ์ <small>1-5</small></div>';
    const ri = document.createElement('div'); ri.className = 'slots';
    me.hotbar.forEach((id, i) => {
      const sl = document.createElement('div'); sl.className = 'slot' + (sel.zone === 'item' && sel.i === i ? ' active' : '');
      const n = id ? (me.inv[id] || 0) : 0;
      if (id && D.ITEMS[id]) { sl.innerHTML = `${icon(id)}<span class="n">${n}</span>`; if (!n) sl.classList.add('empty'); }
      sl.innerHTML += `<span class="k">${i + 1}</span>`;
      sl.title = id && D.ITEMS[id] ? D.ITEMS[id].th + ' · คลิกขวาเพื่อเอาออก' : 'ว่าง (เลือกช่องนี้แล้วคลิกไอเทมในกระเป๋า)';
      sl.onclick = () => Game.selectItem(i);
      sl.oncontextmenu = (e) => { e.preventDefault(); me.hotbar[i] = null; Net.send({ t: 'hotbar', items: me.hotbar }); refreshHotbar(); };
      ri.appendChild(sl);
    });
    zi.appendChild(ri); hb.appendChild(zi);
    const cur = Game.selectedId(); const it = D.ITEMS[cur];
    $('#hotbarName').textContent = cur === 'hand' ? (sel.zone === 'tool' ? `✋ ยังไม่มี${D.TOOL_KINDS[sel.i].th} · ใช้มือเปล่า` : '✋ มือเปล่า (คลิกขวา/E เพื่อโต้ตอบ)') : `${it.th}${it.cat === 'tool' ? '' : ' x' + (me.inv[cur] || 0)}`;
  }
  function refreshClock() {
    if (!G().me) return;
    const h = Game.hourOf(); const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    $('#clock').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    $('#clockIcon').textContent = h >= 6 && h < 18 ? '☀️' : (h >= 18 && h < 20) || (h >= 5 && h < 6) ? '🌇' : '🌙';
    $('#online').textContent = `· ${G().onlineN} ออนไลน์`;
  }

  // ---------- inventory ----------
  function refreshInv() {
    const me = G().me; const grid = $('#invGrid'); grid.innerHTML = '';
    const items = Object.entries(me.inv).filter(([id, n]) => n > 0 && D.ITEMS[id] && (invCat === 'all' || D.ITEMS[id].cat === invCat));
    if (!items.length) { grid.innerHTML = '<div class="muted">ไม่มีไอเทมในหมวดนี้</div>'; return; }
    for (const [id, n] of items) {
      const it = D.ITEMS[id]; const c = document.createElement('div'); c.className = 'cell' + (it.cat === 'tool' ? ' istool' : '');
      c.innerHTML = `${icon(id)}<span class="nm">${it.th}</span><span class="n">${it.cat === 'tool' ? '' : n}</span>`;
      c.title = it.th + (it.food ? ` · กิน: หิว+${it.food.h || 0}${it.food.e ? ' พลัง+' + it.food.e : ''}${it.food.f ? ' สนุก+' + it.food.f : ''}` : it.crop ? ' · เมล็ดพันธุ์ ปลูกบนดินพรวน' : it.obj || it.tile != null ? ' · วางบนพื้น' : '');
      if (it.vehicle) { const b = document.createElement('button'); b.className = 'ride'; const riding = me.vehicle === it.vehicle; b.textContent = riding ? 'ลง' : 'ขี่'; b.onclick = (e) => { e.stopPropagation(); Net.send({ t: 'mount', item: id }); closePanels(); }; c.appendChild(b); c.onclick = () => Net.send({ t: 'mount', item: id }); c.title = `${it.th} · ความเร็ว x${D.VEHICLES[it.vehicle].speed}${D.VEHICLES[it.vehicle].water ? ' · ใช้ในน้ำ' : D.VEHICLES[it.vehicle].fly ? ' · บินได้' : ' · ใช้บนบก'}`; grid.appendChild(c); continue; }
      if (it.food) { const b = document.createElement('button'); b.className = 'eat'; b.textContent = 'กิน'; b.onclick = (e) => { e.stopPropagation(); Net.send({ t: 'eat', item: id }); }; c.appendChild(b); }
      else if (it.use) { const b = document.createElement('button'); b.className = 'eat'; b.textContent = 'ใช้'; b.onclick = (e) => { e.stopPropagation(); Net.send({ t: 'usemisc', item: id }); }; c.appendChild(b); }
      c.onclick = () => {
        if (it.cat === 'tool') { const ki = D.TOOL_KINDS.findIndex(k => k.tiers.includes(id)); if (ki >= 0) { Game.selectTool(ki); toast(`เลือก ${it.th} แล้ว (โซนเครื่องมือ)`, 'info', 1200); } return; }
        const sel = G().sel; let slot = sel.zone === 'item' ? sel.i : me.hotbar.indexOf(id);
        if (slot < 0) slot = me.hotbar.indexOf(null); if (slot < 0) slot = 0;
        const dup = me.hotbar.indexOf(id); if (dup >= 0 && dup !== slot) me.hotbar[dup] = null;
        me.hotbar[slot] = id; Net.send({ t: 'hotbar', items: me.hotbar }); Game.selectItem(slot); toast(`ใส่ ${it.th} ในช่องอุปกรณ์ ${slot + 1}`, 'info', 1200);
      };
      c.oncontextmenu = (e) => { e.preventDefault(); if (it.food) Net.send({ t: 'eat', item: id }); };
      grid.appendChild(c);
    }
  }

  // ---------- crafting / cooking ----------
  function recipeRow(r, cooking) {
    const me = G().me; const ok = Object.entries(r.in).every(([k, q]) => (me.inv[k] || 0) >= q);
    const li = document.createElement('div'); li.className = 'li' + (ok ? '' : ' dis');
    const ings = Object.entries(r.in).map(([k, q]) => `<span class="ing ${(me.inv[k] || 0) >= q ? '' : 'no'}">${icon(k)}${D.ITEMS[k].th} ${me.inv[k] || 0}/${q}</span>`).join('');
    const out = D.ITEMS[r.out];
    const locked = !cooking && r.lv && (me.level || 1) < r.lv;
    if (locked) li.classList.add('locked');
    const extra = out.food ? ` <span class="muted">(หิว+${out.food.h})</span>` : out.vehicle ? ` <span class="muted">(เร็ว x${D.VEHICLES[out.vehicle].speed})</span>` : out.dmg ? ` <span class="muted">(แรง x${out.dmg})</span>` : '';
    li.innerHTML = `${icon(r.out)}<div class="info"><b>${out.th} x${r.n}${extra}</b>${ings}</div>`;
    if (locked) { const l = document.createElement('span'); l.className = 'lock'; l.textContent = `🔒 Lv ${r.lv} · ${D.eraOf(r.lv).th}`; li.appendChild(l); return li; }
    const b1 = document.createElement('button'); b1.className = 'btn small' + (ok ? ' primary' : ''); b1.textContent = cooking ? 'ทำ' : 'คราฟต์'; b1.disabled = !ok; b1.onclick = () => Net.send({ t: cooking ? 'cook' : 'craft', id: r.id, n: 1 });
    const b5 = document.createElement('button'); b5.className = 'btn small'; b5.textContent = 'x5'; b5.disabled = !Object.entries(r.in).every(([k, q]) => (me.inv[k] || 0) >= q * 5); b5.onclick = () => Net.send({ t: cooking ? 'cook' : 'craft', id: r.id, n: 5 });
    li.appendChild(b1); li.appendChild(b5); return li;
  }
  function refreshCraft() { refreshLevel(); const l = $('#craftList'); l.innerHTML = ''; const lv = G().me.level || 1; [...D.RECIPES].filter(r => craftCat === 'all' || r.cat === craftCat).sort((a, b) => ((a.lv > lv) - (b.lv > lv)) || (a.lv - b.lv)).forEach(r => l.appendChild(recipeRow(r, false))); }
  function refreshCook() { const l = $('#cookList'); l.innerHTML = ''; D.COOKING.forEach(r => l.appendChild(recipeRow(r, true))); }

  // ---------- shop ----------
  function refreshShop() {
    const me = G().me; const l = $('#shopList'); l.innerHTML = ''; refreshCoins();
    if (shopMode === 'buy') {
      for (const [id, price] of Object.entries(D.SHOP.buy)) {
        const it = D.ITEMS[id]; const li = document.createElement('div'); li.className = 'li';
        const desc = it.crop ? `ปลูกได้: ${D.CROPS[it.crop].th} (${D.CROPS[it.crop].stageSec * 4 / 60 | 0} นาที)` : it.food ? 'อาหาร หิว+' + it.food.h : it.vehicle ? `พาหนะ เร็ว x${D.VEHICLES[it.vehicle].speed}` : it.cat === 'tool' ? 'เครื่องมือ' : 'วัตถุดิบ';
        li.innerHTML = `${icon(id)}<div class="info"><b>${it.th}</b><span class="muted">${desc} · มี ${me.inv[id] || 0}</span></div><span class="price">🪙 ${price}</span>`;
        const needLv = D.SHOP.lv[id] || 0;
        if (needLv > (me.level || 1)) { li.classList.add('locked'); const lk = document.createElement('span'); lk.className = 'lock'; lk.textContent = `🔒 Lv ${needLv} · ${D.eraOf(needLv).th}`; li.appendChild(lk); l.appendChild(li); continue; }
        const q = document.createElement('input'); q.type = 'number'; q.className = 'qty'; q.value = 1; q.min = 1; q.max = 99;
        const b = document.createElement('button'); b.className = 'btn small primary'; b.textContent = 'ซื้อ'; b.onclick = () => Net.send({ t: 'buy', item: id, n: +q.value || 1 });
        if (it.cat === 'tool' && me.inv[id]) { b.disabled = true; b.textContent = 'มีแล้ว'; }
        li.appendChild(q); li.appendChild(b); l.appendChild(li);
      }
    } else {
      const items = Object.entries(me.inv).filter(([id, n]) => n > 0 && D.SHOP.sell[id]);
      if (!items.length) l.innerHTML = '<div class="muted">ไม่มีของที่ขายได้ (ผัก ผลไม้ อาหาร วัตถุดิบ)</div>';
      for (const [id, n] of items) {
        const it = D.ITEMS[id]; const price = D.SHOP.sell[id]; const li = document.createElement('div'); li.className = 'li';
        li.innerHTML = `${icon(id)}<div class="info"><b>${it.th}</b><span class="muted">มี ${n}</span></div><span class="price">🪙 ${price}/ชิ้น</span>`;
        const q = document.createElement('input'); q.type = 'number'; q.className = 'qty'; q.value = n; q.min = 1; q.max = n;
        const b = document.createElement('button'); b.className = 'btn small'; b.textContent = 'ขาย'; b.onclick = () => Net.send({ t: 'sell', item: id, n: +q.value || 1 });
        li.appendChild(q); li.appendChild(b); l.appendChild(li);
      }
    }
  }

  // ---------- friends ----------
  function friendRow(f, actions) {
    const row = document.createElement('div'); row.className = 'fitem';
    const av = avatarCanvas(f.look); av.style.width = '24px'; av.style.height = '36px'; row.appendChild(av);
    const nm = document.createElement('div'); nm.className = 'nm'; nm.innerHTML = `${esc(f.name)}<small>@${esc(f.username)}${f.online ? ' · ออนไลน์' : ''}</small>`; row.appendChild(nm);
    const on = document.createElement('span'); on.className = 'on' + (f.online ? ' yes' : ''); row.appendChild(on);
    for (const [label, fn, cls] of actions) { const b = document.createElement('button'); b.className = 'btn small ' + (cls || ''); b.textContent = label; b.onclick = fn; row.appendChild(b); }
    return row;
  }
  function refreshFriends() {
    const fr = $('#friendResults'); fr.innerHTML = '';
    for (const u of searchResults) {
      const isF = isFriend(u.id);
      fr.appendChild(friendRow(u, isF ? [['💬 แชต', () => { closePanels(); openChat(u.id); }]] : [['➕ เพิ่มเพื่อน', () => Net.send({ t: 'friend_req', name: u.username }), 'primary'], ['💬', () => { closePanels(); openChat(u.id); }]]));
    }
    const rq = $('#friendReqs'); rq.innerHTML = reqs.length ? '<h4>คำขอเป็นเพื่อน</h4>' : '';
    for (const r of reqs) rq.appendChild(friendRow(r, [['✓ ตอบรับ', () => Net.send({ t: 'friend_accept', id: r.id }), 'primary'], ['✕', () => Net.send({ t: 'friend_decline', id: r.id })]]));
    const fl = $('#friendList'); fl.innerHTML = friends.length ? '' : '<div class="muted">ยังไม่มีเพื่อน ค้นหาชื่อผู้ใช้ด้านบนเพื่อเพิ่มเพื่อน</div>';
    const sorted = [...friends].sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
    for (const f of sorted) fl.appendChild(friendRow(f, [['💬 แชต', () => { closePanels(); openChat(f.id); }], ['🚶 ไปหา', () => { Net.send({ t: 'visit', id: f.id }); closePanels(); }], ['✕', () => { if (confirm(`ลบ ${f.name} ออกจากเพื่อน?`)) Net.send({ t: 'friend_remove', id: f.id }); }, 'danger']]));
    const badge = $('#badgeFriends'); if (reqs.length) { badge.textContent = reqs.length; badge.classList.remove('hidden'); } else badge.classList.add('hidden');
  }

  // ---------- messenger dock ----------
  function refreshDock() {
    const dl = $('#dockFriends'); dl.innerHTML = '';
    $('#dockOnline').textContent = `· ${friends.filter(f => f.online).length} ออนไลน์`;
    const list = [...friends];
    for (const id of Object.keys(unread)) { const w = wins.get(+id); if (!list.some(f => f.id === +id) && w && w.info) list.push(w.info); }
    list.sort((a, b) => ((unread[b.id] || 0) - (unread[a.id] || 0)) || (b.online - a.online) || a.name.localeCompare(b.name));
    if (!list.length) dl.innerHTML = '<div class="muted" style="padding:8px">ยังไม่มีเพื่อน กด 👥 เพื่อค้นหาและเพิ่มเพื่อน</div>';
    for (const f of list) {
      const row = document.createElement('div'); row.className = 'fr';
      const av = document.createElement('div'); av.className = 'av'; av.appendChild(avatarCanvas(f.look)); const dot = document.createElement('span'); dot.className = 'dot' + (f.online ? ' on' : ''); av.appendChild(dot); row.appendChild(av);
      const nm = document.createElement('div'); nm.className = 'nm'; nm.innerHTML = `${esc(f.name)}<small>@${esc(f.username)}${f.online ? ' · ออนไลน์' : ''}</small>`; row.appendChild(nm);
      if (unread[f.id]) { const ub = document.createElement('span'); ub.className = 'ub'; ub.textContent = unread[f.id]; row.appendChild(ub); }
      row.onclick = () => { openChat(f.id); $('#dockList').classList.add('hidden'); };
      dl.appendChild(row);
    }
    const total = Object.values(unread).reduce((a, b) => a + b, 0);
    const badge = $('#badgeDm'); if (total) { badge.textContent = total; badge.classList.remove('hidden'); } else badge.classList.add('hidden');
  }
  function openChat(id, quiet) {
    id = Number(id);
    let w = wins.get(id);
    if (!w) {
      if (wins.size >= 3) closeChat(wins.keys().next().value);
      const el = document.createElement('div'); el.className = 'cw';
      el.innerHTML = `<div class="cw-head"><div class="fr"><div class="av"></div><div class="nm"><span class="name">...</span><small class="stat"></small></div></div><button class="go" title="วาร์ปไปหา">🚶</button><button class="min" title="ย่อ">—</button><button class="cls" title="ปิด">✕</button></div><div class="cw-msgs"></div><form><input placeholder="Aa" maxlength="1000" autocomplete="off"><button type="submit">➤</button></form>`;
      w = { id, el, msgs: [], info: friendInfo(id), loaded: false };
      wins.set(id, w);
      $('#chatWindows').appendChild(el);
      el.querySelector('.cls').onclick = () => closeChat(id);
      el.querySelector('.min').onclick = () => el.classList.toggle('min');
      el.querySelector('.go').onclick = () => Net.send({ t: 'visit', id });
      el.querySelector('.cw-head .fr').onclick = () => { el.classList.remove('min'); markRead(id); };
      el.querySelector('form').onsubmit = (e) => { e.preventDefault(); const inp = el.querySelector('input'); const text = inp.value.trim(); if (!text) return; Net.send({ t: 'dm', to: id, text }); inp.value = ''; };
      el.querySelector('input').onfocus = () => markRead(id);
      Net.send({ t: 'dm_history', with: id });
    }
    if (!quiet) { w.el.classList.remove('min'); markRead(id); setTimeout(() => w.el.querySelector('input').focus(), 30); }
    renderWin(w);
    return w;
  }
  function closeChat(id) { const w = wins.get(id); if (!w) return; w.el.remove(); wins.delete(id); }
  function markRead(id) { if (unread[id]) { delete unread[id]; Net.send({ t: 'dm_read', with: id }); refreshDock(); } }
  function renderWin(w) {
    const info = friendInfo(w.id) || w.info;
    if (info) { w.info = info; const av = w.el.querySelector('.av'); av.innerHTML = ''; av.appendChild(avatarCanvas(info.look)); const d = document.createElement('span'); d.className = 'dot' + (info.online ? ' on' : ''); av.appendChild(d); w.el.querySelector('.name').textContent = info.name; w.el.querySelector('.stat').textContent = info.online ? 'ออนไลน์' : 'ออฟไลน์'; w.el.querySelector('.go').style.display = isFriend(w.id) ? '' : 'none'; }
    const box = w.el.querySelector('.cw-msgs'); box.innerHTML = '';
    const me = G().id;
    if (!w.msgs.length) box.innerHTML = '<div class="muted" style="text-align:center;padding:12px">เริ่มบทสนทนาใหม่ 👋</div>';
    for (const m of w.msgs) { const b = document.createElement('div'); b.className = 'bub ' + (m.from === me ? 'me' : 'them'); b.innerHTML = `${esc(m.text)}<span class="ts">${fmtTime(m.ts)}</span>`; box.appendChild(b); }
    box.scrollTop = box.scrollHeight;
  }
  function onDm(m) {
    const me = G().id; const other = m.from === me ? m.to : m.from;
    let w = wins.get(other);
    if (!w) { w = openChat(other, true); if (m.fromInfo) { w.info = m.fromInfo; renderWin(w); } }
    else if (w.loaded) { w.msgs.push(m); renderWin(w); }
    if (m.from !== me) {
      const focused = document.activeElement === w.el.querySelector('input') && !w.el.classList.contains('min');
      if (!focused) { unread[other] = (unread[other] || 0) + 1; refreshDock(); }
      toast(`💬 ${(w.info && w.info.name) || 'ข้อความใหม่'}: ${m.text.slice(0, 40)}`, 'info', 2500);
    }
  }
  function onDmHistory(m) { const w = wins.get(m.with); if (!w) return; w.msgs = m.msgs; w.loaded = true; if (m.info) w.info = m.info; renderWin(w); }

  // ---------- world chat ----------
  function addWorld(m) {
    const arr = wcMsgs[m.scope] || wcMsgs.local; arr.push(m); if (arr.length > 200) arr.shift();
    if (m.scope === wcScope) renderWorld(); else { const tab = $(`.wtab[data-scope="${m.scope}"]`); if (tab) tab.textContent = (m.scope === 'local' ? '📍 ใกล้ตัว' : '🌍 ทั่วโลก') + ' •'; }
  }
  function renderWorld() {
    const box = $('#wcMsgs'); box.innerHTML = '';
    for (const m of wcMsgs[wcScope]) { const d = document.createElement('div'); d.className = 'm' + (m.sys ? ' sys' : ''); d.innerHTML = m.sys ? esc(m.text) : `<b>${esc(m.from.name)}</b>: ${esc(m.text)}<span class="t">${fmtTime(m.ts)}</span>`; box.appendChild(d); }
    box.scrollTop = box.scrollHeight;
  }
  function sysMsg(text, scope = 'local') { addWorld({ sys: true, text, scope, ts: Date.now() }); }

  // ---------- big map ----------
  async function drawBigMap() {
    const c = $('#bigmap'); const x = c.getContext('2d');
    if (!mapCanvas) {
      try {
        const r = await fetch('/api/map'); const m = await r.json();
        const tiles = Uint8Array.from(atob(m.tiles), ch => ch.charCodeAt(0));
        mapCanvas = document.createElement('canvas'); mapCanvas.width = m.n; mapCanvas.height = m.n;
        const mx = mapCanvas.getContext('2d'); const img = mx.createImageData(m.n, m.n);
        const COL = { 0: [47, 111, 196], 12: [90, 174, 230], 1: [233, 215, 159], 2: [120, 200, 80], 3: [78, 158, 60], 4: [166, 116, 63], 5: [143, 143, 147], 6: [238, 243, 249], 11: [205, 185, 143] };
        for (let i = 0; i < tiles.length; i++) { const cc = COL[tiles[i]] || [255, 0, 255]; img.data[i * 4] = cc[0]; img.data[i * 4 + 1] = cc[1]; img.data[i * 4 + 2] = cc[2]; img.data[i * 4 + 3] = 255; }
        mx.putImageData(img, 0, 0);
      } catch (e) { return; }
    }
    x.imageSmoothingEnabled = false; x.drawImage(mapCanvas, 0, 0, c.width, c.height);
    const k = c.width / D.WORLD_SIZE;
    const mark = (wx, wy, color, r) => { x.fillStyle = color; x.beginPath(); x.arc(wx * k, wy * k, r, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 1; x.stroke(); };
    x.font = '16px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('★', D.SPAWN.x * k, D.SPAWN.y * k);
    for (const f of G().friendsPos) mark(f.x, f.y, '#4ade80', 4);
    if (G().me.home) x.fillText('🏠', G().me.home.x * k, G().me.home.y * k);
    mark(G().pos.x, G().pos.y, '#ffffff', 5);
  }

  // ---------- era panel ----------
  function refreshEra() {
    refreshLevel();
    const me = G().me; const lv = me.level || 1; const cur = D.eraOf(lv);
    const box = $('#eraList'); box.innerHTML = '';
    D.ERAS.forEach((e, i) => {
      const next = D.ERAS[i + 1]; const maxLv = next ? next.lv - 1 : 99;
      const div = document.createElement('div'); div.className = 'era' + (e === cur ? ' cur' : '') + (lv < e.lv ? ' locked' : '');
      const recipes = D.RECIPES.filter(r => r.lv >= e.lv && r.lv <= maxLv).sort((a, b) => a.lv - b.lv);
      const shopItems = Object.entries(D.SHOP.lv).filter(([k, l]) => l >= e.lv && l <= maxLv);
      const items = recipes.map(r => `<span class="${lv >= r.lv ? 'got' : ''}" title="เลเวล ${r.lv}">${icon(r.out)}${D.ITEMS[r.out].th}<small class="muted">Lv${r.lv}</small></span>`).join('') + shopItems.map(([k, l]) => `<span class="${lv >= l ? 'got' : ''}" title="ร้านค้า เลเวล ${l}">${icon(k)}${D.ITEMS[k].th}<small class="muted">🏪Lv${l}</small></span>`).join('');
      div.innerHTML = `<h4>${e.icon} ${e.th}<small>เลเวล ${e.lv}${next ? '-' + maxLv : '+'}${e === cur ? ' · คุณอยู่ที่นี่' : lv < e.lv ? ' · ยังไม่ปลดล็อก' : ' · ผ่านแล้ว'}</small></h4><p>${e.desc}</p><div class="items">${items}</div>`;
      box.appendChild(div);
    });
  }

  // ---------- sign ----------
  function onSign(m) {
    signPos = { x: m.x, y: m.y };
    $('#signText').textContent = m.txt || '(ป้ายว่าง)';
    $('#signEdit').classList.toggle('hidden', !m.own); $('#signInput').value = m.txt || '';
    openPanel('pSign');
  }

  // ---------- me updates ----------
  function onMe(fields) {
    if (fields.includes('needs') || fields.includes('hp')) refreshNeeds();
    if (fields.includes('coins')) refreshCoins();
    if (fields.includes('inv') || fields.includes('hotbar')) { refreshHotbar(); const p = currentPanel(); if (p) refreshPanel(p); }
    if (fields.includes('home')) toast('🏠 บ้านของคุณอยู่ที่นี่แล้ว กด H เพื่อกลับบ้าน', 'info');
    if (fields.includes('xp') || fields.includes('level')) refreshLevel();
    if (fields.includes('vehicle')) { refreshVehicle(); if (currentPanel() === 'pInv') refreshInv(); }
    if (fields.includes('look') || fields.includes('name')) refreshProfile();
  }

  // ---------- init ----------
  function init(opts) {
    $$('img.ui-ic[data-ic]').forEach(im => { im.src = SP.uiIcon(im.dataset.ic); });
    try { if (localStorage.getItem('kw_needs_collapsed') === '1') $('#hudNeeds').classList.add('collapsed'); } catch {}
    $('#needsToggle').onclick = () => { const c = $('#hudNeeds').classList.toggle('collapsed'); try { localStorage.setItem('kw_needs_collapsed', c ? '1' : '0'); } catch {} };
    $$('[data-close]').forEach(b => b.onclick = closePanels);
    $('#modal').addEventListener('mousedown', (e) => { if (e.target === $('#modal')) closePanels(); });
    $('#btnInv').onclick = () => toggle('pInv'); $('#btnCraft').onclick = () => toggle('pCraft'); $('#btnShop').onclick = () => toggle('pShop');
    $('#btnHome').onclick = () => Net.send({ t: 'home' }); $('#btnMap').onclick = () => toggle('pMap'); $('#btnFriends').onclick = () => toggle('pFriends'); $('#btnMenu').onclick = () => toggle('pMenu');
    $('#invTabs').onclick = (e) => { const b = e.target.closest('.tab'); if (!b) return; invCat = b.dataset.cat; $$('#invTabs .tab').forEach(t => t.classList.toggle('active', t === b)); refreshInv(); };
    $('#craftTabs').onclick = (e) => { const b = e.target.closest('.tab'); if (!b) return; craftCat = b.dataset.cat; $$('#craftTabs .tab').forEach(t => t.classList.toggle('active', t === b)); refreshCraft(); };
    $('#shopTabs').onclick = (e) => { const b = e.target.closest('.tab'); if (!b) return; shopMode = b.dataset.mode; $$('#shopTabs .tab').forEach(t => t.classList.toggle('active', t === b)); refreshShop(); };
    $('#friendSearch').onsubmit = (e) => { e.preventDefault(); const q = $('#friendQ').value.trim(); if (q) Net.send({ t: 'search_user', q }); };
    $('#mSetHome').onclick = () => { Net.send({ t: 'sethome' }); closePanels(); };
    $('#mHome').onclick = () => { Net.send({ t: 'home' }); closePanels(); };
    $('#mTown').onclick = () => { Net.send({ t: 'town' }); closePanels(); };
    $('#mLook').onclick = () => { closePanels(); opts.onLook(); };
    $('#mZoomIn').onclick = () => Game.setZoom(Game.getZoom() + 0.5); $('#mZoomOut').onclick = () => Game.setZoom(Game.getZoom() - 0.5);
    $('#mHelp').onclick = () => openPanel('pHelp');
    $('#btnEra').onclick = () => toggle('pEra'); $('#lvlBox').onclick = () => toggle('pEra');
    Net.on('levelup', (m) => {
      const t = toast(`🎉 LEVEL UP! เลเวล ${m.level} · โบนัส +${m.bonus} เหรียญ${m.unlocks.length ? ' · ปลดล็อก: ' + m.unlocks.join(', ') : ''}`, 'levelup', 7000);
      Game.float(`LEVEL ${m.level}!`, '#ffe08a');
      if (m.era) setTimeout(() => toast(`${m.eraIcon} เข้าสู่ ${m.era} แล้ว! เปิด 📜 เพื่อดูของใหม่`, 'levelup', 8000), 600);
      if (currentPanel()) refreshPanel(currentPanel());
    });
    $('#mLogout').onclick = () => { closePanels(); opts.onLogout(); };
    $('#signSave').onclick = () => { if (signPos) Net.send({ t: 'sign_text', x: signPos.x, y: signPos.y, text: $('#signInput').value }); closePanels(); };
    // world chat
    $$('.wtab').forEach(b => b.onclick = () => { wcScope = b.dataset.scope; $$('.wtab').forEach(t => t.classList.toggle('active', t === b)); b.textContent = b.dataset.scope === 'local' ? '📍 ใกล้ตัว' : '🌍 ทั่วโลก'; renderWorld(); });
    $('#wcToggle').onclick = () => { const wc = $('#worldChat'); if (innerWidth <= 1440) { wc.classList.toggle('expanded'); wc.classList.remove('collapsed'); $('#wcToggle').textContent = wc.classList.contains('expanded') ? '▾' : '▴'; } else { wc.classList.toggle('collapsed'); $('#wcToggle').textContent = wc.classList.contains('collapsed') ? '▴' : '▾'; } };
    $('#wcForm').onsubmit = (e) => { e.preventDefault(); const inp = $('#wcInput'); const text = inp.value.trim(); if (text) Net.send({ t: 'chat', scope: wcScope, text }); inp.value = ''; inp.blur(); if (innerWidth <= 1440) $('#worldChat').classList.remove('expanded'); };
    $('#wcInput').addEventListener('keydown', (e) => { if (e.key === 'Escape') e.target.blur(); e.stopPropagation(); });
    // dock
    $('#dockBtn').onclick = () => { $('#dockList').classList.toggle('hidden'); refreshDock(); };
    document.addEventListener('mousedown', (e) => { if (!e.target.closest('#dockBar')) $('#dockList').classList.add('hidden'); });
    // stop game hotkeys when typing inside modal inputs
    document.querySelectorAll('input, textarea').forEach(i => i.addEventListener('keydown', (e) => e.stopPropagation()));
    // net
    Net.on('toast', (m) => toast(m.text, m.kind));
    Net.on('friends', (m) => { friends = m.list; reqs = m.reqs || reqs; refreshFriends(); refreshDock(); for (const w of wins.values()) renderWin(w); });
    Net.on('friend_req', (m) => { reqs = m.reqs; refreshFriends(); refreshDock(); const t = toast(`👋 ${m.from.name} ส่งคำขอเป็นเพื่อน`, 'info', 6000); const b = document.createElement('button'); b.className = 'btn small primary'; b.textContent = 'ตอบรับ'; b.onclick = () => { Net.send({ t: 'friend_accept', id: m.from.id }); t.remove(); }; t.appendChild(b); });
    Net.on('presence', (m) => { const f = friendInfo(m.id); if (f) { f.online = m.online; refreshFriends(); refreshDock(); const w = wins.get(m.id); if (w) renderWin(w); sysMsg(`${f.name} ${m.online ? 'ออนไลน์แล้ว 🟢' : 'ออฟไลน์ ⚪'}`); } });
    Net.on('dm', onDm); Net.on('dm_history', onDmHistory);
    Net.on('search_result', (m) => { searchResults = m.list; if (!m.list.length) toast(`ไม่พบผู้ใช้ "${m.q}"`, 'error'); refreshFriends(); });
    Net.on('chat', (m) => addWorld(m));
    Net.on('sign', onSign);
    Net.on('open', (m) => { if (m.panel === 'shop') openPanel('pShop'); else if (m.panel === 'cook') openPanel('pCook'); });
    Net.on('faint', (m) => { toast(`คุณเป็นลม! ถูกพากลับ${m.where}${m.lost ? ` และทำเหรียญหาย ${m.lost}` : ''}`, 'error', 7000); Game.float('เป็นลม...', '#ff8080'); });
  }
  function start(init) {
    friends = init.friends || []; reqs = init.reqs || []; unread = init.me.unread || {};
    wcMsgs = { local: [], global: (init.global || []).map(m => ({ ...m, scope: 'global' })) };
    searchResults = [];
    for (const w of wins.values()) w.el.remove(); wins.clear();
    $('#game').classList.remove('hidden');
    refreshNeeds(); refreshCoins(); refreshProfile(); refreshHotbar(); refreshFriends(); refreshDock(); refreshClock(); renderWorld(); refreshLevel(); refreshVehicle();
    if (!started) { started = true; sysMsg(`ยินดีต้อนรับ ${init.me.name}! กด Enter เพื่อแชต · Esc เมนู · ❓ วิธีเล่นอยู่ในเมนู`); }
    clearInterval(clockTimer); clockTimer = setInterval(refreshClock, 1000);
    const total = Object.values(unread).reduce((a, b) => a + b, 0); if (total) toast(`💬 คุณมี ${total} ข้อความใหม่`, 'info');
  }
  function stop() { $('#game').classList.add('hidden'); clearInterval(clockTimer); closePanels(); }

  return { init, start, stop, toast, typing, hotkey, isFriend, onMe, refreshHotbar, refreshNeeds, refreshCoins, openPanel, closePanels, openChat, HAIR_TH, HAT_TH, avatarCanvas };
})();
