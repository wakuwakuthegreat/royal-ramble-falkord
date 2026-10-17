/* The Atelier UI. Builds every panel from PM.controls, keeps the current genome,
 * handles rolling, locking, undo, export and the sketchbook sheet. */
(function (PM) {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const IDENTITY_REGEN = new Set(['archetype', 'mixWith', 'mix', 'gender']);
  const NO_LOCK_GROUPS = new Set(['Identity', 'Ink & Paper']);
  const FORMAT = {
    hairTexture: v => ['', '1 straight', '2 wavy', '3 curly', '4 coily'][Math.round(v)] || v,
    age: v => v < 0.15 ? 'youth' : v < 0.4 ? 'adult' : v < 0.6 ? 'mid-life' : v < 0.8 ? 'elder' : 'very old',
    mix: v => Math.round(v * 100) + '%',
    toneMix: v => Math.round(v * 100) + '%',
  };

  const state = {
    g: null,
    locked: new Set(),
    widgets: {},
    history: [], future: [],
    lastCommit: 0,
  };

  // ------------------------------------------------------------- genome ops
  function snapshot() { return JSON.parse(JSON.stringify(state.g)); }
  function commit(force) {
    const now = Date.now();
    if (!force && now - state.lastCommit < 700) { state.lastCommit = now; return; }
    state.lastCommit = now;
    state.history.push(snapshot());
    if (state.history.length > 60) state.history.shift();
    state.future.length = 0;
    updateUndo();
  }
  function undo() {
    if (!state.history.length) return;
    state.future.push(snapshot());
    state.g = state.history.pop();
    state.lastCommit = 0;
    syncAll(); draw(); updateUndo();
  }
  function redo() {
    if (!state.future.length) return;
    state.history.push(snapshot());
    state.g = state.future.pop();
    syncAll(); draw(); updateUndo();
  }
  function updateUndo() {
    $('#undo').disabled = !state.history.length;
    $('#redo').disabled = !state.future.length;
  }

  function regenerate(seed) {
    state.g = PM.generate({
      seed: seed != null ? seed : state.g.seed,
      archetype: state.g.archetype, mixWith: state.g.mixWith, mix: state.g.mix, gender: state.g.gender,
      base: state.g, locked: state.locked,
    });
  }
  function roll() { commit(true); regenerate(randomSeed()); syncAll(); draw(); }
  function surprise() {
    commit(true);
    const arch = PM.list('archetypes'), r = new PM.RNG(randomSeed());
    state.g.archetype = r.pick(arch).id;
    state.g.mixWith = r.chance(0.3) ? r.pick(arch).id : '';
    if (state.g.mixWith === state.g.archetype) state.g.mixWith = '';
    state.g.mix = +r.range(0.25, 0.75).toFixed(2);
    state.g.gender = r.pick(['fem', 'fem', 'masc', 'masc', 'andro']);
    const roles = PM.list('roles').filter(x => x.id !== 'everyday');
    state.g.role = roles.length && r.chance(0.35) ? r.pick(roles).id : 'everyday';
    regenerate(randomSeed()); syncAll(); draw();
  }
  /** New role: re-dress only the wardrobe, so the face (and your tweaks to it) stay put. */
  function redress(prevRole) {
    const fresh = PM.generate({ seed: state.g.seed, archetype: state.g.archetype, mixWith: state.g.mixWith, mix: state.g.mix, gender: state.g.gender, base: state.g, locked: state.locked });
    const keys = PM.WARDROBE_KEYS.slice();
    // hair and beards only move when the old or new role has an opinion about them
    const before = PM.resolveRole(Object.assign({}, state.g, { role: prevRole })), after = PM.resolveRole(state.g);
    for (const k of ['hairStyle', 'facialHair']) if ((before && before[k]) || (after && after[k])) keys.push(k);
    for (const k of keys) if (!state.locked.has(k)) state.g[k] = fresh[k];
  }
  const randomSeed = () => Math.floor(Math.random() * 1e9);

  // ------------------------------------------------------------- drawing
  let raf = 0;
  function draw() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; PM.render($('#portrait'), state.g); store.set(CURRENT, state.g); });
  }

  // ------------------------------------------------------------- saved in this browser
  const SAVES = 'portrait-atelier.saves', CURRENT = 'portrait-atelier.current';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  function describe(g) {
    const a = PM.get('archetypes', g.archetype), b = g.mixWith && PM.get('archetypes', g.mixWith), r = PM.resolveRole(g);
    const f = g.fiction && PM.get('fiction', g.fiction);
    if (f) return f.label;
    const rl = r && r.id !== 'everyday' ? (r.variant && r.variant.label ? r.variant.label.replace(/^Royalty · /, 'Royal · ') : r.label) : '';
    return (a ? a.label : '') + (b ? ' × ' + b.label : '') + (rl ? ' · ' + rl : '');
  }
  function saveGenome(g, name) {
    const list = store.get(SAVES, []);
    list.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: name || describe(g), g: JSON.parse(JSON.stringify(g)), t: Date.now() });
    if (list.length > 120) list.length = 120;
    const ok = store.set(SAVES, list);
    renderSaves();
    $('#save-note').textContent = ok ? 'Saved \u2713 \u2014 kept in this browser only.' : 'Could not save: this browser is blocking storage.';
    return ok;
  }
  function saveLocal() {
    const nameEl = $('#save-name');
    saveGenome(state.g, (nameEl.value || '').trim());
    nameEl.value = '';
  }
  function renderSaves() {
    const grid = $('#save-grid'); grid.innerHTML = '';
    const list = store.get(SAVES, []);
    list.forEach((sv, i) => {
      const cell = h('div', 'save-item');
      const open = h('button', 'save-open'); open.type = 'button'; open.title = 'Load ' + sv.name;
      const cv = h('canvas'); cv.width = 120; cv.height = 150; open.appendChild(cv);
      open.appendChild(h('span', 'save-name', sv.name));
      open.addEventListener('click', () => { commit(true); state.g = PM.complete(sv.g); syncAll(); draw(); });
      const del = h('button', 'save-del', '\u00d7'); del.type = 'button'; del.title = 'Delete ' + sv.name; del.setAttribute('aria-label', del.title);
      del.addEventListener('click', () => { const l = store.get(SAVES, []); l.splice(i, 1); store.set(SAVES, l); renderSaves(); });
      cell.append(open, del); grid.appendChild(cell);
      setTimeout(() => { try { PM.render(cv, sv.g); } catch (e) { /* old or broken entry */ } }, 10 + i * 12);
    });
    $('#save-note').textContent = list.length ? 'Saved in this browser only. Click one to load it.' : 'Nothing saved yet. Saves stay in this browser only.';
  }
  function onChange(id, value) {
    commit(false);
    const prev = state.g[id];
    state.g[id] = value;
    if (IDENTITY_REGEN.has(id)) { regenerate(); syncAll(); }
    if (id === 'archetype' || id === 'mixWith') syncAll();
    if (id === 'seed') { regenerate(+value); syncAll(); }
    if (id === 'role') { redress(prev); syncAll(); }
    if (id === 'expression') { Object.assign(state.g, PM.expressionValues(value)); syncAll(); }
    draw();
  }

  // ------------------------------------------------------------- widgets
  function lockButton(c) {
    const b = h('button', 'lock');
    b.type = 'button';
    b.title = 'Lock: keep this value when rolling';
    b.setAttribute('aria-label', 'Lock ' + c.label);
    b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="shackle" d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2"/><rect x="3" y="7" width="10" height="7" rx="1.5"/></svg>';
    b.addEventListener('click', () => {
      if (state.locked.has(c.id)) state.locked.delete(c.id); else state.locked.add(c.id);
      refreshLock(c.id);
    });
    return b;
  }
  function refreshLock(id) {
    const w = state.widgets[id]; if (!w || !w.wrap) return;
    const on = state.locked.has(id);
    w.wrap.classList.toggle('locked', on);
    const b = w.wrap.querySelector('.lock'); if (b) b.setAttribute('aria-pressed', on);
  }

  function optionsFor(c) {
    if (c.options) return c.options;
    const list = PM.list(c.source).map(d => [d.id, d.label]);
    return c.allowNone ? [['', '— none —']].concat(list) : list;
  }

  function buildControl(c) {
    let wrap, set;
    if (c.type === 'knob') {
      const k = new PM.Knob({
        label: c.label, min: c.min, max: c.max, step: c.step, def: c.def, hint: c.hint,
        format: FORMAT[c.id], onStart: () => commit(false), onInput: v => onChange(c.id, v),
      });
      wrap = h('div', 'ctl ctl-knob'); wrap.appendChild(k.el);
      set = v => k.set(v);
    } else if (c.type === 'select') {
      wrap = h('label', 'ctl ctl-select');
      wrap.appendChild(h('span', 'ctl-label', c.label));
      const s = h('select');
      for (const [v, l] of optionsFor(c)) { const o = h('option', null, l); o.value = v; s.appendChild(o); }
      s.addEventListener('change', () => onChange(c.id, s.value));
      wrap.appendChild(s);
      set = v => { s.value = v == null ? '' : v; };
    } else if (c.type === 'segment') {
      wrap = h('div', 'ctl ctl-segment');
      wrap.appendChild(h('span', 'ctl-label', c.label));
      const row = h('div', 'segment'); row.setAttribute('role', 'radiogroup'); row.setAttribute('aria-label', c.label);
      const btns = c.options.map(([v, l]) => {
        const b = h('button', null, l); b.type = 'button'; b.setAttribute('role', 'radio');
        b.addEventListener('click', () => onChange(c.id, v));
        row.appendChild(b); return [v, b];
      });
      wrap.appendChild(row);
      set = v => btns.forEach(([bv, b]) => { b.classList.toggle('on', bv === v); b.setAttribute('aria-checked', bv === v); });
    } else if (c.type === 'color') {
      wrap = h('label', 'ctl ctl-color');
      const i = h('input'); i.type = 'color';
      const sw = h('span', 'swatch'); sw.appendChild(i);
      i.addEventListener('input', () => { commit(false); state.g[c.id] = i.value; draw(); });
      wrap.appendChild(sw); wrap.appendChild(h('span', 'ctl-label', c.label));
      set = v => { i.value = v || '#888888'; };
    } else if (c.type === 'chips') {
      wrap = h('div', 'ctl ctl-chips');
      wrap.appendChild(h('span', 'ctl-label', c.label));
      const row = h('div', 'chips');
      const btns = PM.list(c.source).map(d => {
        const b = h('button', 'chip', d.label); b.type = 'button';
        b.addEventListener('click', () => {
          const cur = new Set(state.g[c.id] || []);
          if (cur.has(d.id)) cur.delete(d.id); else cur.add(d.id);
          onChange(c.id, Array.from(cur));
        });
        row.appendChild(b); return [d.id, b];
      });
      wrap.appendChild(row);
      set = v => { const s = new Set(v || []); btns.forEach(([id, b]) => { b.classList.toggle('on', s.has(id)); b.setAttribute('aria-pressed', s.has(id)); }); };
    }
    if (!c.noRoll && !NO_LOCK_GROUPS.has(c.group)) wrap.appendChild(lockButton(c));
    wrap.dataset.id = c.id;
    state.widgets[c.id] = { wrap, set };
    return wrap;
  }

  function buildPanels() {
    const groups = new Map();
    for (const c of PM.controls) { if (!groups.has(c.group)) groups.set(c.group, []); groups.get(c.group).push(c); }

    // Identity → left panel
    const idCard = $('#identity');
    idCard.appendChild(h('h2', null, 'Who'));
    const idBody = h('div', 'card-body identity');
    for (const c of groups.get('Identity') || []) idBody.appendChild(buildControl(c));
    idCard.appendChild(idBody);

    // Everything else → right panel, one collapsible card per group
    const right = $('#controls');
    let first = true;
    for (const [name, list] of groups) {
      if (name === 'Identity') continue;
      const card = h('details', 'card group');
      card.open = first || name === 'Hair' || name === 'Wardrobe'; first = false;
      const sum = h('summary', null, name);
      const lockAll = h('button', 'lock-all', 'lock all'); lockAll.type = 'button';
      lockAll.addEventListener('click', e => {
        e.preventDefault();
        const ids = list.filter(c => !c.noRoll && !NO_LOCK_GROUPS.has(c.group)).map(c => c.id);
        const all = ids.every(id => state.locked.has(id));
        ids.forEach(id => all ? state.locked.delete(id) : state.locked.add(id));
        ids.forEach(refreshLock);
        lockAll.textContent = all ? 'lock all' : 'unlock all';
      });
      if (!NO_LOCK_GROUPS.has(name)) sum.appendChild(lockAll);
      card.appendChild(sum);
      const body = h('div', 'card-body');
      const rows = h('div', 'rows'), knobs = h('div', 'knobs'), swatches = h('div', 'swatches');
      for (const c of list) {
        const w = buildControl(c);
        (c.type === 'knob' ? knobs : c.type === 'color' ? swatches : rows).appendChild(w);
      }
      [rows, swatches, knobs].forEach(x => { if (x.children.length) body.appendChild(x); });
      card.appendChild(body);
      right.appendChild(card);
    }
  }

  function syncAll() {
    for (const c of PM.controls) { const w = state.widgets[c.id]; if (w) w.set(state.g[c.id]); }
    $('#seed').value = state.g.seed;
    const mixW = state.widgets.mix; if (mixW) mixW.wrap.classList.toggle('inactive', !state.g.mixWith);
    updateCodex();
  }

  function updateCodex() {
    const box = $('#codex'); box.innerHTML = '';
    const a = PM.get('archetypes', state.g.archetype);
    const b = state.g.mixWith ? PM.get('archetypes', state.g.mixWith) : null;
    box.appendChild(h('h2', null, 'Codex'));
    for (const x of [a, b].filter(Boolean)) {
      const p = h('div', 'codex-entry');
      p.appendChild(h('div', 'codex-title', x.label + (x.region ? ' · ' + x.region : '')));
      p.appendChild(h('p', null, x.notes || ''));
      box.appendChild(p);
    }
    const role = PM.resolveRole(state.g);
    if (role && role.id !== 'everyday') {
      const p = h('div', 'codex-entry');
      p.appendChild(h('div', 'codex-title', role.variant && role.variant.label ? role.variant.label : 'Role \u00b7 ' + role.label));
      if (role.notes) p.appendChild(h('p', null, role.notes));
      box.appendChild(p);
    }
    box.appendChild(h('p', 'codex-note', 'Archetypes are loose, overlapping spreads — not boxes. Vary within groups, blend freely, and check with people from a culture before shipping their likeness.'));
  }

  // ------------------------------------------------------------- sketchbook
  function fillSheet(mode) {
    const sheet = $('#sheet'); sheet.innerHTML = '';
    const arch = PM.list('archetypes'), r = new PM.RNG(randomSeed());
    const count = mode === 'world' ? Math.max(12, arch.length) : mode === 'roles' ? PM.list('roles').length - 1 : 12;
    for (let i = 0; i < count; i++) {
      let opts;
      if (mode === 'same') opts = { archetype: state.g.archetype, mixWith: state.g.mixWith, mix: state.g.mix, gender: r.pick(['fem', 'masc', 'fem', 'masc', 'andro']) };
      else if (mode === 'blend') { const a = r.pick(arch).id; let b = r.pick(arch).id; if (b === a) b = arch[(arch.indexOf(PM.get('archetypes', a)) + 3) % arch.length].id; opts = { archetype: a, mixWith: b, mix: +r.range(0.3, 0.7).toFixed(2), gender: r.pick(['fem', 'masc', 'andro']) }; }
      else if (mode === 'roles') opts = { archetype: r.pick(arch).id, mixWith: '', gender: r.pick(['fem', 'masc', 'fem', 'masc', 'andro']) };
      else opts = { archetype: arch[i % arch.length].id, mixWith: '', gender: r.pick(['fem', 'masc', 'fem', 'masc', 'andro']) };
      const roles = PM.list('roles').filter(x => x.id !== 'everyday');
      const base = { style: state.g.style, background: state.g.background, toneMix: state.g.toneMix, lineWeight: state.g.lineWeight, wobble: state.g.wobble, crumple: state.g.crumple, crumpleAll: state.g.crumpleAll,
        role: mode === 'roles' ? roles[i % roles.length].id : 'everyday' };
      const g = PM.generate(Object.assign({ seed: r.int(1, 1e9), base }, opts));
      const cell = h('button', 'thumb'); cell.type = 'button';
      const label = describe(g);
      cell.title = label + ' — click to open in the atelier';
      const cv = h('canvas'); cv.width = 240; cv.height = 300;
      cell.appendChild(cv);
      cell.appendChild(h('span', 'thumb-label', label));
      cell.addEventListener('click', () => { commit(true); state.g = PM.complete(g); syncAll(); draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      sheet.appendChild(cell);
      setTimeout(() => PM.render(cv, g), 20 + i * 15);
    }
  }

  // ------------------------------------------------------------- export / import
  function savePNG() {
    const cv = document.createElement('canvas'); cv.width = 1500; cv.height = 1875;
    PM.render(cv, state.g);
    cv.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `portrait-${state.g.archetype}${state.g.mixWith ? '-x-' + state.g.mixWith : ''}-${state.g.seed}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }
  function openJSON(mode) {
    const dlg = $('#json-dialog'), ta = $('#json-text');
    $('#json-title').textContent = mode === 'copy' ? 'Genome (copied to clipboard)' : 'Paste a genome';
    ta.value = mode === 'copy' ? JSON.stringify(state.g, null, 1) : '';
    $('#json-apply').hidden = mode === 'copy';
    $('#json-error').textContent = '';
    dlg.showModal();
    if (mode === 'copy') {
      ta.select();
      if (navigator.clipboard) navigator.clipboard.writeText(ta.value).catch(() => { $('#json-title').textContent = 'Genome (select + copy)'; });
    } else ta.focus();
  }
  function applyJSON() {
    try {
      const g = JSON.parse($('#json-text').value);
      commit(true); state.g = PM.complete(g); syncAll(); draw();
      $('#json-dialog').close();
    } catch (e) { $('#json-error').textContent = 'That doesn’t look like a genome: ' + e.message; }
  }

  // ------------------------------------------------------------- boot
  function boot() {
    buildPanels();
    const start = { style: 'ink-ochre', background: 'parchment', toneMix: 0.35, lineWeight: 1, wobble: 1 };
    const last = store.get(CURRENT, null);
    state.g = last && PM.get('archetypes', last.archetype) ? PM.complete(last) : PM.generate({ seed: randomSeed(), archetype: 'west-african', gender: 'fem', base: start });
    if (PM.paperTexture && !PM.paperTexture.complete) PM.paperTexture.addEventListener('load', () => { draw(); renderSaves(); });
    renderSaves();
    syncAll(); draw(); updateUndo();

    $('#roll').addEventListener('click', roll);
    $('#surprise').addEventListener('click', surprise);
    $('#undo').addEventListener('click', undo);
    $('#redo').addEventListener('click', redo);
    $('#save-png').addEventListener('click', savePNG);
    $('#save-local').addEventListener('click', saveLocal);
    $('#save-local-2').addEventListener('click', saveLocal);
    $('#save-name').addEventListener('keydown', e => { if (e.key === 'Enter') saveLocal(); });
    $('#copy-json').addEventListener('click', () => openJSON('copy'));
    $('#load-json').addEventListener('click', () => openJSON('load'));
    $('#json-apply').addEventListener('click', applyJSON);
    $('#json-close').addEventListener('click', () => $('#json-dialog').close());
    $('#seed').addEventListener('change', e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) { commit(true); regenerate(v); syncAll(); draw(); } });
    $('#dice').addEventListener('click', roll);
    $('#unlock-all').addEventListener('click', () => { state.locked.clear(); PM.controls.forEach(c => refreshLock(c.id)); document.querySelectorAll('.lock-all').forEach(b => b.textContent = 'lock all'); });
    document.querySelectorAll('[data-sheet]').forEach(b => b.addEventListener('click', () => fillSheet(b.dataset.sheet)));
    document.addEventListener('keydown', e => {
      if (e.target.closest('input, select, textarea, [role=slider], dialog')) return;
      if (document.querySelector('[data-view="atelier"]').hidden) return; // shortcuts belong to the Atelier
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); roll(); }
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); surprise(); }
      if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    });
    fillSheet('world');
  }

  /** Load a genome into the Atelier (from the Lab, Family Tree, Fiction …) and switch to it. */
  function open(g) {
    commit(true);
    state.g = PM.complete(JSON.parse(JSON.stringify(g)));
    syncAll(); draw();
    if (location.hash !== '#atelier') location.hash = '#atelier';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  PM.app = { state, roll, surprise, regenerate, draw, syncAll, open, saveGenome, describe,
    saved: () => store.get(SAVES, []), current: () => snapshot(), store };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.PM = window.PM || {});
