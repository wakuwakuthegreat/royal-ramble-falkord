/* Shared colour vocabularies. Archetypes refer to these by key so tones stay consistent.
 * Skin keys follow a Fitzpatrick-ish ladder (I … VI) split into finer steps. */
(function (PM) {
  'use strict';

  PM.SKIN = {
    'I-1': '#f4dfcf', 'I-2': '#efd3bd',
    'II-1': '#e8c6a8', 'II-2': '#e0b893',
    'III-1': '#d4a87f', 'III-2': '#c99a6f', 'III-olive': '#c29a6a',
    'IV-1': '#b9875a', 'IV-2': '#aa784c', 'IV-olive': '#a57b4f',
    'V-1': '#916039', 'V-2': '#7f5131', 'V-red': '#8d5534',
    'VI-1': '#69402a', 'VI-2': '#573421', 'VI-3': '#45291a', 'VI-4': '#352015',
  };

  PM.HAIR = {
    black: '#151210', softBlack: '#221b17', darkBrown: '#3a2a1f', brown: '#5c3f2b',
    lightBrown: '#7e5b3c', auburn: '#863e22', red: '#a8481f', strawberry: '#bf8048',
    darkBlond: '#a8874f', blond: '#d2b277', platinum: '#e6d7ac', henna: '#7a2e1a',
    grey: '#9d9a94', white: '#e9e6df',
  };

  PM.EYES = {
    darkBrown: '#2e1c12', brown: '#4a2c18', lightBrown: '#6b4423', amber: '#8c5b22',
    hazel: '#6e6834', green: '#4b6b3a', grey: '#7b8a90', blue: '#4a74a0', lightBlue: '#7ea4c6',
  };

  PM.METALS = { gold: '#d4a531', brass: '#b8913a', silver: '#c9cdd1', copper: '#b8673a', coral: '#d0553e', turquoise: '#3aa6a0' };

  /** Resolve a swatch key (or pass a raw #hex through). */
  PM.swatch = function (table, key) {
    if (typeof key === 'string' && key[0] === '#') return key;
    return table[key] || key;
  };
})(window.PM = window.PM || {});
