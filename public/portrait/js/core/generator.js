/* The generator turns (heritage, blend, presentation, seed) into a genome:
 * a flat object holding one value per control. Following the guide's cheat-sheet:
 *   archetype → skin → hair → eyes → face geometry → signature details → wardrobe → palette.
 *
 * Archetype tables are WEIGHTS, never certainties — every group gets a wide spread,
 * and blending two archetypes interpolates ranges and merges weight tables. */
(function (PM) {
  'use strict';
  const { clamp, lerp } = PM.math;
  const { color } = PM;

  /** Which archetype field feeds each select/chips control. */
  PM.ROLL_SOURCES = {
    hairStyle: 'hair', headwear: 'headwear', clothing: 'clothing', pattern: 'patterns', trim: 'trims',
    earrings: 'earrings', necklace: 'necklaces', eyewear: 'eyewear', facialHair: 'facialHair',
    eyeShape: 'eyeShape', noseStyle: 'nose', marks: 'marks',
  };

  /** Archetype merged over PM.ARCHETYPE_DEFAULTS (shallow per field). */
  PM.archetype = function (id) {
    const a = PM.get('archetypes', id);
    if (!a) return null;
    const d = PM.ARCHETYPE_DEFAULTS || {};
    const out = Object.assign({}, d, a);
    out.face = Object.assign({}, d.face, a.face);
    return out;
  };

  /** Resolve a possibly gender-split table: {fem:{}, masc:{}} or a flat table. */
  function genderTable(t, gender) {
    if (!t) return {};
    if (t.fem || t.masc) {
      if (gender === 'andro') return mergeTables(t.fem || {}, t.masc || {}, 0.5);
      return t[gender] || {};
    }
    return t;
  }
  function toObj(t) { return Array.isArray(t) ? Object.fromEntries(t) : (t || {}); }
  function mergeTables(a, b, m) {
    a = toObj(a); b = toObj(b);
    const out = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = (a[k] || 0) * (1 - m) + (b[k] || 0) * m;
    return out;
  }

  PM.generate = function (opts = {}) {
    const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 1e9);
    const base = opts.base || {};
    const locked = opts.locked || new Set();
    const rng = new PM.RNG(seed);
    const archId = opts.archetype || base.archetype || PM.list('archetypes')[0].id;
    const mixId = opts.mixWith !== undefined ? opts.mixWith : base.mixWith || '';
    const A = PM.archetype(archId), B = mixId ? PM.archetype(mixId) : null;
    const m = B ? (opts.mix != null ? opts.mix : base.mix != null ? base.mix : 0.5) : 0;
    const gender = opts.gender || base.gender || 'fem';

    const table = key => {
      const ta = genderTable(A[key], gender);
      return B ? mergeTables(ta, genderTable(B[key], gender), m) : ta;
    };
    const range = id => {
      const ra = A.face[id], rb = B && B.face[id];
      if (ra && rb) return [lerp(ra[0], rb[0], m), lerp(ra[1], rb[1], m)];
      return ra || rb || null;
    };

    const g = Object.assign({}, base, { seed, archetype: archId, mixWith: mixId, mix: B ? m : (base.mix != null ? base.mix : 0.5), gender });

    for (const c of PM.controls) {
      if (locked.has(c.id)) continue;
      if (c.noRoll) { if (g[c.id] === undefined) g[c.id] = c.def != null ? c.def : defaultFor(c); continue; }
      const r = rng.fork(c.id);
      if (c.type === 'knob') {
        if (c.id === 'hairTexture') { g.hairTexture = +(r.weighted(table('hairTexture')) || 2); continue; }
        const rr = range(c.id) || c.roll || [c.min, c.max];
        let v = r.soft(rr[0], rr[1]);
        if (c.sex) v += gender === 'andro' ? ((c.sex.masc || 0) + (c.sex.fem || 0)) / 2 : (c.sex[gender] || 0);
        g[c.id] = snap(clamp(v, c.min, c.max), c.step);
      } else if (c.type === 'select' || c.type === 'segment') {
        const key = PM.ROLL_SOURCES[c.id];
        let pick = key ? r.weighted(filterValid(c, table(key))) : null;
        if (pick == null) pick = uniform(c, r);
        g[c.id] = pick;
      } else if (c.type === 'chips') {
        const probs = c.id === 'marks' ? table('marks') : {}, out = [];
        for (const [k, p] of Object.entries(probs)) if (PM.get(c.source, k) && r.chance(p)) out.push(k);
        g[c.id] = out.slice(0, 3);
      } else if (c.type === 'color') {
        g[c.id] = rollColor(c.id, r);
      }
    }

    function rollColor(id, r) {
      const pickFrom = (arch, key, tableName) => {
        const k = r.weighted(arch[key] || []);
        return PM.swatch(tableName, k);
      };
      if (id === 'skin') {
        let c = pickFrom(A, 'skin', PM.SKIN);
        if (B) c = color.mix(c, pickFrom(B, 'skin', PM.SKIN), m);
        return color.jitter(c, r, 0.025);
      }
      if (id === 'hairColor') {
        const src = B && r.chance(m) ? B : A;
        return color.jitter(pickFrom(src, 'hairColor', PM.HAIR), r, 0.02);
      }
      if (id === 'eyeColor') {
        const src = B && r.chance(m) ? B : A;
        return pickFrom(src, 'eyeColor', PM.EYES);
      }
      if (id === 'metal') return PM.swatch(PM.METALS, r.weighted(table('metals')) || 'gold');
      return g[id] || '#888888'; // cloth1..3 are assigned together below
    }

    // Small things that aren't knobs.
    g.noseSide = rng.fork('noseSide').sign();
    // Cloth colours from one shared shuffle so they stay distinct.
    if (!locked.has('cloth1') || !locked.has('cloth2') || !locked.has('cloth3')) {
      const r = rng.fork('palette');
      const fromA = (A.palette || []).filter(() => !B || r.chance(1 - m * 0.6));
      const fromB = B ? (B.palette || []).filter(() => r.chance(0.3 + m * 0.6)) : [];
      let pal = Array.from(new Set(fromA.concat(fromB)));
      if (pal.length < 3) pal = Array.from(new Set((A.palette || []).concat(B ? B.palette || [] : [])));
      const order = pal.slice().sort(() => r.next() - 0.5);
      ['cloth1', 'cloth2', 'cloth3'].forEach((k, i) => { if (!locked.has(k) && order.length) g[k] = order[i % order.length]; });
    }
    // Presentation sanity: facial hair is rare for femme presentation, earrings rarer for masc.
    if (!locked.has('facialHair') && gender === 'fem') g.facialHair = 'none';
    if (!locked.has('facialHair') && gender === 'andro' && rng.fork('fh').chance(0.6)) g.facialHair = 'none';
    if (!locked.has('facialHair') && g.age < 0.12) g.facialHair = 'none';
    PM.dressForRole(g, locked, rng.fork('role'));
    return g;
  };

  /** Wardrobe fields a role may set, by genome key → role field. */
  PM.ROLE_FIELDS = { headwear: 'headwear', clothing: 'clothing', eyewear: 'eyewear', necklace: 'necklace', earrings: 'earrings', pattern: 'pattern', trim: 'trim', hairStyle: 'hairStyle', facialHair: 'facialHair' };
  /** Genome keys a role change is allowed to touch (the face stays put). */
  PM.WARDROBE_KEYS = ['headwear', 'clothing', 'eyewear', 'necklace', 'earrings', 'pattern', 'trim', 'accessories', 'cloth1', 'cloth2', 'cloth3', 'metal'];

  /** Culture groups a heritage belongs to (its id, PM.CULTURE_GROUPS, its own `groups`, its region). */
  PM.cultureGroups = function (archId) {
    const a = PM.get('archetypes', archId) || {};
    const out = new Set([archId].concat(a.groups || [], (PM.CULTURE_GROUPS || {})[archId] || []));
    if (out.size === 1) for (const x of (PM.REGION_GROUPS || {})[a.region] || []) out.add(x);
    return out;
  };
  /** The role as it applies to this genome: base role with the matching culture variant laid over it. */
  PM.resolveRole = function (g) {
    const role = PM.get('roles', g.role);
    if (!role) return null;
    const culture = g.mixWith && g.mix > 0.5 ? g.mixWith : g.archetype;
    const groups = PM.cultureGroups(culture);
    const v = (role.variants || []).find(x => (x.cultures || []).some(c => groups.has(c)));
    return v ? Object.assign({}, role, v, { variant: v }) : role;
  };

  /** Re-dress genome g for its role (see js/data/roles.js). Locked fields are left alone. */
  PM.dressForRole = function (g, locked = new Set(), rng) {
    const role = PM.resolveRole(g);
    if (!role || role.id === 'everyday') return g;
    rng = rng || new PM.RNG(PM.hashString(g.seed + ':role:' + role.id));
    for (const [field, key] of Object.entries(PM.ROLE_FIELDS)) {
      if (!role[key] || locked.has(field)) continue;
      const c = PM.control(field), t = {};
      for (const [k, w] of Object.entries(genderTable(role[key], g.gender))) if ((k === 'keep' || PM.get(c.source, k)) && w > 0) t[k] = w;
      const pick = rng.fork(field).weighted(t);
      if (pick && pick !== 'keep') g[field] = pick;
    }
    if (role.accessories && !locked.has('accessories')) {
      const r = rng.fork('accessories');
      g.accessories = Object.entries(role.accessories).filter(([id, p]) => PM.get('accessories', id) && r.chance(p)).map(([id]) => id);
    }
    (role.palette || []).forEach((opt, i) => {
      const k = 'cloth' + (i + 1);
      if (opt && !locked.has(k)) g[k] = Array.isArray(opt) ? rng.fork(k).pick(opt) : opt;
    });
    if (role.metals && !locked.has('metal')) { const m = rng.fork('metal').weighted(role.metals); if (m) g.metal = PM.swatch(PM.METALS, m); }
    if (role.dress) role.dress(g, rng);
    return g;
  };
  PM.genderTable = genderTable;

  function snap(v, step) { if (!step) return v; const k = Math.round(v / step) * step; return +k.toFixed(4); }
  function filterValid(c, t) {
    const out = {};
    for (const [k, w] of Object.entries(t)) if (PM.get(c.source, k) && w > 0) out[k] = w;
    return out;
  }
  function uniform(c, r) {
    if (c.options) return c.options[0][0];
    const list = PM.list(c.source).filter(d => !d.rare);
    if (!list.length) return null;
    if (c.source === 'headwear' || c.source === 'eyewear' || c.source === 'earrings' || c.source === 'necklaces' || c.source === 'facialHair') return 'none';
    return r.pick(list).id;
  }
  function defaultFor(c) {
    if (c.type === 'select') { const l = PM.list(c.source); return c.allowNone ? '' : (l[0] && l[0].id); }
    if (c.type === 'segment') return c.options[0][0];
    if (c.type === 'chips') return [];
    if (c.type === 'color') return '#888888';
    return c.def != null ? c.def : (c.min + c.max) / 2;
  }
  PM.defaultFor = defaultFor;
})(window.PM = window.PM || {});
