/* Roles: outfit presets for an occupation or station.
 * The face still comes from heritage, blend and presentation; a role then re-dresses it.
 * Every field is optional:
 *   headwear, clothing, eyewear, necklace, earrings, pattern, trim
 *       weight tables, optionally split by presentation ({ fem, masc }).
 *       The special key `keep` keeps whatever the heritage rolled (a heritage turban,
 *       a gele, a sari …) so royalty and workers still look like where they're from.
 *   accessories  { id: probability } — Extras switched on
 *   palette      [garment, accent, detail] — a colour or a list to pick from
 *   metals       weight table over PM.METALS
 *   hairStyle, facialHair  weight tables too (rockstars get the hair, healers the beard)
 *   variants     [{ cultures: [group or heritage id, …], label, notes, …any field above }]
 *                The first variant matching the portrait's heritage overrides those fields —
 *                so "Royalty" becomes a West African, Mughal, Joseon or Slavic court by default.
 *   dress(g, rng) any last tweaks
 * Add one with PM.define('roles', 'my-role', {...}); it appears in the Role dropdown. */
(function (PM) {
  'use strict';
  const R = (id, def) => PM.define('roles', id, def);

  // ------------------------------------------------------------------ culture groups
  // Role variants name cultures by group, so one variant covers several heritages.
  // A heritage can also list its own `groups` (see archetypes-modern.js); otherwise its
  // `region` is used as a last resort. Add a heritage to a group here to opt it in.
  PM.CULTURE_GROUPS = {
    'west-african': ['african', 'west-african'],
    'east-african': ['african', 'east-african'],
    'north-african': ['mena', 'north-african'],
    'middle-eastern': ['mena'],
    'south-asian': ['south-asian'],
    'east-asian': ['east-asian'],
    'southeast-asian': ['southeast-asian'],
    'central-asian': ['central-asian'],
    'indigenous-north-america': ['indigenous-na'],
    'indigenous-latin-america': ['andean'],
    'latin-american': ['latin'],
    'pacific-islander': ['pacific'],
    'aboriginal-australian': ['aboriginal'],
    'northern-european': ['european', 'northern-european'],
    'southern-european': ['european', 'southern-european'],
    'eastern-european': ['european', 'eastern-european'],
    romani: ['romani'],
  };
  PM.REGION_GROUPS = { Africa: ['african'], Europe: ['european'], Asia: [], Americas: [], Oceania: ['pacific'] };

  R('everyday', { label: 'Everyday', notes: 'Dressed by heritage alone.' });

  // ------------------------------------------------------------------ royalty, culture by culture
  R('royalty', {
    notes: 'Crowns, tiaras, sashes and ermine of the European courts. Other heritages get their own court dress automatically.',
    headwear: { fem: { tiara: 3, 'imperial-crown': 2, crown: 2, circlet: 2, keep: 1 }, masc: { 'imperial-crown': 3, crown: 3, laurel: 0.6, circlet: 1, keep: 1 } },
    clothing: { 'royal-robe': 5, ruff: 1, keep: 1 },
    pattern: { paisley: 2, blossoms: 2, 'cross-stitch': 1, plain: 1 },
    necklace: { pearls: 2, layered: 1, medallion: 1, 'chain-of-office': 1, none: 1 },
    earrings: { fem: { drops: 2, studs: 1, keep: 1 }, masc: { none: 3, keep: 1 } },
    accessories: { 'royal-sash': 0.55, medals: 0.25, brooch: 0.3, epaulettes: 0.12 },
    palette: [['#e9dcc0', '#c9a227', '#2b3a67'], ['#7a1f2b', '#5a2a6e', '#2b3a67'], ['#a8302a', '#2f5f6e', '#c9a227']],
    metals: { gold: 4, silver: 1 },
    variants: [
      { cultures: ['west-african'], label: 'Royalty · West African court',
        notes: 'Akan-style gold diadems and kente, Yoruba and Hausa agbada of state, coral and gold beads, a gele for queens.',
        headwear: { fem: { 'gold-diadem': 3, gele: 3, crown: 1 }, masc: { 'gold-diadem': 3, fila: 2, kufi: 1, crown: 1 } },
        clothing: { fem: { wrap: 4, boubou: 2 }, masc: { agbada: 5, wrap: 2 } },
        pattern: { kente: 5, adinkra: 2, mudcloth: 1 }, trim: { kente: 2, beadwork: 2 },
        necklace: { 'chunky-beads': 3, 'bead-collar': 2, 'broad-collar': 1, coins: 1 },
        earrings: { fem: { 'big-disc': 2, coins: 1, drops: 1 }, masc: { none: 3 } },
        accessories: {}, palette: [['#c9a227', '#2f7a3a', '#a8302a'], ['#c9a227', '#16120f'], ['#a8302a', '#2f7a3a']], metals: { gold: 1 } },
      { cultures: ['african-diaspora'], label: 'Royalty · Diaspora court',
        notes: 'Black royalty from the African diaspora — gold diadems and agbada beside velvet, ermine and imperial crowns.',
        headwear: { fem: { 'gold-diadem': 2, gele: 2, tiara: 2, 'imperial-crown': 1 }, masc: { 'gold-diadem': 2, 'imperial-crown': 2, crown: 1, kufi: 1 } },
        clothing: { fem: { wrap: 2, 'royal-robe': 2 }, masc: { agbada: 3, 'royal-robe': 2 } },
        pattern: { kente: 3, adinkra: 1, paisley: 1 }, trim: { kente: 2, beadwork: 1 },
        necklace: { 'chunky-beads': 2, 'broad-collar': 1, pearls: 1, 'chain-of-office': 1 },
        accessories: { 'royal-sash': 0.3, brooch: 0.2 }, palette: [['#c9a227', '#5a2a6e', '#2b3a67'], ['#c9a227', '#2f7a3a', '#7a1f2b'], ['#a8302a', '#c9a227']], metals: { gold: 1 } },
      { cultures: ['east-african'], label: 'Royalty · East African court',
        notes: 'Ethiopian, Swahili-coast and Great Lakes courts: white and woven borders, gold diadems, broad beaded collars.',
        headwear: { fem: { 'gold-diadem': 2, headwrap: 2, crown: 1 }, masc: { 'gold-diadem': 2, crown: 2, kufi: 1 } },
        clothing: { wrap: 4, boubou: 2, 'royal-robe': 1 }, pattern: { 'chevron-bands': 2, 'cross-stitch': 2, plain: 2 },
        necklace: { 'broad-collar': 2, 'bead-collar': 2, 'chunky-beads': 1 }, accessories: {},
        palette: [['#f1e6cc', '#c9a227'], ['#c9a227', '#a8302a', '#2f7a3a'], ['#2b3a67', '#a8302a']], metals: { gold: 1 } },
      { cultures: ['mena'], label: 'Royalty · Gulf & Maghreb court',
        notes: 'Bisht cloaks edged in gold over a white thobe; coin headpieces, gold collars and embroidered kaftans.',
        headwear: { fem: { 'coin-band': 3, headscarf: 2, tiara: 1, hijab: 1 }, masc: { keffiyeh: 4, turban: 2, 'jewelled-turban': 1 } },
        clothing: { fem: { 'embroidered-tunic': 3, 'royal-robe': 1, wrap: 1 }, masc: { bisht: 6 } },
        pattern: { plain: 2, paisley: 2, 'cross-stitch': 1 }, necklace: { fem: { 'broad-collar': 2, coins: 2, medallion: 1 }, masc: { none: 3, medallion: 1 } },
        accessories: {}, palette: [['#16120f', '#5a4a2e', '#2b3a67'], ['#c9a227', '#a8302a'], ['#c9a227']], metals: { gold: 1 } },
      { cultures: ['south-asian'], label: 'Royalty · Rajput & Mughal court',
        notes: 'Jewelled turbans with a sarpech, brocade sherwanis, saris heavy with zari, maang tikka, jhumkas and layered gold.',
        headwear: { fem: { 'maang-tikka': 5, tiara: 0.5 }, masc: { 'jewelled-turban': 6 } },
        clothing: { fem: { sari: 5, 'royal-robe': 0.4 }, masc: { sherwani: 5, kurta: 1 } },
        pattern: { paisley: 3, blossoms: 2 }, trim: { beadwork: 2, 'cross-stitch': 1, zigzag: 1 },
        necklace: { 'broad-collar': 2, layered: 2, pearls: 2 }, earrings: { fem: { jhumka: 5 }, masc: { none: 2, studs: 1 } },
        accessories: {}, palette: [['#a8302a', '#c9a227', '#2b3a67', '#5a2a6e'], ['#c9a227', '#2f7a3a'], ['#c9a227', '#a8302a']], metals: { gold: 1 } },
      { cultures: ['east-asian'], label: 'Royalty · East Asian court',
        notes: 'Phoenix crowns for empresses, topknot crowns and winged futou caps for emperors and officials, robes of yellow and red with cloud patterns.',
        headwear: { fem: { 'phoenix-crown': 6 }, masc: { 'topknot-crown': 3, futou: 2, gat: 1 } },
        clothing: { 'cross-collar': 4, hanbok: 1, mandarin: 1 }, pattern: { clouds: 4, blossoms: 2 },
        necklace: { none: 4, pearls: 1 }, earrings: { fem: { drops: 3 }, masc: { none: 1 } }, accessories: {},
        palette: [['#d9a520', '#a8302a', '#2b3a67'], ['#a8302a', '#c9a227'], ['#2f5f6e', '#c9a227']], metals: { gold: 1 } },
      { cultures: ['southeast-asian'], label: 'Royalty · Southeast Asian court',
        notes: 'Tall gold chada spire crowns of the Thai and Khmer courts, gold collars, silk and batik.',
        headwear: { 'spire-crown': 6 }, clothing: { wrap: 3, 'cross-collar': 1, 'embroidered-tunic': 1 },
        pattern: { batik: 2, ikat: 2, blossoms: 1 }, necklace: { 'broad-collar': 4 }, earrings: { fem: { jhumka: 2, drops: 1 }, masc: { none: 2 } },
        accessories: {}, palette: [['#c9a227', '#a8302a', '#2f7a3a'], ['#c9a227'], ['#a8302a', '#2b3a67']], metals: { gold: 1 } },
      { cultures: ['central-asian'], label: 'Royalty · Steppe khanate',
        notes: 'Fur-rimmed crowns and caps, embroidered robes and deels, coins and silver.',
        headwear: { fem: { 'fur-hat': 2, 'coin-band': 2, 'fur-crown': 1 }, masc: { 'fur-crown': 3, 'fur-hat': 2, 'jewelled-turban': 1 } },
        clothing: { deel: 3, 'embroidered-tunic': 2 }, pattern: { clouds: 2, 'cross-stitch': 2 },
        necklace: { coins: 2, 'broad-collar': 1, none: 1 }, accessories: {}, metals: { silver: 2, gold: 1 } },
      { cultures: ['eastern-european'], label: 'Royalty · Slavic court',
        notes: 'Fur-rimmed jewelled crowns for tsars and princes, kokoshnik headdresses for tsarinas, brocade and ermine.',
        headwear: { fem: { kokoshnik: 5, tiara: 1 }, masc: { 'fur-crown': 5, 'imperial-crown': 1 } },
        clothing: { 'royal-robe': 3, 'fur-collar': 1, 'embroidered-tunic': 1 }, pattern: { 'cross-stitch': 2, blossoms: 2 },
        necklace: { pearls: 2, layered: 1, 'chain-of-office': 1 } },
      { cultures: ['andean'], label: 'Royalty · Andean court',
        notes: 'A royal fringe headband of red wool, gold discs at the ears, finely woven tunics and mantles.',
        headwear: { 'fringe-band': 6 }, clothing: { fem: { huipil: 2, poncho: 2 }, masc: { poncho: 4 } },
        pattern: { 'chevron-bands': 3, 'cross-stitch': 1 }, earrings: { 'big-disc': 5 }, necklace: { 'broad-collar': 2, none: 1 },
        accessories: {}, palette: [['#a8302a', '#c9a227', '#2b3a67'], ['#c9a227'], ['#2f7a3a', '#16120f']], metals: { gold: 1 } },
      { cultures: ['indigenous-na'], label: 'Leader',
        notes: 'Shown with beadwork and fine cloth. War bonnets and other sacred regalia are deliberately left out.',
        headwear: { 'bead-band': 3, none: 2 }, clothing: { keep: 1 }, necklace: { 'bead-collar': 3, beads: 1 }, accessories: {}, metals: { silver: 1 } },
      { cultures: ['pacific'], label: 'Royalty · Pacific chiefly dress',
        notes: 'Flower crowns and garlands, fine mats and tapa-style wraps, shell and bead collars.',
        headwear: { 'flower-crown': 3, 'bead-band': 1 }, clothing: { wrap: 3, keep: 1 }, necklace: { cowrie: 2, 'chunky-beads': 2, 'broad-collar': 1 }, accessories: {} },
      { cultures: ['aboriginal'], label: 'Elder',
        notes: 'Shown as a respected elder in everyday dress — no invented regalia or ceremonial paint.',
        headwear: { keep: 1 }, clothing: { keep: 1 }, necklace: { keep: 1 }, accessories: {} },
      { cultures: ['romani'], label: 'Royalty · Romani “king” or “queen”',
        notes: 'Coin headbands and necklaces, silk headscarves, bright embroidered vests.',
        headwear: { fem: { 'coin-band': 3, headscarf: 2 }, masc: { 'flat-cap': 1, none: 2, 'fur-hat': 1 } },
        clothing: { keep: 2, 'embroidered-tunic': 2, 'open-vest': 1 }, necklace: { coins: 4 }, accessories: {} },
    ],
  });
  R('aristocrat', {
    label: 'Aristocrat',
    notes: 'Old money: top hats, ruffs, pearls and a monocle.',
    headwear: { fem: { none: 3, 'top-hat': 1, circlet: 1 }, masc: { 'top-hat': 2, bowler: 1, none: 2 } },
    clothing: { suit: 3, ruff: 2, 'fur-collar': 1 },
    eyewear: { monocle: 2, none: 3 },
    necklace: { fem: { pearls: 3, locket: 1 }, masc: { none: 3 } },
    accessories: { brooch: 0.3, 'bow-tie': 0.3 },
    palette: [['#16120f', '#2b3a67', '#5a2a6e'], ['#7a1f2b', '#c9a227'], ['#e9dcc0', '#a8302a']],
  });
  R('chef', {
    necklace: { none: 4, keep: 1 },
    headwear: { 'chef-toque': 5, bandana: 1 },
    clothing: { 'chef-jacket': 5, apron: 1 },
    eyewear: { keep: 1 },
    accessories: { 'name-tag': 0.2 },
    palette: [['#f1e6cc'], ['#16120f', '#a8462c'], ['#a8462c', '#2f5f6e']],
  });
  R('baker', {
    headwear: { bandana: 2, 'chef-toque': 1, headscarf: 1, none: 1 },
    clothing: { apron: 5 },
    pattern: { checks: 3, stripes: 1, plain: 1 },
    palette: [['#f1e6cc', '#e9dcc0'], ['#a8462c', '#2f5f6e', '#c99a4b'], ['#2f5f6e', '#a8462c']],
  });
  R('doctor', {
    headwear: { none: 5, 'scrub-cap': 1, keep: 1 },
    clothing: { 'lab-coat': 5 },
    eyewear: { keep: 3, 'round-glasses': 1, 'square-glasses': 1, 'half-moon': 1 },
    accessories: { stethoscope: 0.95, 'id-lanyard': 0.3, 'name-tag': 0.2 },
    palette: [['#f1e6cc'], ['#8fb3c4', '#e9dcc0', '#2f5f6e'], ['#2f5f6e', '#a8462c', '#2b3a67']],
  });
  R('medic', {
    necklace: { none: 4, keep: 1 },
    label: 'Nurse / medic',
    headwear: { 'scrub-cap': 4, none: 2, keep: 1 },
    clothing: { scrubs: 5 },
    pattern: { plain: 2, blossoms: 1, dots: 1, clouds: 1 },
    accessories: { stethoscope: 0.6, 'mask-down': 0.4, 'id-lanyard': 0.35, 'name-tag': 0.3 },
    palette: [['#3c7f86', '#2b3a67', '#5a8a6a', '#7a5a8a'], ['#f1e6cc'], ['#a8462c', '#c99a4b']],
  });
  R('scientist', {
    headwear: { none: 4, keep: 1 },
    clothing: { 'lab-coat': 5 },
    eyewear: { goggles: 3, 'round-glasses': 1, 'square-glasses': 1, keep: 1 },
    accessories: { 'id-lanyard': 0.4, 'name-tag': 0.3 },
    palette: [['#f1e6cc'], ['#2f5f6e', '#8fb3c4', '#c99a4b'], ['#a8462c', '#16120f']],
  });
  R('firefighter', {
    necklace: { none: 4, keep: 1 },
    headwear: { 'fire-helmet': 5, none: 1 },
    clothing: { 'fire-coat': 5 },
    palette: [['#3a3226', '#16120f', '#8f6a2c'], ['#16120f'], ['#a8462c']],
    metals: { silver: 2, brass: 1 },
  });
  R('pilot', {
    necklace: { none: 4, keep: 1 },
    headwear: { 'captain-cap': 3, 'peaked-cap': 1, none: 2 },
    clothing: { 'uniform-shirt': 5 },
    eyewear: { aviators: 3, keep: 2 },
    accessories: { epaulettes: 0.85, headset: 0.25, 'name-tag': 0.2 },
    palette: [['#f1e6cc'], ['#1e2a3c'], ['#1e2a3c', '#16120f']],
    metals: { gold: 3, silver: 1 },
  });
  R('sailor', {
    headwear: { 'sailor-cap': 4, beanie: 1, none: 1 },
    clothing: { 'sailor-collar': 5 },
    palette: [['#f1e6cc'], ['#1e2a3c', '#2b3a67'], ['#a8302a', '#16120f']],
  });
  R('captain', {
    label: 'Sea captain',
    headwear: { 'captain-cap': 5, beanie: 1 },
    clothing: { 'military-tunic': 4, 'fur-collar': 1 },
    accessories: { epaulettes: 0.5 },
    palette: [['#1e2a3c', '#2b3a67'], ['#c9a227', '#f1e6cc'], ['#a8302a']],
    metals: { gold: 1 },
  });
  R('officer', {
    necklace: { none: 4, keep: 1 },
    label: 'Military officer',
    headwear: { 'peaked-cap': 3, beret: 2 },
    clothing: { 'military-tunic': 5 },
    accessories: { medals: 0.75, epaulettes: 0.55, 'royal-sash': 0.08 },
    palette: [['#4f5a3a', '#5a4a2e', '#1e2a3c', '#6b5a44'], ['#7a1f2b', '#2f5f6e'], ['#c9a227', '#a8302a']],
    metals: { gold: 2, brass: 2 },
  });
  R('police', {
    necklace: { none: 4, keep: 1 },
    label: 'Police officer',
    headwear: { 'peaked-cap': 4, none: 1, keep: 1 },
    clothing: { 'uniform-shirt': 5 },
    eyewear: { keep: 3, aviators: 1 },
    accessories: { badge: 0.95, whistle: 0.2, 'name-tag': 0.4 },
    palette: [['#2b3a67', '#1e2a3c', '#8fb3c4'], ['#1e2a3c'], ['#16120f', '#1e2a3c']],
    metals: { silver: 2, gold: 1 },
  });
  R('builder', {
    necklace: { none: 4, keep: 1 },
    headwear: { 'hard-hat': 6 },
    clothing: { 'hi-vis': 4, overalls: 2 },
    eyewear: { goggles: 1, keep: 4 },
    accessories: { 'pencil-ear': 0.5 },
    palette: [['#2f5f6e', '#3a5a8a', '#8f6a2c'], ['#5a6a7a', '#a8462c', '#f1e6cc'], ['#16120f']],
  });
  R('miner', {
    necklace: { none: 4, keep: 1 },
    headwear: { 'miner-helmet': 6 },
    clothing: { overalls: 3, 'hi-vis': 2 },
    eyewear: { goggles: 1, none: 3 },
    palette: [['#3a3226', '#2b3a67'], ['#6b5a44', '#a8462c'], ['#16120f']],
  });
  R('farmer', {
    headwear: { 'straw-hat': 3, 'flat-cap': 2, 'cowboy-hat': 1, keep: 2 },
    clothing: { overalls: 3, crew: 1, keep: 2 },
    pattern: { checks: 3, tartan: 2, plain: 1 },
    palette: [['#3a5a8a', '#6b5a44', '#4f5a3a'], ['#a8462c', '#c99a4b', '#2f5f6e'], ['#f1e6cc', '#16120f']],
  });
  R('rancher', {
    headwear: { 'cowboy-hat': 5, 'straw-hat': 1 },
    clothing: { scarf: 2, crew: 1, vneck: 1, 'fur-collar': 1 },
    pattern: { checks: 3, plain: 1 },
    palette: [['#8f6a2c', '#3a5a8a', '#6b5a44'], ['#a8302a', '#2f5f6e'], ['#f1e6cc', '#16120f']],
  });
  R('artist', {
    headwear: { beret: 4, bandana: 1, keep: 2 },
    clothing: { apron: 2, crew: 1, keep: 2 },
    accessories: { 'paint-smudges': 0.85, 'pencil-ear': 0.25 },
    palette: [['#e9dcc0', '#2f5f6e', '#16120f'], ['#a8302a', '#c99a4b', '#2f5f6e'], ['#c9a227', '#5a2a6e']],
  });
  R('musician', {
    headwear: { keep: 3, beanie: 1, 'baseball-cap': 1 },
    clothing: { hoodie: 2, keep: 2, suit: 1 },
    eyewear: { sunglasses: 1, keep: 3 },
    accessories: { headphones: 0.75 },
  });
  R('photographer', {
    headwear: { keep: 3, 'baseball-cap': 1, beret: 1 },
    clothing: { keep: 2, hoodie: 1, vneck: 1 },
    accessories: { camera: 0.95 },
  });
  R('graduate', {
    headwear: { mortarboard: 6 },
    clothing: { 'academic-gown': 6 },
    palette: [['#16120f'], ['#a8302a', '#2f5f6e', '#c9a227', '#5a2a6e'], ['#c9a227', '#a8302a']],
  });
  R('professor', {
    headwear: { none: 4, keep: 1, 'flat-cap': 1 },
    clothing: { suit: 3, 'academic-gown': 1, turtleneck: 1 },
    eyewear: { 'half-moon': 2, 'round-glasses': 2, 'square-glasses': 1 },
    accessories: { 'bow-tie': 0.35 },
    palette: [['#6b5a44', '#4f5a3a', '#2b3a67'], ['#a8302a', '#c99a4b'], ['#2f5f6e', '#7a1f2b']],
  });
  R('detective', {
    headwear: { fedora: 4, 'flat-cap': 1, bowler: 1 },
    clothing: { 'fur-collar': 2, suit: 3, turtleneck: 1 },
    accessories: { necktie: 0.2 },
    palette: [['#6b5a44', '#3a3226', '#4f5a3a'], ['#e9dcc0', '#8f6a2c'], ['#7a1f2b', '#16120f']],
  });
  R('magician', {
    headwear: { 'top-hat': 5 },
    clothing: { suit: 4, 'fur-collar': 1 },
    accessories: { 'bow-tie': 0.8 },
    palette: [['#16120f'], ['#a8302a', '#5a2a6e'], ['#a8302a', '#c9a227']],
  });
  R('jeweller', {
    label: 'Jeweller / watchmaker',
    headwear: { keep: 3, none: 1 },
    clothing: { apron: 3, vneck: 1, keep: 1 },
    eyewear: { loupe: 6 },
    palette: [['#6b5a44', '#2b3a67'], ['#e9dcc0', '#8fb3c4'], ['#c9a227']],
  });
  R('coach', {
    label: 'Coach / athlete',
    headwear: { 'baseball-cap': 4, none: 2, keep: 1 },
    clothing: { hoodie: 3, crew: 2 },
    accessories: { whistle: 0.7 },
    palette: [['#2b3a67', '#a8302a', '#2f5f6e', '#16120f'], ['#f1e6cc', '#c99a4b'], ['#c99a4b', '#a8302a']],
  });
  R('sea-rover', {
    label: 'Sea rover (pirate)',
    headwear: { bandana: 4, 'cowboy-hat': 1 },
    clothing: { 'sailor-collar': 1, wrap: 1, vneck: 2, ruff: 1 },
    eyewear: { eyepatch: 3, none: 2 },
    earrings: { hoops: 4 },
    accessories: { 'royal-sash': 0.35 },
    palette: [['#e9dcc0', '#a8302a', '#16120f'], ['#a8302a', '#2b3a67'], ['#c9a227', '#16120f']],
    metals: { gold: 1 },
  });

  // ------------------------------------------------------------------ roles that change with culture
  R('musician-trad', {
    label: 'Traditional musician',
    notes: 'A folk player of the old tunes — fiddler, piper or accordionist.',
    headwear: { 'flat-cap': 2, none: 2, keep: 2 }, clothing: { 'embroidered-tunic': 2, vneck: 1, scarf: 1, 'open-vest': 1 },
    pattern: { tartan: 2, 'cross-stitch': 1, plain: 1 },
    variants: [
      { cultures: ['west-african'], label: 'Griot', notes: 'Keeper of songs and genealogies, a kora or balafon player — flowing boubou, kufi, cowries.',
        headwear: { fem: { headwrap: 3, gele: 1 }, masc: { kufi: 3, fila: 2 } }, clothing: { boubou: 4, dashiki: 1 }, pattern: { mudcloth: 2, kente: 1, plain: 1 }, necklace: { cowrie: 3, 'chunky-beads': 1 } },
      { cultures: ['east-african'], label: 'Krar & masenqo player', headwear: { fem: { headwrap: 2, keep: 1 }, masc: { kufi: 2, none: 2 } }, clothing: { wrap: 3, boubou: 1 }, pattern: { 'cross-stitch': 2, 'chevron-bands': 1 }, necklace: { 'bead-collar': 2, none: 1 } },
      { cultures: ['mena'], label: 'Oud player', headwear: { masc: { turban: 2, keffiyeh: 1, kufi: 1 }, fem: { headscarf: 3 } }, clothing: { 'embroidered-tunic': 3, kurta: 1 }, necklace: { coins: 1, none: 2 } },
      { cultures: ['south-asian'], label: 'Classical musician', notes: 'Sitar, tabla or veena — kurta or sari, a turban for the old court styles.',
        headwear: { masc: { turban: 2, none: 2 }, fem: { 'maang-tikka': 1, none: 2 } }, clothing: { fem: { sari: 4 }, masc: { kurta: 4, sherwani: 1 } }, earrings: { fem: { jhumka: 3 } } },
      { cultures: ['east-asian'], label: 'Court & folk musician', notes: 'Guqin, gayageum or shamisen — cross-collar robes and hanbok.',
        headwear: { none: 3, gat: 1 }, clothing: { 'cross-collar': 3, hanbok: 2 }, pattern: { plain: 2, clouds: 1, blossoms: 1 } },
      { cultures: ['southeast-asian'], label: 'Gamelan player', headwear: { headwrap: 2, none: 2 }, clothing: { wrap: 2, 'embroidered-tunic': 1, 'cross-collar': 1 }, pattern: { batik: 4 } },
      { cultures: ['central-asian'], label: 'Dombra player', headwear: { doppa: 3, 'fur-hat': 1 }, clothing: { deel: 3, 'embroidered-tunic': 2 } },
      { cultures: ['andean', 'latin'], label: 'Andean & folk musician', headwear: { chullo: 3, 'straw-hat': 1, 'cowboy-hat': 1 }, clothing: { poncho: 4, scarf: 1 }, pattern: { 'chevron-bands': 3 } },
      { cultures: ['african-diaspora'], label: 'Jazz & blues player', headwear: { fedora: 3, none: 2, beanie: 1 }, clothing: { suit: 4, turtleneck: 1 }, accessories: { 'bow-tie': 0.4 } },
      { cultures: ['caribbean'], label: 'Calypso & steelpan player', headwear: { 'straw-hat': 2, none: 2 }, clothing: { 'graphic-tee': 2, 'open-vest': 1 }, pattern: { blossoms: 2, stripes: 1 } },
      { cultures: ['romani'], label: 'Romani violinist', headwear: { fem: { headscarf: 3 }, masc: { 'flat-cap': 1, none: 2 } }, clothing: { 'open-vest': 2, 'embroidered-tunic': 2 }, necklace: { coins: 2 } },
      { cultures: ['pacific'], label: 'Ukulele & chant leader', headwear: { 'flower-crown': 2, none: 2 }, clothing: { wrap: 2, keep: 2 }, accessories: { 'flower-ear': 0.6 } },
    ],
  });

  R('healer', {
    label: 'Traditional healer',
    notes: 'Herbalist and apothecary — jars, roots and remedies.',
    headwear: { none: 2, headscarf: 1, keep: 2 }, clothing: { apron: 3, 'embroidered-tunic': 1 }, eyewear: { 'round-glasses': 2, keep: 2 },
    variants: [
      { cultures: ['east-asian'], label: 'Herbal doctor', notes: 'Pulse-reading and herbal medicine — scholar’s robe, cap and half-moon spectacles.',
        headwear: { futou: 1, gat: 1, none: 2 }, clothing: { 'cross-collar': 4, mandarin: 1 }, eyewear: { 'half-moon': 2, 'round-glasses': 1, keep: 1 }, facialHair: { masc: { 'long-beard': 2, goatee: 1, keep: 1 } } },
      { cultures: ['south-asian'], label: 'Ayurvedic vaidya', headwear: { masc: { turban: 2, none: 2 }, fem: { none: 3 } }, clothing: { fem: { sari: 3, kurta: 1 }, masc: { kurta: 4 } }, eyewear: { 'round-glasses': 1, keep: 2 } },
      { cultures: ['african'], label: 'Herbalist', notes: 'Roots, barks and leaves — a respected herbal healer, shown without sacred objects.',
        headwear: { fem: { headwrap: 3 }, masc: { kufi: 2, fila: 1, none: 1 } }, clothing: { boubou: 2, wrap: 2, dashiki: 1 }, necklace: { cowrie: 2, beads: 2, 'bead-collar': 1 } },
      { cultures: ['mena'], label: 'Hakim', headwear: { masc: { turban: 3, kufi: 1 }, fem: { headscarf: 3 } }, clothing: { 'embroidered-tunic': 3, bisht: 1 }, eyewear: { 'half-moon': 2, keep: 2 } },
      { cultures: ['andean', 'latin'], label: 'Curandero / curandera', headwear: { chullo: 2, 'straw-hat': 1, headscarf: 1 }, clothing: { poncho: 3, huipil: 1 } },
      { cultures: ['central-asian'], label: 'Steppe herbalist', headwear: { doppa: 2, 'fur-hat': 1 }, clothing: { deel: 3 } },
      { cultures: ['southeast-asian'], label: 'Village herbalist', headwear: { headwrap: 2, 'conical-hat': 1, none: 1 }, clothing: { wrap: 3, 'cross-collar': 1 }, pattern: { batik: 3 } },
      { cultures: ['indigenous-na', 'aboriginal'], label: 'Herbalist', notes: 'Shown in everyday dress — sacred healing roles are not depicted.', headwear: { keep: 1 }, clothing: { keep: 1 } },
    ],
  });

  R('pauper', {
    notes: 'Patched clothes, dirt on the cheek, a tired cap — the poorest folk of any age.',
    headwear: { none: 3, 'flat-cap': 1, headscarf: 1, beanie: 1 }, clothing: { rags: 6 },
    necklace: { none: 1 }, earrings: { none: 1 }, eyewear: { none: 4, keep: 1 }, accessories: { grime: 0.8 },
    palette: [['#8a7a5a', '#6b5a44', '#5a6a5a'], ['#a68a5a', '#7a6a50', '#8a8478'], ['#5a4a3a', '#8a7a5a']],
    variants: [
      { cultures: ['east-asian', 'southeast-asian'], headwear: { 'conical-hat': 3, headwrap: 1, none: 2 } },
      { cultures: ['south-asian'], headwear: { masc: { turban: 2, none: 2 }, fem: { headscarf: 3 } } },
      { cultures: ['african', 'african-diaspora'], headwear: { headwrap: 2, none: 3, beanie: 1 } },
      { cultures: ['mena'], headwear: { keffiyeh: 1, headscarf: 2, none: 2 } },
      { cultures: ['andean'], headwear: { chullo: 3, none: 1 } },
    ],
  });

  R('jester', {
    label: 'Jester / court fool',
    notes: 'Belled cap and motley, licensed to mock the powerful.',
    headwear: { 'jester-cap': 6 }, clothing: { motley: 5, ruff: 1 }, necklace: { none: 1 }, accessories: {},
    pattern: { harlequin: 3, checks: 1 },
    palette: [['#a8302a', '#2f7a3a', '#2b3a67'], ['#c9a227', '#a8302a'], ['#2f7a3a', '#2b3a67', '#5a2a6e']],
    variants: [
      { cultures: ['east-asian'], label: 'Court entertainer', notes: 'Bright robes and a soft cap — the clever fool of the palace.',
        headwear: { futou: 1, beanie: 1, none: 1 }, clothing: { 'cross-collar': 4 }, pattern: { harlequin: 2, checks: 2 } },
      { cultures: ['south-asian'], label: 'Vidushaka (court wit)', notes: 'The witty companion of the king in classical drama — bright turban and kurta.',
        headwear: { turban: 4 }, clothing: { kurta: 4 }, pattern: { harlequin: 2, stripes: 1 }, earrings: { masc: { studs: 1, hoops: 1 } } },
      { cultures: ['mena', 'central-asian'], label: 'Court wit', notes: 'Big turban, patched bright robe — the wise fool of the old tales.',
        headwear: { turban: 4, doppa: 1 }, clothing: { 'embroidered-tunic': 3, motley: 1 }, pattern: { harlequin: 2, 'cross-stitch': 1 } },
      { cultures: ['african'], label: 'Court praise-singer & jester', headwear: { fila: 3, kufi: 1 }, clothing: { dashiki: 3, motley: 1 }, pattern: { kente: 2, harlequin: 1 } },
    ],
  });

  R('rockstar', {
    notes: 'Leather, chains, shades and a guitar strap.',
    headwear: { none: 5, bandana: 1, 'top-hat': 0.4, beanie: 0.5 },
    clothing: { 'leather-jacket': 4, 'open-vest': 1, 'graphic-tee': 2 },
    hairStyle: { keep: 3, mullet: 1, spiky: 1, long: 1, undercut: 1, mohawk: 1 },
    eyewear: { sunglasses: 2, aviators: 1, keep: 2 },
    necklace: { 'chain-link': 2, 'dog-tags': 1, none: 1 },
    earrings: { hoops: 2, studs: 2, keep: 1 },
    accessories: { 'guitar-strap': 0.7 },
    palette: [['#16120f', '#5a2a6e'], ['#f1e6cc', '#a8302a', '#16120f'], ['#a8302a', '#c9a227']],
    metals: { silver: 3, gold: 1 },
  });

  R('scholar', {
    notes: 'A learned reader of old books.',
    headwear: { none: 3, 'flat-cap': 1 }, clothing: { suit: 2, turtleneck: 1, 'academic-gown': 1 }, eyewear: { 'round-glasses': 2, 'half-moon': 1, keep: 1 },
    variants: [
      { cultures: ['east-asian'], label: 'Seonbi / literati scholar', notes: 'White scholar’s robe and a horsehair gat or winged cap.',
        headwear: { gat: 3, futou: 1 }, clothing: { 'cross-collar': 3, hanbok: 1 }, palette: [['#f1e6cc', '#e9dcc0'], ['#2b3a67', '#16120f'], ['#16120f']] },
      { cultures: ['south-asian'], label: 'Pandit / scholar', headwear: { masc: { turban: 2, none: 2 }, fem: { none: 2 } }, clothing: { fem: { sari: 3, kurta: 1 }, masc: { kurta: 4 } } },
      { cultures: ['mena'], label: 'Scholar of the old schools', headwear: { masc: { turban: 3, kufi: 1 }, fem: { headscarf: 3 } }, clothing: { bisht: 2, 'embroidered-tunic': 2 } },
      { cultures: ['african'], label: 'Timbuktu-style scholar', headwear: { masc: { turban: 2, kufi: 2 }, fem: { headwrap: 3 } }, clothing: { boubou: 4 } },
    ],
  });

  R('knight', {
    label: 'Knight / guard',
    notes: 'Plate armour over a padded tunic.',
    headwear: { none: 4, keep: 1 }, clothing: { armour: 6 }, necklace: { none: 1 }, earrings: { none: 2, keep: 1 },
    palette: [['#2b3a67', '#7a1f2b', '#4f5a3a'], ['#a8302a', '#2b3a67', '#c9a227'], ['#c9a227']],
  });
})(window.PM = window.PM || {});
