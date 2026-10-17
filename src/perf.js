// A frame-rate watchdog. Ink filters and animated portraits are costly on weak machines: if the page stays slow,
// switch to the lighter looks once (Options brings them back) instead of letting the whole game crawl.
import { getOpt, setOpt } from './ui/options.js';
import { toast } from './ui/dom.js';

export function watchPerformance() {
  let last = performance.now(), start = last, frames = 0, bad = 0, done = false;
  const loop = now => {
    if (done) return;
    if (document.hidden || now - last > 1000) { start = now; frames = 0; last = now; return void requestAnimationFrame(loop); } // tab was away: do not judge it
    last = now; frames++;
    const secs = (now - start) / 1000;
    if (secs >= 6) {
      const fps = frames / secs;
      bad = fps < 22 ? bad + 1 : 0;
      start = now; frames = 0;
      if (bad >= 2 && (getOpt('sketchy') !== false || getOpt('livePortraits') !== false)) {
        done = true;
        setOpt('sketchy', false); setOpt('livePortraits', false);
        toast('The game was running slowly, so portraits are still and the ink is plain now. Options bring them back.', '🐢');
        return;
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
