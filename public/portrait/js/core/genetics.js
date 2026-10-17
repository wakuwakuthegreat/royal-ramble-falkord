/* Genetics: mix genomes into children and grow family trees.
 *
 * PM.breed(a, b, opts) → child genome
 *   Heritage: each parent passes on half of its heritage mix; the child gets the two
 *   strongest heritages as archetype + "Blend with".
 *   Face knobs: a random point between the parents (sex offsets are removed, then the
 *   child's presentation is added back) plus a small mutation.
 *   Eye shape, nose, hair texture, eye colour: from one parent or the other.
 *   Skin: a blend of both. Hair colour: either parent, sometimes a blend.
 *   Wardrobe: rolled fresh for the child's heritage.
 * PM.familyTree(founders, opts) → { nodes, links } with generations, spouses and children. */
(function (PM) {
  'use strict';
  const { clamp, lerp } = PM.math;
  const { color } = PM;

  const FACE_SKIP = new Set(['age', 'mix', 'mouthOpen', 'hairTexture']);
  const sexOff = (c, gender) => (c.sex ? (gender === 'andro' ? ((c.sex.masc || 0) + (c.sex.fem || 0)) / 2 : c.sex[gender] || 0) : 0);
  const snap = (v, step) => (step ? +(Math.round(v / step) * step).toFixed(4) : v);

  /** Heritage weights of a genome: {archetypeId: weight}. */
  function heritage(g) {
    const out = {};
    const m = g.mixWith ? (g.mix != null ? g.mix : 0.5) : 0;
    out[g.archetype] = (out[g.archetype] || 0) + (1 - m);
    if (g.mixWith) out[g.mixWith] = (out[g.mixWith] || 0) + m;
    return out;
  }
  PM.heritageOf = heritage;

  PM.breed = function (a, b, o = {}) {
    a = PM.complete(a); b = PM.complete(b);
    const seed = o.seed != null ? o.seed : Math.floor(Math.random() * 1e9);
    const r = new PM.RNG(seed);
    const gender = o.gender || r.weighted([['fem', 10], ['masc', 10], ['andro', 1.5]]);

    // ---- heritage
    const h = {}, ha = heritage(a), hb = heritage(b);
    for (const [k, w] of Object.entries(ha)) h[k] = (h[k] || 0) + w * 0.5;
    for (const [k, w] of Object.entries(hb)) h[k] = (h[k] || 0) + w * 0.5;
    const ranked = Object.entries(h).sort((x, y) => y[1] - x[1] + (r.next() - 0.5) * 0.02);
    const [A, wa] = ranked[0], [B, wb] = ranked[1] || [null, 0];
    const mixWith = B && wb > 0.05 ? B : '';
    const mix = mixWith ? +(wb / (wa + wb)).toFixed(2) : 0.5;

    const base = {};
    for (const k of ['style', 'background', 'toneMix', 'lineWeight', 'wobble', 'crumple', 'crumpleAll']) base[k] = a[k];
    base.role = 'everyday';
    const child = PM.generate({ seed, archetype: A, mixWith, mix, gender, base });
    child.age = o.age != null ? o.age : +r.range(0.04, 0.3).toFixed(2);

    // ---- face knobs
    for (const c of PM.controls) {
      if (c.type !== 'knob' || c.noRoll || c.group === 'Identity' || FACE_SKIP.has(c.id)) continue;
      if (c.group === 'Wardrobe' || c.group === 'Ink & Paper') continue;
      const va = (a[c.id] != null ? a[c.id] : c.def) - sexOff(c, a.gender), vb = (b[c.id] != null ? b[c.id] : c.def) - sexOff(c, b.gender);
      const t = clamp(r.gauss(0.5, 0.25), 0, 1);
      const mut = r.gauss(0, (c.max - c.min) * 0.035);
      child[c.id] = snap(clamp(lerp(va, vb, t) + mut + sexOff(c, gender), c.min, c.max), c.step);
    }
    // ---- discrete traits
    const pick = (k, p = 0.5) => (r.chance(p) ? a[k] : b[k]);
    child.eyeShape = r.chance(0.9) ? pick('eyeShape') : child.eyeShape;
    child.noseStyle = r.chance(0.9) ? pick('noseStyle') : child.noseStyle;
    child.hairTexture = r.chance(0.25) ? Math.round((a.hairTexture + b.hairTexture) / 2) : pick('hairTexture');
    child.eyeColor = r.chance(0.55) ? (color.luminance(a.eyeColor) < color.luminance(b.eyeColor) ? a.eyeColor : b.eyeColor) : pick('eyeColor');
    child.skin = color.jitter(color.mix(a.skin, b.skin, clamp(r.gauss(0.5, 0.15), 0.15, 0.85)), r, 0.015);
    child.hairColor = r.chance(0.3) ? color.mix(a.hairColor, b.hairColor, r.range(0.3, 0.7)) : pick('hairColor');
    const inherit = new Set(['freckles', 'dimples', 'beauty-mark']);
    const marks = new Set((child.marks || []).filter(m => !inherit.has(m)));
    for (const m of [...(a.marks || []), ...(b.marks || [])]) if (inherit.has(m) && r.chance(0.5)) marks.add(m);
    child.marks = [...marks].slice(0, 4);
    child.parents = [a.name || null, b.name || null].filter(Boolean);
    return child;
  };

  /** A random partner for g: often the same heritage, sometimes anyone. */
  PM.randomPartner = function (g, o = {}) {
    const r = new PM.RNG(o.seed != null ? o.seed : Math.floor(Math.random() * 1e9));
    const arch = PM.list('archetypes');
    const archetype = r.chance(o.sameHeritage != null ? o.sameHeritage : 0.6) ? g.archetype : r.pick(arch).id;
    const gender = o.gender || (g.gender === 'masc' ? 'fem' : g.gender === 'fem' ? 'masc' : r.pick(['fem', 'masc']));
    const base = {};
    for (const k of ['style', 'background', 'toneMix', 'lineWeight', 'wobble', 'crumple', 'crumpleAll']) base[k] = g[k];
    base.role = 'everyday';
    const p = PM.generate({ seed: r.int(1, 1e9), archetype, mixWith: r.chance(0.2) ? r.pick(arch).id : '', mix: r.range(0.25, 0.6), gender, base });
    p.age = clamp(g.age + r.range(-0.08, 0.08), 0.05, 0.95);
    return p;
  };

  /**
   * Grow a family tree from two founders.
   * opts: generations (2–5), maxKids (1–5), spouseChance, seed
   * Returns { nodes: [{id, g, gen, spouseOf?, parents: [id,id]?}], couples: [{a, b, kids: [id]}] }.
   */
  PM.familyTree = function (founders, o = {}) {
    const r = new PM.RNG(o.seed != null ? o.seed : Math.floor(Math.random() * 1e9));
    const gens = clamp(o.generations || 3, 2, 5), maxKids = clamp(o.maxKids || 3, 1, 5), spouseChance = o.spouseChance != null ? o.spouseChance : 0.8;
    const nodes = [], couples = [];
    let id = 0;
    const ageFor = gen => clamp(0.72 - gen * (0.62 / Math.max(1, gens - 1)) + r.range(-0.05, 0.05), 0.03, 0.95);
    const add = (g, gen, extra = {}) => { g = PM.complete(g); g.age = ageFor(gen); const n = Object.assign({ id: 'n' + id++, g, gen }, extra); nodes.push(n); return n; };

    let [fa, fb] = founders;
    if (!fb) fb = PM.randomPartner(PM.complete(fa), { seed: r.int(1, 1e9) });
    const A = add(fa, 0), B = add(fb, 0, { spouseOf: 'n0' });
    let frontier = [{ a: A, b: B }];
    for (let gen = 1; gen < gens; gen++) {
      const next = [];
      for (const cp of frontier) {
        const k = gen === 1 ? r.int(Math.min(2, maxKids), maxKids) : r.int(r.chance(0.8) ? 1 : 0, maxKids);
        const couple = { a: cp.a.id, b: cp.b.id, kids: [] };
        couples.push(couple);
        for (let i = 0; i < k; i++) {
          const child = add(PM.breed(cp.a.g, cp.b.g, { seed: r.int(1, 1e9) }), gen, { parents: [cp.a.id, cp.b.id] });
          couple.kids.push(child.id);
          if (gen < gens - 1 && r.chance(spouseChance)) {
            const sp = add(PM.randomPartner(child.g, { seed: r.int(1, 1e9) }), gen, { spouseOf: child.id, inLaw: true });
            next.push({ a: child, b: sp });
          }
        }
      }
      // keep the family going: if nobody married this generation, someone does
      if (!next.length && gen < gens - 1) {
        const kids = nodes.filter(n => n.gen === gen && !n.inLaw);
        if (kids.length) { const child = r.pick(kids); next.push({ a: child, b: add(PM.randomPartner(child.g, { seed: r.int(1, 1e9) }), gen, { spouseOf: child.id, inLaw: true }) }); }
      }
      frontier = next;
      if (!frontier.length) break;
    }
    return { nodes, couples };
  };
})(window.PM = window.PM || {});
