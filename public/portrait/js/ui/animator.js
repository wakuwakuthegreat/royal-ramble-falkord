/* Animator: brings one or two portraits to life.
 * Every frame re-renders the genome with its "performance" values changed — every expression
 * dial (js/parts/expressions.js) plus gaze and head turn — so any part, style or extension
 * animates for free. Modes are little schedulers that set targets; values ease toward them.
 *   Add a mode:        PM.animator.modes.myMode = { label, start(S), tick(S, dt) }
 *   Add an expression: PM.define('expressions', 'awe', { … })  (shows up here automatically)
 * The Script mode plays a conversation you write in the editor (see SCRIPT_HELP below). */
(function (PM) {
  'use strict';
  const { h } = PM.ui;
  const { clamp } = PM.math;
  const W = PM.CANVAS.W, H = PM.CANVAS.H;
  const KEYS = () => Object.keys(PM.EXPR_KEYS);
  const exprIds = () => PM.list('expressions').map(e => e.id);

  // ------------------------------------------------------------- lines
  const OPENERS = [
    'Have you eaten yet?', 'You won’t believe what happened at the market!', 'Did you hear the news?', 'Lovely weather today, isn’t it?',
    'I’ve been humming that old song all morning.', 'Where did you get that hat?', 'We should travel somewhere new.', 'My grandmother had a saying about that…',
    'I finally finished the painting!', 'Do you remember the river where we met?', 'The bus was late AGAIN.', 'Guess who I bumped into?',
    'I tried cooking your recipe.', 'Is it me, or is it getting colder?', 'I lost my keys. Again.', 'Tell me something good.',
  ];
  const REPLIES = [
    'Really? Tell me more!', 'No way!', 'Hmm… I’m not so sure.', 'Ha! That’s wonderful.', 'Oh, that’s a shame.', 'I said the same thing!',
    'Wait, WHAT?', 'Exactly!', 'Maybe next week.', 'That reminds me of something…', 'You always say that!', 'Oh, I love that.',
    'Ugh, don’t remind me.', 'Honestly? Same.', 'Let’s go together!', 'Who told you that?!', 'Oh… you noticed.', 'I am SO done with this.',
  ];
  const MONOLOGUE = [
    'Hello there!', 'Let me tell you a story…', 'It was a long day, but a good one.', 'Do you ever just sit and listen to the rain?',
    'I’ve got a secret.', 'Ha! You should have seen it.', 'Hmm. Where was I?', 'Anyway — that’s enough about me!', 'Well, well, well…',
  ];
  function moodOf(line, r) {
    if (/SO done|AGAIN|ugh/i.test(line)) return r.pick(['angry', 'rage']);
    if (/shame|lost|colder/i.test(line)) return r.pick(['sad', 'crying']);
    if (/no way|WHAT|won’t believe|guess|\?!/i.test(line)) return r.pick(['surprised', 'scared']);
    if (/noticed/i.test(line)) return 'embarrassed';
    if (/hmm|not so sure|where was|…/i.test(line)) return 'thinking';
    if (/love/i.test(line)) return r.pick(['smitten', 'flirty']);
    if (/secret|well, well/i.test(line)) return 'smug';
    if (/!|wonderful|ha!/i.test(line)) return r.pick(['happy', 'laughing']);
    return r.pick(['neutral', 'happy']);
  }

  // ------------------------------------------------------------- actors
  // ------------------------------------------------------------- conversation scripts
  const SCRIPT_HELP = `# ─── Conversation script ─────────────────────────────────────────
# One beat per line. Lines starting with # are notes and are skipped.
#
#   A: Hello!                      actor A says a line
#   B (happy): Hi there!           …with an expression
#   A (surprised) [look right]: Oh! an expression AND an action
#   B (sad)                        just change expression (holds ~1 s)
#   [pause 1.5]                    wait 1.5 seconds
#
# Actors: A (left / solo) and B (right). With one actor, B lines go to A.
# Actions: [look left] [look right] [look center] [look at other]
#          [look away] [nod] [shake] [blink]
# Expressions: ${'{EXPR}'}
# Tip: CAPITALS and !?! read louder — pick (rage) or (surprised) for those.
# ──────────────────────────────────────────────────────────────────
`;
  const PRESETS = {
    'Small talk': `A (happy) [look at other]: Have you eaten yet?
B (thinking) [look away]: Hmm… not since breakfast.
[pause 0.6]
B (surprised) [look at other]: Wait — is that CAKE?!
A (smug): Maybe it is. Maybe it isn't.
B (embarrassed): I… only wanted one slice.
A (laughing): Ha! Help yourself.
B (smitten): You're the best.`,
    'The argument': `A (angry): You said you'd be here at SIX.
B (embarrassed) [look away]: The bus was late…
A (rage) [shake]: THE BUS IS ALWAYS LATE!
[pause 0.8]
B (sad): I'm sorry. Really.
A (sad) [look away]: …I just missed you, that's all.
B (smitten) [look at other]: Then let's not waste the evening.
A (happy) [nod]: Fine. You're buying.`,
    'Confession': `A (embarrassed) [look away]: Can I tell you something?
B (thinking) [look at other]: Of course.
A (scared): I… I broke your favourite mug.
[pause 1]
B (surprised): The one from my grandmother?!
A (crying): I'm so sorry!
B (laughing): I hated that mug.
A (surprised): WHAT?
B (flirty) [nod]: Buy me a new one and we're even.`,
    'Monologue (solo)': `A (happy): Hello there!
A (thinking) [look right]: Let me tell you a story…
[pause 0.5]
A (scared): It was a dark and stormy night.
A (surprised) [look left]: Something moved in the garden!
A (laughing) [look center]: …It was the cat.`,
  };
  function helpText() { return SCRIPT_HELP.replace('{EXPR}', exprIds().join(', ')); }

  /** Parse a script into beats: { who, expr, acts: [], text, pause }. */
  function parseScript(src) {
    const beats = [], errors = [];
    src.split(/\r?\n/).forEach((raw, i) => {
      const line = raw.trim();
      if (!line || line.startsWith('#')) return;
      const p = line.match(/^\[(?:pause|wait)\s+([\d.]+)\s*s?\]$/i);
      if (p) { beats.push({ pause: +p[1] }); return; }
      const m = line.match(/^([AB12])\s*(?:\(([^)]*)\))?\s*((?:\[[^\]]*\]\s*)*)\s*(?::\s*(.*))?$/i);
      if (!m) { errors.push(`line ${i + 1}: “${line.slice(0, 40)}” — start with A: or B:`); return; }
      const who = /^[B2]$/i.test(m[1]) ? 1 : 0, expr = (m[2] || '').trim().toLowerCase();
      if (expr && !PM.get('expressions', expr)) errors.push(`line ${i + 1}: unknown expression “${expr}”`);
      const acts = (m[3].match(/\[([^\]]*)\]/g) || []).map(a => a.slice(1, -1).trim().toLowerCase());
      beats.push({ who, expr: PM.get('expressions', expr) ? expr : null, acts, text: (m[4] || '').trim() });
    });
    return { beats, errors };
  }
  function act(a, S, name) {
    const other = S.actors.find(x => x !== a);
    if (name === 'look at other' || name === 'look at a' || name === 'look at b') a.t.gaze = other ? a.face || 0 : 0;
    else if (name === 'look away') a.t.gaze = other ? -(a.face || 0) : (Math.random() < 0.5 ? -0.9 : 0.9);
    else a.act(name);
  }

  const rnd = () => new PM.RNG(Math.floor(Math.random() * 1e9));
  const modes = {
    conversation: {
      label: 'Conversation',
      start(S) { S.beat = 0.4; S.turn = 0; },
      tick(S, dt) {
        S.beat -= dt; if (S.beat > 0) return;
        const r = rnd(), A = S.actors;
        if (A.length === 1) {
          const a = A[0], step = S.turn++ % 4;
          if (step === 0) { const line = r.pick(MONOLOGUE.concat(OPENERS)); a.setExpr(moodOf(line, r), 0); a.say(line, S.speed); S.beat = a.talk.left + 0.5; }
          else if (step === 1) { a.setExpr(r.pick(exprIds()), null); S.beat = 1.2 / S.speed; }
          else if (step === 2) { a.t.gaze = r.range(-0.95, 0.95); a.t.turn = a.g.turn + r.range(-0.18, 0.18); S.beat = 0.9 / S.speed; }
          else { a.t.gaze = 0; a.t.turn = a.g.turn; a.setExpr('neutral', 0); S.beat = 0.7 / S.speed; }
          return;
        }
        const speaker = A[S.turn % 2], listener = A[(S.turn + 1) % 2];
        const line = S.turn === 0 || r.chance(0.5) ? r.pick(OPENERS) : r.pick(REPLIES);
        speaker.setExpr(moodOf(line, r), speaker.face); speaker.say(line, S.speed);
        listener.setExpr(r.pick(['neutral', 'thinking', 'happy', 'neutral']), listener.face);
        const later = S.timers;
        later.push(setTimeout(() => { listener.setExpr(moodOf(line, r), listener.face); act(listener, S, 'nod'); }, speaker.talk.left * 700));
        if (r.chance(0.25)) later.push(setTimeout(() => { listener.t.gaze = r.range(-0.9, 0.9); later.push(setTimeout(() => (listener.t.gaze = listener.face), 900)); }, 300));
        S.turn++; S.beat = speaker.talk.left + r.range(0.35, 1.0) / S.speed;
      },
    },
    talking: {
      label: 'Talking',
      start(S) { S.beat = 0; },
      tick(S, dt) {
        S.beat -= dt; if (S.beat > 0) return;
        const r = rnd();
        for (const a of S.actors) {
          const line = r.pick(MONOLOGUE.concat(OPENERS, REPLIES));
          a.setExpr(r.chance(0.6) ? moodOf(line, r) : a.expr, r.chance(0.7) ? a.face : r.range(-0.6, 0.6));
          a.say(line, S.speed);
        }
        S.beat = Math.max(...S.actors.map(a => a.talk.left)) + 0.25 / S.speed;
      },
    },
    looking: {
      label: 'Looking around',
      start(S) { S.beat = 0; for (const a of S.actors) a.setExpr('neutral', 0); },
      tick(S, dt) {
        S.beat -= dt; if (S.beat > 0) return;
        const r = rnd();
        for (const a of S.actors) {
          a.t.gaze = r.range(-1, 1);
          a.t.turn = clamp(a.g.turn + a.t.gaze * 0.22, -0.45, 0.45);
          if (r.chance(0.25)) a.setExpr(r.pick(['surprised', 'thinking', 'happy', 'neutral', 'smug', 'scared']), a.t.gaze);
        }
        S.beat = r.range(0.7, 2.2) / S.speed;
      },
    },
    expressions: {
      label: 'Expressions',
      start(S) { S.beat = 0; S.i = 0; },
      tick(S, dt) {
        S.beat -= dt; if (S.beat > 0) return;
        const names = exprIds(), name = names[S.i++ % names.length];
        for (const a of S.actors) { a.setExpr(name, name === 'embarrassed' || name === 'thinking' ? null : a.face); a.line = (PM.get('expressions', name).label || name); a.lineT = 1.5 / S.speed; }
        S.beat = 1.7 / S.speed;
      },
    },
    script: {
      label: 'Script',
      start(S) { S.beat = 0.3; S.si = 0; const res = parseScript(S.script || ''); S.beats = res.beats; showScriptErrors(res.errors); },
      tick(S, dt) {
        S.beat -= dt; if (S.beat > 0) return;
        if (!S.beats.length) { S.beat = 1e9; return; }
        if (S.si >= S.beats.length) { if (!S.loop) { S.beat = 1e9; return; } S.si = 0; for (const a of S.actors) { a.setExpr('neutral', a.face); a.t.turn = a.g.turn; } S.beat = 1.5 / S.speed; return; }
        const b = S.beats[S.si++];
        if (b.pause != null) { S.beat = b.pause / S.speed; return; }
        const a = S.actors[Math.min(b.who, S.actors.length - 1)];
        if (b.expr) a.setExpr(b.expr, a.side ? a.face : null);
        for (const x of b.acts) act(a, S, x);
        if (b.text) { a.say(b.text, S.speed); S.beat = a.talk.left + 0.3 / S.speed; }
        else S.beat = (b.acts.length || b.expr ? 1.0 : 0.2) / S.speed;
      },
    },
  };

  // ------------------------------------------------------------- stage
  const S = { actors: [], mode: 'conversation', speed: 1, playing: false, bubbles: true, last: 0, acc: 0, cast: [null, null], timers: [], loop: true, script: '' };
  let stage, ctx, raf = 0, recorder = null, root;
  function clearTimers() { S.timers.forEach(clearTimeout); S.timers = []; }

  function setupActors() {
    clearTimers();
    for (const a of S.actors) a.destroy();
    const gs = S.cast.filter(Boolean);
    S.actors = gs.map((g, i) => new PM.Actor(g, { side: gs.length === 1 ? 0 : i ? 1 : -1 }));
    const two = S.actors.length === 2;
    stage.width = two ? 2 * W * 1.2 : W * 1.2; stage.height = H * 1.2;
    for (const a of S.actors) {
      a.face = a.side === 0 ? 0 : -a.side * 0.75;   // in a duet, the pair turn toward each other
      if (a.side) { a.g.turn = -a.side * 0.28; a.p.turn = a.t.turn = a.g.turn; }
      a.t.gaze = a.p.gaze = a.face;
    }
    (modes[S.mode] || modes.conversation).start(S);
    paint();
  }

  function bubble(text, x, y, w, tail) {
    if (!text) return;
    const P = new PM.Painter(ctx, { ink: '#16120f', lineWeight: 0.9, wobble: 0.6, seed: text.length });
    ctx.save();
    const loud = /[A-Z]{3,}|!{1,}|\?!/.test(text);
    ctx.font = `700 ${loud ? 23 : 21}px Kalam, "Segoe Print", cursive`;
    const words = text.split(' '), lines = []; let cur = '';
    for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > w - 34 && cur) { lines.push(cur); cur = wd; } else cur = t; }
    lines.push(cur);
    const bh = 22 + lines.length * 24, bw = Math.min(w, Math.max(...lines.map(l => ctx.measureText(l).width)) + 34), bx = x - bw / 2;
    if (loud) {
      // spiky shout bubble
      const pts = [], n = 18, cx = x, cy = y + bh / 2;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = i % 2 ? 1.12 : 0.96; pts.push([cx + Math.cos(a) * bw * 0.56 * k, cy + Math.sin(a) * (bh * 0.62 + 6) * k, true]); }
      P.shape(pts, '#fffaf0', { w: 0.8, smooth: false });
    } else {
      P.shape([[bx, y, true], [bx + bw, y, true], [bx + bw, y + bh, true], [x + tail * 30 + 10, y + bh, true], [x + tail * 52, y + bh + 22, true], [x + tail * 30 - 10, y + bh, true], [bx, y + bh, true]], '#fffaf0', { w: 0.8, tension: 0.12 });
    }
    ctx.fillStyle = '#16120f'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x, y + 12 + i * 24));
    ctx.restore();
  }

  function paint() {
    if (!stage) return;
    const k = stage.height / H;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, stage.width, stage.height);
    S.actors.forEach((a, i) => {
      a.draw();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(a.cv, 0, 0, W, H, i * W * k, a.p.bob * k, W * k, H * k);
    });
    if (S.bubbles) {
      ctx.setTransform(k, 0, 0, k, 0, 0);
      S.actors.forEach((a, i) => {
        if (!a.line) return;
        const two = S.actors.length === 2, x = i * W + (two ? (i ? W * 0.62 : W * 0.38) : W * 0.5);
        bubble(a.line, x, 12, two ? 330 : 380, two ? (i ? -1 : 1) * 0.6 : 0.8);
      });
    }
    const lab = root && root.querySelector('#anim-expr');
    if (lab) lab.textContent = S.actors.map(a => (PM.get('expressions', a.expr) || {}).label || a.expr).join(' · ');
  }

  const FPS = 15;   // a hand-drawn cadence, and kind to slower machines
  function loop() {
    const now = performance.now(), dt = Math.min(0.12, (now - (S.last || now)) / 1000 || 1 / FPS);
    S.last = now;
    for (const a of S.actors) a.update(dt, S.speed);
    (modes[S.mode] || modes.conversation).tick(S, dt * S.speed);
    paint();
    const spent = performance.now() - now;
    raf = setTimeout(loop, Math.max(4, 1000 / FPS - spent));
  }
  function play(on) {
    S.playing = on != null ? on : !S.playing;
    clearTimeout(raf); raf = 0; S.last = 0;
    if (S.playing) raf = setTimeout(loop, 0);
    const b = root && root.querySelector('#anim-play'); if (b) b.textContent = S.playing ? 'Pause' : 'Play';
  }
  function setMode(id) {
    S.mode = id; clearTimers();
    root.querySelectorAll('#anim-modes button').forEach(x => x.classList.toggle('on', x.dataset.mode === id));
    for (const a of S.actors) { a.t.turn = a.g.turn; a.setExpr('neutral', a.face); }
    modes[id].start(S); play(true);
  }

  function record() {
    const b = root.querySelector('#anim-rec');
    if (recorder) { recorder.stop(); return; }
    if (!stage.captureStream || typeof MediaRecorder === 'undefined') { PM.ui.toast('Recording isn’t supported in this browser'); return; }
    const chunks = [];
    recorder = new MediaRecorder(stage.captureStream(15), { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' });
    recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })); a.download = 'portrait-animation.webm';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      recorder = null; b.textContent = 'Record'; b.classList.remove('rec');
    };
    recorder.start(); play(true); b.textContent = 'Stop & save'; b.classList.add('rec');
  }

  function showScriptErrors(errors) {
    const e = root && root.querySelector('#script-errors');
    if (e) e.textContent = errors.length ? errors.slice(0, 5).join(' · ') : '';
  }

  // ------------------------------------------------------------- panel
  function renderCast() {
    root.querySelectorAll('.cast-slot').forEach((slot, i) => {
      const pic = slot.querySelector('.cast-pic'); pic.innerHTML = '';
      const g = S.cast[i];
      if (g) { pic.appendChild(PM.ui.thumb(g, 90)); pic.title = PM.app.describe(g); } else pic.appendChild(h('span', 'founder-empty', i ? 'nobody — solo' : 'pick someone'));
    });
  }
  function setCast(i, g) { S.cast[i] = g ? PM.complete(g) : null; if (!S.cast[0] && S.cast[1]) { S.cast[0] = S.cast[1]; S.cast[1] = null; } renderCast(); if (stage) setupActors(); }
  const randomG = () => {
    const arch = PM.list('archetypes'), r = rnd(), c = PM.app.current();
    return PM.generate({ seed: r.int(1, 1e9), archetype: r.pick(arch).id, gender: r.pick(['fem', 'masc', 'andro']), base: { style: c.style, background: c.background, toneMix: c.toneMix, lineWeight: c.lineWeight, wobble: c.wobble, crumple: c.crumple, crumpleAll: c.crumpleAll, role: r.chance(0.3) ? r.pick(PM.list('roles')).id : 'everyday' } });
  };

  function init() {
    root = document.querySelector('[data-view="animate"]');
    stage = root.querySelector('#anim-stage'); ctx = stage.getContext('2d');
    root.querySelectorAll('.cast-slot').forEach((slot, i) => {
      const row = slot.querySelector('.founder-buttons');
      const b = (label, fn) => { const x = h('button', 'btn small', label); x.type = 'button'; x.onclick = fn; row.appendChild(x); };
      b('Current', () => setCast(i, PM.app.current()));
      b('Random', () => setCast(i, randomG()));
      b('Pick…', () => PM.ui.pickSaved(gs => gs[0] && setCast(i, gs[0]), { single: true, title: 'Pick an actor' }));
      if (i) b('Solo', () => setCast(1, null));
    });
    const seg = root.querySelector('#anim-modes');
    for (const [id, m] of Object.entries(modes)) {
      const b = h('button', null, m.label); b.type = 'button'; b.dataset.mode = id;
      b.onclick = () => setMode(id);
      seg.appendChild(b);
    }
    seg.querySelector(`[data-mode="${S.mode}"]`).classList.add('on');
    const speed = new PM.Knob({ label: 'Speed', min: 0.4, max: 2, step: 0.05, def: 1, format: v => v.toFixed(2) + '×', onInput: v => { S.speed = v; } });
    speed.set(1); root.querySelector('#anim-speed').appendChild(speed.el);
    root.querySelector('#anim-bubbles').onchange = e => { S.bubbles = e.target.checked; paint(); };
    root.querySelector('#anim-play').onclick = () => play();
    root.querySelector('#anim-rec').onclick = record;
    root.querySelector('#anim-shuffle').onclick = () => { setCast(0, randomG()); if (S.cast[1]) setCast(1, randomG()); };

    // script editor
    const ta = root.querySelector('#script-text'), presetSel = root.querySelector('#script-preset');
    for (const name of Object.keys(PRESETS)) { const o = h('option', null, name); o.value = name; presetSel.appendChild(o); }
    const saved = PM.app.store.get('portrait-atelier.script', null);
    ta.value = saved || helpText() + '\n' + PRESETS['Small talk'];
    presetSel.onchange = () => { ta.value = helpText() + '\n' + PRESETS[presetSel.value]; S.script = ta.value; };
    ta.addEventListener('input', () => { S.script = ta.value; PM.app.store.set('portrait-atelier.script', ta.value); showScriptErrors(parseScript(ta.value).errors); });
    root.querySelector('#script-play').onclick = () => { S.script = ta.value; setMode('script'); };
    root.querySelector('#script-loop').onchange = e => { S.loop = e.target.checked; };
    S.script = ta.value;

    if (!S.cast[0]) S.cast[0] = PM.app.current();
    if (S.cast[1] === null) S.cast[1] = randomG();
    renderCast(); setupActors();
  }

  PM.view('animate', { init, show() { if (S.dirty) { S.dirty = false; renderCast(); setupActors(); } play(true); }, hide() { play(false); clearTimers(); if (recorder) recorder.stop(); } });
  PM.animator = {
    modes, parseScript, PRESETS, state: S,
    cast(g, g2) { S.cast[0] = PM.complete(g); if (g2 !== undefined) S.cast[1] = g2 ? PM.complete(g2) : null; S.dirty = true; if (stage) { renderCast(); setupActors(); S.dirty = false; } },
  };
})(window.PM = window.PM || {});
