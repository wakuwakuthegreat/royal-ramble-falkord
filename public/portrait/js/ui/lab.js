/* Genome Lab: a field of portrait cards you can drag around and breed.
 *   click            select / unselect a card
 *   drag             move it; drop it ON another card to mix the two
 *   double-click     open in the Atelier
 *   drop .json files onto the field to add genomes
 * The field is remembered in this browser. */
(function (PM) {
  'use strict';
  const { h } = PM.ui;
  const KEY = 'portrait-atelier.lab';
  const CW = 150, CH = 222;           // card size on the field
  const state = { cards: [], sel: new Set(), next: 1 };
  let field, links, bar;

  // ------------------------------------------------------------- persistence
  const save = () => PM.app && PM.app.store.set(KEY, { cards: state.cards.map(c => ({ id: c.id, g: c.g, x: c.x, y: c.y, parents: c.parents, name: c.name })), next: state.next });
  function load() {
    const d = PM.app && PM.app.store.get(KEY, null);
    if (!d || !Array.isArray(d.cards)) return;
    state.cards = d.cards.filter(c => c && c.g).map(c => Object.assign(c, { g: PM.complete(c.g) }));
    state.next = d.next || state.cards.length + 1;
  }

  // ------------------------------------------------------------- placement
  const overlaps = (x, y) => state.cards.some(c => Math.abs(c.x - x) < CW + 8 && Math.abs(c.y - y) < CH + 8);
  function freeSpot(px, py) {
    if (px != null) {
      for (let k = 0; k < 48; k++) {
        const x = px + (k % 2 ? 1 : -1) * Math.ceil((k % 12) / 2) * (CW + 14), y = py + Math.floor(k / 12) * (CH + 16);
        if (x >= 0 && !overlaps(x, y)) return [x, y];
      }
    }
    const cols = Math.max(1, Math.floor(((field ? field.parentElement.clientWidth : 900) - 16) / (CW + 16)));
    for (let i = 0; i < 2000; i++) { const x = 16 + (i % cols) * (CW + 16), y = 16 + Math.floor(i / cols) * (CH + 16); if (!overlaps(x, y)) return [x, y]; }
    return [16, 16];
  }

  function add(genomes, o = {}) {
    const made = [];
    for (const g of genomes) {
      const [x, y] = freeSpot(o.x, o.y);
      const c = { id: 'c' + state.next++, g: PM.complete(g), x, y, parents: o.parents || null, name: o.name || null };
      state.cards.push(c); made.push(c);
    }
    renderField(); save();
    return made;
  }
  function remove(ids) { state.cards = state.cards.filter(c => !ids.has(c.id)); ids.forEach(id => state.sel.delete(id)); renderField(); save(); }

  // ------------------------------------------------------------- breeding
  function mix(a, b, n = 1) {
    const x = (a.x + b.x) / 2, y = Math.max(a.y, b.y) + CH + 40;
    const kids = [];
    for (let i = 0; i < n; i++) kids.push(PM.breed(a.g, b.g, { seed: Math.floor(Math.random() * 1e9) }));
    const made = add(kids, { x, y, parents: [a.id, b.id] });
    state.sel = new Set(made.map(c => c.id));
    renderField(); updateBar();
    PM.ui.toast(n > 1 ? `${n} children of ${label(a)} & ${label(b)}` : `A child of ${label(a)} & ${label(b)}`);
  }
  function mixSelected(n) {
    const sel = state.cards.filter(c => state.sel.has(c.id));
    if (sel.length < 2) { PM.ui.toast('Select two or more portraits to mix'); return; }
    if (sel.length === 2) return mix(sel[0], sel[1], n);
    // more than two: each child gets a random pair of the selected
    for (let i = 0; i < n; i++) { const r = new PM.RNG(Math.floor(Math.random() * 1e9)), a = r.pick(sel); let b = r.pick(sel); while (b === a) b = r.pick(sel); mix(a, b, 1); }
  }
  const label = c => c.name || PM.app.describe(c.g);

  // ------------------------------------------------------------- rendering
  function renderField() {
    if (!field) return;
    [...field.querySelectorAll('.lab-card')].forEach(e => { if (!state.cards.find(c => c.id === e.dataset.id)) e.remove(); });
    let maxX = 0, maxY = 0;
    for (const c of state.cards) {
      let el = field.querySelector(`.lab-card[data-id="${c.id}"]`);
      if (!el) el = buildCard(c);
      el.style.transform = `translate(${c.x}px, ${c.y}px)`;
      el.classList.toggle('on', state.sel.has(c.id));
      maxX = Math.max(maxX, c.x + CW); maxY = Math.max(maxY, c.y + CH);
    }
    field.style.width = Math.max(maxX + 200, field.parentElement.clientWidth) + 'px';
    field.style.height = Math.max(maxY + 160, 640) + 'px';
    drawLinks();
    field.parentElement.querySelector('.lab-empty').hidden = state.cards.length > 0;
  }
  function drawLinks() {
    const byId = Object.fromEntries(state.cards.map(c => [c.id, c]));
    let d = '';
    for (const c of state.cards) {
      if (!c.parents) continue;
      for (const pid of c.parents) {
        const p = byId[pid]; if (!p) continue;
        const x1 = p.x + CW / 2, y1 = p.y + CH, x2 = c.x + CW / 2, y2 = c.y, my = (y1 + y2) / 2;
        d += `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2} `;
      }
    }
    links.setAttribute('width', field.style.width); links.setAttribute('height', field.style.height);
    links.innerHTML = d ? `<path d="${d}" />` : '';
  }
  function buildCard(c) {
    const el = h('div', 'lab-card'); el.dataset.id = c.id; el.tabIndex = 0;
    el.appendChild(PM.ui.thumb(c.g, 140));
    const name = h('span', 'lab-name', label(c)); el.appendChild(name);
    const del = h('button', 'lab-del', '×'); del.type = 'button'; del.title = 'Remove from the field'; del.setAttribute('aria-label', 'Remove');
    del.addEventListener('pointerdown', e => e.stopPropagation());
    del.onclick = e => { e.stopPropagation(); remove(new Set([c.id])); updateBar(); };
    el.appendChild(del);
    el.addEventListener('dblclick', () => PM.app.open(c.g));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(c.id); } if (e.key === 'Delete') { remove(new Set([c.id])); updateBar(); } });
    el.addEventListener('pointerdown', e => startDrag(e, c, el));
    field.appendChild(el);
    return el;
  }
  function toggle(id) { if (state.sel.has(id)) state.sel.delete(id); else state.sel.add(id); renderField(); updateBar(); }

  // ------------------------------------------------------------- drag & drop
  function startDrag(e, c, el) {
    if (e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY, ox = c.x, oy = c.y;
    let moved = false, target = null;
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or already-released pointer */ }
    const move = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true; el.classList.add('dragging');
      c.x = Math.max(0, ox + dx); c.y = Math.max(0, oy + dy);
      el.style.transform = `translate(${c.x}px, ${c.y}px)`;
      target = state.cards.find(o => o !== c && Math.abs(o.x - c.x) < CW * 0.55 && Math.abs(o.y - c.y) < CH * 0.55) || null;
      field.querySelectorAll('.lab-card').forEach(x => x.classList.toggle('target', !!target && x.dataset.id === target.id));
      drawLinks();
    };
    const up = () => {
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.classList.remove('dragging');
      field.querySelectorAll('.target').forEach(x => x.classList.remove('target'));
      if (!moved) { toggle(c.id); return; }
      if (target) { c.x = ox; c.y = oy; renderField(); mix(target, c, 1); return; }
      renderField(); save();
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }

  // ------------------------------------------------------------- toolbar
  function updateBar() {
    const n = state.sel.size;
    bar.querySelector('.sel-count').textContent = n ? `${n} selected` : 'Click cards to select';
    bar.querySelectorAll('[data-need]').forEach(b => { b.disabled = n < +b.dataset.need; });
  }
  function button(label, fn, o = {}) {
    const b = h('button', 'btn small' + (o.primary ? ' primary' : ''), label); b.type = 'button';
    if (o.title) b.title = o.title; if (o.need) b.dataset.need = o.need;
    b.onclick = fn; return b;
  }
  const randomGenome = () => {
    const arch = PM.list('archetypes'), r = new PM.RNG(Math.floor(Math.random() * 1e9)), cur = PM.app.current();
    const base = { style: cur.style, background: cur.background, toneMix: cur.toneMix, lineWeight: cur.lineWeight, wobble: cur.wobble, crumple: cur.crumple, crumpleAll: cur.crumpleAll, role: 'everyday' };
    return PM.generate({ seed: r.int(1, 1e9), archetype: r.pick(arch).id, mixWith: r.chance(0.2) ? r.pick(arch).id : '', mix: r.range(0.3, 0.7), gender: r.pick(['fem', 'masc', 'fem', 'masc', 'andro']), base });
  };

  function init() {
    const root = document.querySelector('[data-view="lab"]');
    bar = root.querySelector('.lab-bar');
    const addRow = h('div', 'bar-group');
    addRow.append(h('span', 'bar-label', 'Add'),
      button('Random', () => add([randomGenome()]), { title: 'A random person from anywhere' }),
      button('Random ×4', () => add([0, 1, 2, 3].map(randomGenome))),
      button('Current portrait', () => add([PM.app.current()]), { title: 'The portrait open in the Atelier' }),
      button('From saved / fiction…', () => PM.ui.pickSaved(gs => add(gs), { title: 'Add from your saved shelf or the Fiction cast' })),
      button('From genome text…', () => PM.ui.askText('Add genomes', gs => add(gs))));
    const mixRow = h('div', 'bar-group');
    mixRow.append(h('span', 'bar-label sel-count', ''),
      button('Mix', () => mixSelected(1), { primary: true, need: 2, title: 'One child of the selected portraits' }),
      button('Mix ×4', () => mixSelected(4), { need: 2, title: 'Four siblings' }),
      button('Family tree', () => { const sel = state.cards.filter(c => state.sel.has(c.id)); PM.family && PM.family.grow(sel.slice(0, 2).map(c => c.g)); location.hash = '#family'; }, { need: 1, title: 'Grow a family tree from the first two selected' }),
      button('Edit', () => { const c = state.cards.find(x => state.sel.has(x.id)); if (c) PM.app.open(c.g); }, { need: 1, title: 'Open the first selected in the Atelier' }),
      button('Save', () => { state.cards.filter(c => state.sel.has(c.id)).forEach(c => PM.app.saveGenome(c.g)); PM.ui.toast('Saved to your shelf'); }, { need: 1 }),
      button('Remove', () => { remove(new Set(state.sel)); updateBar(); }, { need: 1 }),
      button('Select all', () => { state.sel = new Set(state.cards.map(c => c.id)); renderField(); updateBar(); }),
      button('Clear field', () => { if (!state.cards.length || confirm('Remove every card from the field?')) { state.cards = []; state.sel.clear(); renderField(); save(); updateBar(); } }));
    bar.append(addRow, mixRow);

    field = root.querySelector('.field');
    links = field.querySelector('svg');
    const wrap = field.parentElement;
    wrap.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); wrap.classList.add('drop'); } });
    wrap.addEventListener('dragleave', () => wrap.classList.remove('drop'));
    wrap.addEventListener('drop', e => {
      e.preventDefault(); wrap.classList.remove('drop');
      for (const f of e.dataTransfer.files) f.text().then(t => { try { add(PM.ui.parseGenomes(t)); } catch (err) { PM.ui.toast('Not a genome file: ' + f.name); } });
    });
    field.addEventListener('pointerdown', e => { if (e.target === field || e.target === links) { state.sel.clear(); renderField(); updateBar(); } });

    load();
    if (!state.cards.length) add([0, 1, 2].map(randomGenome));
    renderField(); updateBar();
  }

  PM.view('lab', { init, show() { renderField(); } });
  PM.lab = { state };
  // when the Lab hasn't been opened yet, queue additions until it is
  PM.lab.add = function (gs) {
    if (field) return add(gs);
    load(); for (const g of gs) state.cards.push({ id: 'c' + state.next++, g: PM.complete(g), x: 16 + (state.cards.length % 6) * (CW + 16), y: 16 + Math.floor(state.cards.length / 6) * (CH + 16), parents: null });
    save();
  };
})(window.PM = window.PM || {});
