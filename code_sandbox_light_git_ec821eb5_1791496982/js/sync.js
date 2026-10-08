/* ====================================================
   ANKIE OP KAMP — Sync module (global, geen ESM)
   ==================================================== */
'use strict';

window.API = {
  get(tbl, params) { return fetch('tables/' + tbl + (params || '')).then(r => r.json()); },
  post(tbl, body) {
    return fetch('tables/' + tbl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json());
  },
  patch(tbl, id, body) {
    return fetch('tables/' + tbl + '/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json());
  },
  del(tbl, id) { return fetch('tables/' + tbl + '/' + id, { method: 'DELETE' }); },
};

/* ---- Settings cache ---- */
window.SettingsStore = {
  _cache: {},
  async load() {
    try {
      const r = await window.API.get('aok_settings', '?limit=200');
      (r.data || []).forEach(s => { this._cache[s.key] = s; });
    } catch (e) { console.warn('SettingsStore.load fout:', e); }
  },
  get(key, def) {
    const s = this._cache[key];
    if (s === undefined || s === null) return def;
    const v = s.value !== undefined ? s.value : s;
    if (v === 'true') return true;
    if (v === 'false') return false;
    const n = Number(v);
    return isNaN(n) ? v : n;
  },
  async set(key, value) {
    const strVal = String(value);
    const existing = this._cache[key];
    try {
      if (existing && existing.id) {
        await window.API.patch('aok_settings', existing.id, { key, value: strVal });
        this._cache[key] = { ...existing, value: strVal };
      } else {
        const r = await window.API.post('aok_settings', { key, value: strVal });
        this._cache[key] = r;
      }
    } catch (e) { console.warn('SettingsStore.set fout:', e); }
  },
};

/* ---- Signal bus ---- */
window.SignalBus = {
  _lastTs: Date.now(),
  _handlers: {},
  on(type, fn) {
    if (!this._handlers[type]) this._handlers[type] = [];
    this._handlers[type].push(fn);
  },
  async send(type, payload) {
    try {
      await window.API.post('aok_signalen', {
        type,
        payload: JSON.stringify(payload),
        gelezen: false,
        timestamp: Date.now(),
      });
    } catch (e) { console.warn('SignalBus.send fout:', e); }
  },
  async poll() {
    try {
      const r = await window.API.get('aok_signalen', '?limit=50');
      const items = (r.data || []).filter(s => !s.gelezen && Number(s.timestamp) > this._lastTs);
      if (items.length) {
        this._lastTs = Math.max(...items.map(s => Number(s.timestamp)));
        for (const sig of items) {
          window.API.patch('aok_signalen', sig.id, { gelezen: true }).catch(() => {});
          const handlers = this._handlers[sig.type] || [];
          let payload;
          try { payload = JSON.parse(sig.payload); } catch { payload = sig.payload; }
          handlers.forEach(fn => { try { fn(payload); } catch(e) { console.warn('handler fout', e); } });
        }
      }
    } catch (e) { /* netwerk blip */ }
  },
  startPolling(ms) {
    this._lastTs = Date.now();
    setInterval(() => this.poll(), ms || 2000);
  },
};

/* ---- Positie store ---- */
window.PositieStore = {
  _id: null,
  async push(lat, lon, accuracy, speed, heading) {
    const body = { lat, lon, accuracy: accuracy || 0, speed: speed || 0, heading: heading || 0, timestamp: Date.now() };
    try {
      if (this._id) {
        await window.API.patch('aok_positie', this._id, body);
      } else {
        const r = await window.API.get('aok_positie', '?limit=1');
        if (r.data && r.data.length) {
          this._id = r.data[0].id;
          await window.API.patch('aok_positie', this._id, body);
        } else {
          const created = await window.API.post('aok_positie', body);
          this._id = created.id;
        }
      }
    } catch (e) { /* ignore */ }
  },
  async fetch() {
    try {
      const r = await window.API.get('aok_positie', '?limit=1');
      return (r.data && r.data.length) ? r.data[0] : null;
    } catch { return null; }
  },
};

/* ---- Geo helpers ---- */
window.haversineM = function(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

window.distanceToRoute = function(lat, lon, coords) {
  if (!coords || !coords.length) return Infinity;
  let min = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const d = window.haversineM(lat, lon, coords[i][1], coords[i][0]);
    if (d < min) min = d;
  }
  for (let i = 0; i < coords.length - 1; i++) {
    const d = _ptSegDist(lat, lon, coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
    if (d < min) min = d;
  }
  return min;
};

function _ptSegDist(plat, plon, alat, alon, blat, blon) {
  const dx = blon - alon, dy = blat - alat;
  if (dx === 0 && dy === 0) return window.haversineM(plat, plon, alat, alon);
  const t = Math.max(0, Math.min(1, ((plon - alon) * dx + (plat - alat) * dy) / (dx * dx + dy * dy)));
  return window.haversineM(plat, plon, alat + t * dy, alon + t * dx);
}

window.osrmRoute = async function(waypoints) {
  const coords = waypoints.map(w => w.lon + ',' + w.lat).join(';');
  const url = 'https://router.project-osrm.org/route/v1/driving/' + coords + '?overview=full&geometries=geojson';
  const r = await fetch(url);
  const j = await r.json();
  if (j.code !== 'Ok') throw new Error('OSRM: ' + j.code);
  return j.routes[0];
};

window.nominatimSearch = async function(q) {
  const url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=5';
  const r = await fetch(url, { headers: { 'Accept-Language': 'nl' } });
  return r.json();
};

window.escHtml = function(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};
window.escAttr = function(s) {
  return String(s || '').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
};
