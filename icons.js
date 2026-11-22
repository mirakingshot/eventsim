// Item icons for Mira's Kingshot simulators.
// window.itemIcon(name) returns an <img> tag for an item name (or "" if there's no picture yet).
// Pictures live in images/items/. To add one, drop the file in and add a rule below.
(function (root) {
  "use strict";

  // First match wins, so put more specific names first (e.g. "truegold dust" before "truegold").
  const RULES = [
    [/truegold dust/, "truegolddust"],
    [/truegold/, "truegold"],
    [/gem/, "gems"],
    [/training spee/, "trainingspeed"],
    [/construction spee/, "constructionspeed"],
    [/research spee/, "researchspeed"],
    [/learning spee/, "learningspeed"],
    [/general spee/, "generalspeed"],
    [/mythic general hero shard|general mythic/, "generalmythic"],
    [/enhancement xp|xp enhancement/, "xpenhancement"],
    [/custom mythic hero/, "custommythicherochest"],
    [/gear boost/, "gearboostchest"],
    [/lucky hero/, "luckyherochest"],
    [/governor gear mat/, "govmatschest"],
    [/pet adv/, "petadvmatchest"],
    [/forgehammer/, "forgehammer"],
    [/mithril/, "mithril"],
    [/satin/, "satin"],
    [/thread/, "threads"],
    [/artisan/, "artisans"],
    [/charm design/, "charmdesign"],
    [/charm guide/, "charmguide"],
    [/mystery badge/, "mysterybadge"],
    [/master emblem/, "generalmasteremblem"],
    [/goblet/, "goblet"],
    [/growth manual/, "growthmanual"],
    [/manuscript/, "mastermanuscript"],
    [/medallion/, "medallion"],
    [/nutrient/, "nutrientpotion"],
    [/pet food/, "petfood"],
    [/elite spice/, "elitespice"],
    [/advanced taming/, "advancedtaming"],
    [/common taming/, "commontaming"],
    [/\bgold\b/, "gold"],
  ];
  const cache = new Map();

  function iconFile(name) {
    const key = String(name || "").toLowerCase();
    if (cache.has(key)) return cache.get(key);
    const hit = RULES.find(([re]) => re.test(key));
    const file = hit ? `images/items/${hit[1]}.png` : null;
    cache.set(key, file);
    return file;
  }

  function itemIcon(name, cls) {
    const f = iconFile(name);
    return f ? `<img class="${cls || "item-ic"}" src="${f}" alt="" loading="lazy" onerror="this.remove()">` : "";
  }

  root.itemIcon = itemIcon;
  root.itemIconFile = iconFile;
})(typeof window !== "undefined" ? window : globalThis);
