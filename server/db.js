/* Simple JSON persistence: users, world, players, chunks, direct messages */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const DIRS = { players: path.join(DATA, 'players'), chunks: path.join(DATA, 'chunks'), dm: path.join(DATA, 'dm') };
for (const d of [DATA, ...Object.values(DIRS)]) fs.mkdirSync(d, { recursive: true });

function readJSON(file, def) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return def; }
}
function writeJSON(file, obj) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, file);
}

const db = {
  users: readJSON(path.join(DATA, 'users.json'), { byName: {}, tokens: {}, nextId: 1 }),
  world: readJSON(path.join(DATA, 'world.json'), null),
  chat: readJSON(path.join(DATA, 'chat.json'), []),
  players: new Map(),      // id -> player
  convs: new Map(),        // convId -> messages[]
  dirty: new Set(),
};

if (!db.world) {
  db.world = { seed: (Math.random() * 2 ** 31) | 0, time: 400, createdAt: Date.now() };
  db.dirty.add('world');
}

db.markDirty = (key) => db.dirty.add(key);

db.getPlayer = (id) => {
  id = String(id);
  if (db.players.has(id)) return db.players.get(id);
  const p = readJSON(path.join(DIRS.players, id + '.json'), null);
  if (p) db.players.set(id, p);
  return p;
};
db.putPlayer = (p) => { db.players.set(String(p.id), p); db.dirty.add('player:' + p.id); };

db.loadChunk = (cx, cy) => readJSON(path.join(DIRS.chunks, `${cx}_${cy}.json`), null);
db.saveChunkNow = (chunk) => {
  writeJSON(path.join(DIRS.chunks, `${chunk.cx}_${chunk.cy}.json`), {
    cx: chunk.cx, cy: chunk.cy,
    tiles: Buffer.from(chunk.tiles).toString('base64'),
    objs: chunk.objs, own: chunk.own, wet: chunk.wet,
  });
};

db.convId = (a, b) => [String(a), String(b)].sort((x, y) => Number(x) - Number(y)).join('_');
db.getConv = (a, b) => {
  const id = db.convId(a, b);
  if (db.convs.has(id)) return db.convs.get(id);
  const msgs = readJSON(path.join(DIRS.dm, id + '.json'), []);
  db.convs.set(id, msgs);
  return msgs;
};
db.appendDM = (a, b, msg) => {
  const msgs = db.getConv(a, b);
  msgs.push(msg);
  if (msgs.length > 500) msgs.splice(0, msgs.length - 500);
  db.dirty.add('dm:' + db.convId(a, b));
};

// flush is called with a chunk-lookup so chunk saving stays in world.js
db.flush = (getChunk) => {
  if (!db.dirty.size) return 0;
  const keys = [...db.dirty];
  db.dirty.clear();
  for (const k of keys) {
    try {
      if (k === 'users') writeJSON(path.join(DATA, 'users.json'), db.users);
      else if (k === 'world') writeJSON(path.join(DATA, 'world.json'), db.world);
      else if (k === 'chat') writeJSON(path.join(DATA, 'chat.json'), db.chat.slice(-200));
      else if (k.startsWith('player:')) {
        const p = db.players.get(k.slice(7));
        if (p) writeJSON(path.join(DIRS.players, p.id + '.json'), p);
      } else if (k.startsWith('chunk:')) {
        const [cx, cy] = k.slice(6).split('_').map(Number);
        const c = getChunk && getChunk(cx, cy);
        if (c) db.saveChunkNow(c);
      } else if (k.startsWith('dm:')) {
        const id = k.slice(3);
        const msgs = db.convs.get(id);
        if (msgs) writeJSON(path.join(DIRS.dm, id + '.json'), msgs);
      }
    } catch (e) { console.error('flush error', k, e.message); db.dirty.add(k); }
  }
  return keys.length;
};

module.exports = db;
