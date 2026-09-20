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
  let invCat = 'all', craftCat = 'all', craftEra = 'all', craftQ = '', craftShowLocked = false, craftCanOnly = false, craftLimit = 60, cookQ = '', cookShowLocked = false, shopMode = 'buy', searchResults = [], signPos = null, mapCanvas = null, clockTimer = null, started = false;
  const HAIR_TH = { short: 'สั้น', long: 'ยาว', spiky: 'ตั้ง', bob: 'บ๊อบ', bun: 'มวย', ponytail: 'หางม้า', curly: 'หยิก', bald: 'โล้น' };
  const HAT_TH = { none: 'ไม่ใส่', cap: 'แก๊ป', straw: 'ฟาง', beanie: 'บีนนี่', crown: 'มงกุฎ', flower: 'ดอกไม้' };

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function typing() { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); }
  function isFriend(id) { return friends.some(f => f.id === id); }
  function friendInfo(id) { return friends.find(f => f.id === id) || null; }
  function fmtTime(ts) { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function icon(id) { return `<img src="${SP.iconURL(id)}" alt="">`; }
  function avatarCanvas(look) { const c = document.createElement('canvas'); c.width = 16; c.height = 24; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(SP.char(look || {}, 'down', 0), 0, 0); return c; }

  function toast(text, kind = 'info', ms = 2800, ic) {
    const t = document.createElement('div'); t.className = 'toast ' + kind;
    if (ic) { const im = document.createElement('img'); im.className = 'ui-ic'; im.src = SP.uiIcon(ic); im.alt = ''; t.appendChild(im); }
    t.appendChild(document.createTextNode(text));
    const box = $('#toasts'); box.appendChild(t); while (box.children.length > 5) box.firstChild.remove();
    setTimeout(() => t.remove(), ms); return t;
  }

  // ---------- panels ----------
  function openPanel(id) { $$('.modal-panel').forEach(p => p.classList.add('hidden')); $('#modal').classList.remove('hidden'); $('#' + id).classList.remove('hidden'); refreshPanel(id); }
  function closePanels() { $('#modal').classList.add('hidden'); $$('.modal-panel').forEach(p => p.classList.add('hidden')); }
  function panelOpen() { return !$('#modal').classList.contains('hidden'); }
  function currentPanel() { const p = $$('.modal-panel').find(p => !p.classList.contains('hidden')); return panelOpen() && p ? p.id : null; }
  function toggle(id) { if (currentPanel() === id) closePanels(); else openPanel(id); }
  function refreshPanel(id) { const f = { pInv: refreshInv, pCraft: refreshCraft, pCook: refreshCook, pShop: refreshShop, pFriends: refreshFriends, pMap: drawBigMap, pEra: refreshEra, pClass: refreshClass, pFish: refreshFishdex }[id]; if (f) f(); }
  function hotkey(k, e) {
    switch (k) {
      case 'i': toggle('pInv'); break; case 'k': toggle('pCraft'); break; case 'b': toggle('pShop'); break; case 'j': toggle('pClass'); break;
      case 'm': toggle('pMap'); break; case 'f': toggle('pFriends'); break; case 'h': Net.send({ t: 'home' }); break; case 'l': toggle('pEra'); break; case 'n': toggle('pFish'); break;
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
    zt.innerHTML = `<div class="zl"><img class="ui-ic zl-ic" src="${SP.iconURL('hammer')}" alt=""> เครื่องมือ <small>6-0 - = · Tab</small></div>`;
    const rt = document.createElement('div'); rt.className = 'slots';
    D.TOOL_KINDS.forEach((k, i) => {
      const id = D.bestTool(me.inv, k.kind);
      const sl = document.createElement('div'); sl.className = 'slot tool' + (sel.zone === 'tool' && sel.i === i ? ' active' : '') + (id ? '' : ' empty');
      sl.innerHTML = (id ? icon(id) : `<span class="ph" style="background-image:url(${SP.iconURL(k.tiers[k.tiers.length - 1])})"></span>`) + `<span class="k">${i === 4 ? 0 : i === 5 ? '-' : i === 6 ? '=' : i + 6}</span>` + (id && (D.ITEMS[id].dmg || D.ITEMS[id].melee) ? '<span class="tier">★</span>' : '');
      sl.title = id ? `${D.ITEMS[id].th}${D.ITEMS[id].dmg ? ' (แรง +' + D.ITEMS[id].dmg + ')' : ''}${D.ITEMS[id].melee ? ' (โจมตี ' + D.ITEMS[id].melee + ')' : ''}` : `ยังไม่มี${k.th} (คราฟต์หรือซื้อที่ร้าน)`;
      sl.onclick = () => Game.selectTool(i);
      rt.appendChild(sl);
    });
    zt.appendChild(rt); hb.appendChild(zt);
    const div = document.createElement('div'); div.className = 'zdiv'; hb.appendChild(div);
    // ---- zone 2: items (player arranged) ----
    const zi = document.createElement('div'); zi.className = 'zone';
    zi.innerHTML = `<div class="zl"><img class="ui-ic zl-ic" src="${SP.uiIcon('bag')}" alt=""> อุปกรณ์ <small>1-5</small></div>`;
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
    $('#hotbarName').textContent = cur === 'hand' ? (sel.zone === 'tool' ? `ยังไม่มี${D.TOOL_KINDS[sel.i].th} · ใช้มือเปล่า` : 'มือเปล่า (คลิกขวา/E เพื่อโต้ตอบ)') : `${it.th}${it.cat === 'tool' ? '' : ' x' + (me.inv[cur] || 0)}`;
  }
  function refreshClock() {
    if (!G().me) return;
    const h = Game.hourOf(); const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    $('#clock').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const cic = h >= 6 && h < 18 ? 'sun' : (h >= 18 && h < 20) || (h >= 5 && h < 6) ? 'dusk' : 'moon'; const ce = $('#clockIcon'); if (ce.dataset.cur !== cic) { ce.dataset.cur = cic; ce.src = SP.uiIcon(cic); }
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
        if (it.cat === 'tool' || it.cat === 'weapon') { const ki = D.TOOL_KINDS.findIndex(k => k.tiers.includes(id)); if (ki >= 0) { Game.selectTool(ki); toast(`เลือก ${it.th} แล้ว (โซนเครื่องมือ)`, 'info', 1200); } return; }
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
    const me = G().me; const cost = cooking ? r.in : D.recipeCost(r, me.cls); const ok = Object.entries(cost).every(([k, q]) => (me.inv[k] || 0) >= q);
    const li = document.createElement('div'); li.className = 'li' + (ok ? '' : ' dis');
    const ings = Object.entries(cost).map(([k, q]) => `<span class="ing ${(me.inv[k] || 0) >= q ? '' : 'no'}">${icon(k)}${D.ITEMS[k].th} ${me.inv[k] || 0}/${q}</span>`).join('');
    const out = D.ITEMS[r.out];
    const locked = r.lv && (me.level || 1) < r.lv;
    if (locked) li.classList.add('locked');
    const extra = out.food ? ` <span class="muted">(อิ่ม+${out.food.h}${out.food.f ? ' สนุก+' + out.food.f : ''})</span>` : out.vehicle ? ` <span class="muted">(เร็ว x${D.VEHICLES[out.vehicle].speed})</span>` : out.melee ? ` <span class="muted">(โจมตี ${out.melee})</span>` : out.dmg ? ` <span class="muted">(แรง +${out.dmg})</span>` : (out.obj && D.OBJ[out.obj] && D.OBJ[out.obj].light) ? ' <span class="muted">(ให้แสง)</span>' : '';
    const eraTag = out.era ? `<span class="era-tag">${ERA_TH(out.era)}</span>` : '';
    li.innerHTML = `${icon(r.out)}<div class="info"><b>${out.th} x${r.n}${extra}${eraTag}</b>${ings}</div>`;
    if (locked) { const l = document.createElement('span'); l.className = 'lock'; l.innerHTML = `<img class="ui-ic" src="${SP.uiIcon('lock')}" alt=""> Lv ${r.lv} · ${D.eraOf(r.lv).th}`; li.appendChild(l); return li; }
    const b1 = document.createElement('button'); b1.className = 'btn small' + (ok ? ' primary' : ''); b1.textContent = cooking ? 'ทำ' : 'คราฟต์'; b1.disabled = !ok; b1.onclick = () => Net.send({ t: cooking ? 'cook' : 'craft', id: r.id, n: 1 });
    const b5 = document.createElement('button'); b5.className = 'btn small'; b5.textContent = 'x5'; b5.disabled = !Object.entries(cost).every(([k, q]) => (me.inv[k] || 0) >= q * 5); b5.onclick = () => Net.send({ t: cooking ? 'cook' : 'craft', id: r.id, n: 5 });
    li.appendChild(b1); li.appendChild(b5); return li;
  }
  const ERA_TH = (id) => (D.ERAS.find(e => e.id === id) || {}).th || id;
  function refreshCraft() {
    refreshLevel(); const me = G().me; const lv = me.level || 1;
    // era tabs
    const et = $('#craftEras'); et.innerHTML = '';
    for (const e of [{ id: 'all', th: 'ทุกยุค' }, ...D.ERAS]) { const b = document.createElement('button'); b.className = 'tab' + (craftEra === e.id ? ' active' : ''); b.textContent = e.th; b.onclick = () => { craftEra = e.id; craftLimit = 60; refreshCraft(); }; et.appendChild(b); }
    $$('#craftTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.cat === craftCat));
    const q = craftQ.toLowerCase();
    let rs = D.RECIPES.filter(r => (craftCat === 'all' || r.cat === craftCat) && (craftEra === 'all' || (D.ITEMS[r.out].era || 'stone') === craftEra) && (craftShowLocked || lv >= (r.lv || 1)) && (!q || D.ITEMS[r.out].th.toLowerCase().includes(q)));
    if (craftCanOnly) rs = rs.filter(r => Object.entries(D.recipeCost(r, me.cls)).every(([k, n]) => (me.inv[k] || 0) >= n));
    rs.sort((a, b) => ((a.lv > lv) - (b.lv > lv)) || (a.lv - b.lv) || a.out.localeCompare(b.out));
    $('#craftCount').textContent = `· ${rs.length}/${D.RECIPES.length} สูตร`;
    const l = $('#craftList'); l.innerHTML = '';
    rs.slice(0, craftLimit).forEach(r => l.appendChild(recipeRow(r, false)));
    if (rs.length > craftLimit) { const m = document.createElement('div'); m.className = 'more'; const b = document.createElement('button'); b.className = 'btn small'; b.textContent = `แสดงเพิ่ม (เหลืออีก ${rs.length - craftLimit})`; b.onclick = () => { craftLimit += 60; refreshCraft(); }; m.appendChild(b); l.appendChild(m); }
    if (!rs.length) l.innerHTML = '<div class="muted">ไม่พบสูตร ลองติ๊ก "แสดงที่ยังล็อก" หรือเปลี่ยนยุค/หมวด</div>';
  }
  function refreshCook() {
    const me = G().me; const lv = me.level || 1; const q = cookQ.toLowerCase();
    const rs = D.COOKING.filter(r => (cookShowLocked || lv >= (r.lv || 1)) && (!q || D.ITEMS[r.out].th.toLowerCase().includes(q))).sort((a, b) => ((a.lv > lv) - (b.lv > lv)) || ((a.lv || 1) - (b.lv || 1)));
    $('#cookCount').textContent = `· ${rs.length}/${D.COOKING.length} เมนู`;
    const l = $('#cookList'); l.innerHTML = ''; rs.forEach(r => l.appendChild(recipeRow(r, true)));
    if (!rs.length) l.innerHTML = '<div class="muted">ไม่พบเมนู</div>';
  }

  // ---------- shop ----------
  function refreshShop() {
    const me = G().me; const l = $('#shopList'); l.innerHTML = ''; refreshCoins();
    if (shopMode === 'buy') {
      for (const [id, price] of Object.entries(D.SHOP.buy)) {
        const it = D.ITEMS[id]; const li = document.createElement('div'); li.className = 'li';
        const desc = it.crop ? `ปลูกได้: ${D.CROPS[it.crop].th} (${D.CROPS[it.crop].stageSec * 4 / 60 | 0} นาที)` : it.food ? 'อาหาร หิว+' + it.food.h : it.vehicle ? `พาหนะ เร็ว x${D.VEHICLES[it.vehicle].speed}` : it.cat === 'tool' ? 'เครื่องมือ' : 'วัตถุดิบ';
        li.innerHTML = `${icon(id)}<div class="info"><b>${it.th}</b><span class="muted">${desc} · มี ${me.inv[id] || 0}</span></div><span class="price"><img class="ui-ic" src="${SP.uiIcon('coin')}" alt=""> ${price}</span>`;
        const needLv = D.SHOP.lv[id] || 0;
        if (needLv > (me.level || 1)) { li.classList.add('locked'); const lk = document.createElement('span'); lk.className = 'lock'; lk.innerHTML = `<img class="ui-ic" src="${SP.uiIcon('lock')}" alt=""> Lv ${needLv} · ${D.eraOf(needLv).th}`; li.appendChild(lk); l.appendChild(li); continue; }
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
        li.innerHTML = `${icon(id)}<div class="info"><b>${it.th}</b><span class="muted">มี ${n}</span></div><span class="price"><img class="ui-ic" src="${SP.uiIcon('coin')}" alt=""> ${price}/ชิ้น</span>`;
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
    for (const [label, fn, cls, ic] of actions) { const b = document.createElement('button'); b.className = 'btn small ' + (cls || ''); b.innerHTML = (ic ? `<img class="ui-ic" src="${SP.uiIcon(ic)}" alt="">` : '') + esc(label); b.onclick = fn; row.appendChild(b); }
    return row;
  }
  function refreshFriends() {
    const fr = $('#friendResults'); fr.innerHTML = '';
    for (const u of searchResults) {
      const isF = isFriend(u.id);
      fr.appendChild(friendRow(u, isF ? [['แชต', () => { closePanels(); openChat(u.id); }, '', 'chat']] : [['เพิ่มเพื่อน', () => Net.send({ t: 'friend_req', name: u.username }), 'primary', 'plus'], ['แชต', () => { closePanels(); openChat(u.id); }, '', 'chat']]));
    }
    const rq = $('#friendReqs'); rq.innerHTML = reqs.length ? '<h4>คำขอเป็นเพื่อน</h4>' : '';
    for (const r of reqs) rq.appendChild(friendRow(r, [['ตอบรับ', () => Net.send({ t: 'friend_accept', id: r.id }), 'primary', 'check'], ['✕', () => Net.send({ t: 'friend_decline', id: r.id })]]));
    const fl = $('#friendList'); fl.innerHTML = friends.length ? '' : '<div class="muted">ยังไม่มีเพื่อน ค้นหาชื่อผู้ใช้ด้านบนเพื่อเพิ่มเพื่อน</div>';
    const sorted = [...friends].sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
    for (const f of sorted) fl.appendChild(friendRow(f, [['แชต', () => { closePanels(); openChat(f.id); }, '', 'chat'], ['ไปหา', () => { Net.send({ t: 'visit', id: f.id }); closePanels(); }, '', 'go'], ['✕', () => { if (confirm(`ลบ ${f.name} ออกจากเพื่อน?`)) Net.send({ t: 'friend_remove', id: f.id }); }, 'danger']]));
    const badge = $('#badgeFriends'); if (reqs.length) { badge.textContent = reqs.length; badge.classList.remove('hidden'); } else badge.classList.add('hidden');
  }

  // ---------- messenger dock ----------
  function refreshDock() {
    const dl = $('#dockFriends'); dl.innerHTML = '';
    $('#dockOnline').textContent = `· ${friends.filter(f => f.online).length} ออนไลน์`;
    const list = [...friends];
    for (const id of Object.keys(unread)) { const w = wins.get(+id); if (!list.some(f => f.id === +id) && w && w.info) list.push(w.info); }
    list.sort((a, b) => ((unread[b.id] || 0) - (unread[a.id] || 0)) || (b.online - a.online) || a.name.localeCompare(b.name));
    if (!list.length) dl.innerHTML = '<div class="muted" style="padding:8px">ยังไม่มีเพื่อน กดปุ่ม "เพื่อน" (F) เพื่อค้นหาและเพิ่มเพื่อน</div>';
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
      el.innerHTML = `<div class="cw-head"><div class="fr"><div class="av"></div><div class="nm"><span class="name">...</span><small class="stat"></small></div></div><button class="go" title="วาร์ปไปหา"><img class="ui-ic" src="${SP.uiIcon('go')}" alt=""></button><button class="min" title="ย่อ">—</button><button class="cls" title="ปิด">✕</button></div><div class="cw-msgs"></div><form><input placeholder="Aa" maxlength="1000" autocomplete="off"><button type="submit" title="ส่ง">➤</button></form>`;
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
    if (!w.msgs.length) box.innerHTML = '<div class="muted" style="text-align:center;padding:12px">เริ่มบทสนทนาใหม่</div>';
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
      toast(`${(w.info && w.info.name) || 'ข้อความใหม่'}: ${m.text.slice(0, 40)}`, 'info', 2500, 'chat');
    }
  }
  function onDmHistory(m) { const w = wins.get(m.with); if (!w) return; w.msgs = m.msgs; w.loaded = true; if (m.info) w.info = m.info; renderWin(w); }

  // ---------- world chat ----------
  function addWorld(m) {
    const arr = wcMsgs[m.scope] || wcMsgs.local; arr.push(m); if (arr.length > 200) arr.shift();
    if (m.scope === wcScope) renderWorld(); else { const tab = $(`.wtab[data-scope="${m.scope}"]`); if (tab) tab.querySelector('span').textContent = (m.scope === 'local' ? 'ใกล้ตัว' : 'ทั่วโลก') + ' •'; }
  }
  function renderWorld() {
    const box = $('#wcMsgs'); box.innerHTML = '';
    for (const m of wcMsgs[wcScope]) { const d = document.createElement('div'); d.className = 'm' + (m.sys ? ' sys' : ''); d.innerHTML = m.sys ? esc(m.text) : `<b>${esc(m.from.name)}</b>: ${esc(m.text)}<span class="t">${fmtTime(m.ts)}</span>`; box.appendChild(d); }
    box.scrollTop = box.scrollHeight;
  }
  function sysMsg(text, scope = 'local') { addWorld({ sys: true, text, scope, ts: Date.now() }); }

  // ---------- big map ----------
  // zoom/pan state: scale = canvas px per world tile * (canvas/2048) ... we keep view as {z, cx, cy} in world coords
  const mapView = { z: 1, cx: D.WORLD_SIZE / 2, cy: D.WORLD_SIZE / 2, bound: false };
  const MAP_MINI = { 0: '#2f6fc4', 12: '#5aaee6', 1: '#e9d79f', 2: '#78c850', 3: '#4e9e3c', 4: '#a6743f', 5: '#8f8f93', 6: '#eef3f9', 7: '#7b5230', 8: '#4c321b', 9: '#c4914f', 10: '#b3b3ba', 11: '#cdb98f', 13: '#ececec', 14: '#c94a4a' };
  function mapPx() { const c = $('#bigmap'); return c.width / D.WORLD_SIZE * mapView.z; } // canvas px per tile
  function mapToWorld(px, py) { const c = $('#bigmap'); const k = mapPx(); return { x: mapView.cx + (px - c.width / 2) / k, y: mapView.cy + (py - c.height / 2) / k }; }
  function clampView() { const c = $('#bigmap'); const k = mapPx(); const half = c.width / 2 / k; mapView.cx = Math.max(half, Math.min(D.WORLD_SIZE - half, mapView.cx)); mapView.cy = Math.max(half, Math.min(D.WORLD_SIZE - half, mapView.cy)); if (mapView.z <= 1) { mapView.cx = D.WORLD_SIZE / 2; mapView.cy = D.WORLD_SIZE / 2; } }
  function setZoom(z, ax, ay) { // ax, ay: canvas anchor point to keep fixed
    const c = $('#bigmap'); const before = ax != null ? mapToWorld(ax, ay) : null;
    mapView.z = Math.max(1, Math.min(64, z));
    if (before) { const k = mapPx(); mapView.cx = before.x - (ax - c.width / 2) / k; mapView.cy = before.y - (ay - c.height / 2) / k; }
    clampView(); drawBigMap();
  }
  function bindMap() {
    const c = $('#bigmap'); mapView.bound = true;
    const pos = (ev) => { const r = c.getBoundingClientRect(); return { x: (ev.clientX - r.left) * c.width / r.width, y: (ev.clientY - r.top) * c.height / r.height }; };
    c.addEventListener('wheel', (e) => { e.preventDefault(); const p = pos(e); setZoom(mapView.z * (e.deltaY < 0 ? 1.25 : 0.8), p.x, p.y); }, { passive: false });
    let drag = null;
    c.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: mapView.cx, cy: mapView.cy, moved: false }; c.setPointerCapture(e.pointerId); c.classList.add('drag'); });
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      if (drag) { const k = mapPx() * r.width / c.width; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true; mapView.cx = drag.cx - dx / k; mapView.cy = drag.cy - dy / k; clampView(); drawBigMap(); }
      const p = pos(e); const w = mapToWorld(p.x, p.y); const tt = Game.tileAt(Math.floor(w.x), Math.floor(w.y)); const td = D.TILES[tt];
      $('#mapCoord').textContent = `(${Math.floor(w.x)}, ${Math.floor(w.y)})${td ? ' ' + td.th : ''} · ห่างจากคุณ ${Math.round(Math.hypot(w.x - G().pos.x, w.y - G().pos.y))} ช่อง`;
    });
    const up = () => { drag = null; c.classList.remove('drag'); };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('dblclick', (e) => { const p = pos(e); setZoom(mapView.z * 2, p.x, p.y); });
    $('#mapZoomIn').onclick = () => setZoom(mapView.z * 1.5, c.width / 2, c.height / 2);
    $('#mapZoomOut').onclick = () => setZoom(mapView.z / 1.5, c.width / 2, c.height / 2);
    $('#mapCenter').onclick = () => { mapView.cx = G().pos.x; mapView.cy = G().pos.y; if (mapView.z < 8) mapView.z = 8; clampView(); drawBigMap(); };
    $('#mapReset').onclick = () => { mapView.z = 1; clampView(); drawBigMap(); };
  }
  async function drawBigMap() {
    const c = $('#bigmap'); const x = c.getContext('2d');
    if (!mapView.bound) bindMap();
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
    clampView();
    const k = mapPx(); const W = c.width, H = c.height;
    const ox = W / 2 - mapView.cx * k, oy = H / 2 - mapView.cy * k; // canvas = ox + wx*k
    x.imageSmoothingEnabled = false; x.fillStyle = '#1c2a38'; x.fillRect(0, 0, W, H);
    x.drawImage(mapCanvas, ox, oy, D.WORLD_SIZE * k, D.WORLD_SIZE * k);
    // detail overlay from loaded chunks when zoomed in (>= 1px per tile)
    if (k >= 0.9) {
      const CH = D.CHUNK; const x0 = Math.floor((0 - ox) / k), y0 = Math.floor((0 - oy) / k), x1 = Math.ceil((W - ox) / k), y1 = Math.ceil((H - oy) / k);
      for (const ch of G().chunks.values()) {
        const bx = ch.cx * CH, by = ch.cy * CH; if (bx > x1 || by > y1 || bx + CH < x0 || by + CH < y0) continue;
        for (let j = 0; j < CH; j++) for (let i = 0; i < CH; i++) {
          const t = ch.tiles[j * CH + i]; const td = D.TILES[t]; let col = MAP_MINI[t] || (td && td.gen ? td.gen.a : '#f0f');
          const o = ch.objs[i + ',' + j];
          if (o) { if (['tree', 'pine', 'palm'].includes(o.t)) col = '#2e6b2a'; else if (o.t === 'rock' || o.t === 'bigrock') col = '#666'; else if (o.t === 'crop') col = '#e0a020'; else if (o.o || o.t === 'shop') col = '#f3dfb5'; else if (o.t === 'bush') col = '#3f8f3a'; }
          x.fillStyle = col; x.fillRect(ox + (bx + i) * k, oy + (by + j) * k, Math.ceil(k), Math.ceil(k));
        }
      }
      // NPCs + monsters (nearby only, from live state)
      for (const n of G().npcs.values()) { x.fillStyle = '#ffd166'; x.fillRect(ox + n.x * k - 2, oy + n.y * k - 2, 4, 4); }
      for (const m of G().mobs.values()) { x.fillStyle = '#ff5c5c'; x.fillRect(ox + m.x * k - 2, oy + m.y * k - 2, 4, 4); }
      // grid every chunk when very zoomed
      if (k >= 6) { x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 1; for (let gx = Math.floor(x0 / CH) * CH; gx <= x1; gx += CH) { x.beginPath(); x.moveTo(ox + gx * k, 0); x.lineTo(ox + gx * k, H); x.stroke(); } for (let gy = Math.floor(y0 / CH) * CH; gy <= y1; gy += CH) { x.beginPath(); x.moveTo(0, oy + gy * k); x.lineTo(W, oy + gy * k); x.stroke(); } }
    }
    // safe zone ring (town)
    x.strokeStyle = 'rgba(255,255,255,.5)'; x.setLineDash([4, 3]); x.lineWidth = 1; x.beginPath(); x.arc(ox + (D.SPAWN.x + 0.5) * k, oy + (D.SPAWN.y + 0.5) * k, 28 * k, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
    const mark = (wx, wy, color, r) => { x.fillStyle = color; x.beginPath(); x.arc(ox + wx * k, oy + wy * k, r, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 1; x.stroke(); };
    x.font = 'bold 18px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 3; x.strokeStyle = '#000'; x.strokeText('★', ox + (D.SPAWN.x + 0.5) * k, oy + (D.SPAWN.y + 0.5) * k); x.fillStyle = '#ffd166'; x.fillText('★', ox + (D.SPAWN.x + 0.5) * k, oy + (D.SPAWN.y + 0.5) * k);
    for (const f of G().friendsPos) mark(f.x, f.y, '#4ade80', 5);
    if (G().me.home) x.drawImage(SP.uiIconCanvas('home'), ox + (G().me.home.x + 0.5) * k - 10, oy + (G().me.home.y + 0.5) * k - 10, 20, 20);
    mark(G().pos.x, G().pos.y, '#ffffff', 6);
    // labels
    x.font = '12px ' + getComputedStyle(document.body).fontFamily; x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.7)'; x.fillStyle = '#fff';
    const label = (t, wx, wy) => { x.strokeText(t, ox + wx * k, oy + wy * k - 12); x.fillText(t, ox + wx * k, oy + wy * k - 12); };
    label('เมือง', D.SPAWN.x, D.SPAWN.y); label('คุณ', G().pos.x, G().pos.y);
    $('#mapZoomText').textContent = 'x' + (mapView.z < 10 ? mapView.z.toFixed(1) : Math.round(mapView.z));
    $('#mapInfo').textContent = `· โลก ${D.WORLD_SIZE}×${D.WORLD_SIZE} ช่อง · คุณอยู่ (${Math.floor(G().pos.x)}, ${Math.floor(G().pos.y)})`;
  }

  // ---------- skills bar ----------
  let skillTimer = null;
  function refreshSkills() {
    const me = G().me; const box = $('#skillSlots'); if (!box) return; box.innerHTML = '';
    const cls = me.cls && D.CLASSES[me.cls]; const sks = cls ? cls.skills : [];
    $('#skillZoneName').textContent = cls ? cls.th : 'สกิล';
    const now = Date.now(); const tg = G().targeting;
    for (let i = 0; i < 4; i++) {
      const sk = sks[i]; const sl = document.createElement('div'); sl.className = 'slot skill' + (sk ? '' : ' none');
      if (sk) {
        const until = G().cds[sk.id] || 0; const left = Math.max(0, until - now);
        sl.innerHTML = `<img class="sk" src="${SP.uiIcon(sk.icon)}" alt=""><span class="k">${D.SKILL_KEYS[i].toUpperCase()}</span><span class="en">${sk.energy}</span>` + (left > 0 ? `<span class="cd">${Math.ceil(left / 1000)}</span>` : '');
        sl.title = `${sk.th} (${D.SKILL_KEYS[i].toUpperCase()}) · ${sk.desc} · พลังงาน ${sk.energy} · คูลดาวน์ ${sk.cd} วิ${sk.range ? ' · ระยะ ' + sk.range : ''}`;
        if (me.needs.energy < sk.energy) sl.classList.add('noenergy');
        if (tg && tg.id === sk.id) sl.classList.add('targeting');
        sl.onclick = () => Game.triggerSkill(i, true);
      } else { sl.innerHTML = `<span class="k">${D.SKILL_KEYS[i].toUpperCase()}</span>`; sl.title = cls ? '' : 'ยังไม่มีอาชีพ กด J หรือคุยกับครูเพชรในเมือง'; sl.onclick = () => openPanel('pClass'); }
      box.appendChild(sl);
    }
    clearTimeout(skillTimer);
    if (sks.some(sk => (G().cds[sk.id] || 0) > now)) skillTimer = setTimeout(refreshSkills, 500);
  }
  let classFam = null, classQ = '';
  function refreshClass() {
    const me = G().me; const box = $('#classList'); box.innerHTML = '';
    const lv = me.level || 1; const cur = me.cls ? D.CLASSES[me.cls] : null;
    $('#classHint').textContent = cur ? `อาชีพปัจจุบัน: ${cur.th} (สาย${cur.family}) · เปลี่ยนอาชีพใช้ ${D.CLASS_CHANGE_COST} เหรียญ (คุณมี ${me.coins}) · มีทั้งหมด ${D.CLASS_LIST.length} อาชีพ` : `เลือกอาชีพครั้งแรกฟรี · มี ${D.CLASS_LIST.length} อาชีพ 10 สาย แต่ละอาชีพมีโบนัสติดตัวและสกิล 4 อัน (Z X C V) · อาชีพขั้นสูงต้องถึงเลเวลที่กำหนด`;
    if (!classFam) classFam = cur ? cur.family : D.FAMILIES[0];
    const tabs = document.createElement('div'); tabs.className = 'tabs small';
    for (const f of D.FAMILIES) { const b = document.createElement('button'); b.className = 'tab' + (f === classFam ? ' active' : ''); const n = D.CLASS_LIST.filter(c => c.family === f).length; const open = D.CLASS_LIST.filter(c => c.family === f && lv >= c.lv).length; b.textContent = `${f} ${open}/${n}`; b.onclick = () => { classFam = f; refreshClass(); }; tabs.appendChild(b); }
    box.appendChild(tabs);
    const search = document.createElement('input'); search.placeholder = 'ค้นหาอาชีพหรือสกิล...'; search.value = classQ; search.style.cssText = 'width:100%;margin-bottom:8px'; search.oninput = () => { classQ = search.value.trim(); renderList(); };
    box.appendChild(search);
    const list = document.createElement('div'); box.appendChild(list);
    function renderList() {
      list.innerHTML = '';
      const q = classQ.toLowerCase();
      const items = D.CLASS_LIST.filter(c => q ? (c.th.includes(q) || c.desc.includes(q) || c.skills.some(sk => sk.th.includes(q) || sk.desc.includes(q))) : c.family === classFam).sort((a, b) => a.lv - b.lv);
      for (const c of items) {
        const locked = lv < c.lv;
        const div = document.createElement('div'); div.className = 'cls' + (me.cls === c.id ? ' cur' : '') + (locked ? ' locked' : '');
        div.innerHTML = `<img class="ci" src="${SP.uiIcon(c.icon)}" alt=""><div class="cb"><h4>${c.th}<small>สาย${c.family} · Lv ${c.lv}${me.cls === c.id ? ' · อาชีพของคุณ' : locked ? ' · ยังไม่ปลดล็อก' : ''}</small></h4><p>${c.desc}</p><ul>${c.passives.map(x => `<li>${x.th}</li>`).join('')}</ul><div class="sks">${c.skills.map((sk, i) => `<div class="sk"><img src="${SP.uiIcon(sk.icon)}" alt=""><div><b>${sk.th}</b>${sk.desc}<br><span class="muted">พลังงาน ${sk.energy} · คูลดาวน์ ${sk.cd} วิ${sk.range ? ' · ระยะ ' + sk.range : ''}</span></div><span class="key">${D.SKILL_KEYS[i].toUpperCase()}</span></div>`).join('')}</div></div>`;
        const b = document.createElement('button'); b.className = 'btn ' + (me.cls === c.id || locked ? '' : 'primary');
        b.innerHTML = me.cls === c.id ? 'อาชีพปัจจุบัน' : locked ? `<img class="ui-ic" src="${SP.uiIcon('lock')}" alt=""> Lv ${c.lv}` : me.cls ? `เปลี่ยน (${D.CLASS_CHANGE_COST})` : 'เลือกอาชีพนี้';
        b.disabled = me.cls === c.id || locked;
        b.onclick = () => { if (me.cls && !confirm(`เปลี่ยนเป็น${c.th}? ใช้ ${D.CLASS_CHANGE_COST} เหรียญ`)) return; Net.send({ t: 'class', id: c.id }); };
        div.appendChild(b); list.appendChild(div);
      }
      if (!items.length) list.innerHTML = '<div class="muted">ไม่พบอาชีพ</div>';
    }
    renderList();
  }
  // ---------- buffs ----------
  const BUFF_TH = { speed: 'เร็ว', dmg: 'แรง', def: 'ป้องกัน', regen: 'ฟื้นเลือด', xp: 'XP', loot: 'ดรอป', shield: 'เกราะ', cook: 'ครัวพกพา', light: 'แสง', yield: 'ผลผลิต' };
  let buffTimer = null;
  function refreshBuffs() {
    const box = $('#buffTag'); if (!box) return; const b = G().buffs || {}; const now = Date.now();
    const list = Object.entries(b).filter(([k, v]) => v.until > now);
    if (!list.length) { box.classList.add('hidden'); clearTimeout(buffTimer); return; }
    box.classList.remove('hidden');
    box.innerHTML = list.map(([k, v]) => `<span class="bf"><b>${BUFF_TH[k] || k}</b>${k === 'shield' ? ' ' + Math.round(v.val) : ''} <small>${Math.ceil((v.until - now) / 1000)}s</small></span>`).join('');
    clearTimeout(buffTimer); buffTimer = setTimeout(refreshBuffs, 1000);
  }
  // ---------- NPC dialog ----------
  function showDialog(m) {
    const d = $('#dialog'); d.classList.remove('hidden');
    const npc = G().npcs.get(m.npc);
    const av = $('#dgAv'); av.innerHTML = ''; if (npc) av.appendChild(avatarCanvas(npc.look));
    $('#dgName').textContent = m.name; $('#dgRole').textContent = m.role; $('#dgText').textContent = m.text;
    const ops = $('#dgOpts'); ops.innerHTML = '';
    for (const o of m.options) { const b = document.createElement('button'); b.className = 'btn small' + (o.id === 'bye' ? '' : ' primary'); b.textContent = o.label; b.onclick = () => { if (o.id === 'bye') return hideDialog(); Net.send({ t: 'dialog', npc: m.npc, opt: o.id }); if (o.id !== 'more') hideDialog(); }; ops.appendChild(b); }
  }
  function hideDialog() { $('#dialog').classList.add('hidden'); }

  // ---------- creature book (fish + wildlife) ----------
  let bookGroup = 'fish', fishFilter = 'all', fishQ = '';
  function refreshFishdex() {
    const me = G().me; const dex = me.fishdex || {}; const best = me.bestiary || {}; const box = $('#fishList'); box.innerHTML = '';
    const caughtF = D.FISH_LIST.filter(f => dex[f.id]).length;
    const groups = [['fish', 'ปลา', D.FISH_LIST.length, caughtF]];
    for (const g of ['land', 'bird', 'dino']) { const list = D.ANIMAL_LIST.filter(a => a.group === g); groups.push([g, D.GROUP_TH[g], list.length, list.filter(a => best[a.id]).length]); }
    groups.push(['slime', 'สไลม์', 3, [0, 1, 2].filter(v => best['slime' + v]).length]);
    const totalAll = groups.reduce((a, g) => a + g[2], 0), gotAll = groups.reduce((a, g) => a + g[3], 0);
    $('#fishCount').textContent = `· พบแล้ว ${gotAll}/${totalAll} ชนิด`;
    const gt = $('#bookGroups'); gt.innerHTML = '';
    for (const [id, th, n, got] of groups) { const b = document.createElement('button'); b.className = 'tab' + (bookGroup === id ? ' active' : ''); b.textContent = `${th} ${got}/${n}`; b.onclick = () => { bookGroup = id; fishFilter = 'all'; refreshFishdex(); }; gt.appendChild(b); }
    const tabs = $('#fishTabs'); tabs.innerHTML = '';
    const filters = bookGroup === 'fish' ? [['all', 'ทั้งหมด'], ['river', 'น้ำจืด'], ['sea', 'ทะเล'], ['any', 'พิเศษ'], ['night', 'กลางคืน'], ['caught', 'พบแล้ว'], ['rare', 'หายาก+']] : [['all', 'ทั้งหมด'], ['passive', 'เชื่อง'], ['neutral', 'สู้กลับ'], ['hostile', 'ดุร้าย'], ['night', 'กลางคืน'], ['caught', 'พบแล้ว'], ['rare', 'หายาก+']];
    for (const [id, th] of filters) { const b = document.createElement('button'); b.className = 'tab' + (fishFilter === id ? ' active' : ''); b.textContent = th; b.onclick = () => { fishFilter = id; refreshFishdex(); }; tabs.appendChild(b); }
    const q = fishQ.toLowerCase();
    if (bookGroup === 'fish') {
      const total = Object.values(dex).reduce((a, r) => a + r.n, 0);
      $('#fishHint').textContent = `ตกปลา: เลือกเบ็ด (ปุ่ม =) คลิกบนน้ำในระยะ 4 ช่อง รอเครื่องหมาย ! แล้วคลิก/Space · ใส่เหยื่อ (เบอร์รี่+เห็ด) ปลากินไว · น้ำตื้น = น้ำจืด ทะเลลึก = ปลาทะเล · บางชนิดเฉพาะกลางคืน · จับแล้ว ${total} ตัว`;
      const list = D.FISH_LIST.filter(f => (fishFilter === 'all' || (fishFilter === 'night' ? f.night : fishFilter === 'caught' ? dex[f.id] : fishFilter === 'rare' ? f.rarity >= 3 : f.habitat === fishFilter)) && (!q || f.th.includes(q))).sort((a, b) => a.rarity - b.rarity || a.lv - b.lv);
      for (const f of list) {
        const r = dex[f.id]; const div = document.createElement('div'); div.className = 'fish' + (r ? ' got' : '');
        div.innerHTML = `<img src="${SP.iconURL(f.id)}" alt=""><div class="fb"><b>${r ? f.th : '???'}</b><span class="rar" style="color:${D.RARITY_COLOR[f.rarity]}">${D.RARITY_TH[f.rarity]}</span><small>${{ river: 'น้ำจืด', sea: 'ทะเล', any: 'ทุกแหล่งน้ำ' }[f.habitat]}${f.night ? ' · กลางคืน' : ''} · ${f.minCm}-${f.maxCm} ซม. · ขาย ${f.price}${f.lv > 1 ? ' · Lv ' + f.lv : ''}</small>${r ? `<small class="rec">จับได้ ${r.n} ตัว · สถิติ ${r.max} ซม.</small>` : ''}</div>`;
        box.appendChild(div);
      }
      if (!list.length) box.innerHTML = '<div class="muted">ไม่พบ</div>';
      return;
    }
    if (bookGroup === 'slime') {
      $('#fishHint').textContent = 'สไลม์ออกตอนกลางคืนในป่านอกเมือง ล่าได้เมือกสไลม์ แร่ และแก่นเวท';
      D.MOBS.slime.variants.forEach((v, i) => { const n = best['slime' + i]; const div = document.createElement('div'); div.className = 'fish' + (n ? ' got' : ''); div.innerHTML = `<img src="${SP.mob('slime', i, 0, false).toDataURL()}" alt=""><div class="fb"><b>${n ? v.th : '???'}</b><small>เลือด ${v.hp} · โจมตี ${v.dmg} · XP ${v.xp}</small>${n ? `<small class="rec">ล่าแล้ว ${n} ตัว</small>` : ''}</div>`; box.appendChild(div); });
      return;
    }
    const BIO_TH = { grass: 'ทุ่งหญ้า', forest: 'ป่า', sand: 'ชายหาด/ทะเลทราย', stone: 'ภูเขา', snow: 'หิมะ', water: 'ริมน้ำ', dino: 'ดินแดนไดโนเสาร์' };
    $('#fishHint').textContent = bookGroup === 'dino' ? 'ไดโนเสาร์อยู่ในดินแดนไดโนเสาร์: ไกลจากเมืองเกิน 300 ช่อง หรือเขตภูเขา/หิมะที่ไกลเกิน 140 ช่อง · ตัวใหญ่แข็งแรงมาก ควรมีเพื่อนและเลเวลสูง · ล่าได้เนื้อไดโนเสาร์ ฟัน ไข่ กระดูก' : bookGroup === 'bird' ? 'นกส่วนใหญ่บินอยู่ ต้องใช้สกิลระยะไกลหรือรอให้ลงมาใกล้ · ล่าได้ขนนก เนื้อสัตว์ปีก ไข่' : 'สัตว์เชื่องจะวิ่งหนีเมื่อถูกตี สัตว์สู้กลับจะโจมตีคืน สัตว์ดุร้ายไล่ล่าคุณเอง · ล่าได้เนื้อ หนัง ขน เขา งา นม น้ำผึ้ง เอาไปทำอาหารและวัสดุ';
    const list = D.ANIMAL_LIST.filter(a => a.group === bookGroup && (fishFilter === 'all' || (fishFilter === 'night' ? a.when !== 0 : fishFilter === 'caught' ? best[a.id] : fishFilter === 'rare' ? a.rarity >= 3 : a.behavior === fishFilter)) && (!q || a.th.includes(q))).sort((a, b) => a.rarity - b.rarity || a.lv - b.lv);
    for (const a of list) {
      const n = best[a.id]; const div = document.createElement('div'); div.className = 'fish' + (n ? ' got' : '');
      const bc = a.behavior === 'hostile' ? '#e04848' : a.behavior === 'neutral' ? '#d9822b' : '#43aa8b';
      div.innerHTML = `<img src="${SP.animal(a.id, 0, false).toDataURL()}" alt=""><div class="fb"><b>${n ? a.th : '???'}</b><span class="rar" style="color:${D.RARITY_COLOR[a.rarity]}">${D.RARITY_TH[a.rarity]}</span> <span class="rar" style="color:${bc}">${{ passive: 'เชื่อง', neutral: 'สู้กลับ', hostile: 'ดุร้าย' }[a.behavior]}</span><small>${a.biomes.map(b => BIO_TH[b]).join('/')}${a.when === 1 ? ' · กลางคืน' : a.when === 2 ? ' · ทั้งวัน' : ''} · เลือด ${a.hp}${a.dmg ? ' · โจมตี ' + a.dmg : ''}${a.lv > 1 ? ' · Lv ' + a.lv : ''}</small><small>ดรอป: ${a.drops.map(d => D.ITEMS[d[0]].th).join(' ')}</small>${n ? `<small class="rec">ล่าแล้ว ${n} ตัว</small>` : ''}</div>`;
      box.appendChild(div);
    }
    if (!list.length) box.innerHTML = '<div class="muted">ไม่พบ</div>';
  }

  // ---------- era panel ----------
  const CAT_TH = { mat: 'วัสดุ', build: 'พื้น ผนัง ประตู แสงไฟ', furn: 'เฟอร์นิเจอร์และของตกแต่ง', tool: 'เครื่องมือ', weapon: 'อาวุธ', food: 'อาหาร', vehicle: 'พาหนะ', seed: 'เมล็ด' };
  function refreshEra() {
    refreshLevel();
    const me = G().me; const lv = me.level || 1; const cur = D.eraOf(lv);
    const box = $('#eraList'); box.innerHTML = '';
    const lvOfItem = (id) => { const r = D.RECIPES.find(r => r.out === id); if (r) return r.lv; const c = D.COOKING.find(r => r.out === id); if (c) return c.lv || 1; return D.SHOP.lv[id] || 1; };
    D.ERAS.forEach((e, i) => {
      const next = D.ERAS[i + 1]; const maxLv = next ? next.lv - 1 : 99;
      const div = document.createElement('div'); div.className = 'era' + (e === cur ? ' cur' : '') + (lv < e.lv ? ' locked' : '');
      const ids = [...(D.ERA_ITEMS[e.id] || [])];
      // base (hand-made) recipes and shop items whose level falls in this era
      for (const r of D.RECIPES) if (!D.ITEMS[r.out].era && r.lv >= e.lv && r.lv <= maxLv && !ids.includes(r.out)) ids.push(r.out);
      for (const [k, l] of Object.entries(D.SHOP.lv)) if (l >= e.lv && l <= maxLv && !ids.includes(k)) ids.push(k);
      const groups = {}; for (const id of ids) { const c = D.ITEMS[id].cat; (groups[c] = groups[c] || []).push(id); }
      const unlocked = ids.filter(id => lv >= lvOfItem(id)).length;
      let html = `<h4><img class="ui-ic" src="${SP.uiIcon(e.icon)}" alt=""> ${e.th}<small>เลเวล ${e.lv}${next ? '-' + maxLv : '+'}${e === cur ? ' · คุณอยู่ที่นี่' : lv < e.lv ? ' · ยังไม่ปลดล็อก' : ' · ผ่านแล้ว'} · ปลดล็อกแล้ว ${unlocked}/${ids.length} ชิ้น</small></h4><p>${e.desc}</p>`;
      for (const cat of ['mat', 'build', 'furn', 'tool', 'weapon', 'food', 'vehicle', 'seed']) {
        if (!groups[cat]) continue;
        html += `<div class="cat">${CAT_TH[cat] || cat} (${groups[cat].length})</div><div class="items">` + groups[cat].sort((a, b) => lvOfItem(a) - lvOfItem(b)).map(id => { const l = lvOfItem(id); return `<span class="${lv >= l ? 'got' : ''}" title="${D.ITEMS[id].th} · เลเวล ${l}">${icon(id)}${D.ITEMS[id].th}<small class="muted">Lv${l}</small></span>`; }).join('') + '</div>';
      }
      div.innerHTML = html; box.appendChild(div);
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
    if (fields.includes('home')) toast('บ้านของคุณอยู่ที่นี่แล้ว กด H เพื่อกลับบ้าน', 'info', 2800, 'home');
    if (fields.includes('xp') || fields.includes('level')) { refreshLevel(); if (fields.includes('level') && currentPanel() === 'pClass') refreshClass(); }
    if (fields.includes('vehicle')) { refreshVehicle(); if (currentPanel() === 'pInv') refreshInv(); }
    if ((fields.includes('fishdex') || fields.includes('bestiary')) && currentPanel() === 'pFish') refreshFishdex();
    if (fields.includes('cls')) { refreshSkills(); if (currentPanel() === 'pClass') refreshClass(); if (currentPanel() === 'pCraft') refreshCraft(); }
    if (fields.includes('needs')) refreshSkills();
    if (fields.includes('look') || fields.includes('name')) refreshProfile();
  }

  // ---------- init ----------
  function init(opts) {
    $$('img.ui-ic[data-ic]').forEach(im => { im.src = SP.uiIcon(im.dataset.ic); });
    $$('img.ui-ic[data-item]').forEach(im => { im.src = SP.iconURL(im.dataset.item); });
    try { if (localStorage.getItem('kw_needs_collapsed') === '1') $('#hudNeeds').classList.add('collapsed'); } catch {}
    $('#needsToggle').onclick = () => { const c = $('#hudNeeds').classList.toggle('collapsed'); try { localStorage.setItem('kw_needs_collapsed', c ? '1' : '0'); } catch {} };
    $$('[data-close]').forEach(b => b.onclick = closePanels);
    $('#modal').addEventListener('mousedown', (e) => { if (e.target === $('#modal')) closePanels(); });
    $('#btnInv').onclick = () => toggle('pInv'); $('#btnCraft').onclick = () => toggle('pCraft'); $('#btnShop').onclick = () => toggle('pShop');
    $('#btnHome').onclick = () => Net.send({ t: 'home' }); $('#btnMap').onclick = () => toggle('pMap'); $('#btnFriends').onclick = () => toggle('pFriends'); $('#btnMenu').onclick = () => toggle('pMenu');
    $('#invTabs').onclick = (e) => { const b = e.target.closest('.tab'); if (!b) return; invCat = b.dataset.cat; $$('#invTabs .tab').forEach(t => t.classList.toggle('active', t === b)); refreshInv(); };
    $('#craftTabs').onclick = (e) => { const b = e.target.closest('.tab'); if (!b) return; craftCat = b.dataset.cat; craftLimit = 60; refreshCraft(); };
    $('#craftQ').oninput = () => { craftQ = $('#craftQ').value.trim(); craftLimit = 60; refreshCraft(); };
    $('#craftLocked').onchange = () => { craftShowLocked = $('#craftLocked').checked; refreshCraft(); };
    $('#craftCan').onchange = () => { craftCanOnly = $('#craftCan').checked; refreshCraft(); };
    $('#cookQ').oninput = () => { cookQ = $('#cookQ').value.trim(); refreshCook(); };
    $('#fishQ').oninput = () => { fishQ = $('#fishQ').value.trim(); refreshFishdex(); };
    $('#btnFish').onclick = () => toggle('pFish');
    $('#cookLocked').onchange = () => { cookShowLocked = $('#cookLocked').checked; refreshCook(); };
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
      const t = toast(`LEVEL UP! เลเวล ${m.level} · โบนัส +${m.bonus} เหรียญ${m.unlocks.length ? ' · ปลดล็อก: ' + m.unlocks.join(', ') : ''}`, 'levelup', 7000);
      Game.float(`LEVEL ${m.level}!`, '#ffe08a');
      if (m.era) setTimeout(() => toast(`เข้าสู่ ${m.era} แล้ว! กด L เพื่อดูของใหม่`, 'levelup', 8000, m.eraIcon), 600);
      if (currentPanel()) refreshPanel(currentPanel());
    });
    $('#mLogout').onclick = () => { closePanels(); opts.onLogout(); };
    $('#signSave').onclick = () => { if (signPos) Net.send({ t: 'sign_text', x: signPos.x, y: signPos.y, text: $('#signInput').value }); closePanels(); };
    // world chat
    $$('.wtab').forEach(b => b.onclick = () => { wcScope = b.dataset.scope; $$('.wtab').forEach(t => t.classList.toggle('active', t === b)); b.querySelector('span').textContent = b.dataset.scope === 'local' ? 'ใกล้ตัว' : 'ทั่วโลก'; renderWorld(); });
    $('#wcToggle').onclick = () => { const wc = $('#worldChat'); if (innerWidth <= 1750) { wc.classList.toggle('expanded'); wc.classList.remove('collapsed'); $('#wcToggle').textContent = wc.classList.contains('expanded') ? '▾' : '▴'; } else { wc.classList.toggle('collapsed'); $('#wcToggle').textContent = wc.classList.contains('collapsed') ? '▴' : '▾'; } };
    $('#wcForm').onsubmit = (e) => { e.preventDefault(); const inp = $('#wcInput'); const text = inp.value.trim(); if (text) Net.send({ t: 'chat', scope: wcScope, text }); inp.value = ''; inp.blur(); if (innerWidth <= 1750) $('#worldChat').classList.remove('expanded'); };
    $('#wcInput').addEventListener('keydown', (e) => { if (e.key === 'Escape') e.target.blur(); e.stopPropagation(); });
    // dock
    $('#dockBtn').onclick = () => { $('#dockList').classList.toggle('hidden'); refreshDock(); };
    document.addEventListener('mousedown', (e) => { if (!e.target.closest('#dockBar')) $('#dockList').classList.add('hidden'); });
    // stop game hotkeys when typing inside modal inputs
    document.querySelectorAll('input, textarea').forEach(i => i.addEventListener('keydown', (e) => e.stopPropagation()));
    // net
    Net.on('toast', (m) => toast(m.text, m.kind, undefined, m.ic));
    Net.on('friends', (m) => { friends = m.list; reqs = m.reqs || reqs; refreshFriends(); refreshDock(); for (const w of wins.values()) renderWin(w); });
    Net.on('friend_req', (m) => { reqs = m.reqs; refreshFriends(); refreshDock(); const t = toast(`${m.from.name} ส่งคำขอเป็นเพื่อน`, 'info', 6000, 'friends'); const b = document.createElement('button'); b.className = 'btn small primary'; b.textContent = 'ตอบรับ'; b.onclick = () => { Net.send({ t: 'friend_accept', id: m.from.id }); t.remove(); }; t.appendChild(b); });
    Net.on('presence', (m) => { const f = friendInfo(m.id); if (f) { f.online = m.online; refreshFriends(); refreshDock(); const w = wins.get(m.id); if (w) renderWin(w); sysMsg(`${f.name} ${m.online ? 'ออนไลน์แล้ว' : 'ออฟไลน์'}`); } });
    Net.on('dm', onDm); Net.on('dm_history', onDmHistory);
    Net.on('search_result', (m) => { searchResults = m.list; if (!m.list.length) toast(`ไม่พบผู้ใช้ "${m.q}"`, 'error'); refreshFriends(); });
    Net.on('chat', (m) => addWorld(m));
    Net.on('sign', onSign);
    Net.on('open', (m) => { if (m.panel === 'shop') openPanel('pShop'); else if (m.panel === 'cook') openPanel('pCook'); else if (m.panel === 'class') openPanel('pClass'); });
    Net.on('dialog', showDialog);
    Net.on('buffs', (m) => { G().buffs = m.b || {}; refreshBuffs(); });
    $('#dgClose').onclick = hideDialog;

    Net.on('faint', (m) => { toast(`คุณเป็นลม! ถูกพากลับ${m.where}${m.lost ? ` และทำเหรียญหาย ${m.lost}` : ''}`, 'error', 7000); Game.float('เป็นลม...', '#ff8080'); });
  }
  function start(init) {
    friends = init.friends || []; reqs = init.reqs || []; unread = init.me.unread || {};
    wcMsgs = { local: [], global: (init.global || []).map(m => ({ ...m, scope: 'global' })) };
    searchResults = [];
    for (const w of wins.values()) w.el.remove(); wins.clear();
    $('#game').classList.remove('hidden');
    G().buffs = {}; classFam = null; classQ = '';
    refreshNeeds(); refreshCoins(); refreshProfile(); refreshHotbar(); refreshFriends(); refreshDock(); refreshClock(); renderWorld(); refreshLevel(); refreshVehicle(); refreshSkills(); refreshBuffs(); hideDialog();
    if (!started) { started = true; sysMsg(`ยินดีต้อนรับ ${init.me.name}! กด Enter เพื่อแชต · Esc เมนู · "วิธีเล่น" อยู่ในเมนู`); }
    clearInterval(clockTimer); clockTimer = setInterval(refreshClock, 1000);
    const total = Object.values(unread).reduce((a, b) => a + b, 0); if (total) toast(`คุณมี ${total} ข้อความใหม่`, 'info', 2800, 'chat');
  }
  function stop() { $('#game').classList.add('hidden'); clearInterval(clockTimer); closePanels(); }

  return { init, start, stop, toast, typing, hotkey, isFriend, onMe, refreshHotbar, refreshNeeds, refreshCoins, refreshSkills, openPanel, closePanels, openChat, HAIR_TH, HAT_TH, avatarCanvas };
})();
