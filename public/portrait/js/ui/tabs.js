/* Tabs along the top (Atelier · Genome Lab · Family Tree · Animator · Fiction) and the
 * small helpers the views share. A view registers with PM.view(id, { init, show, hide })
 * and owns the <section class="view" data-view="id"> in index.html. */
(function (PM) {
  'use strict';

  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const views = {};
  PM.view = (id, def) => { views[id] = Object.assign({ ready: false }, def); };

  // ------------------------------------------------------------- thumbnails (rendered a few per frame)
  const queue = [];
  let pumping = false;
  function pump() {
    pumping = true;
    const t0 = performance.now();
    while (queue.length && performance.now() - t0 < 24) {
      const [cv, g] = queue.shift();
      if (cv.isConnected) { try { PM.render(cv, g); } catch (e) { console.warn('[thumb]', e); } }
    }
    if (queue.length) requestAnimationFrame(pump); else pumping = false;
  }
  function thumb(g, w = 160) {
    const cv = h('canvas'); cv.width = w; cv.height = Math.round(w * 1.25);
    queue.push([cv, g]);
    if (!pumping) requestAnimationFrame(pump);
    return cv;
  }

  /** Accept a genome, an array of genomes, saved-shelf entries ({g}) or a fiction id. */
  function parseGenomes(text) {
    text = (text || '').trim();
    if (!text) return [];
    if (/^[a-z0-9-]+$/i.test(text) && PM.get('fiction', text)) return [PM.fictionGenome(text)];
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : [data];
    return arr.map(x => (x && x.g ? x.g : x)).filter(x => x && typeof x === 'object' && x.archetype).map(PM.complete);
  }

  // ------------------------------------------------------------- dialogs
  function dialog(title) {
    const d = h('dialog', 'ui-dialog');
    d.appendChild(h('h2', null, title));
    document.body.appendChild(d);
    d.addEventListener('close', () => setTimeout(() => d.remove(), 50));
    return d;
  }
  /** Paste genome text → callback(genomes). */
  function askText(title, cb) {
    const d = dialog(title);
    d.appendChild(h('p', 'dialog-hint', 'Paste a genome (from “Copy genome”), a list of genomes, or a fiction id like “naruto”.'));
    const ta = h('textarea'); ta.rows = 10; ta.spellcheck = false; d.appendChild(ta);
    const err = h('p', 'error'); d.appendChild(err);
    const row = h('div', 'dialog-buttons');
    const ok = h('button', 'btn primary', 'Add'), cancel = h('button', 'btn', 'Cancel');
    ok.type = cancel.type = 'button';
    ok.onclick = () => { try { const gs = parseGenomes(ta.value); if (!gs.length) throw new Error('nothing found'); d.close(); cb(gs); } catch (e) { err.textContent = 'Couldn’t read that: ' + e.message; } };
    cancel.onclick = () => d.close();
    row.append(ok, cancel); d.appendChild(row);
    d.showModal(); ta.focus();
  }
  /** Pick from the saved shelf (and fiction) → callback(genomes). */
  function pickSaved(cb, o = {}) {
    const d = dialog(o.title || 'Pick portraits');
    const grid = h('div', 'pick-grid'); d.appendChild(grid);
    const chosen = new Set();
    const saved = PM.app ? PM.app.saved() : [];
    const items = saved.map(s => ({ name: s.name, g: s.g }));
    if (o.fiction !== false) for (const f of PM.list('fiction')) items.push({ name: f.label, g: null, fiction: f.id, group: f.franchise });
    if (!items.length) grid.appendChild(h('p', null, 'Nothing saved yet — use Save in the Atelier.'));
    items.forEach((it, i) => {
      const b = h('button', 'pick-item'); b.type = 'button';
      const g = it.g || PM.fictionGenome(it.fiction);
      b.appendChild(thumb(g, 96));
      b.appendChild(h('span', null, it.name));
      b.onclick = () => { if (chosen.has(i)) chosen.delete(i); else chosen.add(i); b.classList.toggle('on', chosen.has(i)); if (o.single) { d.close(); cb([g]); } };
      it.genome = g;
      grid.appendChild(b);
    });
    const row = h('div', 'dialog-buttons');
    const ok = h('button', 'btn primary', 'Add selected'), cancel = h('button', 'btn', 'Close');
    ok.type = cancel.type = 'button';
    ok.onclick = () => { d.close(); cb([...chosen].map(i => items[i].genome)); };
    cancel.onclick = () => d.close();
    if (!o.single) row.append(ok);
    row.append(cancel); d.appendChild(row);
    d.showModal();
  }

  let toastTimer = 0;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = h('div', 'toast'); t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
  }
  function downloadPNG(g, name) {
    const cv = document.createElement('canvas'); cv.width = 1500; cv.height = 1875;
    PM.render(cv, g);
    cv.toBlob(blob => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (name || 'portrait') + '.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }
  /** Small row of actions every view offers for a genome. */
  function actions(getG, o = {}) {
    const row = h('div', 'actions');
    const add = (label, fn, title) => { const b = h('button', 'btn small', label); b.type = 'button'; if (title) b.title = title; b.onclick = () => fn(getG()); row.appendChild(b); return b; };
    add('Edit in Atelier', g => PM.app.open(g), 'Open this portrait with all the dials');
    add('Save', g => { PM.app.saveGenome(g); toast('Saved to your shelf'); }, 'Keep it in this browser');
    if (o.lab !== false) add('To Lab', g => { PM.lab && PM.lab.add([g]); toast('Added to the Genome Lab'); }, 'Add to the Genome Lab field');
    if (o.animate !== false) add('Animate', g => { PM.animator && PM.animator.cast(g); location.hash = '#animate'; }, 'Open in the Animator');
    add('PNG', g => downloadPNG(g, (PM.app.describe(g) || 'portrait').replace(/[^\w-]+/g, '-').toLowerCase()), 'Download a large PNG');
    return row;
  }

  PM.ui = { h, thumb, parseGenomes, askText, pickSaved, toast, actions, downloadPNG };

  // ------------------------------------------------------------- router
  function show() {
    const id = (location.hash || '#atelier').slice(1);
    const target = views[id] || document.querySelector(`.view[data-view="${id}"]`) ? id : 'atelier';
    document.querySelectorAll('.view').forEach(v => { v.hidden = v.dataset.view !== target; });
    document.querySelectorAll('.tab').forEach(t => { const on = t.dataset.tab === target; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); });
    for (const [vid, v] of Object.entries(views)) {
      if (vid === target) { if (!v.ready) { v.ready = true; v.init && v.init(); } v.show && v.show(); }
      else if (v.ready && v.hide) v.hide();
    }
  }
  window.addEventListener('hashchange', show);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(show)); else setTimeout(show);
})(window.PM = window.PM || {});
