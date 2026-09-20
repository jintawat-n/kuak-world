/* ==========================================================
   Kuak World - wildlife: land animals, birds, dinosaurs + animal foods
   ========================================================== */
(function (root) {
  function build(D) {
    // ---------- animal drop items ----------
    const mats = [
      ['meat', 'เนื้อสัตว์', '#c0392b', { h: 12 }], ['poultry', 'เนื้อสัตว์ปีก', '#e8b4a0', { h: 10 }], ['dino_meat', 'เนื้อไดโนเสาร์', '#8e2a2a', { h: 22 }],
      ['egg', 'ไข่', '#f5e6c8', { h: 8 }], ['dino_egg', 'ไข่ไดโนเสาร์', '#9fd59a', { h: 25 }], ['feather', 'ขนนก', '#f0f0f0', null], ['bone', 'กระดูก', '#e8e0c8', null],
      ['horn', 'เขาสัตว์', '#6b5a4a', null], ['ivory', 'งาช้าง', '#fdf6e3', null], ['dino_tooth', 'ฟันไดโนเสาร์', '#f5f0e0', null], ['scale', 'เกล็ด', '#43aa8b', null],
      ['wool', 'ขนแกะ', '#f7f7f7', null], ['fur', 'ขนสัตว์', '#8d5524', null], ['milk', 'นม', '#ffffff', { h: 10, e: 5 }], ['honey', 'น้ำผึ้งป่า', '#f2a900', { h: 15, f: 8 }],
    ];
    for (const [id, th, color, food] of mats) { if (!D.ITEMS[id]) D.ITEMS[id] = { th, cat: food ? 'food' : 'mat', stack: 999, color, food: food || undefined }; }
    Object.assign(D.SHOP.sell, { meat: 6, poultry: 5, dino_meat: 20, egg: 3, dino_egg: 40, feather: 2, bone: 2, horn: 12, ivory: 60, dino_tooth: 45, scale: 8, wool: 6, fur: 8, milk: 4, honey: 10 });
    // wool/fur/scale usable as era materials
    D.RECIPES.push({ id: 'linen_wool', out: 'linen', n: 2, in: { wool: 2 }, cat: 'mat', lv: 5 }, { id: 'hide_fur', out: 'hide', n: 2, in: { fur: 2 }, cat: 'mat', lv: 1 }, { id: 'rope_fur', out: 'rope', n: 3, in: { fur: 1, wood: 1 }, cat: 'mat', lv: 1 });

    // ---------- species ----------
    // [id, th, group, shape, size, hp, dmg, speed, behavior, rarity, biomes, when(0 day,1 night,2 both), lv, color, color2, drops]
    const G = 'grass', F = 'forest', S = 'sand', R = 'stone', N = 'snow', W = 'water', Dz = 'dino';
    const A = [
      // ===== สัตว์บก (50) =====
      ['rabbit', 'กระต่ายป่า', 'land', 'quad_s', 0.6, 8, 0, 3.2, 'passive', 1, [G, F], 2, 1, '#c9b48a', '#f7f7f7', [['meat', 1, 1, 1], ['fur', 1, 1, 0.5]]],
      ['squirrel', 'กระรอก', 'land', 'small', 0.5, 6, 0, 3.4, 'passive', 1, [F], 0, 1, '#a0522d', '#f2c9a0', [['fur', 1, 1, 0.6], ['meat', 1, 1, 0.5]]],
      ['chicken', 'ไก่ป่า', 'land', 'bird', 0.6, 10, 0, 2.2, 'passive', 1, [G], 0, 1, '#c0392b', '#f5d33f', [['poultry', 1, 2, 1], ['feather', 1, 3, 1], ['egg', 1, 1, 0.5]]],
      ['deer', 'กวาง', 'land', 'quad', 1.1, 30, 0, 3.6, 'passive', 1, [G, F], 0, 1, '#a97a3f', '#f2e0c0', [['meat', 2, 3, 1], ['fur', 1, 2, 0.7], ['horn', 1, 1, 0.3]]],
      ['boar', 'หมูป่า', 'land', 'quad', 1.0, 45, 8, 2.8, 'neutral', 1, [F, G], 2, 2, '#4a3a2a', '#2a1f14', [['meat', 2, 4, 1], ['fur', 1, 1, 0.5], ['bone', 1, 1, 0.3]]],
      ['goat', 'แพะภูเขา', 'land', 'quad', 0.9, 28, 4, 2.6, 'neutral', 1, [R, G], 0, 1, '#dcdcdc', '#8a8a8a', [['meat', 2, 3, 1], ['milk', 1, 2, 0.6], ['horn', 1, 2, 0.5]]],
      ['sheep', 'แกะ', 'land', 'quad', 0.9, 26, 0, 2.0, 'passive', 1, [G], 0, 1, '#f7f7f7', '#3a3a3a', [['wool', 2, 4, 1], ['meat', 1, 2, 0.8]]],
      ['cow', 'วัวป่า', 'land', 'quad_b', 1.4, 70, 6, 2.0, 'neutral', 1, [G], 0, 2, '#8d5524', '#f7f7f7', [['meat', 3, 5, 1], ['milk', 1, 3, 0.7], ['hide', 1, 2, 0.6], ['bone', 1, 2, 0.4]]],
      ['buffalo', 'ควาย', 'land', 'quad_b', 1.5, 90, 10, 1.9, 'neutral', 2, [G, W], 0, 3, '#3a3a3a', '#5a5a5a', [['meat', 3, 6, 1], ['hide', 1, 2, 0.8], ['horn', 1, 2, 0.6]]],
      ['fox', 'จิ้งจอก', 'land', 'quad_s', 0.7, 22, 5, 3.6, 'neutral', 2, [F, G], 1, 2, '#e07a1f', '#f7f7f7', [['fur', 1, 2, 1], ['meat', 1, 1, 0.5]]],
      ['wolf', 'หมาป่า', 'land', 'quad', 1.0, 55, 12, 3.6, 'hostile', 2, [F, N], 1, 4, '#8a8a8a', '#dcdcdc', [['fur', 1, 2, 1], ['meat', 1, 2, 0.8], ['bone', 1, 1, 0.4]]],
      ['bear', 'หมี', 'land', 'quad_b', 1.5, 120, 18, 2.6, 'neutral', 3, [F, R], 2, 6, '#5c3a21', '#3a2414', [['meat', 3, 5, 1], ['fur', 2, 3, 1], ['honey', 1, 2, 0.4]]],
      ['tiger', 'เสือโคร่ง', 'land', 'quad', 1.3, 140, 22, 3.8, 'hostile', 4, [F], 2, 9, '#f28c28', '#1b1b1b', [['fur', 2, 3, 1], ['meat', 2, 4, 1], ['bone', 1, 2, 0.5]]],
      ['leopard', 'เสือดาว', 'land', 'quad', 1.1, 110, 18, 4.0, 'hostile', 3, [F], 1, 8, '#e9c46a', '#1b1b1b', [['fur', 2, 3, 1], ['meat', 2, 3, 1]]],
      ['elephant', 'ช้าง', 'land', 'quad_b', 2.0, 260, 24, 1.8, 'neutral', 3, [F, G], 0, 8, '#8a8a8a', '#6a6a6a', [['meat', 5, 8, 1], ['ivory', 1, 2, 0.8], ['hide', 2, 3, 1]]],
      ['monkey', 'ลิง', 'land', 'small', 0.7, 20, 3, 3.6, 'neutral', 1, [F], 0, 1, '#a0733a', '#f2c9a0', [['coconut', 1, 2, 0.6], ['fur', 1, 1, 0.3]]],
      ['gibbon', 'ชะนี', 'land', 'small', 0.7, 22, 2, 3.4, 'passive', 2, [F], 0, 2, '#1b1b1b', '#f7f7f7', [['fur', 1, 1, 0.5], ['berry', 1, 3, 0.6]]],
      ['pangolin', 'ตัวนิ่ม', 'land', 'small', 0.7, 30, 0, 1.6, 'passive', 3, [F], 1, 4, '#a0733a', '#6b4a2a', [['scale', 2, 4, 1], ['meat', 1, 1, 0.5]]],
      ['mouse_deer', 'กระจง', 'land', 'quad_s', 0.6, 14, 0, 3.6, 'passive', 2, [F], 1, 2, '#8d5524', '#f2e0c0', [['meat', 1, 2, 1], ['fur', 1, 1, 0.4]]],
      ['tapir', 'สมเสร็จ', 'land', 'quad_b', 1.3, 80, 6, 2.2, 'passive', 3, [F, W], 1, 5, '#1b1b1b', '#f7f7f7', [['meat', 3, 4, 1], ['hide', 1, 2, 0.7]]],
      ['gaur', 'กระทิง', 'land', 'quad_b', 1.6, 160, 20, 2.4, 'neutral', 3, [F, G], 0, 7, '#2a1f14', '#f7f7f7', [['meat', 4, 7, 1], ['horn', 1, 2, 0.8], ['hide', 2, 3, 1]]],
      ['banteng', 'วัวแดง', 'land', 'quad_b', 1.5, 130, 14, 2.4, 'neutral', 3, [G], 0, 6, '#b5493c', '#f7f7f7', [['meat', 4, 6, 1], ['hide', 1, 2, 0.8], ['horn', 1, 1, 0.5]]],
      ['porcupine', 'เม่น', 'land', 'small', 0.7, 26, 6, 1.8, 'neutral', 2, [F, R], 1, 3, '#3a3a3a', '#e8e0c8', [['meat', 1, 2, 0.8], ['bone', 1, 2, 0.5]]],
      ['civet', 'ชะมด', 'land', 'quad_s', 0.7, 20, 3, 3.2, 'passive', 2, [F], 1, 2, '#6b6b6b', '#1b1b1b', [['fur', 1, 2, 1], ['meat', 1, 1, 0.5]]],
      ['otter', 'นาก', 'land', 'quad_s', 0.7, 22, 2, 3.0, 'passive', 2, [W], 2, 2, '#5c3a21', '#c9a063', [['fur', 1, 2, 1], ['pla_sroi', 1, 2, 0.6]]],
      ['lizard', 'ตะกวด', 'land', 'long', 0.9, 35, 6, 2.6, 'neutral', 2, [W, S], 0, 3, '#5f6f4a', '#c9c98a', [['meat', 1, 2, 0.8], ['scale', 1, 2, 0.7]]],
      ['croc', 'จระเข้', 'land', 'long', 1.5, 150, 22, 2.4, 'hostile', 3, [W], 2, 8, '#3f5f2f', '#a3b18a', [['meat', 3, 5, 1], ['scale', 2, 4, 1], ['dino_tooth', 1, 1, 0.2]]],
      ['python', 'งูเหลือม', 'land', 'long', 1.2, 60, 10, 2.0, 'neutral', 2, [F, W], 1, 4, '#8a7a4a', '#3a2f1a', [['scale', 2, 3, 1], ['meat', 1, 2, 0.7]]],
      ['cobra', 'งูเห่า', 'land', 'long', 0.8, 30, 14, 2.8, 'hostile', 2, [G, S], 2, 4, '#3a3a3a', '#e9c46a', [['scale', 1, 2, 1], ['essence', 1, 1, 0.15]]],
      ['turtle', 'เต่าบก', 'land', 'small', 0.6, 30, 0, 1.0, 'passive', 1, [G, W], 0, 1, '#4e9e3c', '#8a7a4a', [['meat', 1, 1, 0.6], ['scale', 1, 1, 0.4]]],
      ['frog_big', 'กบยักษ์', 'land', 'small', 0.6, 15, 2, 2.4, 'passive', 1, [W], 1, 1, '#6b8e23', '#3a5a10', [['meat', 1, 1, 0.8]]],
      ['cat_wild', 'แมวป่า', 'land', 'quad_s', 0.7, 25, 6, 3.8, 'neutral', 2, [G, F], 1, 3, '#c9b48a', '#8a7a5a', [['fur', 1, 2, 1], ['meat', 1, 1, 0.4]]],
      ['dog_wild', 'หมาใน', 'land', 'quad', 0.9, 40, 9, 3.6, 'hostile', 2, [G, F], 2, 4, '#c0763a', '#f2c9a0', [['fur', 1, 2, 1], ['meat', 1, 2, 0.6]]],
      ['hyena', 'ไฮยีนา', 'land', 'quad', 1.0, 50, 11, 3.4, 'hostile', 2, [S, G], 1, 5, '#a0733a', '#3a2f1a', [['fur', 1, 2, 1], ['bone', 1, 2, 0.6]]],
      ['camel', 'อูฐ', 'land', 'quad_b', 1.5, 90, 6, 2.6, 'passive', 2, [S], 0, 4, '#c9a063', '#8a6a3a', [['meat', 3, 5, 1], ['milk', 1, 2, 0.5], ['fur', 1, 2, 0.6]]],
      ['zebra', 'ม้าลาย', 'land', 'quad', 1.2, 60, 6, 3.8, 'passive', 2, [G, S], 0, 4, '#f7f7f7', '#1b1b1b', [['meat', 2, 4, 1], ['hide', 1, 2, 0.7]]],
      ['giraffe', 'ยีราฟ', 'land', 'tall', 2.0, 110, 8, 2.8, 'passive', 3, [G, S], 0, 6, '#e9c46a', '#a0733a', [['meat', 3, 5, 1], ['hide', 2, 3, 0.8]]],
      ['rhino', 'แรด', 'land', 'quad_b', 1.7, 220, 26, 2.4, 'neutral', 4, [G, S], 0, 10, '#8a8a8a', '#5a5a5a', [['meat', 4, 6, 1], ['horn', 2, 3, 1], ['hide', 2, 3, 1]]],
      ['hippo', 'ฮิปโป', 'land', 'quad_b', 1.7, 240, 28, 2.0, 'hostile', 4, [W], 1, 10, '#7a5a6a', '#f2c9d0', [['meat', 5, 7, 1], ['hide', 2, 3, 1], ['ivory', 1, 1, 0.4]]],
      ['lion', 'สิงโต', 'land', 'quad', 1.3, 150, 24, 3.6, 'hostile', 4, [G, S], 2, 10, '#e9c46a', '#8a5a2a', [['fur', 2, 3, 1], ['meat', 2, 4, 1], ['bone', 1, 2, 0.6]]],
      ['gorilla', 'กอริลลา', 'land', 'quad_b', 1.4, 170, 22, 2.6, 'neutral', 4, [F], 0, 9, '#1b1b1b', '#3a3a3a', [['fur', 2, 3, 1], ['meat', 2, 3, 0.7]]],
      ['panda', 'แพนด้า', 'land', 'quad_b', 1.3, 90, 6, 1.8, 'passive', 4, [F, N], 0, 7, '#f7f7f7', '#1b1b1b', [['fur', 2, 3, 1], ['sapling', 1, 2, 0.5]]],
      ['polar_bear', 'หมีขั้วโลก', 'land', 'quad_b', 1.6, 200, 26, 2.8, 'hostile', 4, [N], 2, 11, '#f7f7f7', '#dcdcdc', [['fur', 3, 4, 1], ['meat', 3, 5, 1]]],
      ['penguin', 'เพนกวิน', 'land', 'bird_b', 0.8, 25, 0, 1.6, 'passive', 2, [N], 0, 2, '#1b1b1b', '#f7f7f7', [['poultry', 1, 2, 0.8], ['feather', 1, 2, 0.8], ['egg', 1, 1, 0.3]]],
      ['reindeer', 'กวางเรนเดียร์', 'land', 'quad', 1.2, 50, 5, 3.2, 'passive', 2, [N], 0, 3, '#8a7a6a', '#f2e0c0', [['meat', 2, 4, 1], ['horn', 1, 2, 0.7], ['fur', 1, 2, 0.7]]],
      ['yak', 'จามรี', 'land', 'quad_b', 1.5, 120, 10, 2.0, 'neutral', 3, [N, R], 0, 5, '#3a2f1a', '#8a7a6a', [['meat', 3, 5, 1], ['wool', 2, 4, 1], ['milk', 1, 2, 0.5]]],
      ['snow_leopard', 'เสือดาวหิมะ', 'land', 'quad', 1.1, 120, 20, 4.0, 'hostile', 4, [N, R], 2, 10, '#dcdcdc', '#8a8a8a', [['fur', 2, 3, 1], ['meat', 2, 3, 0.8]]],
      ['mammoth', 'แมมมอธ', 'land', 'quad_b', 2.2, 380, 30, 1.8, 'neutral', 5, [N], 2, 14, '#5c3a21', '#c9a063', [['meat', 6, 9, 1], ['ivory', 2, 3, 1], ['fur', 3, 5, 1]]],
      ['sabertooth', 'เสือเขี้ยวดาบ', 'land', 'quad', 1.4, 220, 34, 3.8, 'hostile', 5, [N, R], 2, 15, '#c9a063', '#f7f7f7', [['fur', 2, 4, 1], ['dino_tooth', 1, 2, 0.8], ['meat', 3, 4, 1]]],
      ['unicorn', 'ยูนิคอร์น', 'land', 'quad', 1.2, 150, 10, 4.4, 'passive', 5, [F], 1, 16, '#ffffff', '#ff8fab', [['essence', 2, 4, 1], ['horn', 1, 1, 1], ['fur', 1, 2, 0.5]]],
      // ===== สัตว์ปีก (35) =====
      ['sparrow', 'นกกระจอก', 'bird', 'fly', 0.4, 4, 0, 4.0, 'passive', 1, [G, F], 0, 1, '#8d5524', '#c9b48a', [['feather', 1, 2, 1], ['poultry', 1, 1, 0.3]]],
      ['pigeon', 'นกพิราบ', 'bird', 'fly', 0.5, 6, 0, 3.8, 'passive', 1, [G], 0, 1, '#8a8a9a', '#5a5a6a', [['feather', 1, 2, 1], ['poultry', 1, 1, 0.5]]],
      ['duck', 'เป็ดป่า', 'bird', 'bird', 0.6, 12, 0, 2.4, 'passive', 1, [W], 0, 1, '#3f5f2f', '#c9b48a', [['poultry', 1, 2, 1], ['feather', 1, 3, 1], ['egg', 1, 2, 0.6]]],
      ['goose', 'ห่าน', 'bird', 'bird_b', 0.8, 20, 4, 2.4, 'neutral', 1, [W, G], 0, 1, '#f7f7f7', '#f28c28', [['poultry', 2, 3, 1], ['feather', 2, 4, 1], ['egg', 1, 2, 0.5]]],
      ['crow', 'อีกา', 'bird', 'fly', 0.5, 8, 1, 4.0, 'passive', 1, [G, F], 2, 1, '#1b1b1b', '#3a3a3a', [['feather', 1, 3, 1]]],
      ['myna', 'นกเอี้ยง', 'bird', 'fly', 0.5, 6, 0, 3.8, 'passive', 1, [G], 0, 1, '#3a3a3a', '#f5d33f', [['feather', 1, 2, 1]]],
      ['parrot', 'นกแก้ว', 'bird', 'fly', 0.5, 8, 0, 4.0, 'passive', 2, [F], 0, 2, '#43aa8b', '#e63946', [['feather', 2, 3, 1]]],
      ['hornbill', 'นกเงือก', 'bird', 'fly_b', 0.9, 25, 3, 3.6, 'passive', 3, [F], 0, 5, '#1b1b1b', '#f5d33f', [['feather', 2, 4, 1], ['poultry', 1, 2, 0.6]]],
      ['peacock', 'นกยูง', 'bird', 'bird_b', 0.9, 24, 2, 2.6, 'passive', 3, [F, G], 0, 4, '#4b6bd6', '#43aa8b', [['feather', 3, 5, 1], ['poultry', 1, 2, 0.5]]],
      ['crane', 'นกกระเรียน', 'bird', 'bird_b', 1.0, 22, 3, 3.0, 'passive', 3, [W], 0, 4, '#f7f7f7', '#c0392b', [['feather', 2, 4, 1], ['poultry', 1, 2, 0.5]]],
      ['heron', 'นกกระยาง', 'bird', 'bird_b', 0.8, 16, 2, 3.0, 'passive', 1, [W], 0, 1, '#f7f7f7', '#f5d33f', [['feather', 1, 3, 1]]],
      ['owl', 'นกฮูก', 'bird', 'fly', 0.6, 14, 4, 3.6, 'neutral', 2, [F], 1, 3, '#8a7a5a', '#f2e0c0', [['feather', 2, 3, 1]]],
      ['eagle', 'นกอินทรี', 'bird', 'fly_b', 1.0, 45, 12, 4.4, 'hostile', 3, [R, G], 0, 7, '#5c3a21', '#f7f7f7', [['feather', 3, 5, 1], ['poultry', 1, 2, 0.6]]],
      ['hawk', 'เหยี่ยว', 'bird', 'fly', 0.7, 28, 8, 4.6, 'hostile', 2, [G, R], 0, 4, '#8a7a5a', '#dcdcdc', [['feather', 2, 4, 1]]],
      ['vulture', 'แร้ง', 'bird', 'fly_b', 1.0, 40, 6, 3.8, 'neutral', 2, [S, R], 0, 5, '#3a3a3a', '#e07a1f', [['feather', 2, 4, 1], ['bone', 1, 2, 0.5]]],
      ['kingfisher', 'นกกระเต็น', 'bird', 'fly', 0.4, 6, 0, 4.2, 'passive', 2, [W], 0, 2, '#4b8fe0', '#f28c28', [['feather', 1, 2, 1], ['pla_siw', 1, 1, 0.5]]],
      ['woodpecker', 'นกหัวขวาน', 'bird', 'fly', 0.5, 8, 0, 3.8, 'passive', 2, [F], 0, 2, '#c0392b', '#1b1b1b', [['feather', 1, 2, 1], ['wood', 1, 2, 0.5]]],
      ['hummingbird', 'นกฮัมมิงเบิร์ด', 'bird', 'fly', 0.3, 3, 0, 5.0, 'passive', 3, [G, F], 0, 3, '#43aa8b', '#ff8fab', [['feather', 1, 1, 1], ['honey', 1, 1, 0.4]]],
      ['swan', 'หงส์', 'bird', 'bird_b', 1.0, 30, 4, 2.6, 'passive', 3, [W], 0, 5, '#ffffff', '#f28c28', [['feather', 3, 5, 1], ['egg', 1, 2, 0.5]]],
      ['pelican', 'นกกระทุง', 'bird', 'bird_b', 1.0, 28, 3, 2.8, 'passive', 2, [W], 0, 3, '#f7f7f7', '#f5d33f', [['feather', 2, 3, 1], ['pla_tu', 1, 2, 0.6]]],
      ['flamingo', 'ฟลามิงโก', 'bird', 'bird_b', 1.0, 22, 2, 2.8, 'passive', 3, [W, S], 0, 5, '#ff8fab', '#1b1b1b', [['feather', 3, 5, 1]]],
      ['ostrich', 'นกกระจอกเทศ', 'bird', 'bird_b', 1.4, 60, 10, 4.6, 'neutral', 3, [S, G], 0, 6, '#3a3a3a', '#f2c9a0', [['poultry', 3, 5, 1], ['egg', 1, 1, 0.8], ['feather', 3, 5, 1]]],
      ['emu', 'นกอีมู', 'bird', 'bird_b', 1.3, 55, 8, 4.4, 'neutral', 3, [G, S], 0, 6, '#5a4a3a', '#8a7a6a', [['poultry', 3, 4, 1], ['egg', 1, 1, 0.7]]],
      ['turkey', 'ไก่งวง', 'bird', 'bird_b', 0.8, 22, 2, 2.4, 'passive', 2, [G, F], 0, 2, '#5c3a21', '#c0392b', [['poultry', 2, 4, 1], ['feather', 2, 3, 1]]],
      ['pheasant', 'ไก่ฟ้า', 'bird', 'bird', 0.7, 16, 0, 3.0, 'passive', 2, [F], 0, 3, '#c0763a', '#43aa8b', [['poultry', 1, 3, 1], ['feather', 2, 4, 1]]],
      ['quail', 'นกกระทา', 'bird', 'bird', 0.4, 6, 0, 3.0, 'passive', 1, [G], 0, 1, '#8a7a5a', '#c9b48a', [['poultry', 1, 1, 1], ['egg', 1, 2, 0.7]]],
      ['toucan', 'นกทูแคน', 'bird', 'fly', 0.6, 10, 0, 3.8, 'passive', 3, [F], 0, 4, '#1b1b1b', '#f28c28', [['feather', 2, 3, 1]]],
      ['bat', 'ค้างคาว', 'bird', 'fly', 0.4, 6, 2, 4.4, 'neutral', 1, [F, R], 1, 1, '#3a3a3a', '#5a2a80', [['fur', 1, 1, 0.5]]],
      ['seagull', 'นกนางนวล', 'bird', 'fly', 0.5, 8, 0, 4.0, 'passive', 1, [W, S], 0, 1, '#f7f7f7', '#8a8a8a', [['feather', 1, 2, 1]]],
      ['albatross', 'อัลบาทรอส', 'bird', 'fly_b', 1.1, 30, 3, 4.6, 'passive', 3, [W], 0, 6, '#f7f7f7', '#1b1b1b', [['feather', 3, 5, 1]]],
      ['snowy_owl', 'นกฮูกหิมะ', 'bird', 'fly', 0.6, 18, 5, 3.8, 'neutral', 3, [N], 1, 5, '#ffffff', '#3a3a3a', [['feather', 2, 4, 1]]],
      ['phoenix', 'ฟีนิกซ์', 'bird', 'fly_b', 1.2, 180, 22, 4.8, 'neutral', 5, [R], 1, 18, '#ff6b35', '#ffd166', [['feather', 3, 5, 1], ['essence', 2, 3, 1], ['egg', 1, 1, 0.3]]],
      ['garuda', 'ครุฑ', 'bird', 'fly_b', 1.4, 240, 28, 4.6, 'hostile', 5, [R], 0, 20, '#e63946', '#ffd166', [['feather', 4, 6, 1], ['essence', 2, 4, 1], ['dino_tooth', 1, 1, 0.3]]],
      ['thunderbird', 'นกสายฟ้า', 'bird', 'fly_b', 1.3, 200, 26, 5.0, 'hostile', 5, [R, N], 1, 19, '#4b6bd6', '#f5d33f', [['feather', 4, 6, 1], ['essence', 2, 3, 1]]],
      ['dodo', 'นกโดโด', 'bird', 'bird_b', 0.9, 30, 0, 1.8, 'passive', 4, [F], 0, 8, '#8a8a9a', '#f5d33f', [['poultry', 2, 4, 1], ['egg', 1, 1, 0.5], ['feather', 2, 3, 1]]],
      // ===== ไดโนเสาร์ (35) =====
      ['compy', 'คอมป์ซอกนาทัส', 'dino', 'raptor', 0.6, 20, 4, 4.2, 'neutral', 1, [Dz], 2, 1, '#8fbf6a', '#4e7a3a', [['dino_meat', 1, 1, 1], ['dino_tooth', 1, 1, 0.2]]],
      ['raptor', 'เวโลซิแรปเตอร์', 'dino', 'raptor', 0.9, 70, 16, 4.4, 'hostile', 2, [Dz], 2, 4, '#c9a063', '#6b4a2a', [['dino_meat', 1, 2, 1], ['dino_tooth', 1, 2, 0.5], ['feather', 1, 2, 0.4]]],
      ['deinonychus', 'ไดโนนีคัส', 'dino', 'raptor', 1.0, 90, 18, 4.2, 'hostile', 3, [Dz], 2, 6, '#7a5a3a', '#e9c46a', [['dino_meat', 1, 3, 1], ['dino_tooth', 1, 2, 0.6]]],
      ['dilo', 'ไดโลโฟซอรัส', 'dino', 'raptor', 1.1, 100, 20, 3.8, 'hostile', 3, [Dz], 2, 7, '#43aa8b', '#e63946', [['dino_meat', 2, 3, 1], ['scale', 1, 2, 0.6]]],
      ['gallimimus', 'กัลลิไมมัส', 'dino', 'raptor', 1.2, 60, 6, 5.0, 'passive', 2, [Dz], 0, 3, '#c9b48a', '#8a7a5a', [['dino_meat', 2, 3, 1], ['dino_egg', 1, 1, 0.3]]],
      ['oviraptor', 'โอวิแรปเตอร์', 'dino', 'raptor', 0.8, 45, 8, 4.0, 'neutral', 2, [Dz], 0, 3, '#4b6bd6', '#f5d33f', [['dino_egg', 1, 2, 0.8], ['dino_meat', 1, 2, 0.8]]],
      ['trex', 'ทีเร็กซ์', 'dino', 'trex', 2.2, 450, 40, 3.2, 'hostile', 5, [Dz], 2, 18, '#5a4a3a', '#c9a063', [['dino_meat', 6, 10, 1], ['dino_tooth', 3, 5, 1], ['bone', 3, 5, 1]]],
      ['allosaurus', 'อัลโลซอรัส', 'dino', 'trex', 1.8, 300, 32, 3.4, 'hostile', 4, [Dz], 2, 14, '#a0733a', '#e9c46a', [['dino_meat', 4, 7, 1], ['dino_tooth', 2, 3, 1]]],
      ['carnotaurus', 'คาร์โนทอรัส', 'dino', 'trex', 1.7, 260, 30, 3.8, 'hostile', 4, [Dz], 2, 13, '#c0392b', '#5a2a1a', [['dino_meat', 4, 6, 1], ['horn', 2, 2, 0.8], ['dino_tooth', 1, 2, 0.7]]],
      ['spino', 'สไปโนซอรัส', 'dino', 'trex', 2.4, 500, 42, 3.0, 'hostile', 5, [Dz, W], 2, 20, '#4e7a5a', '#e9c46a', [['dino_meat', 6, 10, 1], ['dino_tooth', 3, 5, 1], ['scale', 3, 4, 1]]],
      ['giganotosaurus', 'กิกาโนโตซอรัส', 'dino', 'trex', 2.5, 550, 45, 3.0, 'hostile', 5, [Dz], 2, 22, '#3a3a3a', '#8a8a8a', [['dino_meat', 7, 10, 1], ['dino_tooth', 4, 6, 1], ['bone', 4, 6, 1]]],
      ['brachio', 'แบรคิโอซอรัส', 'dino', 'sauro', 2.6, 600, 20, 1.6, 'passive', 4, [Dz], 0, 12, '#8a9a6a', '#c9c98a', [['dino_meat', 8, 12, 1], ['bone', 4, 6, 1], ['hide', 3, 5, 1]]],
      ['diplodocus', 'ดิปโพลโดคัส', 'dino', 'sauro', 2.6, 520, 18, 1.8, 'passive', 4, [Dz], 0, 11, '#7a8a9a', '#c0c0c0', [['dino_meat', 8, 11, 1], ['bone', 4, 6, 1]]],
      ['apato', 'อะแพโทซอรัส', 'dino', 'sauro', 2.5, 540, 20, 1.6, 'passive', 4, [Dz], 0, 12, '#6b7a5a', '#a3b18a', [['dino_meat', 8, 12, 1], ['hide', 3, 4, 1]]],
      ['argentino', 'อาร์เจนติโนซอรัส', 'dino', 'sauro', 3.0, 900, 25, 1.4, 'passive', 5, [Dz], 0, 20, '#5a6a4a', '#c9c98a', [['dino_meat', 12, 18, 1], ['bone', 6, 9, 1], ['hide', 5, 7, 1]]],
      ['tricera', 'ไทรเซอราทอปส์', 'dino', 'cera', 1.8, 280, 24, 2.4, 'neutral', 3, [Dz], 0, 9, '#8a7a5a', '#e8e0c8', [['dino_meat', 4, 6, 1], ['horn', 2, 3, 1], ['hide', 2, 3, 0.8]]],
      ['styraco', 'สไตราโคซอรัส', 'dino', 'cera', 1.7, 240, 22, 2.4, 'neutral', 3, [Dz], 0, 8, '#a0733a', '#f2c9a0', [['dino_meat', 4, 5, 1], ['horn', 3, 5, 1]]],
      ['pachy', 'แพคีเซฟาโลซอรัส', 'dino', 'cera', 1.3, 150, 20, 3.0, 'neutral', 2, [Dz], 0, 6, '#6b5a4a', '#c9b48a', [['dino_meat', 3, 4, 1], ['bone', 2, 3, 1]]],
      ['proto', 'โพรโทเซอราทอปส์', 'dino', 'cera', 1.0, 90, 10, 2.6, 'neutral', 2, [Dz], 0, 4, '#c9b48a', '#8a7a5a', [['dino_meat', 2, 3, 1], ['dino_egg', 1, 1, 0.5]]],
      ['stego', 'สเตโกซอรัส', 'dino', 'stego', 1.8, 260, 22, 2.0, 'neutral', 3, [Dz], 0, 9, '#4e7a3a', '#e07a1f', [['dino_meat', 4, 6, 1], ['scale', 3, 5, 1], ['bone', 2, 3, 0.8]]],
      ['kentro', 'เคนโทรซอรัส', 'dino', 'stego', 1.4, 180, 20, 2.2, 'neutral', 3, [Dz], 0, 7, '#6b8e23', '#8a3a2a', [['dino_meat', 3, 4, 1], ['scale', 2, 4, 1]]],
      ['anky', 'แองคิโลซอรัส', 'dino', 'anky', 1.6, 320, 18, 1.8, 'neutral', 3, [Dz], 0, 10, '#8a7a5a', '#5a4a3a', [['dino_meat', 4, 5, 1], ['scale', 4, 6, 1], ['bone', 2, 3, 1]]],
      ['iguanodon', 'อิกัวโนดอน', 'dino', 'raptor', 1.5, 200, 14, 3.0, 'passive', 2, [Dz], 0, 6, '#8fbf6a', '#c9c98a', [['dino_meat', 4, 6, 1], ['hide', 2, 3, 0.8]]],
      ['parasaur', 'พาราซอโรโลฟัส', 'dino', 'raptor', 1.6, 220, 12, 3.2, 'passive', 2, [Dz], 0, 6, '#43aa8b', '#e9c46a', [['dino_meat', 4, 6, 1], ['dino_egg', 1, 1, 0.4]]],
      ['ptero', 'เทอราโนดอน', 'dino', 'ptero', 1.4, 120, 16, 4.6, 'neutral', 3, [Dz], 0, 7, '#c9b48a', '#e07a1f', [['dino_meat', 2, 3, 1], ['feather', 1, 2, 0.3], ['dino_egg', 1, 1, 0.3]]],
      ['quetzal', 'เควตซัลโคแอตลัส', 'dino', 'ptero', 2.2, 260, 24, 5.0, 'neutral', 4, [Dz], 0, 12, '#8a7a9a', '#f2c9a0', [['dino_meat', 4, 6, 1], ['bone', 3, 4, 1]]],
      ['dimorph', 'ไดมอร์โฟดอน', 'dino', 'ptero', 0.8, 50, 8, 4.8, 'neutral', 2, [Dz], 2, 3, '#5a4a6a', '#e9c46a', [['dino_meat', 1, 2, 1], ['dino_tooth', 1, 1, 0.3]]],
      ['archaeo', 'อาร์คีออปเทอริกซ์', 'dino', 'ptero', 0.6, 30, 4, 4.4, 'passive', 3, [Dz], 0, 3, '#5c3a21', '#4b6bd6', [['feather', 2, 4, 1], ['dino_meat', 1, 1, 0.6]]],
      ['dimetrodon', 'ไดเมโทรดอน', 'dino', 'stego', 1.3, 140, 18, 2.4, 'neutral', 3, [Dz, S], 0, 6, '#c0763a', '#e63946', [['dino_meat', 3, 4, 1], ['scale', 2, 3, 0.8]]],
      ['plesio', 'พลีซิโอซอร์', 'dino', 'sauro', 1.8, 200, 16, 2.8, 'passive', 3, [W], 2, 9, '#4b8fe0', '#bfe3ff', [['dino_meat', 4, 5, 1], ['scale', 2, 4, 1]]],
      ['mosa', 'โมซาซอรัส', 'dino', 'trex', 2.4, 480, 38, 3.4, 'hostile', 5, [W], 2, 19, '#2f4f7f', '#8fb0c9', [['dino_meat', 6, 9, 1], ['dino_tooth', 3, 5, 1], ['scale', 3, 5, 1]]],
      ['therizino', 'เทอริซิโนซอรัส', 'dino', 'trex', 1.8, 280, 28, 2.8, 'neutral', 4, [Dz], 0, 12, '#8a7a5a', '#f2e0c0', [['dino_meat', 4, 6, 1], ['dino_tooth', 2, 4, 1], ['feather', 2, 3, 0.6]]],
      ['baby_trex', 'ลูกทีเร็กซ์', 'dino', 'raptor', 0.8, 60, 10, 3.6, 'neutral', 3, [Dz], 2, 5, '#5a4a3a', '#c9a063', [['dino_meat', 1, 2, 1], ['dino_tooth', 1, 1, 0.4]]],
      ['dino_king', 'ราชาไดโนเสาร์', 'dino', 'trex', 3.0, 1200, 55, 3.2, 'hostile', 5, [Dz], 1, 25, '#ffd166', '#8e44ad', [['dino_meat', 10, 15, 1], ['dino_tooth', 5, 8, 1], ['essence', 3, 5, 1], ['dino_egg', 1, 2, 0.6]]],
    ];
    D.ANIMALS = {}; D.ANIMAL_LIST = [];
    for (const [id, th, group, shape, size, hp, dmg, speed, behavior, rarity, biomes, when, lv, color, color2, drops] of A) {
      const a = { id, th, group, shape, size, hp, dmg, speed, behavior, rarity, biomes, when, lv, color, color2, drops, xp: [0, 8, 16, 35, 70, 150][rarity] + Math.round(hp / 10) };
      D.ANIMALS[id] = a; D.ANIMAL_LIST.push(a);
    }
    D.GROUP_TH = { land: 'สัตว์บก', bird: 'สัตว์ปีก', dino: 'ไดโนเสาร์', slime: 'สไลม์' };

    // ---------- animal dishes ----------
    const dishes = [
      ['grilled_meat', 'เนื้อย่าง', { meat: 2 }, 40, 6, 1], ['fried_egg', 'ไข่ดาว', { egg: 1 }, 20, 4, 1], ['omelet', 'ไข่เจียว', { egg: 2, chili: 1 }, 35, 8, 1], ['boiled_egg', 'ไข่ต้ม', { egg: 2 }, 24, 2, 1],
      ['grilled_chicken', 'ไก่ย่าง', { poultry: 2, chili: 1 }, 45, 10, 2], ['fried_chicken', 'ไก่ทอด', { poultry: 2, rice: 1 }, 50, 12, 3], ['chicken_rice', 'ข้าวมันไก่', { poultry: 2, rice: 2 }, 65, 12, 4],
      ['tom_kha', 'ต้มข่าไก่', { poultry: 1, mushroom: 2, coconut: 1 }, 60, 14, 4], ['kaprao', 'ผัดกะเพราหมู', { meat: 2, chili: 2, rice: 1 }, 70, 16, 4], ['steak', 'สเต๊กเนื้อ', { meat: 3 }, 75, 14, 5],
      ['bone_soup', 'ซุปกระดูก', { bone: 2, carrot: 1 }, 50, 6, 3], ['beef_noodle', 'ก๋วยเตี๋ยวเนื้อ', { meat: 2, rice: 2 }, 68, 12, 5], ['green_curry', 'แกงเขียวหวานไก่', { poultry: 2, chili: 2, coconut: 1 }, 72, 16, 6],
      ['larb', 'ลาบ', { meat: 2, chili: 2 }, 55, 14, 4], ['moo_kata', 'หมูกระทะ', { meat: 4, cabbage: 1 }, 90, 24, 7], ['roast_duck', 'เป็ดย่าง', { poultry: 3 }, 80, 18, 6],
      ['stew', 'เนื้อตุ๋น', { meat: 3, carrot: 2 }, 78, 12, 6], ['bbq_ribs', 'ซี่โครงบาร์บีคิว', { meat: 3, bone: 1, chili: 1 }, 88, 20, 8], ['beef_burger', 'เบอร์เกอร์เนื้อ', { meat: 2, bread: 2, tomato: 1 }, 85, 18, 9],
      ['chicken_salad', 'สลัดไก่', { poultry: 1, cabbage: 1, tomato: 1 }, 55, 10, 3], ['milk_tea', 'ชานม', { milk: 2, flower: 1 }, 20, 15, 2], ['cheese', 'ชีส', { milk: 3 }, 30, 6, 3],
      ['honey_toast', 'ฮันนี่โทสต์', { bread: 1, honey: 1 }, 45, 20, 4], ['pancake', 'แพนเค้ก', { egg: 1, milk: 1, rice: 1 }, 50, 14, 3], ['custard', 'สังขยา', { egg: 2, coconut: 1 }, 40, 16, 4],
      ['dino_steak', 'สเต๊กไดโนเสาร์', { dino_meat: 2 }, 110, 20, 8], ['dino_egg_omelet', 'ไข่เจียวไดโนเสาร์', { dino_egg: 1, chili: 1 }, 95, 18, 8], ['dino_bbq', 'ไดโนบาร์บีคิว', { dino_meat: 3, chili: 2 }, 130, 28, 12],
      ['dino_soup', 'ซุปกระดูกไดโนเสาร์', { bone: 3, dino_meat: 1 }, 100, 14, 10], ['dino_roast', 'ไดโนย่างทั้งตัว', { dino_meat: 6, honey: 1 }, 200, 50, 16], ['king_feast', 'งานเลี้ยงราชาไดโนเสาร์', { dino_meat: 8, dino_egg: 2, essence: 1 }, 300, 80, 22],
      ['mammoth_stew', 'สตูว์แมมมอธ', { meat: 4, ivory: 0, carrot: 2 }, 120, 24, 14], ['phoenix_egg', 'ไข่ฟีนิกซ์ลวก', { egg: 1, essence: 1 }, 90, 40, 18],
    ];
    for (const [id, th, cost, h, f, lv] of dishes) { for (const k of Object.keys(cost)) if (!cost[k]) delete cost[k]; D.ITEMS[id] = { th, cat: 'food', stack: 99, food: { h, f, e: Math.round(h / 4) } }; D.COOKING.push({ id, out: id, n: 1, in: cost, lv }); D.SHOP.sell[id] = Math.round(h * 1.2); }
    return D;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = build;
  else build(root.DEFS);
})(typeof window !== 'undefined' ? window : globalThis);
