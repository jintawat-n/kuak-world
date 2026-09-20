/* ==========================================================
   Kuak World - fishing: rods, 110 fish species, fish dishes
   ========================================================== */
(function (root) {
  function build(D) {
    // ---------- rods (tool kind 'rod') ----------
    D.ITEMS.rod_wood   = { th: 'เบ็ดไม้',       cat: 'tool', tool: 'rod', stack: 1, tier: 1, era: 'stone' };
    D.ITEMS.rod_bronze = { th: 'เบ็ดสำริด',     cat: 'tool', tool: 'rod', stack: 1, tier: 2, era: 'iron' };
    D.ITEMS.rod_steel  = { th: 'เบ็ดเหล็กกล้า',  cat: 'tool', tool: 'rod', stack: 1, tier: 3, era: 'medieval' };
    D.ITEMS.rod_reel   = { th: 'เบ็ดรอกหมุน',    cat: 'tool', tool: 'rod', stack: 1, tier: 4, era: 'industrial' };
    D.ITEMS.rod_carbon = { th: 'เบ็ดคาร์บอน',    cat: 'tool', tool: 'rod', stack: 1, tier: 5, era: 'modern' };
    D.RECIPES.push(
      { id: 'rod_wood', out: 'rod_wood', n: 1, in: { wood: 4, rope: 1 }, cat: 'tool', lv: 1 },
      { id: 'rod_bronze', out: 'rod_bronze', n: 1, in: { wood: 3, bronze: 2, rope: 1 }, cat: 'tool', lv: 5 },
      { id: 'rod_steel', out: 'rod_steel', n: 1, in: { wood: 3, steel: 2, silk: 1 }, cat: 'tool', lv: 10 },
      { id: 'rod_reel', out: 'rod_reel', n: 1, in: { steel: 2, gear: 2, rubber: 1 }, cat: 'tool', lv: 15 },
      { id: 'rod_carbon', out: 'rod_carbon', n: 1, in: { carbon: 2, circuit: 1, plastic: 1 }, cat: 'tool', lv: 20 },
    );
    D.SHOP.buy.rod_wood = 40; D.SHOP.buy.bait = 2;
    D.ITEMS.bait = { th: 'เหยื่อตกปลา', cat: 'mat', stack: 999, color: '#c97a4a' };
    D.RECIPES.push({ id: 'bait', out: 'bait', n: 5, in: { berry: 1, mushroom: 1 }, cat: 'mat', lv: 1 });
    D.TOOL_KINDS.push({ kind: 'rod', th: 'เบ็ดตกปลา', tiers: ['rod_carbon', 'rod_reel', 'rod_steel', 'rod_bronze', 'rod_wood'] });

    // ---------- species ----------
    // [id, th, habitat(river|sea|any), rarity 1-5, minCm, maxCm, price, color, color2, shape(normal|long|flat|round|big), night?, lv]
    const F = [
      // --- น้ำจืด (river / shallow) ---
      ['pla_siw', 'ปลาซิว', 'river', 1, 3, 8, 3, '#b8c9d9', '#7f96ab', 'normal', 0, 1],
      ['pla_sroi', 'ปลาสร้อย', 'river', 1, 8, 18, 4, '#c9c9c9', '#8d8d8d', 'normal', 0, 1],
      ['pla_tapian', 'ปลาตะเพียน', 'river', 1, 15, 35, 6, '#d9c99a', '#9c8a55', 'normal', 0, 1],
      ['pla_nil', 'ปลานิล', 'river', 1, 15, 40, 7, '#6b7b6b', '#3f4f3f', 'normal', 0, 1],
      ['pla_mor', 'ปลาหมอ', 'river', 1, 8, 20, 5, '#5f6f4a', '#3a4a2a', 'round', 0, 1],
      ['pla_kradi', 'ปลากระดี่', 'river', 1, 5, 12, 4, '#8fb3d9', '#4b6bd6', 'flat', 0, 1],
      ['pla_salid', 'ปลาสลิด', 'river', 1, 10, 22, 6, '#a3b18a', '#5f6f4a', 'flat', 0, 2],
      ['pla_duk', 'ปลาดุก', 'river', 2, 20, 50, 9, '#3a3a3a', '#1f1f1f', 'long', 0, 2],
      ['pla_chon', 'ปลาช่อน', 'river', 2, 25, 70, 12, '#4d5a3a', '#2c3520', 'long', 0, 3],
      ['pla_sawai', 'ปลาสวาย', 'river', 2, 30, 90, 14, '#7a8a9a', '#4a5a6a', 'big', 0, 4],
      ['pla_krai', 'ปลากราย', 'river', 2, 30, 80, 16, '#9aa5b1', '#5d6b78', 'flat', 0, 5],
      ['pla_kod', 'ปลากด', 'river', 2, 20, 55, 10, '#6b5a4a', '#3f3328', 'long', 0, 3],
      ['pla_nuea_on', 'ปลาเนื้ออ่อน', 'river', 2, 20, 50, 11, '#e0dccf', '#a8a394', 'long', 0, 4],
      ['pla_rad', 'ปลาแรด', 'river', 3, 30, 60, 20, '#7d7d7d', '#4a4a4a', 'round', 0, 6],
      ['pla_yisok', 'ปลายี่สก', 'river', 3, 40, 100, 25, '#c9b27a', '#8a7440', 'big', 0, 7],
      ['pla_tepo', 'ปลาเทโพ', 'river', 3, 40, 110, 28, '#8fa3b8', '#55687d', 'big', 0, 8],
      ['pla_lai', 'ปลาไหล', 'river', 2, 40, 90, 12, '#5a4a2a', '#2e2412', 'long', 1, 2],
      ['pla_kaho', 'ปลากะโห้', 'river', 4, 60, 150, 60, '#8a7a5a', '#4f452f', 'big', 0, 12],
      ['pla_buek', 'ปลาบึก', 'river', 5, 100, 300, 250, '#6d7b86', '#3a444d', 'big', 0, 18],
      ['pla_krachang', 'ปลากระชัง', 'river', 1, 8, 20, 5, '#a9a9a9', '#6e6e6e', 'normal', 0, 1],
      ['pla_som', 'ปลาส้ม', 'river', 2, 10, 25, 9, '#e0a070', '#a0603a', 'normal', 0, 3],
      ['pla_kang', 'ปลาแก้มช้ำ', 'river', 2, 8, 18, 8, '#f0a0a0', '#c05050', 'normal', 0, 3],
      ['pla_nai', 'ปลาไน', 'river', 2, 25, 60, 12, '#c9a24a', '#8a6a20', 'round', 0, 4],
      ['pla_carp_koi', 'ปลาคาร์ปโค่ย', 'river', 4, 30, 80, 90, '#ffffff', '#e04848', 'round', 0, 10],
      ['pla_thong', 'ปลาทอง', 'river', 3, 5, 20, 40, '#ffb347', '#e07a1f', 'round', 0, 5],
      ['pla_kat', 'ปลากัด', 'river', 3, 4, 7, 30, '#4b6bd6', '#e63946', 'flat', 0, 4],
      ['pla_hangnokyung', 'ปลาหางนกยูง', 'river', 1, 3, 5, 3, '#ff8fab', '#43aa8b', 'normal', 0, 1],
      ['pla_pao', 'ปลาปักเป้าน้ำจืด', 'river', 3, 8, 15, 22, '#d9c26a', '#6b5a20', 'round', 0, 6],
      ['pla_krabok', 'ปลากระบอก', 'river', 1, 15, 30, 6, '#b0bec5', '#78909c', 'normal', 0, 2],
      ['pla_seua', 'ปลาเสือตอ', 'river', 4, 20, 40, 120, '#f5d33f', '#1b1b1b', 'flat', 0, 11],
      ['pla_kaem', 'ปลาแปบ', 'river', 1, 8, 15, 4, '#dcdcdc', '#9a9a9a', 'normal', 0, 1],
      ['pla_chado', 'ปลาชะโด', 'river', 4, 60, 130, 70, '#3f4f3f', '#1b2a1b', 'long', 1, 12],
      ['pla_krasoob', 'ปลากระสูบ', 'river', 2, 20, 50, 10, '#9fb8a0', '#5a7a5a', 'long', 0, 4],
      ['pla_taphao', 'ปลาตะเพียนทอง', 'river', 3, 15, 35, 30, '#ffd166', '#e0a020', 'normal', 0, 6],
      ['pla_mang', 'ปลาหมึกน้ำจืดหายาก', 'river', 4, 10, 30, 80, '#c8a2c8', '#8e44ad', 'long', 1, 13],
      ['kung_foi', 'กุ้งฝอย', 'river', 1, 2, 5, 2, '#f2d0b0', '#c9977a', 'long', 0, 1],
      ['kung_kam', 'กุ้งก้ามกราม', 'river', 3, 15, 30, 35, '#4b6bd6', '#2b4aa8', 'long', 1, 6],
      ['pu_na', 'ปูนา', 'river', 1, 5, 8, 3, '#8d5524', '#5c3a21', 'round', 0, 1],
      ['hoi_khom', 'หอยขม', 'river', 1, 2, 4, 2, '#3a3a3a', '#6b6b6b', 'round', 0, 1],
      ['kob', 'กบนา', 'river', 2, 8, 15, 8, '#6b8e23', '#3a5a10', 'round', 1, 2],
      // --- ทะเล (deep water) ---
      ['pla_tu', 'ปลาทู', 'sea', 1, 15, 25, 6, '#7fa8c9', '#3f6a8a', 'normal', 0, 1],
      ['pla_lang', 'ปลาลัง', 'sea', 1, 15, 25, 5, '#8fb0c9', '#4f7a9a', 'normal', 0, 1],
      ['pla_kapong', 'ปลากะพงขาว', 'sea', 2, 30, 80, 15, '#d0d8e0', '#8a97a5', 'normal', 0, 3],
      ['pla_kapong_daeng', 'ปลากะพงแดง', 'sea', 3, 30, 70, 28, '#e05050', '#a02020', 'normal', 0, 6],
      ['pla_intree', 'ปลาอินทรี', 'sea', 3, 50, 120, 40, '#6b8fb0', '#2f5f8a', 'long', 0, 8],
      ['pla_kao', 'ปลาเก๋า', 'sea', 3, 30, 90, 35, '#8b6b4a', '#4a3520', 'big', 0, 7],
      ['pla_samli', 'ปลาสำลี', 'sea', 2, 30, 60, 14, '#c0d0d8', '#7a8a92', 'normal', 0, 4],
      ['pla_jalamet', 'ปลาจะละเม็ด', 'sea', 2, 20, 40, 18, '#e8e8f0', '#9a9aa8', 'flat', 0, 5],
      ['pla_sak', 'ปลาสาก', 'sea', 3, 60, 130, 30, '#9aa8b8', '#5a6878', 'long', 0, 7],
      ['pla_hetkone', 'ปลาเห็ดโคน', 'sea', 1, 10, 20, 5, '#e0d0b0', '#a09070', 'normal', 0, 1],
      ['pla_o', 'ปลาโอ', 'sea', 2, 30, 60, 16, '#3f5f8a', '#1f3f6a', 'normal', 0, 4],
      ['pla_tuna', 'ปลาทูน่า', 'sea', 4, 80, 200, 120, '#2f4f7f', '#1a2f4f', 'big', 0, 12],
      ['pla_krathong', 'ปลากระโทงแทง', 'sea', 5, 150, 350, 300, '#4b6bd6', '#1b2a44', 'big', 0, 16],
      ['pla_chalam', 'ปลาฉลามครีบดำ', 'sea', 5, 120, 250, 280, '#6c757d', '#343a40', 'big', 0, 17],
      ['pla_krabaen', 'ปลากระเบน', 'sea', 4, 60, 150, 90, '#5a6a7a', '#2a3a4a', 'flat', 0, 11],
      ['pla_kaphong_lueang', 'ปลากะพงเหลือง', 'sea', 3, 25, 50, 26, '#f5d33f', '#c9a020', 'normal', 0, 6],
      ['pla_sikun', 'ปลาสีกุน', 'sea', 1, 15, 30, 6, '#b0c4de', '#6a8ab0', 'normal', 0, 2],
      ['pla_nokkaeo', 'ปลานกแก้ว', 'sea', 3, 25, 50, 45, '#43aa8b', '#4b6bd6', 'round', 0, 8],
      ['pla_tin', 'ปลาการ์ตูน', 'sea', 3, 5, 10, 40, '#ff8c42', '#ffffff', 'round', 0, 5],
      ['pla_seua_thale', 'ปลาสิงโต', 'sea', 4, 20, 35, 70, '#e04848', '#ffffff', 'flat', 0, 10],
      ['pla_phi_suea', 'ปลาผีเสื้อ', 'sea', 3, 10, 20, 35, '#ffd166', '#1b1b1b', 'flat', 0, 6],
      ['pla_lin_ma', 'ปลาลิ้นหมา', 'sea', 2, 20, 40, 12, '#c9b48a', '#8a7450', 'flat', 0, 3],
      ['pla_hua_on', 'ปลาหัวอ่อน', 'sea', 2, 25, 50, 12, '#a9b8c9', '#6a7a8a', 'normal', 0, 4],
      ['pla_mong', 'ปลาโมง', 'sea', 2, 30, 70, 14, '#7a8a9a', '#4a5a6a', 'long', 0, 4],
      ['pla_dab_lao', 'ปลาดาบลาว', 'sea', 3, 60, 120, 24, '#d0d8e8', '#8a97a8', 'long', 1, 7],
      ['pla_muek_klai', 'ปลาหมึกกล้วย', 'sea', 2, 15, 35, 14, '#f0d0d0', '#c08080', 'long', 1, 3],
      ['pla_muek_yak', 'ปลาหมึกยักษ์', 'sea', 4, 60, 200, 110, '#8e44ad', '#5a2a80', 'round', 1, 12],
      ['pu_ma', 'ปูม้า', 'sea', 2, 10, 18, 15, '#4b8fe0', '#2b5fb0', 'round', 0, 2],
      ['pu_thale', 'ปูทะเล', 'sea', 3, 12, 25, 40, '#2f4f2f', '#1a2f1a', 'round', 0, 6],
      ['kung_mangkon', 'กุ้งมังกร', 'sea', 4, 20, 50, 130, '#e05030', '#8a2a10', 'long', 1, 11],
      ['kung_kulao', 'กุ้งกุลาดำ', 'sea', 2, 15, 25, 18, '#3a3a5a', '#1a1a3a', 'long', 0, 3],
      ['hoi_nangrom', 'หอยนางรม', 'sea', 2, 6, 12, 14, '#8a8a8a', '#5a5a5a', 'round', 0, 3],
      ['hoi_shell', 'หอยเชลล์', 'sea', 3, 8, 14, 30, '#f2c9a0', '#d08a5a', 'round', 0, 6],
      ['pla_dao', 'ปลาดาว', 'sea', 2, 8, 20, 12, '#ff8c42', '#e05030', 'round', 0, 2],
      ['ma_nam', 'ม้าน้ำ', 'sea', 4, 5, 15, 85, '#f5d33f', '#c9a020', 'long', 0, 9],
      ['maengkaphrun', 'แมงกะพรุน', 'sea', 2, 10, 30, 8, '#c8e6ff', '#8fc4f0', 'round', 1, 2],
      ['tao_thale', 'เต่าทะเล', 'sea', 5, 60, 120, 200, '#4e9e3c', '#2e6b2a', 'round', 0, 15],
      ['pla_pao_thale', 'ปลาปักเป้าทะเล', 'sea', 3, 15, 40, 26, '#d9c26a', '#3a3a3a', 'round', 0, 5],
      ['pla_wan', 'ปลาวาฬน้อย', 'sea', 5, 200, 500, 400, '#5a6a7a', '#2a3a4a', 'big', 1, 20],
      ['pla_lo', 'ปลาโลมา', 'sea', 5, 150, 300, 350, '#8fb0c9', '#4f7a9a', 'big', 0, 19],
      ['pla_krachong', 'ปลากระจง', 'sea', 2, 20, 40, 10, '#a0b0c0', '#607080', 'normal', 0, 3],
      ['pla_kluai', 'ปลากล้วย', 'sea', 1, 10, 20, 4, '#e0e0a0', '#a0a060', 'normal', 0, 1],
      ['pla_taphao_thale', 'ปลาตะเภาทะเล', 'sea', 2, 20, 40, 11, '#c0c0c0', '#808080', 'normal', 0, 3],
      ['pla_moo', 'ปลาหมูสี', 'sea', 2, 15, 30, 12, '#ff8fab', '#c05070', 'normal', 0, 3],
      ['pla_wua', 'ปลาวัว', 'sea', 3, 20, 40, 28, '#8a7a5a', '#4a3a2a', 'round', 0, 6],
      ['pla_khang_bai', 'ปลาข้างเหลือง', 'sea', 1, 15, 25, 5, '#f5e6a0', '#c9b040', 'normal', 0, 1],
      // --- ทั้งสอง / กลางคืน / หายาก ---
      ['pla_kang_kam', 'ปลากางเขน', 'any', 3, 15, 30, 32, '#1b1b1b', '#ffffff', 'flat', 1, 6],
      ['pla_ruang', 'ปลาเรืองแสง', 'any', 4, 8, 20, 95, '#7cf2ff', '#2ebbd0', 'normal', 1, 9],
      ['pla_darkfish', 'ปลาเงาดำ', 'any', 4, 20, 45, 100, '#1b1b1b', '#4b0082', 'long', 1, 10],
      ['pla_chan', 'ปลาจันทรา', 'any', 4, 25, 50, 110, '#e8e8ff', '#a0a0ff', 'round', 1, 12],
      ['pla_crystal', 'ปลาคริสตัล', 'any', 5, 15, 30, 260, '#bfe3ff', '#ffffff', 'flat', 0, 14],
      ['pla_mangkon', 'ปลามังกร', 'any', 5, 60, 120, 500, '#e04848', '#ffd166', 'long', 1, 22],
      ['pla_racha', 'ปลาราชา', 'any', 5, 80, 160, 600, '#ffd166', '#8e44ad', 'big', 0, 24],
      ['pla_phi', 'ปลาผี', 'any', 4, 20, 40, 120, '#dcdcdc', '#7a7a7a', 'normal', 1, 11],
      ['pla_fai', 'ปลาเปลวไฟ', 'any', 4, 15, 35, 130, '#ff6b35', '#ffd166', 'normal', 1, 13],
      ['pla_namkhaeng', 'ปลาน้ำแข็ง', 'any', 4, 15, 35, 130, '#bfe3ff', '#4b8fe0', 'normal', 0, 13],
      ['pla_saifa', 'ปลาสายฟ้า', 'any', 4, 20, 40, 140, '#f5d33f', '#4b6bd6', 'long', 1, 14],
      ['pla_rungkinnam', 'ปลารุ้ง', 'any', 3, 10, 25, 55, '#ff8fab', '#43aa8b', 'normal', 0, 7],
      ['pla_kaew', 'ปลาแก้ว', 'any', 2, 5, 12, 10, '#e8f4ff', '#b0d0f0', 'normal', 0, 2],
      ['pla_thong_kham', 'ปลาทองคำ', 'any', 5, 20, 40, 450, '#ffd166', '#c9a020', 'round', 0, 21],
      ['pla_ngoen', 'ปลาเงิน', 'any', 3, 15, 30, 45, '#e0e0e0', '#a0a0a0', 'normal', 1, 8],
      ['pla_boran', 'ปลาโบราณ', 'any', 5, 50, 100, 380, '#6b5a4a', '#3a2f22', 'big', 0, 23],
      ['pla_awakat', 'ปลาอวกาศ', 'any', 5, 20, 40, 520, '#1b2a44', '#7cf2ff', 'round', 1, 25],
      ['pla_ying', 'ปลายิ้ม', 'any', 2, 8, 16, 9, '#ffe08a', '#e0a020', 'round', 0, 2],
      ['pla_kalok', 'ปลากะโหลก', 'any', 3, 20, 40, 38, '#dcdcdc', '#1b1b1b', 'round', 1, 7],
      ['pla_dok', 'ปลาดอกไม้', 'any', 2, 8, 15, 12, '#ff8fab', '#f7d94c', 'flat', 0, 3],
      ['pla_hin', 'ปลาหิน', 'any', 2, 15, 30, 10, '#8f8f93', '#5f5f63', 'round', 0, 2],
      ['pla_sai', 'ปลาทราย', 'any', 1, 10, 20, 4, '#e9d79f', '#c9b070', 'normal', 0, 1],
      ['pla_bai_mai', 'ปลาใบไม้', 'any', 2, 8, 15, 8, '#78c850', '#4e9e3c', 'flat', 0, 2],
      ['pla_mek', 'ปลาเมฆ', 'any', 3, 15, 30, 40, '#ffffff', '#c8d8e8', 'round', 0, 8],
      ['pla_wela', 'ปลากาลเวลา', 'any', 5, 30, 60, 700, '#8e44ad', '#ffd166', 'flat', 1, 25],
    ];
    D.FISH = {}; D.FISH_LIST = [];
    for (const [id, th, habitat, rarity, minCm, maxCm, price, color, color2, shape, night, lv] of F) {
      const f = { id, th, habitat, rarity, minCm, maxCm, price, color, color2, shape, night: !!night, lv };
      D.FISH[id] = f; D.FISH_LIST.push(f);
      D.ITEMS[id] = { th, cat: 'fish', stack: 99, fish: id, food: { h: Math.min(30, 4 + rarity * 4), f: rarity } };
      D.SHOP.sell[id] = price;
    }
    D.RARITY_TH = { 1: 'ธรรมดา', 2: 'ไม่ธรรมดา', 3: 'หายาก', 4: 'หายากมาก', 5: 'ตำนาน' };
    D.RARITY_COLOR = { 1: '#8a8a8a', 2: '#43aa8b', 3: '#4b6bd6', 4: '#8e44ad', 5: '#e07a1f' };
    D.FISH_XP = { 1: 8, 2: 15, 3: 30, 4: 60, 5: 120 };
    // rod tier -> rarity weights (chance table) ; higher tiers open rarer fish
    D.ROD_WEIGHTS = { 1: [70, 25, 5, 0.5, 0.05], 2: [55, 30, 12, 2.5, 0.2], 3: [42, 32, 18, 6, 0.6], 4: [32, 32, 22, 11, 1.5], 5: [24, 30, 25, 16, 4] };

    // ---------- fish dishes ----------
    const dishes = [
      ['pla_tu_tod', 'ปลาทูทอด', { pla_tu: 2 }, 40, 6, 1], ['tomyum_chon', 'ต้มยำปลาช่อน', { pla_chon: 1, chili: 2 }, 70, 14, 4], ['pla_nil_phao', 'ปลานิลเผา', { pla_nil: 1 }, 45, 6, 2],
      ['pla_duk_yang', 'ปลาดุกย่าง', { pla_duk: 1, chili: 1 }, 50, 8, 3], ['sashimi', 'ซาชิมิทูน่า', { pla_tuna: 1, rice: 2 }, 120, 30, 12], ['pu_pad', 'ปูผัดผงกะหรี่', { pu_ma: 2, chili: 1 }, 80, 20, 5],
      ['kung_ob', 'กุ้งอบวุ้นเส้น', { kung_kam: 2 }, 85, 18, 7], ['pla_kapong_neung', 'ปลากะพงนึ่งมะนาว', { pla_kapong: 1, chili: 2 }, 90, 20, 6], ['fish_soup', 'ซุปปลารวม', { pla_sroi: 2, pla_tapian: 1, carrot: 1 }, 55, 8, 2],
      ['muek_yang', 'ปลาหมึกย่าง', { pla_muek_klai: 2, chili: 1 }, 60, 14, 4], ['fish_cake', 'ทอดมันปลากราย', { pla_krai: 1, chili: 2 }, 75, 16, 6], ['lobster_grill', 'กุ้งมังกรย่างเนย', { kung_mangkon: 1 }, 150, 40, 12],
    ];
    for (const [id, th, cost, h, f, lv] of dishes) { D.ITEMS[id] = { th, cat: 'food', stack: 99, food: { h, f, e: Math.round(h / 4) } }; D.COOKING.push({ id, out: id, n: 1, in: cost, lv }); D.SHOP.sell[id] = Math.round(h * 1.2); }
    return D;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = build;
  else build(root.DEFS);
})(typeof window !== 'undefined' ? window : globalThis);
