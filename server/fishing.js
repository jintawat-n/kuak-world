/* Fishing: cast on water, wait for bite, reel within window; species by habitat/time/rod/level */
const D = require('../public/js/defs.js');
const W = require('./world');

module.exports = function (ctx) {
  const { give, has, take, toast, err, send, sendMe, addXp, db, broadcastNear } = ctx;

  function bestRod(p) { return D.bestTool(p.inv, 'rod'); }
  function isNight(time) { const h = (time / D.DAY_SECONDS) * 24; return h >= 19 || h < 6; }
  function pick(p, tile, night, tier, luck) {
    const habitat = tile === D.T.WATER ? 'sea' : 'river';
    const lv = p.level || 1;
    const pool = D.FISH_LIST.filter(f => (f.habitat === habitat || f.habitat === 'any') && (!f.night || night) && f.lv <= lv + 2);
    const w = D.ROD_WEIGHTS[tier] || D.ROD_WEIGHTS[1];
    // roll rarity with luck bonus shifting weight upward
    const weights = w.map((x, i) => x * (1 + (i >= 2 ? luck : 0)));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0); let rarity = 1;
    for (let i = 0; i < 5; i++) { if (r < weights[i]) { rarity = i + 1; break; } r -= weights[i]; }
    let cand = pool.filter(f => f.rarity === rarity);
    while (!cand.length && rarity > 1) { rarity--; cand = pool.filter(f => f.rarity === rarity); }
    if (!cand.length) cand = pool;
    return cand[Math.floor(Math.random() * cand.length)];
  }
  function cancel(s, quiet) {
    if (!s.fishing) return;
    clearTimeout(s.fishing.timer); clearTimeout(s.fishing.miss);
    s.fishing = null; send(s.ws, { t: 'fish_state', state: null });
    if (!quiet) toast(s, 'เก็บเบ็ดแล้ว', 'info');
  }
  function cast(s, m) {
    const p = s.p; const x = Math.floor(m.x), y = Math.floor(m.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const rod = bestRod(p); if (!rod) return err(s, 'ต้องมีเบ็ดตกปลา (คราฟต์จากไม้ 4 เชือก 1 หรือซื้อที่ร้าน)');
    const tile = W.getTile(x, y); if (tile !== D.T.WATER && tile !== D.T.SHALLOW) return err(s, 'ต้องเหวี่ยงเบ็ดลงน้ำ');
    if (Math.max(Math.abs(p.x - (x + 0.5)), Math.abs(p.y - (y + 0.5))) > 4.5) return err(s, 'ไกลเกินไป เดินเข้าใกล้น้ำอีกนิด');
    if (s.fishing) cancel(s, true);
    const tier = D.ITEMS[rod].tier || 1;
    const hasBait = has(p, 'bait'); if (hasBait) take(p, 'bait', 1);
    const luck = (D.passive(p.cls, 'fishLuck') || 0) / 100 + (hasBait ? 0.5 : 0);
    const wait = (hasBait ? 1500 : 2500) + Math.random() * (hasBait ? 3000 : 5000) / Math.max(1, tier * 0.6);
    s.fishing = { x, y, tier, luck, bait: hasBait, start: Date.now(), bite: 0 };
    send(s.ws, { t: 'fish_state', state: 'wait', x, y, bait: hasBait });
    sendMe(s, ['inv']);
    s.fishing.timer = setTimeout(() => {
      if (!s.fishing) return;
      s.fishing.bite = Date.now();
      send(s.ws, { t: 'fish_state', state: 'bite', x, y, window: 1600 });
      s.fishing.miss = setTimeout(() => { if (s.fishing && s.fishing.bite) { const st = s.fishing; s.fishing = null; send(s.ws, { t: 'fish_state', state: 'miss' }); toast(s, 'ปลาหลุด! ต้องกดตอนเห็นเครื่องหมาย !', 'error'); } }, 1600);
    }, wait);
  }
  function reel(s) {
    const p = s.p; const f = s.fishing; if (!f) return;
    if (!f.bite) { cancel(s); return; }
    clearTimeout(f.miss); s.fishing = null;
    const night = isNight(db.world.time);
    const fish = pick(p, W.getTile(f.x, f.y), night, f.tier, f.luck);
    const size = Math.round(fish.minCm + Math.random() * (fish.maxCm - fish.minCm) * (0.6 + 0.4 * Math.min(1, f.tier / 5) + Math.random() * 0.4));
    give(p, fish.id, 1);
    p.fishdex = p.fishdex || {}; const rec = p.fishdex[fish.id] || { n: 0, max: 0 }; rec.n++; if (size > rec.max) rec.max = size; p.fishdex[fish.id] = rec;
    const isNew = rec.n === 1;
    send(s.ws, { t: 'fish_state', state: 'catch', x: f.x, y: f.y, fish: fish.id, size, isNew, rec });
    toast(s, `${isNew ? 'ชนิดใหม่! ' : ''}ตกได้ ${fish.th} ${size} ซม. (${D.RARITY_TH[fish.rarity]})`, 'get');
    broadcastNear(f.x, f.y, { t: 'fx', kind: 'splash', x: f.x, y: f.y });
    addXp(s, D.FISH_XP[fish.rarity] + (isNew ? 20 : 0));
    p.stats.fish = (p.stats.fish || 0) + 1;
    sendMe(s, ['inv', 'fishdex']); db.putPlayer(p);
  }
  return { cast, reel, cancel, bestRod };
};
