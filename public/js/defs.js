/* ==========================================================
   Kuak World - shared definitions (server + browser)
   ========================================================== */
(function (root) {
  const D = {};

  D.WORLD_SIZE = 2048;      // tiles per side
  D.CHUNK = 32;             // tiles per chunk side
  D.TILE_PX = 32;           // rendered pixel size
  D.SPR = 16;               // sprite base resolution per tile
  D.DAY_SECONDS = 20 * 60;  // one in-game day = 20 real minutes
  D.SPAWN = { x: 1024, y: 1024 };

  // ---------- tiles ----------
  D.T = { WATER: 0, SAND: 1, GRASS: 2, DARKGRASS: 3, DIRT: 4, STONE: 5, SNOW: 6,
          TILLED: 7, TILLED_WET: 8, FLOOR_WOOD: 9, FLOOR_STONE: 10, PATH: 11, SHALLOW: 12, FLOOR_TILE: 13, FLOOR_CARPET: 14 };
  D.TILES = {
    0:  { n: 'water',        th: 'น้ำลึก',      walk: false },
    1:  { n: 'sand',         th: 'ทราย',       walk: true },
    2:  { n: 'grass',        th: 'หญ้า',       walk: true, hoe: true },
    3:  { n: 'darkgrass',    th: 'หญ้าป่า',     walk: true, hoe: true },
    4:  { n: 'dirt',         th: 'ดิน',        walk: true, hoe: true },
    5:  { n: 'stone',        th: 'พื้นหิน',     walk: true },
    6:  { n: 'snow',         th: 'หิมะ',       walk: true },
    7:  { n: 'tilled',       th: 'ดินพรวน',     walk: true, soil: true },
    8:  { n: 'tilled_wet',   th: 'ดินพรวน(เปียก)', walk: true, soil: true },
    9:  { n: 'floor_wood',   th: 'พื้นไม้',     walk: true, floor: true },
    10: { n: 'floor_stone',  th: 'พื้นหินขัด',   walk: true, floor: true },
    11: { n: 'path',         th: 'ทางเดินกรวด',  walk: true, floor: true },
    12: { n: 'shallow',      th: 'น้ำตื้น',      walk: true, slow: true },
    13: { n: 'floor_tile',   th: 'พื้นกระเบื้อง',  walk: true, floor: true },
    14: { n: 'floor_carpet', th: 'พรม',        walk: true, floor: true },
  };

  // ---------- world objects (one per tile) ----------
  // solid: blocks walking. hp: hits to remove. tool: required tool. drops: [[item,min,max,chance]]
  D.OBJ = {
    tree:       { th: 'ต้นไม้',      solid: true, hp: 4, tool: 'axe',     drops: [['wood', 3, 5, 1], ['sapling', 1, 1, 0.35]], natural: true, h: 2 },
    pine:       { th: 'ต้นสน',       solid: true, hp: 5, tool: 'axe',     drops: [['wood', 4, 6, 1], ['sapling', 1, 1, 0.3]], natural: true, h: 2 },
    palm:       { th: 'ต้นมะพร้าว',   solid: true, hp: 4, tool: 'axe',     drops: [['wood', 3, 4, 1], ['coconut', 1, 2, 0.8]], natural: true, h: 2 },
    sapling:    { th: 'กล้าไม้',      solid: false, hp: 1, tool: 'axe',    drops: [['sapling', 1, 1, 1]], grows: 'tree', growSec: 360, h: 1 },
    rock:       { th: 'หิน',         solid: true, hp: 3, tool: 'pickaxe', drops: [['stone', 2, 4, 1], ['ore', 1, 1, 0.15]], natural: true, h: 1 },
    bigrock:    { th: 'หินใหญ่',      solid: true, hp: 6, tool: 'pickaxe', drops: [['stone', 5, 8, 1], ['ore', 1, 2, 0.4]], natural: true, h: 1 },
    bush:       { th: 'พุ่มเบอร์รี่',   solid: true, hp: 1, tool: 'hand',    drops: [['berry', 1, 3, 1]], natural: true, keep: true, regrowSec: 240, h: 1 },
    flower:     { th: 'ดอกไม้',       solid: false, hp: 1, tool: 'hand',   drops: [['flower', 1, 1, 1]], natural: true, h: 1 },
    mushroom:   { th: 'เห็ด',        solid: false, hp: 1, tool: 'hand',    drops: [['mushroom', 1, 2, 1]], natural: true, h: 1 },
    // crops are stored as {t:'crop', c:'carrot', s:stage, p:progress, w:wateredUntil, o:owner}
    crop:       { th: 'พืชผัก',       solid: false, h: 1 },
    // buildings
    wall_wood:  { th: 'ผนังไม้',      solid: true, hp: 1, tool: 'hammer', drops: [['wall_wood', 1, 1, 1]], build: true, h: 2 },
    wall_stone: { th: 'ผนังหิน',      solid: true, hp: 1, tool: 'hammer', drops: [['wall_stone', 1, 1, 1]], build: true, h: 2 },
    wall_brick: { th: 'ผนังอิฐ',      solid: true, hp: 1, tool: 'hammer', drops: [['wall_brick', 1, 1, 1]], build: true, h: 2 },
    window:     { th: 'หน้าต่าง',      solid: true, hp: 1, tool: 'hammer', drops: [['window', 1, 1, 1]], build: true, h: 2 },
    door:       { th: 'ประตู',        solid: false, hp: 1, tool: 'hammer', drops: [['door', 1, 1, 1]], build: true, h: 2 },
    fence:      { th: 'รั้ว',         solid: true, hp: 1, tool: 'hammer', drops: [['fence', 1, 1, 1]], build: true, h: 1 },
    gate:       { th: 'ประตูรั้ว',      solid: false, hp: 1, tool: 'hammer', drops: [['gate', 1, 1, 1]], build: true, h: 1 },
    // furniture (Sims-like)
    bed:        { th: 'เตียง',        solid: true, hp: 1, tool: 'hammer', drops: [['bed', 1, 1, 1]], build: true, use: 'sleep', h: 2 },
    chair:      { th: 'เก้าอี้',       solid: true, hp: 1, tool: 'hammer', drops: [['chair', 1, 1, 1]], build: true, use: 'sit', h: 1 },
    sofa:       { th: 'โซฟา',        solid: true, hp: 1, tool: 'hammer', drops: [['sofa', 1, 1, 1]], build: true, use: 'sit', h: 1 },
    table:      { th: 'โต๊ะ',         solid: true, hp: 1, tool: 'hammer', drops: [['table', 1, 1, 1]], build: true, h: 1 },
    tv:         { th: 'ทีวี',         solid: true, hp: 1, tool: 'hammer', drops: [['tv', 1, 1, 1]], build: true, use: 'tv', h: 1 },
    fridge:     { th: 'ตู้เย็น',       solid: true, hp: 1, tool: 'hammer', drops: [['fridge', 1, 1, 1]], build: true, use: 'fridge', h: 2 },
    stove:      { th: 'เตาทำอาหาร',    solid: true, hp: 1, tool: 'hammer', drops: [['stove', 1, 1, 1]], build: true, use: 'cook', h: 1 },
    lamp:       { th: 'โคมไฟ',        solid: true, hp: 1, tool: 'hammer', drops: [['lamp', 1, 1, 1]], build: true, light: 5, h: 2 },
    shelf:      { th: 'ชั้นหนังสือ',    solid: true, hp: 1, tool: 'hammer', drops: [['shelf', 1, 1, 1]], build: true, use: 'read', h: 2 },
    plant:      { th: 'ต้นไม้กระถาง',  solid: false, hp: 1, tool: 'hammer', drops: [['plant', 1, 1, 1]], build: true, h: 1 },
    bathtub:    { th: 'อ่างอาบน้ำ',    solid: true, hp: 1, tool: 'hammer', drops: [['bathtub', 1, 1, 1]], build: true, use: 'bath', h: 1 },
    toilet:     { th: 'ชักโครก',       solid: true, hp: 1, tool: 'hammer', drops: [['toilet', 1, 1, 1]], build: true, use: 'toilet', h: 1 },
    campfire:   { th: 'กองไฟ',        solid: true, hp: 1, tool: 'hammer', drops: [['campfire', 1, 1, 1]], build: true, light: 6, use: 'cook', h: 1 },
    chest:      { th: 'หีบ',          solid: true, hp: 1, tool: 'hammer', drops: [['chest', 1, 1, 1]], build: true, h: 1 },
    sign:       { th: 'ป้าย',         solid: false, hp: 1, tool: 'hammer', drops: [['sign', 1, 1, 1]], build: true, h: 1 },
    torch:      { th: 'คบเพลิง',      solid: false, hp: 1, tool: 'hammer', drops: [['torch', 1, 1, 1]], build: true, light: 4, h: 1 },
    scarecrow:  { th: 'หุ่นไล่กา',     solid: true, hp: 1, tool: 'hammer', drops: [['scarecrow', 1, 1, 1]], build: true, h: 2 },
    fountain:   { th: 'น้ำพุ',         solid: true, hp: 1, tool: 'hammer', drops: [['fountain', 1, 1, 1]], build: true, use: 'fountain', h: 2 },
    streetlamp: { th: 'ไฟถนน',        solid: true, hp: 1, tool: 'hammer', drops: [['streetlamp', 1, 1, 1]], build: true, light: 8, h: 2 },
    computer:   { th: 'คอมพิวเตอร์',    solid: true, hp: 1, tool: 'hammer', drops: [['computer', 1, 1, 1]], build: true, use: 'pc', h: 1 },
  };

  // ---------- crops ----------
  // stageSec: seconds per stage (unwatered). watered = 2x speed. 5 stages (0..4), ripe at 4
  D.CROPS = {
    carrot:     { th: 'แครอท',     stageSec: 40,  yield: 'carrot',     n: [2, 3], color: '#f28c28', leaf: '#3fa34d' },
    tomato:     { th: 'มะเขือเทศ',  stageSec: 55,  yield: 'tomato',     n: [2, 4], color: '#e63946', leaf: '#4c9a2a', regrow: true },
    corn:       { th: 'ข้าวโพด',    stageSec: 70,  yield: 'corn',       n: [1, 2], color: '#f5d33f', leaf: '#5aa02c', tall: true },
    pumpkin:    { th: 'ฟักทอง',    stageSec: 90,  yield: 'pumpkin',    n: [1, 1], color: '#ef8f2b', leaf: '#3c8a2e' },
    strawberry: { th: 'สตรอว์เบอร์รี', stageSec: 50, yield: 'strawberry', n: [2, 4], color: '#ff3d5a', leaf: '#3f9a3a', regrow: true },
    cabbage:    { th: 'กะหล่ำปลี',   stageSec: 60,  yield: 'cabbage',    n: [1, 2], color: '#9fd59a', leaf: '#6bbf5a' },
    chili:      { th: 'พริก',       stageSec: 45,  yield: 'chili',      n: [3, 5], color: '#d62828', leaf: '#2f7a2f', regrow: true },
    rice:       { th: 'ข้าว',       stageSec: 80,  yield: 'rice',       n: [3, 6], color: '#e8d9a0', leaf: '#8bc34a', tall: true },
  };

  // ---------- items ----------
  // cat: tool | mat | food | seed | build | furn | misc ; food:{h,e,f} hunger/energy/fun restore
  D.ITEMS = {
    // tools
    hand:       { th: 'มือเปล่า', cat: 'tool', tool: 'hand', stack: 1 },
    axe:        { th: 'ขวาน',    cat: 'tool', tool: 'axe', stack: 1 },
    pickaxe:    { th: 'อีเต้อ',   cat: 'tool', tool: 'pickaxe', stack: 1 },
    hoe:        { th: 'จอบ',     cat: 'tool', tool: 'hoe', stack: 1 },
    can:        { th: 'บัวรดน้ำ', cat: 'tool', tool: 'can', stack: 1 },
    hammer:     { th: 'ค้อน',    cat: 'tool', tool: 'hammer', stack: 1 },
    axe_iron:   { th: 'ขวานเหล็ก',  cat: 'tool', tool: 'axe', stack: 1, dmg: 2 },
    pickaxe_iron: { th: 'อีเต้อเหล็ก', cat: 'tool', tool: 'pickaxe', stack: 1, dmg: 2 },
    // materials
    wood:       { th: 'ไม้',     cat: 'mat', stack: 999 },
    stone:      { th: 'หิน',     cat: 'mat', stack: 999 },
    ore:        { th: 'แร่เหล็ก', cat: 'mat', stack: 999 },
    sapling:    { th: 'กล้าไม้',  cat: 'seed', stack: 99, plant: 'sapling' },
    flower:     { th: 'ดอกไม้',  cat: 'misc', stack: 99, use: { f: 8 } },
    // food (raw)
    gel:        { th: 'เมือกสไลม์', cat: 'mat', stack: 999 },
    essence:    { th: 'แก่นเวท',    cat: 'mat', stack: 999 },
    berry:      { th: 'เบอร์รี่',  cat: 'food', stack: 99, food: { h: 8, f: 2 } },
    mushroom:   { th: 'เห็ด',    cat: 'food', stack: 99, food: { h: 10 } },
    coconut:    { th: 'มะพร้าว',  cat: 'food', stack: 99, food: { h: 15, e: 5 } },
    carrot:     { th: 'แครอท',   cat: 'food', stack: 99, food: { h: 15 } },
    tomato:     { th: 'มะเขือเทศ', cat: 'food', stack: 99, food: { h: 12, f: 2 } },
    corn:       { th: 'ข้าวโพด',  cat: 'food', stack: 99, food: { h: 20 } },
    pumpkin:    { th: 'ฟักทอง',  cat: 'food', stack: 99, food: { h: 30 } },
    strawberry: { th: 'สตรอว์เบอร์รี', cat: 'food', stack: 99, food: { h: 10, f: 6 } },
    cabbage:    { th: 'กะหล่ำปลี', cat: 'food', stack: 99, food: { h: 18 } },
    chili:      { th: 'พริก',     cat: 'food', stack: 99, food: { h: 4, f: 4 } },
    rice:       { th: 'ข้าว',     cat: 'food', stack: 99, food: { h: 8 } },
    // cooked
    bread:      { th: 'ขนมปัง',   cat: 'food', stack: 99, food: { h: 35, f: 4 } },
    salad:      { th: 'สลัด',     cat: 'food', stack: 99, food: { h: 45, e: 10, f: 8 } },
    soup:       { th: 'ซุปฟักทอง', cat: 'food', stack: 99, food: { h: 60, e: 15, f: 10 } },
    fried_rice: { th: 'ข้าวผัด',   cat: 'food', stack: 99, food: { h: 70, e: 20, f: 12 } },
    somtam:     { th: 'ส้มตำ',    cat: 'food', stack: 99, food: { h: 50, f: 20 } },
    // seeds
    seed_carrot:     { th: 'เมล็ดแครอท',    cat: 'seed', stack: 99, crop: 'carrot' },
    seed_tomato:     { th: 'เมล็ดมะเขือเทศ', cat: 'seed', stack: 99, crop: 'tomato' },
    seed_corn:       { th: 'เมล็ดข้าวโพด',   cat: 'seed', stack: 99, crop: 'corn' },
    seed_pumpkin:    { th: 'เมล็ดฟักทอง',   cat: 'seed', stack: 99, crop: 'pumpkin' },
    seed_strawberry: { th: 'เมล็ดสตรอว์เบอร์รี', cat: 'seed', stack: 99, crop: 'strawberry' },
    seed_cabbage:    { th: 'เมล็ดกะหล่ำปลี',  cat: 'seed', stack: 99, crop: 'cabbage' },
    seed_chili:      { th: 'เมล็ดพริก',      cat: 'seed', stack: 99, crop: 'chili' },
    seed_rice:       { th: 'เมล็ดข้าว',      cat: 'seed', stack: 99, crop: 'rice' },
    // build blocks (placed as tiles)
    floor_wood:   { th: 'พื้นไม้',      cat: 'build', stack: 999, tile: 9 },
    floor_stone:  { th: 'พื้นหินขัด',    cat: 'build', stack: 999, tile: 10 },
    floor_tile:   { th: 'พื้นกระเบื้อง',   cat: 'build', stack: 999, tile: 13 },
    floor_carpet: { th: 'พรม',         cat: 'build', stack: 999, tile: 14 },
    path:         { th: 'ทางเดินกรวด',   cat: 'build', stack: 999, tile: 11 },
    // build objects
    wall_wood:  { th: 'ผนังไม้',   cat: 'build', stack: 999, obj: 'wall_wood' },
    wall_stone: { th: 'ผนังหิน',   cat: 'build', stack: 999, obj: 'wall_stone' },
    wall_brick: { th: 'ผนังอิฐ',   cat: 'build', stack: 999, obj: 'wall_brick' },
    window:     { th: 'หน้าต่าง',   cat: 'build', stack: 999, obj: 'window' },
    door:       { th: 'ประตู',     cat: 'build', stack: 99, obj: 'door' },
    fence:      { th: 'รั้ว',      cat: 'build', stack: 999, obj: 'fence' },
    gate:       { th: 'ประตูรั้ว',   cat: 'build', stack: 99, obj: 'gate' },
    torch:      { th: 'คบเพลิง',   cat: 'build', stack: 99, obj: 'torch' },
    campfire:   { th: 'กองไฟ',     cat: 'build', stack: 99, obj: 'campfire' },
    scarecrow:  { th: 'หุ่นไล่กา',  cat: 'build', stack: 99, obj: 'scarecrow' },
    sign:       { th: 'ป้าย',      cat: 'build', stack: 99, obj: 'sign' },
    // furniture
    bed:     { th: 'เตียง',       cat: 'furn', stack: 99, obj: 'bed' },
    chair:   { th: 'เก้าอี้',      cat: 'furn', stack: 99, obj: 'chair' },
    sofa:    { th: 'โซฟา',       cat: 'furn', stack: 99, obj: 'sofa' },
    table:   { th: 'โต๊ะ',        cat: 'furn', stack: 99, obj: 'table' },
    tv:      { th: 'ทีวี',        cat: 'furn', stack: 99, obj: 'tv' },
    fridge:  { th: 'ตู้เย็น',      cat: 'furn', stack: 99, obj: 'fridge' },
    stove:   { th: 'เตาทำอาหาร',   cat: 'furn', stack: 99, obj: 'stove' },
    lamp:    { th: 'โคมไฟ',       cat: 'furn', stack: 99, obj: 'lamp' },
    shelf:   { th: 'ชั้นหนังสือ',   cat: 'furn', stack: 99, obj: 'shelf' },
    plant:   { th: 'ต้นไม้กระถาง', cat: 'furn', stack: 99, obj: 'plant' },
    bathtub: { th: 'อ่างอาบน้ำ',   cat: 'furn', stack: 99, obj: 'bathtub' },
    toilet:  { th: 'ชักโครก',      cat: 'furn', stack: 99, obj: 'toilet' },
    chest:   { th: 'หีบ',         cat: 'furn', stack: 99, obj: 'chest' },
    fountain:   { th: 'น้ำพุ',       cat: 'furn', stack: 99, obj: 'fountain' },
    streetlamp: { th: 'ไฟถนน',      cat: 'build', stack: 99, obj: 'streetlamp' },
    computer:   { th: 'คอมพิวเตอร์',  cat: 'furn', stack: 99, obj: 'computer' },
    // vehicles
    raft:       { th: 'แพไม้',       cat: 'vehicle', stack: 1, vehicle: 'raft' },
    boat:       { th: 'เรือพาย',      cat: 'vehicle', stack: 1, vehicle: 'boat' },
    horse:      { th: 'ม้า',         cat: 'vehicle', stack: 1, vehicle: 'horse' },
    bicycle:    { th: 'จักรยาน',      cat: 'vehicle', stack: 1, vehicle: 'bicycle' },
    motorbike:  { th: 'มอเตอร์ไซค์',   cat: 'vehicle', stack: 1, vehicle: 'motorbike' },
    car:        { th: 'รถยนต์',       cat: 'vehicle', stack: 1, vehicle: 'car' },
    speedboat:  { th: 'เรือเร็ว',      cat: 'vehicle', stack: 1, vehicle: 'speedboat' },
    helicopter: { th: 'เฮลิคอปเตอร์',  cat: 'vehicle', stack: 1, vehicle: 'helicopter' },
  };

  // ---------- vehicles ----------
  // speed = multiplier of walking speed. water: moves on water/shallow/sand only. fly: goes over everything.
  D.VEHICLES = {
    raft:       { th: 'แพไม้',       lv: 3,  speed: 1.3, water: true,  ride: 2 },
    boat:       { th: 'เรือพาย',      lv: 7,  speed: 1.9, water: true,  ride: 4 },
    horse:      { th: 'ม้า',         lv: 10, speed: 2.0, ride: 8 },
    bicycle:    { th: 'จักรยาน',      lv: 15, speed: 2.2, ride: 7 },
    motorbike:  { th: 'มอเตอร์ไซค์',   lv: 18, speed: 2.8, ride: 6 },
    car:        { th: 'รถยนต์',       lv: 20, speed: 3.2, ride: 7, enclosed: true },
    speedboat:  { th: 'เรือเร็ว',      lv: 22, speed: 3.4, water: true, ride: 5 },
    helicopter: { th: 'เฮลิคอปเตอร์',  lv: 25, speed: 3.8, fly: true, ride: 8, enclosed: true },
  };

  // ---------- progression: levels & eras ----------
  D.ERAS = [
    { id: 'stone',      th: 'ยุคหิน',          lv: 1,  icon: 'era_stone', desc: 'เก็บไม้ หิน ทำเครื่องมือหิน สร้างเพิงไม้ ปลูกผัก และต่อแพข้ามน้ำ' },
    { id: 'iron',       th: 'ยุคสำริด-เหล็ก',   lv: 5,  icon: 'era_iron', desc: 'เครื่องมือเหล็ก (ตัด/ขุดเร็ว 2 เท่า) ผนังหิน หน้าต่าง ชั้นหนังสือ เรือพาย' },
    { id: 'medieval',   th: 'ยุคกลาง',         lv: 10, icon: 'era_medieval', desc: 'ขี่ม้า ผนังอิฐ พรม โคมไฟ เตาทำอาหาร โซฟา น้ำพุ' },
    { id: 'industrial', th: 'ยุคอุตสาหกรรม',    lv: 15, icon: 'era_industrial', desc: 'จักรยาน ไฟถนน อ่างอาบน้ำ ชักโครก ตู้เย็น มอเตอร์ไซค์' },
    { id: 'modern',     th: 'ยุคปัจจุบัน',       lv: 20, icon: 'era_modern', desc: 'รถยนต์ ทีวี คอมพิวเตอร์ เรือเร็ว และเฮลิคอปเตอร์บินข้ามทุกสิ่ง' },
  ];
  D.xpNeed = (lv) => Math.round(15 * Math.pow(lv, 1.15));
  D.eraOf = (lv) => { let e = D.ERAS[0]; for (const x of D.ERAS) if (lv >= x.lv) e = x; return e; };
  D.XP = { chop: 12, mine: 12, gather: 5, harvest: 15, plant: 3, water: 1, craft: 8, cook: 20, build: 5, sell: 2 };

  // ---------- crafting recipes (lv = level required) ----------
  D.RECIPES = [
    // ยุคหิน
    { id: 'axe',        lv: 1,  out: 'axe',        n: 1,  in: { wood: 5, stone: 3 }, cat: 'tool' },
    { id: 'pickaxe',    lv: 1,  out: 'pickaxe',    n: 1,  in: { wood: 5, stone: 5 }, cat: 'tool' },
    { id: 'hoe',        lv: 1,  out: 'hoe',        n: 1,  in: { wood: 4, stone: 2 }, cat: 'tool' },
    { id: 'hammer',     lv: 1,  out: 'hammer',     n: 1,  in: { wood: 3, stone: 2 }, cat: 'tool' },
    { id: 'can',        lv: 2,  out: 'can',        n: 1,  in: { wood: 6 }, cat: 'tool' },
    { id: 'wall_wood',  lv: 1,  out: 'wall_wood',  n: 2,  in: { wood: 3 }, cat: 'build' },
    { id: 'door',       lv: 1,  out: 'door',       n: 1,  in: { wood: 4 }, cat: 'build' },
    { id: 'fence',      lv: 1,  out: 'fence',      n: 4,  in: { wood: 2 }, cat: 'build' },
    { id: 'gate',       lv: 1,  out: 'gate',       n: 1,  in: { wood: 3 }, cat: 'build' },
    { id: 'torch',      lv: 1,  out: 'torch',      n: 2,  in: { wood: 1 }, cat: 'build' },
    { id: 'campfire',   lv: 1,  out: 'campfire',   n: 1,  in: { wood: 5, stone: 3 }, cat: 'build' },
    { id: 'path',       lv: 1,  out: 'path',       n: 6,  in: { stone: 1 }, cat: 'build' },
    { id: 'sign',       lv: 1,  out: 'sign',       n: 1,  in: { wood: 2 }, cat: 'build' },
    { id: 'floor_wood', lv: 2,  out: 'floor_wood', n: 4,  in: { wood: 2 }, cat: 'build' },
    { id: 'chair',      lv: 1,  out: 'chair',      n: 1,  in: { wood: 3 }, cat: 'furn' },
    { id: 'table',      lv: 1,  out: 'table',      n: 1,  in: { wood: 5 }, cat: 'furn' },
    { id: 'chest',      lv: 1,  out: 'chest',      n: 1,  in: { wood: 8 }, cat: 'furn' },
    { id: 'bed',        lv: 2,  out: 'bed',        n: 1,  in: { wood: 8, flower: 1 }, cat: 'furn' },
    { id: 'raft',       lv: 3,  out: 'raft',       n: 1,  in: { wood: 12 }, cat: 'vehicle' },
    // ยุคสำริด-เหล็ก
    { id: 'axe_iron',   lv: 5,  out: 'axe_iron',   n: 1,  in: { ore: 3, wood: 3 }, cat: 'tool' },
    { id: 'pickaxe_iron', lv: 5, out: 'pickaxe_iron', n: 1, in: { ore: 3, wood: 3 }, cat: 'tool' },
    { id: 'wall_stone', lv: 5,  out: 'wall_stone', n: 2,  in: { stone: 3 }, cat: 'build' },
    { id: 'floor_stone',lv: 5,  out: 'floor_stone',n: 4,  in: { stone: 2 }, cat: 'build' },
    { id: 'window',     lv: 5,  out: 'window',     n: 1,  in: { wood: 2, ore: 1 }, cat: 'build' },
    { id: 'scarecrow',  lv: 5,  out: 'scarecrow',  n: 1,  in: { wood: 4, rice: 2 }, cat: 'build' },
    { id: 'shelf',      lv: 6,  out: 'shelf',      n: 1,  in: { wood: 6 }, cat: 'furn' },
    { id: 'plant',      lv: 6,  out: 'plant',      n: 1,  in: { stone: 1, sapling: 1 }, cat: 'furn' },
    { id: 'boat',       lv: 7,  out: 'boat',       n: 1,  in: { wood: 20, ore: 2 }, cat: 'vehicle' },
    // ยุคกลาง
    { id: 'wall_brick', lv: 10, out: 'wall_brick', n: 2,  in: { stone: 2, ore: 1 }, cat: 'build' },
    { id: 'floor_carpet',lv: 10,out: 'floor_carpet',n: 4, in: { wood: 1, flower: 2 }, cat: 'build' },
    { id: 'lamp',       lv: 10, out: 'lamp',       n: 1,  in: { wood: 2, ore: 2 }, cat: 'furn' },
    { id: 'stove',      lv: 10, out: 'stove',      n: 1,  in: { stone: 6, ore: 3 }, cat: 'furn' },
    { id: 'sofa',       lv: 11, out: 'sofa',       n: 1,  in: { wood: 6, flower: 2 }, cat: 'furn' },
    { id: 'floor_tile', lv: 12, out: 'floor_tile', n: 4,  in: { stone: 3, ore: 1 }, cat: 'build' },
    { id: 'fountain',   lv: 12, out: 'fountain',   n: 1,  in: { stone: 10, ore: 2 }, cat: 'furn' },
    // ยุคอุตสาหกรรม
    { id: 'bicycle',    lv: 15, out: 'bicycle',    n: 1,  in: { ore: 8, wood: 4 }, cat: 'vehicle' },
    { id: 'streetlamp', lv: 15, out: 'streetlamp', n: 1,  in: { ore: 6, stone: 4 }, cat: 'build' },
    { id: 'bathtub',    lv: 15, out: 'bathtub',    n: 1,  in: { stone: 5, ore: 2 }, cat: 'furn' },
    { id: 'toilet',     lv: 15, out: 'toilet',     n: 1,  in: { stone: 4, ore: 1 }, cat: 'furn' },
    { id: 'fridge',     lv: 16, out: 'fridge',     n: 1,  in: { ore: 6, stone: 2 }, cat: 'furn' },
    { id: 'motorbike',  lv: 18, out: 'motorbike',  n: 1,  in: { ore: 15, stone: 5 }, cat: 'vehicle' },
    // ยุคปัจจุบัน
    { id: 'tv',         lv: 20, out: 'tv',         n: 1,  in: { ore: 5, wood: 2 }, cat: 'furn' },
    { id: 'car',        lv: 20, out: 'car',        n: 1,  in: { ore: 25, wood: 5 }, cat: 'vehicle' },
    { id: 'computer',   lv: 21, out: 'computer',   n: 1,  in: { ore: 12 }, cat: 'furn' },
    { id: 'speedboat',  lv: 22, out: 'speedboat',  n: 1,  in: { ore: 20, wood: 10 }, cat: 'vehicle' },
    { id: 'helicopter', lv: 25, out: 'helicopter', n: 1,  in: { ore: 40, stone: 10 }, cat: 'vehicle' },
  ];

  // cooking (needs stove or campfire nearby)
  D.COOKING = [
    { id: 'bread',      out: 'bread',      n: 2, in: { rice: 3 } },
    { id: 'salad',      out: 'salad',      n: 1, in: { cabbage: 1, tomato: 1, carrot: 1 } },
    { id: 'soup',       out: 'soup',       n: 2, in: { pumpkin: 1, mushroom: 2 } },
    { id: 'fried_rice', out: 'fried_rice', n: 1, in: { rice: 2, corn: 1, chili: 1 } },
    { id: 'somtam',     out: 'somtam',     n: 1, in: { chili: 2, tomato: 1, coconut: 1 } },
  ];

  // ---------- shop ----------
  D.SHOP = {
    buy: {
      seed_carrot: 8, seed_tomato: 12, seed_corn: 15, seed_pumpkin: 25, seed_strawberry: 14,
      seed_cabbage: 12, seed_chili: 10, seed_rice: 10,
      bread: 20, axe: 60, pickaxe: 70, hoe: 50, can: 50, hammer: 40,
      wood: 4, stone: 5, ore: 12, sapling: 15, flower: 6,
      axe_iron: 150, pickaxe_iron: 160, horse: 300, raft: 60,
    },
    lv: { seed_corn: 2, seed_rice: 2, seed_strawberry: 3, seed_pumpkin: 4, axe_iron: 5, pickaxe_iron: 5, raft: 3, horse: 10 },
    sell: {
      carrot: 6, tomato: 9, corn: 12, pumpkin: 30, strawberry: 8, cabbage: 10, chili: 5, rice: 4,
      berry: 2, mushroom: 3, coconut: 5, flower: 2, wood: 1, stone: 1, ore: 5, gel: 6, essence: 25,
      bread: 12, salad: 40, soup: 55, fried_rice: 70, somtam: 50,
    },
  };

  // ---------- character looks ----------
  D.LOOKS = {
    skin: ['#f8d5b8', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21'],
    hair: ['#1b1b1b', '#3b2a1a', '#6b3e1e', '#a0522d', '#d9a441', '#f5e6a3', '#b0b0b0', '#e04b6a', '#4b6bd6', '#3fa34d', '#8e44ad', '#ff8c42'],
    hairStyle: ['short', 'long', 'spiky', 'bob', 'bun', 'ponytail', 'curly', 'bald'],
    shirt: ['#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#264653', '#4b6bd6', '#8e44ad', '#ffffff', '#222222', '#ff8fab', '#90be6d', '#43aa8b'],
    pants: ['#264653', '#1d3557', '#6c757d', '#3a3a3a', '#8d5524', '#e9c46a', '#ffffff', '#4b3f72', '#b56576'],
    eyes: ['#2b2b2b', '#4a6fa5', '#2e7d32', '#6d4c41', '#8e44ad'],
    hat: ['none', 'cap', 'straw', 'beanie', 'crown', 'flower'],
  };

  D.NEEDS = { hunger: 'ความหิว', energy: 'พลังงาน', fun: 'ความสนุก', hygiene: 'ความสะอาด' };

  // ---------- classes (อาชีพ) are defined in classes.js (100 classes) ----------
  D.CLASS_CHANGE_COST = 200;
  D.SKILL_KEYS = ['z', 'x', 'c', 'v'];
  // passive lookup: sum of values for key k over the class's passives
  D.passive = (cls, k) => { const c = cls && D.CLASSES && D.CLASSES[cls]; if (!c) return 0; let v = 0; for (const p of c.passives) if (p.k === k) v += p.v; return v; };
  D.recipeCost = (r, cls) => { const pct = D.passive(cls, 'recipeDiscount'); if (!pct) return r.in; const o = {}; for (const [k, q] of Object.entries(r.in)) o[k] = Math.max(1, Math.floor(q * (1 - pct / 100))); return o; };

  // ---------- mobs ----------
  D.MOBS = {
    slime: { th: 'สไลม์', variants: [
      { th: 'สไลม์เขียว', hp: 24, dmg: 5,  speed: 2.0, xp: 15, color: '#5fbd55' },
      { th: 'สไลม์ฟ้า',   hp: 40, dmg: 8,  speed: 2.4, xp: 25, color: '#4b8fe0' },
      { th: 'สไลม์แดง',   hp: 70, dmg: 12, speed: 2.8, xp: 45, color: '#e04848' },
    ], drops: [['gel', 1, 3, 1], ['ore', 1, 1, 0.12], ['essence', 1, 1, 0.15]] },
  };
  D.MELEE = { hand: 3, axe: 6, pickaxe: 6, hoe: 4, can: 2, hammer: 5, axe_iron: 10, pickaxe_iron: 10 };

  // hotbar: tool zone (auto from inventory, best tier first) | item zone (player-arranged)
  D.TOOL_KINDS = [
    { kind: 'axe',     th: 'ขวาน',    tiers: ['axe_iron', 'axe'] },
    { kind: 'pickaxe', th: 'อีเต้อ',   tiers: ['pickaxe_iron', 'pickaxe'] },
    { kind: 'hoe',     th: 'จอบ',     tiers: ['hoe'] },
    { kind: 'can',     th: 'บัวรดน้ำ', tiers: ['can'] },
    { kind: 'hammer',  th: 'ค้อน',    tiers: ['hammer'] },
  ];
  D.ITEM_SLOTS = 5;
  D.bestTool = (inv, kind) => { const k = D.TOOL_KINDS.find(t => t.kind === kind); if (!k) return null; for (const id of k.tiers) if (inv[id] > 0) return id; return null; };

  if (typeof module !== 'undefined' && module.exports) { require('./classes.js')(D); require('./items_gen.js')(D); module.exports = D; }
  else root.DEFS = D;
})(typeof window !== 'undefined' ? window : globalThis);
