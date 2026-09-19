/* ==========================================================
   Kuak World - 100 classes (อาชีพ) built on a generic skill engine
   Each skill: { id, th, desc, fx, energy, cd, range, target, icon, ...params }
   fx types are executed by server/skills.js
   ========================================================== */
(function (root) {
  function build(D) {
    // ---------- skill constructors ----------
    let n = 0; const uid = () => 's' + (++n);
    const shot   = (th, dmg, range, cd, e, icon, desc) => ({ id: uid(), th, fx: 'shot', dmg, range, cd, energy: e, target: 'tile', icon, desc: desc || `ยิงเป้าหมายในระยะ ${range} ทำ ${dmg} ดาเมจ` });
    const aoe    = (th, dmg, r, range, cd, e, icon, desc) => ({ id: uid(), th, fx: 'aoe', dmg, r, range, cd, energy: e, target: range ? 'tile' : 'self', icon, desc: desc || (range ? `ระเบิดจุดที่เล็ง รัศมี ${r} ทำ ${dmg} ดาเมจ` : `โจมตีรอบตัว รัศมี ${r} ทำ ${dmg} ดาเมจ`) });
    const line   = (th, dmg, range, cd, e, icon) => ({ id: uid(), th, fx: 'line', dmg, range, cd, energy: e, target: 'tile', icon, desc: `โจมตีทะลุเป็นแนวยาว ${range} ช่อง ทำ ${dmg} ดาเมจทุกตัว` });
    const blink  = (th, range, cd, e, icon) => ({ id: uid(), th, fx: 'blink', range, cd, energy: e, target: 'tile', icon: icon || 'sk_blink', desc: `เทเลพอร์ตไปจุดที่เล็ง ไม่เกิน ${range} ช่อง` });
    const dash   = (th, tiles, cd, e, icon) => ({ id: uid(), th, fx: 'dash', tiles, cd, energy: e, range: 0, target: 'self', icon: icon || 'sk_dash', desc: `พุ่งไปข้างหน้า ${tiles} ช่อง` });
    const heal   = (th, v, cd, e, icon, desc) => ({ id: uid(), th, fx: 'heal', v, cd, energy: e || 0, range: 0, target: 'self', icon: icon || 'sk_vigor', desc: desc || 'ฟื้นฟู ' + Object.entries(v).map(([k, q]) => ({ hp: 'เลือด', energy: 'พลังงาน', hunger: 'ความอิ่ม', fun: 'ความสนุก', hygiene: 'ความสะอาด' }[k]) + ' +' + q).join(' ') });
    const buff   = (th, kind, val, dur, cd, e, icon, desc) => ({ id: uid(), th, fx: 'buff', kind, val, dur, cd, energy: e, range: 0, target: 'self', icon, desc: desc || ({ speed: `วิ่งเร็วขึ้น ${Math.round((val - 1) * 100)}%`, dmg: `โจมตีแรงขึ้น ${Math.round((val - 1) * 100)}%`, def: `ลดดาเมจที่ได้รับ ${Math.round(val * 100)}%`, regen: `ฟื้นเลือด ${val}/วิ`, xp: `ได้ XP เพิ่ม ${Math.round((val - 1) * 100)}%`, loot: `ของดรอปจากมอนสเตอร์ +${val}`, shield: `เกราะดูดซับดาเมจ ${val}`, cook: 'ทำอาหารได้ทุกที่ไม่ต้องมีเตา', light: 'ส่องสว่างรอบตัวตอนกลางคืน', yield: `เก็บเกี่ยว/เก็บของได้ +${val}` }[kind]) + ` เป็นเวลา ${dur} วิ` });
    const water  = (th, r, range, cd, e, icon) => ({ id: uid(), th, fx: 'water', r, range, cd, energy: e, target: range ? 'tile' : 'self', icon: icon || 'sk_water', desc: `รดน้ำแปลง/ผักในรัศมี ${r}${range ? ' รอบจุดที่เล็ง' : ' รอบตัว'}` });
    const grow   = (th, r, range, cd, e, icon) => ({ id: uid(), th, fx: 'grow', r, range, cd, energy: e, target: range ? 'tile' : 'self', icon: icon || 'sk_grow', desc: `ผักในรัศมี ${r} โตขึ้น 1 ระยะ` });
    const sow    = (th, r, cd, e) => ({ id: uid(), th, fx: 'sow', r, range: 3, cd, energy: e, target: 'tile', icon: 'sk_sow', desc: `ปลูกเมล็ดที่เลือกอยู่ลงดินพรวน ${r * 2 + 1}×${r * 2 + 1}` });
    const reap   = (th, r, cd, e) => ({ id: uid(), th, fx: 'reap', r, range: 0, cd, energy: e, target: 'self', icon: 'sk_reap', desc: `เก็บเกี่ยวผักสุกทั้งหมดในรัศมี ${r} รอบตัว` });
    const floor  = (th, r, cd, e) => ({ id: uid(), th, fx: 'floor', r, range: 3, cd, energy: e, target: 'tile', icon: 'sk_floor', desc: `ปูพื้นที่เลือกอยู่ ${r * 2 + 1}×${r * 2 + 1}` });
    const wall   = (th, len, cd, e) => ({ id: uid(), th, fx: 'wall', len, range: 3, cd, energy: e, target: 'tile', icon: 'sk_wall', desc: `วางผนัง/รั้วที่เลือกอยู่ ${len} ช่องตามแนวที่หันหน้า` });
    const demo   = (th, r, cd, e) => ({ id: uid(), th, fx: 'demolish', r, range: 3, cd, energy: e, target: 'tile', icon: 'sk_demolish', desc: `รื้อสิ่งก่อสร้างของคุณ ${r * 2 + 1}×${r * 2 + 1} คืนของเข้ากระเป๋า` });
    const quarry = (th, r, range, cd, e, icon, bonus) => ({ id: uid(), th, fx: 'quarry', r, range, cd, energy: e, target: 'tile', icon: icon || 'sk_quarry', bonus: bonus || 1, desc: `ทุบหิน/ต้นไม้ทั้งหมดในรัศมี ${r} ทันที (ได้ของเพิ่ม +${bonus || 1})` });
    const gather = (th, r, cd, e, icon) => ({ id: uid(), th, fx: 'gather', r, range: 0, cd, energy: e, target: 'self', icon: icon || 'sk_reap', desc: `เก็บเบอร์รี่ ดอกไม้ เห็ด ทั้งหมดในรัศมี ${r}` });
    const slow   = (th, r, dur, cd, e, icon) => ({ id: uid(), th, fx: 'slow', r, dur, range: 0, cd, energy: e, target: 'self', icon: icon || 'sk_rain:1', desc: `มอนสเตอร์ในรัศมี ${r} ช้าลง ${dur} วิ` });
    const stun   = (th, r, range, dur, cd, e, icon) => ({ id: uid(), th, fx: 'stun', r, range, dur, cd, energy: e, target: range ? 'tile' : 'self', icon: icon || 'sk_snipe:5', desc: `มอนสเตอร์ในรัศมี ${r} หยุดนิ่ง ${dur} วิ` });
    const push   = (th, r, force, cd, e, icon) => ({ id: uid(), th, fx: 'push', r, force, range: 0, cd, energy: e, target: 'self', icon: icon || 'sk_fan:4', desc: `ผลักมอนสเตอร์รอบตัวรัศมี ${r} ให้กระเด็น` });
    const poison = (th, dps, dur, range, cd, e, icon) => ({ id: uid(), th, fx: 'poison', dps, dur, range, cd, energy: e, target: 'tile', icon: icon || 'sk_fire:2', desc: `พิษเป้าหมาย ${dps} ดาเมจ/วิ นาน ${dur} วิ` });
    const drain  = (th, dmg, range, cd, e, icon) => ({ id: uid(), th, fx: 'drain', dmg, range, cd, energy: e, target: 'tile', icon: icon || 'sk_fire:5', desc: `ดูดเลือดเป้าหมาย ${dmg} ดาเมจ และฟื้นเลือดตัวเอง ${Math.floor(dmg / 2)}` });
    const healArea = (th, hp, r, cd, e, icon) => ({ id: uid(), th, fx: 'healArea', hp, r, range: 0, cd, energy: e, target: 'self', icon: icon || 'sk_vigor:3', desc: `ฟื้นเลือด ${hp} ให้ตัวเองและเพื่อนในรัศมี ${r}` });
    const funArea = (th, fun, r, cd, e, icon) => ({ id: uid(), th, fx: 'funArea', fun, r, range: 0, cd, energy: e, target: 'self', icon: icon || 'sk_vigor:4', desc: `เพิ่มความสนุก ${fun} ให้ทุกคนในรัศมี ${r}` });
    const warp   = (th, where, cd, e, icon) => ({ id: uid(), th, fx: 'warp', where, range: 0, cd, energy: e, target: 'self', icon: icon || 'sk_blink:1', desc: where === 'home' ? 'วาร์ปกลับบ้านทันที' : 'วาร์ปไปเมืองทันที' });
    const find   = (th, what, cd, icon) => ({ id: uid(), th, fx: 'find', what, range: 0, cd, energy: 2, target: 'self', icon: icon || 'sk_snipe:1', desc: `บอกทิศทางและระยะของ${({ tree: 'ต้นไม้', rock: 'หิน', bigrock: 'หินใหญ่ (มีแร่)', mob: 'มอนสเตอร์', water: 'แหล่งน้ำ', bush: 'พุ่มเบอร์รี่', player: 'ผู้เล่นคนอื่น' }[what])}ที่ใกล้ที่สุด` });
    const treasure = (th, table, cd, icon) => ({ id: uid(), th, fx: 'treasure', table, range: 0, cd, energy: 5, target: 'self', icon: icon || 'sk_vigor:5', desc: 'สุ่มรับของขวัญ: ' + table.map(([it, a, b]) => D.ITEMS[it].th).join('/') });
    const panel  = (th, which, cd, icon) => ({ id: uid(), th, fx: 'panel', which, range: 0, cd, energy: 0, target: 'self', icon: icon || 'sk_wall:4', desc: which === 'shop' ? 'เปิดร้านค้าได้ทุกที่' : 'เปิดหน้าทำอาหารได้ทุกที่ (ไม่ต้องมีเตา)' });
    const lure   = (th, num, cd, e, icon) => ({ id: uid(), th, fx: 'lure', num, range: 0, cd, energy: e, target: 'self', icon: icon || 'sk_fan:2', desc: `ล่อมอนสเตอร์ ${num} ตัวมาหาคุณ (นอกเมืองเท่านั้น)` });
    const coins  = (th, num, cd, icon) => ({ id: uid(), th, fx: 'coins', num, range: 0, cd, energy: 0, target: 'self', icon: icon || 'sk_vigor:4', desc: `รับเหรียญ ${num} (คูลดาวน์ ${Math.round(cd / 60)} นาที)` });
    const convert = (th, from, to, ratio, cd, e, icon) => ({ id: uid(), th, fx: 'convert', from, to, ratio, range: 0, cd, energy: e, target: 'self', icon: icon || 'sk_quarry:1', desc: `แปลง ${D.ITEMS[from].th} ${ratio[0]} ชิ้น เป็น ${D.ITEMS[to].th} ${ratio[1]} ชิ้น (ทำได้ครั้งละหลายชุด)` });
    const P = (k, v, th) => ({ k, v, th });
    // common passives
    const pHarvest = (n) => P('harvestPlus', n, `เก็บเกี่ยวได้ +${n}`);
    const pSeed = (pct) => P('seedDiscount', pct, `ซื้อเมล็ดลด ${pct}%`);
    const pCrop = (pct) => P('cropSpeed', pct, `ผักของคุณโตเร็วขึ้น ${pct}%`);
    const pWood = (n) => P('woodPlus', n, `ได้ไม้ +${n} ต่อครั้ง`);
    const pStone = (n) => P('stonePlus', n, `ได้หิน +${n} ต่อครั้ง`);
    const pOre = (pct) => P('oreChance', pct, `โอกาสได้แร่จากหิน +${pct}%`);
    const pRecipe = (pct) => P('recipeDiscount', pct, `สูตรคราฟต์ใช้วัตถุดิบลด ${pct}%`);
    const pTool = (n) => P('toolDmg', n, `ตัด/ขุดแรงขึ้น +${n}`);
    const pEnergy = (pct) => P('energySave', pct, `พลังงานลดช้าลง ${pct}%`);
    const pHunger = (pct) => P('hungerSave', pct, `หิวช้าลง ${pct}%`);
    const pFun = (pct) => P('funSave', pct, `เบื่อช้าลง ${pct}%`);
    const pHyg = (pct) => P('hygieneSave', pct, `สกปรกช้าลง ${pct}%`);
    const pRegen = (m) => P('hpRegen', m, `เลือดฟื้นเร็วขึ้น ${m} เท่า`);
    const pMelee = (n) => P('meleePlus', n, `โจมตีประชิด +${n}`);
    const pSkill = (pct) => P('skillDmg', pct, `สกิลโจมตีแรงขึ้น ${pct}%`);
    const pSpeed = (pct) => P('speed', pct, `เดิน/วิ่งเร็วขึ้น ${pct}%`);
    const pLoot = (n) => P('mobLoot', n, `ของดรอปจากมอนสเตอร์ +${n}`);
    const pEss = (pct) => P('essence', pct, `โอกาสได้แก่นเวท ${pct}%`);
    const pSell = (pct) => P('sellBonus', pct, `ขายของได้ราคาเพิ่ม ${pct}%`);
    const pBuy = (pct) => P('buyDiscount', pct, `ซื้อของลด ${pct}%`);
    const pXp = (pct) => P('xpBonus', pct, `ได้ XP เพิ่ม ${pct}%`);
    const pDef = (pct) => P('defense', pct, `ลดดาเมจที่ได้รับ ${pct}%`);
    const pCoinKill = (n) => P('coinKill', n, `ได้เหรียญ ${n} ทุกครั้งที่ล่ามอนสเตอร์`);
    const pCook = (n) => P('cookPlus', n, `ทำอาหารได้ +${n} จาน`);
    const pFood = (pct) => P('foodBonus', pct, `อาหารฟื้นฟูเพิ่ม ${pct}%`);
    const pGather = (n) => P('gatherPlus', n, `เก็บเบอร์รี่/ดอกไม้/เห็ด +${n}`);
    const pVeh = (pct) => P('vehicleSpeed', pct, `พาหนะเร็วขึ้น ${pct}%`);
    const pLight = (r) => P('light', r, `มองเห็นตอนกลางคืนไกลขึ้น (${r} ช่อง)`);
    const pSwim = (pct) => P('swim', pct, `เดินในน้ำตื้นเร็วขึ้น ${pct}%`);
    const pCoolDown = (pct) => P('cdr', pct, `คูลดาวน์สกิลลด ${pct}%`);
    const pSkillCost = (pct) => P('skillCost', pct, `สกิลใช้พลังงานลด ${pct}%`);
    const pFaint = (pct) => P('faintSave', pct, `เป็นลมแล้วเสียเหรียญน้อยลง ${pct}%`);
    const pHome = () => P('homeCd', 1, 'กลับบ้าน/ไปเมืองไม่มีคูลดาวน์');

    const C = (id, th, family, lv, icon, desc, passives, skills) => ({ id, th, family, lv, icon, desc, passives, skills });
    const cls = [];

    // ================= 1) เกษตร =================
    cls.push(
      C('farmer', 'ชาวไร่', 'เกษตร', 1, 'cls_farmer', 'ปลูกเก่ง เก็บเกี่ยวได้มากกว่า เมล็ดถูกกว่า', [pHarvest(1), pSeed(30), pCrop(25)],
        [sow('หว่านเมล็ด', 1, 4, 6), water('รดน้ำวงกว้าง', 1, 3, 4, 5), reap('เกี่ยวรวด', 3, 10, 8), heal('กำลังชาวไร่', { energy: 25, hunger: 10 }, 120)]),
      C('gardener', 'คนสวน', 'เกษตร', 1, 'cls_farmer:2', 'ดูแลดอกไม้และต้นไม้ เก็บของป่าได้เยอะ', [pGather(1), pCrop(15), pFun(20)],
        [gather('เก็บดอกไม้', 3, 12, 6), water('พรมน้ำ', 1, 3, 4, 5), grow('บำรุงต้น', 2, 4, 90, 20), heal('พักใต้ร่มไม้', { fun: 20, energy: 10 }, 90)]),
      C('rice', 'ชาวนา', 'เกษตร', 3, 'cls_farmer:4', 'ผู้เชี่ยวชาญนาข้าวและข้าวโพด', [pHarvest(2), pCrop(20), pHunger(20)],
        [sow('ดำนา', 2, 8, 10), water('ทดน้ำเข้านา', 2, 4, 10, 10), reap('เกี่ยวข้าว', 4, 15, 10), heal('ข้าวห่อกลางนา', { hunger: 30, energy: 10 }, 120)]),
      C('orchard', 'ชาวสวนผลไม้', 'เกษตร', 5, 'cls_farmer:3', 'ปลูกต้นไม้และเก็บผลได้ไว', [pWood(1), pGather(2), pCrop(10)],
        [gather('สอยผล', 4, 10, 6), grow('ปุ๋ยวิเศษ', 3, 4, 60, 20), quarry('ตัดแต่งกิ่ง', 1, 3, 20, 10, 'sk_quarry:2', 1), heal('น้ำผลไม้สด', { hunger: 20, fun: 10 }, 90)]),
      C('herbalist', 'หมอสมุนไพร', 'เกษตร', 6, 'cls_farmer:5', 'รู้จักพืชทุกชนิด รักษาด้วยสมุนไพร', [pGather(2), pRegen(1.5), pFood(15)],
        [gather('เก็บสมุนไพร', 4, 10, 6, 'sk_reap:2'), heal('ยาต้ม', { hp: 30, hygiene: 10 }, 60, 6), healArea('ยาหม้อรวม', 20, 4, 90, 12), poison('ผงพิษ', 4, 6, 5, 8, 6)]),
      C('beekeeper', 'คนเลี้ยงผึ้ง', 'เกษตร', 8, 'cls_farmer:1', 'ผึ้งช่วยผสมเกสร ผักโตไว', [pCrop(35), pHarvest(1), pSell(10)],
        [grow('ฝูงผึ้งผสมเกสร', 3, 0, 60, 18), aoe('ต่อยผึ้ง', 8, 3, 0, 6, 6, 'sk_fan:4'), slow('ควันรม', 4, 5, 15, 8), treasure('น้ำผึ้ง', [['berry', 3, 6], ['flower', 2, 4], ['essence', 1, 1]], 180)]),
      C('botanist', 'นักพฤกษศาสตร์', 'เกษตร', 10, 'cls_wizard:2', 'วิทยาศาสตร์ทำให้พืชโตเร็วกว่าใคร', [pCrop(50), pHarvest(1), pXp(10)],
        [grow('เร่งเซลล์พืช', 3, 5, 45, 20), water('ระบบน้ำหยด', 2, 4, 8, 8), sow('หว่านทดลอง', 2, 8, 10), find('ตามหาพุ่มเบอร์รี่', 'bush', 20)]),
      C('organic', 'เกษตรอินทรีย์', 'เกษตร', 12, 'cls_farmer:2', 'ผลผลิตคุณภาพ ขายได้ราคาดี', [pSell(25), pHarvest(1), pFood(20)],
        [reap('เก็บเกี่ยวคุณภาพ', 4, 12, 10), water('น้ำหมักชีวภาพ', 2, 4, 10, 8), buff('ตลาดเช้า', 'yield', 2, 60, 180, 10, 'sk_reap:4'), heal('สลัดออร์แกนิก', { hunger: 25, hp: 10 }, 90)]),
      C('forester', 'คนดูแลป่า', 'เกษตร', 15, 'cls_farmer:3', 'ปลูกป่าและเก็บไม้อย่างยั่งยืน', [pWood(2), pGather(1), pEnergy(20)],
        [quarry('โค่นไม้เป็นแถบ', 2, 3, 25, 14, 'sk_quarry:2', 2), gather('เก็บของป่า', 5, 10, 6), grow('ปลูกกล้าโต', 3, 4, 60, 15), buff('เดินป่าคล่อง', 'speed', 1.4, 30, 60, 8, 'sk_dash:2')]),
      C('agri_master', 'ปรมาจารย์เกษตร', 'เกษตร', 20, 'cls_farmer:4', 'สุดยอดเกษตรกร ทุกอย่างงอกงาม', [pHarvest(3), pCrop(60), pSeed(50)],
        [sow('หว่านทั่วแปลง', 2, 6, 10), water('ฝนเกษตร', 5, 0, 40, 15, 'sk_rain'), grow('ฤดูเก็บเกี่ยว', 5, 0, 120, 30), reap('เคียวทอง', 6, 12, 10)]),
    );

    // ================= 2) ช่าง =================
    cls.push(
      C('builder', 'ช่างก่อสร้าง', 'ช่าง', 1, 'cls_builder', 'สร้างบ้านเร็ว วัตถุดิบเยอะ สูตรถูกลง', [pWood(1), pStone(1), pRecipe(25), pTool(1)],
        [floor('ปูพื้น 3×3', 1, 3, 6), wall('ก่อผนังยาว', 5, 3, 6), demo('รื้อถอน', 1, 3, 4), quarry('ระเบิดหิน', 2, 3, 30, 15)]),
      C('carpenter', 'ช่างไม้', 'ช่าง', 1, 'cls_builder:2', 'ผู้เชี่ยวชาญงานไม้', [pWood(2), pTool(1), pRecipe(15)],
        [quarry('เลื่อยยนต์', 2, 3, 20, 12, 'sk_quarry:2', 2), wall('ตอกรั้วรวด', 7, 3, 6), floor('ปูพื้นไม้', 1, 3, 6), convert('แปรรูปไม้', 'wood', 'floor_wood', [1, 3], 10, 4, 'sk_floor:2')]),
      C('mason', 'ช่างหิน', 'ช่าง', 3, 'cls_builder:1', 'ตัดหินและก่อกำแพงแข็งแรง', [pStone(2), pOre(10), pTool(1)],
        [quarry('สกัดหิน', 2, 3, 20, 12, 'sk_quarry', 2), wall('ก่อกำแพงหิน', 7, 3, 6), convert('ตัดหินขัด', 'stone', 'floor_stone', [1, 3], 10, 4, 'sk_floor:1'), aoe('ทุบพื้นสะเทือน', 15, 2, 0, 12, 10, 'sk_quarry:3')]),
      C('decorator', 'ช่างตกแต่งภายใน', 'ช่าง', 5, 'cls_builder:5', 'บ้านสวย เฟอร์นิเจอร์ถูกลง', [pRecipe(35), pFun(25), pSell(10)],
        [floor('ปูพรมทั้งห้อง', 2, 4, 8), demo('จัดใหม่', 2, 3, 4), buff('บ้านสวยใจฟู', 'regen', 1, 60, 120, 10, 'sk_vigor:3'), funArea('ปาร์ตี้ขึ้นบ้านใหม่', 20, 5, 120, 10)]),
      C('blacksmith', 'ช่างเหล็ก', 'ช่าง', 6, 'cls_builder:3', 'หลอมแร่ ตีเหล็ก เครื่องมือแรงกว่าใคร', [pOre(25), pTool(2), pMelee(3)],
        [convert('หลอมแร่', 'stone', 'ore', [8, 1], 20, 8, 'sk_fire'), quarry('ค้อนหลอม', 2, 3, 25, 14, 'sk_quarry:3', 2), aoe('ฟาดค้อน', 22, 1.5, 2, 4, 6, 'sk_wall:3'), buff('เกราะเหล็ก', 'def', 0.5, 30, 90, 10, 'sk_wall:1')]),
      C('engineer', 'วิศวกร', 'ช่าง', 8, 'cls_builder:4', 'วางแผนก่อสร้างขนาดใหญ่', [pRecipe(30), pWood(1), pStone(1)],
        [floor('ปูพื้น 5×5', 2, 5, 12), wall('ก่อผนัง 9 ช่อง', 9, 4, 10), demo('รื้อ 5×5', 2, 4, 6), blink('โหนเครน', 6, 6, 8, 'sk_blink:4')]),
      C('architect', 'สถาปนิก', 'ช่าง', 10, 'cls_builder:5', 'ออกแบบบ้านหรู สูตรทุกอย่างถูกลงมาก', [pRecipe(40), pFun(20), pXp(10)],
        [floor('ผังพื้น 5×5', 2, 5, 12), wall('ผนังตามแบบ', 9, 4, 10), convert('แปรรูปกระเบื้อง', 'stone', 'floor_tile', [2, 3], 10, 4, 'sk_floor:4'), buff('แรงบันดาลใจ', 'xp', 1.5, 120, 300, 10, 'sk_vigor:1')]),
      C('mechanic', 'ช่างกล', 'ช่าง', 12, 'cls_builder:3', 'ซ่อมและอัปเกรดพาหนะ', [pVeh(30), pOre(15), pRecipe(20)],
        [convert('ถลุงเหล็ก', 'stone', 'ore', [6, 1], 20, 8, 'sk_fire:4'), buff('เร่งเครื่อง', 'speed', 1.5, 25, 60, 8, 'sk_dash:4'), dash('ไนตรัส', 6, 6, 6), aoe('ประแจฟาด', 20, 1.5, 2, 4, 6, 'sk_wall:3')]),
      C('inventor', 'นักประดิษฐ์', 'ช่าง', 15, 'cls_builder:4', 'สร้างของแปลกใหม่และวัตถุระเบิด', [pRecipe(30), pSkill(15), pXp(15)],
        [aoe('ระเบิดกระป๋อง', 30, 2, 6, 6, 10, 'sk_fire:4'), quarry('ระเบิดเหมือง', 3, 4, 40, 20, 'sk_quarry:3', 2), stun('แฟลชบอม', 3, 6, 3, 15, 10, 'sk_snipe:4'), treasure('สิ่งประดิษฐ์สุ่ม', [['ore', 3, 6], ['torch', 2, 4], ['lamp', 1, 1]], 240)]),
      C('contractor', 'ผู้รับเหมาใหญ่', 'ช่าง', 20, 'cls_builder', 'สร้างทั้งเมืองได้ในพริบตา', [pWood(3), pStone(3), pRecipe(50), pTool(2)],
        [floor('ปูพื้น 7×7', 3, 6, 16), wall('ผนัง 11 ช่อง', 11, 4, 12), demo('รื้อ 7×7', 3, 5, 8), quarry('เคลียร์พื้นที่', 3, 4, 40, 20, 'sk_quarry:2', 2)]),
    );

    // ================= 3) เวทมนตร์ =================
    cls.push(
      C('wizard', 'พ่อมด', 'เวทมนตร์', 1, 'cls_wizard', 'ใช้เวทมนตร์ ควบคุมธรรมชาติ และโจมตีด้วยลูกไฟ', [pEnergy(30), pEss(40), pRegen(2)],
        [water('เรียกฝน', 5, 0, 45, 15, 'sk_rain'), grow('เร่งโต', 3, 5, 90, 25), aoe('ลูกไฟ', 25, 1.5, 6, 2.5, 8, 'sk_fire'), blink('วาร์ป', 6, 5, 8)]),
      C('witch', 'แม่มด', 'เวทมนตร์', 1, 'cls_wizard:5', 'ต้มยาและสาปศัตรู', [pEss(40), pFood(20), pSkill(10)],
        [poison('คำสาปพิษ', 6, 6, 6, 8, 8), slow('หมอกมนตร์', 4, 6, 15, 8), heal('ยาต้มแม่มด', { hp: 25, energy: 15 }, 60, 6, 'sk_vigor:5'), blink('ไม้กวาดบิน', 7, 6, 8, 'sk_blink:5')]),
      C('frost', 'นักเวทน้ำแข็ง', 'เวทมนตร์', 3, 'cls_wizard:1', 'แช่แข็งศัตรูให้หยุดนิ่ง', [pSkill(15), pEss(30), pDef(10)],
        [aoe('ลูกน้ำแข็ง', 20, 1.5, 6, 2.5, 8, 'sk_fire:1'), stun('แช่แข็ง', 2.5, 6, 3, 15, 12, 'sk_snipe:1'), slow('พายุหิมะ', 5, 8, 20, 12, 'sk_rain:1'), buff('เกราะน้ำแข็ง', 'shield', 40, 30, 60, 10, 'sk_wall:1')]),
      C('storm', 'นักเวทสายฟ้า', 'เวทมนตร์', 5, 'cls_wizard:4', 'ฟ้าผ่าทะลุทุกสิ่ง', [pSkill(25), pSpeed(10), pEss(30)],
        [line('สายฟ้าฟาด', 22, 8, 2, 8, 'sk_fan:4'), aoe('ฟ้าผ่า', 35, 2, 7, 6, 14, 'sk_fire:4'), dash('วิ่งดั่งสายฟ้า', 6, 5, 6, 'sk_dash:4'), water('ฝนฟ้าคะนอง', 5, 0, 45, 15, 'sk_rain')]),
      C('druid', 'ดรูอิด', 'เวทมนตร์', 6, 'cls_wizard:2', 'พลังธรรมชาติ ปลูกและรักษา', [pCrop(30), pGather(1), pRegen(2)],
        [grow('พลังป่า', 4, 5, 60, 20), healArea('น้ำพุแห่งชีวิต', 25, 4, 90, 15), gather('เรียกของป่า', 5, 12, 8, 'sk_reap:2'), aoe('รากไม้รัด', 15, 2.5, 5, 5, 8, 'sk_grow')]),
      C('alchemist', 'นักเล่นแร่แปรธาตุ', 'เวทมนตร์', 8, 'cls_wizard:3', 'เปลี่ยนวัตถุดิบเป็นสิ่งมีค่า', [pOre(20), pEss(35), pSell(15)],
        [convert('แปรหินเป็นแร่', 'stone', 'ore', [5, 1], 20, 8, 'sk_fire:5'), convert('แปรแก่นเวทเป็นเหรียญ', 'essence', 'ore', [1, 4], 30, 6, 'sk_vigor:4'), aoe('ระเบิดกรด', 24, 2, 6, 4, 10, 'sk_fire:2'), heal('ยาอายุวัฒนะ', { hp: 40, hygiene: 20 }, 90, 8, 'sk_vigor:5')]),
      C('summoner', 'ผู้เรียกวิญญาณ', 'เวทมนตร์', 10, 'cls_wizard:5', 'ล่อและควบคุมมอนสเตอร์', [pLoot(1), pEss(50), pCoinKill(3)],
        [lure('เรียกฝูง', 3, 60, 15), stun('ตรึงวิญญาณ', 3, 6, 4, 20, 12, 'sk_snipe:5'), drain('ดูดวิญญาณ', 20, 6, 4, 8), aoe('ระเบิดวิญญาณ', 30, 2, 6, 6, 12, 'sk_fire:5')]),
      C('chrono', 'นักเวทเวลา', 'เวทมนตร์', 12, 'cls_wizard:1', 'บิดเวลา คูลดาวน์สั้น พืชโตทันตา', [pCoolDown(30), pCrop(40), pEnergy(20)],
        [grow('ข้ามฤดู', 4, 5, 60, 25), stun('หยุดเวลา', 4, 0, 4, 30, 15, 'sk_snipe:1'), blink('ย้อนตำแหน่ง', 8, 4, 6, 'sk_blink:1'), buff('เร่งเวลา', 'speed', 1.6, 20, 45, 8, 'sk_dash:1')]),
      C('pyro', 'จอมเวทไฟ', 'เวทมนตร์', 15, 'cls_wizard:3', 'เผาทุกอย่างให้ราบ', [pSkill(35), pEss(30), pEnergy(10)],
        [aoe('ลูกไฟใหญ่', 40, 2, 7, 3, 12, 'sk_fire'), line('กำแพงเพลิง', 30, 7, 6, 14, 'sk_fire:4'), aoe('เปลวเพลิงรอบตัว', 25, 3, 0, 8, 12, 'sk_fire:3'), quarry('เผาป่า', 2, 4, 30, 15, 'sk_fire:3', 0)]),
      C('archmage', 'จอมเวทสูงสุด', 'เวทมนตร์', 20, 'cls_wizard:4', 'ควบคุมทุกธาตุ', [pSkill(40), pEss(60), pEnergy(40), pCoolDown(20)],
        [aoe('ดาวตก', 60, 3, 8, 8, 20, 'sk_fire:5'), stun('พายุน้ำแข็ง', 4, 7, 4, 20, 15, 'sk_snipe:1'), water('ฝนหลวง', 6, 0, 30, 15, 'sk_rain'), blink('เทเลพอร์ตไกล', 12, 4, 8, 'sk_blink:5')]),
    );

    // ================= 4) นักรบ =================
    cls.push(
      C('warrior', 'นักรบ', 'นักรบ', 1, 'cls_knight', 'ต่อสู้ระยะประชิด ทนทาน', [pMelee(4), pDef(15), pRegen(1.5)],
        [aoe('ฟันกวาด', 18, 1.8, 0, 3, 5, 'sk_fan'), dash('พุ่งชน', 4, 5, 5), buff('ฮึดสู้', 'dmg', 1.5, 20, 45, 8, 'sk_vigor:3'), heal('พักหายใจ', { hp: 20, energy: 10 }, 60, 0)]),
      C('knight', 'อัศวิน', 'นักรบ', 3, 'cls_knight:1', 'เกราะหนา ปกป้องเพื่อน', [pDef(30), pMelee(3), pFaint(50)],
        [buff('ยกโล่', 'def', 0.6, 15, 30, 6, 'sk_wall:1'), aoe('ฟาดโล่', 15, 1.5, 0, 4, 5, 'sk_fan:1'), push('กระแทกโล่', 3, 3, 8, 6), healArea('ปลุกใจทหาร', 15, 4, 90, 10)]),
      C('swordsman', 'นักดาบ', 'นักรบ', 5, 'cls_knight:3', 'ดาบเร็วและคม', [pMelee(6), pSpeed(5), pSkill(10)],
        [line('ดาบเฉือน', 24, 4, 3, 6, 'sk_fan:3'), aoe('หมุนดาบ', 22, 2, 0, 5, 8, 'sk_fan'), dash('ก้าวเงา', 5, 4, 5, 'sk_dash:3'), buff('สมาธิดาบ', 'dmg', 1.7, 15, 45, 8, 'sk_vigor:3')]),
      C('brawler', 'นักสู้มือเปล่า', 'นักรบ', 6, 'cls_knight:4', 'หมัดหนักไม่ต้องใช้อาวุธ', [pMelee(8), pEnergy(20), pHunger(20)],
        [aoe('หมัดชุด', 20, 1.5, 0, 2, 4, 'sk_fan:4'), push('เตะกระเด็น', 2.5, 4, 6, 5), stun('หมัดน็อก', 1.5, 2, 3, 12, 8, 'sk_snipe:4'), heal('ตั้งสติ', { energy: 30 }, 90, 0, 'sk_vigor:4')]),
      C('berserker', 'เบอร์เซิร์ก', 'นักรบ', 8, 'cls_knight:3', 'ยิ่งเลือดน้อยยิ่งแรง', [pMelee(10), pSkill(20), P('defense', -10, 'รับดาเมจเพิ่ม 10%')],
        [aoe('คลั่ง', 35, 2.5, 0, 6, 12, 'sk_fan:3'), buff('เดือด', 'dmg', 2, 15, 60, 10, 'sk_fire:3'), dash('พุ่งบ้าเลือด', 6, 5, 6, 'sk_dash:3'), drain('กัดกิน', 25, 2, 6, 8, 'sk_fire:3')]),
      C('guardian', 'ผู้พิทักษ์', 'นักรบ', 10, 'cls_knight:2', 'กำแพงมีชีวิต', [pDef(40), pRegen(2), pMelee(2)],
        [buff('ป้อมปราการ', 'shield', 60, 30, 60, 12, 'sk_wall:2'), push('คลื่นกระแทก', 4, 4, 10, 8), healArea('รักษาแนวหน้า', 20, 5, 90, 12), stun('ตะโกนข่มขวัญ', 4, 0, 2, 20, 10, 'sk_snipe:2')]),
      C('axeman', 'นักรบขวาน', 'นักรบ', 12, 'cls_knight:5', 'ขวานใหญ่ทั้งสู้ทั้งตัดไม้', [pMelee(7), pWood(2), pTool(2)],
        [aoe('เหวี่ยงขวาน', 30, 2, 0, 5, 8, 'sk_fan:5'), quarry('โค่นทุกอย่าง', 2, 3, 20, 12, 'sk_quarry:2', 1), line('ขว้างขวาน', 28, 6, 5, 8, 'sk_fan:3'), buff('เลือดนักรบ', 'regen', 2, 30, 90, 8, 'sk_vigor:3')]),
      C('gladiator', 'กลาดิเอเตอร์', 'นักรบ', 15, 'cls_knight:4', 'นักสู้ในสังเวียน ล่าได้ค่าหัว', [pMelee(8), pCoinKill(5), pXp(15)],
        [aoe('ท่าไม้ตาย', 45, 2, 0, 8, 12, 'sk_fan:4'), buff('เสียงเชียร์', 'dmg', 1.6, 20, 45, 8, 'sk_vigor:4'), dash('พุ่งทะลวง', 6, 4, 6), lure('ท้าประลอง', 3, 60, 12)]),
      C('samurai', 'ซามูไร', 'นักรบ', 20, 'cls_knight:5', 'ดาบคาตานะ ฟันครั้งเดียวจบ', [pMelee(12), pSkill(30), pDef(20), pCoolDown(15)],
        [line('อิไอโดะ', 60, 5, 4, 10, 'sk_fan:5'), aoe('ฟันรอบทิศ', 40, 2.5, 0, 6, 12, 'sk_fan'), dash('ก้าวสายลม', 7, 3, 5, 'sk_dash:5'), buff('จิตวิญญาณบูชิโด', 'def', 0.5, 20, 60, 10, 'sk_wall:5')]),
      C('warlord', 'จอมทัพ', 'นักรบ', 20, 'cls_knight:1', 'ผู้นำนักรบ แรงและทน', [pMelee(10), pDef(35), pRegen(2), pCoinKill(4)],
        [aoe('บัญชาการโจมตี', 50, 3, 0, 8, 15, 'sk_fan:1'), healArea('ธงรบ', 30, 6, 90, 15), stun('คำรามสนาม', 5, 0, 3, 25, 12, 'sk_snipe:2'), buff('เกราะจอมทัพ', 'shield', 80, 30, 60, 12, 'sk_wall:1')]),
    );

    // ================= 5) นักล่า / ระยะไกล =================
    cls.push(
      C('gunner', 'มือปืน', 'นักล่า', 1, 'cls_gunner', 'ยิงระยะไกล เคลื่อนที่ไว ล่ามอนสเตอร์ได้ของเพิ่ม', [pSpeed(15), pLoot(1), pMelee(2)],
        [shot('ยิง', 14, 8, 0.6, 2, 'sk_shoot'), shot('ยิงแม่น', 40, 10, 6, 6, 'sk_snipe'), aoe('ยิงกระจาย', 12, 4, 0, 8, 12, 'sk_fan'), dash('พุ่ง', 4, 4, 5)]),
      C('archer', 'นักธนู', 'นักล่า', 1, 'cls_hunter', 'ธนูเงียบและแม่นยำ', [pSpeed(10), pSkill(10), pEnergy(10)],
        [shot('ยิงธนู', 12, 9, 0.7, 2, 'sk_shoot:2'), line('ลูกธนูทะลุ', 18, 8, 4, 6, 'sk_fan:2'), aoe('ฝนธนู', 15, 2.5, 8, 8, 12, 'sk_rain:2'), buff('สายตาเหยี่ยว', 'dmg', 1.5, 20, 45, 6, 'sk_snipe:2')]),
      C('hunter', 'พราน', 'นักล่า', 3, 'cls_hunter:3', 'ตามรอยและล่าได้ของเยอะ', [pLoot(2), pGather(1), pSpeed(10)],
        [shot('ยิงล่า', 16, 8, 0.8, 2, 'sk_shoot:3'), find('ตามรอยมอนสเตอร์', 'mob', 15), lure('เป่านกหวีดล่อ', 2, 45, 10), poison('ลูกดอกอาบยา', 5, 6, 7, 8, 6)]),
      C('sniper', 'นักซุ่มยิง', 'นักล่า', 5, 'cls_gunner:1', 'ยิงไกลสุดและแรงสุด', [pSkill(30), pDef(-5), pLoot(1)],
        [shot('ซุ่มยิง', 60, 12, 5, 8, 'sk_snipe'), shot('ยิงเร็ว', 12, 10, 0.5, 2, 'sk_shoot:1'), stun('ยิงขา', 1, 10, 3, 15, 8, 'sk_snipe:1'), buff('ซ่อนตัว', 'def', 0.7, 10, 40, 6, 'sk_wall:1')]),
      C('thrower', 'นักขว้าง', 'นักล่า', 6, 'cls_hunter:4', 'ขว้างระเบิดและมีด', [pSkill(15), pSpeed(10), pLoot(1)],
        [aoe('ขว้างระเบิด', 28, 2, 6, 4, 8, 'sk_fire:4'), shot('มีดสั้น', 15, 6, 0.5, 2, 'sk_shoot:4'), slow('ระเบิดควัน', 4, 6, 15, 8), stun('ระเบิดแสง', 3, 6, 3, 20, 10, 'sk_snipe:4')]),
      C('ninja', 'นินจา', 'นักล่า', 8, 'cls_ninja', 'เร็ว เงียบ วาร์ปได้', [pSpeed(25), pMelee(5), pSkill(10)],
        [shot('ดาวกระจาย', 15, 7, 0.4, 2, 'sk_shoot:5'), blink('ท่อนไม้แทนตัว', 7, 4, 6, 'sk_blink:5'), aoe('ระเบิดควันฟัน', 25, 2, 0, 6, 10, 'sk_fan:5'), buff('วิชาตัวเบา', 'speed', 1.8, 15, 40, 6, 'sk_dash:5')]),
      C('trapper', 'นักดักสัตว์', 'นักล่า', 10, 'cls_hunter:2', 'ทำให้ศัตรูขยับไม่ได้', [pLoot(2), pCoinKill(2), pGather(1)],
        [stun('กับดัก', 2, 6, 5, 12, 8, 'sk_snipe:2'), slow('ตาข่าย', 4, 8, 12, 8), shot('ยิงขาสัตว์', 18, 8, 1, 3, 'sk_shoot:2'), lure('เหยื่อล่อ', 3, 45, 10)]),
      C('ranger', 'เรนเจอร์', 'นักล่า', 12, 'cls_hunter:1', 'ผู้พิทักษ์ป่า ธนูและธรรมชาติ', [pSpeed(15), pGather(2), pRegen(1.5)],
        [shot('ธนูป่า', 20, 9, 0.7, 2, 'sk_shoot:2'), aoe('ฝนธนูใหญ่', 22, 3, 8, 8, 14, 'sk_rain:2'), gather('รู้จักป่า', 5, 12, 6, 'sk_reap:2'), heal('พักริมธาร', { hp: 25, energy: 15 }, 60, 0, 'sk_vigor:2')]),
      C('commando', 'ทหารพราน', 'นักล่า', 15, 'cls_gunner:3', 'ยิงรัวและระเบิด', [pSkill(25), pDef(15), pLoot(1)],
        [shot('ยิงรัว', 10, 8, 0.3, 1, 'sk_shoot:3'), aoe('ระเบิดมือ', 40, 2.5, 7, 6, 12, 'sk_fire:4'), dash('กลิ้งหลบ', 5, 3, 4, 'sk_dash:3'), buff('เกราะกันกระสุน', 'shield', 50, 30, 60, 10, 'sk_wall:3')]),
      C('bounty', 'นักล่าค่าหัว', 'นักล่า', 20, 'cls_gunner:5', 'ทุกการล่าคือเงิน', [pCoinKill(10), pLoot(2), pSkill(30), pSpeed(15)],
        [shot('กระสุนเงิน', 50, 10, 3, 6, 'sk_snipe:5'), aoe('ยิงคู่', 25, 4, 0, 6, 10, 'sk_fan:5'), find('เรดาร์ค่าหัว', 'mob', 10), lure('ประกาศจับ', 4, 60, 15)]),
    );

    // ================= 6) สนับสนุน / รักษา =================
    cls.push(
      C('doctor', 'หมอ', 'สนับสนุน', 1, 'cls_doctor', 'รักษาตัวเองและเพื่อน', [pRegen(2), pHyg(30), pFood(10)],
        [heal('ปฐมพยาบาล', { hp: 35 }, 30, 8, 'sk_vigor:3'), healArea('รักษาหมู่', 25, 4, 90, 15), heal('วิตามิน', { energy: 20, hunger: 10 }, 120, 0), buff('ผ้าพันแผล', 'regen', 2, 30, 60, 6, 'sk_vigor:3')]),
      C('nurse', 'พยาบาล', 'สนับสนุน', 1, 'cls_doctor:3', 'ดูแลใกล้ชิด ฟื้นตัวเร็ว', [pRegen(1.5), pHyg(25), pEnergy(15)],
        [heal('ฉีดยา', { hp: 25 }, 20, 5, 'sk_vigor:3'), healArea('ดูแลคนไข้', 15, 3, 60, 10), heal('อาบน้ำอุ่น', { hygiene: 40 }, 90, 0, 'sk_water:1'), buff('กำลังใจ', 'regen', 1, 60, 90, 4, 'sk_vigor')]),
      C('monk', 'นักบวช', 'สนับสนุน', 3, 'cls_monk', 'สงบนิ่ง ฟื้นพลัง ป้องกันตัว', [pEnergy(30), pDef(15), pFun(20)],
        [heal('นั่งสมาธิ', { energy: 30, hp: 15 }, 60, 0, 'sk_vigor:1'), buff('เกราะบุญ', 'shield', 40, 30, 60, 8, 'sk_wall:4'), push('คลื่นสงบ', 3, 3, 10, 6), healArea('แผ่เมตตา', 20, 5, 90, 12)]),
      C('bard', 'นักดนตรี', 'สนับสนุน', 5, 'cls_bard', 'เสียงเพลงเพิ่มความสุขทุกคน', [pFun(50), pXp(10), pSell(10)],
        [funArea('บรรเลงเพลง', 25, 6, 60, 8), buff('เพลงมาร์ช', 'speed', 1.4, 30, 60, 8, 'sk_dash:4'), slow('เพลงกล่อม', 5, 8, 20, 10, 'sk_rain:5'), healArea('เพลงรักษาใจ', 15, 5, 90, 10)]),
      C('priest', 'พระ', 'สนับสนุน', 6, 'cls_monk:4', 'พลังศรัทธา ปกป้องและฟื้นฟู', [pRegen(2), pDef(20), pFaint(70)],
        [healArea('อวยพร', 30, 5, 60, 15), buff('แสงศักดิ์สิทธิ์', 'def', 0.5, 20, 60, 8, 'sk_vigor:4'), aoe('แสงลงทัณฑ์', 25, 2.5, 6, 6, 10, 'sk_fire:4'), warp('กลับวัด', 'town', 60, 5)]),
      C('cheer', 'ผู้ให้กำลังใจ', 'สนับสนุน', 8, 'cls_bard:3', 'ยิ่งอยู่ด้วยกันยิ่งแข็งแกร่ง', [pFun(30), pXp(20), pEnergy(10)],
        [buff('เชียร์!', 'dmg', 1.4, 30, 60, 6, 'sk_vigor:3'), funArea('ปอมปอม', 20, 5, 60, 6), buff('สู้ ๆ นะ', 'xp', 1.5, 120, 300, 8, 'sk_vigor:1'), healArea('กอดปลอบ', 15, 4, 60, 8)]),
      C('coach', 'ครูฝึก', 'สนับสนุน', 10, 'cls_monk:3', 'ฝึกฝนให้ทุกคนเก่งขึ้น', [pXp(35), pMelee(3), pEnergy(15)],
        [buff('ซ้อมหนัก', 'xp', 2, 120, 300, 10, 'sk_vigor:1'), buff('วอร์มอัป', 'speed', 1.3, 60, 90, 6, 'sk_dash:2'), heal('พักครึ่ง', { energy: 35 }, 120, 0, 'sk_vigor:4'), aoe('ท่าฝึกสู้', 20, 2, 0, 5, 6, 'sk_fan:2')]),
      C('psych', 'นักจิตวิทยา', 'สนับสนุน', 12, 'cls_doctor:5', 'สุขภาพใจดี ทุกอย่างดีตาม', [pFun(60), pRegen(1.5), pHunger(10)],
        [heal('บำบัดใจ', { fun: 40, energy: 10 }, 60, 4, 'sk_vigor:5'), funArea('กลุ่มบำบัด', 30, 5, 90, 10), stun('สะกดจิต', 3, 6, 4, 20, 10, 'sk_snipe:5'), buff('ใจสงบ', 'def', 0.4, 30, 60, 6, 'sk_wall:5')]),
      C('dancer', 'นักเต้น', 'สนับสนุน', 15, 'cls_bard:5', 'เคลื่อนไหวสวยงามและว่องไว', [pSpeed(20), pFun(40), pEnergy(15)],
        [funArea('โชว์เต้น', 30, 6, 60, 8), dash('หมุนตัว', 5, 3, 4, 'sk_dash:5'), aoe('เตะระบำ', 20, 2, 0, 4, 6, 'sk_fan:5'), buff('จังหวะเร็ว', 'speed', 1.6, 20, 45, 6, 'sk_dash:5')]),
      C('saint', 'นักบุญ', 'สนับสนุน', 20, 'cls_monk:1', 'ปาฏิหาริย์ฟื้นฟูทุกสิ่ง', [pRegen(3), pDef(30), pFaint(100), pFun(30)],
        [healArea('ปาฏิหาริย์', 60, 6, 90, 20), buff('เกราะเทวดา', 'shield', 100, 30, 60, 12, 'sk_wall:4'), heal('ฟื้นคืน', { hp: 100, energy: 50, hunger: 30 }, 300, 0, 'sk_vigor:4'), stun('แสงสว่าง', 5, 0, 4, 25, 12, 'sk_snipe:4')]),
    );

    // ================= 7) ค้าขาย / เศรษฐกิจ =================
    cls.push(
      C('merchant', 'พ่อค้า', 'ค้าขาย', 1, 'cls_merchant', 'ซื้อถูก ขายแพง เปิดร้านได้ทุกที่', [pSell(15), pBuy(10)],
        [panel('ร้านค้าเคลื่อนที่', 'shop', 60), coins('กำไรวันนี้', 30, 600), treasure('ของฝากลูกค้า', [['bread', 1, 2], ['seed_carrot', 2, 4], ['wood', 5, 10]], 240), buff('พูดเก่ง', 'yield', 1, 60, 180, 5, 'sk_reap:4')]),
      C('collector', 'นักสะสม', 'ค้าขาย', 1, 'cls_merchant:2', 'เก็บทุกอย่างได้เยอะกว่าใคร', [pGather(2), pLoot(1), pOre(10)],
        [gather('กวาดเก็บ', 4, 10, 6), treasure('ของเก่ามีค่า', [['ore', 2, 4], ['flower', 3, 5], ['essence', 1, 1]], 240), find('ตามหาแร่', 'bigrock', 20), buff('ตาแหลม', 'loot', 2, 60, 180, 6, 'sk_snipe:2')]),
      C('shopkeeper', 'เจ้าของร้าน', 'ค้าขาย', 3, 'cls_merchant:4', 'ต่อรองเก่ง ของทุกอย่างถูกลง', [pBuy(25), pSell(10), pRecipe(10)],
        [panel('เปิดร้าน', 'shop', 30), coins('ปิดยอด', 40, 600), buff('ลดราคาพิเศษ', 'yield', 1, 60, 180, 5, 'sk_reap:4'), heal('ชากาแฟหน้าร้าน', { energy: 15, fun: 10 }, 90, 0)]),
      C('goldsmith', 'ช่างทอง', 'ค้าขาย', 5, 'cls_merchant:5', 'แปลงแร่เป็นเงินทอง', [pOre(30), pSell(20)],
        [convert('หลอมแร่ทอง', 'ore', 'essence', [6, 1], 60, 8, 'sk_fire:5'), coins('ขายเครื่องประดับ', 60, 600), quarry('เจาะสายแร่', 2, 3, 30, 12, 'sk_quarry:5', 2), find('หาสายแร่', 'bigrock', 15)]),
      C('investor', 'นักลงทุน', 'ค้าขาย', 6, 'cls_merchant:1', 'เงินทำงานแทนคุณ', [pSell(20), pBuy(15), pXp(5)],
        [coins('ปันผล', 80, 900), coins('ดอกเบี้ย', 25, 300), buff('ข่าววงใน', 'xp', 1.5, 120, 300, 5, 'sk_vigor:1'), panel('โบรกเกอร์', 'shop', 60)]),
      C('negotiator', 'นักเจรจา', 'ค้าขาย', 8, 'cls_merchant:3', 'พูดจนมอนสเตอร์ยอมถอย', [pBuy(30), pSell(15), pFun(20)],
        [stun('เจรจา', 3, 5, 4, 20, 8, 'sk_snipe:3'), slow('ยื้อเวลา', 4, 8, 20, 8), coins('ค่านายหน้า', 35, 600), panel('ตลาดกลาง', 'shop', 45)]),
      C('auctioneer', 'นักประมูล', 'ค้าขาย', 10, 'cls_merchant:2', 'ขายทุกอย่างได้ราคาสูงสุด', [pSell(40), pFun(10)],
        [buff('เคาะประมูล', 'yield', 2, 60, 240, 8, 'sk_reap:4'), coins('ค่าธรรมเนียม', 50, 600), panel('ห้องประมูล', 'shop', 30), funArea('บรรยากาศคึกคัก', 15, 5, 90, 6)]),
      C('banker', 'นักการธนาคาร', 'ค้าขาย', 12, 'cls_merchant:1', 'เงินเดือนมั่นคง ไม่เสียเหรียญตอนเป็นลม', [pFaint(100), pSell(15), pBuy(15)],
        [coins('เงินเดือน', 120, 1200), coins('โบนัส', 40, 300), buff('ตู้เซฟ', 'shield', 50, 30, 90, 8, 'sk_wall:1'), warp('กลับสำนักงาน', 'town', 60, 5)]),
      C('caravan', 'พ่อค้าเร่', 'ค้าขาย', 15, 'cls_merchant:3', 'เดินทางค้าขายทั่วโลก', [pVeh(30), pSell(25), pSpeed(10)],
        [panel('เกวียนสินค้า', 'shop', 30), buff('ม้าเร็ว', 'speed', 1.5, 30, 60, 6, 'sk_dash:3'), warp('กลับตลาด', 'town', 45, 5), coins('กำไรทางไกล', 70, 600)]),
      C('tycoon', 'มหาเศรษฐี', 'ค้าขาย', 20, 'cls_merchant:5', 'เงินไม่ใช่ปัญหา', [pSell(50), pBuy(40), pFaint(100), pCoinKill(8)],
        [coins('เงินปันผลใหญ่', 300, 1800), panel('ห้างของฉัน', 'shop', 20), buff('ทีมงานลูกน้อง', 'loot', 3, 60, 180, 8, 'sk_snipe:5'), treasure('ของขวัญวีไอพี', [['essence', 1, 2], ['ore', 5, 10], ['soup', 1, 2]], 300)]),
    );

    // ================= 8) อาหาร =================
    cls.push(
      C('chef', 'เชฟ', 'อาหาร', 1, 'cls_chef', 'ทำอาหารได้ทุกที่ อาหารฟื้นฟูมากกว่า', [pCook(1), pFood(30), pHunger(20)],
        [panel('ครัวเคลื่อนที่', 'cook', 30), heal('ชิมอาหาร', { hunger: 25, fun: 10 }, 60, 0, 'sk_vigor:4'), buff('เมนูพิเศษ', 'regen', 1.5, 60, 120, 6, 'sk_vigor:3'), aoe('กระทะฟาด', 15, 1.5, 0, 4, 5, 'sk_wall:3')]),
      C('baker', 'คนอบขนม', 'อาหาร', 1, 'cls_chef:4', 'ขนมปังไม่มีวันหมด', [pCook(1), pFood(15), pFun(15)],
        [convert('อบขนมปัง', 'rice', 'bread', [2, 2], 20, 4, 'sk_fire:4'), heal('ขนมอุ่น ๆ', { hunger: 30, fun: 10 }, 90, 0, 'sk_vigor:4'), funArea('กลิ่นขนมหอม', 15, 5, 90, 6), panel('เตาอบ', 'cook', 45)]),
      C('grill', 'พ่อครัวป่า', 'อาหาร', 3, 'cls_chef:3', 'ย่างได้ทุกที่ อยู่ป่าได้สบาย', [pFood(20), pHunger(25), pLight(2)],
        [panel('ก่อไฟย่าง', 'cook', 30), heal('เนื้อย่าง', { hunger: 35, hp: 10 }, 90, 0, 'sk_fire:3'), buff('ไฟกองใหญ่', 'light', 1, 120, 150, 5, 'sk_fire'), gather('หาวัตถุดิบป่า', 4, 12, 6, 'sk_reap:2')]),
      C('barista', 'บาริสต้า', 'อาหาร', 5, 'cls_chef:1', 'กาแฟทำให้ทุกคนตื่นตัว', [pEnergy(35), pFun(15), pSpeed(5)],
        [heal('เอสเปรสโซ', { energy: 30, fun: 5 }, 60, 0, 'sk_vigor:1'), buff('คาเฟอีน', 'speed', 1.4, 30, 60, 4, 'sk_dash:1'), healArea('ลาเต้ให้เพื่อน', 10, 4, 60, 6), funArea('ลาเต้อาร์ต', 20, 4, 90, 6)]),
      C('somtam', 'แม่ค้าส้มตำ', 'อาหาร', 6, 'cls_chef:2', 'แซ่บทุกครก ขายดีเทน้ำเทท่า', [pCook(2), pSell(20), pFood(15)],
        [convert('ตำส้มตำ', 'chili', 'somtam', [2, 1], 20, 4, 'sk_quarry:3'), aoe('สาดน้ำปลาร้า', 12, 2, 4, 5, 6, 'sk_fire:2'), heal('ส้มตำแซ่บ', { hunger: 30, fun: 20 }, 90, 0, 'sk_vigor:3'), panel('ครกเคลื่อนที่', 'cook', 30)]),
      C('nutrition', 'นักโภชนาการ', 'อาหาร', 8, 'cls_doctor:2', 'กินถูกวิธี ร่างกายแข็งแรง', [pFood(40), pRegen(1.5), pHunger(30)],
        [heal('อาหารครบ 5 หมู่', { hunger: 30, hp: 20, energy: 10 }, 90, 0, 'sk_vigor:2'), buff('โปรตีน', 'dmg', 1.3, 60, 120, 5, 'sk_vigor:3'), healArea('แจกผลไม้', 15, 4, 90, 8), buff('ผักเยอะ ๆ', 'regen', 1.5, 60, 120, 5, 'sk_grow')]),
      C('soup', 'คนต้มซุป', 'อาหาร', 10, 'cls_chef:5', 'ซุปร้อน ๆ ฟื้นฟูทุกอย่าง', [pCook(2), pFood(25), pHyg(15)],
        [convert('ต้มซุปฟักทอง', 'pumpkin', 'soup', [1, 3], 30, 6, 'sk_fire:5'), healArea('แจกซุป', 25, 5, 90, 10), heal('ซุปร้อน', { hunger: 40, hp: 15, hygiene: 10 }, 90, 0, 'sk_vigor:5'), panel('หม้อซุปใหญ่', 'cook', 30)]),
      C('taster', 'นักชิม', 'อาหาร', 12, 'cls_chef:2', 'รู้รสทุกอย่าง อาหารมีผลมากกว่า', [pFood(60), pFun(30), pXp(10)],
        [heal('ชิมทุกจาน', { hunger: 30, fun: 30 }, 60, 0, 'sk_vigor:4'), treasure('ของฝากร้านดัง', [['salad', 1, 1], ['fried_rice', 1, 1], ['somtam', 1, 1]], 300), funArea('รีวิวร้านอร่อย', 20, 5, 90, 6), buff('ลิ้นทอง', 'xp', 1.4, 120, 300, 5, 'sk_vigor:1')]),
      C('caterer', 'ผู้จัดเลี้ยง', 'อาหาร', 15, 'cls_chef:3', 'เลี้ยงคนทั้งหมู่บ้าน', [pCook(3), pSell(15), pFun(20)],
        [healArea('บุฟเฟต์', 30, 6, 120, 15), funArea('งานเลี้ยง', 30, 6, 120, 10), panel('ครัวใหญ่', 'cook', 20), convert('ผัดข้าวหม้อใหญ่', 'rice', 'fried_rice', [3, 2], 30, 6, 'sk_fire:4')]),
      C('michelin', 'เชฟมิชลิน', 'อาหาร', 20, 'cls_chef:5', 'สุดยอดเชฟ อาหารทุกจานคือยาวิเศษ', [pCook(4), pFood(80), pSell(40), pHunger(30)],
        [panel('ครัวมิชลิน', 'cook', 10), heal('จานซิกเนเจอร์', { hunger: 60, hp: 40, fun: 30 }, 120, 0, 'sk_vigor:5'), healArea('เชฟเทเบิล', 40, 6, 120, 15), buff('พลังอาหารเลิศรส', 'dmg', 1.5, 60, 120, 6, 'sk_vigor:3')]),
    );

    // ================= 9) สำรวจ / เดินทาง =================
    cls.push(
      C('explorer', 'นักสำรวจ', 'สำรวจ', 1, 'cls_explorer', 'เดินไกล หาของเจอ กลับบ้านง่าย', [pSpeed(15), pEnergy(15), pHome()],
        [find('เข็มทิศหาแร่', 'bigrock', 15), buff('เดินเร็ว', 'speed', 1.5, 30, 60, 6, 'sk_dash:2'), warp('กลับบ้านทันที', 'home', 45, 5), heal('เสบียง', { hunger: 20, energy: 15 }, 90, 0)]),
      C('traveler', 'นักเดินทาง', 'สำรวจ', 1, 'cls_explorer:3', 'ท่องโลกไม่รู้เหนื่อย', [pSpeed(10), pEnergy(25), pHunger(15)],
        [dash('ก้าวยาว', 5, 4, 4), warp('กลับเมือง', 'town', 45, 5), find('หาแหล่งน้ำ', 'water', 15), buff('เท้าเบา', 'speed', 1.4, 45, 90, 5, 'sk_dash:3')]),
      C('sailor', 'กะลาสี', 'สำรวจ', 3, 'cls_explorer:1', 'เจ้าทะเล เรือเร็ว ว่ายน้ำไว', [pVeh(25), pSwim(60), pHyg(20)],
        [buff('ลมส่งเรือ', 'speed', 1.6, 30, 60, 6, 'sk_dash:1'), find('หาชายฝั่ง', 'water', 10), aoe('สมอฟาด', 20, 1.5, 0, 4, 6, 'sk_wall:1'), heal('เหล้ารัม', { fun: 20, energy: 10 }, 90, 0, 'sk_vigor:1')]),
      C('climber', 'นักปีนเขา', 'สำรวจ', 5, 'cls_explorer:2', 'ภูเขาคือบ้าน หินคือเพื่อน', [pStone(1), pOre(10), pEnergy(20)],
        [blink('โหนเชือก', 5, 5, 6, 'sk_blink:2'), quarry('ปีนสกัดหิน', 1, 3, 20, 10, 'sk_quarry', 1), buff('ปอดเหล็ก', 'speed', 1.3, 45, 90, 5, 'sk_dash:2'), heal('พักบนยอด', { energy: 25, fun: 15 }, 90, 0)]),
      C('driver', 'นักแข่งรถ', 'สำรวจ', 6, 'cls_explorer:4', 'เร็วที่สุดบนถนน', [pVeh(50), pSpeed(10)],
        [buff('ไนตรัส', 'speed', 1.8, 15, 45, 8, 'sk_dash:4'), dash('ดริฟท์', 6, 4, 5, 'sk_dash:4'), push('บีบแตร', 3, 3, 10, 5), warp('กลับอู่', 'home', 60, 5)]),
      C('cartographer', 'นักแผนที่', 'สำรวจ', 8, 'cls_explorer:5', 'รู้ทุกทาง หาทุกอย่างเจอ', [pXp(15), pSpeed(10), pHome()],
        [find('หาต้นไม้', 'tree', 10), find('หาหิน', 'rock', 10), find('หาผู้เล่น', 'player', 20), warp('ทางลัดกลับเมือง', 'town', 30, 4)]),
      C('pilot', 'นักบิน', 'สำรวจ', 12, 'cls_explorer:1', 'ท้องฟ้าคือขีดจำกัด', [pVeh(60), pSpeed(10), pEnergy(10)],
        [blink('โดดร่ม', 10, 6, 8, 'sk_blink:1'), buff('เทอร์โบ', 'speed', 1.7, 20, 60, 8, 'sk_dash:1'), find('เรดาร์', 'mob', 15), warp('บินกลับฐาน', 'home', 45, 5)]),
      C('runner', 'นักวิ่ง', 'สำรวจ', 10, 'cls_explorer:3', 'ขาคือทุกอย่าง', [pSpeed(35), pEnergy(20), pHunger(-10)],
        [buff('สปรินต์', 'speed', 2, 10, 30, 6, 'sk_dash:3'), dash('พุ่งออกตัว', 6, 3, 4, 'sk_dash:3'), heal('น้ำเกลือแร่', { energy: 30 }, 90, 0, 'sk_water:1'), push('วิ่งชน', 2, 3, 8, 4)]),
      C('diver', 'นักดำน้ำ', 'สำรวจ', 15, 'cls_explorer:1', 'ใต้น้ำคือสนามเด็กเล่น', [pSwim(120), pHyg(40), pVeh(20)],
        [blink('ดำผ่านน้ำ', 8, 5, 6, 'sk_blink:1'), heal('อาบน้ำทะเล', { hygiene: 50, fun: 15 }, 90, 0, 'sk_water:1'), treasure('สมบัติใต้น้ำ', [['ore', 2, 5], ['coconut', 2, 4], ['essence', 1, 1]], 240), slow('คลื่นซัด', 4, 6, 15, 8, 'sk_rain:1')]),
      C('adventurer', 'นักผจญภัย', 'สำรวจ', 20, 'cls_explorer:5', 'ทำได้ทุกอย่างในโลกกว้าง', [pSpeed(25), pLoot(1), pXp(20), pHome()],
        [blink('ตะขอเกี่ยว', 9, 4, 6, 'sk_blink:2'), aoe('แส้ฟาด', 30, 2, 4, 4, 8, 'sk_fan:2'), treasure('ขุดสมบัติ', [['essence', 1, 2], ['ore', 4, 8], ['soup', 1, 1]], 240), buff('หัวใจนักผจญภัย', 'xp', 1.6, 120, 300, 8, 'sk_vigor:1')]),
    );

    // ================= 10) เหมือง / ทรัพยากร =================
    cls.push(
      C('miner', 'นักขุดเหมือง', 'ทรัพยากร', 1, 'cls_miner', 'ขุดหินได้เยอะ เจอแร่บ่อย', [pStone(2), pOre(20), pTool(1)],
        [quarry('ขุดระเบิด', 2, 3, 25, 12, 'sk_quarry', 1), find('หาแร่', 'bigrock', 15), buff('ไฟหมวก', 'light', 1, 120, 150, 4, 'sk_fire'), heal('พักกินข้าวกล่อง', { hunger: 20, energy: 15 }, 90, 0)]),
      C('lumberjack', 'คนตัดไม้', 'ทรัพยากร', 1, 'cls_miner:2', 'ไม้เยอะ ขวานแรง', [pWood(2), pTool(1), pMelee(2)],
        [quarry('โค่นป่า', 2, 3, 25, 12, 'sk_quarry:2', 2), aoe('เหวี่ยงขวาน', 20, 1.8, 0, 4, 6, 'sk_fan:2'), find('หาต้นไม้ใหญ่', 'tree', 10), buff('แรงคนป่า', 'dmg', 1.4, 30, 60, 6, 'sk_vigor:2')]),
      C('geologist', 'นักธรณีวิทยา', 'ทรัพยากร', 3, 'cls_miner:3', 'รู้ว่าแร่อยู่ตรงไหน', [pOre(35), pStone(1), pXp(10)],
        [find('สแกนชั้นหิน', 'bigrock', 8), quarry('เจาะสำรวจ', 1, 4, 15, 8, 'sk_quarry:3', 2), convert('สกัดแร่จากหิน', 'stone', 'ore', [6, 1], 20, 6, 'sk_quarry:3'), buff('ตาเพชร', 'loot', 1, 60, 180, 5, 'sk_snipe:3')]),
      C('quarrier', 'คนงานเหมืองหิน', 'ทรัพยากร', 5, 'cls_miner:1', 'ทุบหินเป็นอาชีพ', [pStone(3), pTool(2), pDef(10)],
        [quarry('ทุบหินใหญ่', 2, 3, 20, 10, 'sk_quarry:1', 3), aoe('ค้อนกระแทก', 25, 2, 0, 5, 8, 'sk_quarry:1'), convert('บดหินเป็นทางเดิน', 'stone', 'path', [1, 8], 10, 3, 'sk_floor:1'), buff('หลังแข็ง', 'def', 0.4, 30, 60, 5, 'sk_wall:1')]),
      C('demolisher', 'นักระเบิด', 'ทรัพยากร', 6, 'cls_miner:4', 'บูม! ทุกอย่างหายไปในพริบตา', [pStone(2), pOre(15), pSkill(20)],
        [quarry('ระเบิดใหญ่', 3, 5, 40, 20, 'sk_quarry:3', 1), aoe('ไดนาไมต์', 40, 2.5, 6, 6, 12, 'sk_fire:4'), push('แรงระเบิด', 4, 5, 12, 8), stun('ระเบิดสั่น', 3, 5, 3, 20, 10, 'sk_snipe:4')]),
      C('scavenger', 'คนหาของเก่า', 'ทรัพยากร', 8, 'cls_miner:5', 'ของทุกชิ้นมีค่า', [pGather(2), pLoot(2), pSell(10)],
        [gather('คุ้ยหา', 5, 10, 6, 'sk_reap:5'), treasure('ของเก่า', [['ore', 1, 3], ['wood', 5, 10], ['stone', 5, 10]], 180), find('หาพุ่มเบอร์รี่', 'bush', 10), buff('ตาไว', 'loot', 2, 60, 180, 6, 'sk_snipe:5')]),
      C('mushroomer', 'คนเก็บเห็ด', 'ทรัพยากร', 10, 'cls_miner:2', 'ป่าเป็นตู้กับข้าว', [pGather(3), pFood(15), pHunger(15)],
        [gather('เก็บเห็ดทั้งป่า', 6, 10, 6, 'sk_reap:2'), poison('เห็ดพิษ', 6, 6, 5, 8, 6), heal('ซุปเห็ด', { hunger: 30, hp: 10 }, 90, 0, 'sk_vigor:2'), find('ดมหาเห็ด', 'bush', 10)]),
      C('gemcutter', 'ช่างเจียระไน', 'ทรัพยากร', 12, 'cls_miner:5', 'หินธรรมดากลายเป็นอัญมณี', [pOre(40), pSell(25)],
        [convert('เจียระไน', 'ore', 'essence', [5, 1], 45, 8, 'sk_fire:5'), coins('ขายอัญมณี', 60, 600), quarry('สกัดพลอย', 2, 3, 25, 12, 'sk_quarry:5', 2), buff('แสงพลอย', 'light', 1, 120, 150, 4, 'sk_vigor:5')]),
      C('prospector', 'นักสำรวจแร่', 'ทรัพยากร', 15, 'cls_miner:3', 'ไม่มีแร่ไหนหลุดสายตา', [pOre(50), pStone(2), pSpeed(10)],
        [find('เครื่องตรวจแร่', 'bigrock', 5), quarry('ขุดสายแร่', 2, 4, 20, 12, 'sk_quarry:3', 3), blink('โรยตัวลงเหมือง', 6, 6, 6, 'sk_blink:3'), treasure('แร่หายาก', [['ore', 5, 10], ['essence', 1, 2]], 240)]),
      C('mine_boss', 'เจ้าของเหมือง', 'ทรัพยากร', 20, 'cls_miner:4', 'ทรัพยากรทั้งภูเขาเป็นของคุณ', [pStone(4), pWood(3), pOre(60), pTool(3)],
        [quarry('ระเบิดภูเขา', 4, 5, 45, 25, 'sk_quarry:4', 3), convert('โรงถลุง', 'stone', 'ore', [4, 1], 15, 6, 'sk_fire:4'), coins('ผลผลิตเหมือง', 150, 900), buff('หมวกนิรภัย', 'shield', 80, 30, 90, 8, 'sk_wall:4')]),
    );

    // ---------- finalize ----------
    const map = {};
    for (const c of cls) { map[c.id] = c; c.skills.forEach((sk, i) => { sk.id = c.id + '_' + i; }); }
    D.CLASSES = map;
    D.CLASS_LIST = cls;
    D.FAMILIES = [...new Set(cls.map(c => c.family))];
    return map;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = build;
  else build(root.DEFS);
})(typeof window !== 'undefined' ? window : globalThis);
