/* The registry: every swappable piece of the portrait lives here.
 *
 *   PM.define('hair', 'my-style', { label: 'My Style', back(P, g, geo, C) {...}, front(P, g, geo, C) {...} })
 *
 * Categories are created on first use, so you can invent new ones (see README). */
(function (PM) {
  'use strict';

  const registry = {};

  function titleCase(id) {
    return String(id).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /** Register (or replace) a definition. Returns the stored def. */
  PM.define = function (category, id, def) {
    if (!registry[category]) registry[category] = {};
    def = Object.assign({}, def);
    def.id = id;
    def.label = def.label || titleCase(id);
    def.order = def.order != null ? def.order : Object.keys(registry[category]).length;
    registry[category][id] = def;
    return def;
  };

  /** Look up one definition (or undefined). */
  PM.get = function (category, id) {
    return registry[category] ? registry[category][id] : undefined;
  };

  /** All definitions of a category, in registration order. */
  PM.list = function (category) {
    return Object.values(registry[category] || {}).sort((a, b) => a.order - b.order);
  };

  PM.registry = registry;
  PM.titleCase = titleCase;
})(window.PM = window.PM || {});
