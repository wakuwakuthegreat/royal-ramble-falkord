/* Heritage archetypes — a visual vocabulary, not a verdict.
 *
 * Real populations are continuous, intermixed and internally diverse, so every table is a
 * WEIGHTED SPREAD with deliberately wide, overlapping ranges. Use "Blend with" for diaspora
 * and mixed heritage. Sacred regalia (war bonnets, moko, tatau) are intentionally absent.
 *
 * Fields (all optional — anything missing falls back to PM.ARCHETYPE_DEFAULTS):
 *   skin / hairColor / eyeColor   [[swatchKey or #hex, weight], …]   (see swatches.js)
 *   hairTexture                   {1: w, 2: w, 3: w, 4: w}           straight → coily
 *   eyeShape / nose               {id: weight}
 *   face                          {controlId: [min, max]}            overrides knob roll ranges
 *   hair / headwear / clothing / earrings / necklaces / facialHair
 *                                 {fem: {id: w}, masc: {id: w}} or a flat {id: w}
 *   patterns / trims              {patternId: w}
 *   marks                         {markId: probability 0..1}  (or split by fem/masc)
 *   palette                       [#hex, …]  clothing colours
 *   metals                        [[metalKey, w], …]
 *   notes                         codex text shown in the UI
 */
(function (PM) {
  'use strict';
  const A = (id, def) => PM.define('archetypes', id, def);

  PM.ARCHETYPE_DEFAULTS = {
    skin: [['III-1', 1]],
    hairColor: [['black', 3], ['darkBrown', 3], ['brown', 2]],
    eyeColor: [['brown', 4], ['darkBrown', 3], ['hazel', 1]],
    hairTexture: { 1: 3, 2: 3, 3: 2, 4: 1 },
    eyeShape: { almond: 4, round: 2, hooded: 2, downturned: 1, upturned: 1, 'deep-set': 1 },
    nose: { line: 3, straight: 2, button: 1, broad: 1, aquiline: 1, minimal: 1 },
    face: {},
    hair: {
      fem: { long: 2, shoulder: 2, bob: 1, 'bun-low': 1, ponytail: 1, 'bun-top': 1, fringe: 0.6 },
      masc: { 'short-crop': 3, 'side-part': 2, 'slicked-back': 1, buzz: 1, bald: 0.4 },
    },
    facialHair: { masc: { none: 4, stubble: 2, mustache: 0.8, goatee: 1, 'short-beard': 2, 'full-beard': 1.2 } },
    headwear: { none: 1 },
    clothing: {
      fem: { crew: 2, vneck: 2, scarf: 1, turtleneck: 1, bare: 0.8 },
      masc: { crew: 2, suit: 1.5, vneck: 1, turtleneck: 0.5, scarf: 0.5 },
    },
    patterns: { plain: 3, stripes: 1, dots: 1 },
    trims: { stripes: 1, 'cross-stitch': 1, zigzag: 1, beadwork: 0.5 },
    earrings: {
      fem: { none: 2, studs: 3, hoops: 2, drops: 1.5, 'big-disc': 1, geometric: 1, 'patterned-hoop': 0.7 },
      masc: { none: 10, studs: 1 },
    },
    necklaces: {
      fem: { none: 4, beads: 1.5, pearls: 1, layered: 1, medallion: 0.6, choker: 0.5 },
      masc: { none: 10, medallion: 1, beads: 0.6 },
    },
    eyewear: { none: 14, 'round-glasses': 1, 'square-glasses': 1, sunglasses: 0.6, 'cat-eye': 0.3 },
    marks: { freckles: 0.05, 'beauty-mark': 0.08, dimples: 0.1, blush: 0.12, 'brow-scar': 0.02 },
    palette: ['#16120f', '#c99a4b', '#f1e6cc', '#2f5f6e', '#a8462c'],
    metals: [['gold', 2], ['silver', 1]],
  };

  // ------------------------------------------------------------------ AFRICA
  A('west-african', {
    label: 'West African', region: 'Africa',
    notes: 'Yoruba, Igbo, Hausa-Fulani, Akan, Wolof and many more. Kente and adire cloth, gele headwraps, coral and brass, Fulani braids with cowries. Deep to rich brown skin with a wide spread — vary it.',
    skin: [['V-2', 2], ['VI-1', 3], ['VI-2', 3], ['VI-3', 2], ['VI-4', 1], ['V-1', 1]],
    hairColor: [['black', 8], ['softBlack', 3], ['darkBrown', 1]],
    eyeColor: [['darkBrown', 5], ['brown', 3]],
    hairTexture: { 4: 9, 3: 1 },
    eyeShape: { almond: 4, round: 2, upturned: 2, hooded: 1, 'deep-set': 1 },
    nose: { broad: 3, button: 2, line: 2, straight: 1, aquiline: 0.6 },
    face: { noseWidth: [0.95, 1.35], lipFull: [0.75, 1.2], cheek: [0.98, 1.08], noseBridge: [0.2, 0.6] },
    hair: {
      fem: { 'box-braids': 3, cornrows: 2, locs: 2, afro: 2, twists: 2, 'short-crop': 1, 'fulani-braids': 2, 'afro-puffs': 1, 'bun-top': 1 },
      masc: { 'short-crop': 4, 'high-top': 1.5, locs: 1.5, buzz: 2, cornrows: 1, twists: 1, bald: 0.8 },
    },
    headwear: { fem: { none: 5, gele: 3, headwrap: 3 }, masc: { none: 6, fila: 2, kufi: 2 } },
    clothing: {
      fem: { wrap: 3, boubou: 2, dashiki: 1, vneck: 1.5, crew: 1, bare: 1 },
      masc: { dashiki: 2, boubou: 2.5, crew: 1, suit: 1, kurta: 0.5 },
    },
    patterns: { kente: 3, adinkra: 2, mudcloth: 1.5, batik: 1, dots: 1, zigzag: 1, plain: 1 },
    trims: { beadwork: 1, zigzag: 1, kente: 1, 'cross-stitch': 0.5 },
    earrings: { fem: { none: 1, 'big-disc': 2, hoops: 2, studs: 2, drops: 1, geometric: 1, 'patterned-hoop': 1 }, masc: { none: 10, studs: 1 } },
    necklaces: { fem: { none: 2, beads: 2, layered: 2, cowrie: 1.5, 'bead-collar': 0.5, choker: 1 }, masc: { none: 8, beads: 1, cowrie: 0.6, medallion: 0.6 } },
    marks: { 'cheek-lines': 0.04, freckles: 0.03, blush: 0.08, dimples: 0.1, 'beauty-mark': 0.06 },
    palette: ['#2b3a67', '#d4a017', '#b5532f', '#1b6b4a', '#16120f', '#f1e6cc'],
    metals: [['gold', 2], ['brass', 2], ['coral', 1]],
  });

  A('east-african', {
    label: 'East African & Horn', region: 'Africa',
    notes: 'Habesha (Ethiopian/Eritrean), Somali, Swahili coast, Maasai and more. White netela with tilet borders, red shuka, beaded collars, kanga prints, shuruba braids. Light-brown to deep ebony skin.',
    skin: [['IV-2', 1], ['V-1', 2], ['V-2', 3], ['VI-1', 3], ['VI-2', 2], ['VI-3', 1.5], ['VI-4', 0.6]],
    hairColor: [['black', 7], ['softBlack', 3], ['darkBrown', 1.5]],
    eyeColor: [['darkBrown', 5], ['brown', 3], ['lightBrown', 0.5]],
    hairTexture: { 2: 1, 3: 3, 4: 4 },
    eyeShape: { almond: 5, round: 1, upturned: 1.5, hooded: 1, 'deep-set': 1 },
    nose: { straight: 2, line: 2, aquiline: 1.5, broad: 2, button: 1 },
    face: { faceLength: [0.98, 1.1], faceWidth: [0.88, 1.04], neckLength: [0.95, 1.5] },
    hair: {
      fem: { 'box-braids': 2, cornrows: 2, afro: 1.5, 'curly-shoulder': 2, 'bun-top': 1, long: 1, locs: 1 },
      masc: { 'short-crop': 4, buzz: 2, 'curly-shoulder': 0.5, locs: 1, bald: 0.5 },
    },
    headwear: { fem: { none: 4, hijab: 3, headscarf: 1.5, 'bead-band': 0.8 }, masc: { none: 6, kufi: 2, 'bead-band': 0.3 } },
    clothing: {
      fem: { wrap: 3, 'embroidered-tunic': 2, kurta: 1, crew: 1 },
      masc: { wrap: 2, kurta: 2, crew: 1, suit: 1 },
    },
    patterns: { plain: 2, tartan: 1.5, 'cross-stitch': 1, stripes: 1, batik: 1 },
    trims: { 'cross-stitch': 2, zigzag: 1, beadwork: 1.5 },
    earrings: { fem: { none: 2, studs: 2, hoops: 1.5, drops: 1, 'beaded-loops': 0.8 }, masc: { none: 10, 'beaded-loops': 0.4 } },
    necklaces: { fem: { none: 2, 'bead-collar': 1.5, 'cross-pendant': 1.5, beads: 1, layered: 1 }, masc: { none: 6, 'cross-pendant': 1, 'bead-collar': 0.6 } },
    palette: ['#f2ece0', '#b3262e', '#c98a2b', '#2b3a67', '#d4a531', '#2f6fb0'],
    metals: [['gold', 2], ['silver', 2]],
  });

  A('north-african', {
    label: 'North African / Maghrebi', region: 'Africa',
    notes: 'Amazigh (Berber), Tuareg, Egyptian, Nubian and more. Djellaba, kaftan, indigo tagelmust, heavy silver, henna, kohl; some mountain communities have freckles and light eyes.',
    skin: [['II-2', 1], ['III-1', 2], ['III-olive', 3], ['IV-1', 2], ['IV-olive', 2], ['V-1', 1], ['VI-1', 0.5]],
    hairColor: [['black', 4], ['darkBrown', 4], ['brown', 1.5], ['henna', 1], ['auburn', 0.4]],
    eyeColor: [['brown', 4], ['darkBrown', 3], ['hazel', 2], ['green', 1], ['lightBrown', 1]],
    hairTexture: { 1: 1, 2: 3, 3: 3, 4: 1 },
    eyeShape: { almond: 4, 'deep-set': 2, hooded: 2, round: 1 },
    nose: { aquiline: 3, straight: 2, line: 2, broad: 0.6 },
    face: { browThick: [0.9, 1.5] },
    headwear: { fem: { none: 4, hijab: 3, headscarf: 2, 'coin-band': 1 }, masc: { none: 5, turban: 1, tagelmust: 1, kufi: 1 } },
    clothing: { fem: { kurta: 2, 'embroidered-tunic': 1, crew: 1, vneck: 1 }, masc: { kurta: 3, crew: 1, suit: 1 } },
    patterns: { plain: 2, stripes: 1, ikat: 1, 'cross-stitch': 1 },
    trims: { 'cross-stitch': 1, zigzag: 1.5, beadwork: 0.5 },
    necklaces: { fem: { none: 2, coins: 2, medallion: 1, 'chunky-beads': 1, 'broad-collar': 0.4 }, masc: { none: 10, medallion: 0.6 } },
    earrings: { fem: { none: 1, hoops: 2, coins: 1.5, drops: 1, studs: 1 }, masc: { none: 10 } },
    marks: { fem: { 'chin-tattoo': 0.08, kohl: 0.3, freckles: 0.08, 'beauty-mark': 0.08 }, masc: { freckles: 0.08, kohl: 0.05 } },
    palette: ['#2b3a67', '#e0a526', '#f1e6cc', '#8a3a1f', '#2f6e6a', '#16120f'],
    metals: [['silver', 4], ['gold', 1], ['coral', 0.5]],
  });

  // ------------------------------------------------------------------ WEST & SOUTH ASIA
  A('middle-eastern', {
    label: 'Middle Eastern', region: 'West Asia',
    notes: 'Levantine, Gulf Arab, Persian, Kurdish, Assyrian and more. Tatreez cross-stitch, keffiyeh, thobe and bisht, arabesque and tile motifs, kohl. Light olive to brown; occasional red or fair hair and light eyes.',
    skin: [['II-1', 1], ['II-2', 2], ['III-1', 3], ['III-olive', 2], ['IV-1', 2], ['IV-olive', 1]],
    hairColor: [['black', 4], ['darkBrown', 4], ['brown', 2], ['auburn', 0.4], ['darkBlond', 0.3]],
    eyeColor: [['brown', 4], ['darkBrown', 3], ['hazel', 2], ['green', 0.8], ['blue', 0.3]],
    hairTexture: { 1: 2, 2: 4, 3: 3 },
    eyeShape: { almond: 4, hooded: 2, 'deep-set': 2, round: 1, upturned: 1 },
    nose: { aquiline: 3, straight: 2, line: 2, button: 0.4 },
    face: { browThick: [1.0, 1.65], lashes: [0.3, 0.7] },
    headwear: { fem: { none: 5, hijab: 3, headscarf: 1 }, masc: { none: 6, keffiyeh: 2, kufi: 1 } },
    clothing: { fem: { 'embroidered-tunic': 2, crew: 1, vneck: 1, kurta: 1.5, scarf: 1 }, masc: { kurta: 3, suit: 1.5, crew: 1 } },
    patterns: { plain: 3, 'cross-stitch': 2, paisley: 1, ikat: 0.5 },
    trims: { 'cross-stitch': 3, zigzag: 1 },
    marks: { fem: { kohl: 0.3, 'beauty-mark': 0.1 }, masc: {} },
    palette: ['#f1e6cc', '#16120f', '#d4a531', '#8e1f2a', '#2aa198', '#6b6b2e'],
    metals: [['gold', 3], ['silver', 1]],
  });

  A('south-asian', {
    label: 'South Asian', region: 'South Asia',
    notes: 'Punjabi, Tamil, Bengali, Rajasthani, Gujarati, Sinhalese, Nepali and more — extremely diverse, from fair to deep brown. Sari, salwar kameez, kurta, Sikh dastar, jhumka, bindi, jasmine in the hair; paisley, block print, bandhani.',
    skin: [['II-2', 1], ['III-1', 2], ['III-2', 2], ['IV-1', 3], ['IV-2', 3], ['V-1', 2], ['V-2', 1.5], ['VI-1', 1], ['VI-2', 0.5]],
    hairColor: [['black', 7], ['softBlack', 3], ['darkBrown', 2]],
    eyeColor: [['darkBrown', 4], ['brown', 4], ['lightBrown', 1], ['hazel', 0.5], ['green', 0.2]],
    hairTexture: { 1: 4, 2: 3, 3: 1 },
    eyeShape: { almond: 5, round: 2, hooded: 1.5, downturned: 1, upturned: 1 },
    nose: { line: 2, straight: 2, aquiline: 1.5, broad: 1.5, button: 1 },
    face: { eyeSize: [0.95, 1.18], lashes: [0.3, 0.75], browThick: [0.9, 1.5] },
    hair: {
      fem: { long: 3, 'single-braid': 2, 'bun-low': 2, shoulder: 1, 'two-braids': 0.5, ponytail: 0.5 },
      masc: { 'short-crop': 3, 'side-part': 3, 'slicked-back': 1, bald: 0.3 },
    },
    headwear: { fem: { none: 6, jasmine: 1.5, hijab: 1 }, masc: { none: 6, turban: 2, kufi: 0.6 } },
    clothing: { fem: { sari: 3, kurta: 2, 'embroidered-tunic': 0.5, crew: 0.5 }, masc: { kurta: 3, mandarin: 1.5, suit: 1, crew: 1 } },
    patterns: { paisley: 2, ikat: 1, blossoms: 1, plain: 1.5, dots: 1, stripes: 0.5 },
    trims: { zigzag: 1, 'cross-stitch': 1, paisley: 0.5, stripes: 1, beadwork: 0.5 },
    earrings: { fem: { jhumka: 3, studs: 2, drops: 1, hoops: 1 }, masc: { none: 10, studs: 0.6 } },
    necklaces: { fem: { none: 2, beads: 1, layered: 1, choker: 1, pearls: 1, 'chunky-beads': 0.2 }, masc: { none: 10, beads: 0.5 } },
    marks: { fem: { bindi: 0.4, 'nose-stud': 0.25, 'nose-ring': 0.1, kohl: 0.25, 'beauty-mark': 0.08 }, masc: { tilak: 0.05 } },
    palette: ['#f08c1a', '#b0256b', '#1b7a4a', '#d4a531', '#2b3a67', '#b3262e'],
    metals: [['gold', 5], ['silver', 1]],
  });

  // ------------------------------------------------------------------ EAST, SOUTHEAST & CENTRAL ASIA
  A('east-asian', {
    label: 'East Asian', region: 'East Asia',
    notes: 'Han Chinese (north and south differ), Japanese, Korean, Mongolian, Tibetan, Ainu, Ryukyuan and more. Hanfu, qipao, kimono, hanbok, deel; dragons, clouds, cranes, blossoms. Not everyone has a monolid — mix shapes.',
    skin: [['I-2', 2], ['II-1', 3], ['II-2', 3], ['III-1', 2], ['III-2', 1], ['IV-1', 0.5]],
    hairColor: [['black', 7], ['softBlack', 3], ['darkBrown', 1.5]],
    eyeColor: [['darkBrown', 5], ['brown', 4], ['lightBrown', 0.5]],
    hairTexture: { 1: 9, 2: 1 },
    eyeShape: { monolid: 4, hooded: 3, almond: 3, narrow: 1, upturned: 1 },
    nose: { button: 2, straight: 2, minimal: 2, line: 1 },
    face: { noseBridge: [0.1, 0.45], cheek: [0.98, 1.08], faceWidth: [0.95, 1.1], lipFull: [0.45, 0.85], browArch: [0.1, 0.45] },
    hair: {
      fem: { long: 3, bob: 2, 'bob-bangs': 2, fringe: 2, 'bun-top': 1, ponytail: 1.5, shoulder: 1.5 },
      masc: { 'short-crop': 3, 'side-part': 2, 'slicked-back': 1, 'bun-top': 0.6, buzz: 1 },
    },
    facialHair: { masc: { none: 8, stubble: 1, mustache: 0.5, goatee: 0.8 } },
    headwear: { none: 12, 'fur-hat': 0.3 },
    clothing: { fem: { 'cross-collar': 2, hanbok: 1.5, mandarin: 2, crew: 1.5, vneck: 1, turtleneck: 1 }, masc: { 'cross-collar': 1.5, mandarin: 1.5, suit: 1.5, crew: 1.5, deel: 0.5 } },
    patterns: { plain: 2, clouds: 2, blossoms: 2, checks: 0.5, stripes: 0.5 },
    trims: { clouds: 1, stripes: 1, zigzag: 0.5 },
    marks: { blush: 0.2, 'beauty-mark': 0.1, dimples: 0.08 },
    palette: ['#b3262e', '#d4a531', '#4f8f6f', '#2b3a67', '#f1e6cc', '#16120f'],
    metals: [['gold', 2], ['silver', 1]],
  });

  A('southeast-asian', {
    label: 'Southeast Asian', region: 'Southeast Asia',
    notes: 'Thai, Vietnamese, Khmer, Javanese, Balinese, Filipino, Burmese, Lao, Hmong and more. Áo dài and nón lá, batik and kebaya, sampot, thanaka paste, gold jewellery; naga and floral motifs.',
    skin: [['II-2', 1], ['III-1', 2], ['III-2', 3], ['IV-1', 3], ['IV-2', 2], ['V-1', 1.5]],
    hairColor: [['black', 7], ['softBlack', 3], ['darkBrown', 1]],
    eyeColor: [['darkBrown', 5], ['brown', 4]],
    hairTexture: { 1: 5, 2: 3, 3: 1 },
    eyeShape: { almond: 4, monolid: 1.5, hooded: 1.5, round: 1 },
    nose: { broad: 2, button: 2, line: 1.5, minimal: 1, straight: 1 },
    face: { noseBridge: [0.15, 0.5], noseWidth: [0.9, 1.25], lipFull: [0.6, 1] },
    hair: { fem: { long: 3, 'bun-low': 2, 'bun-top': 1, shoulder: 2, bob: 1, ponytail: 1 }, masc: { 'short-crop': 3, 'side-part': 2, buzz: 1 } },
    facialHair: { masc: { none: 8, stubble: 1, mustache: 0.6, goatee: 0.5 } },
    headwear: { fem: { none: 6, 'conical-hat': 1.5, hijab: 1.5, 'flower-crown': 0.5 }, masc: { none: 6, 'conical-hat': 1, kufi: 1 } },
    clothing: { fem: { mandarin: 1.5, wrap: 1.5, crew: 1, 'embroidered-tunic': 0.5, vneck: 1 }, masc: { kurta: 1.5, crew: 1.5, suit: 1, mandarin: 1 } },
    patterns: { batik: 3, ikat: 2, plain: 1.5, blossoms: 1 },
    trims: { zigzag: 1, beadwork: 0.5, stripes: 1 },
    marks: { fem: { thanaka: 0.12, 'beauty-mark': 0.08 }, masc: { thanaka: 0.05 } },
    palette: ['#d4a531', '#8e1f2a', '#1b6b4a', '#2b3a67', '#7a4a26', '#f1e6cc'],
    metals: [['gold', 4], ['silver', 1]],
  });

  A('central-asian', {
    label: 'Central Asian / Steppe', region: 'Central Asia',
    notes: 'Kazakh, Kyrgyz, Uzbek, Tajik, Turkmen, Pashtun, Uyghur and more. Chapan and deel, ikat silk, doppa caps, fur-trimmed hats, coin headdresses and silver; ruddy cheeks from wind and altitude.',
    skin: [['I-2', 1], ['II-1', 2], ['II-2', 3], ['III-1', 3], ['III-2', 2], ['IV-1', 1]],
    hairColor: [['black', 5], ['softBlack', 2], ['darkBrown', 3], ['brown', 1]],
    eyeColor: [['brown', 4], ['darkBrown', 3], ['hazel', 1.5], ['green', 0.5], ['grey', 0.3]],
    hairTexture: { 1: 5, 2: 3, 3: 1 },
    eyeShape: { almond: 3, monolid: 2, hooded: 2, narrow: 1 },
    nose: { straight: 2, line: 2, aquiline: 1, button: 1 },
    face: { cheek: [1.0, 1.1] },
    hair: { fem: { 'two-braids': 3, long: 2, 'single-braid': 1, 'bun-low': 1 }, masc: { 'short-crop': 3, buzz: 2, 'side-part': 1 } },
    headwear: { fem: { none: 3, 'coin-band': 1.5, headscarf: 2, 'fur-hat': 1 }, masc: { none: 3, doppa: 2.5, 'fur-hat': 2, pakol: 1 } },
    clothing: { fem: { deel: 2, 'embroidered-tunic': 1.5, 'cross-collar': 0.5, 'fur-collar': 1 }, masc: { deel: 3, 'fur-collar': 1.5, kurta: 1, suit: 0.5 } },
    patterns: { ikat: 4, plain: 1, stripes: 1 },
    trims: { zigzag: 1, 'cross-stitch': 1, ikat: 1 },
    necklaces: { fem: { none: 2, coins: 2, 'chunky-beads': 1.5 }, masc: { none: 10 } },
    earrings: { fem: { none: 1, coins: 2, drops: 1.5, hoops: 1, studs: 1 }, masc: { none: 10 } },
    marks: { blush: 0.3, freckles: 0.04 },
    palette: ['#8e1f2a', '#2aa198', '#d4a531', '#f1e6cc', '#2b3a67'],
    metals: [['silver', 3], ['gold', 2], ['turquoise', 0.6]],
  });

  // ------------------------------------------------------------------ AMERICAS
  A('indigenous-north-america', {
    label: 'Indigenous North American', region: 'Americas',
    notes: 'Hundreds of distinct nations: Lakota, Diné (Navajo), Haudenosaunee, Cree, Haida, Hopi and more. Ribbon shirts, beadwork, turquoise and silver, woven blankets. War bonnets are sacred regalia and deliberately excluded.',
    skin: [['III-1', 1], ['III-2', 2], ['IV-1', 3], ['IV-2', 2], ['V-red', 2], ['V-1', 1.5], ['V-2', 1]],
    hairColor: [['black', 7], ['softBlack', 3], ['darkBrown', 1.5]],
    eyeColor: [['darkBrown', 5], ['brown', 4]],
    hairTexture: { 1: 8, 2: 2 },
    eyeShape: { almond: 3, hooded: 2, monolid: 1, 'deep-set': 1 },
    nose: { aquiline: 2, straight: 2, broad: 1, line: 1 },
    face: { cheek: [1.0, 1.1], faceWidth: [0.98, 1.12] },
    hair: { fem: { 'two-braids': 3, long: 3, 'single-braid': 1, 'bun-low': 1 }, masc: { 'two-braids': 2, long: 2, 'short-crop': 2, ponytail: 1 } },
    facialHair: { masc: { none: 8, stubble: 1, mustache: 0.6, goatee: 0.4 } },
    headwear: { none: 8, 'bead-band': 1.5 },
    clothing: { fem: { 'embroidered-tunic': 1.5, crew: 1.5, poncho: 0.5, vneck: 1 }, masc: { crew: 2, suit: 0.5, 'embroidered-tunic': 1 } },
    patterns: { 'chevron-bands': 2, plain: 2, zigzag: 1, beadwork: 0.5 },
    trims: { beadwork: 3, zigzag: 1 },
    earrings: { fem: { none: 2, drops: 1, studs: 1, geometric: 0.6, 'beaded-loops': 0.6 }, masc: { none: 8, studs: 1 } },
    necklaces: { fem: { none: 2, 'chunky-beads': 2, beads: 1, medallion: 0.5 }, masc: { none: 4, 'chunky-beads': 1.5, beads: 0.6 } },
    palette: ['#2aa198', '#a8302a', '#c98a2b', '#16120f', '#f1e6cc', '#3f6fa8'],
    metals: [['silver', 4], ['turquoise', 1]],
  });

  A('indigenous-latin-america', {
    label: 'Mesoamerican & Andean', region: 'Americas',
    notes: 'Maya, Zapotec, Nahua, Quechua, Aymara, Mapuche and more. Embroidered huipil, woven ponchos, chullo knit hats, alpaca wool, bright floral and stepped geometric bands, jade and silver.',
    skin: [['III-2', 2], ['IV-1', 3], ['IV-2', 3], ['V-red', 2], ['V-1', 1.5], ['V-2', 1]],
    hairColor: [['black', 7], ['softBlack', 3], ['darkBrown', 1]],
    eyeColor: [['darkBrown', 5], ['brown', 4]],
    hairTexture: { 1: 8, 2: 2 },
    eyeShape: { almond: 3, hooded: 2, monolid: 1, round: 1 },
    nose: { aquiline: 2, straight: 1.5, broad: 1.5, line: 1, button: 1 },
    face: { cheek: [1.0, 1.1], faceWidth: [1.0, 1.12] },
    hair: { fem: { 'two-braids': 3, 'single-braid': 1.5, long: 2, 'bun-low': 1 }, masc: { 'short-crop': 3, long: 1, 'side-part': 1 } },
    facialHair: { masc: { none: 8, stubble: 1, mustache: 1 } },
    headwear: { fem: { none: 4, chullo: 1, 'flower-crown': 1, headscarf: 0.5 }, masc: { none: 5, chullo: 2 } },
    clothing: { fem: { huipil: 3, poncho: 2, 'embroidered-tunic': 1 }, masc: { poncho: 3, crew: 1, 'embroidered-tunic': 1 } },
    patterns: { 'chevron-bands': 3, 'cross-stitch': 1, zigzag: 1, plain: 0.5, blossoms: 1 },
    trims: { blossoms: 2, 'cross-stitch': 2, zigzag: 1, 'chevron-bands': 1 },
    earrings: { fem: { none: 1, drops: 2, hoops: 1, coins: 1 }, masc: { none: 10 } },
    necklaces: { fem: { none: 2, beads: 2, 'chunky-beads': 1, coins: 0.5 }, masc: { none: 10 } },
    palette: ['#c2185b', '#a8302a', '#e36b1f', '#2aa198', '#e0b13c', '#16120f'],
    metals: [['silver', 2], ['gold', 1]],
  });

  A('latin-american', {
    label: 'Latin American (mestizo / mixed)', region: 'Americas',
    notes: 'Centuries of Indigenous, European, African and Asian ancestry — the broadest spread of any archetype here. Treat as a starting point and blend freely.',
    skin: [['II-1', 1], ['II-2', 2], ['III-1', 3], ['III-2', 3], ['IV-1', 3], ['IV-2', 2], ['V-1', 1.5], ['V-2', 1], ['VI-1', 0.6]],
    hairColor: [['black', 4], ['darkBrown', 4], ['brown', 2], ['lightBrown', 0.6], ['darkBlond', 0.3]],
    eyeColor: [['darkBrown', 4], ['brown', 4], ['hazel', 1.5], ['green', 0.5], ['blue', 0.3]],
    hairTexture: { 1: 3, 2: 4, 3: 3, 4: 1 },
    patterns: { plain: 2, blossoms: 1.5, stripes: 1, checks: 1, 'chevron-bands': 0.5 },
    palette: ['#b3262e', '#e0a526', '#1b6b4a', '#2b3a67', '#f1e6cc', '#c2185b'],
  });

  // ------------------------------------------------------------------ OCEANIA
  A('pacific-islander', {
    label: 'Pacific Islander', region: 'Oceania',
    notes: 'Polynesian (Samoan, Tongan, Hawaiian, Māori, Tahitian), Melanesian and Micronesian peoples. Lavalava and pareo, tapa cloth, shell and bone, flowers. Tatau and moko carry lineage meaning and are intentionally not generated.',
    skin: [['IV-1', 2], ['IV-2', 3], ['V-1', 3], ['V-2', 2], ['VI-1', 2], ['VI-2', 1]],
    hairColor: [['black', 6], ['softBlack', 3], ['darkBrown', 2]],
    eyeColor: [['darkBrown', 5], ['brown', 4]],
    hairTexture: { 2: 3, 3: 4, 4: 2 },
    eyeShape: { almond: 4, round: 2, 'deep-set': 1, hooded: 1 },
    nose: { broad: 3, straight: 1, line: 1.5, button: 1 },
    face: { faceWidth: [1.0, 1.15], jaw: [0.8, 0.98], noseWidth: [0.95, 1.35], neckWidth: [1.0, 1.2] },
    hair: { fem: { 'curly-shoulder': 3, long: 2, 'bun-top': 2, shoulder: 1 }, masc: { 'short-crop': 3, 'bun-top': 2, 'curly-shoulder': 1, buzz: 1 } },
    headwear: { none: 5, 'flower-crown': 2 },
    clothing: { wrap: 3, bare: 2, crew: 1 },
    patterns: { zigzag: 2, blossoms: 2, mudcloth: 1, plain: 1 },
    necklaces: { none: 2, cowrie: 1, beads: 1, medallion: 0.5, 'chunky-beads': 0.5 },
    marks: { 'paint-dots': 0.03, dimples: 0.1 },
    palette: ['#a8302a', '#16120f', '#f1e6cc', '#c98a2b', '#8a5a34', '#2e6b3a'],
    metals: [['gold', 1], ['silver', 1], ['turquoise', 0.3]],
  });

  A('aboriginal-australian', {
    label: 'Aboriginal & Torres Strait Islander', region: 'Oceania',
    notes: 'Hundreds of distinct nations and languages. Ochre palettes, possum-skin cloaks, dot and line art, shell and seed adornment; natural blond hair occurs in some communities. Ceremonial body paint has protocols — the dots here are decorative only.',
    skin: [['V-2', 1], ['VI-1', 2], ['VI-2', 3], ['VI-3', 3], ['VI-4', 2]],
    hairColor: [['black', 4], ['softBlack', 3], ['darkBrown', 3], ['brown', 1], ['darkBlond', 0.6]],
    eyeColor: [['darkBrown', 5], ['brown', 4]],
    hairTexture: { 2: 3, 3: 4, 4: 2 },
    eyeShape: { 'deep-set': 3, almond: 2, hooded: 2 },
    nose: { broad: 3, line: 1, straight: 1 },
    face: { noseWidth: [1.0, 1.4], browHeight: [-0.6, 0.1], browThick: [1.0, 1.6] },
    hair: { fem: { 'curly-shoulder': 3, shoulder: 1, afro: 1, 'short-crop': 1 }, masc: { 'short-crop': 3, 'curly-shoulder': 2, buzz: 1 } },
    facialHair: { masc: { none: 2, 'short-beard': 2, 'full-beard': 2, stubble: 1 } },
    headwear: { none: 8, 'bead-band': 0.8 },
    clothing: { crew: 3, vneck: 1, wrap: 1 },
    patterns: { plain: 2, dots: 2, zigzag: 1 },
    marks: { 'paint-dots': 0.08 },
    palette: ['#c98a2b', '#9c3b20', '#f1e6cc', '#16120f', '#e0b13c'],
  });

  // ------------------------------------------------------------------ EUROPE
  A('northern-european', {
    label: 'Northern European', region: 'Europe',
    notes: 'Nordic, Celtic, Germanic, Baltic and more. Wool tunics and fur, tartan, brooches and torcs, amber. Fair skin, freckles; blond, red and brown hair; blue, grey, green and brown eyes.',
    skin: [['I-1', 3], ['I-2', 3], ['II-1', 2], ['II-2', 1], ['III-1', 0.4]],
    hairColor: [['blond', 3], ['darkBlond', 3], ['lightBrown', 3], ['brown', 2], ['red', 1], ['strawberry', 1], ['auburn', 1], ['platinum', 0.8], ['darkBrown', 1]],
    eyeColor: [['blue', 3], ['lightBlue', 2], ['grey', 2], ['green', 2], ['hazel', 1], ['brown', 2]],
    hairTexture: { 1: 5, 2: 4, 3: 1 },
    eyeShape: { almond: 2, hooded: 2, round: 2, 'deep-set': 2, downturned: 1 },
    nose: { straight: 3, line: 2, button: 1, aquiline: 1 },
    hair: {
      fem: { long: 2, shoulder: 2, bob: 1, 'bun-low': 1, ponytail: 1, 'two-braids': 1, 'single-braid': 1, fringe: 0.6 },
      masc: { 'short-crop': 3, 'side-part': 2.5, 'slicked-back': 1, buzz: 1, bald: 0.5, long: 0.4 },
    },
    facialHair: { masc: { none: 3, stubble: 2, 'short-beard': 2, 'full-beard': 1.5, 'long-beard': 0.4, mustache: 0.6, goatee: 0.6 } },
    clothing: { fem: { crew: 2, turtleneck: 1.5, 'fur-collar': 1, scarf: 1, vneck: 1, 'embroidered-tunic': 0.5 }, masc: { crew: 2, suit: 2, 'fur-collar': 1, turtleneck: 1, scarf: 1 } },
    patterns: { plain: 3, tartan: 2, stripes: 1, checks: 1 },
    necklaces: { fem: { none: 3, pearls: 1, beads: 1, medallion: 0.6, torc: 0.4 }, masc: { none: 10, torc: 0.5 } },
    marks: { freckles: 0.3, blush: 0.3, 'beauty-mark': 0.06, dimples: 0.08 },
    palette: ['#2f4f7a', '#8e1f2a', '#c99a4b', '#3a5f3a', '#8a8478', '#f1e6cc'],
    metals: [['silver', 2], ['gold', 2]],
  });

  A('southern-european', {
    label: 'Southern European', region: 'Europe',
    notes: 'Italian, Greek, Spanish, Portuguese, Maltese, Balkan peoples and more. Olive skin, dark wavy hair, strong brows; chiton, mantilla, embroidered vests, stripes and lace.',
    skin: [['I-2', 1], ['II-1', 2], ['II-2', 3], ['III-1', 3], ['III-olive', 2], ['IV-olive', 1]],
    hairColor: [['black', 3], ['darkBrown', 4], ['brown', 2], ['lightBrown', 0.6], ['darkBlond', 0.3]],
    eyeColor: [['brown', 4], ['darkBrown', 2], ['hazel', 2], ['green', 1], ['blue', 0.5]],
    hairTexture: { 1: 2, 2: 4, 3: 3 },
    eyeShape: { almond: 4, round: 2, hooded: 2, 'deep-set': 1, downturned: 1 },
    nose: { aquiline: 3, straight: 2, line: 2 },
    face: { browThick: [0.9, 1.5] },
    facialHair: { masc: { none: 3, stubble: 2.5, 'short-beard': 2, 'full-beard': 1, mustache: 0.8, goatee: 0.8 } },
    headwear: { fem: { none: 10, headscarf: 0.5 }, masc: { none: 1 } },
    clothing: { fem: { vneck: 2, crew: 1.5, bare: 1, scarf: 1, wrap: 0.5 }, masc: { suit: 2, crew: 2, vneck: 1, scarf: 0.5 } },
    patterns: { plain: 3, stripes: 2, checks: 1, blossoms: 1 },
    palette: ['#16120f', '#f1e6cc', '#b5532f', '#1f3b63', '#6b6b2e', '#d4a531'],
    metals: [['gold', 3], ['silver', 1]],
  });

  A('eastern-european', {
    label: 'Eastern European / Slavic', region: 'Europe',
    notes: 'Polish, Ukrainian, Russian, Czech, Serbian, Bulgarian and more. Embroidered linen (vyshyvanka), sarafan, flower crowns and headscarves, fur hats; high cheekbones, every hair colour.',
    skin: [['I-1', 2], ['I-2', 3], ['II-1', 3], ['II-2', 2], ['III-1', 0.6]],
    hairColor: [['blond', 2], ['darkBlond', 3], ['lightBrown', 3], ['brown', 3], ['darkBrown', 2], ['red', 0.6], ['black', 0.6]],
    eyeColor: [['blue', 3], ['grey', 2], ['green', 2], ['hazel', 1.5], ['brown', 2], ['lightBlue', 1]],
    hairTexture: { 1: 6, 2: 3, 3: 1 },
    eyeShape: { almond: 3, round: 2, hooded: 2, upturned: 1, 'deep-set': 1 },
    nose: { straight: 2, button: 2, line: 2, aquiline: 0.6 },
    face: { cheek: [1.0, 1.08], faceWidth: [0.98, 1.1] },
    hair: {
      fem: { long: 2, 'single-braid': 1.5, shoulder: 2, bob: 1, 'bun-low': 1, ponytail: 1 },
      masc: { 'short-crop': 3, 'side-part': 2, buzz: 1.5, 'slicked-back': 1, bald: 0.4 },
    },
    headwear: { fem: { none: 8, headscarf: 1.5, 'flower-crown': 1 }, masc: { none: 8, 'fur-hat': 1.5 } },
    clothing: { fem: { 'embroidered-tunic': 2.5, crew: 1, turtleneck: 1, 'fur-collar': 0.5 }, masc: { 'embroidered-tunic': 2, suit: 1.5, crew: 1.5, 'fur-collar': 1 } },
    patterns: { plain: 2, 'cross-stitch': 2, blossoms: 2 },
    trims: { 'cross-stitch': 3, zigzag: 1 },
    marks: { blush: 0.25, freckles: 0.12, dimples: 0.1 },
    palette: ['#b3262e', '#f1e6cc', '#16120f', '#d4a531', '#2f4f7a', '#3a5f3a'],
  });

  A('romani', {
    label: 'Romani', region: 'Europe',
    notes: 'A diaspora that left north India roughly a millennium ago and spread across Europe and beyond — appearance varies widely. Known for metalwork, horse trade and music; layered skirts, headscarves, gold coins. Avoid the fortune-teller stereotype.',
    skin: [['II-2', 2], ['III-1', 3], ['III-2', 3], ['IV-1', 2], ['IV-2', 1]],
    hairColor: [['black', 5], ['darkBrown', 4], ['brown', 1]],
    eyeColor: [['darkBrown', 4], ['brown', 4], ['hazel', 1], ['green', 0.5]],
    hairTexture: { 1: 2, 2: 4, 3: 3 },
    hair: { fem: { long: 3, shoulder: 1, 'bun-low': 1, 'single-braid': 1 }, masc: { 'short-crop': 2, 'side-part': 2, shoulder: 1 } },
    facialHair: { masc: { none: 3, mustache: 2, stubble: 1.5, 'short-beard': 1 } },
    headwear: { fem: { none: 4, headscarf: 3, 'coin-band': 1.5 }, masc: { none: 8 } },
    clothing: { fem: { vneck: 1.5, 'embroidered-tunic': 1.5, bare: 1, scarf: 1 }, masc: { suit: 1.5, crew: 1.5, scarf: 1, vneck: 1 } },
    patterns: { blossoms: 3, dots: 2, plain: 1, paisley: 1 },
    earrings: { fem: { hoops: 3, coins: 2, drops: 1 }, masc: { none: 6, hoops: 1, studs: 1 } },
    necklaces: { fem: { none: 1, coins: 2.5, layered: 1 }, masc: { none: 8, medallion: 1 } },
    palette: ['#b3262e', '#d4a531', '#b0256b', '#1b6b4a', '#2b3a67', '#16120f'],
    metals: [['gold', 5]],
  });
})(window.PM = window.PM || {});
