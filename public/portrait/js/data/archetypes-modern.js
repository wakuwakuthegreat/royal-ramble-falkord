/* Modern & diaspora heritages — the everyday faces of today's US, UK and Caribbean.
 * Same format as archetypes.js (see the field list at the top of that file). These lean on
 * modern hairstyles and clothes from js/parts/modern.js. Blend them with anything. */
(function (PM) {
  'use strict';
  const A = (id, def) => PM.define('archetypes', id, def);

  const modernClothes = {
    fem: { crew: 2, vneck: 1.5, hoodie: 1.5, 'denim-jacket': 1.2, 'leather-jacket': 0.6, turtleneck: 1, scarf: 0.6, bare: 0.6, suit: 0.6, 'graphic-tee': 1 },
    masc: { crew: 2, hoodie: 2, 'denim-jacket': 1, 'leather-jacket': 0.6, suit: 1.2, vneck: 0.8, 'graphic-tee': 1.4, turtleneck: 0.4 },
  };
  const modernHats = { fem: { none: 12, beanie: 1, 'baseball-cap': 1 }, masc: { none: 8, 'baseball-cap': 2, beanie: 1.5, 'flat-cap': 0.3 } };
  const modernBrights = ['#16120f', '#f1e6cc', '#2b3a67', '#a8302a', '#c99a4b', '#3c7f86', '#6b5a44', '#8fb3c4'];

  A('american', {
    label: 'Modern American', region: 'Americas', groups: ['european', 'anglo', 'modern'],
    notes: 'Everyday US faces with mostly European ancestry — Irish, German, Italian, English, Scandinavian, Polish and more, long since mixed. Hoodies, denim, ball caps, braces and glasses. Every hair colour.',
    skin: [['I-1', 2], ['I-2', 3], ['II-1', 3], ['II-2', 2], ['III-1', 1]],
    hairColor: [['blond', 2], ['darkBlond', 3], ['lightBrown', 3], ['brown', 3], ['darkBrown', 2], ['red', 0.7], ['strawberry', 0.6], ['auburn', 0.7], ['black', 0.6], ['platinum', 0.4]],
    eyeColor: [['blue', 3], ['lightBlue', 1], ['grey', 1], ['green', 2], ['hazel', 2], ['brown', 3]],
    hairTexture: { 1: 5, 2: 4, 3: 1.2 },
    eyeShape: { almond: 3, round: 2, hooded: 2, 'deep-set': 1, downturned: 1, upturned: 1 },
    nose: { straight: 3, line: 2, button: 2, aquiline: 1 },
    hair: {
      fem: { long: 3, shoulder: 2, ponytail: 2, bob: 1, pixie: 1, 'half-up': 1.5, 'bun-top': 1, fringe: 0.8, 'curly-shoulder': 0.6 },
      masc: { 'short-crop': 3, fade: 2.5, 'side-part': 1.5, quiff: 1.5, buzz: 1, undercut: 1, bald: 0.6, mullet: 0.3, 'bun-top': 0.3 },
    },
    facialHair: { masc: { none: 4, stubble: 2.5, 'short-beard': 2, 'full-beard': 1.2, goatee: 0.8, mustache: 0.5 } },
    headwear: modernHats,
    clothing: modernClothes,
    patterns: { plain: 5, stripes: 1, checks: 1.2, tartan: 0.6 },
    earrings: { fem: { none: 2, studs: 4, hoops: 2, drops: 1 }, masc: { none: 12, studs: 1 } },
    necklaces: { fem: { none: 4, locket: 1, pearls: 0.5, beads: 0.5 }, masc: { none: 12, 'dog-tags': 0.6 } },
    eyewear: { none: 9, 'square-glasses': 1.5, 'round-glasses': 1, sunglasses: 0.8, 'cat-eye': 0.3, aviators: 0.4 },
    marks: { freckles: 0.25, blush: 0.2, dimples: 0.12, 'beauty-mark': 0.06 },
    palette: modernBrights,
    metals: [['silver', 2], ['gold', 2]],
  });

  A('african-american', {
    label: 'African American', region: 'Americas', groups: ['african-diaspora', 'modern'],
    notes: 'Black American faces with deep roots in West and Central Africa and generations of American life — often with European and Indigenous ancestry too, so skin, features and hair vary a lot. Fades and waves, locs, braids, twists, silk presses, afros.',
    skin: [['IV-1', 1], ['IV-2', 2], ['V-1', 3], ['V-2', 3], ['VI-1', 3], ['VI-2', 2], ['VI-3', 1], ['III-2', 0.6]],
    hairColor: [['black', 6], ['softBlack', 3], ['darkBrown', 2], ['henna', 0.4], ['blond', 0.3]],
    eyeColor: [['darkBrown', 5], ['brown', 3], ['lightBrown', 1], ['hazel', 0.4]],
    hairTexture: { 4: 7, 3: 3, 2: 0.4 },
    eyeShape: { almond: 4, round: 2, upturned: 1.5, hooded: 1, downturned: 1 },
    nose: { broad: 3, button: 2, line: 2, straight: 1.5 },
    face: { noseWidth: [0.92, 1.3], lipFull: [0.7, 1.15], noseBridge: [0.25, 0.6] },
    hair: {
      fem: { 'box-braids': 3, locs: 1.5, afro: 2, twists: 1.5, 'curly-shoulder': 1.5, long: 1.2, 'afro-puffs': 1, pixie: 1, 'bun-top': 1, cornrows: 1, 'half-up': 0.8 },
      masc: { fade: 4, waves: 3, 'high-top': 0.6, locs: 2, twists: 1.5, cornrows: 1.2, buzz: 1.5, bald: 1, afro: 0.6 },
    },
    facialHair: { masc: { none: 3, stubble: 2, 'short-beard': 2.5, 'full-beard': 1.5, goatee: 1.2, mustache: 0.8 } },
    headwear: { fem: { none: 10, headwrap: 1.5, 'baseball-cap': 0.6, beanie: 0.6 }, masc: { none: 8, 'baseball-cap': 2, beanie: 1.5, 'durag': 1.5 } },
    clothing: modernClothes,
    patterns: { plain: 5, stripes: 1, kente: 0.4, checks: 0.6 },
    earrings: { fem: { none: 1, hoops: 4, studs: 3, 'big-disc': 1, drops: 1 }, masc: { none: 6, studs: 3 } },
    necklaces: { fem: { none: 4, beads: 1, locket: 0.8, 'chain-link': 1 }, masc: { none: 6, 'chain-link': 2.5, 'dog-tags': 0.4 } },
    eyewear: { none: 10, 'square-glasses': 1, 'round-glasses': 1, sunglasses: 1, aviators: 0.4 },
    marks: { 'beauty-mark': 0.1, dimples: 0.12, freckles: 0.05 },
    palette: modernBrights,
    metals: [['gold', 3], ['silver', 1]],
  });

  A('british', {
    label: 'Modern British', region: 'Europe', groups: ['european', 'anglo', 'northern-european', 'modern'],
    notes: 'Today’s UK high street — English, Scottish, Welsh and Irish faces with centuries of mixing. Parkas, jumpers, flat caps, football-style crops, freckles and every shade of ginger.',
    skin: [['I-1', 3], ['I-2', 3], ['II-1', 3], ['II-2', 1], ['III-1', 0.4]],
    hairColor: [['lightBrown', 3], ['brown', 3], ['darkBlond', 2], ['blond', 1.5], ['darkBrown', 2], ['red', 1], ['strawberry', 0.8], ['auburn', 1], ['black', 0.6]],
    eyeColor: [['blue', 3], ['grey', 2], ['green', 2], ['hazel', 1.5], ['brown', 2]],
    hairTexture: { 1: 5, 2: 4, 3: 1 },
    eyeShape: { almond: 2, hooded: 2.5, round: 2, 'deep-set': 2, downturned: 1.5 },
    nose: { straight: 3, line: 2, aquiline: 1, button: 1.5 },
    hair: {
      fem: { long: 2.5, shoulder: 2, bob: 1.5, 'bob-bangs': 1, ponytail: 1.5, pixie: 1, 'half-up': 1, 'bun-low': 0.8 },
      masc: { 'short-crop': 3, fade: 2, buzz: 1.5, quiff: 1, 'side-part': 1.2, undercut: 0.8, bald: 0.8, mullet: 0.3 },
    },
    facialHair: { masc: { none: 4, stubble: 2.5, 'short-beard': 2, 'full-beard': 1, mustache: 0.4, goatee: 0.4 } },
    headwear: { fem: { none: 12, beanie: 1.5 }, masc: { none: 8, 'flat-cap': 1.5, beanie: 1.5, 'baseball-cap': 0.8 } },
    clothing: { fem: { crew: 2, turtleneck: 1.5, scarf: 1.5, 'denim-jacket': 1, hoodie: 1, vneck: 1, 'leather-jacket': 0.5 }, masc: { crew: 2, hoodie: 1.5, suit: 1.2, 'fur-collar': 0.8, 'graphic-tee': 1, 'denim-jacket': 0.8, turtleneck: 0.6 } },
    patterns: { plain: 4, tartan: 1.5, checks: 1.2, stripes: 1 },
    earrings: { fem: { none: 2, studs: 4, hoops: 1.5, drops: 1 }, masc: { none: 10, studs: 1.5 } },
    necklaces: { fem: { none: 4, locket: 1, pearls: 0.6 }, masc: { none: 12, 'chain-link': 0.6 } },
    eyewear: { none: 9, 'square-glasses': 1.5, 'round-glasses': 1.2, 'cat-eye': 0.3, sunglasses: 0.4 },
    marks: { freckles: 0.35, blush: 0.35, dimples: 0.1 },
    palette: ['#2b3a67', '#7a1f2b', '#4f5a3a', '#8a8478', '#16120f', '#f1e6cc', '#c99a4b'],
    metals: [['silver', 2], ['gold', 1.5]],
  });

  A('black-british', {
    label: 'Black British', region: 'Europe', groups: ['african-diaspora', 'modern'],
    notes: 'Londoners, Mancunians and Brummies with Caribbean and African roots — Windrush families, Nigerian, Ghanaian and Somali Brits. Sharp fades, braids, twists, tracksuits, puffer jackets and Sunday best.',
    skin: [['IV-2', 1.5], ['V-1', 3], ['V-2', 3], ['VI-1', 3], ['VI-2', 2], ['VI-3', 1]],
    hairColor: [['black', 7], ['softBlack', 3], ['darkBrown', 1.5], ['henna', 0.3]],
    eyeColor: [['darkBrown', 5], ['brown', 3], ['lightBrown', 0.6]],
    hairTexture: { 4: 8, 3: 2 },
    eyeShape: { almond: 4, round: 2, upturned: 1.5, hooded: 1 },
    nose: { broad: 3, button: 2, line: 2, straight: 1 },
    face: { noseWidth: [0.92, 1.3], lipFull: [0.72, 1.15] },
    hair: {
      fem: { 'box-braids': 3, twists: 2, afro: 1.5, 'curly-shoulder': 1, locs: 1, cornrows: 1.2, pixie: 1, 'bun-top': 1, long: 0.8 },
      masc: { fade: 4, waves: 2, twists: 2, cornrows: 1.2, locs: 1.2, buzz: 1.5, bald: 0.6 },
    },
    facialHair: { masc: { none: 3, stubble: 2, 'short-beard': 2.5, goatee: 1, 'full-beard': 1 } },
    headwear: { fem: { none: 10, headwrap: 2, beanie: 0.8 }, masc: { none: 8, beanie: 2, 'baseball-cap': 1.2, durag: 1 } },
    clothing: { fem: { crew: 1.5, hoodie: 1.5, 'denim-jacket': 1, vneck: 1, wrap: 0.6, suit: 0.6, 'graphic-tee': 1 }, masc: { hoodie: 2.5, 'graphic-tee': 1.5, crew: 1.5, suit: 1, 'leather-jacket': 0.6, dashiki: 0.3 } },
    patterns: { plain: 5, stripes: 1, kente: 0.4, batik: 0.4 },
    earrings: { fem: { none: 1, hoops: 4, studs: 3, 'big-disc': 1 }, masc: { none: 5, studs: 3 } },
    necklaces: { fem: { none: 4, 'chain-link': 1, beads: 1 }, masc: { none: 6, 'chain-link': 2 } },
    eyewear: { none: 10, 'square-glasses': 1, 'round-glasses': 1, sunglasses: 0.8 },
    marks: { dimples: 0.1, 'beauty-mark': 0.08 },
    palette: ['#16120f', '#f1e6cc', '#2b3a67', '#a8302a', '#4f5a3a', '#c99a4b', '#8a8478'],
    metals: [['gold', 3], ['silver', 1.5]],
  });

  A('caribbean', {
    label: 'Caribbean', region: 'Americas', groups: ['african-diaspora', 'caribbean'],
    notes: 'Jamaica, Trinidad, Barbados, Haiti and the islands — African, Indian, Chinese, European and Taíno roots in every combination. Bright prints, headwraps, locs, gold chains, carnival colour.',
    skin: [['IV-1', 1], ['IV-2', 2], ['V-1', 3], ['V-2', 3], ['VI-1', 2], ['VI-2', 1], ['III-2', 0.8]],
    hairColor: [['black', 6], ['softBlack', 3], ['darkBrown', 2]],
    eyeColor: [['darkBrown', 5], ['brown', 3], ['lightBrown', 1], ['hazel', 0.4]],
    hairTexture: { 4: 6, 3: 3, 2: 0.8 },
    eyeShape: { almond: 4, round: 2, upturned: 1.5, hooded: 1 },
    nose: { broad: 3, button: 2, line: 2, straight: 1 },
    face: { noseWidth: [0.92, 1.28], lipFull: [0.7, 1.12] },
    hair: {
      fem: { locs: 2, 'box-braids': 2, afro: 1.5, twists: 1.5, 'curly-shoulder': 1.5, 'bun-top': 1, 'afro-puffs': 1 },
      masc: { locs: 3, fade: 3, buzz: 1.5, twists: 1.5, cornrows: 1, bald: 0.6, waves: 1 },
    },
    facialHair: { masc: { none: 3, stubble: 2, 'short-beard': 2, goatee: 1.2, 'full-beard': 1 } },
    headwear: { fem: { none: 6, headwrap: 3, 'flower-crown': 0.3 }, masc: { none: 8, beanie: 1.5, 'baseball-cap': 1, 'straw-hat': 0.6 } },
    clothing: { fem: { wrap: 2, vneck: 1.5, crew: 1, bare: 1.5, 'graphic-tee': 1 }, masc: { 'graphic-tee': 2, crew: 1.5, vneck: 1, 'open-vest': 0.6, hoodie: 1 } },
    patterns: { plain: 3, stripes: 1.5, blossoms: 1.5, batik: 1, checks: 1, tartan: 0.6 },
    earrings: { fem: { none: 1, hoops: 4, studs: 2, 'big-disc': 1, drops: 1 }, masc: { none: 6, studs: 2 } },
    necklaces: { fem: { none: 3, beads: 1.5, 'chain-link': 1, cowrie: 0.4 }, masc: { none: 5, 'chain-link': 2.5 } },
    eyewear: { none: 10, sunglasses: 1.5, 'square-glasses': 0.6 },
    marks: { dimples: 0.1, freckles: 0.06, 'beauty-mark': 0.08 },
    palette: ['#2f7a3a', '#e3c94a', '#16120f', '#a8302a', '#2f5f6e', '#f1e6cc', '#d9822b'],
    metals: [['gold', 4], ['silver', 1]],
  });
})(window.PM = window.PM || {});
