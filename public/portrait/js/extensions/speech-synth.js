/* Voices: Reigns / Animal Crossing–style babble for every portrait.
 *
 * Nobody speaks a real language here. Each heritage has its own invented tongue (which consonants
 * and vowels it uses, its syllable shapes, stress or tones, speed and melody), and every English word
 * maps to the same made-up word in it. So "no, no, NO!" repeats, and people of one culture share a vocabulary.
 * The sound is a small formant synthesiser rendered offline per line: a glottal source with breath
 * noise, through five vocal-tract resonances that glide between consonants and vowels. No samples, no beeps.
 * Two engines share this timeline: the default prosody engine (a harmonic source, per-sample glides and
 * heritage colour) and the original classic engine, so you can switch back to how it sounded before.
 *
 *   gender + age     → speaking pitch and vocal-tract size (children small and high, elders shakier)
 *   heritage         → language, plus a register/timbre/accent colour and a personal dialect variant;
 *                      a blended heritage code-switches word by word
 *   the Voice genes  → pitch, timbre, breath, gravel, pace, melody: rolled, lockable, inherited by PM.breed
 *   expression       → mood: angry is tense and loud, sad slow and low, scared quick and trembling …
 *   punctuation      → questions rise, statements fall, CAPS are stressed, "…" trails off,
 *                      "hmm" is hummed, "ha!" is laughed, "oh", "uh", "ugh" are the same for everyone
 *
 * The delivery is deliberately soft and legato, like a mumble rather than a newsreader.
 * Actor.say() plays it automatically and moves the mouth in time with the syllables.
 *   PM.voice.say(genome, 'Have you eaten yet?', { expr: 'happy' })   → { duration, mouth, stop() } or null
 *   PM.voice.babble(genome, 'Have you eaten yet?')                   → the invented words, as text
 *   PM.voice.render(genome, text, opts)                              → { pcm: Float32Array, sampleRate, duration, mouth }
 *   PM.voice.mode = 'classic'                                        → 'synth' (prosody, default) | 'classic' (original) | 'device' | 'off' */
(function (PM) {
  'use strict';
  const { clamp, lerp } = PM.math;
  const SR = 32000;
  const st = s => Math.pow(2, s / 12);
  const hashFrac = s => PM.hashString(s) / 4294967296;

  // ------------------------------------------------------------- sounds
  // Vowel formants F1–F3 in Hz for a vocal tract of scale 1 (a typical masc adult). Other voices scale them.
  const VOWELS = {
    a: [760, 1300, 2550], ae: [680, 1720, 2450], E: [580, 1800, 2550], e: [440, 2000, 2650],
    I: [400, 1950, 2600], i: [290, 2250, 3000], '@': [520, 1450, 2500], ii: [340, 1500, 2350],
    O: [600, 950, 2500], o: [450, 850, 2450], U: [440, 1100, 2350], u: [320, 880, 2300],
    ue: [300, 1750, 2200], oe: [460, 1550, 2350],
  };
  const DIPH = { ai: ['a', 'I'], au: ['a', 'U'], ei: ['e', 'I'], ou: ['o', 'U'], oi: ['O', 'I'] };
  const FRONT = new Set(['e', 'E', 'i', 'I', 'ue', 'oe', 'ae', 'ei']);
  const vowelF = k => VOWELS[k] || VOWELS[(DIPH[k] || ['@'])[0]];

  // kind: stop | nasal | fric | asp | liquid | glide | tap | glottal | aff (stop + fricative) | pre (prenasalised stop)
  // loc: the formants a neighbouring vowel glides from. burst / fric: [centre Hz, bandwidth Hz, level].
  // vot: breathy gap after the release (s). lips: the mouth closes for it.
  const CONS = {
    p: { kind: 'stop', loc: [250, 800, 2200], burst: [1100, 1800, 0.35], vot: 0.04, lips: 1 },
    b: { kind: 'stop', voiced: 1, loc: [250, 800, 2200], burst: [900, 1500, 0.22], vot: 0.006, lips: 1 },
    t: { kind: 'stop', loc: [320, 1750, 2700], burst: [3800, 2200, 0.42], vot: 0.045 },
    d: { kind: 'stop', voiced: 1, loc: [320, 1700, 2650], burst: [3400, 2000, 0.28], vot: 0.008 },
    k: { kind: 'stop', loc: [320, 1900, 2350], burst: [2300, 1100, 0.42], vot: 0.05 },
    g: { kind: 'stop', voiced: 1, loc: [320, 1900, 2350], burst: [2100, 1000, 0.28], vot: 0.01 },
    T: { kind: 'stop', loc: [330, 1600, 2100], burst: [2700, 1600, 0.38], vot: 0.02 },
    D: { kind: 'stop', voiced: 1, loc: [330, 1600, 2100], burst: [2500, 1500, 0.26], vot: 0.008 },
    kp: { kind: 'stop', loc: [260, 1050, 2250], burst: [1000, 1400, 0.36], vot: 0.015, lips: 1 },
    gb: { kind: 'stop', voiced: 1, loc: [260, 1050, 2250], burst: [850, 1300, 0.24], vot: 0.006, lips: 1 },
    m: { kind: 'nasal', loc: [260, 950, 2250], lips: 1 },
    n: { kind: 'nasal', loc: [260, 1550, 2600] },
    N: { kind: 'nasal', loc: [260, 1950, 2400] },
    ny: { kind: 'nasal', loc: [260, 2100, 2900] },
    mb: { kind: 'pre', parts: ['m', 'b'], lips: 1 },
    nd: { kind: 'pre', parts: ['n', 'd'] },
    ng: { kind: 'pre', parts: ['N', 'g'] },
    f: { kind: 'fric', loc: [300, 1050, 2300], fric: [6500, 5000, 0.12], lips: 1 },
    v: { kind: 'fric', voiced: 1, loc: [300, 1050, 2300], fric: [6000, 5000, 0.06], lips: 1 },
    s: { kind: 'fric', loc: [320, 1700, 2700], fric: [4800, 1800, 0.3] },
    z: { kind: 'fric', voiced: 1, loc: [320, 1700, 2700], fric: [4600, 1800, 0.17] },
    S: { kind: 'fric', loc: [320, 1900, 2500], fric: [2900, 1500, 0.32] },
    Z: { kind: 'fric', voiced: 1, loc: [320, 1900, 2500], fric: [2800, 1500, 0.18] },
    x: { kind: 'fric', loc: [330, 1400, 2350], fric: [1700, 1300, 0.18] },
    h: { kind: 'asp' },
    l: { kind: 'liquid', loc: [360, 1050, 2800] },
    R: { kind: 'glide', loc: [360, 1150, 1650] },
    r: { kind: 'tap', loc: [380, 1650, 2550] },
    w: { kind: 'glide', loc: [300, 680, 2200], lips: 1 },
    y: { kind: 'glide', loc: [270, 2150, 2950] },
    '?': { kind: 'glottal' },
    ch: { kind: 'aff', stop: 't', fric: 'S' },
    j: { kind: 'aff', stop: 'd', fric: 'Z' },
    ts: { kind: 'aff', stop: 't', fric: 's' },
  };
  // aspirated and breathy-voiced stops (South Asian, Romani)
  for (const [k, base, vot] of [['ph', 'p', 0.075], ['th', 't', 0.075], ['kh', 'k', 0.08]]) CONS[k] = Object.assign({}, CONS[base], { vot, aspirated: 1 });
  for (const [k, base] of [['bh', 'b'], ['dh', 'd']]) CONS[k] = Object.assign({}, CONS[base], { vot: 0.035, breathy: 1 });

  // Lexical tones as semitone offsets [start, end] of the vowel.
  const TONES = { H: [2, 2.3], M: [0, 0], L: [-2, -2.4], R: [-1.6, 2.4], F: [2.4, -2.2], LL: [-2.4, -3] };

  // ------------------------------------------------------------- languages
  // cons / vowels / shapes / codas / clusters / tones: weight tables. style: 'stress' (big accents, reduced
  // unstressed vowels), 'syllable' (even rhythm) or 'tone'. stress: 'first' | 'penult' | 'last'.
  // rate: syllables a second. range: semitone size of accents. decl: fall across a phrase. lilt: sing-song.
  // aspirate: scales the breathy gap after p/t/k. longV: chance of a long vowel. gem: chance of a doubled consonant.
  const BASE = { shapes: { CV: 6, V: 1, CVC: 2 }, clusters: { r: 1, l: 1 }, codas: { n: 1 }, vowels: { a: 3, e: 2, i: 2, o: 2, u: 1.5 },
    style: 'syllable', stress: 'penult', rate: 5.5, range: 5.5, decl: 2.5, lilt: 0, aspirate: 0.6, longV: 0.06, gem: 0, reduce: 0, harmony: false, unreleased: false, tones: null };
  const LANGS = {};
  const L = (id, o) => { LANGS[id] = Object.assign({ id }, BASE, o); };
  const ENGLISH = {
    cons: { p: 1, t: 1.6, k: 1.2, b: 1.1, d: 1.4, g: 0.8, f: 1, v: 0.8, s: 1.8, z: 0.6, S: 0.6, h: 1.1, m: 1.5, n: 2, l: 1.5, R: 1.2, w: 1, y: 0.6, ch: 0.5, j: 0.5 },
    vowels: { ae: 1.3, E: 1.4, I: 1.6, a: 1.2, O: 0.8, U: 0.5, '@': 1.6, i: 1, u: 0.8, ei: 0.7, ai: 0.8, ou: 0.7, au: 0.3, oi: 0.15 },
    shapes: { CVC: 4, CV: 3, V: 0.6, CCVC: 0.6, CCV: 0.5 }, clusters: { R: 1, l: 0.8, w: 0.3 },
    codas: { n: 2, t: 1.5, s: 1.2, d: 0.8, k: 0.8, l: 1, R: 0.7, N: 0.6, m: 0.6, z: 0.5 },
    style: 'stress', stress: 'first', reduce: 0.55, aspirate: 1,
  };
  L('american', Object.assign({}, ENGLISH, { rate: 5.6, range: 6 }));
  L('british', Object.assign({}, ENGLISH, { rate: 5.7, range: 7.5, decl: 3 }));
  L('african-american', Object.assign({}, ENGLISH, { rate: 5.4, range: 8, lilt: 0.35 }));
  L('black-british', Object.assign({}, ENGLISH, { rate: 5.8, range: 6.5, lilt: 0.2 }));
  L('caribbean', Object.assign({}, ENGLISH, { style: 'syllable', reduce: 0.2, rate: 5.6, range: 7, lilt: 0.9, decl: 1.5, shapes: { CV: 4, CVC: 3, V: 0.6 } }));
  L('northern-european', Object.assign({}, ENGLISH, {
    cons: { p: 1, t: 1.5, k: 1.2, b: 1, d: 1.5, g: 0.8, f: 1, v: 1.1, s: 1.8, z: 0.4, S: 0.6, h: 1, m: 1.5, n: 2, N: 0.5, l: 1.5, R: 1, w: 0.4, y: 0.7 },
    vowels: { a: 2, ae: 0.8, E: 1.5, e: 1, I: 1.4, i: 1, O: 1, o: 1.2, U: 0.6, u: 0.9, '@': 1.4, ue: 0.6, oe: 0.5, ai: 0.5, ou: 0.4 },
    rate: 5.3, range: 6.5, lilt: 0.3, longV: 0.15, reduce: 0.4,
  }));
  L('west-african', {
    cons: { b: 2.5, d: 2, k: 2, g: 1, gb: 1, kp: 0.6, m: 2.5, n: 2, w: 1.5, y: 1.5, l: 2, r: 1, f: 1, s: 1.5, S: 1, t: 1.5, mb: 0.6, nd: 0.6, ny: 0.5, h: 0.5 },
    vowels: { a: 4, e: 2, E: 1.5, i: 2, o: 2, O: 1.5, u: 2 }, shapes: { CV: 8, V: 1.5, CVC: 0.5 }, codas: { n: 1, N: 0.5 },
    style: 'tone', tones: { H: 3, M: 3, L: 3 }, rate: 5.4, range: 5, aspirate: 0.4,
  });
  L('east-african', {
    cons: { m: 2, b: 2, w: 2, t: 2, d: 1.5, n: 2, s: 1.5, z: 0.8, l: 1.5, r: 1.5, k: 2, g: 1, y: 1.5, h: 1, ch: 1, j: 0.8, S: 0.8, mb: 0.6, nd: 0.6, ng: 0.4 },
    vowels: { a: 4, e: 2, i: 2.5, o: 2, u: 2 }, shapes: { CV: 9, V: 1 }, codas: {}, rate: 5.7, range: 5.5, aspirate: 0.5,
  });
  L('north-african', {
    cons: { t: 2, d: 1.5, k: 2, g: 1, s: 2, z: 1, S: 1.5, x: 1, r: 2, l: 1.5, m: 2, n: 2, b: 1.5, f: 1, h: 1, y: 1, w: 1, '?': 0.3 },
    vowels: { a: 3, i: 2, u: 2, '@': 2.5, e: 0.5 }, shapes: { CVC: 4, CV: 3, CCV: 0.8 }, clusters: { r: 1, l: 0.5 },
    codas: { t: 1, d: 0.5, n: 1.5, r: 1.5, l: 1, s: 1, S: 0.6, k: 0.6, m: 1 }, style: 'stress', stress: 'last', rate: 5.6, range: 6, reduce: 0.3,
  });
  L('middle-eastern', {
    cons: { b: 1.5, t: 1.5, d: 1.5, k: 1.5, s: 1.5, z: 0.8, S: 1, x: 1, h: 2, r: 2, l: 2, m: 2, n: 2, f: 1, y: 1, w: 1.2, j: 0.8, '?': 0.8 },
    vowels: { a: 5, i: 2.5, u: 2, e: 1, o: 1 }, longV: 0.3, shapes: { CV: 4, CVC: 4 },
    codas: { n: 1.5, r: 1.2, l: 1, m: 1, b: 0.5, d: 0.6, t: 0.6, s: 0.6, h: 0.4 }, style: 'stress', rate: 5.2, range: 6, decl: 3, reduce: 0.1,
  });
  L('south-asian', {
    cons: { k: 1.5, kh: 0.6, g: 1, ch: 1, j: 1, T: 0.8, D: 0.6, t: 1.5, th: 0.4, d: 1.2, dh: 0.3, n: 2, p: 1, b: 1.2, bh: 0.4, m: 2, y: 1.2, r: 2, l: 1.5, v: 1.5, S: 1, s: 1.5, h: 1 },
    vowels: { a: 4, '@': 2, i: 2, e: 1.5, o: 1.5, u: 1.5, ai: 0.3 }, longV: 0.3, shapes: { CV: 5, CVC: 2, V: 0.6 },
    codas: { n: 1.5, r: 1, l: 0.6, m: 0.8, t: 0.5, k: 0.4 }, rate: 6, range: 6.5, lilt: 0.7, aspirate: 0.3,
  });
  L('east-asian', {
    cons: { p: 1, t: 1.5, k: 1.5, th: 0.5, kh: 0.5, m: 1.5, n: 2, s: 1.5, S: 1, ch: 1.2, ts: 1, j: 1, h: 1.5, l: 1.2, y: 1.2, w: 1, r: 0.5 },
    vowels: { a: 3, i: 2.5, u: 2, e: 2, o: 2, '@': 1.5, ue: 0.6 }, shapes: { CV: 6, CVC: 2.5 }, codas: { n: 2, N: 1.5 },
    style: 'tone', tones: { H: 2, R: 2, LL: 1.2, F: 2, M: 1 }, rate: 6.2, range: 5, aspirate: 0.3,
  });
  L('southeast-asian', {
    cons: { b: 1, d: 1, k: 2, N: 1, m: 2, n: 2, p: 1, t: 1.5, l: 1.5, y: 1, w: 1, h: 1, s: 1.2, ch: 1, ny: 0.5, r: 0.6 },
    vowels: { a: 3, i: 2, u: 2, e: 1.5, o: 1.5, '@': 1.2, E: 1, O: 1 }, shapes: { CV: 5, CVC: 2.5 },
    codas: { N: 2, n: 1.5, m: 1, p: 0.5, t: 0.7, k: 0.7 }, unreleased: true,
    style: 'tone', tones: { M: 3, L: 2, F: 2, H: 2, R: 1.5 }, rate: 5.8, range: 5, aspirate: 0.4,
  });
  L('central-asian', {
    cons: { k: 2, g: 1, t: 2, d: 1.5, b: 1.5, s: 1.5, S: 1.2, z: 0.8, x: 1, m: 1.5, n: 2, N: 1, l: 1.5, r: 1.5, y: 1.2, j: 1, ch: 1 },
    vowels: { a: 3, '@': 2, i: 1.5, I: 1, o: 1.5, u: 1.5, ue: 0.8, oe: 0.8, e: 1 }, harmony: true, shapes: { CVC: 4, CV: 3, V: 0.6 },
    codas: { n: 1.5, N: 1, r: 1, l: 1, k: 0.8, t: 0.8, s: 0.5, y: 0.4 }, style: 'stress', stress: 'last', rate: 5.4, range: 5, reduce: 0.2,
  });
  L('indigenous-north-america', {
    cons: { t: 2, k: 2, '?': 1.2, n: 2, m: 1, w: 1.5, y: 1.2, h: 1.5, S: 1, s: 1, l: 1, ch: 1, ts: 0.6, x: 0.4, d: 0.6, g: 0.4 },
    vowels: { a: 3, e: 2, i: 2, o: 2, u: 0.8 }, longV: 0.35, shapes: { CV: 5, CVC: 1.5, V: 0.6 },
    codas: { '?': 1, n: 1, h: 0.6, s: 0.4, k: 0.4 }, style: 'tone', tones: { H: 2, L: 3 }, rate: 4.9, range: 4.5, decl: 3,
  });
  L('indigenous-latin-america', {
    cons: { t: 2, k: 2, p: 1.2, ch: 1.5, ts: 1, m: 1.5, n: 2, w: 1.5, y: 1.5, l: 1.5, s: 1.2, S: 1.2, h: 1, '?': 0.4, r: 0.6, x: 0.3 },
    vowels: { a: 4, i: 2.5, u: 1.5, o: 1.5, e: 1 }, shapes: { CV: 5, CVC: 2.5 },
    codas: { n: 1, k: 0.8, t: 0.6, s: 0.6, y: 0.4, l: 0.6, '?': 0.3, w: 0.3 }, rate: 5.2, range: 5, aspirate: 0.3,
  });
  const ROMANCE = {
    cons: { b: 1.5, d: 1.5, g: 0.8, p: 1.2, t: 1.5, k: 1.2, m: 1.5, n: 1.5, l: 2, r: 2, s: 2, f: 0.8, ch: 0.6, y: 0.8, v: 0.6 },
    vowels: { a: 4, e: 3, i: 2, o: 3, u: 1.2 }, shapes: { CV: 6, CVC: 2, CCV: 1 }, clusters: { r: 1, l: 0.6 },
    codas: { s: 2, n: 2, l: 1, r: 1.2 }, aspirate: 0.3,
  };
  L('latin-american', Object.assign({}, ROMANCE, { cons: Object.assign({}, ROMANCE.cons, { x: 0.3 }), rate: 6.4, range: 6.5 }));
  L('southern-european', Object.assign({}, ROMANCE, { shapes: { CV: 7, CVC: 1.2, CCV: 1 }, codas: { n: 1, l: 0.6, r: 0.8, s: 0.6 }, gem: 0.25, rate: 6.1, range: 7.5, lilt: 0.4 }));
  L('pacific-islander', {
    cons: { k: 1.5, m: 1.5, n: 1, p: 1, t: 1, h: 1.5, w: 1.2, l: 1.2, r: 0.8, N: 0.8, f: 0.8, v: 0.8, '?': 0.8 },
    vowels: { a: 4, e: 2.5, i: 2, o: 2.5, u: 2 }, longV: 0.25, shapes: { CV: 8, V: 2.5 }, codas: {}, rate: 5, range: 6.5, aspirate: 0.3,
  });
  L('aboriginal-australian', {
    cons: { b: 1.5, d: 1, g: 1.5, D: 0.6, m: 1.5, n: 1.5, N: 1.2, ny: 0.8, l: 1.5, R: 1, r: 1, w: 1.5, y: 1.5 },
    vowels: { a: 4, i: 2.5, u: 2.5 }, shapes: { CV: 5, CVC: 2 }, codas: { l: 1, n: 1.2, r: 0.8, R: 0.5, N: 0.4, y: 0.3 },
    style: 'stress', stress: 'first', rate: 5, range: 5.5, reduce: 0.1,
  });
  L('eastern-european', {
    cons: { p: 1, b: 1, t: 1.5, d: 1.5, k: 1.5, g: 1, m: 1.5, n: 1.5, l: 1.5, r: 2, s: 1.5, z: 1, S: 1, Z: 0.8, v: 1.5, ch: 1, ts: 0.8, x: 0.8, y: 1 },
    vowels: { a: 3, e: 2.5, i: 2, o: 3, u: 1.5, ii: 0.8 }, shapes: { CVC: 3, CV: 4, CCV: 1.5, CCVC: 0.6 }, clusters: { r: 1, l: 0.6, v: 0.5 },
    codas: { t: 0.8, k: 0.6, s: 0.6, n: 0.8, l: 0.6, r: 0.6, v: 0.4, S: 0.4, ch: 0.3 }, style: 'stress', rate: 5.6, range: 5, reduce: 0.3, aspirate: 0.3,
  });
  L('romani', {
    cons: { b: 1, d: 1.5, k: 1.5, kh: 0.5, g: 1, p: 1, t: 1.5, th: 0.4, m: 1.5, n: 2, r: 2, l: 1.5, s: 1.2, S: 1.2, ch: 1, j: 0.8, v: 1.2, x: 0.6, y: 1, h: 0.6 },
    vowels: { a: 3, e: 2.5, i: 2.5, o: 2, u: 1.5, '@': 0.8 }, shapes: { CV: 5, CVC: 2.5, CCV: 0.5 },
    codas: { n: 1.5, r: 1.2, s: 0.8, l: 0.8, m: 0.6, k: 0.5 }, stress: 'last', rate: 5.9, range: 7, lilt: 0.4, aspirate: 0.4,
  });
  // broader culture groups and regions, for heritages added by extensions
  const ALIAS = { anglo: 'american', 'african-diaspora': 'african-american', african: 'west-african', european: 'northern-european' };
  const REGION = { Africa: 'west-african', 'West Asia': 'middle-eastern', 'South Asia': 'south-asian', 'East Asia': 'east-asian', 'Southeast Asia': 'southeast-asian',
    'Central Asia': 'central-asian', Americas: 'latin-american', Oceania: 'pacific-islander', Europe: 'northern-european' };
  for (const l of Object.values(LANGS)) l.obstruents = Object.fromEntries(Object.entries(l.cons).filter(([k]) => /stop|fric|aff/.test(CONS[k].kind)));

  function langOf(archId) {
    if (LANGS[archId]) return LANGS[archId];
    const groups = PM.cultureGroups ? PM.cultureGroups(archId) : [];
    for (const gid of groups) if (LANGS[gid] || ALIAS[gid]) return LANGS[gid] || LANGS[ALIAS[gid]];
    const a = PM.get('archetypes', archId);
    return LANGS[REGION[a && a.region]] || LANGS.american;
  }

  /** The made-up word for an English word: same key, same language → same word, every time. */
  function makeWord(lang, key, nSyl) {
    const r = new PM.RNG(lang.id + '|' + key);
    const syls = [];
    let front = null;
    for (let i = 0; i < nSyl; i++) {
      let shape = r.weighted(lang.shapes);
      if (i > 0 && shape[0] === 'V' && r.chance(0.7)) shape = 'C' + shape;
      const s = { onset: [], coda: [] };
      const nOn = shape.indexOf('V');
      if (nOn === 2 && Object.keys(lang.clusters).length) s.onset.push(r.weighted(lang.obstruents), r.weighted(lang.clusters));
      else if (nOn >= 1) s.onset.push(r.weighted(lang.cons));
      let v = r.weighted(lang.vowels);
      if (lang.harmony) {
        for (let k = 0; front !== null && FRONT.has(v) !== front && k < 6; k++) v = r.weighted(lang.vowels);
        if (front === null) front = FRONT.has(v);
      }
      s.v = v;
      s.long = r.chance(lang.longV) && !DIPH[v];
      if (shape.endsWith('C') && Object.keys(lang.codas).length) s.coda.push(r.weighted(lang.codas));
      if (lang.tones) s.tone = r.weighted(lang.tones);
      s.gem = i > 0 && r.chance(lang.gem);
      s.jit = [r.range(-1, 1), r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)];
      syls.push(s);
    }
    const stress = lang.stress === 'first' ? 0 : lang.stress === 'last' ? nSyl - 1 : Math.max(0, nSyl - 2);
    return { syls, stress };
  }

  /** Roughly how many syllables an English word has. */
  function englishSyllables(w) {
    if (/^\d+$/.test(w)) return clamp(w.length, 1, 4);
    w = w.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    const m = w.match(/[aeiouy]{1,2}/g);
    return clamp(m ? m.length : 1, 1, 4);
  }

  // Sounds everyone makes the same way: hums, laughs, hesitations, gasps.
  // Each returns syllables; contour = [start, middle, end] semitones, dur = vowel length multiplier.
  const INTERJECTIONS = [
    [/^h*m+h*m*$/, () => [{ onset: [], coda: [], v: 'hum', contour: [-0.5, 1.2, -1], dur: 3.2 }]],
    [/^(?:a?ha)+h?$|^(?:he){2,}h?$|^heh$|^hah+$/, k => {
      const n = clamp((k.match(/h[ae]/g) || ['x']).length, 1, 4);
      return Array.from({ length: n }, (_, i) => ({ onset: ['h'], coda: [], v: /e/.test(k) ? 'E' : 'a', contour: [4 - i * 1.5, 3.6 - i * 1.5, 3 - i * 1.6], dur: 0.9, laugh: 1 }));
    }],
    [/^o+h*$/, () => [{ onset: [], coda: [], v: 'o', contour: [-1, 3, 1], dur: 2.4 }]],
    [/^a+h+$|^ah$/, () => [{ onset: [], coda: [], v: 'a', contour: [2, 0.5, -1.5], dur: 2.2 }]],
    [/^aw+$/, () => [{ onset: [], coda: [], v: 'O', contour: [2, 0, -2.5], dur: 2.4 }]],
    [/^u+h+$|^u+m+$|^e+r+m*$|^e+h+m*$/, k => [{ onset: [], coda: /m$/.test(k) ? ['m'] : [], v: '@', contour: [-1.5, -1.5, -2], dur: 2.4 }]],
    [/^ugh+$|^urgh+$/, () => [{ onset: [], coda: ['h'], v: '@', contour: [1, -1, -4], dur: 1.8, fry: 1 }]],
    [/^huh$/, () => [{ onset: ['h'], coda: [], v: '@', contour: [-1, 1, 4], dur: 1.6 }]],
    [/^wo+w+$/, () => [{ onset: ['w'], coda: [], v: 'au', contour: [1, 4, 0], dur: 2 }]],
    [/^s*h+$|^shh+$/, () => [{ onset: ['S'], coda: [], v: 'u', contour: [0, 0, 0], dur: 0.6, quiet: 1 }]],
  ];
  const interjection = key => { for (const [re, fn] of INTERJECTIONS) if (re.test(key)) return fn(key); return null; };

  /** Split a line into phrases of words, each with how the phrase ends (. ! ? , …). */
  function phrasesOf(text) {
    const out = [];
    let words = [];
    const re = /([\p{L}\p{N}'’]+)|(\.{3}|…|[.!?]+|[,;:—–])/gu;
    let m;
    const flush = end => { if (words.length) out.push({ words, end }); words = []; };
    while ((m = re.exec(text))) {
      if (m[1]) {
        const raw = m[1].replace(/['’]/g, ''); if (!raw) continue;
        words.push({ key: raw.toLowerCase(), caps: raw.length > 1 && raw === raw.toUpperCase() && /\p{Lu}/u.test(raw) });
      } else {
        const p = m[2];
        flush(/\?/.test(p) ? '?' : /!/.test(p) ? '!' : /…|\.{3}/.test(p) ? '…' : p === '.' ? '.' : ',');
      }
    }
    flush('.');
    return out;
  }

  // ------------------------------------------------------------- the speaker
  const GENES = [
    { id: 'voicePitch', label: 'Pitch', hint: 'Speaking pitch, within what is usual for this presentation and age' },
    { id: 'voiceTimbre', label: 'Timbre', hint: 'Dark and deep (low) to light and bright (high): the size of the voice' },
    { id: 'voiceBreath', label: 'Breath', hint: 'Clear to airy, breathy voice' },
    { id: 'voiceGravel', label: 'Gravel', hint: 'Smooth to husky, with a little creak at the ends of sentences' },
    { id: 'voicePace', label: 'Pace', hint: 'Unhurried to quick talker' },
    { id: 'voiceMelody', label: 'Melody', hint: 'Flat and even to lively and sing-song' },
  ];
  const seedGene = (g, id) => +new PM.RNG((g.seed != null ? g.seed : 1) + ':' + id).soft(0.12, 0.88).toFixed(2);
  const gene = (g, id) => (typeof g[id] === 'number' ? g[id] : seedGene(g, id));

  // Moods per expression. f0: semitones; range / rate / loud: multipliers; breath: added; tense: -1 lax … 1 pressed.
  const EMO = {
    neutral: {},
    happy: { f0: 1.5, range: 1.3, rate: 1.06, breath: 0.03, tense: 0.05, loud: 1.08 },
    laughing: { f0: 3, range: 1.45, rate: 1.1, breath: 0.15, loud: 1.15 },
    smitten: { f0: 1.5, range: 1.2, rate: 0.9, breath: 0.25, tense: -0.3, loud: 0.85 },
    flirty: { f0: 0.5, range: 1.25, rate: 0.88, breath: 0.3, tense: -0.35, loud: 0.85 },
    smug: { f0: -1, range: 1.15, rate: 0.9, breath: 0.05, loud: 0.95 },
    embarrassed: { f0: 1.5, range: 0.7, rate: 1.12, breath: 0.25, tense: -0.2, loud: 0.7 },
    thinking: { f0: -1, range: 0.8, rate: 0.86, breath: 0.08, tense: -0.1, loud: 0.85 },
    determined: { f0: -0.5, range: 0.9, breath: -0.03, tense: 0.4, loud: 1.1 },
    sad: { f0: -2, range: 0.55, rate: 0.82, breath: 0.2, tense: -0.3, loud: 0.75 },
    crying: { f0: 1, range: 0.9, rate: 0.8, breath: 0.35, tense: -0.1, loud: 0.85, tremor: 0.7 },
    scared: { f0: 3, range: 0.9, rate: 1.18, breath: 0.2, tense: 0.2, loud: 0.9, tremor: 0.45 },
    surprised: { f0: 4, range: 1.6, rate: 1.05, breath: 0.08, tense: 0.15, loud: 1.15 },
    disgusted: { f0: -1.5, range: 1.1, rate: 0.9, breath: 0.05, tense: 0.35 },
    angry: { f0: -0.5, range: 1.2, rate: 1.08, breath: -0.04, tense: 0.65, loud: 1.3 },
    rage: { f0: 2.5, range: 1.5, rate: 1.14, tense: 0.9, loud: 1.5 },
    sleepy: { f0: -2, range: 0.6, rate: 0.78, breath: 0.25, tense: -0.4, loud: 0.7 },
  };
  const emotion = name => Object.assign({ f0: 0, range: 1, rate: 1, breath: 0, tense: 0, loud: 1, tremor: 0 }, EMO[name] || {});

  /** Everything that makes this person sound like themselves. */
  function voiceOf(g) {
    const gender = g.gender || 'fem', age = g.age != null ? g.age : 0.25;
    const [vp, vt, vb, vg, vpace, vm] = GENES.map(x => gene(g, x.id));
    let f0 = gender === 'masc' ? 112 : gender === 'fem' ? 205 : 158;
    let fs = gender === 'masc' ? 1 : gender === 'fem' ? 1.15 : 1.075;
    f0 *= st((vp - 0.5) * 9);
    fs *= 1 + (vt - 0.5) * 0.14;
    const young = clamp((0.17 - age) / 0.13, 0, 1), old = clamp((age - 0.55) / 0.4, 0, 1);
    f0 = lerp(f0, 250, young * 0.8);
    fs = lerp(fs, 1.25, young * 0.75);
    f0 *= gender === 'masc' ? 1 + 0.06 * old : 1 - 0.1 * old;
    const gravel = clamp(vg + old * 0.3, 0, 1.3);
    const A = langOf(g.archetype), B = g.mixWith ? langOf(g.mixWith) : null;
    // Heritage colour: on top of the invented language, every background gets its own register,
    // timbre and accent strength, plus a personal dialect variant seeded from the genome (so it is
    // inherited like everything else). The classic engine ignores this; the prosody engine applies it.
    const accentSeed = hashFrac('accent|' + A.id);
    const dialect = new PM.RNG((g.seed || 1) + '|dialect|' + A.id + (B ? '|' + B.id : ''));
    return {
      f0, fs,
      breath: clamp(0.14 + vb * 0.45 + (gender === 'fem' ? 0.06 : 0) + old * 0.15, 0, 1),
      jitter: 0.003 + gravel * 0.009, shimmer: 0.025 + gravel * 0.07,
      fry: clamp(gravel * (gender === 'masc' ? 0.8 : 0.5) - 0.3, 0, 1), tremor: old * 0.55,
      rate: (0.84 + vpace * 0.32) * (1 - old * 0.1),
      melody: (0.6 + vm * 0.8) * (gender === 'fem' ? 1.1 : gender === 'masc' ? 0.92 : 1) * (1 + young * 0.15),
      color: {
        f0: (accentSeed - 0.5) * 2.6 + dialect.range(-0.5, 0.5),          // register, semitones
        fs: 1 + (hashFrac('color|' + A.id) - 0.5) * 0.05 + dialect.range(-0.012, 0.012), // tract size
        accent: clamp(0.3 + 0.7 * hashFrac('asp|' + A.id) + dialect.range(-0.15, 0.15), 0, 1), // consonant colour
        tilt: dialect.range(-0.3, 0.3),                                    // bright ↔ soft voice
      },
      langA: A, langB: B && B !== A ? B : null, mix: B && B !== A ? (g.mix != null ? g.mix : 0.5) : 0,
      seed: g.seed || 1,
    };
  }

  // ------------------------------------------------------------- line → timeline
  // Durations in seconds at a typical pace.
  const DUR = { vowel: 0.125, closure: 0.03, burst: 0.012, nasal: 0.06, liquid: 0.05, tap: 0.03, glide: 0.055, fric: 0.065, asp: 0.05, glottal: 0.04 };
  const lipsShut = k => CONS[k] && CONS[k].lips;

  /** Words → syllables with stress, pitch contour, loudness and length. */
  function syllablesOf(voice, phrases, emo) {
    const A = voice.langA, B = voice.langB, m = voice.mix;
    const pick = (a, b) => (B ? lerp(a, b, m) : a);
    const P = { range: pick(A.range, B && B.range), decl: pick(A.decl, B && B.decl), lilt: pick(A.lilt, B && B.lilt) };
    const accent = P.range * 0.38 * voice.melody * emo.range;
    return phrases.map(ph => {
      const syls = [];
      ph.words.forEach((w, wi) => {
        const ij = interjection(w.key);
        if (ij) { ij.forEach((s, si) => syls.push(Object.assign({ lang: A, word: wi, stress: si === 0, emph: w.caps, jit: [0, 0, 0, 0] }, s))); return; }
        const lang = B && hashFrac(w.key) < m ? B : A;
        const word = makeWord(lang, w.key, englishSyllables(w.key));
        const accented = w.caps || wi === ph.words.length - 1 || hashFrac('acc|' + w.key) < 0.72;
        word.syls.forEach((s, si) => syls.push(Object.assign(s, { lang, word: wi, stress: si === word.stress, accented, emph: w.caps })));
      });
      const n = syls.length, end = ph.end;
      syls.forEach((s, i) => {
        const r = new PM.RNG(voice.seed + '|' + i + '|' + s.v + s.word);
        const prog = n > 1 ? i / (n - 1) : 1, last = i === n - 1;
        const base = emo.f0 + 0.8 - P.decl * prog * (end === '?' ? 0.4 : 1) * (0.8 + 0.2 * voice.melody);
        const Ac = accent * (s.emph ? 1.6 : 1);
        const style = s.lang.style;
        let c;
        if (s.contour) c = s.contour.map(x => x * (0.7 + 0.3 * voice.melody * emo.range));
        else if (style === 'tone' && s.tone) {
          const t = TONES[s.tone], k = s.lang.range * 0.13 * voice.melody * Math.sqrt(emo.range);
          c = [t[0] * k, (t[0] + t[1]) / 2 * k, t[1] * k];
          if (s.stress && s.emph) c = c.map(x => x + Ac * 0.4);
        } else if (style === 'stress') c = s.stress && s.accented ? [0.25 * Ac, Ac, 0.6 * Ac] : s.stress ? [0.1 * Ac, 0.3 * Ac, 0.2 * Ac] : [-0.1 * Ac, -0.15 * Ac, -0.2 * Ac];
        else c = s.stress ? [0.2 * Ac, 0.65 * Ac, 0.4 * Ac] : [0.1 * Ac * r.range(-1, 1), 0.2 * Ac * r.range(-1, 1), 0];
        const lilt = P.lilt * accent * 0.4 * (s.word % 2 ? 1 : -0.6);
        const wob = r.range(-0.25, 0.25);
        c = c.map(x => x + lilt + wob);
        if (last) {
          if (end === '?') c = [c[0] - 0.5, c[1] + 1.5, c[2] + 3.5 + accent * 0.8];
          else if (end === ',') c[2] += 1.2;
          else if (end === '!') c = [c[0] + 0.5 * Ac, c[1] + 0.8 * Ac, c[2] - 0.4 * Ac];
          else c = [c[0], c[1] - 0.3 * accent, c[2] - 1.2 - 0.5 * accent];
        } else if (end === '?' && i === n - 2) c = c.map(x => x - 0.6);
        s.pitch = c.map(x => x + base);
        const stressTimed = style === 'stress';
        s.amp = (s.stress ? 1 : stressTimed ? 0.8 : 0.88) * (s.emph ? 1.35 : 1) * (last && end !== '?' && end !== '!' ? 0.85 : 1) *
          (end === '…' ? 1 - 0.35 * prog : 1) * (s.laugh ? 0.9 : 1) * (s.quiet ? 0.5 : 1);
        s.durMul = (s.stress ? (stressTimed ? 1.3 : 1.12) : stressTimed ? 0.8 : 0.95) * (s.emph ? 1.25 : 1) * (last ? 1.6 : 1) *
          (last && end === '…' ? 1.3 : 1) * (s.long ? 1.6 : 1) * r.range(0.86, 1.18) * (s.dur || 1);
        s.reduce = s.stress || s.contour ? 0 : s.lang.reduce;
        s.fryAmt = (last && (end === '.' || end === '…')) || s.fry ? Math.max(voice.fry, s.fry ? 0.6 : 0) : 0;
      });
      return { syls, end };
    });
  }

  /** Syllables → a timeline of segments (formant targets + source levels) and pitch points. */
  function timelineOf(voice, phrases, emo, speed) {
    const segs = [], pts = [];
    const rm = voice.rate * emo.rate * clamp(speed || 1, 0.6, 1.6) * ((voice.langB ? lerp(voice.langA.rate, voice.langB.rate, voice.mix) : voice.langA.rate) / 5.5) * 0.9;
    let t = 0.04, curF = VOWELS['@'];
    const push = (dur, o) => { const s = Object.assign({ t0: t, t1: t + dur, F: curF, av: 0, ah: 0, af: 0, ff: 3000, fbw: 2000, nas: 0, mouth: 0.15, sharp: 0, fry: 0 }, o); segs.push(s); t += dur; curF = s.F; return s; };
    const d = k => DUR[k] / rm;

    // Soft, mumbled delivery (Animal Crossing / Reigns rather than a newsreader): the voice keeps
    // flowing through consonants. Stops are gentle voiced dips, not silences; hisses and pops stay quiet.
    function consonant(key, amp, nextF, coda, s) {
      const c = CONS[key]; if (!c) return;
      const mouth = c.lips ? 0 : 0.12;
      if (c.kind === 'pre') { const [na, sp] = c.parts; push(d('nasal') * 0.6, { F: CONS[na].loc, av: 0.6 * amp, nas: 1, mouth }); stop(CONS[sp], amp, nextF, coda, s, 0.5); return; }
      if (c.kind === 'stop') { stop(c, amp, nextF, coda, s, s && s.gem && !coda ? 1.6 : 1); return; }
      if (c.kind === 'aff') { stop(CONS[c.stop], amp, null, false, null, 0.7, true); const f = CONS[c.fric]; push(d('fric') * 0.6, { F: f.loc, af: f.fric[2] * 0.4 * amp, ff: f.fric[0], fbw: f.fric[1], av: 0.4 * amp, mouth: 0.15 }); return; }
      if (c.kind === 'nasal') push(d('nasal') * (coda ? 1.1 : 1), { F: c.loc, av: 0.7 * amp, nas: 1, mouth });
      else if (c.kind === 'fric') push(d('fric') * (c.lips ? 0.75 : 0.85), { F: c.loc, af: c.fric[2] * 0.45 * amp, ff: c.fric[0], fbw: c.fric[1], av: (c.voiced ? 0.55 : 0.3) * amp, mouth: c.lips ? 0.05 : 0.15 });
      else if (c.kind === 'asp') push(d('asp') * (coda ? 1.3 : 1), { F: nextF || curF, ah: 0.4 * amp, av: 0.3 * amp, mouth: 0.35 });
      else if (c.kind === 'liquid') push(d('liquid'), { F: c.loc, av: 0.8 * amp, mouth: 0.3 });
      else if (c.kind === 'glide') push(d('glide'), { F: c.loc, av: 0.85 * amp, mouth: c.lips ? 0.08 : 0.3 });
      else if (c.kind === 'tap') push(d('tap'), { F: c.loc, av: 0.5 * amp, mouth: 0.25 });
      else if (c.kind === 'glottal') push(d('glottal'), { F: curF, av: 0.3 * amp, mouth: 0.25, fry: 0.4 });
    }
    function stop(c, amp, nextF, coda, s, closeMul, noVot) {
      const lang = s ? s.lang : voice.langA;
      push(d('closure') * closeMul, { F: c.loc, av: (c.voiced ? 0.45 : 0.3) * amp, mouth: c.lips ? 0 : 0.1 });
      if (coda && lang.unreleased) return;
      push(DUR.burst, { F: c.loc, af: c.burst[2] * 0.25 * amp * (coda ? 0.6 : 1), ff: c.burst[0], fbw: c.burst[1], av: 0.45 * amp, mouth: 0.22 });
      const vot = noVot ? 0 : c.vot * (c.voiced || c.aspirated ? 1 : lang.aspirate) * (coda ? 0.5 : 1) * 0.6;
      if (vot > 0.012) push(vot / Math.sqrt(rm), { F: nextF || c.loc, ah: 0.3 * amp, av: (c.breathy ? 0.45 : 0.25) * amp, mouth: 0.3 });
    }

    phrases.forEach((ph, pi) => {
      ph.syls.forEach(s => {
        const amp = s.amp;
        const fOf = k => { let f = vowelF(k); if (s.reduce) f = f.map((x, j) => lerp(x, VOWELS['@'][j], s.reduce * 0.6)); return f.map((x, j) => x * (1 + s.jit[j] * 0.03)); };
        const parts = s.v === 'hum' ? null : DIPH[s.v] ? DIPH[s.v].map(fOf) : [fOf(s.v)];
        s.onset.forEach((k, i) => consonant(k, amp, parts ? parts[0] : null, false, i === 0 ? s : null));
        const vd = d('vowel') * s.durMul, v0 = t;
        if (!parts) push(vd, { F: CONS.m.loc, av: 0.62 * amp, nas: 1, mouth: 0, fry: s.fryAmt, nuc: 1 });
        else {
          const open = f => Math.min(1, clamp((f[0] - 260) / 480, 0.15, 1) * Math.min(1, amp) * (1 + emo.tense * 0.15));
          if (parts.length === 1) push(vd, { F: parts[0], av: amp, mouth: open(parts[0]), fry: s.fryAmt, ah: s.laugh ? 0.25 : 0, nuc: 1 });
          else { push(vd * 0.55, { F: parts[0], av: amp, mouth: open(parts[0]) }); push(vd * 0.45, { F: parts[1], av: amp * 0.9, mouth: open(parts[1]), fry: s.fryAmt }); }
        }
        pts.push([v0 + vd * 0.12, s.pitch[0]], [v0 + vd * 0.5, s.pitch[1]], [t - vd * 0.08, s.pitch[2]]);
        s.coda.forEach(k => consonant(k, amp * 0.85, null, true, s));
      });
      const last = pi === phrases.length - 1;
      push(last ? 0.06 : { ',': 0.13, '…': 0.38 }[ph.end] || 0.27, { F: curF, mouth: -1 });
    });
    return { segs, pts, dur: t };
  }

  // ------------------------------------------------------------- the synthesiser
  // Klatt-style: KLGLOTT88 glottal pulse (with jitter, shimmer, drift, tremor and creak) + breath noise →
  // nasal pole/zero → five cascade formant resonators; frication noise through a parallel band-pass.
  function resonator() { return { a: 1, b: 0, c: 0, y1: 0, y2: 0 }; }
  function setRes(r, f, bw) { const T = 1 / SR; r.c = -Math.exp(-2 * Math.PI * bw * T); r.b = 2 * Math.exp(-Math.PI * bw * T) * Math.cos(2 * Math.PI * f * T); r.a = 1 - r.b - r.c; }
  function runRes(r, x) { const y = r.a * x + r.b * r.y1 + r.c * r.y2; r.y2 = r.y1; r.y1 = y; return y; }
  function runAnti(r, x) { const y = (x - r.b * r.y1 - r.c * r.y2) / r.a; r.y2 = r.y1; r.y1 = x; return y; }

  function synth(voice, emo, tl, seed) {
    const { segs, pts, dur } = tl;
    const N = Math.ceil((dur + 0.05) * SR), out = new Float32Array(N);
    let x = (seed >>> 0) || 0x9e3779b9;
    const rnd = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296 * 2 - 1; };
    const breath = clamp(voice.breath + emo.breath, 0, 1), tense = emo.tense;
    const OQ = clamp(0.6 + 0.16 * breath - 0.14 * tense, 0.4, 0.85);
    // return phase of the glottal pulse (s): how softly the folds close. Soft = warm and breathy, quick = bright and pressed.
    const Ta = clamp(0.00006 + 0.00022 * breath - 0.00004 * tense, 0.00002, 0.0005);
    const ta = Math.exp(-1 / (SR * Ta));
    const tremor = Math.max(voice.tremor, emo.tremor);
    const bwMul = 1.15 + 0.4 * breath - 0.12 * tense + (voice.fs - 1) * 0.8;
    const F1up = 1 + 0.07 * Math.max(0, tense);
    const fs = voice.fs, BW = [75, 95, 150, 230, 320];
    const R = [0, 1, 2, 3, 4].map(resonator), R1open = resonator(), np = resonator(), nz = resonator(), bp = { b0: 0, a1: 0, a2: 0, x1: 0, x2: 0, y1: 0, y2: 0 };
    const FR = 64, kF = 1 - Math.exp(-FR / SR / 0.034);
    let F = segs[0].F.slice(), av = 0, ah = 0, af = 0, ff = 3000, fbw = 2000, nas = 0, fry = 0;
    let si = 0, pi = 0, tp = 0, T0 = 1 / voice.f0, Te = OQ * T0, shim = 1, ret = 0, dc1 = 0, dcy = 0, nlp = 0, pre = 0;
    let drift = 0, driftV = 0, flut = 0, fFl = [0, 0, 0];
    for (let n0 = 0; n0 < N; n0 += FR) {
      const t = n0 / SR;
      while (si < segs.length - 1 && t >= segs[si].t1) si++;
      const s = t < segs[segs.length - 1].t1 ? segs[si] : { F: segs[segs.length - 1].F, av: 0, ah: 0, af: 0, ff, fbw, nas: 0, fry: 0, sharp: 1 };
      const kA = 1 - Math.exp(-FR / SR / (s.sharp ? 0.008 : 0.02));
      // vowels swell and fade rather than sitting at one level
      const u = s.nuc ? clamp((t - s.t0) / (s.t1 - s.t0), 0, 1) : 0.5;
      const swell = s.nuc ? 0.68 + 0.32 * Math.sin(Math.PI * Math.pow(u, 0.7)) : 1;
      for (let j = 0; j < 3; j++) { fFl[j] += (rnd() * 0.012 - fFl[j]) * 0.08; F[j] += (s.F[j] * (1 + fFl[j]) - F[j]) * kF; }
      av += (s.av * swell - av) * kA; ah += (s.ah - ah) * kA; af += (s.af - af) * kA;
      ff += (s.ff - ff) * 0.5; fbw += (s.fbw - fbw) * 0.5; nas += (s.nas - nas) * kF * 1.5; fry += (s.fry - fry) * kF * 0.4;
      // pitch: interpolate the points, then a slow random wander (never a regular wobble), flutter and tremor
      while (pi < pts.length - 1 && pts[pi + 1][0] <= t) pi++;
      let semis;
      if (!pts.length) semis = 0;
      else if (t <= pts[0][0]) semis = pts[0][1];
      else if (pi >= pts.length - 1) semis = pts[pts.length - 1][1];
      else { const [ta0, sa] = pts[pi], [tb, sb] = pts[pi + 1], w = (t - ta0) / Math.max(1e-4, tb - ta0); semis = sa + (sb - sa) * (0.5 - 0.5 * Math.cos(Math.PI * clamp(w, 0, 1))); }
      driftV += rnd() * 0.0009 - driftV * 0.04 - drift * 0.004; drift += driftV;
      flut += (rnd() * 0.004 - flut) * 0.3;
      const trem = Math.sin(2 * Math.PI * 5.3 * t);
      const f0 = voice.f0 * st(semis) * (1 + drift + flut + tremor * 0.028 * trem);
      const avT = av * (1 + tremor * 0.14 * trem) * clamp(1 + semis * 0.025, 0.7, 1.35);
      // vocal tract for this frame; F1 is damped more while the glottis is open (as in a real throat)
      const f1 = F[0] * fs * F1up * (1 - nas * 0.1), b1 = (BW[0] + nas * 90) * bwMul;
      setRes(R[0], f1, b1); setRes(R1open, f1 * 1.03, b1 + 90 + 120 * breath);
      setRes(R[1], F[1] * fs, (BW[1] + nas * 140) * bwMul);
      setRes(R[2], F[2] * fs, (BW[2] + nas * 160) * bwMul);
      setRes(R[3], 3350 * fs, BW[3] * bwMul);
      setRes(R[4], Math.min(4300 * fs, SR * 0.45), BW[4] * bwMul);
      setRes(np, 280, 100); setRes(nz, 280 + 220 * nas, 100);
      { const w0 = 2 * Math.PI * Math.min(ff * Math.sqrt(fs), SR * 0.44) / SR, al = Math.sin(w0) / (2 * Math.max(0.5, ff / fbw)), a0 = 1 + al; bp.b0 = al / a0; bp.a1 = -2 * Math.cos(w0) / a0; bp.a2 = (1 - al) / a0; }
      const r0 = R[0], ra = r0.a, rb = r0.b, rc = r0.c, oa = R1open.a, ob = R1open.b, oc = R1open.c;
      const nEnd = Math.min(N, n0 + FR);
      for (let n = n0; n < nEnd; n++) {
        // glottal source: open phase (KLGLOTT88 flow derivative), then an exponential return phase (LF model)
        tp += 1 / SR;
        if (tp >= T0) {
          tp -= T0;
          const irregular = fry > 0.05 ? fry * (0.4 + 0.9 * Math.abs(rnd())) : 0;
          T0 = 1 / (f0 * (1 + rnd() * voice.jitter * 1.7)) * (1 + irregular);
          Te = OQ * T0 * (1 - 0.25 * fry);
          shim = (1 + rnd() * voice.shimmer) * (1 - fry * 0.45 * Math.abs(rnd()));
        }
        const tau = tp / Te, open = tau < 1;
        let pulse;
        if (open) { pulse = (2 * tau - 3 * tau * tau) * shim * avT; ret = pulse; } else { ret *= ta; pulse = ret; }
        nlp += (rnd() - nlp) * 0.55;   // breath noise, a little softened
        const asp = nlp * (ah * 1.1 + avT * breath * (open ? 0.6 : 0.2));
        let y = runAnti(nz, runRes(np, pulse * 2.4 + asp * 0.4));
        for (let k = 4; k >= 1; k--) y = runRes(R[k], y);
        if (open) { r0.a = oa; r0.b = ob; r0.c = oc; } else { r0.a = ra; r0.b = rb; r0.c = rc; }
        y = runRes(r0, y);
        pre += (y - pre) * 0.18; y += 0.6 * (y - pre);   // gentle high shelf above ~1 kHz: presence, like lip radiation
        // frication
        const fn = rnd() * af;
        const fy = bp.b0 * (fn - bp.x2) - bp.a1 * bp.y1 - bp.a2 * bp.y2;
        bp.x2 = bp.x1; bp.x1 = fn; bp.y2 = bp.y1; bp.y1 = fy;
        const sOut = y * 0.11 + fy * 0.55;
        // DC blocker
        dcy = sOut - dc1 + 0.995 * dcy; dc1 = sOut;
        out[n] = dcy;
      }
    }
    // loudness: normalise the sounding part, then a soft limiter and short fades
    let sum = 0, cnt = 0;
    for (const s of segs) if (s.av > 0.2) for (let n = Math.floor(s.t0 * SR); n < Math.min(N, s.t1 * SR); n++) { sum += out[n] * out[n]; cnt++; }
    const rms = Math.sqrt(sum / Math.max(1, cnt)) || 1, g = 0.2 / rms;
    for (let n = 0; n < N; n++) out[n] = Math.tanh(out[n] * g * 1.1) * 0.85;
    const fin = Math.floor(SR * 0.03), fout = Math.floor(SR * 0.08);
    for (let n = 0; n < fin && n < N; n++) out[n] *= n / fin;
    for (let n = 0; n < fout && n < N; n++) out[N - 1 - n] *= n / fout;
    return out;
  }

  // ------------------------------------------------------------- prosody engine (default)
  // A second, smoother voice. It reads the very same heritage timeline as the classic engine, so every
  // invented language, accent, inherited pitch and mood is unchanged — only the sound is different:
  //   • a harmonic glottal source with a natural spectral roll-off (soft saw, not a hard pulse),
  //   • formants gliding per sample instead of snapping between frames, so words link and breathe,
  //   • a brightness that follows each segment (vowels open the voice, hisses and stops darken it),
  //   • aspiration mixed into the voiced path and a softer spectral slope, so it mumbles like a person.
  const GLOTT = new Map();
  /** One cycle of a soft glottal saw: harmonics to 1/k^p, peak-normalised. Cached per slope. */
  function glottalWave(p) {
    const key = (Math.round(p * 20) / 20).toFixed(2);
    let w = GLOTT.get(key);
    if (w) return w;
    const L = 2048, K = 42;
    w = new Float32Array(L);
    let peak = 0, mean = 0;
    for (let i = 0; i < L; i++) {
      let v = 0;
      for (let k = 1; k <= K; k++) v += Math.sin((2 * Math.PI * k * i) / L) / Math.pow(k, +key);
      w[i] = v; if (Math.abs(v) > peak) peak = Math.abs(v);
    }
    const g = 1 / (peak || 1);
    for (let i = 0; i < L; i++) mean += w[i];
    mean = (mean / L) * g;
    for (let i = 0; i < L; i++) w[i] = w[i] * g - mean;
    GLOTT.set(key, w);
    return w;
  }

  function synthProsody(voice, emo, tl, seed) {
    const { segs, pts, dur } = tl;
    const N = Math.ceil((dur + 0.06) * SR), out = new Float32Array(N);
    let x = (seed >>> 0) || 0x9e3779b9;
    const rnd = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) / 4294967296) * 2 - 1; };
    const col = voice.color || { f0: 0, fs: 1, accent: 0.5, tilt: 0 };
    const breath = clamp(voice.breath + emo.breath, 0, 1), tense = emo.tense;
    const tremor = Math.max(voice.tremor, emo.tremor);
    const fs = voice.fs * col.fs;
    // the source spectrum: a soft saw that rolls off sooner for breathy voices, later for pressed ones
    const pExp = clamp(1.72 + breath * 0.5 - tense * 0.4 + col.tilt * 0.3, 1.4, 2.7);
    const WAVE = glottalWave(pExp), L = WAVE.length;
    const f0Base = voice.f0 * st(col.f0);
    const bwMul = 1.12 + 0.42 * breath - 0.1 * tense + (voice.fs - 1) * 0.8;
    const F1up = 1 + 0.07 * Math.max(0, tense);
    const BW = [75, 95, 150, 230, 320];
    const R = [0, 1, 2, 3, 4].map(resonator), R1open = resonator(), np = resonator(), nz = resonator(),
      bp = { b0: 0, a1: 0, a2: 0, x1: 0, x2: 0, y1: 0, y2: 0 };
    const FR = 16, kF = 1 - Math.exp(-FR / SR / 0.03);
    let F = segs[0].F.slice(), av = 0, ah = 0, af = 0, ff = 3000, fbw = 2000, nas = 0, fry = 0, bright = 0;
    let si = 0, pi = 0, T0 = 1 / f0Base, shim = 1, phase = 0, cyc = 1, nlp = 0, dc1 = 0, dcy = 0, pre = 0, lpY = 0, lpK = 0.6;
    let drift = 0, driftV = 0, flut = 0, fFl = [0, 0, 0];
    for (let n0 = 0; n0 < N; n0 += FR) {
      const t = n0 / SR;
      while (si < segs.length - 1 && t >= segs[si].t1) si++;
      const s = t < segs[segs.length - 1].t1 ? segs[si] : { F: segs[segs.length - 1].F, av: 0, ah: 0, af: 0, ff, fbw, nas: 0, fry: 0, sharp: 1 };
      const kA = 1 - Math.exp(-FR / SR / (s.sharp ? 0.008 : 0.022));
      const u = s.nuc ? clamp((t - s.t0) / Math.max(1e-4, s.t1 - s.t0), 0, 1) : 0.5;
      const swell = s.nuc ? 0.7 + 0.3 * Math.sin(Math.PI * Math.pow(u, 0.7)) : 1;
      for (let j = 0; j < 3; j++) { fFl[j] += (rnd() * 0.012 - fFl[j]) * 0.08; F[j] += (s.F[j] * (1 + fFl[j]) - F[j]) * kF; }
      av += (s.av * swell - av) * kA; ah += (s.ah - ah) * kA; af += (s.af - af) * kA;
      ff += (s.ff - ff) * 0.5; fbw += (s.fbw - fbw) * 0.5; nas += (s.nas - nas) * kF * 1.5; fry += (s.fry - fry) * kF * 0.4;
      bright += ((s.av * 0.7 + s.af * 2 + (s.sharp ? 0.5 : 0)) - bright) * kA;
      // pitch: interpolate the points, then a slow random wander, flutter and tremor — never a regular wobble
      while (pi < pts.length - 1 && pts[pi + 1][0] <= t) pi++;
      let semis;
      if (!pts.length) semis = 0;
      else if (t <= pts[0][0]) semis = pts[0][1];
      else if (pi >= pts.length - 1) semis = pts[pts.length - 1][1];
      else { const [ta0, sa] = pts[pi], [tb, sb] = pts[pi + 1], w = (t - ta0) / Math.max(1e-4, tb - ta0); semis = sa + (sb - sa) * (0.5 - 0.5 * Math.cos(Math.PI * clamp(w, 0, 1))); }
      driftV += rnd() * 0.0009 - driftV * 0.04 - drift * 0.004; drift += driftV;
      flut += (rnd() * 0.004 - flut) * 0.3;
      const trem = Math.sin(2 * Math.PI * 5.3 * t);
      const f0 = f0Base * st(semis) * (1 + drift + flut + tremor * 0.028 * trem);
      const avT = av * (1 + tremor * 0.14 * trem) * clamp(1 + semis * 0.025, 0.7, 1.35);
      const f1 = F[0] * fs * F1up * (1 - nas * 0.1), b1 = (BW[0] + nas * 90) * bwMul;
      setRes(R[0], f1, b1); setRes(R1open, f1 * 1.03, b1 + 90 + 120 * breath);
      setRes(R[1], F[1] * fs, (BW[1] + nas * 140) * bwMul);
      setRes(R[2], F[2] * fs, (BW[2] + nas * 160) * bwMul);
      setRes(R[3], 3350 * fs, BW[3] * bwMul);
      setRes(R[4], Math.min(4300 * fs, SR * 0.45), BW[4] * bwMul);
      setRes(np, 280, 100); setRes(nz, 280 + 220 * nas, 100);
      { const w0 = 2 * Math.PI * Math.min(ff * Math.sqrt(fs), SR * 0.44) / SR, al = Math.sin(w0) / (2 * Math.max(0.5, ff / fbw)), a0 = 1 + al; bp.b0 = al / a0; bp.a1 = -2 * Math.cos(w0) / a0; bp.a2 = (1 - al) / a0; }
      // brightness: the voice opens on vowels and stressed segments, closes on hisses and stops
      const lpFc = clamp(4900 + bright * 2600 - breath * 1200 - Math.max(0, -tense) * 400, 1600, 9500);
      lpK = 1 - Math.exp(-2 * Math.PI * lpFc / SR);
      const r0 = R[0], ra = r0.a, rb = r0.b, rc = r0.c, oa = R1open.a, ob = R1open.b, oc = R1open.c;
      const nEnd = Math.min(N, n0 + FR);
      for (let n = n0; n < nEnd; n++) {
        if (phase >= 1) {   // new glottal cycle: fresh jitter, shimmer, and a little creak
          phase -= 1;
          shim = (1 + rnd() * voice.shimmer) * (1 - fry * 0.45 * Math.abs(rnd()));
          cyc = 1;
          T0 = 1 / (f0 * (1 + rnd() * voice.jitter * 1.7));
          if (fry > 0.05 && rnd() * 0.5 + 0.5 < fry * 0.5) cyc = 1.5;
        }
        phase += (1 / T0) / SR / cyc;
        const open = phase % 1 < clamp(0.55 + 0.2 * breath - 0.15 * tense, 0.35, 0.8);
        const src = WAVE[(phase * L) & (L - 1)] * shim * avT;
        nlp += (rnd() - nlp) * 0.55;   // breath noise, a little softened
        const asp = nlp * (ah * (0.9 + col.accent * 0.5) + avT * breath * (open ? 0.6 : 0.2));
        let y = runAnti(nz, runRes(np, src * 2.4 + asp * 0.4));
        for (let k = 4; k >= 1; k--) y = runRes(R[k], y);
        if (open) { r0.a = oa; r0.b = ob; r0.c = oc; } else { r0.a = ra; r0.b = rb; r0.c = rc; }
        y = runRes(r0, y);
        pre += (y - pre) * 0.18; y += 0.8 * (y - pre);   // gentle high shelf: presence, like lip radiation
        lpY += (y - lpY) * lpK; y = lpY;
        const fn = rnd() * af * (0.8 + col.accent * 0.5);
        const fy = bp.b0 * (fn - bp.x2) - bp.a1 * bp.y1 - bp.a2 * bp.y2;
        bp.x2 = bp.x1; bp.x1 = fn; bp.y2 = bp.y1; bp.y1 = fy;
        const sOut = y * 0.12 + fy * 0.55;
        dcy = sOut - dc1 + 0.995 * dcy; dc1 = sOut;
        out[n] = dcy;
      }
    }
    // loudness: normalise the sounding part, then a soft limiter and short fades
    let sum = 0, cnt = 0;
    for (const s of segs) if (s.av > 0.2) for (let n = Math.floor(s.t0 * SR); n < Math.min(N, s.t1 * SR); n++) { sum += out[n] * out[n]; cnt++; }
    const rms = Math.sqrt(sum / Math.max(1, cnt)) || 1, g = 0.2 / rms;
    for (let n = 0; n < N; n++) out[n] = Math.tanh(out[n] * g * 1.05) * 0.85;
    const fin = Math.floor(SR * 0.03), fout = Math.floor(SR * 0.08);
    for (let n = 0; n < fin && n < N; n++) out[n] *= n / fin;
    for (let n = 0; n < fout && n < N; n++) out[N - 1 - n] *= n / fout;
    return out;
  }

  // ------------------------------------------------------------- public: render / babble
  const cache = new Map();
  /** Which synth renders a line: 'synth' (prosody, the default) or 'classic' (the original engine). */
  const engineOf = opts => (opts.engine === 'classic' || (!opts.engine && mode === 'classic')) ? 'classic' : 'synth';

  /** Render a line for genome g. opts: expr, speed, target (seconds to aim for, ±15%), engine. */
  function render(g, text, opts = {}) {
    if (!text || !/[\p{L}\p{N}]/u.test(text)) return null;
    const engine = engineOf(opts);
    const voice = voiceOf(g), emo = emotion(opts.expr || g.expression);
    const key = [engine, JSON.stringify(voice, (k, v) => (v && v.id && v.cons ? v.id : v)), text, opts.expr || g.expression, opts.speed || 1, opts.target || 0].join('|');
    if (cache.has(key)) { const c = cache.get(key); cache.delete(key); cache.set(key, c); return c; }
    const phrases = syllablesOf(voice, phrasesOf(text), emo);
    const tl = timelineOf(voice, phrases, emo, opts.speed);
    if (opts.target) {
      const k = clamp(opts.target / tl.dur, 0.88, 1.15);
      for (const s of tl.segs) { s.t0 *= k; s.t1 *= k; }
      for (const p of tl.pts) p[0] *= k;
      tl.dur *= k;
    }
    const pcm = engine === 'classic' ? synth(voice, emo, tl, PM.hashString(voice.seed + '|' + text)) : synthProsody(voice, emo, tl, PM.hashString(voice.seed + '|' + text));
    const mouth = [];
    for (const s of tl.segs) if (!mouth.length || mouth[mouth.length - 1][1] !== s.mouth) mouth.push([s.t0, s.mouth]);
    const res = { pcm, sampleRate: SR, duration: tl.dur, mouth, loud: emo.loud };
    cache.set(key, res);
    if (cache.size > 40) cache.delete(cache.keys().next().value);
    return res;
  }

  const SPELL = { S: 'sh', Z: 'zh', N: 'ng', T: 't', D: 'd', R: 'r', x: 'kh', '?': "'", '@': 'e', E: 'e', I: 'i', O: 'o', U: 'u', ae: 'a', ii: 'y', ue: 'ü', oe: 'ö', hum: 'mm' };
  /** The invented words for a line, as text (handy for subtitles, or just curiosity). */
  function babble(g, text) {
    const voice = voiceOf(g);
    return phrasesOf(text || '').map(ph => {
      const words = ph.words.map(w => {
        const ij = interjection(w.key);
        if (ij) return w.key;
        const lang = voice.langB && hashFrac(w.key) < voice.mix ? voice.langB : voice.langA;
        const word = makeWord(lang, w.key, englishSyllables(w.key));
        const s = word.syls.map(x => x.onset.map(k => SPELL[k] || k).join('') + (SPELL[x.v] || x.v) + (x.long ? (SPELL[x.v] || x.v).slice(-1) : '') + x.coda.map(k => SPELL[k] || k).join('')).join('');
        return w.caps ? s.toUpperCase() : s;
      });
      return words.join(' ') + (ph.end === '…' ? '…' : ph.end);
    }).join(' ');
  }

  // ------------------------------------------------------------- playback
  // Three engines speak the same invented words:
  //   'synth'   — the prosody synthesiser (default): a harmonic glottal source and gliding formants,
  //               heritage colours on top. Every voice its own, works offline, records into videos.
  //   'classic' — the original formant synthesiser, kept so you can switch back to exactly how it was.
  //   'device'  — the browser's / system's speech voices (often natural, recorded-sounding ones), picked per
  //               heritage and presentation, with pitch and speed from the Voice genes. Varies by device.
  const MODES = [['synth', 'Babble synth'], ['classic', 'Classic synth'], ['device', 'Device voices'], ['off', 'Off']];
  let mode = 'synth';
  // 'synth' was the only synth engine before, so an old saved value now selects the improved default.
  try { const m = localStorage.getItem('portrait-atelier.voices'); if (m === 'off' || m === 'device' || m === 'synth' || m === 'classic') mode = m; } catch (e) { /* storage blocked */ }
  let ctx = null, master = null;
  const playing = new Set();

  function roomIR(ac) {
    const len = Math.floor(ac.sampleRate * 0.6), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch); let lp = 0;
      for (let i = 0; i < len; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.3; d[i] = lp * Math.exp(-i / (ac.sampleRate * 0.12)) * Math.min(1, i / (ac.sampleRate * 0.012)); }
    }
    return ir;
  }
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0.9;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = 0.5;
      const verb = ctx.createConvolver(); verb.buffer = roomIR(ctx);
      const wet = ctx.createGain(); wet.gain.value = 0.3;
      master.connect(lp); lp.connect(ctx.destination); lp.connect(verb); verb.connect(wet); wet.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  // browsers only allow sound after a click or key press: wake the audio on the first one
  let gestureAt = -1e9;
  if (typeof document !== 'undefined') for (const ev of ['pointerdown', 'keydown', 'touchstart']) document.addEventListener(ev, () => { gestureAt = performance.now(); if (mode === 'synth' || mode === 'classic' || ctx) audio(); }, { capture: true, passive: true });

  function saySynth(g, text, opts) {
    const ac = audio();
    // never queue lines up while audio is still locked (they'd all burst out on the next click),
    // but a click that is waking it right now is fine
    if (!ac || (ac.state !== 'running' && performance.now() - gestureAt > 1000)) return null;
    const r = render(g, text, opts);
    if (!r) return null;
    const buf = ac.createBuffer(1, r.pcm.length, SR);
    buf.getChannelData(0).set(r.pcm);
    const src = ac.createBufferSource(); src.buffer = buf;
    const gain = ac.createGain(); gain.gain.value = 0.55 * Math.min(1.4, r.loud);
    src.connect(gain); gain.connect(master);
    src.start(ac.currentTime + 0.015);
    const h = {
      duration: r.duration, mouth: r.mouth,
      stop() { if (!playing.has(h)) return; playing.delete(h); try { gain.gain.setTargetAtTime(0, ac.currentTime, 0.012); src.stop(ac.currentTime + 0.06); } catch (e) { /* already stopped */ } },
    };
    src.onended = () => playing.delete(h);
    playing.add(h);
    return h;
  }

  // ---- device voices
  // Languages to look for, per invented language. Only Latin-script voices are used, since the words are
  // written in Latin letters; Spanish and Italian voices read made-up words most naturally, so they're the fallback.
  const TTS = {
    american: ['en-US'], british: ['en-GB'], 'african-american': ['en-US'], 'black-british': ['en-GB'], caribbean: ['en-JM', 'en-TT', 'en-GB'],
    'northern-european': ['nl', 'de', 'sv', 'nb', 'da', 'en-GB'], 'west-african': ['yo', 'ha', 'ig', 'en-NG', 'en-GH', 'sw', 'en-ZA'],
    'east-african': ['sw', 'en-KE', 'en-TZ', 'so'], 'north-african': ['fr-MA', 'fr', 'es'], 'middle-eastern': ['tr', 'es'],
    'south-asian': ['en-IN', 'it'], 'east-asian': ['id', 'ms', 'it'], 'southeast-asian': ['fil', 'id', 'ms', 'vi'],
    'central-asian': ['tr', 'uz', 'kk', 'pl'], 'indigenous-north-america': ['es-MX', 'en-US'], 'indigenous-latin-america': ['es-MX', 'es-PE', 'es'],
    'latin-american': ['es-MX', 'es-US', 'es', 'pt-BR'], 'southern-european': ['it', 'es-ES', 'pt-PT', 'pt'], 'pacific-islander': ['mi', 'en-NZ', 'it'],
    'aboriginal-australian': ['en-AU'], 'eastern-european': ['pl', 'cs', 'sk', 'hr', 'ro'], romani: ['ro', 'hu', 'sk', 'es'],
  };
  const LATIN = /^(en|es|it|pt|fr|de|nl|sv|nb|no|da|fi|sw|so|id|ms|fil|tl|vi|tr|uz|kk|pl|cs|sk|ro|hu|hr|sl|yo|ha|ig|zu|af|ca|eu|gl|et|lv|lt|is|ga|cy|mi)\b/i;
  const FEM = /female|woman|zira|aria|jenny|hazel|susan|samantha|victoria|karen|moira|tessa|fiona|helena|laura|elsa|paulina|m[oó]nica|luciana|alice|am[eé]lie|anna|sara|catherine|natasha|libby|sonia|ava|allison|michelle|emma|clara|elena|lucia|dalia|denise|elvira|isabella|irina|zosia|ioana|nora|hedda|katja|sabina|kalpana|heera|swara|neerja|salma|paola|francisca|vera|zuzana|jacqueline|camila|ximena|beatriz|brenda|ellie|maisie|molly|aigul|zuri|ezinne|rehema|amina/i;
  const MASC = /\bmale|david|mark|guy|george|daniel|alex|fred|thomas|diego|jorge|juan|pablo|luca|ravi|hemant|pavel|ryan|christopher|eric|brian|andrew|william|liam|conrad|henri|antonio|dariusz|filip|stefan|ivan|rishi|prabhat|madhur|connor|lukas|tony|jason|roger|abdullah|chilemba|daudi|elimu|duarte|giuseppe|gerardo|alvaro|arnaud|matej|lewis|oliver|reed|rocko|eddy|grandpa|albert|ralph|bruce|junior/i;
  // Google's voices are female unless their name says otherwise
  const voiceSex = v => (MASC.test(v.name) ? 'masc' : FEM.test(v.name) || /google/i.test(v.name) ? 'fem' : null);
  let voiceList = [];
  function loadVoices() { try { voiceList = window.speechSynthesis.getVoices().filter(v => LATIN.test(v.lang)); } catch (e) { voiceList = []; } }
  if (typeof window !== 'undefined' && window.speechSynthesis) { loadVoices(); if (window.speechSynthesis.addEventListener) window.speechSynthesis.addEventListener('voiceschanged', loadVoices); }

  /** The device voice for genome g: matching language, matching presentation, the nicest-sounding ones first. */
  function deviceVoice(g) {
    if (!voiceList.length) loadVoices();
    if (!voiceList.length) return null;
    const lang = langOf(g.mixWith && g.mix > 0.5 ? g.mixWith : g.archetype);
    const prefs = (TTS[lang.id] || []).concat(['es', 'it', 'en']);
    const nice = v => /natural|neural|online|premium|enhanced|google/i.test(v.name);
    const right = v => g.gender === 'andro' || voiceSex(v) === g.gender;
    const inLang = p => { const re = new RegExp('^' + p + '(?:$|[-_])', 'i'); return voiceList.filter(v => re.test(v.lang)); };
    const pick = list => list[PM.hashString(String(g.seed || 1)) % list.length];
    // best: a natural voice of the right presentation in a fitting language; then any of the right presentation;
    // last, any voice in the first fitting language (pitched toward the right register in sayDevice)
    for (const test of [v => nice(v) && right(v), right]) for (const p of prefs) { const l = inLang(p).filter(test); if (l.length) return pick(l); }
    for (const p of prefs) { const l = inLang(p); if (l.length) return pick(l.filter(nice).length ? l.filter(nice) : l); }
    return null;
  }
  function sayDevice(g, text, opts) {
    const syn = window.speechSynthesis;
    if (!syn || typeof SpeechSynthesisUtterance === 'undefined') return null;
    const words = babble(g, text).toLowerCase();   // lower case, or some voices spell CAPS out letter by letter
    if (!/\p{L}/u.test(words)) return null;
    const v = voiceOf(g), emo = emotion(opts.expr || g.expression), dv = deviceVoice(g);
    const u = new SpeechSynthesisUtterance(words);
    if (dv) { u.voice = dv; u.lang = dv.lang; }
    // pitch: this person's place in their register, their mood, and a nudge when the voice is the other presentation
    const sex = dv ? voiceSex(dv) : null, young = clamp((0.17 - (g.age != null ? g.age : 0.25)) / 0.13, 0, 1);
    let pitch = 1 + (gene(g, 'voicePitch') - 0.5) * 0.5 + (gene(g, 'voiceTimbre') - 0.5) * 0.15 + emo.f0 * 0.035 + young * 0.35;
    if (sex === 'fem' && g.gender === 'masc') pitch *= 0.62;
    else if (sex === 'masc' && g.gender === 'fem') pitch *= 1.45;
    else if (g.gender === 'andro') pitch *= sex === 'masc' ? 1.15 : sex === 'fem' ? 0.88 : 1;
    u.pitch = clamp(pitch, 0.1, 2);
    u.rate = clamp(v.rate * emo.rate * clamp(opts.speed || 1, 0.6, 1.6) * 1.08, 0.5, 2);
    u.volume = clamp(0.75 * emo.loud, 0.2, 1);
    syn.cancel();   // one voice at a time on most devices; the newest line wins
    const nSyl = (words.match(/[aeiouyüö]+/g) || ['a']).length;
    const h = { duration: nSyl / (4.6 * u.rate) + 0.25, mouth: null, ended: false, stop() { if (!h.ended) { h.ended = true; playing.delete(h); syn.cancel(); } } };
    u.onend = u.onerror = () => { h.ended = true; playing.delete(h); };
    playing.add(h);
    syn.speak(u);
    return h;
  }

  /** Speak a line now. Returns { duration, mouth, stop() } or null when off / no audio yet.
   *  opts: expr, speed, target, force (play even when voices are off), engine ('synth' | 'classic' | 'device'). */
  function say(g, text, opts = {}) {
    const engine = opts.engine || (mode === 'off' ? (opts.force ? 'synth' : null) : mode);
    if (!engine || !text) return null;
    g = PM.complete ? PM.complete(g) : g;
    return engine === 'device' ? sayDevice(g, text, opts) : saySynth(g, text, opts);
  }
  function stopAll() { for (const h of [...playing]) h.stop(); }
  if (typeof window !== 'undefined') window.addEventListener('hashchange', stopAll);

  PM.voice = {
    say, render, babble, voiceOf, deviceVoice, stopAll, languages: LANGS, emotions: EMO, genes: GENES, modes: MODES,
    engines: ['synth', 'classic'],
    get mode() { return mode; },
    set mode(m) {
      mode = MODES.some(x => x[0] === m) ? m : 'synth';
      try { localStorage.setItem('portrait-atelier.voices', mode); } catch (e) { /* storage blocked */ }
      stopAll();
      if (mode === 'synth' || mode === 'classic') audio();
      document.dispatchEvent(new CustomEvent('voices-mode'));
    },
    get enabled() { return mode !== 'off'; },
    set enabled(v) { this.mode = v ? (mode === 'off' ? 'synth' : mode) : 'off'; },
  };

  // ------------------------------------------------------------- genes: rolled, lockable, inherited
  // They sit just before "Ink & Paper", so they get a Voice card in the Atelier and PM.breed mixes them.
  const at = PM.controls.findIndex(c => c.group === 'Ink & Paper');
  PM.controls.splice(at < 0 ? PM.controls.length : at, 0, ...GENES.map(x => ({ id: x.id, type: 'knob', group: 'Voice', label: x.label, hint: x.hint, min: 0, max: 1, step: 0.01, def: 0.5, roll: [0.08, 0.92] })));
  // Genomes saved before voices existed get a voice from their seed rather than all sounding the same.
  const complete = PM.complete;
  PM.complete = function (g) { const out = complete(g); for (const x of GENES) if (!g || typeof g[x.id] !== 'number') out[x.id] = seedGene(out, x.id); return out; };

  // ------------------------------------------------------------- actors talk out loud
  if (PM.Actor) {
    const A = PM.Actor.prototype, say0 = A.say, update0 = A.update, destroy0 = A.destroy;
    A.say = function (text, speed) {
      say0.call(this, text, speed);
      if (this.voice) this.voice.stop();
      this.voice = say(this.g, text, { expr: this.expr, speed, target: this.talk.left });
      if (this.voice) { this.talk.left = this.voice.duration + 0.05; this.talk.t = 0; this.lineT = Math.max(this.lineT, this.talk.left + 0.6); }
    };
    A.update = function (dt, speed) {
      const v = this.voice, tk = this.talk;
      if (v && tk && !v.mouth) {
        // a device voice: no syllable timings, so keep flapping until it finishes (or a while past its estimate)
        tk.t += dt;
        if (v.ended) tk.left = Math.min(tk.left, 0);
        else if (tk.left < 0.1 && tk.t < v.duration * 2.5) tk.left = 0.1;
      } else if (v && tk) {
        tk.t += dt;
        let open = -1;
        for (const [t0, o] of v.mouth) { if (t0 > tk.t) break; open = o; }
        this.t.mouthOpen = open < 0 ? this.baseMouth : Math.max(this.baseMouth * 0.4, open);
        tk.syl = 1e9;   // the syllables drive the mouth, not random flaps
      }
      update0.call(this, dt, speed);
      if (v && !this.talk) this.voice = null;
    };
    A.destroy = function () { if (this.voice) this.voice.stop(); this.voice = null; destroy0.call(this); };
  }

  // ------------------------------------------------------------- UI
  const SAMPLES = {
    neutral: ['Hello there! Lovely to meet you.', 'Have you eaten yet?', 'Let me tell you a story…'],
    happy: ['Ha! That’s wonderful.', 'Lovely weather today, isn’t it?'], laughing: ['Ha ha ha! Stop it!'],
    sad: ['I just missed you, that’s all.', 'Oh… that’s a shame.'], crying: ['I’m so sorry!'],
    angry: ['You said you’d be here at SIX.'], rage: ['THE BUS IS ALWAYS LATE!'], scared: ['Something moved in the garden!'],
    surprised: ['Wait — is that CAKE?!'], thinking: ['Hmm… I’m not so sure.'], smug: ['Well, well, well…'],
    flirty: ['Buy me a new one and we’re even.'], smitten: ['You’re the best.'], embarrassed: ['I… only wanted one slice.'],
  };
  function sample(g) { const list = SAMPLES[g.expression] || SAMPLES.neutral; return list[Math.floor(Math.random() * list.length)]; }

  /** <label>Voices <select>Babble synth | Device voices | Off</select></label>, kept in sync everywhere. */
  function modePicker(id) {
    const lab = document.createElement('label'); lab.className = 'voice-mode';
    lab.title = 'Babble synth (default): the prosody engine — every voice made here, works offline and in recordings. Classic synth: the original engine, if you prefer its sound. Device voices: your system’s speech voices reading the same invented words — often more natural, varies by device.';
    lab.append('Voices ');
    const sel = document.createElement('select'); sel.id = id;
    for (const [v, l] of MODES) { const o = document.createElement('option'); o.value = v; o.textContent = l; sel.appendChild(o); }
    sel.value = mode;
    sel.onchange = () => { PM.voice.mode = sel.value; if (mode !== 'off') { const g = PM.app && PM.app.current(); if (g && id === 'atelier-voices') say(g, sample(g)); } };
    document.addEventListener('voices-mode', () => { sel.value = mode; });
    lab.appendChild(sel);
    return lab;
  }

  function boot() {
    // a Voices picker beside "Speech bubbles" in the Animator
    const bubbles = document.querySelector('#anim-bubbles');
    if (bubbles && !document.querySelector('#anim-voices')) bubbles.closest('.anim-row').appendChild(modePicker('anim-voices'));
    // "Hear" on every genome's action row (Family Tree, Fiction …)
    if (PM.ui && PM.ui.actions && !PM.ui.actions.voiced) {
      const actions = PM.ui.actions;
      PM.ui.actions = function (getG, o) {
        const row = actions(getG, o);
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = 'Hear'; b.title = 'Hear this person talk';
        b.onclick = () => { const g = getG(); say(g, sample(g), { force: true }); };
        row.insertBefore(b, row.children[1] || null);
        return row;
      };
      PM.ui.actions.voiced = true;
    }
    // the Atelier's Voice card: a button to hear the voice, and it speaks when a dial is let go
    setTimeout(() => {
      const card = [...document.querySelectorAll('#controls details.card')].find(c => c.querySelector('summary') && /^Voice/.test(c.querySelector('summary').textContent));
      if (!card || card.querySelector('.voice-row')) return;
      const row = document.createElement('div'); row.className = 'voice-row';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small primary'; b.textContent = 'Hear voice';
      const note = document.createElement('span'); note.className = 'voice-note'; note.textContent = 'Heritage sets the language, presentation and age the register, expression the mood.';
      row.append(b, modePicker('atelier-voices'), note);
      card.querySelector('.card-body').prepend(row);
      const hear = () => { const g = PM.app.current(); say(g, sample(g), { force: true }); };
      b.onclick = hear;
      let timer = 0;
      const later = () => { clearTimeout(timer); timer = setTimeout(hear, 250); };
      card.querySelector('.knobs').addEventListener('pointerup', later);
      card.querySelector('.knobs').addEventListener('dblclick', later);
      card.querySelector('.knobs').addEventListener('keyup', later);
    }, 0);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot);
  }
  PM.SpeechSynth = PM.voice;
})(window.PM = window.PM || {});
