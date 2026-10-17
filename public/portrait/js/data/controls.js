/* Every knob, dial, dropdown and swatch in the UI is declared here.
 * The UI builds itself from this list and the generator rolls each one,
 * so adding a control = add an entry here + read `g.<id>` in a part.
 *
 *  type   'knob' | 'select' | 'color' | 'chips' | 'segment'
 *  group  panel heading in the UI
 *  roll   [min, max] random range when an archetype doesn't specify one (knobs)
 *  sex    { masc: +x, fem: -x } offset applied when rolling for that presentation
 *  source registry category whose entries become the options (select / chips)
 *  noRoll true = never randomised (style settings)
 */
(function (PM) {
  'use strict';

  PM.controls = [
    // ---------------- Identity (left panel) ----------------
    { id: 'archetype', type: 'select', group: 'Identity', label: 'Heritage', source: 'archetypes', noRoll: true },
    { id: 'mixWith', type: 'select', group: 'Identity', label: 'Blend with', source: 'archetypes', allowNone: true, noRoll: true },
    { id: 'mix', type: 'knob', group: 'Identity', label: 'Blend', min: 0, max: 1, step: 0.01, def: 0.5, noRoll: true },
    { id: 'gender', type: 'segment', group: 'Identity', label: 'Presentation', options: [['fem', 'Femme'], ['andro', 'Andro'], ['masc', 'Masc']], noRoll: true, def: 'fem' },
    { id: 'role', type: 'select', group: 'Identity', label: 'Role', source: 'roles', noRoll: true, def: 'everyday' },
    { id: 'age', type: 'knob', group: 'Identity', label: 'Age', min: 0, max: 1, step: 0.01, def: 0.25, roll: [0.04, 0.62] },

    // ---------------- Head ----------------
    { id: 'faceWidth', type: 'knob', group: 'Head', label: 'Width', min: 0.82, max: 1.2, step: 0.01, def: 1, roll: [0.9, 1.08], sex: { masc: 0.03 } },
    { id: 'faceLength', type: 'knob', group: 'Head', label: 'Length', min: 0.86, max: 1.14, step: 0.01, def: 1, roll: [0.94, 1.06], sex: { masc: 0.02 } },
    { id: 'forehead', type: 'knob', group: 'Head', label: 'Forehead', min: 0.7, max: 1.3, step: 0.01, def: 1, roll: [0.88, 1.12] },
    { id: 'cheek', type: 'knob', group: 'Head', label: 'Cheekbones', min: 0.88, max: 1.12, step: 0.01, def: 1, roll: [0.95, 1.04] },
    { id: 'jaw', type: 'knob', group: 'Head', label: 'Jaw', min: 0.6, max: 1.02, step: 0.01, def: 0.8, roll: [0.72, 0.88], sex: { masc: 0.07, fem: -0.03 } },
    { id: 'chin', type: 'knob', group: 'Head', label: 'Chin width', min: 0.1, max: 0.5, step: 0.01, def: 0.24, roll: [0.15, 0.3], sex: { masc: 0.06 } },
    { id: 'chinSquare', type: 'knob', group: 'Head', label: 'Chin square', min: 0, max: 1, step: 0.01, def: 0.25, roll: [0.05, 0.45], sex: { masc: 0.3 } },
    { id: 'turn', type: 'knob', group: 'Head', label: 'Turn', min: -1, max: 1, step: 0.01, def: 0, roll: [-0.45, 0.45] },

    // ---------------- Eyes ----------------
    { id: 'eyeShape', type: 'select', group: 'Eyes', label: 'Eye shape', source: 'eyeShapes' },
    { id: 'eyeSize', type: 'knob', group: 'Eyes', label: 'Size', min: 0.7, max: 1.35, step: 0.01, def: 1, roll: [0.9, 1.1] },
    { id: 'eyeOpen', type: 'knob', group: 'Eyes', label: 'Openness', min: 0.5, max: 1.4, step: 0.01, def: 1, roll: [0.85, 1.12] },
    { id: 'eyeSpacing', type: 'knob', group: 'Eyes', label: 'Spacing', min: 0.82, max: 1.18, step: 0.01, def: 1, roll: [0.94, 1.06] },
    { id: 'eyeTilt', type: 'knob', group: 'Eyes', label: 'Tilt', min: -1, max: 1, step: 0.01, def: 0, roll: [-0.25, 0.25] },
    { id: 'eyeHeight', type: 'knob', group: 'Eyes', label: 'Height', min: -1, max: 1, step: 0.01, def: 0, roll: [-0.3, 0.3] },
    { id: 'irisSize', type: 'knob', group: 'Eyes', label: 'Iris', min: 0.55, max: 1.25, step: 0.01, def: 0.9, roll: [0.8, 1] },
    { id: 'gaze', type: 'knob', group: 'Eyes', label: 'Gaze', min: -1, max: 1, step: 0.01, def: 0, roll: [-0.3, 0.3] },
    { id: 'lashes', type: 'knob', group: 'Eyes', label: 'Lashes', min: 0, max: 1, step: 0.01, def: 0.3, roll: [0, 0.4], sex: { fem: 0.35, masc: -0.4 } },

    // ---------------- Brows & Nose ----------------
    { id: 'browThick', type: 'knob', group: 'Brows & Nose', label: 'Brow weight', min: 0.3, max: 2.2, step: 0.01, def: 1, roll: [0.75, 1.3], sex: { masc: 0.35, fem: -0.1 } },
    { id: 'browArch', type: 'knob', group: 'Brows & Nose', label: 'Brow arch', min: 0, max: 1, step: 0.01, def: 0.4, roll: [0.2, 0.7], sex: { fem: 0.12, masc: -0.12 } },
    { id: 'browHeight', type: 'knob', group: 'Brows & Nose', label: 'Brow height', min: -1, max: 1, step: 0.01, def: 0, roll: [-0.4, 0.5] },
    { id: 'browTilt', type: 'knob', group: 'Brows & Nose', label: 'Brow tilt', min: -1, max: 1, step: 0.01, def: 0, roll: [-0.3, 0.3] },
    { id: 'noseStyle', type: 'select', group: 'Brows & Nose', label: 'Nose', source: 'noses' },
    { id: 'noseLength', type: 'knob', group: 'Brows & Nose', label: 'Nose length', min: 0.82, max: 1.18, step: 0.01, def: 1, roll: [0.94, 1.06] },
    { id: 'noseWidth', type: 'knob', group: 'Brows & Nose', label: 'Nose width', min: 0.65, max: 1.55, step: 0.01, def: 1, roll: [0.85, 1.15] },
    { id: 'noseBridge', type: 'knob', group: 'Brows & Nose', label: 'Bridge', min: 0, max: 1, step: 0.01, def: 0.5, roll: [0.3, 0.7] },

    // ---------------- Mouth ----------------
    { id: 'lipFull', type: 'knob', group: 'Mouth', label: 'Fullness', min: 0.25, max: 1.4, step: 0.01, def: 0.7, roll: [0.5, 0.9], sex: { masc: -0.1 } },
    { id: 'mouthWidth', type: 'knob', group: 'Mouth', label: 'Width', min: 0.7, max: 1.35, step: 0.01, def: 1, roll: [0.9, 1.1] },
    { id: 'cupid', type: 'knob', group: 'Mouth', label: "Cupid's bow", min: 0, max: 1, step: 0.01, def: 0.5, roll: [0.3, 0.75] },
    { id: 'smile', type: 'knob', group: 'Mouth', label: 'Smile', min: -1, max: 1, step: 0.01, def: 0, roll: [-0.2, 0.45] },

    // ---------------- Expression (never rolled — set by presets, dials or the Animator) ----------------
    { id: 'expression', type: 'select', group: 'Expression', label: 'Preset', source: 'expressions', noRoll: true, def: 'neutral' },
    { id: 'exprSmile', type: 'knob', group: 'Expression', label: 'Grin / frown', min: -1.5, max: 1.5, step: 0.01, def: 0, noRoll: true },
    { id: 'mouthOpen', type: 'knob', group: 'Expression', label: 'Open mouth', min: 0, max: 1, step: 0.01, def: 0, noRoll: true, hint: 'Talking, shouting, surprise' },
    { id: 'exprOpen', type: 'knob', group: 'Expression', label: 'Eyes wide', min: 0.3, max: 1.5, step: 0.01, def: 1, noRoll: true },
    { id: 'browLift', type: 'knob', group: 'Expression', label: 'Brows up', min: -1, max: 1, step: 0.01, def: 0, noRoll: true },
    { id: 'browRaise', type: 'knob', group: 'Expression', label: 'Worry', min: 0, max: 1, step: 0.01, def: 0, noRoll: true, hint: 'Inner brow ends lift — sad, scared, pleading' },
    { id: 'browFurrow', type: 'knob', group: 'Expression', label: 'Furrow', min: 0, max: 1, step: 0.01, def: 0, noRoll: true, hint: 'Brows knit down and in — angry' },
    { id: 'lidDroop', type: 'knob', group: 'Expression', label: 'Heavy lids', min: 0, max: 1, step: 0.01, def: 0, noRoll: true },
    { id: 'squint', type: 'knob', group: 'Expression', label: 'Squint', min: 0, max: 1, step: 0.01, def: 0, noRoll: true },
    { id: 'smirk', type: 'knob', group: 'Expression', label: 'Smirk', min: -1, max: 1, step: 0.01, def: 0, noRoll: true },
    { id: 'lipBite', type: 'knob', group: 'Expression', label: 'Lip bite', min: 0, max: 1, step: 0.01, def: 0, noRoll: true },
    { id: 'pupil', type: 'knob', group: 'Expression', label: 'Pupils', min: 0.35, max: 1.3, step: 0.01, def: 1, noRoll: true },
    { id: 'wrinkle', type: 'knob', group: 'Expression', label: 'Wrinkles', min: 0, max: 1, step: 0.01, def: 0, noRoll: true },
    { id: 'blushAmt', type: 'knob', group: 'Expression', label: 'Blush', min: 0, max: 1, step: 0.01, def: 0, noRoll: true },
    { id: 'tears', type: 'knob', group: 'Expression', label: 'Tears', min: 0, max: 1, step: 0.01, def: 0, noRoll: true },
    { id: 'sweat', type: 'knob', group: 'Expression', label: 'Sweat drop', min: 0, max: 1, step: 0.01, def: 0, noRoll: true },
    { id: 'vein', type: 'knob', group: 'Expression', label: 'Anger vein', min: 0, max: 1, step: 0.01, def: 0, noRoll: true },
    { id: 'flush', type: 'knob', group: 'Expression', label: 'Red flush', min: 0, max: 1, step: 0.01, def: 0, noRoll: true },

    // ---------------- Neck & Build ----------------
    { id: 'neckLength', type: 'knob', group: 'Neck & Build', label: 'Neck length', min: 0.4, max: 1.8, step: 0.01, def: 1, roll: [0.8, 1.25], sex: { fem: 0.1 } },
    { id: 'neckWidth', type: 'knob', group: 'Neck & Build', label: 'Neck width', min: 0.7, max: 1.4, step: 0.01, def: 1, roll: [0.9, 1.05], sex: { masc: 0.14, fem: -0.05 } },
    { id: 'shoulders', type: 'knob', group: 'Neck & Build', label: 'Shoulders', min: 0.8, max: 1.25, step: 0.01, def: 1, roll: [0.92, 1.05], sex: { masc: 0.08, fem: -0.03 } },

    // ---------------- Hair ----------------
    { id: 'hairStyle', type: 'select', group: 'Hair', label: 'Style', source: 'hair' },
    { id: 'hairTexture', type: 'knob', group: 'Hair', label: 'Texture', min: 1, max: 4, step: 1, def: 2, hint: '1 straight · 2 wavy · 3 curly · 4 coily' },
    { id: 'hairVolume', type: 'knob', group: 'Hair', label: 'Volume', min: 0.5, max: 1.6, step: 0.01, def: 1, roll: [0.8, 1.25] },
    { id: 'hairLength', type: 'knob', group: 'Hair', label: 'Length', min: 0.4, max: 1.6, step: 0.01, def: 1, roll: [0.75, 1.3] },
    { id: 'hairPart', type: 'knob', group: 'Hair', label: 'Part', min: -1, max: 1, step: 0.01, def: 0, roll: [-0.6, 0.6] },
    { id: 'facialHair', type: 'select', group: 'Hair', label: 'Facial hair', source: 'facialHair' },

    // ---------------- Wardrobe ----------------
    { id: 'clothing', type: 'select', group: 'Wardrobe', label: 'Garment', source: 'clothing' },
    { id: 'pattern', type: 'select', group: 'Wardrobe', label: 'Pattern', source: 'patterns' },
    { id: 'trim', type: 'select', group: 'Wardrobe', label: 'Trim', source: 'patterns' },
    { id: 'patternScale', type: 'knob', group: 'Wardrobe', label: 'Pattern scale', min: 0.5, max: 2, step: 0.01, def: 1, roll: [0.8, 1.3] },
    { id: 'headwear', type: 'select', group: 'Wardrobe', label: 'Headwear', source: 'headwear' },

    // ---------------- Adornment ----------------
    { id: 'earrings', type: 'select', group: 'Adornment', label: 'Earrings', source: 'earrings' },
    { id: 'necklace', type: 'select', group: 'Adornment', label: 'Necklace', source: 'necklaces' },
    { id: 'eyewear', type: 'select', group: 'Adornment', label: 'Eyewear', source: 'eyewear' },
    { id: 'marks', type: 'chips', group: 'Adornment', label: 'Signature details', source: 'marks' },
    { id: 'accessories', type: 'chips', group: 'Adornment', label: 'Extras', source: 'accessories' },

    // ---------------- Colours ----------------
    { id: 'skin', type: 'color', group: 'Colours', label: 'Skin' },
    { id: 'hairColor', type: 'color', group: 'Colours', label: 'Hair' },
    { id: 'eyeColor', type: 'color', group: 'Colours', label: 'Eyes' },
    { id: 'cloth1', type: 'color', group: 'Colours', label: 'Cloth' },
    { id: 'cloth2', type: 'color', group: 'Colours', label: 'Accent' },
    { id: 'cloth3', type: 'color', group: 'Colours', label: 'Detail' },
    { id: 'metal', type: 'color', group: 'Colours', label: 'Metal' },

    // ---------------- Ink & Paper ----------------
    { id: 'style', type: 'select', group: 'Ink & Paper', label: 'Paint style', source: 'styles', noRoll: true, def: 'ink-ochre' },
    { id: 'background', type: 'select', group: 'Ink & Paper', label: 'Paper', source: 'backgrounds', noRoll: true, def: 'parchment' },
    { id: 'crumple', type: 'knob', group: 'Ink & Paper', label: 'Crumple', min: 0, max: 1, step: 0.01, def: 0.8, noRoll: true, hint: 'Wrinkled-paper texture on the background' },
    { id: 'crumpleAll', type: 'knob', group: 'Ink & Paper', label: 'Crumple all', min: 0, max: 1, step: 0.01, def: 0.25, noRoll: true, hint: 'Wrinkles over the whole portrait, as if printed on crumpled paper' },
    { id: 'toneMix', type: 'knob', group: 'Ink & Paper', label: 'True tone', min: 0, max: 1, step: 0.01, def: 0.35, noRoll: true, hint: 'How much of the real skin tone shows through a limited-palette style' },
    { id: 'lineWeight', type: 'knob', group: 'Ink & Paper', label: 'Line weight', min: 0.3, max: 2.4, step: 0.01, def: 1, noRoll: true },
    { id: 'wobble', type: 'knob', group: 'Ink & Paper', label: 'Wobble', min: 0, max: 3, step: 0.01, def: 1, noRoll: true },
  ];

  PM.control = id => PM.controls.find(c => c.id === id);
})(window.PM = window.PM || {});
