/* Bootstrap: auth screen, character creator, connection lifecycle */
(() => {
  const D = window.DEFS, SP = window.Sprites;
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  let token = localStorage.getItem('ow_token');
  let mode = 'login', inGame = false;

  function show(id) { ['auth', 'creator', 'game'].forEach(s => $('#' + s).classList.toggle('hidden', s !== id)); }

  // ---------- auth background (animated pixel scene) ----------
  const bgc = $('#authbg'); const bgx = bgc.getContext('2d');
  let bgSeed = Math.floor(Math.random() * 1000), bgW = 0, bgH = 0, bgObjs = [];
  function bgResize() { bgW = bgc.width = Math.ceil(innerWidth / 2); bgH = bgc.height = Math.ceil(innerHeight / 2); bgObjs = []; const cols = Math.ceil(bgW / 16) + 1, rows = Math.ceil(bgH / 16) + 2; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const r = SP.hash(i, j, bgSeed); if (r < 0.06) bgObjs.push({ i, j, t: r < 0.03 ? 'tree' : r < 0.045 ? 'pine' : r < 0.052 ? 'bush' : 'flower', v: Math.floor(r * 100) % 3 }); } }
  function bgDraw(now) {
    if ($('#auth').classList.contains('hidden')) { requestAnimationFrame(bgDraw); return; }
    bgx.imageSmoothingEnabled = false;
    const cols = Math.ceil(bgW / 16) + 1, rows = Math.ceil(bgH / 16) + 2;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const r = SP.hash(i, j, bgSeed + 1); const t = (j > rows * 0.8) ? (j > rows * 0.88 ? 0 : 1) : r < 0.3 ? 3 : 2; bgx.drawImage(SP.tile(t, Math.floor(r * 4), Math.floor(now / 600) % 2), i * 16, j * 16); }
    for (const o of bgObjs) { const s = SP.obj({ t: o.t, v: o.v, b: 1 }, 0); if (o.j < rows * 0.78) bgx.drawImage(s, o.i * 16, o.j * 16 - (s.height - 16)); }
    // walking character
    const look = { skin: '#f1c27d', hair: '#3b2a1a', hairStyle: 'short', shirt: '#e63946', pants: '#264653', eyes: '#2b2b2b', hat: 'straw' };
    const px = ((now / 40) % (bgW + 40)) - 20; bgx.drawImage(SP.char(look, 'right', Math.floor(now / 140) % 4), px, bgH * 0.6);
    const look2 = { skin: '#c68642', hair: '#e04b6a', hairStyle: 'long', shirt: '#4b6bd6', pants: '#e9c46a', eyes: '#4a6fa5', hat: 'none' };
    const px2 = bgW - (((now / 55) % (bgW + 40)) - 20); bgx.drawImage(SP.char(look2, 'left', Math.floor(now / 140) % 4), px2, bgH * 0.4);
    bgx.fillStyle = 'rgba(20,30,20,.35)'; bgx.fillRect(0, 0, bgW, bgH);
    requestAnimationFrame(bgDraw);
  }
  window.addEventListener('resize', bgResize); bgResize(); requestAnimationFrame(bgDraw);

  // ---------- auth ----------
  $$('#auth .tab').forEach(b => b.onclick = () => { mode = b.dataset.tab; $$('#auth .tab').forEach(t => t.classList.toggle('active', t === b)); $('#authBtn').textContent = mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครและเริ่มเล่น'; $('#authErr').textContent = ''; $('#authPass').autocomplete = mode === 'login' ? 'current-password' : 'new-password'; });
  $('#authForm').onsubmit = async (e) => {
    e.preventDefault(); $('#authErr').textContent = ''; $('#authBtn').disabled = true;
    try {
      const r = await fetch('/api/' + mode, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: $('#authUser').value.trim(), password: $('#authPass').value }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'เกิดข้อผิดพลาด');
      token = j.token; localStorage.setItem('ow_token', token);
      Net.connect(token);
    } catch (err) { $('#authErr').textContent = err.message; }
    $('#authBtn').disabled = false;
  };
  fetch('/api/stats').then(r => r.json()).then(s => { $('#authStats').textContent = `ผู้เล่นทั้งหมด ${s.users} คน · ออนไลน์ ${s.online} คน`; }).catch(() => {});

  // ---------- character creator ----------
  const Creator = {
    look: null, name: '', dir: 'down', edit: false, raf: 0,
    randomLook() { const pick = (a) => a[Math.floor(Math.random() * a.length)]; return { skin: pick(D.LOOKS.skin), hair: pick(D.LOOKS.hair), hairStyle: pick(D.LOOKS.hairStyle), shirt: pick(D.LOOKS.shirt), pants: pick(D.LOOKS.pants), eyes: pick(D.LOOKS.eyes), hat: Math.random() < 0.6 ? 'none' : pick(D.LOOKS.hat) }; },
    show(opts) {
      this.look = opts.look ? { ...opts.look } : this.randomLook(); this.name = opts.name || ''; this.edit = !!opts.edit;
      $('#charName').value = this.name; $('#creatorTitle').textContent = this.edit ? 'เปลี่ยนหน้าตา' : 'สร้างตัวละครของคุณ';
      $('#creatorDone').textContent = this.edit ? 'บันทึก' : 'เริ่มผจญภัย!'; $('#creatorCancel').style.display = this.edit ? '' : 'none';
      this.buildOpts(); show('creator');
      cancelAnimationFrame(this.raf); const loop = (now) => { this.draw(now); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop);
    },
    hide() { cancelAnimationFrame(this.raf); },
    buildOpts() {
      $$('.opt').forEach(opt => {
        const k = opt.dataset.k; const box = opt.querySelector('.swatches, .chips'); box.innerHTML = '';
        for (const v of D.LOOKS[k]) {
          const el = document.createElement('div');
          if (box.classList.contains('swatches')) { el.className = 'sw' + (this.look[k] === v ? ' active' : ''); el.style.background = v; }
          else { el.className = 'chip' + (this.look[k] === v ? ' active' : ''); el.textContent = (k === 'hairStyle' ? UI.HAIR_TH : UI.HAT_TH)[v] || v; }
          el.onclick = () => { this.look[k] = v; this.buildOpts(); };
          box.appendChild(el);
        }
      });
    },
    draw(now) {
      const c = $('#preview'); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, c.width, c.height);
      x.drawImage(SP.tile(2, 0, 0), 0, 168, 160, 72); x.drawImage(SP.tile(2, 1, 0), 0, 168, 80, 72);
      const spr = SP.char(this.look, this.dir, Math.floor(now / 160) % 4);
      x.drawImage(spr, 16, 24, 128, 192);
    },
  };
  $('#prevRotate').onclick = () => { const ds = ['down', 'left', 'up', 'right']; Creator.dir = ds[(ds.indexOf(Creator.dir) + 1) % 4]; };
  $('#prevRandom').onclick = () => { Creator.look = Creator.randomLook(); Creator.buildOpts(); };
  $('#creatorDone').onclick = () => {
    const name = $('#charName').value.trim();
    if (!name) { $('#charName').focus(); UI.toast('ตั้งชื่อในเกมก่อนนะ', 'error'); return; }
    if (Creator.edit) { Net.send({ t: 'setlook', name, look: Creator.look }); Creator.hide(); show('game'); Game.st.me.look = Creator.look; Game.st.me.name = name; UI.onMe(['look', 'name']); }
    else Net.send({ t: 'create', name, look: Creator.look });
  };
  $('#creatorCancel').onclick = () => { Creator.hide(); show('game'); };

  // ---------- connection lifecycle ----------
  Net.on('auth_fail', () => { localStorage.removeItem('ow_token'); token = null; inGame = false; Game.stop(); UI.stop(); show('auth'); $('#authErr').textContent = 'กรุณาเข้าสู่ระบบใหม่'; });
  Net.on('need_create', (m) => { Creator.show({ name: m.username }); });
  Net.on('init', (m) => { Creator.hide(); show('game'); Game.start(m); UI.start(m); inGame = true; });
  Net.on('kick', (m) => { Net.close(); inGame = false; Game.stop(); UI.stop(); show('auth'); $('#authErr').textContent = m.reason || 'ถูกตัดการเชื่อมต่อ'; });
  Net.on('_close', () => { if (inGame) UI.toast('หลุดการเชื่อมต่อ กำลังเชื่อมต่อใหม่...', 'error', 1800); });

  Game.init();
  UI.init({
    onLook: () => Creator.show({ look: Game.st.me.look, name: Game.st.me.name, edit: true }),
    onLogout: () => { Net.close(); localStorage.removeItem('ow_token'); token = null; inGame = false; Game.stop(); UI.stop(); show('auth'); },
  });
  if (token) { show('auth'); Net.connect(token); } else show('auth');
})();
