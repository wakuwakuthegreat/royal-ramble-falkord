/* Dev check for js/extensions/speech-synth.js — run: node tools/voice-check.mjs
 * Loads the plain-script modules with a tiny browser shim, then renders the same line for several
 * heritages in both engines and asserts the output is finite, bounded, audible and deterministic. */
import fs from 'node:fs';
import path from 'node:path';

globalThis.window = globalThis;
globalThis.addEventListener = () => {};
const load = f => (0, eval)(fs.readFileSync(path.resolve(f), 'utf8'));
load('js/core/util.js');
globalThis.PM = globalThis.PM || {};
globalThis.PM.controls = [];
globalThis.PM.complete = g => g;
load('js/extensions/speech-synth.js');

const LINE = 'Your majesty, the harvest has failed and the people are hungry!';
const HERITAGES = ['american', 'british', 'west-african', 'east-asian', 'south-asian', 'middle-eastern', 'latin-american', 'pacific-islander'];

const stats = pcm => {
  let sum = 0, peak = 0, bad = 0;
  for (let i = 0; i < pcm.length; i++) {
    const v = pcm[i];
    if (!Number.isFinite(v)) bad++;
    if (Math.abs(v) > peak) peak = Math.abs(v);
    sum += v * v;
  }
  let d = 0;
  for (let i = 1; i < pcm.length; i++) d += (pcm[i] - pcm[i - 1]) ** 2;
  return { rms: Math.sqrt(sum / pcm.length), peak, bad, bright: Math.sqrt(d / pcm.length) / (Math.sqrt(sum / pcm.length) || 1) };
};

let failures = 0;
const check = (ok, msg) => { if (!ok) { failures++; console.error('FAIL', msg); } };

for (const arch of HERITAGES) {
  const g = { seed: 12345, archetype: arch, gender: arch === 'british' ? 'masc' : 'fem', age: 0.3, expression: 'neutral' };
  const t0 = performance.now();
  const newR = PM.voice.render(g, LINE);
  const newMs = performance.now() - t0;
  const t1 = performance.now();
  const oldR = PM.voice.render(g, LINE, { engine: 'classic' });
  const oldMs = performance.now() - t1;
  const a = stats(newR.pcm), b = stats(oldR.pcm);
  const louder = Math.min(a.rms, b.rms);
  const same = newR.pcm.length === oldR.pcm.length && newR.pcm.every((v, i) => v === oldR.pcm[i]);
  const det = PM.voice.render(g, LINE).pcm.every((v, i) => v === newR.pcm[i]);

  check(a.bad === 0 && b.bad === 0, `${arch}: NaN/Inf in pcm`);
  check(a.peak <= 1.0001 && b.peak <= 1.0001, `${arch}: peak ${Math.max(a.peak, b.peak)} > 1`);
  check(a.rms > 0.01 && b.rms > 0.01, `${arch}: silence (rms ${a.rms.toFixed(4)} / ${b.rms.toFixed(4)})`);
  check(newR.duration > 0.3 && newR.mouth.length > 1 && newR.mouth.some(m => m[1] > 0), `${arch}: bad timeline`);
  check(!same, `${arch}: prosody engine identical to classic`);
  check(det, `${arch}: not deterministic`);
  console.log(
    `${arch.padEnd(18)} new ${(newR.duration).toFixed(2)}s rms ${a.rms.toFixed(3)} peak ${a.peak.toFixed(2)} ${newMs.toFixed(0)}ms` +
    ` | classic rms ${b.rms.toFixed(3)} peak ${b.peak.toFixed(2)} ${oldMs.toFixed(0)}ms` +
    ` | bright new ${a.bright.toFixed(3)} classic ${b.bright.toFixed(3)}`);
}

// the picker exposes four options, the default is the prosody engine, and routing works
const g0 = { seed: 7, archetype: 'american', gender: 'fem', age: 0.3 };
check(PM.voice.modes.length === 4 && PM.voice.modes[0][0] === 'synth', 'modes list wrong');
check(PM.voice.engines.join() === 'synth,classic', 'engines list wrong');
check(PM.voice.mode === 'synth', `default mode is ${PM.voice.mode}, expected synth`);
const def = PM.voice.render(g0, LINE), forced = PM.voice.render(g0, LINE, { engine: 'synth' });
check(def.pcm.every((v, i) => v === forced.pcm[i]), 'default render is not the prosody engine');
console.log('routing  default=prosody, classic forced, modes:', PM.voice.modes.map(m => m[0]).join('/'));

// heritage colour should make voices of different backgrounds differ in register/timbre
const pitchOf = arch => PM.voice.voiceOf({ seed: 1, archetype: arch, gender: 'fem', age: 0.3 });
const eu = PM.voice.voiceOf({ seed: 1, archetype: 'northern-european', gender: 'fem', age: 0.3 });
const wa = PM.voice.voiceOf({ seed: 1, archetype: 'west-african', gender: 'fem', age: 0.3 });
check(eu.color.f0 !== wa.color.f0 || eu.color.fs !== wa.color.fs, 'heritage colour identical');
console.log(`colour   northern-european f0${eu.color.f0.toFixed(2)}st fs${eu.color.fs.toFixed(3)} | west-african f0${wa.color.f0.toFixed(2)}st fs${wa.color.fs.toFixed(3)}`);

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nAll voice checks passed.');
