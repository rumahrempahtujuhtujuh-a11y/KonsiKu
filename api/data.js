// Penyimpanan data KonsiKu di Upstash Redis (lewat REST, tanpa dependensi).
// Tiap pengguna punya akun sendiri yang dikenali dari PIN-nya: data satu pengguna tidak pernah bercampur dengan pengguna lain.
// Env: KV_REST_API_URL + KV_REST_API_TOKEN  atau  UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// Opsional: APP_SALT (garam untuk mengacak PIN; jangan diganti setelah ada pengguna) dan APP_PIN (akun lama: data lama 'rr77:data' tetap terbaca lewat PIN ini).
const crypto = require('crypto');
const seed = require('./_seed.js');

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const SALT = process.env.APP_SALT || 'konsiku-v1';
const MAX = 900000;

// Atomik: tulis hanya bila revisi cocok. Sekaligus simpan titik pulih harian (keadaan sebelum perubahan pertama hari itu).
const LUA = `
local rev = tonumber(redis.call('GET', KEYS[2]) or '0')
if rev ~= tonumber(ARGV[1]) then return {0, rev} end
local old = redis.call('GET', KEYS[1])
if old then redis.call('SET', KEYS[3], old, 'NX', 'EX', 2592000) end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SET', KEYS[2], rev + 1)
return {1, rev + 1}`;

// Atomik: buat akun baru hanya bila belum ada.
const LUA_NEW = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('SET', KEYS[1], ARGV[1])
redis.call('SET', KEYS[2], 1)
return 1`;

// Atomik: pindahkan data akun ke kunci PIN baru (gagal bila PIN baru sudah dipakai).
const LUA_MOVE = `
if redis.call('EXISTS', KEYS[3]) == 1 then return 0 end
local data = redis.call('GET', KEYS[1])
if not data then return -1 end
local rev = redis.call('GET', KEYS[2]) or '1'
redis.call('SET', KEYS[3], data)
redis.call('SET', KEYS[4], rev)
redis.call('DEL', KEYS[1], KEYS[2])
return 1`;

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || 'redis ' + r.status);
  return j.result;
}

const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const legacyOk = p => !!process.env.APP_PIN && crypto.timingSafeEqual(sha(p), sha(process.env.APP_PIN));
const acctId = p => crypto.createHmac('sha256', SALT).update(String(p)).digest('hex').slice(0, 32);
// Alamat data milik satu PIN. PIN lama (APP_PIN) tetap memakai kunci lama supaya data lama tidak hilang.
function keysFor(pin) {
  if (legacyOk(pin)) return { legacy: true, D: 'rr77:data', R: 'rr77:rev', B: 'rr77:bak:' };
  const a = 'kk:a:' + acctId(pin);
  return { legacy: false, D: a + ':d', R: a + ':r', B: a + ':bak:' };
}
const pinFormatOk = p => typeof p === 'string' && p.length >= 6 && p.length <= 32 && !/[\s\u0000-\u001f]/.test(p);

const isDate = s => typeof s === 'string' && /^\d{4}-\d\d-\d\d$/.test(s);
const num = n => typeof n === 'number' && Number.isFinite(n);
function valid(d) {
  if (!d || !Array.isArray(d.outlets) || !d.outlets.length) return false;
  const okO = d.outlets.every(o => o && typeof o.name === 'string' && Array.isArray(o.items) &&
    o.items.every(i => i && isDate(i.date) && num(i.qty) && num(i.price) && typeof i.prod === 'string'));
  if (!okO) return false;
  if (d.pay != null && !(Array.isArray(d.pay) && d.pay.every(p => p && Number.isInteger(p.o) && p.o >= 0 &&
    p.o < d.outlets.length && num(p.amt) && isDate(p.date)))) return false;
  if (d.bahan != null && !Array.isArray(d.bahan)) return false;
  if (d.mov != null && !Array.isArray(d.mov)) return false;
  if (d.rek != null && !Array.isArray(d.rek)) return false;
  if (d.logo != null && !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(d.logo)) return false;
  return true;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const out = (code, obj) => res.status(code).json(obj);
  try {
    if (!URL_ || !TOKEN) return out(500, { error: 'Database belum terhubung. Tambahkan Upstash Redis di tab Storage Vercel.' });
    if (!['GET', 'PUT', 'POST', 'PATCH'].includes(req.method)) return out(405, { error: 'Metode tidak didukung' });

    // Batasi tebakan PIN: 10 kali gagal per 10 menit per alamat IP
    const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
    const ih = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
    const fk = 'rr77:fail:' + ih;
    const fail = async () => { if ((await redis(['INCR', fk])) === 1) await redis(['EXPIRE', fk, 600]); };
    if ((+(await redis(['GET', fk])) || 0) >= 10) return out(429, { error: 'Terlalu banyak percobaan. Coba lagi 10 menit lagi.' });
    const auth = String(req.headers.authorization || '').replace(/^Bearer /, '');
    if (!auth) { await fail(); return out(401, { error: 'PIN belum diisi' }); }

    // ===== Daftar akun baru (POST) =====
    if (req.method === 'POST') {
      let b;
      try { b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (e) { return out(400, { error: 'Data tidak valid' }); }
      if (!pinFormatOk(auth)) return out(400, { error: 'PIN minimal 6 karakter, tanpa spasi' });
      if (!b || !valid(b.data)) return out(400, { error: 'Data tidak valid' });
      const str = JSON.stringify(b.data);
      if (str.length > MAX) return out(413, { error: 'Data terlalu besar' });
      const rk = 'kk:reg:' + ih;
      if ((await redis(['INCR', rk])) === 1) await redis(['EXPIRE', rk, 86400]);
      if ((+(await redis(['GET', rk])) || 0) > 10) return out(429, { error: 'Terlalu banyak pendaftaran dari jaringan ini. Coba lagi besok.' });
      const K = keysFor(auth);
      if (K.legacy) { await fail(); return out(409, { error: 'PIN sudah dipakai. Pilih PIN lain.' }); }
      const ok = await redis(['EVAL', LUA_NEW, '2', K.D, K.R, str]);
      if (ok !== 1) { await fail(); return out(409, { error: 'PIN sudah dipakai. Pilih PIN lain.' }); }
      return out(200, { rev: 1 });
    }

    // ===== Ganti PIN (PATCH): Authorization = PIN lama, body {newPin} =====
    if (req.method === 'PATCH') {
      let b;
      try { b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (e) { return out(400, { error: 'Data tidak valid' }); }
      const np = b && b.newPin;
      if (!pinFormatOk(np)) return out(400, { error: 'PIN baru minimal 6 karakter, tanpa spasi' });
      if (np === auth) return out(400, { error: 'PIN baru sama dengan PIN lama' });
      const O = keysFor(auth), N = keysFor(np);
      if (N.legacy) { await fail(); return out(409, { error: 'PIN sudah dipakai. Pilih PIN lain.' }); }
      if (!O.legacy && (await redis(['EXISTS', O.D])) !== 1) { await fail(); return out(401, { error: 'PIN lama salah' }); }
      const m = await redis(['EVAL', LUA_MOVE, '4', O.D, O.R, N.D, N.R]);
      if (m === 0) { await fail(); return out(409, { error: 'PIN sudah dipakai. Pilih PIN lain.' }); }
      if (m !== 1) return out(404, { error: 'Data belum ada di server, tidak ada yang dipindahkan' });
      return out(200, { ok: true });
    }

    // ===== Masuk / baca / simpan (GET, PUT) =====
    const K = keysFor(auth);
    if (req.method === 'GET') {
      if (req.query && req.query.since !== undefined) {
        const cur = +(await redis(['GET', K.R])) || 0;
        if (cur > 0 && cur === +req.query.since) return out(200, { rev: cur, same: true });
      }
      const [d, rev] = [await redis(['GET', K.D]), await redis(['GET', K.R])];
      if (d == null) {
        if (K.legacy) return out(200, { rev: 0, data: seed });
        await fail(); return out(401, { error: 'PIN tidak terdaftar' });
      }
      return out(200, { rev: +rev || 0, data: JSON.parse(d) });
    }

    let b;
    try { b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (e) { return out(400, { error: 'Data tidak valid' }); }
    if (!K.legacy && (await redis(['EXISTS', K.D])) !== 1) { await fail(); return out(401, { error: 'PIN tidak terdaftar' }); }
    if (!b || !Number.isInteger(b.rev) || !valid(b.data)) return out(400, { error: 'Data tidak valid' });
    const str = JSON.stringify(b.data);
    if (str.length > MAX) return out(413, { error: 'Data terlalu besar' });
    const day = new Date().toISOString().slice(0, 10);
    const r = await redis(['EVAL', LUA, '3', K.D, K.R, K.B + day, String(b.rev), str]);
    if (r[0] === 1) return out(200, { rev: r[1] });
    const cur = await redis(['GET', K.D]);
    return out(409, { error: 'Konflik', rev: r[1], data: cur ? JSON.parse(cur) : seed });
  } catch (e) {
    return out(500, { error: 'Kesalahan server: ' + (e && e.message || e) });
  }
};
