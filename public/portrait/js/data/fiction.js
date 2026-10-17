/* Fiction: fan-art presets for characters from books, shows, anime, comics and games.
 *
 * Add a character:
 *   PM.define('fiction', 'my-hero', {
 *     franchise: 'My Show',               // groups the list on the Fiction tab
 *     label: 'My Hero',
 *     notes: 'One line about the look.',
 *     base: { archetype: 'northern-european', gender: 'masc', age: 0.3 },   // what the generator starts from
 *     look: { hairStyle: 'spiky', hairColor: '#e8c440', eyeColor: '#3a6fd0', clothing: 'track-jacket', … },
 *   });
 * `look` can set ANY genome key — knobs (faceWidth, smile…), selects, colours, marks, accessories,
 * an expression preset (expression: 'smug'), plus a few extras: hairColor2 (two-tone hair),
 * emblem / capeColor / maskColor (superhero suits), scarSide (1 = viewer's right).
 * Anything not in `look` is rolled from the heritage, so "Variation" gives the same character
 * with a slightly different face.
 *
 * Whole packs (e.g. written by an LLM from PM.fictionPrompt()) go through PM.registerFictionPack —
 * the Fiction tab's "Add a character pack" button does that and remembers them in this browser. */
(function (PM) {
  'use strict';
  const F = (id, def) => PM.define('fiction', id, def);
  const franchise = (id, notes) => PM.define('franchises', id, { label: id, notes });
  const plain = { pattern: 'plain', headwear: 'none', facialHair: 'none', earrings: 'none', necklace: 'none', eyewear: 'none', marks: [], accessories: [], shade: 0, role: 'everyday' };
  const look = o => Object.assign({}, plain, o);
  // anime faces: big eyes, tiny nose, light features
  const ANIME = { eyeSize: 1.14, irisSize: 1.05, noseStyle: 'minimal', noseWidth: 0.8, lipFull: 0.5, jaw: 0.74, chin: 0.2, faceWidth: 0.95, skin: '#f2d6bf', lashes: 0.2 };
  const HANDSOME = { faceLength: 1.07, faceWidth: 0.92, jaw: 0.73, chin: 0.18, chinSquare: 0.25, cheek: 1.0, noseStyle: 'straight', noseWidth: 0.82, lipFull: 0.45, browThick: 0.85, neckLength: 1.2, eyeShape: 'almond' };
  const BEAUTY = { faceWidth: 0.93, jaw: 0.7, chin: 0.17, chinSquare: 0.05, eyeSize: 1.16, eyeShape: 'almond', lashes: 0.8, lipFull: 0.95, cupid: 0.7, noseStyle: 'button', noseWidth: 0.78, cheek: 1.04, browArch: 0.6, browThick: 0.75 };
  const anime = o => look(Object.assign({}, ANIME, o));

  // ================================================================== ANIME
  franchise('Jujutsu Kaisen', 'Sorcerers in dark high-collared uniforms.');
  const jjk = (id, label, notes, base, o) => F(id, { franchise: 'Jujutsu Kaisen', label, notes, base, look: anime(o) });
  jjk('gojo', 'Satoru Gojo', 'Tall, striking and cocky — white hair spiked up, blindfold over the eyes, dark high-collared uniform.', { archetype: 'east-asian', gender: 'masc', age: 0.3 },
    Object.assign({}, HANDSOME, { hairStyle: 'spiky-up', hairColor: '#f2f1ee', hairVolume: 1.45, skin: '#f4e0d0', eyeColor: '#6fc4ea', eyewear: 'blindfold', clothing: 'gakuran', cloth1: '#1d2233', cloth2: '#1d2233', cloth3: '#16120f', metal: '#c9cdd1', smile: 0.3, expression: 'smug', smirk: 0.5, exprSmile: 0.2 }));
  jjk('yuji', 'Yuji Itadori', 'Pink spiky hair with dark roots, big grin, dark uniform with a red hood.', { archetype: 'east-asian', gender: 'masc', age: 0.12 },
    { hairStyle: 'spiky', hairColor: '#e8949a', hairVolume: 0.8, skin: '#f0d2b8', eyeColor: '#7a4a2a', clothing: 'gakuran', cloth1: '#202638', cloth2: '#a8302a', cloth3: '#16120f', metal: '#c9a227', smile: 0.55 });
  jjk('megumi', 'Megumi Fushiguro', 'Black spiky hair, cool stare, dark uniform.', { archetype: 'east-asian', gender: 'masc', age: 0.12 },
    Object.assign({}, HANDSOME, { hairStyle: 'wild-spikes', hairColor: '#151a26', hairVolume: 0.75, skin: '#f2d9c6', eyeColor: '#2f5f6e', clothing: 'gakuran', cloth1: '#1d2233', cloth2: '#1d2233', cloth3: '#16120f', metal: '#c9a227', smile: -0.15 }));
  jjk('nobara', 'Nobara Kugisaki', 'Orange bob, confident smirk, dark uniform.', { archetype: 'east-asian', gender: 'fem', age: 0.12 },
    { hairStyle: 'bob', hairColor: '#d0702a', eyeColor: '#6b4423', lashes: 0.6, clothing: 'gakuran', cloth1: '#1d2233', cloth2: '#1d2233', cloth3: '#16120f', metal: '#c9a227', smile: 0.2, smirk: 0.5 });

  franchise('My Hero Academia', 'Hero students in grey blazers.');
  const mha = (id, label, notes, base, o) => F(id, { franchise: 'My Hero Academia', label, notes, base, look: anime(Object.assign({ clothing: 'suit', cloth1: '#7d828a', cloth2: '#f1e6cc', cloth3: '#a8302a' }, o)) });
  mha('midoriya', 'Izuku Midoriya', 'Messy dark-green curls, freckles, big round eyes, grey school blazer and red tie.', { archetype: 'east-asian', gender: 'masc', age: 0.08 },
    { hairStyle: 'messy', hairColor: '#2e6a3a', hairVolume: 1.2, hairTexture: 3, eyeColor: '#3a8a4a', eyeShape: 'round', eyeSize: 1.22, irisSize: 1.15, marks: ['freckles'], smile: 0.3 });
  mha('bakugo', 'Katsuki Bakugo', 'Ash-blond explosive spikes, red eyes, permanent scowl.', { archetype: 'east-asian', gender: 'masc', age: 0.08 },
    { hairStyle: 'wild-spikes', hairColor: '#e2d8a8', hairVolume: 1.1, eyeColor: '#b3302a', eyeShape: 'narrow', expression: 'angry', browFurrow: 0.85, exprSmile: -0.6, browLift: -0.5 });
  mha('todoroki', 'Shoto Todoroki', 'Hair split white and red down the middle, burn scar around the left eye, calm face.', { archetype: 'east-asian', gender: 'masc', age: 0.08 },
    Object.assign({}, HANDSOME, { hairStyle: 'side-part', hairPart: 0, hairColor: '#eeece8', hairColor2: '#c0443a', eyeColor: '#6f8794', marks: ['burn-scar'], scarSide: 1, smile: -0.1, clothing: 'suit', cloth1: '#7d828a', cloth2: '#f1e6cc', cloth3: '#a8302a' }));
  mha('uraraka', 'Ochaco Uraraka', 'Brown bob with long side locks, rosy cheeks, big smile.', { archetype: 'east-asian', gender: 'fem', age: 0.08 },
    { hairStyle: 'bob-bangs', hairColor: '#6b4428', eyeColor: '#6b4428', eyeShape: 'round', eyeSize: 1.2, lashes: 0.5, marks: ['blush'], smile: 0.6 });

  franchise('Naruto', 'Ninja of the Hidden Leaf — headbands with metal plates.');
  const nar = (id, label, notes, base, o) => F(id, { franchise: 'Naruto', label, notes, base, look: anime(Object.assign({ headwear: 'forehead-protector' }, o)) });
  nar('naruto', 'Naruto Uzumaki', 'Spiky yellow hair, whisker marks, ninja headband, orange-and-black track jacket.', { archetype: 'east-asian', gender: 'masc', age: 0.1 },
    { hairStyle: 'spiky', hairColor: '#f2c832', hairVolume: 1.15, eyeColor: '#3a74c6', eyeShape: 'round', skin: '#efc9a2', marks: ['whiskers'], clothing: 'track-jacket', cloth1: '#ee7a22', cloth2: '#16120f', cloth3: '#2b3a67', smile: 0.6 });
  nar('sasuke', 'Sasuke Uchiha', 'Black hair swept back in spikes, cool dark eyes, high collar.', { archetype: 'east-asian', gender: 'masc', age: 0.1 },
    Object.assign({}, HANDSOME, { hairStyle: 'swept-spikes', hairColor: '#1a1d2a', skin: '#f4e0d0', eyeColor: '#16120f', clothing: 'mandarin', cloth1: '#2b3a67', cloth2: '#16120f', cloth3: '#2b3a67', smile: -0.2 }));
  nar('sakura', 'Sakura Haruno', 'Bright pink bob, green eyes, headband worn as a hairband, red top.', { archetype: 'east-asian', gender: 'fem', age: 0.1 },
    { hairStyle: 'bob', hairColor: '#ff8ac4', eyeColor: '#3aa04a', forehead: 1.2, lashes: 0.6, clothing: 'mandarin', cloth1: '#c42f3a', cloth2: '#f1e6cc', cloth3: '#ff8ac4', smile: 0.3 });
  nar('kakashi', 'Kakashi Hatake', 'Silver hair swept to one side, face mask pulled up, headband, green field vest.', { archetype: 'east-asian', gender: 'masc', age: 0.35 },
    Object.assign({}, HANDSOME, { hairStyle: 'swept-spikes', hairColor: '#d4d7da', hairVolume: 1.2, eyeColor: '#16120f', lidDroop: 0.4, accessories: ['mask-up'], clothing: 'field-jacket', cloth1: '#4f6a3a', cloth2: '#2b3a67', cloth3: '#1d2233' }));
  nar('itachi', 'Itachi Uchiha', 'Long black hair tied low, lines under the eyes, dark cloak.', { archetype: 'east-asian', gender: 'masc', age: 0.22 },
    Object.assign({}, HANDSOME, { hairStyle: 'ponytail', hairColor: '#16120f', eyeColor: '#b3302a', marks: ['tear-lines'], clothing: 'gakuran', cloth1: '#16120f', cloth2: '#a8302a', cloth3: '#16120f', metal: '#a8302a' }));

  franchise('Attack on Titan', 'Scouts in short tan jackets and leather harness.');
  const aot = (id, label, notes, base, o) => F(id, { franchise: 'Attack on Titan', label, notes, base, look: anime(Object.assign({ clothing: 'field-jacket', cloth1: '#b08a5a', cloth2: '#4a3020', cloth3: '#16120f' }, o)) });
  aot('eren', 'Eren Yeager', 'Brown hair, fierce green eyes, tan field jacket over a white shirt and harness.', { archetype: 'northern-european', gender: 'masc', age: 0.12 },
    Object.assign({}, HANDSOME, { hairStyle: 'half-up', hairColor: '#4a3020', hairLength: 0.6, eyeColor: '#3f8f6a', expression: 'determined', browFurrow: 0.55, exprSmile: -0.3, browLift: -0.3, squint: 0.35 }));
  aot('mikasa', 'Mikasa Ackerman', 'Short black hair, calm grey eyes, red scarf.', { archetype: 'east-asian', gender: 'fem', age: 0.12, mixWith: 'northern-european', mix: 0.35 },
    { hairStyle: 'bob', hairColor: '#16120f', eyeColor: '#6f7a80', lashes: 0.5, clothing: 'scarf', cloth2: '#b3302a', cloth3: '#b3302a', smile: -0.1 });
  aot('levi', 'Levi Ackerman', 'Black undercut, narrow tired eyes, field jacket.', { archetype: 'northern-european', gender: 'masc', age: 0.3 },
    Object.assign({}, HANDSOME, { hairStyle: 'undercut', hairColor: '#16120f', eyeColor: '#6f7a80', eyeShape: 'narrow', lidDroop: 0.35, smile: -0.25 }));
  aot('armin', 'Armin Arlert', 'Blond bob, big blue eyes, field jacket.', { archetype: 'northern-european', gender: 'masc', age: 0.1 },
    { hairStyle: 'bob', hairColor: '#e8cc84', eyeColor: '#4a84c6', eyeShape: 'round', eyeSize: 1.2 });

  franchise('One Piece', 'Pirates of the Grand Line.');
  const op = (id, label, notes, base, o) => F(id, { franchise: 'One Piece', label, notes, base, look: anime(o) });
  op('luffy', 'Monkey D. Luffy', 'Lean and wiry — straw hat, scar under the left eye, huge grin, open red vest.', { archetype: 'east-asian', gender: 'masc', age: 0.15 },
    { hairStyle: 'messy', hairColor: '#16120f', hairVolume: 0.8, eyeColor: '#16120f', eyeShape: 'round', faceWidth: 0.88, cheek: 0.96, jaw: 0.7, chin: 0.2, shoulders: 0.9, neckWidth: 0.85, skin: '#efcfae', marks: ['cheek-scar'], headwear: 'straw-hat', clothing: 'open-vest', cloth1: '#c42f2a', cloth2: '#a8302a', cloth3: '#c9a227', exprSmile: 1, mouthOpen: 0.45, squint: 0.3 });
  op('zoro', 'Roronoa Zoro', 'Short green hair, three gold drop earrings, white shirt, stern look.', { archetype: 'east-asian', gender: 'masc', age: 0.2 },
    Object.assign({}, HANDSOME, { hairStyle: 'short-crop', hairColor: '#3f8a3a', eyeColor: '#16120f', earrings: 'drops', metal: '#d4a531', clothing: 'crew', cloth1: '#f1e6cc', browFurrow: 0.4, smile: -0.2 }));
  op('nami', 'Nami', 'Long orange hair, brown eyes, bright smile.', { archetype: 'east-asian', gender: 'fem', age: 0.18 },
    Object.assign({}, BEAUTY, { hairStyle: 'long', hairColor: '#e0702a', eyeColor: '#6b4423', noseStyle: 'minimal', clothing: 'bare', cloth1: '#3a74c6', earrings: 'studs', smile: 0.5 }));

  franchise('Dragon Ball', 'Martial artists in orange gi.');
  F('goku', { franchise: 'Dragon Ball', label: 'Son Goku', notes: 'Huge black spikes, cheerful face, orange gi with blue undershirt.', base: { archetype: 'east-asian', gender: 'masc', age: 0.25 },
    look: anime({ hairStyle: 'wild-spikes', hairColor: '#16120f', hairVolume: 1.45, eyeColor: '#16120f', eyeShape: 'round', jaw: 0.82, clothing: 'cross-collar', cloth1: '#ee7a22', cloth2: '#2b3a67', cloth3: '#2b3a67', smile: 0.5 }) });

  franchise('Demon Slayer', 'Taishō-era swordsmen in haori.');
  F('tanjiro', { franchise: 'Demon Slayer', label: 'Tanjiro Kamado', notes: 'Burgundy hair, scar on the brow, hanafuda disc earrings, green-and-black checked haori.', base: { archetype: 'east-asian', gender: 'masc', age: 0.1 },
    look: anime({ hairStyle: 'spiky', hairColor: '#7a2a24', hairVolume: 0.85, eyeColor: '#9a2a24', marks: ['brow-scar'], earrings: 'big-disc', clothing: 'cross-collar', pattern: 'checks', cloth1: '#2f7a3a', cloth2: '#16120f', cloth3: '#16120f', smile: 0.3 }) });
  F('nezuko', { franchise: 'Demon Slayer', label: 'Nezuko Kamado', notes: 'Long black hair, big pink eyes, pale skin, pink kimono.', base: { archetype: 'east-asian', gender: 'fem', age: 0.1 },
    look: anime({ hairStyle: 'long', hairColor: '#1a1416', hairLength: 1.4, skin: '#f6e2d4', eyeColor: '#e07aa0', eyeShape: 'round', eyeSize: 1.22, lashes: 0.6, faceWidth: 0.92, jaw: 0.7, clothing: 'cross-collar', pattern: 'checks', cloth1: '#f2a6c2', cloth2: '#f1e6cc', cloth3: '#a8302a' }) });

  // ================================================================== AVATAR: THE LAST AIRBENDER
  franchise('Avatar: The Last Airbender', 'The four nations — air, water, earth and fire.');
  const atla = (id, label, notes, base, o) => F(id, { franchise: 'Avatar: The Last Airbender', label, notes, base, look: anime(o) });
  atla('aang', 'Aang', 'Bald monk with a blue arrow tattoo, grey eyes, yellow-and-orange robes, a big kid grin.', { archetype: 'east-asian', gender: 'masc', age: 0.06 },
    { hairStyle: 'bald', eyeColor: '#7b8a90', eyeShape: 'round', marks: ['air-arrow'], clothing: 'wrap', cloth1: '#e8a23a', cloth2: '#e07a2a', cloth3: '#c9a227', exprSmile: 0.8 });
  atla('katara', 'Katara', 'Long brown hair with hair loopies, blue eyes, blue water-tribe dress, her mother’s choker.', { archetype: 'indigenous-north-america', gender: 'fem', age: 0.08 },
    Object.assign({}, BEAUTY, { hairStyle: 'loopies', hairColor: '#3a2618', eyeColor: '#3a74c6', noseStyle: 'minimal', skin: '#b98258', clothing: 'cross-collar', cloth1: '#2f5f8e', cloth2: '#8fb3c4', cloth3: '#2f5f8e', necklace: 'choker', metal: '#3a74c6', smile: 0.3 }));
  atla('sokka', 'Sokka', 'Wolf-tail topknot with shaved sides, blue eyes, blue water-tribe tunic.', { archetype: 'indigenous-north-america', gender: 'masc', age: 0.1 },
    { hairStyle: 'wolf-tail', hairColor: '#3a2618', eyeColor: '#3a74c6', skin: '#b98258', clothing: 'cross-collar', cloth1: '#2f5f8e', cloth2: '#f1e6cc', cloth3: '#16120f', exprSmile: 0.3, smirk: 0.5 });
  atla('zuko', 'Zuko', 'Shaggy black hair, golden eyes, burn scar around his left eye, red-and-black Fire Nation tunic.', { archetype: 'east-asian', gender: 'masc', age: 0.13 },
    Object.assign({}, HANDSOME, { hairStyle: 'side-part', hairColor: '#16120f', eyeColor: '#c9a227', skin: '#f4e0d0', marks: ['burn-scar'], scarSide: 1, clothing: 'cross-collar', cloth1: '#a8302a', cloth2: '#16120f', cloth3: '#c9a227', browFurrow: 0.35, smile: -0.2 }));
  atla('toph', 'Toph Beifong', 'Pale unseeing eyes, black hair in a bun with a headband, green-and-yellow earth-kingdom clothes.', { archetype: 'east-asian', gender: 'fem', age: 0.05 },
    { hairStyle: 'bun-top', hairColor: '#16120f', eyeColor: '#d9dedb', irisSize: 0.9, headwear: 'bead-band', clothing: 'cross-collar', cloth1: '#4f7a3a', cloth2: '#d9b84a', cloth3: '#d9b84a', smirk: 0.6, exprSmile: 0.2 });
  atla('iroh', 'Uncle Iroh', 'Grey topknot, big grey beard, warm smile, maroon robes.', { archetype: 'east-asian', gender: 'masc', age: 0.78 },
    { hairStyle: 'bun-top', hairColor: '#b9b5ad', facialHair: 'long-beard', eyeColor: '#c9a227', faceWidth: 1.12, jaw: 0.9, cheek: 1.06, noseStyle: 'broad', clothing: 'cross-collar', cloth1: '#7a2a24', cloth2: '#c9a227', cloth3: '#5a4a2e', exprSmile: 0.6, squint: 0.3 });
  atla('azula', 'Azula', 'Black hair in a topknot crown, golden eyes, a cold smile, red Fire Nation robes.', { archetype: 'east-asian', gender: 'fem', age: 0.12 },
    Object.assign({}, BEAUTY, { hairStyle: 'bun-top', hairColor: '#16120f', eyeColor: '#c9a227', noseStyle: 'minimal', headwear: 'topknot-crown', clothing: 'cross-collar', cloth1: '#a8302a', cloth2: '#16120f', cloth3: '#c9a227', metal: '#d4a531', expression: 'smug', smirk: 0.85, lidDroop: 0.4, exprSmile: 0.4 }));
  atla('suki', 'Suki', 'Kyoshi warrior: white face paint with red around the eyes, short auburn-brown hair, green armour.', { archetype: 'east-asian', gender: 'fem', age: 0.12 },
    { hairStyle: 'bob', hairColor: '#5a3020', eyeColor: '#6b4423', marks: ['kyoshi-paint'], headwear: 'circlet', clothing: 'armour', cloth1: '#4f7a3a', cloth2: '#4f7a3a', metal: '#c9a227' });

  // ================================================================== INVINCIBLE
  franchise('Invincible', 'Viltrumites and the heroes of Earth.');
  const inv = (id, label, notes, base, o) => F(id, { franchise: 'Invincible', label, notes, base, look: look(o) });
  inv('mark-grayson', 'Mark Grayson (Invincible)', 'Yellow suit with blue shoulders, blue cowl with white lenses.', { archetype: 'american', gender: 'masc', age: 0.13, mixWith: 'east-asian', mix: 0.4 },
    Object.assign({}, HANDSOME, { headwear: 'cowl', maskColor: '#2b4a8a', clothing: 'hero-suit', cloth1: '#f0c43a', cloth2: '#2b4a8a', cloth3: '#2b4a8a', emblem: 'i', smile: 0.2 }));
  inv('omni-man', 'Nolan Grayson (Omni-Man)', 'Big black mustache, grey-streaked hair, white suit with a red cape.', { archetype: 'american', gender: 'masc', age: 0.55 },
    { hairStyle: 'side-part', hairColor: '#3a3632', facialHair: 'mustache', faceWidth: 1.12, faceLength: 1.06, jaw: 0.98, chin: 0.4, chinSquare: 0.8, browThick: 1.6, eyeColor: '#4a74a0', clothing: 'hero-suit', cloth1: '#eeece8', cloth2: '#eeece8', cloth3: '#b3302a', accessories: ['cape'], capeColor: '#b3302a', emblem: 'none', smile: -0.1 });
  inv('atom-eve', 'Samantha Wilkins (Atom Eve)', 'Red hair, pink suit with a white collar.', { archetype: 'american', gender: 'fem', age: 0.13 },
    Object.assign({}, BEAUTY, { hairStyle: 'shoulder', hairColor: '#b8401e', eyeColor: '#4b6b3a', marks: ['freckles'], clothing: 'hero-suit', cloth1: '#e0569a', cloth2: '#e0569a', cloth3: '#f1e6cc', emblem: 'circle', smile: 0.3 }));
  inv('debbie', 'Debbie Grayson', 'Blonde bob, warm worried eyes, cardigan.', { archetype: 'american', gender: 'fem', age: 0.45 },
    { hairStyle: 'bob', hairColor: '#d8b870', eyeColor: '#4a74a0', clothing: 'vneck', cloth1: '#3c7f86', cloth2: '#f1e6cc', expression: 'sad', browRaise: 0.6, exprSmile: -0.2 });

  // ================================================================== THE BOYS
  franchise('The Boys', 'Vought’s Seven and the people trying to stop them.');
  const tb = (id, label, notes, base, o) => F(id, { franchise: 'The Boys', label, notes, base, look: look(o) });
  tb('homelander', 'Homelander', 'Slicked blond hair, a too-wide smile, blue suit with gold eagle shoulders and a flag cape.', { archetype: 'american', gender: 'masc', age: 0.38 },
    Object.assign({}, HANDSOME, { hairStyle: 'side-part', hairColor: '#d8b870', eyeColor: '#4a74a0', clothing: 'hero-suit', cloth1: '#2b4a8a', cloth2: '#2b4a8a', cloth3: '#c9a227', emblem: 'none', accessories: ['cape', 'epaulettes'], capeColor: '#b3302a', metal: '#d4a531', exprSmile: 0.7, lidDroop: 0.25, smirk: 0.2 }));
  tb('butcher', 'Billy Butcher', 'Dark hair, thick beard, long black coat, a dangerous grin.', { archetype: 'british', gender: 'masc', age: 0.45 },
    { hairStyle: 'short-crop', hairColor: '#2a1f18', facialHair: 'full-beard', eyeColor: '#3a2a1f', clothing: 'leather-jacket', cloth1: '#16120f', cloth2: '#3a3226', faceWidth: 1.05, jaw: 0.9, expression: 'smug', smirk: 0.8, lidDroop: 0.35, exprSmile: 0.35 });
  tb('hughie', 'Hughie Campbell', 'Curly brown hair, nervous face, hoodie.', { archetype: 'british', gender: 'masc', age: 0.22 },
    { hairStyle: 'curly-shoulder', hairColor: '#5c3f2b', hairTexture: 3, hairLength: 0.5, eyeColor: '#4a74a0', clothing: 'hoodie', cloth1: '#4f5a3a', expression: 'embarrassed', browRaise: 0.7, exprSmile: 0.1, sweat: 0.6 });
  tb('starlight', 'Annie January (Starlight)', 'Long blonde hair, white suit with a blue star.', { archetype: 'american', gender: 'fem', age: 0.18 },
    Object.assign({}, BEAUTY, { hairStyle: 'long', hairColor: '#e2c47a', eyeColor: '#6b4423', clothing: 'hero-suit', cloth1: '#eceef2', cloth2: '#2b4a8a', cloth3: '#c9a227', emblem: 'star', smile: 0.3 }));
  tb('queen-maeve', 'Queen Maeve', 'Auburn waves, tired eyes, warrior armour.', { archetype: 'american', gender: 'fem', age: 0.38 },
    Object.assign({}, BEAUTY, { hairStyle: 'curly-shoulder', hairColor: '#7a3a1e', eyeColor: '#4b6b3a', clothing: 'armour', cloth1: '#7a1f2b', cloth2: '#7a1f2b', metal: '#c9a227', headwear: 'circlet', lidDroop: 0.3, smile: -0.2 }));
  tb('a-train', 'A-Train', 'Short fade, speedster suit in blue and red with a lightning bolt.', { archetype: 'african-american', gender: 'masc', age: 0.25 },
    Object.assign({}, HANDSOME, { hairStyle: 'fade', hairColor: '#16120f', clothing: 'hero-suit', cloth1: '#2b4a8a', cloth2: '#b3302a', cloth3: '#f0c43a', emblem: 'bolt', smile: 0.2 }));
  tb('kimiko', 'Kimiko Miyashiro', 'Black bob with bangs, dark watchful eyes, dark jacket.', { archetype: 'east-asian', gender: 'fem', age: 0.2 },
    { hairStyle: 'bob-bangs', hairColor: '#16120f', eyeColor: '#2e1c12', clothing: 'leather-jacket', cloth1: '#2b2f35', cloth2: '#16120f', smile: -0.1 });
  tb('frenchie', 'Frenchie', 'Beanie, curly dark hair, stubble, leather jacket.', { archetype: 'southern-european', gender: 'masc', age: 0.32 },
    { hairStyle: 'curly-shoulder', hairColor: '#2a1f18', hairLength: 0.5, facialHair: 'stubble', headwear: 'beanie', clothing: 'leather-jacket', cloth1: '#3a3226', cloth2: '#6b5a44', smirk: 0.4 });
  tb('mothers-milk', 'Mother’s Milk', 'Close fade, neat beard, serious suit.', { archetype: 'african-american', gender: 'masc', age: 0.42 },
    { hairStyle: 'fade', hairColor: '#16120f', facialHair: 'short-beard', clothing: 'suit', cloth1: '#2b2f35', cloth2: '#f1e6cc', cloth3: '#16120f', browFurrow: 0.3, smile: -0.2 });
  tb('the-deep', 'The Deep', 'Swept dark hair, green scaled suit.', { archetype: 'american', gender: 'masc', age: 0.32 },
    Object.assign({}, HANDSOME, { hairStyle: 'quiff', hairColor: '#2a1f18', clothing: 'hero-suit', pattern: 'waves', cloth1: '#2f6a5a', cloth2: '#1f4a40', cloth3: '#c9a227', emblem: 'circle', exprSmile: 0.5 }));

  // ================================================================== GAME OF THRONES
  franchise('Game of Thrones', 'The great houses of Westeros and beyond.');
  const got = (id, label, notes, base, o) => F(id, { franchise: 'Game of Thrones', label, notes, base, look: look(o) });
  got('jon-snow', 'Jon Snow', 'Dark curls, short beard, grey eyes, black furs of the Night’s Watch.', { archetype: 'british', gender: 'masc', age: 0.28 },
    Object.assign({}, HANDSOME, { hairStyle: 'curly-shoulder', hairColor: '#1d1612', hairTexture: 3, hairLength: 0.7, eyeColor: '#5a5f63', facialHair: 'short-beard', clothing: 'fur-collar', cloth1: '#16120f', cloth2: '#16120f', smile: -0.3, browRaise: 0.3 }));
  got('daenerys', 'Daenerys Targaryen', 'Long platinum hair, violet eyes, delicate features, pale blue gown.', { archetype: 'northern-european', gender: 'fem', age: 0.18 },
    Object.assign({}, BEAUTY, { hairStyle: 'long', hairColor: '#f2ead2', hairLength: 1.3, skin: '#f5e2d4', eyeColor: '#7a62a8', clothing: 'vneck', cloth1: '#9fb6c8', cloth2: '#6a7f94', necklace: 'medallion', metal: '#c9cdd1', marks: ['blush'], smile: 0.15 }));
  got('tyrion', 'Tyrion Lannister', 'Fair wavy hair, short beard, Lannister crimson and gold.', { archetype: 'british', gender: 'masc', age: 0.4 },
    { hairStyle: 'short-crop', hairColor: '#a8874f', hairTexture: 2, eyeColor: '#4b6b3a', facialHair: 'short-beard', clothing: 'military-tunic', cloth1: '#7a1f2b', cloth2: '#c9a227', metal: '#d4a531', accessories: ['brooch'], smirk: 0.6, exprSmile: 0.25 });
  got('cersei', 'Cersei Lannister', 'Golden hair, green eyes, a crown and crimson robes.', { archetype: 'british', gender: 'fem', age: 0.42 },
    Object.assign({}, BEAUTY, { hairStyle: 'shoulder', hairColor: '#d8b870', eyeColor: '#4b6b3a', headwear: 'crown', clothing: 'royal-robe', cloth1: '#16120f', cloth2: '#7a1f2b', cloth3: '#c9a227', metal: '#d4a531', expression: 'smug', smirk: 0.6, lidDroop: 0.35 }));
  got('arya', 'Arya Stark', 'Brown hair half up, grey eyes, plain grey tunic.', { archetype: 'british', gender: 'fem', age: 0.07 },
    { hairStyle: 'half-up', hairColor: '#4a3020', eyeColor: '#5a5f63', clothing: 'crew', cloth1: '#6f6a62', browFurrow: 0.3, smile: -0.1 });
  got('sansa', 'Sansa Stark', 'Auburn hair, blue eyes, grey furs and a chain choker.', { archetype: 'british', gender: 'fem', age: 0.18 },
    Object.assign({}, BEAUTY, { hairStyle: 'long', hairColor: '#9a401e', eyeColor: '#4a74a0', clothing: 'fur-collar', cloth1: '#4a4f55', cloth2: '#2b2f35', necklace: 'choker', metal: '#c9cdd1' }));
  got('ned-stark', 'Eddard Stark', 'Long dark hair, full beard, grey eyes, northern furs.', { archetype: 'british', gender: 'masc', age: 0.5 },
    { hairStyle: 'shoulder', hairColor: '#3a2a1f', eyeColor: '#5a5f63', facialHair: 'full-beard', clothing: 'fur-collar', cloth1: '#4a3a2a', cloth2: '#2b2f35', smile: -0.2, browRaise: 0.3 });
  got('brienne', 'Brienne of Tarth', 'Short fair hair, blue eyes, plate armour.', { archetype: 'northern-european', gender: 'fem', age: 0.3 },
    { hairStyle: 'short-crop', hairColor: '#c9a86a', eyeColor: '#4a74a0', faceWidth: 1.08, jaw: 0.9, clothing: 'armour', cloth1: '#2b3a67', cloth2: '#2b3a67', marks: ['freckles'] });
  got('joffrey', 'Joffrey Baratheon', 'Golden hair, a crown, a smirk, crimson and gold.', { archetype: 'british', gender: 'masc', age: 0.07 },
    { hairStyle: 'short-crop', hairColor: '#d8b870', eyeColor: '#4b6b3a', headwear: 'crown', clothing: 'military-tunic', cloth1: '#7a1f2b', cloth2: '#c9a227', metal: '#d4a531', expression: 'smug', smirk: 0.8, lidDroop: 0.4, exprSmile: 0.4 });
  got('the-hound', 'Sandor “The Hound” Clegane', 'Long dark hair, burn scar, armour.', { archetype: 'british', gender: 'masc', age: 0.42 },
    { hairStyle: 'shoulder', hairColor: '#2a1f18', eyeColor: '#3a2a1f', facialHair: 'stubble', marks: ['burn-scar'], scarSide: -1, clothing: 'armour', cloth1: '#3a3226', faceWidth: 1.1, browFurrow: 0.6, smile: -0.4 });
  got('tormund', 'Tormund Giantsbane', 'Wild red hair and beard, big grin, furs.', { archetype: 'northern-european', gender: 'masc', age: 0.45 },
    { hairStyle: 'long', hairColor: '#a8481f', facialHair: 'long-beard', eyeColor: '#4a74a0', clothing: 'fur-collar', cloth1: '#5a4a3a', cloth2: '#6b4a2e', exprSmile: 0.9, squint: 0.4 });
  got('missandei', 'Missandei', 'Curly dark hair, warm brown eyes, gold collar and soft gown.', { archetype: 'east-african', gender: 'fem', age: 0.18 },
    Object.assign({}, BEAUTY, { hairStyle: 'curly-shoulder', hairColor: '#1d1612', eyeColor: '#4a2c18', noseStyle: 'line', clothing: 'wrap', cloth1: '#c99a4b', cloth2: '#f1e6cc', necklace: 'broad-collar', metal: '#d4a531', smile: 0.15 }));

  // ================================================================== building genomes
  /** Build a character's genome. `seedOffset` gives variations of the same character. */
  PM.fictionGenome = function (id, o = {}) {
    const f = PM.get('fiction', id);
    if (!f) return null;
    const b = f.base || {};
    const seed = PM.hashString('fiction:' + id) + (o.seedOffset || 0) * 7919;
    const g = PM.generate({ seed, archetype: PM.get('archetypes', b.archetype) ? b.archetype : 'american', mixWith: PM.get('archetypes', b.mixWith) ? b.mixWith : '', mix: b.mix, gender: b.gender || 'masc', base: Object.assign({ role: 'everyday' }, o.base || {}) });
    if (b.age != null) g.age = b.age;
    const lk = JSON.parse(JSON.stringify(f.look || {}));
    // an expression preset first, then any explicit expression dials on top of it
    if (lk.expression && PM.expressionValues) Object.assign(g, PM.expressionValues(lk.expression));
    Object.assign(g, lk);
    g.fiction = id;
    return g;
  };

  // ================================================================== character packs (LLM-friendly)
  const PACKS = 'portrait-atelier.fictionPacks';
  const EXTRA_KEYS = { hairColor2: 'color', emblem: ['none', 'circle', 'star', 'bolt', 'i'], capeColor: 'color', maskColor: 'color', scarSide: [-1, 1] };
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'x';
  const isHex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

  /** Clean one `look` against the live registries; returns { look, warnings }. */
  function cleanLook(lk, who) {
    const out = {}, warnings = [];
    for (const [k, v] of Object.entries(lk || {})) {
      const c = PM.control(k);
      if (c) {
        if (c.type === 'knob' && typeof v === 'number') out[k] = Math.min(c.max, Math.max(c.min, v));
        else if (c.type === 'color' && isHex(v)) out[k] = v;
        else if (c.type === 'select' && (PM.get(c.source, v) || (c.allowNone && v === ''))) out[k] = v;
        else if (c.type === 'segment' && c.options.some(o => o[0] === v)) out[k] = v;
        else if (c.type === 'chips' && Array.isArray(v)) { const ok = v.filter(x => PM.get(c.source, x)); out[k] = ok; if (ok.length < v.length) warnings.push(`${who}: dropped unknown ${k} ${v.filter(x => !PM.get(c.source, x)).join(', ')}`); }
        else warnings.push(`${who}: ignored ${k} = ${JSON.stringify(v)}`);
      } else if (EXTRA_KEYS[k]) {
        const rule = EXTRA_KEYS[k];
        if (rule === 'color' ? isHex(v) : rule.includes(v)) out[k] = v; else warnings.push(`${who}: ignored ${k} = ${JSON.stringify(v)}`);
      } else warnings.push(`${who}: unknown key “${k}”`);
    }
    return { look: out, warnings };
  }

  /** Register a pack { franchise, notes, characters: [{ id, label, notes, base, look }] }. */
  PM.registerFictionPack = function (pack, o = {}) {
    if (!pack || typeof pack !== 'object') throw new Error('not a JSON object');
    if (!pack.franchise || !Array.isArray(pack.characters) || !pack.characters.length) throw new Error('needs "franchise" and a non-empty "characters" list');
    const name = String(pack.franchise).slice(0, 60), warnings = [], ids = [];
    PM.define('franchises', name, { label: name, notes: String(pack.notes || '').slice(0, 200), pack: true });
    pack.characters.forEach((ch, i) => {
      const label = String(ch.label || ch.name || 'Character ' + (i + 1)).slice(0, 60);
      const b = ch.base || {};
      const base = {
        archetype: PM.get('archetypes', b.archetype) ? b.archetype : (warnings.push(`${label}: unknown heritage “${b.archetype}”, using Modern American`), 'american'),
        mixWith: PM.get('archetypes', b.mixWith) ? b.mixWith : '',
        mix: typeof b.mix === 'number' ? Math.min(1, Math.max(0, b.mix)) : 0.5,
        gender: ['fem', 'masc', 'andro'].includes(b.gender) ? b.gender : 'masc',
        age: typeof b.age === 'number' ? Math.min(1, Math.max(0, b.age)) : 0.3,
      };
      const c = cleanLook(ch.look, label);
      warnings.push(...c.warnings);
      const id = 'pack-' + slug(name) + '-' + slug(ch.id || label);
      PM.define('fiction', id, { franchise: name, label, notes: String(ch.notes || '').slice(0, 300), base, look: look(c.look), pack: true });
      ids.push(id);
    });
    if (o.save) {
      try { const all = JSON.parse(localStorage.getItem(PACKS) || '[]').filter(p => p.franchise !== name); all.push(pack); localStorage.setItem(PACKS, JSON.stringify(all)); } catch (e) { warnings.push('Could not remember the pack: browser storage is blocked.'); }
    }
    return { franchise: name, ids, warnings };
  };
  PM.savedFictionPacks = () => { try { return JSON.parse(localStorage.getItem(PACKS) || '[]'); } catch (e) { return []; } };
  PM.removeFictionPack = function (name) {
    try { localStorage.setItem(PACKS, JSON.stringify(PM.savedFictionPacks().filter(p => p.franchise !== name))); } catch (e) { /* storage blocked */ }
  };
  // packs saved in this browser come back on every load
  for (const p of PM.savedFictionPacks()) { try { PM.registerFictionPack(p); } catch (e) { console.warn('[fiction] skipped a saved pack:', e.message); } }

  /** A copy-and-paste prompt for an LLM, listing every valid id so its JSON drops straight in. */
  PM.fictionPrompt = function (subject) {
    const ids = src => PM.list(src).map(d => d.id).join(', ');
    const knobs = PM.controls.filter(c => c.type === 'knob' && c.group !== 'Identity' && c.group !== 'Ink & Paper').map(c => `${c.id} (${c.min}–${c.max})`).join(', ');
    return `You are helping me make a character pack for "Portrait Atelier", a 2D flat-style portrait maker.
Make a pack for: ${subject || '<NAME OF THE SHOW / BOOK / GAME — and which characters>'}

Reply with ONE JSON object and nothing else, in exactly this shape:
{
  "franchise": "Show name",
  "notes": "One short line about the setting's look.",
  "characters": [
    {
      "id": "short-id",
      "label": "Character Name",
      "notes": "One line describing their look.",
      "base": { "archetype": "<heritage id>", "mixWith": "<optional second heritage id or empty>", "mix": 0.5, "gender": "fem|masc|andro", "age": 0.3 },
      "look": { "hairStyle": "...", "hairColor": "#rrggbb", "eyeColor": "#rrggbb", "skin": "#rrggbb", "clothing": "...", "cloth1": "#rrggbb", "cloth2": "#rrggbb", "cloth3": "#rrggbb", "...": "any other keys below" }
    }
  ]
}

Rules:
- Use ONLY these ids. Anything else is ignored.
- age: 0 = child, 0.1 = teen, 0.3 = young adult, 0.5 = middle-aged, 0.8 = elderly.
- Colours are "#rrggbb". cloth1 = main garment, cloth2 = accent, cloth3 = detail. metal = jewellery colour.
- Prefer flattering, characterful faces; no caricature. Describe looks, not real people.
- "marks" and "accessories" are arrays.

heritage ids (archetype / mixWith): ${ids('archetypes')}
hairStyle: ${ids('hair')}
facialHair: ${ids('facialHair')}
headwear: ${ids('headwear')}
clothing: ${ids('clothing')}
pattern / trim: ${ids('patterns')}
earrings: ${ids('earrings')}
necklace: ${ids('necklaces')}
eyewear: ${ids('eyewear')}
eyeShape: ${ids('eyeShapes')}
noseStyle: ${ids('noses')}
marks: ${ids('marks')}
accessories: ${ids('accessories')}
expression (a preset): ${ids('expressions')}
hairTexture: 1 straight, 2 wavy, 3 curly, 4 coily
knobs (numbers, with ranges): ${knobs}
extras: hairColor2 "#rrggbb" (two-tone hair), emblem "none|circle|star|bolt|i" (hero-suit), capeColor, maskColor "#rrggbb", scarSide 1 or -1 (burn-scar side)`;
  };
})(window.PM = window.PM || {});
