/* ==========================================================
   Kuak World - era item generator: 100 items per era (5 eras)
   Adds to D: ITEMS, OBJ, TILES, RECIPES, COOKING, VEHICLES, MELEE, ERA_ITEMS
   Objects use { shape, pal } so sprites.js can recolor base shapes.
   ========================================================== */
(function (root) {
  function build(D) {
    const ERAS = D.ERAS.map(e => e.id);
    const eraLv = { stone: [1, 4], iron: [5, 9], medieval: [10, 14], industrial: [15, 19], modern: [20, 25] };
    D.ERA_ITEMS = { stone: [], iron: [], medieval: [], industrial: [], modern: [] };
    let nextTile = 15;
    const sh = (hex, f) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; } return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); };

    // ---------------- era materials (crafted from base resources) ----------------
    // [id, th, color, cost, out]
    const MATS = {
      stone:      [['rope', 'เชือก', '#c9a063', { wood: 2 }, 2], ['clay', 'ดินเหนียว', '#b0704a', { stone: 2 }, 2], ['straw', 'ฟาง', '#e9d27a', { wood: 1 }, 3], ['hide', 'หนังแห้ง', '#a0663a', { gel: 1, wood: 1 }, 2]],
      iron:       [['bronze', 'สำริด', '#c8863c', { ore: 1, stone: 1 }, 2], ['ironbar', 'แผ่นเหล็ก', '#8f9aa8', { ore: 2 }, 1], ['brick', 'อิฐ', '#b5493c', { stone: 2, clay: 1 }, 3], ['linen', 'ผ้าลินิน', '#efe6cf', { straw: 2 }, 2]],
      medieval:   [['steel', 'เหล็กกล้า', '#6c7a89', { ore: 3 }, 1], ['glass', 'กระจก', '#9fd8ff', { stone: 3 }, 2], ['silk', 'ผ้าไหม', '#e26aa4', { flower: 2, rope: 1 }, 2], ['marble', 'หินอ่อน', '#e8e6e1', { stone: 4 }, 1]],
      industrial: [['gear', 'เฟือง', '#b08d57', { steel: 1, ore: 1 }, 2], ['pipe', 'ท่อเหล็ก', '#5b6673', { steel: 2 }, 3], ['cement', 'ซีเมนต์', '#a9a9a9', { stone: 3, clay: 1 }, 3], ['rubber', 'ยาง', '#2f2f2f', { gel: 2 }, 2]],
      modern:     [['plastic', 'พลาสติก', '#f2f2f2', { gel: 2, ore: 1 }, 3], ['circuit', 'วงจรไฟฟ้า', '#2e9e5b', { ore: 2, essence: 1 }, 1], ['screen', 'หน้าจอ', '#1b2a44', { glass: 2, circuit: 1 }, 1], ['carbon', 'คาร์บอนไฟเบอร์', '#1b1b1b', { steel: 2, essence: 1 }, 1]],
    };
    // materials with per-era palettes for walls/floors/furniture (id refers to item that pays for it)
    const STYLE = {
      stone:      [['ไม้ดิบ', '#a97a3f', 'wood'], ['ไม้ไผ่', '#c9b46a', 'wood'], ['ดินเหนียว', '#b0704a', 'clay'], ['หินกอง', '#8f8f93', 'stone'], ['ฟาง', '#e9d27a', 'straw']],
      iron:       [['อิฐแดง', '#b5493c', 'brick'], ['สำริด', '#c8863c', 'bronze'], ['เหล็ก', '#8f9aa8', 'ironbar'], ['ไม้ขัด', '#c4914f', 'wood'], ['ลินิน', '#efe6cf', 'linen']],
      medieval:   [['หินอ่อน', '#e8e6e1', 'marble'], ['เหล็กกล้า', '#6c7a89', 'steel'], ['ไม้โอ๊ก', '#7a4a22', 'wood'], ['ผ้าไหม', '#e26aa4', 'silk'], ['กระจกสี', '#9fd8ff', 'glass']],
      industrial: [['ซีเมนต์', '#a9a9a9', 'cement'], ['ท่อเหล็ก', '#5b6673', 'pipe'], ['เฟือง', '#b08d57', 'gear'], ['ยาง', '#3a3a3a', 'rubber'], ['กระเบื้อง', '#d9e4ec', 'cement']],
      modern:     [['พลาสติก', '#f2f2f2', 'plastic'], ['คาร์บอน', '#1b1b1b', 'carbon'], ['กระจกใส', '#bfe3ff', 'glass'], ['นีออน', '#7cf2ff', 'circuit'], ['หินสังเคราะห์', '#c9c9d4', 'plastic']],
    };
    const ACCENT = ['#e63946', '#4b6bd6', '#43aa8b', '#f4a261', '#8e44ad', '#ffffff', '#222222', '#ff8fab'];
    const ACCENT_TH = ['แดง', 'น้ำเงิน', 'เขียว', 'ส้ม', 'ม่วง', 'ขาว', 'ดำ', 'ชมพู'];

    function addItem(era, id, def, recipe) {
      if (D.ITEMS[id]) return;
      def.era = era; D.ITEMS[id] = def; D.ERA_ITEMS[era].push(id);
      if (recipe) { const [lo, hi] = eraLv[era]; const lv = recipe.lv != null ? recipe.lv : lo + (D.ERA_ITEMS[era].length % (hi - lo + 1)); D.RECIPES.push({ id, out: id, n: recipe.n || 1, in: recipe.in, cat: recipe.cat || def.cat, lv }); }
    }
    function addObj(era, id, th, shape, pal, extra, cost, lv) {
      D.OBJ[id] = { th, solid: extra.solid !== false, hp: 1, tool: 'hammer', drops: [[id, 1, 1, 1]], build: true, h: extra.h || 1, use: extra.use, light: extra.light, gen: { shape, pal } };
      addItem(era, id, { th, cat: extra.cat || 'furn', stack: 99, obj: id }, { in: cost, n: extra.n || 1, cat: extra.cat || 'furn', lv });
    }
    function addFloor(era, id, th, pattern, a, b, cost, lv) {
      const tid = nextTile++;
      D.TILES[tid] = { n: id, th, walk: true, floor: true, gen: { pattern, a, b } };
      addItem(era, id, { th, cat: 'build', stack: 999, tile: tid }, { in: cost, n: 4, cat: 'build', lv });
    }

    for (const era of ERAS) {
      const [lo, hi] = eraLv[era]; const st = STYLE[era]; const m = MATS[era];
      const lvAt = (f) => Math.min(hi, lo + Math.floor((hi - lo) * f));
      // 1) materials (4)
      for (const [id, th, color, cost, out] of m) addItem(era, id, { th, cat: 'mat', stack: 999, color }, { in: cost, n: out, cat: 'mat', lv: lo });
      // 2) floors (10): 5 styles x 2 patterns
      st.forEach(([sth, col, pay], i) => {
        const pats = era === 'stone' ? ['plain', 'plank'] : era === 'iron' ? ['brick', 'plank'] : era === 'medieval' ? ['checker', 'diamond'] : era === 'industrial' ? ['tile', 'stripe'] : ['tile', 'checker'];
        pats.forEach((pat, j) => addFloor(era, `fl_${era}_${i}_${j}`, `พื้น${sth}${j ? ' ลาย' : ''}`, pat, col, sh(col, -0.18), { [pay]: 2 }, lvAt(0.1 + i * 0.05)));
      });
      // 3) walls (8): 5 styles + 3 accent-painted
      st.forEach(([sth, col, pay], i) => addObj(era, `wl_${era}_${i}`, `ผนัง${sth}`, 'wall', { c: col, b: sh(col, -0.35), B: sh(col, -0.5), C: sh(col, 0.15) }, { h: 2, cat: 'build', n: 2 }, { [pay]: 3 }, lvAt(0.1 + i * 0.05)));
      for (let k = 0; k < 3; k++) { const col = ACCENT[(k + ERAS.indexOf(era) * 2) % ACCENT.length]; addObj(era, `wlp_${era}_${k}`, `ผนังทาสี${ACCENT_TH[(k + ERAS.indexOf(era) * 2) % ACCENT.length]}`, 'wall', { c: col, b: sh(col, -0.35), B: sh(col, -0.5), C: sh(col, 0.2) }, { h: 2, cat: 'build', n: 2 }, { [st[0][2]]: 3, flower: 1 }, lvAt(0.3)); }
      // 4) doors, windows, fences, gates (8)
      for (let k = 0; k < 2; k++) { const [sth, col, pay] = st[k * 2]; addObj(era, `dr_${era}_${k}`, `ประตู${sth}`, 'door', { c: col, b: sh(col, -0.35), B: sh(col, -0.5), C: sh(col, 0.15), y: '#f7d94c' }, { h: 2, cat: 'build', solid: false }, { [pay]: 4 }, lvAt(0.15 + k * 0.2)); }
      for (let k = 0; k < 2; k++) { const [sth, col, pay] = st[k * 2 + 1]; addObj(era, `wn_${era}_${k}`, `หน้าต่าง${sth}`, 'window', { c: col, b: sh(col, -0.35), B: sh(col, -0.5), u: k ? '#bfe3ff' : '#4b6bd6' }, { h: 2, cat: 'build' }, (era === 'stone' || era === 'iron' ? { [pay]: 2 } : { [pay]: 2, glass: 1 }), lvAt(0.2 + k * 0.2)); }
      for (let k = 0; k < 2; k++) { const [sth, col, pay] = st[k * 3 % st.length]; addObj(era, `fc_${era}_${k}`, `รั้ว${sth}`, 'fence', { c: col, b: sh(col, -0.35), B: sh(col, -0.5) }, { cat: 'build', n: 4 }, { [pay]: 2 }, lvAt(0.1 + k * 0.3)); }
      for (let k = 0; k < 2; k++) { const [sth, col, pay] = st[k * 3 % st.length]; addObj(era, `gt_${era}_${k}`, `ประตูรั้ว${sth}`, 'gate', { c: col, b: sh(col, -0.35), B: sh(col, -0.5) }, { cat: 'build', solid: false }, { [pay]: 3 }, lvAt(0.1 + k * 0.3)); }
      // 5) furniture (30)
      const [s0, s1, s2, s3, s4] = st;
      for (let k = 0; k < 4; k++) { const col = ACCENT[(k * 2 + ERAS.indexOf(era)) % 8]; addObj(era, `bed_${era}_${k}`, `เตียง${s0[0]}ผ้า${ACCENT_TH[(k * 2 + ERAS.indexOf(era)) % 8]}`, 'bed', { b: sh(s0[1], -0.2), B: sh(s0[1], -0.45), r: col, x: sh(col, -0.3), w: '#ffffff', e: '#e0e0e0' }, { h: 2, use: 'sleep' }, { [s0[2]]: 6, [m[3][0]]: 2 }, lvAt(0.1 + k * 0.2)); }
      for (let k = 0; k < 4; k++) { const [sth, col, pay] = st[k % 5]; addObj(era, `ch_${era}_${k}`, `เก้าอี้${sth}`, 'chair', { c: col, b: sh(col, -0.35), B: sh(col, -0.5), C: sh(col, 0.15) }, { use: 'sit' }, { [pay]: 3 }, lvAt(0.05 + k * 0.2)); }
      for (let k = 0; k < 3; k++) { const [sth, col, pay] = st[(k + 1) % 5]; addObj(era, `tb_${era}_${k}`, `โต๊ะ${sth}`, 'table', { c: col, b: sh(col, -0.35), B: sh(col, -0.5), C: sh(col, 0.15) }, {}, { [pay]: 5 }, lvAt(0.1 + k * 0.25)); }
      for (let k = 0; k < 3; k++) { const col = ACCENT[(k * 3 + ERAS.indexOf(era)) % 8]; addObj(era, `sf_${era}_${k}`, `โซฟา${ACCENT_TH[(k * 3 + ERAS.indexOf(era)) % 8]}`, 'sofa', { u: col, U: sh(col, -0.3), b: sh(s0[1], -0.2), B: sh(s0[1], -0.45) }, { use: 'sit' }, { [s0[2]]: 4, [m[3][0]]: 3 }, lvAt(0.2 + k * 0.25)); }
      for (let k = 0; k < 3; k++) { const [sth, col, pay] = st[(k + 2) % 5]; addObj(era, `sh_${era}_${k}`, `ชั้นวาง${sth}`, 'shelf', { b: sh(col, -0.3), B: sh(col, -0.5), c: col }, { h: 2, use: 'read' }, { [pay]: 6 }, lvAt(0.2 + k * 0.25)); }
      for (let k = 0; k < 3; k++) { const [sth, col, pay] = st[(k + 3) % 5]; addObj(era, `cb_${era}_${k}`, `ตู้${sth}`, 'cabinet', { c: col, b: sh(col, -0.35), B: sh(col, -0.5), C: sh(col, 0.15), y: '#f7d94c' }, { h: 2 }, { [pay]: 6 }, lvAt(0.25 + k * 0.25)); }
      for (let k = 0; k < 4; k++) { const col = ACCENT[(k * 2 + 1 + ERAS.indexOf(era)) % 8]; addFloor(era, `rug_${era}_${k}`, `พรม${ACCENT_TH[(k * 2 + 1 + ERAS.indexOf(era)) % 8]}`, 'carpet', col, sh(col, -0.25), { [m[3][0]]: 2 }, lvAt(0.15 + k * 0.2)); }
      const lights = era === 'stone' ? [['brazier', 'กระถางไฟ', 5], ['torch2', 'คบไฟคู่', 4], ['stonelamp', 'โคมหิน', 4]] : era === 'iron' ? [['oillamp', 'ตะเกียงน้ำมัน', 5], ['candle', 'เชิงเทียน', 4], ['brazier', 'กระถางไฟสำริด', 6]] : era === 'medieval' ? [['chandelier', 'โคมระย้า', 7], ['lantern', 'โคมแขวน', 5], ['candle', 'เทียนคู่', 4]] : era === 'industrial' ? [['gaslamp', 'โคมแก๊ส', 7], ['lantern', 'ตะเกียงรถไฟ', 5], ['streetlamp', 'เสาไฟถนน', 8]] : [['ledlamp', 'โคม LED', 8], ['neon', 'ป้ายนีออน', 7], ['floorlamp', 'โคมตั้งพื้น', 6]];
      lights.forEach(([shape, th, light], k) => addObj(era, `lt_${era}_${k}`, th, shape, { h: '#ffe08a', H: '#ffb347', f: '#ff6b35', F: '#ffb347', z: sh(s1[1], -0.4), s: s1[1], u: era === 'modern' ? '#7cf2ff' : '#ffe08a' }, { h: shape === 'candle' || shape === 'brazier' ? 1 : 2, light, cat: 'build' }, { [s1[2]]: 2, [era === 'stone' ? 'wood' : m[0][0]]: 2 }, lvAt(0.1 + k * 0.3)));
      const appliances = era === 'stone' ? [['firepit', 'เตาหลุม', 'cook'], ['stonebath', 'บ่อน้ำหิน', 'bath'], ['strawmat', 'เสื่อฟาง', 'sit']] : era === 'iron' ? [['oven', 'เตาอิฐ', 'cook'], ['tub', 'ถังอาบน้ำ', 'bath'], ['anvil', 'ทั่งตีเหล็ก', null]] : era === 'medieval' ? [['hearth', 'เตาผิง', 'cook'], ['bathtub', 'อ่างหินอ่อน', 'bath'], ['throne', 'บัลลังก์', 'sit']] : era === 'industrial' ? [['stove', 'เตาแก๊ส', 'cook'], ['bathtub', 'อ่างเหล็กเคลือบ', 'bath'], ['radio', 'วิทยุ', 'tv']] : [['stove', 'เตาไฟฟ้า', 'cook'], ['bathtub', 'อ่างจากุซซี่', 'bath'], ['tv', 'ทีวีจอใหญ่', 'tv']];
      appliances.forEach(([shape, th, use], k) => addObj(era, `ap_${era}_${k}`, th, shape, { s: s1[1], S: sh(s1[1], 0.2), g: sh(s1[1], -0.1), G: sh(s1[1], -0.4), e: '#ececec', E: '#c8c8c8', u: '#4b8fe0', z: '#222', c: s0[1], b: sh(s0[1], -0.3), B: sh(s0[1], -0.5) }, { use: use || undefined, h: shape === 'tv' || shape === 'radio' ? 1 : 1 }, { [s1[2]]: 5, [m[1][0]]: 2 }, lvAt(0.3 + k * 0.25)));
      // 6) decor (16)
      const decor = era === 'stone' ? [['totem', 'เสาโทเท็ม', 2], ['skullpole', 'เสากะโหลก', 2], ['potplant', 'กระถางดิน', 1], ['rockpile', 'กองหิน', 1], ['drum', 'กลองหนัง', 1], ['stonestatue', 'รูปสลักหิน', 2], ['bonehang', 'เครื่องรางกระดูก', 1], ['cavepaint', 'ภาพผนังถ้ำ', 2]]
        : era === 'iron' ? [['statue', 'รูปปั้นสำริด', 2], ['vase', 'แจกันดินเผา', 1], ['barrel', 'ถังไม้', 1], ['crate', 'ลังไม้', 1], ['banner', 'ธงลินิน', 2], ['shield', 'โล่ประดับ', 2], ['bell', 'ระฆังสำริด', 2], ['weaponrack', 'ชั้นอาวุธ', 2]]
        : era === 'medieval' ? [['knightarmor', 'ชุดเกราะอัศวิน', 2], ['painting', 'ภาพวาดสีน้ำมัน', 2], ['tapestry', 'พรมผนัง', 2], ['fountain', 'น้ำพุหินอ่อน', 2], ['bookstand', 'แท่นคัมภีร์', 1], ['harp', 'พิณ', 1], ['globe', 'ลูกโลก', 1], ['candelabra', 'เชิงเทียนใหญ่', 2]]
        : era === 'industrial' ? [['clocktower', 'นาฬิกาตั้งพื้น', 2], ['steamengine', 'เครื่องจักรไอน้ำ', 2], ['gearwheel', 'ล้อเฟืองยักษ์', 2], ['piano', 'เปียโน', 1], ['gramophone', 'เครื่องเล่นแผ่นเสียง', 1], ['typewriter', 'เครื่องพิมพ์ดีด', 1], ['telescope', 'กล้องดูดาว', 2], ['mailbox', 'ตู้ไปรษณีย์', 1]]
        : [['robot', 'หุ่นยนต์ตั้งโชว์', 2], ['arcade', 'ตู้เกม', 2], ['solar', 'แผงโซลาร์', 1], ['aquarium', 'ตู้ปลา', 1], ['speaker', 'ลำโพงใหญ่', 2], ['vending', 'ตู้กดน้ำ', 2], ['hologram', 'โฮโลแกรม', 2], ['drone', 'โดรนตั้งโชว์', 1]];
      decor.forEach(([shape, th, h], k) => addObj(era, `dc_${era}_${k}`, th, shape, { c: s0[1], b: sh(s0[1], -0.3), B: sh(s0[1], -0.5), s: s3[1], S: sh(s3[1], 0.2), u: ACCENT[(k + 1) % 8], U: sh(ACCENT[(k + 1) % 8], -0.3), r: ACCENT[k % 8], y: '#f7d94c', g: '#7a7a80', G: '#3f3f45', e: '#ececec', z: '#1b1b1b', L: '#5fbd55', w: '#ffffff' }, { h, solid: true, cat: 'furn', use: shape === 'piano' || shape === 'harp' || shape === 'gramophone' || shape === 'arcade' || shape === 'drum' ? 'tv' : undefined }, { [s3[2]]: 3, [m[k % 4][0]]: 2 }, lvAt(0.1 + (k % 5) * 0.2)));
      for (let k = 0; k < 8; k++) { const col = ACCENT[k]; addObj(era, `pt_${era}_${k}`, `ไม้ประดับกระถาง${ACCENT_TH[k]}`, 'plant', { L: k % 2 ? '#5fbd55' : '#3f8f3a', l: k % 2 ? '#8fdc7a' : '#5fbd55', n: col, x: sh(col, -0.3), t: '#7a4a22' }, { solid: false }, { [s2[2]]: 1, sapling: 1 }, lvAt(0.05 + k * 0.1)); }
      // 7) tools (3) + weapons (5)
      const toolTier = { stone: ['หิน', 1], iron: ['สำริด', 2], medieval: ['เหล็กกล้า', 3], industrial: ['เครื่องยนต์', 4], modern: ['ไฮเทค', 5] }[era];
      const toolPay = { [m[1][0]]: 3, wood: 2 };
      if (era !== 'stone') {
        addItem(era, `axe_${era}`, { th: `ขวาน${toolTier[0]}`, cat: 'tool', tool: 'axe', stack: 1, dmg: toolTier[1] + 1 }, { in: toolPay, cat: 'tool', lv: lo });
        addItem(era, `pickaxe_${era}`, { th: `อีเต้อ${toolTier[0]}`, cat: 'tool', tool: 'pickaxe', stack: 1, dmg: toolTier[1] + 1 }, { in: toolPay, cat: 'tool', lv: lo });
        addItem(era, `hoe_${era}`, { th: `จอบ${toolTier[0]}`, cat: 'tool', tool: 'hoe', stack: 1, dmg: toolTier[1] }, { in: { [m[1][0]]: 2, wood: 2 }, cat: 'tool', lv: lo + 1 });
      } else {
        addItem(era, 'club', { th: 'ไม้กระบอง', cat: 'weapon', stack: 1, melee: 6 }, { in: { wood: 4 }, cat: 'weapon', lv: 1 });
        addItem(era, 'sling', { th: 'สลิงหิน', cat: 'weapon', stack: 1, melee: 5 }, { in: { rope: 1, stone: 2 }, cat: 'weapon', lv: 1 });
        addItem(era, 'stoneaxe_w', { th: 'ขวานหินศึก', cat: 'weapon', stack: 1, melee: 8 }, { in: { wood: 3, stone: 4 }, cat: 'weapon', lv: 2 });
      }
      const weapons = { stone: [['spear_stone', 'หอกหิน', 9, { wood: 4, stone: 2 }], ['bonedagger', 'มีดกระดูก', 7, { hide: 1, stone: 2 }]], iron: [['bronzesword', 'ดาบสำริด', 12, { bronze: 3 }], ['ironspear', 'หอกเหล็ก', 13, { ironbar: 2, wood: 2 }], ['ironaxe_w', 'ขวานศึกเหล็ก', 14, { ironbar: 3, wood: 2 }], ['bow', 'ธนูไม้', 10, { wood: 4, rope: 2 }], ['mace', 'กระบองเหล็ก', 15, { ironbar: 3 }]], medieval: [['longsword', 'ดาบยาว', 18, { steel: 3 }], ['halberd', 'ง้าว', 20, { steel: 3, wood: 3 }], ['crossbow', 'หน้าไม้', 16, { wood: 4, steel: 1 }], ['warhammer', 'ค้อนศึก', 22, { steel: 4 }], ['rapier', 'ดาบเรเปียร์', 17, { steel: 2, silk: 1 }]], industrial: [['revolver', 'ปืนลูกโม่', 24, { steel: 3, gear: 1 }], ['rifle', 'ปืนไรเฟิล', 28, { steel: 4, wood: 2 }], ['shotgun', 'ปืนลูกซอง', 30, { steel: 4, pipe: 1 }], ['sabre', 'ดาบทหารม้า', 22, { steel: 3 }], ['bayonet', 'ดาบปลายปืน', 20, { steel: 2 }]], modern: [['laser', 'ปืนเลเซอร์', 36, { circuit: 2, carbon: 1 }], ['taser', 'ปืนช็อตไฟฟ้า', 26, { circuit: 1, plastic: 2 }], ['plasma', 'ดาบพลาสมา', 40, { carbon: 2, circuit: 2 }], ['smg', 'ปืนกลมือ', 34, { carbon: 2, steel: 2 }], ['railgun', 'เรลกัน', 45, { carbon: 3, circuit: 3, essence: 1 }]] }[era];
      weapons.forEach(([id, th, dmg, cost], k) => addItem(era, id, { th, cat: 'weapon', stack: 1, melee: dmg }, { in: cost, cat: 'weapon', lv: lvAt(0.2 + k * 0.2) }));
      // 8) foods (8, cooked)
      const foods = { stone: [['grilledmush', 'เห็ดย่าง', { mushroom: 2 }, 18, 2], ['berrymash', 'เบอร์รี่บด', { berry: 4 }, 20, 6], ['roastcorn', 'ข้าวโพดย่าง', { corn: 1 }, 26, 2], ['stonesoup', 'ซุปหิน', { carrot: 1, mushroom: 1 }, 30, 4], ['coconutrice', 'ข้าวมะพร้าว', { rice: 2, coconut: 1 }, 34, 4], ['cavestew', 'สตูว์ถ้ำ', { pumpkin: 1, carrot: 1 }, 40, 6], ['driedberry', 'เบอร์รี่ตากแห้ง', { berry: 6 }, 24, 2], ['flowertea', 'ชาดอกไม้', { flower: 3 }, 10, 12]],
        iron: [['bread_iron', 'ขนมปังเตาอิฐ', { rice: 3 }, 38, 4], ['tomatosoup', 'ซุปมะเขือเทศ', { tomato: 3 }, 36, 6], ['cabbageroll', 'กะหล่ำห่อ', { cabbage: 2, rice: 1 }, 42, 6], ['chilipaste', 'น้ำพริก', { chili: 4 }, 22, 10], ['cornbread', 'ขนมปังข้าวโพด', { corn: 2, rice: 1 }, 44, 4], ['pumpkinpie', 'พายฟักทอง', { pumpkin: 1, rice: 2 }, 55, 12], ['strawjam', 'แยมสตรอว์เบอร์รี', { strawberry: 4 }, 30, 10], ['veggieplate', 'จานผักรวม', { carrot: 2, cabbage: 1, tomato: 1 }, 48, 6]],
        medieval: [['roastfeast', 'งานเลี้ยงย่าง', { pumpkin: 2, corn: 2 }, 70, 15], ['royalsoup', 'ซุปราชวงศ์', { soup: 1, flower: 2 }, 75, 14], ['honeycake', 'เค้กน้ำผึ้ง', { berry: 4, rice: 3 }, 60, 20], ['herbstew', 'สตูว์สมุนไพร', { mushroom: 3, carrot: 2 }, 62, 10], ['ricewine', 'สาโท', { rice: 5 }, 20, 25], ['stuffedcabbage', 'กะหล่ำยัดไส้', { cabbage: 2, corn: 1, chili: 1 }, 58, 8], ['fruittart', 'ทาร์ตผลไม้', { strawberry: 3, rice: 2 }, 52, 16], ['knightmeal', 'มื้ออัศวิน', { bread: 2, tomato: 2 }, 68, 8]],
        industrial: [['cannedsoup', 'ซุปกระป๋อง', { soup: 1, ironbar: 1 }, 65, 6], ['sandwich', 'แซนด์วิช', { bread: 2, tomato: 1, cabbage: 1 }, 60, 8], ['cornflakes', 'คอร์นเฟลกส์', { corn: 3 }, 45, 6], ['chilicon', 'ชิลีคอนคาร์เน', { chili: 3, tomato: 2 }, 66, 10], ['pumpkinbread', 'ขนมปังฟักทอง', { pumpkin: 1, rice: 3 }, 58, 8], ['strawshake', 'สตรอว์เบอร์รีเชค', { strawberry: 4, coconut: 1 }, 40, 18], ['factorylunch', 'ข้าวกล่องโรงงาน', { fried_rice: 1, cabbage: 1 }, 80, 8], ['coffee', 'กาแฟดำ', { berry: 3 }, 15, 15]],
        modern: [['pizza', 'พิซซ่า', { bread: 2, tomato: 2, chili: 1 }, 85, 20], ['burger', 'เบอร์เกอร์', { bread: 2, cabbage: 1, tomato: 1 }, 80, 15], ['sushi', 'ซูชิ', { rice: 3, carrot: 1 }, 70, 18], ['smoothie', 'สมูทตี้', { strawberry: 3, berry: 3 }, 45, 22], ['energybar', 'เอเนอร์จี้บาร์', { corn: 2, berry: 2 }, 50, 10], ['ramen', 'ราเมง', { rice: 2, mushroom: 2, chili: 1 }, 78, 16], ['padthai', 'ผัดไทย', { rice: 2, chili: 1, coconut: 1 }, 82, 18], ['icecream', 'ไอศกรีม', { coconut: 2, strawberry: 2 }, 35, 30]] }[era];
      foods.forEach(([id, th, cost, h, f], k) => { addItem(era, id, { th, cat: 'food', stack: 99, food: { h, f, e: Math.round(h / 4) } }); D.COOKING.push({ id, out: id, n: 1, in: cost, lv: lvAt(k / 8) }); });
      // 9) vehicles (4)
      const veh = { stone: [['sled', 'เลื่อนไม้', 1.4, 'raft', '#c9a063', { wood: 10, hide: 2 }], ['canoe', 'เรือขุด', 1.6, 'boat', '#a97a3f', { wood: 14 }], ['raft2', 'แพไม้ไผ่', 1.5, 'raft', '#c9b46a', { wood: 12, rope: 2 }], ['logroller', 'ล้อท่อนซุง', 1.3, 'horse', '#7a4a22', { wood: 16, rope: 2 }]],
        iron: [['cart', 'เกวียน', 1.9, 'horse', '#c8863c', { wood: 12, bronze: 2 }], ['chariot', 'รถม้าศึก', 2.3, 'horse', '#8f9aa8', { ironbar: 4, wood: 8 }], ['sailboat', 'เรือใบเล็ก', 2.2, 'boat', '#efe6cf', { wood: 16, linen: 3 }], ['warcanoe', 'เรือรบสำริด', 2.4, 'speedboat', '#c8863c', { wood: 18, bronze: 3 }]],
        medieval: [['warhorse', 'ม้าศึก', 2.6, 'horse', '#3b2a1a', { steel: 2, silk: 1, horse: 1 }], ['carriage', 'รถม้าหลวง', 2.4, 'horse', '#e26aa4', { wood: 14, silk: 3, steel: 1 }], ['galleon', 'เรือใบใหญ่', 2.8, 'speedboat', '#7a4a22', { wood: 24, linen: 4, steel: 2 }], ['gondola', 'เรือกอนโดลา', 2.2, 'boat', '#1b1b1b', { wood: 16, silk: 2 }]],
        industrial: [['steamcar', 'รถจักรไอน้ำ', 3.0, 'car', '#5b6673', { steel: 10, gear: 4, pipe: 2 }], ['steamboat', 'เรือกลไฟ', 3.2, 'speedboat', '#8f9aa8', { steel: 8, gear: 3, wood: 10 }], ['tricycle', 'สามล้อถีบ', 2.3, 'bicycle', '#e63946', { steel: 4, rubber: 3 }], ['sidecar', 'มอเตอร์ไซค์พ่วงข้าง', 2.9, 'motorbike', '#2f2f2f', { steel: 8, rubber: 4, gear: 2 }]],
        modern: [['sportscar', 'รถสปอร์ต', 3.8, 'car', '#e63946', { carbon: 6, circuit: 2, rubber: 4 }], ['jetski', 'เจ็ตสกี', 3.6, 'speedboat', '#7cf2ff', { plastic: 6, circuit: 2 }], ['escooter', 'สกู๊ตเตอร์ไฟฟ้า', 2.6, 'bicycle', '#1b1b1b', { plastic: 4, circuit: 1 }], ['hoverbike', 'ฮอเวอร์ไบค์', 4.2, 'helicopter', '#8e44ad', { carbon: 8, circuit: 4, essence: 2 }]] }[era];
      veh.forEach(([id, th, speed, base, col, cost], k) => {
        const b = D.VEHICLES[base];
        D.VEHICLES[id] = { th, lv: lvAt(0.2 + k * 0.25), speed, water: b.water, fly: b.fly, ride: b.ride, enclosed: b.enclosed, base, color: col };
        addItem(era, id, { th, cat: 'vehicle', stack: 1, vehicle: id }, { in: cost, cat: 'vehicle', lv: lvAt(0.2 + k * 0.25) });
      });
    }
    // pad each era to exactly 100 with extra painted floors / plants
    for (const era of ERAS) {
      let k = 0;
      while (D.ERA_ITEMS[era].length < 100) { const col = ACCENT[k % 8]; const [lo, hi] = eraLv[era]; addFloor(era, `flx_${era}_${k}`, `พื้นทาสี${ACCENT_TH[k % 8]}${k >= 8 ? ' ลาย' : ''}`, k >= 8 ? 'stripe' : 'plain', col, sh(col, -0.2), { [STYLE[era][0][2]]: 2, flower: 1 }, lo + (k % (hi - lo + 1))); k++; }
      while (D.ERA_ITEMS[era].length > 100) { const id = D.ERA_ITEMS[era].pop(); delete D.ITEMS[id]; const ri = D.RECIPES.findIndex(r => r.id === id); if (ri >= 0) D.RECIPES.splice(ri, 1); }
    }
    // weapons -> melee table + tool zone slot
    for (const [id, it] of Object.entries(D.ITEMS)) if (it.melee) D.MELEE[id] = it.melee;
    const weaponIds = Object.entries(D.ITEMS).filter(([, it]) => it.cat === 'weapon').sort((a, b) => b[1].melee - a[1].melee).map(([id]) => id);
    D.TOOL_KINDS.push({ kind: 'weapon', th: 'อาวุธ', tiers: weaponIds });
    // era tools into tool tiers (best first)
    const tierOrder = ['modern', 'industrial', 'medieval', 'iron'];
    for (const k of D.TOOL_KINDS) { if (k.kind === 'axe') k.tiers = [...tierOrder.map(e => `axe_${e}`), ...k.tiers]; if (k.kind === 'pickaxe') k.tiers = [...tierOrder.map(e => `pickaxe_${e}`), ...k.tiers]; if (k.kind === 'hoe') k.tiers = [...tierOrder.map(e => `hoe_${e}`), ...k.tiers]; }
    D.eraOfItem = (id) => (D.ITEMS[id] && D.ITEMS[id].era) || null;
    return D;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = build;
  else build(root.DEFS);
})(typeof window !== 'undefined' ? window : globalThis);
