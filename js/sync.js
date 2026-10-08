/* ====================================================
   ANKIE OP KAMP — Sync module (Supabase backend)
   ==================================================== */
'use strict';

/* ---- Supabase config ---- */
var SUPA_URL  = 'https://jafyymqqcsjszbfgfbqj.supabase.co';
var SUPA_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnl5bXFxY3Nqc3piZmdmYnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTA3ODIsImV4cCI6MjEwNzA2Njc4Mn0.3GgSLcIEsSQ80wuafc5k521Gltxhnh9T8y2lDJq4jmk';

/* ---- Basis API wrapper (Supabase PostgREST) ---- */
window.API = {
  _h: function() {
    return {
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
  },

  /* GET /rest/v1/{tbl}?select=*&...extra */
  get: function(tbl, params) {
    var qs = params || '';
    // Verwijder leading '?' als die er al in zit, voeg toe
    if (qs && qs[0] !== '?') qs = '?' + qs;
    var url = SUPA_URL + '/rest/v1/' + tbl + '?select=*' + (qs ? '&' + qs.slice(1) : '');
    return fetch(url, { headers: this._h() })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        // Supabase geeft array terug; wikkel in { data: [] } zoas de Genspark API deed
        if (Array.isArray(data)) return { data: data };
        return { data: [] };
      });
  },

  /* POST /rest/v1/{tbl} */
  post: function(tbl, body) {
    return fetch(SUPA_URL + '/rest/v1/' + tbl, {
      method: 'POST',
      headers: this._h(),
      body: JSON.stringify(body),
    }).then(function(r) {
      if (!r.ok) return r.json().then(function(e) { throw new Error(JSON.stringify(e)); });
      return r.json();
    }).then(function(data) {
      // Supabase geeft array terug bij Prefer:return=representation
      return Array.isArray(data) ? data[0] : data;
    });
  },

  /* PATCH /rest/v1/{tbl}?id=eq.{id} */
  patch: function(tbl, id, body) {
    return fetch(SUPA_URL + '/rest/v1/' + tbl + '?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: this._h(),
      body: JSON.stringify(body),
    }).then(function(r) {
      if (!r.ok) return r.json().then(function(e) { throw new Error(JSON.stringify(e)); });
      return r.json();
    }).then(function(data) {
      return Array.isArray(data) ? data[0] : data;
    });
  },

  /* DELETE /rest/v1/{tbl}?id=eq.{id} */
  del: function(tbl, id) {
    return fetch(SUPA_URL + '/rest/v1/' + tbl + '?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: this._h(),
    });
  },
};

/* ---- Settings cache ---- */
window.SettingsStore = {
  _cache: {},
  load: async function() {
    try {
      var url = SUPA_URL + '/rest/v1/aok_settings?select=*&limit=200';
      var r = await fetch(url, { headers: window.API._h() });
      var data = await r.json();
      if (Array.isArray(data)) {
        data.forEach(function(s) { window.SettingsStore._cache[s.sleutel] = s; });
      }
    } catch (e) { console.warn('SettingsStore.load fout:', e); }
  },
  get: function(key, def) {
    var s = this._cache[key];
    if (s === undefined || s === null) return def;
    var v = (s.waarde !== undefined) ? s.waarde : s;
    if (v === 'true') return true;
    if (v === 'false') return false;
    var n = Number(v);
    return isNaN(n) ? v : n;
  },
  set: async function(key, value) {
    var strVal = String(value);
    var existing = this._cache[key];
    try {
      if (existing && existing.id) {
        await fetch(SUPA_URL + '/rest/v1/aok_settings?id=eq.' + encodeURIComponent(existing.id), {
          method: 'PATCH',
          headers: window.API._h(),
          body: JSON.stringify({ sleutel: key, waarde: strVal }),
        });
        this._cache[key] = Object.assign({}, existing, { waarde: strVal });
      } else {
        var resp = await fetch(SUPA_URL + '/rest/v1/aok_settings', {
          method: 'POST',
          headers: window.API._h(),
          body: JSON.stringify({ sleutel: key, waarde: strVal }),
        });
        var created = await resp.json();
        this._cache[key] = Array.isArray(created) ? created[0] : created;
      }
    } catch (e) { console.warn('SettingsStore.set fout:', e); }
  },
};

/* ---- Signal bus ---- */
window.SignalBus = {
  _lastTs: Date.now(),
  _handlers: {},
  on: function(type, fn) {
    if (!this._handlers[type]) this._handlers[type] = [];
    this._handlers[type].push(fn);
  },
  send: async function(type, payload) {
    try {
      await fetch(SUPA_URL + '/rest/v1/aok_signalen', {
        method: 'POST',
        headers: window.API._h(),
        body: JSON.stringify({
          type: type,
          payload: JSON.stringify(payload),
          gelezen: false,
          ts: Date.now(),
        }),
      });
    } catch (e) { console.warn('SignalBus.send fout:', e); }
  },
  poll: async function() {
    try {
      // Haal ongeleide signalen op die nieuwer zijn dan _lastTs
      var url = SUPA_URL + '/rest/v1/aok_signalen?select=*&gelezen=eq.false&ts=gt.' + this._lastTs + '&order=ts.asc&limit=50';
      var r = await fetch(url, { headers: window.API._h() });
      var items = await r.json();
      if (!Array.isArray(items) || !items.length) return;
      this._lastTs = Math.max.apply(null, items.map(function(s) { return Number(s.ts); }));
      for (var i = 0; i < items.length; i++) {
        var sig = items[i];
        // Markeer als gelezen (fire-and-forget)
        fetch(SUPA_URL + '/rest/v1/aok_signalen?id=eq.' + encodeURIComponent(sig.id), {
          method: 'PATCH',
          headers: window.API._h(),
          body: JSON.stringify({ gelezen: true }),
        }).catch(function(){});
        var handlers = this._handlers[sig.type] || [];
        var p;
        try { p = JSON.parse(sig.payload); } catch(e) { p = sig.payload; }
        for (var j = 0; j < handlers.length; j++) {
          try { handlers[j](p); } catch(e) { console.warn('handler fout', e); }
        }
      }
    } catch (e) { /* netwerk blip */ }
  },
  startPolling: function(ms) {
    this._lastTs = Date.now();
    var self = this;
    setInterval(function() { self.poll(); }, ms || 2000);
  },
};

/* ---- Positie store ---- */
window.PositieStore = {
  _id: null,
  push: async function(lat, lon, accuracy, speed, heading) {
    var body = {
      lat: lat, lon: lon,
      accuracy: accuracy || 0,
      speed: speed || 0,
      heading: heading || 0,
      ts: Date.now(),
    };
    try {
      if (this._id) {
        await fetch(SUPA_URL + '/rest/v1/aok_positie?id=eq.' + encodeURIComponent(this._id), {
          method: 'PATCH',
          headers: window.API._h(),
          body: JSON.stringify(body),
        });
      } else {
        // Kijk of er al een rij bestaat
        var r = await fetch(SUPA_URL + '/rest/v1/aok_positie?select=*&limit=1', { headers: window.API._h() });
        var rows = await r.json();
        if (Array.isArray(rows) && rows.length) {
          this._id = rows[0].id;
          await fetch(SUPA_URL + '/rest/v1/aok_positie?id=eq.' + encodeURIComponent(this._id), {
            method: 'PATCH',
            headers: window.API._h(),
            body: JSON.stringify(body),
          });
        } else {
          var resp = await fetch(SUPA_URL + '/rest/v1/aok_positie', {
            method: 'POST',
            headers: window.API._h(),
            body: JSON.stringify(body),
          });
          var created = await resp.json();
          var row = Array.isArray(created) ? created[0] : created;
          if (row && row.id) this._id = row.id;
        }
      }
    } catch (e) { /* ignore */ }
  },
  fetch: async function() {
    try {
      var r = await fetch(SUPA_URL + '/rest/v1/aok_positie?select=*&limit=1', { headers: window.API._h() });
      var rows = await r.json();
      return (Array.isArray(rows) && rows.length) ? rows[0] : null;
    } catch(e) { return null; }
  },
};

/* ---- Geo helpers ---- */
window.haversineM = function(lat1, lon1, lat2, lon2) {
  var R = 6371000;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

window.distanceToRoute = function(lat, lon, coords) {
  if (!coords || !coords.length) return Infinity;
  var min = Infinity;
  for (var i = 0; i < coords.length; i++) {
    var d = window.haversineM(lat, lon, coords[i][1], coords[i][0]);
    if (d < min) min = d;
  }
  for (var i = 0; i < coords.length - 1; i++) {
    var d2 = _ptSegDist(lat, lon, coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
    if (d2 < min) min = d2;
  }
  return min;
};

function _ptSegDist(plat, plon, alat, alon, blat, blon) {
  var dx = blon - alon, dy = blat - alat;
  if (dx === 0 && dy === 0) return window.haversineM(plat, plon, alat, alon);
  var t = Math.max(0, Math.min(1, ((plon - alon) * dx + (plat - alat) * dy) / (dx * dx + dy * dy)));
  return window.haversineM(plat, plon, alat + t * dy, alon + t * dx);
}

window.osrmRoute = async function(waypoints) {
  var coords = waypoints.map(function(w) { return w.lon + ',' + w.lat; }).join(';');
  var url = 'https://router.project-osrm.org/route/v1/driving/' + coords + '?overview=full&geometries=geojson';
  var r = await fetch(url);
  var j = await r.json();
  if (j.code !== 'Ok') throw new Error('OSRM: ' + j.code);
  return j.routes[0];
};

window.nominatimSearch = async function(q) {
  var url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=5';
  var r = await fetch(url, { headers: { 'Accept-Language': 'nl' } });
  return r.json();
};

window.escHtml = function(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};
window.escAttr = function(s) {
  return String(s || '').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
};
