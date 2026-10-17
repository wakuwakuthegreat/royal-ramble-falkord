/* Fiction: browse fan-art presets (js/data/fiction.js) by franchise. */
(function (PM) {
  'use strict';
  const { h } = PM.ui;
  const st = { id: null, offset: 0, style: 'natural', filter: '' };
  let root, list, main;

  const genome = (id, offset) => PM.fictionGenome(id, { seedOffset: offset || 0, base: { style: st.style, background: 'parchment', toneMix: 0.6, lineWeight: 1, wobble: 1, crumple: 0.8, crumpleAll: 0.25 } });
  const franchises = () => {
    const out = new Map();
    for (const f of PM.list('fiction')) { if (!out.has(f.franchise)) out.set(f.franchise, []); out.get(f.franchise).push(f); }
    return out;
  };

  function renderList() {
    list.innerHTML = '';
    const q = st.filter.toLowerCase();
    for (const [name, chars] of franchises()) {
      const shown = chars.filter(c => !q || (c.label + ' ' + name).toLowerCase().includes(q));
      if (!shown.length) continue;
      const d = h('details', 'fic-group'); d.open = true;
      const meta = PM.get('franchises', name);
      d.appendChild(h('summary', null, `${name} (${shown.length})`));
      if (meta && meta.notes) d.appendChild(h('p', 'fic-note', meta.notes));
      for (const c of shown) {
        const b = h('button', 'fic-item' + (c.id === st.id ? ' on' : '')); b.type = 'button'; b.dataset.id = c.id;
        b.appendChild(PM.ui.thumb(genome(c.id), 56));
        b.appendChild(h('span', null, c.label));
        b.onclick = () => select(c.id, 0);
        d.appendChild(b);
      }
      list.appendChild(d);
    }
    if (!list.children.length) list.appendChild(h('p', 'fic-note', 'No characters match.'));
  }

  function select(id, offset) {
    st.id = id; st.offset = offset || 0;
    const f = PM.get('fiction', id); if (!f) return;
    list.querySelectorAll('.fic-item').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    main.querySelector('.fic-title').textContent = f.label;
    main.querySelector('.fic-franchise').textContent = f.franchise + (st.offset ? ` · variation ${st.offset}` : '');
    main.querySelector('.fic-notes').textContent = f.notes || '';
    const g = genome(id, st.offset);
    PM.render(main.querySelector('#fic-canvas'), g);
    st.g = g;
    // cast sheet
    const sheet = root.querySelector('.fic-cast'); sheet.innerHTML = '';
    root.querySelector('.fic-cast-title').textContent = 'The cast of ' + f.franchise;
    for (const c of franchises().get(f.franchise) || []) {
      const b = h('button', 'thumb' + (c.id === id ? ' on' : '')); b.type = 'button';
      b.appendChild(PM.ui.thumb(genome(c.id), 180)); b.appendChild(h('span', 'thumb-label', c.label));
      b.onclick = () => { select(c.id, 0); main.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      sheet.appendChild(b);
    }
  }

  function init() {
    root = document.querySelector('[data-view="fiction"]');
    list = root.querySelector('.fic-list'); main = root.querySelector('.fic-main');
    root.querySelector('#fic-search').addEventListener('input', e => { st.filter = e.target.value; renderList(); });
    const styleSel = root.querySelector('#fic-style');
    for (const s of PM.list('styles')) { const o = h('option', null, s.label); o.value = s.id; styleSel.appendChild(o); }
    styleSel.value = st.style;
    styleSel.onchange = () => { st.style = styleSel.value; renderList(); if (st.id) select(st.id, st.offset); };
    root.querySelector('#fic-variation').onclick = () => st.id && select(st.id, st.offset + 1);
    root.querySelector('#fic-original').onclick = () => st.id && select(st.id, 0);
    main.querySelector('.fic-actions').appendChild(PM.ui.actions(() => st.g));
    const duo = h('button', 'btn small', 'Animate with cast-mate'); duo.type = 'button';
    duo.title = 'Two characters from the same franchise chatting';
    duo.onclick = () => {
      const f = PM.get('fiction', st.id), mates = (franchises().get(f.franchise) || []).filter(c => c.id !== st.id);
      const mate = mates[Math.floor(Math.random() * mates.length)];
      PM.animator.cast(st.g, mate ? genome(mate.id) : null); location.hash = '#animate';
    };
    main.querySelector('.fic-actions').appendChild(duo);
    root.querySelector('#fic-pack').onclick = packDialog;
    renderList();
    select(PM.list('fiction')[0].id, 0);
  }

  // ------------------------------------------------------------- character packs written by an LLM
  function packDialog() {
    const d = h('dialog', 'ui-dialog pack-dialog');
    d.innerHTML = `
      <h2>Add a character pack</h2>
      <ol class="pack-steps">
        <li><b>Say what you want</b> — a show, book or game and which characters.
          <input id="pack-subject" type="text" placeholder="e.g. Spider-Verse: Miles, Gwen, Peter B. Parker"></li>
        <li><b>Copy the prompt</b> and paste it into any chat AI (Claude, ChatGPT, Gemini …). It lists every hairstyle, outfit and colour the atelier understands.
          <div class="anim-row"><button id="pack-copy" class="btn small" type="button">Copy prompt</button><button id="pack-show" class="btn small" type="button">Show prompt</button></div>
          <textarea id="pack-prompt" rows="6" readonly hidden></textarea></li>
        <li><b>Paste the JSON it gives back</b> here and add it. Unknown parts are skipped and listed below.
          <textarea id="pack-json" rows="8" spellcheck="false" placeholder='{ "franchise": "…", "characters": [ … ] }'></textarea></li>
      </ol>
      <p class="error" id="pack-msg"></p>
      <div class="pack-saved"></div>
      <div class="dialog-buttons"><button id="pack-add" class="btn primary" type="button">Add pack</button><button id="pack-close" class="btn" type="button">Close</button></div>`;
    document.body.appendChild(d);
    const $ = s => d.querySelector(s), msg = $('#pack-msg');
    const prompt = () => PM.fictionPrompt($('#pack-subject').value.trim());
    $('#pack-show').onclick = () => { const t = $('#pack-prompt'); t.hidden = !t.hidden; t.value = prompt(); };
    $('#pack-copy').onclick = () => {
      const t = $('#pack-prompt'); t.value = prompt();
      const done = () => { msg.className = 'ok'; msg.textContent = 'Prompt copied — paste it into your AI chat.'; };
      if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(done, () => { t.hidden = false; t.select(); msg.textContent = 'Select the prompt and copy it (Ctrl+C).'; });
      else { t.hidden = false; t.select(); document.execCommand('copy'); done(); }
    };
    $('#pack-add').onclick = () => {
      msg.className = 'error';
      try {
        let txt = $('#pack-json').value.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
        const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
        if (a < 0 || b < a) throw new Error('no JSON object found');
        const res = PM.registerFictionPack(JSON.parse(txt.slice(a, b + 1)), { save: true });
        msg.className = 'ok';
        msg.textContent = `Added ${res.ids.length} characters to “${res.franchise}”.` + (res.warnings.length ? ' Skipped: ' + res.warnings.slice(0, 8).join(' · ') + (res.warnings.length > 8 ? ' …' : '') : '');
        renderList(); select(res.ids[0], 0); renderSaved();
      } catch (e) { msg.textContent = 'Couldn’t read that pack: ' + e.message; }
    };
    $('#pack-close').onclick = () => d.close();
    d.addEventListener('close', () => setTimeout(() => d.remove(), 50));
    function renderSaved() {
      const box = $('.pack-saved'); box.innerHTML = '';
      const packs = PM.savedFictionPacks();
      if (!packs.length) return;
      box.appendChild(h('p', 'fic-note', 'Your packs (kept in this browser):'));
      for (const p of packs) {
        const row = h('div', 'anim-row');
        row.appendChild(h('span', null, `${p.franchise} (${(p.characters || []).length})`));
        const rm = h('button', 'btn small', 'Remove'); rm.type = 'button';
        rm.onclick = () => { PM.removeFictionPack(p.franchise); PM.ui.toast('Removed — it disappears after a reload'); renderSaved(); };
        const ex = h('button', 'btn small', 'Copy JSON'); ex.type = 'button';
        ex.onclick = () => navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(p, null, 1)).then(() => PM.ui.toast('Pack JSON copied'));
        row.append(ex, rm); box.appendChild(row);
      }
    }
    renderSaved();
    d.showModal();
  }

  PM.view('fiction', { init });
})(window.PM = window.PM || {});
