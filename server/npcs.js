/* Town NPCs: static definitions, wander AI, dialogue trees */
const D = require('../public/js/defs.js');
const W = require('./world');

const SX = D.SPAWN.x, SY = D.SPAWN.y;
const NPCS = [
  { id: 'merchant', name: 'ลุงชม', role: 'พ่อค้า', x: SX + 1.5, y: SY - 2.5, d: 'down',
    look: { skin: '#e0ac69', hair: '#b0b0b0', hairStyle: 'short', shirt: '#264653', pants: '#3a3a3a', eyes: '#2b2b2b', hat: 'straw' } },
  { id: 'trainer', name: 'ครูเพชร', role: 'ครูฝึกอาชีพ', x: SX - 3.5, y: SY + 1.5, d: 'right',
    look: { skin: '#c68642', hair: '#1b1b1b', hairStyle: 'bun', shirt: '#8e44ad', pants: '#264653', eyes: '#2e7d32', hat: 'none' } },
  { id: 'healer', name: 'หมอบัว', role: 'หมอยา', x: SX + 3.5, y: SY + 1.5, d: 'left',
    look: { skin: '#f8d5b8', hair: '#3b2a1a', hairStyle: 'long', shirt: '#ffffff', pants: '#1d3557', eyes: '#6d4c41', hat: 'none' } },
  { id: 'villager', name: 'ป้าแดง', role: 'ชาวบ้าน', x: SX - 1.5, y: SY + 3.5, d: 'down', wander: 4,
    look: { skin: '#f1c27d', hair: '#e04b6a', hairStyle: 'bob', shirt: '#e63946', pants: '#e9c46a', eyes: '#2b2b2b', hat: 'flower' } },
  { id: 'kid', name: 'น้องต้น', role: 'เด็กในหมู่บ้าน', x: SX + 2.5, y: SY + 4.5, d: 'left', wander: 5,
    look: { skin: '#f1c27d', hair: '#6b3e1e', hairStyle: 'spiky', shirt: '#43aa8b', pants: '#6c757d', eyes: '#4a6fa5', hat: 'cap' } },
];
for (const n of NPCS) { n.ax = n.x; n.ay = n.y; n.tx = n.x; n.ty = n.y; n.next = 0; n.m = 0; }

const TIPS = [
  'ตัดต้นไม้ด้วยขวาน ขุดหินด้วยอีเต้อ แล้วเอาไปคราฟต์ผนังกับพื้น สร้างบ้านได้เลย',
  'ดินพรวนแล้วรดน้ำ ผักจะโตเร็วขึ้นสองเท่า อย่าลืมรดทุกวันนะ',
  'ตอนกลางคืนในป่ามีสไลม์ออกมา ถ้าเลือดน้อยอย่าเข้าป่าคนเดียว',
  'อยากได้เพื่อน กดปุ่มเพื่อนมุมขวาบน ค้นหาชื่อผู้ใช้แล้วส่งคำขอ',
  'ครูเพชรสอนอาชีพให้ฟรีครั้งแรก พ่อมดเรียกฝนได้ ชาวไร่เก็บเกี่ยวได้เยอะ',
  'หมอบัวรักษาเลือดให้ 20 เหรียญ ถูกกว่าเป็นลมแล้วเหรียญหายนะ',
  'ขายผักให้ลุงชม ราคาดีสุดคือฟักทองกับอาหารปรุงสุก',
  'วางเตียงในบ้านแล้วนอน จะตั้งเป็นบ้านให้อัตโนมัติ กด H กลับบ้านได้ทุกเมื่อ',
];
const KID_LINES = ['พี่ ๆ เคยขี่เฮลิคอปเตอร์ไหม หนูอยากขี่บ้าง!', 'สไลม์แดงน่ากลัวที่สุดเลย แต่ดรอปของดีนะ', 'หนูเก็บเบอร์รี่ได้ 20 ลูกแล้ว!', 'แม่บอกว่าถ้าเลเวล 25 จะสร้างเฮลิคอปเตอร์ได้'];

function dialog(npc, p, ctx) {
  const lines = [];
  switch (npc.id) {
    case 'merchant':
      return { name: npc.name, role: npc.role, text: `สวัสดี ${p.name}! วันนี้มีเมล็ดกับเครื่องมือมาใหม่ จะซื้อหรือขายอะไรดี`, options: [{ id: 'shop', label: 'เปิดร้านค้า' }, { id: 'bye', label: 'ไว้ก่อน' }] };
    case 'trainer': {
      const cur = p.cls ? D.CLASSES[p.cls].th : null;
      return { name: npc.name, role: npc.role,
        text: cur ? `ตอนนี้เธอเป็น${cur}อยู่ อยากเปลี่ยนอาชีพไหม (ค่าเรียนใหม่ ${D.CLASS_CHANGE_COST} เหรียญ)` : 'อยากเก่งขึ้นใช่ไหม ครูสอนอาชีพให้ฟรีครั้งแรก มี ชาวไร่ ช่างก่อสร้าง พ่อมด และมือปืน เลือกที่ชอบได้เลย',
        options: [{ id: 'class', label: cur ? 'ดู/เปลี่ยนอาชีพ' : 'เลือกอาชีพ' }, { id: 'bye', label: 'ไว้ก่อน' }] };
    }
    case 'healer':
      return { name: npc.name, role: npc.role, text: `เลือดของเธอ ${Math.round(p.hp)}/100 นะ ให้หมอช่วยอะไรไหม`, options: [
        { id: 'heal', label: 'รักษาเลือดเต็ม (20 เหรียญ)' }, { id: 'rest', label: 'พักฟื้น พลังงาน+สะอาดเต็ม (30 เหรียญ)' }, { id: 'bye', label: 'ไว้ก่อน' }] };
    case 'villager':
      return { name: npc.name, role: npc.role, text: TIPS[Math.floor(Math.random() * TIPS.length)], options: [{ id: 'more', label: 'เล่าอีก' }, { id: 'bye', label: 'ขอบคุณ' }] };
    case 'kid':
      return { name: npc.name, role: npc.role, text: KID_LINES[Math.floor(Math.random() * KID_LINES.length)], options: [{ id: 'more', label: 'แล้วไงต่อ' }, { id: 'bye', label: 'บ๊ายบาย' }] };
  }
  return { name: npc.name, role: npc.role, text: '...', options: [{ id: 'bye', label: 'ปิด' }] };
}

// wander tick (call every 200ms)
function tick(now) {
  for (const n of NPCS) {
    if (!n.wander) continue;
    if (now >= n.next) {
      n.next = now + 2500 + Math.random() * 4000;
      if (Math.random() < 0.6) {
        for (let tries = 0; tries < 6; tries++) {
          const tx = n.ax + (Math.random() * 2 - 1) * n.wander, ty = n.ay + (Math.random() * 2 - 1) * n.wander;
          if (W.walkable(Math.floor(tx), Math.floor(ty))) { n.tx = tx; n.ty = ty; break; }
        }
      }
    }
    const dx = n.tx - n.x, dy = n.ty - n.y; const dist = Math.hypot(dx, dy);
    if (dist > 0.1) {
      const step = Math.min(dist, 1.4 * 0.2);
      const nx = n.x + dx / dist * step, ny = n.y + dy / dist * step;
      if (W.walkable(Math.floor(nx), Math.floor(ny))) { n.x = nx; n.y = ny; n.m = 1; n.d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
      else { n.tx = n.x; n.ty = n.y; n.m = 0; }
    } else n.m = 0;
  }
}
function near(x, y, r) { return NPCS.filter(n => Math.abs(n.x - x) <= r && Math.abs(n.y - y) <= r); }
function at(x, y) { return NPCS.find(n => Math.floor(n.x) === x && Math.floor(n.y) === y) || null; }
function pub(n) { return { id: n.id, name: n.name, role: n.role, x: +n.x.toFixed(2), y: +n.y.toFixed(2), d: n.d, m: n.m, look: n.look }; }

module.exports = { NPCS, dialog, tick, near, at, pub };
