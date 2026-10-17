/* A rotary knob: drag up/down (or left/right), scroll to nudge, double-click to reset,
 * arrow keys when focused. Hold Shift for fine control.
 *
 *   const k = new PM.Knob({ label, min, max, step, value, def, format, onInput, onStart });
 *   container.appendChild(k.el); k.set(0.5);
 */
(function (PM) {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const A0 = -135, A1 = 135;

  function polar(cx, cy, r, deg) {
    const a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  function arc(cx, cy, r, from, to) {
    if (Math.abs(to - from) < 0.01) return '';
    const [x0, y0] = polar(cx, cy, r, Math.min(from, to)), [x1, y1] = polar(cx, cy, r, Math.max(from, to));
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  class Knob {
    constructor(o) {
      this.o = o;
      this.min = o.min; this.max = o.max; this.step = o.step || 0.01;
      this.def = o.def != null ? o.def : (o.min + o.max) / 2;
      this.value = o.value != null ? o.value : this.def;
      this.bipolar = o.min < 0 && o.max > 0;

      const root = this.el = document.createElement('div');
      root.className = 'knob';
      root.tabIndex = 0;
      root.setAttribute('role', 'slider');
      root.setAttribute('aria-label', o.label);
      root.setAttribute('aria-valuemin', o.min);
      root.setAttribute('aria-valuemax', o.max);
      if (o.hint) root.title = o.hint;

      const svg = el('svg', { viewBox: '0 0 64 64', class: 'knob-svg', 'aria-hidden': 'true' }, root);
      for (let i = 0; i <= 10; i++) {
        const a = A0 + (A1 - A0) * i / 10, [x0, y0] = polar(32, 32, 29, a), [x1, y1] = polar(32, 32, i % 5 ? 26.5 : 25, a);
        el('line', { x1: x0, y1: y0, x2: x1, y2: y1, class: 'knob-tick' }, svg);
      }
      el('path', { d: arc(32, 32, 22, A0, A1), class: 'knob-track' }, svg);
      this.arcEl = el('path', { class: 'knob-arc' }, svg);
      this.cap = el('g', { class: 'knob-cap' }, svg);
      el('circle', { cx: 32, cy: 32, r: 16, class: 'knob-face' }, this.cap);
      el('line', { x1: 32, y1: 31, x2: 32, y2: 18.5, class: 'knob-pointer' }, this.cap);

      const lab = document.createElement('div'); lab.className = 'knob-label'; lab.textContent = o.label; root.appendChild(lab);
      this.out = document.createElement('div'); this.out.className = 'knob-value'; root.appendChild(this.out);

      this.bind();
      this.render();
    }

    format(v) {
      if (this.o.format) return this.o.format(v);
      return this.step >= 1 ? String(Math.round(v)) : (Math.abs(v) < 10 ? v.toFixed(2) : v.toFixed(1));
    }
    snap(v) {
      v = Math.max(this.min, Math.min(this.max, v));
      const k = Math.round((v - this.min) / this.step) * this.step + this.min;
      return +k.toFixed(4);
    }
    set(v, emit = false) {
      const nv = this.snap(v);
      const changed = nv !== this.value;
      this.value = nv;
      this.render();
      if (emit && changed && this.o.onInput) this.o.onInput(nv);
    }
    render() {
      const t = (this.value - this.min) / (this.max - this.min || 1);
      const ang = A0 + (A1 - A0) * t;
      const zero = this.bipolar ? A0 + (A1 - A0) * (-this.min / (this.max - this.min)) : A0;
      this.arcEl.setAttribute('d', arc(32, 32, 22, zero, ang));
      this.cap.setAttribute('transform', `rotate(${ang.toFixed(1)} 32 32)`);
      this.out.textContent = this.format(this.value);
      this.el.setAttribute('aria-valuenow', this.value);
      this.el.setAttribute('aria-valuetext', this.format(this.value));
    }

    bind() {
      const root = this.el;
      let startY = 0, startX = 0, startV = 0, dragging = false;
      root.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        dragging = true; startY = e.clientY; startX = e.clientX; startV = this.value;
        root.setPointerCapture(e.pointerId); root.classList.add('active');
        if (this.o.onStart) this.o.onStart();
        e.preventDefault(); root.focus({ preventScroll: true });
      });
      root.addEventListener('pointermove', e => {
        if (!dragging) return;
        const d = (startY - e.clientY) + (e.clientX - startX) * 0.6;
        const range = this.max - this.min;
        this.set(startV + d / (e.shiftKey ? 600 : 150) * range, true);
      });
      const end = e => { if (!dragging) return; dragging = false; root.classList.remove('active'); try { root.releasePointerCapture(e.pointerId); } catch (_) {} };
      root.addEventListener('pointerup', end);
      root.addEventListener('pointercancel', end);
      root.addEventListener('wheel', e => {
        e.preventDefault();
        if (this.o.onStart) this.o.onStart();
        const unit = this.step >= 1 ? this.step : (this.max - this.min) / (e.shiftKey ? 200 : 50);
        this.set(this.value + (e.deltaY < 0 ? 1 : -1) * unit, true);
      }, { passive: false });
      root.addEventListener('dblclick', () => { if (this.o.onStart) this.o.onStart(); this.set(this.o.resetTo ? this.o.resetTo() : this.def, true); });
      root.addEventListener('keydown', e => {
        const unit = this.step >= 1 ? this.step : (this.max - this.min) / (e.shiftKey ? 200 : 40);
        let v = null;
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') v = this.value + unit;
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') v = this.value - unit;
        if (e.key === 'Home') v = this.min;
        if (e.key === 'End') v = this.max;
        if (v != null) { e.preventDefault(); e.stopPropagation(); if (this.o.onStart) this.o.onStart(); this.set(v, true); }
      });
    }
  }

  PM.Knob = Knob;
})(window.PM = window.PM || {});
