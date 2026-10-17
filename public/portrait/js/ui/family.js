/* Family Tree: grow generations from two founders, then pan, zoom and click anyone.
 * Drag the background to pan · scroll or the +/− buttons to zoom · click a person for details. */
(function (PM) {
  'use strict';
  const { h } = PM.ui;
  const NW = 132, NH = 196, GAP = 26, ROW = 290;
  const st = { founders: [null, null], tree: null, view: { x: 40, y: 30, k: 0.8 }, sel: null };
  let root, vp, canvas, svg, detail;

  const ageWord = a => (a < 0.15 ? 'child' : a < 0.3 ? 'young' : a < 0.5 ? 'adult' : a < 0.7 ? 'middle-aged' : 'elder');
  const cur = () => PM.app.current();
  function randomPerson(gender) {
    const arch = PM.list('archetypes'), r = new PM.RNG(Math.floor(Math.random() * 1e9)), c = cur();
    const base = { style: c.style, background: c.background, toneMix: c.toneMix, lineWeight: c.lineWeight, wobble: c.wobble, crumple: c.crumple, crumpleAll: c.crumpleAll, role: 'everyday' };
    return PM.generate({ seed: r.int(1, 1e9), archetype: r.pick(arch).id, mixWith: '', gender: gender || r.pick(['fem', 'masc']), base });
  }

  // ------------------------------------------------------------- founders
  function renderFounders() {
    root.querySelectorAll('.founder').forEach((slot, i) => {
      const box = slot.querySelector('.founder-pic'); box.innerHTML = '';
      const g = st.founders[i];
      if (g) { box.appendChild(PM.ui.thumb(g, 96)); box.title = PM.app.describe(g); }
      else box.appendChild(h('span', 'founder-empty', i ? 'random partner' : 'pick someone'));
    });
  }
  function setFounder(i, g) { st.founders[i] = g ? PM.complete(g) : null; renderFounders(); }

  // ------------------------------------------------------------- layout
  function layout(tree) {
    const byId = Object.fromEntries(tree.nodes.map(n => [n.id, n]));
    const spouse = {}; for (const n of tree.nodes) if (n.spouseOf) spouse[n.spouseOf] = n;
    const kids = {}; for (const c of tree.couples) kids[c.a] = c.kids.map(id => byId[id]);
    const pos = {};
    const width = n => {
      const own = (spouse[n.id] ? 2 : 1) * NW + (spouse[n.id] ? GAP : 0);
      const ks = kids[n.id] || [];
      const kw = ks.reduce((s, k) => s + width(k), 0) + Math.max(0, ks.length - 1) * GAP * 2;
      return (n._w = Math.max(own, kw));
    };
    const place = (n, x, gen) => {
      const sp = spouse[n.id], own = (sp ? 2 : 1) * NW + (sp ? GAP : 0), cx = x + n._w / 2;
      pos[n.id] = { x: cx - own / 2, y: gen * ROW };
      if (sp) pos[sp.id] = { x: cx - own / 2 + NW + GAP, y: gen * ROW };
      const ks = kids[n.id] || [];
      const kw = ks.reduce((s, k) => s + k._w, 0) + Math.max(0, ks.length - 1) * GAP * 2;
      let kx = cx - kw / 2;
      for (const k of ks) { place(k, kx, gen + 1); kx += k._w + GAP * 2; }
    };
    const founder = tree.nodes[0];
    width(founder); place(founder, 0, 0);
    return { pos, spouse, kids, byId, w: founder._w, h: (Math.max(...tree.nodes.map(n => n.gen)) + 1) * ROW };
  }

  function renderTree() {
    canvas.querySelectorAll('.tree-node').forEach(e => e.remove());
    if (!st.tree) { svg.innerHTML = ''; return; }
    const L = layout(st.tree);
    st.layout = L;
    let d = '';
    for (const n of st.tree.nodes) {
      const p = L.pos[n.id];
      const el = h('button', 'tree-node' + (n.inLaw ? ' in-law' : '') + (n.gen === 0 ? ' founder-node' : ''));
      el.type = 'button'; el.dataset.id = n.id;
      el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      el.appendChild(PM.ui.thumb(n.g, 120));
      el.appendChild(h('span', 'tree-label', PM.app.describe(n.g)));
      el.appendChild(h('span', 'tree-sub', ageWord(n.g.age) + (n.inLaw ? ' · married in' : '')));
      el.addEventListener('click', e => { if (!st.dragged) select(n.id); });
      canvas.appendChild(el);
      const sp = L.spouse[n.id];
      if (sp) { const q = L.pos[sp.id]; d += `M${p.x + NW},${p.y + 75} L${q.x},${q.y + 75} `; }
      const ks = L.kids[n.id] || [];
      if (ks.length) {
        const mx = sp ? (p.x + NW + L.pos[sp.id].x) / 2 : p.x + NW / 2, my = p.y + (sp ? 75 : NH), bus = p.y + NH + 40;
        d += `M${mx},${my} L${mx},${bus} `;
        const xs = ks.map(k => L.pos[k.id].x + NW / 2);
        d += `M${Math.min(mx, ...xs)},${bus} L${Math.max(mx, ...xs)},${bus} `;
        for (const x of xs) d += `M${x},${bus} L${x},${p.y + ROW} `;
      }
    }
    svg.setAttribute('width', L.w + 40); svg.setAttribute('height', L.h + 40);
    svg.innerHTML = `<path d="${d}" />`;
    canvas.style.width = (L.w + 40) + 'px'; canvas.style.height = (L.h + 40) + 'px';
    if (st.sel) highlight();
  }

  // ------------------------------------------------------------- pan & zoom
  const apply = () => { canvas.style.transform = `translate(${st.view.x}px, ${st.view.y}px) scale(${st.view.k})`; root.querySelector('.zoom-level').textContent = Math.round(st.view.k * 100) + '%'; };
  function zoomAt(f, cx, cy) {
    const v = st.view, k = Math.min(2.5, Math.max(0.15, v.k * f));
    v.x = cx - (cx - v.x) * (k / v.k); v.y = cy - (cy - v.y) * (k / v.k); v.k = k; apply();
  }
  function fit() {
    if (!st.layout) return;
    const W = vp.clientWidth, H = vp.clientHeight, k = Math.min(1.2, Math.max(0.15, Math.min((W - 40) / (st.layout.w + 40), (H - 40) / (st.layout.h + 20))));
    st.view = { k, x: (W - (st.layout.w + 40) * k) / 2, y: 20 };
    apply();
  }
  function bindPan() {
    vp.addEventListener('wheel', e => { e.preventDefault(); const r = vp.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    vp.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const sx = e.clientX, sy = e.clientY, ox = st.view.x, oy = st.view.y;
      st.dragged = false;
      const move = ev => { const dx = ev.clientX - sx, dy = ev.clientY - sy; if (Math.hypot(dx, dy) > 4) { st.dragged = true; vp.classList.add('panning'); } st.view.x = ox + dx; st.view.y = oy + dy; apply(); };
      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); vp.classList.remove('panning'); setTimeout(() => { st.dragged = false; }, 0); };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });
    vp.addEventListener('keydown', e => {
      const v = st.view, step = 60;
      if (e.key === '+' || e.key === '=') zoomAt(1.2, vp.clientWidth / 2, vp.clientHeight / 2);
      else if (e.key === '-') zoomAt(1 / 1.2, vp.clientWidth / 2, vp.clientHeight / 2);
      else if (e.key === 'ArrowLeft') { v.x += step; apply(); } else if (e.key === 'ArrowRight') { v.x -= step; apply(); }
      else if (e.key === 'ArrowUp') { v.y += step; apply(); } else if (e.key === 'ArrowDown') { v.y -= step; apply(); }
      else return;
      e.preventDefault();
    });
  }

  // ------------------------------------------------------------- details
  function highlight() {
    canvas.querySelectorAll('.tree-node').forEach(e => {
      const n = st.tree.nodes.find(x => x.id === e.dataset.id);
      const sel = st.tree.nodes.find(x => x.id === st.sel);
      e.classList.toggle('on', e.dataset.id === st.sel);
      e.classList.toggle('kin', !!(sel && n && sel.parents && sel.parents.includes(n.id)));
    });
  }
  function select(id) {
    st.sel = id; highlight();
    const n = st.tree.nodes.find(x => x.id === id), L = st.layout;
    detail.innerHTML = '';
    detail.appendChild(h('h2', null, PM.app.describe(n.g)));
    const cv = h('canvas'); cv.width = 400; cv.height = 500; detail.appendChild(cv); PM.render(cv, n.g);
    const parents = (n.parents || []).map(pid => PM.app.describe(L.byId[pid].g));
    detail.appendChild(h('p', 'tree-info', [
      `Generation ${n.gen + 1} · ${ageWord(n.g.age)}`,
      parents.length ? 'Child of ' + parents.join(' & ') : n.inLaw ? 'Married into the family' : 'Founder',
      Object.entries(PM.heritageOf(n.g)).map(([k, w]) => `${Math.round(w * 100)}% ${(PM.get('archetypes', k) || { label: k }).label}`).join(' · '),
    ].join('\n')));
    detail.appendChild(PM.ui.actions(() => n.g));
    const grow = h('button', 'btn small', 'Grow a new tree from here'); grow.type = 'button';
    grow.onclick = () => { const sp = L.spouse[n.id]; grow2(n.g, sp ? sp.g : null); };
    detail.appendChild(grow);
    detail.hidden = false;
  }

  function grow2(a, b) { st.founders = [a ? PM.complete(a) : null, b ? PM.complete(b) : null]; renderFounders(); growTree(); }
  function growTree() {
    if (!st.founders[0]) st.founders[0] = randomPerson();
    renderFounders();
    const gens = +root.querySelector('#tree-gens').value, kids = +root.querySelector('#tree-kids').value;
    st.tree = PM.familyTree([st.founders[0], st.founders[1]], { generations: gens, maxKids: kids });
    st.sel = null; detail.hidden = true;
    renderTree(); requestAnimationFrame(fit);
  }

  function init() {
    root = document.querySelector('[data-view="family"]');
    vp = root.querySelector('.tree-viewport'); canvas = root.querySelector('.tree-canvas'); svg = canvas.querySelector('svg'); detail = root.querySelector('.tree-detail');
    root.querySelectorAll('.founder').forEach((slot, i) => {
      const btns = slot.querySelector('.founder-buttons');
      const b = (label, fn) => { const x = h('button', 'btn small', label); x.type = 'button'; x.onclick = fn; btns.appendChild(x); };
      b('Random', () => setFounder(i, randomPerson(i && st.founders[0] ? (st.founders[0].gender === 'masc' ? 'fem' : 'masc') : null)));
      b('Current', () => setFounder(i, cur()));
      b('Pick…', () => PM.ui.pickSaved(gs => gs[0] && setFounder(i, gs[0]), { single: true, title: 'Pick a founder' }));
      if (i) b('Clear', () => setFounder(1, null));
    });
    root.querySelector('#tree-grow').onclick = growTree;
    root.querySelector('#tree-zoom-in').onclick = () => zoomAt(1.2, vp.clientWidth / 2, vp.clientHeight / 2);
    root.querySelector('#tree-zoom-out').onclick = () => zoomAt(1 / 1.2, vp.clientWidth / 2, vp.clientHeight / 2);
    root.querySelector('#tree-fit').onclick = fit;
    bindPan(); apply();
    if (!st.tree) { if (!st.founders[0]) st.founders[0] = randomPerson('fem'); if (!st.founders[1]) st.founders[1] = randomPerson('masc'); growTree(); }
  }

  PM.view('family', { init, show() { if (st.pending) { const p = st.pending; st.pending = null; grow2(p[0], p[1]); } } });
  PM.family = {
    grow(founders) {
      if (!root) { st.founders = [founders[0] || null, founders[1] || null].map(g => (g ? PM.complete(g) : null)); st.tree = null; return; }
      st.pending = [founders[0], founders[1]];
    },
  };
})(window.PM = window.PM || {});
