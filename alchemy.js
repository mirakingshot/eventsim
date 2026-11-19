// Alchemy Junction: pure logic, no DOM. Exposes window.AJ.
//
// The minigame: each level is a row of jar slots. Every jar placed costs 1 Magic Brew.
// A wrong color bounces back, and the game won't let you try that color in that slot
// again (that costs nothing). Every color appears once in a level, so a slot with k
// colors left takes 1..k brews, all equally likely. Every 5th level is all one color,
// so it costs exactly one brew per slot.
(function () {
  "use strict";

  // ---------- levels ----------
  // Levels 1–7 as given in-game. After that every level has 6 slots and pays 5,000.
  const EARLY = [
    { slots: 3, vouchers: 2000 },
    { slots: 3, vouchers: 2000 },
    { slots: 4, vouchers: 3000 },
    { slots: 4, vouchers: 3000 },
    { slots: 5, vouchers: 3000, same: true },
    { slots: 5, vouchers: 4000 },
    { slots: 5, vouchers: 4000 },
  ];
  const LATER = { slots: 6, vouchers: 5000 };
  // Levels 10, 20, 30: 6 jars, all one color.
  const LATER_TENTH = { slots: 6, vouchers: 5000, same: true };
  // Levels 15, 25: 6 jars, one color in 3 slots and 3 other colors once each.
  const LATER_MIXED = { slots: 6, vouchers: 5000, counts: [3, 1, 1, 1] };
  // From level 31 on, every level (5ths included) has 6 different colors and pays 5,000.
  const ALL_UNIQUE_FROM = 31;

  function level(n) {
    let base;
    if (n <= EARLY.length) base = EARLY[n - 1];
    else if (n >= ALL_UNIQUE_FROM || n % 5) base = LATER;
    else base = n % 10 === 0 ? LATER_TENTH : LATER_MIXED;
    return { n, slots: base.slots, vouchers: base.vouchers, same: !!base.same, counts: base.counts || null };
  }

  // ---------- event data ----------
  const DEFAULTS = {
    eventDays: 3,
    startBrews: 10,
    missionMaxPerDay: 30,
    // One-time pop-up with three paths. Paid paths also give the items listed.
    popup: [
      { key: "free", name: "Free path", priceUSD: 0, brews: 20, items: [] },
      {
        key: "superior", name: "Superior Elixir", priceUSD: 4.99, brews: 50,
        items: [["Gems", 2000], ["Truegold", 54], ["Lucky Hero Gear Chest", 8], ["Forgehammer", 8], ["Mythic General Hero Shard", 4]],
      },
      {
        key: "perfect", name: "Perfect Elixir", priceUSD: 9.99, brews: 100,
        items: [["Gems", 4000], ["Truegold", 108], ["Lucky Hero Gear Chest", 16], ["Forgehammer", 16], ["Mythic General Hero Shard", 4], ["3hr General Speed", 6], ["100 XP Enhancement", 5]],
      },
    ],
    // Daily packs: each can be bought once a day.
    packs: [
      { key: "p1", name: "Magic Brew Pack 1", priceUSD: 0.99, brews: 10, perDay: 1 },
      { key: "p3", name: "Magic Brew Pack 2", priceUSD: 2.99, brews: 30, perDay: 1 },
      { key: "p5", name: "Magic Brew Pack 3", priceUSD: 4.99, brews: 50, perDay: 1 },
      { key: "p10", name: "Magic Brew Pack 4", priceUSD: 9.99, brews: 95, perDay: 1 },
      { key: "p20", name: "Magic Brew Pack 5", priceUSD: 19.99, brews: 185, perDay: 1 },
    ],
    // Rewards for total brews used.
    milestones: [
      { brews: 20, item: "Truegold", qty: 15 },
      { brews: 100, item: "Truegold", qty: 30 },
      { brews: 200, item: "Truegold", qty: 40 },
      { brews: 300, item: "Truegold", qty: 52 },
      { brews: 400, item: "Truegold", qty: 62 },
      { brews: 500, item: "Truegold", qty: 74 },
      { brews: 600, item: "Truegold", qty: 88 },
      { brews: 700, item: "Mystery Badge", qty: 3000 },
      { brews: 800, item: "Mystery Badge", qty: 4500 },
      { brews: 900, item: "Mystery Badge", qty: 6000 },
      { brews: 1000, item: "Mystery Badge", qty: 7500 },
    ],
  };
  const packLimit = (cfg, p) => p.perDay * cfg.eventDays;

  // Purchase limits (the value-guide sheet doesn't list them): Truegold and the 1h speedups 40,
  // the 5m speedup 9,999, everything else 20.
  function shopLimit(item) {
    if (/^truegold$/i.test(item) || /^1h(r)? .*speed/i.test(item)) return 40;
    if (/^5m .*speed/i.test(item)) return 9999;
    return 20;
  }
  const withLimits = (rows) => rows.map((r) => ({ ...r, limit: r.limit || shopLimit(r.item) }));

  // Shop (Brewmaster Stall): vouchers per purchase, items per purchase, purchase limit.
  const SHOP_SNAPSHOT = withLimits([
    { item: "Truegold", tokens: 2500, qty: 14 },
    { item: "1hr General Speed", tokens: 2500, qty: 11 },
    { item: "1h Training Speed", tokens: 2500, qty: 12 },
    { item: "Forgehammer", tokens: 5000, qty: 10 },
    { item: "Lucky Hero Gear Chest", tokens: 5000, qty: 10 },
    { item: "Governor Gear Mats Chest", tokens: 5000, qty: 10 },
    { item: "Charm Guide", tokens: 5000, qty: 22 },
    { item: "Charm Design", tokens: 5000, qty: 22 },
    { item: "5m Training Speed", tokens: 100, qty: 4 },
  ]);

  // ---------- brews ----------
  // u: { missionsPerDay, popup: {free, superior, perfect}, bought: {key: n} }
  function brews(cfg, u) {
    const start = cfg.startBrews;
    const missions = Math.max(0, Math.min(cfg.missionMaxPerDay, u.missionsPerDay)) * cfg.eventDays;
    const popup = cfg.popup.reduce((a, p) => a + (u.popup[p.key] ? p.brews : 0), 0);
    const packs = cfg.packs.reduce((a, p) => a + p.brews * (u.bought[p.key] || 0), 0);
    return { start, missions, popup, packs, total: start + missions + popup + packs };
  }

  function spendUSD(cfg, u) {
    const popup = cfg.popup.reduce((a, p) => a + (u.popup[p.key] ? p.priceUSD : 0), 0);
    const packs = cfg.packs.reduce((a, p) => a + p.priceUSD * (u.bought[p.key] || 0), 0);
    return { popup, packs, usd: popup + packs };
  }

  // ---------- luck ----------
  // Chance of each brew cost for one level: index = brews.
  function levelDist(lv) {
    if (lv.same) { const d = new Array(lv.slots + 1).fill(0); d[lv.slots] = 1; return d; }
    if (lv.counts) return countsDist(lv.counts.slice().sort((a, b) => b - a), new Map());
    let d = [1];
    for (let k = 1; k <= lv.slots; k++) {
      const u = new Array(k + 1).fill(1 / k); u[0] = 0;
      d = convolve(d, u);
    }
    return d;
  }
  // Jars with repeated colors, filled slot by slot. In each slot you try the color with the most
  // jars left first (ties in random order); a wrong color is ruled out for that slot.
  // counts = jars left of each color, sorted high to low.
  function countsDist(counts, memo) {
    const total = counts.reduce((a, b) => a + b, 0);
    if (!total) return [1];
    const key = counts.join(",");
    if (memo.has(key)) return memo.get(key);
    let out = [0];
    let pos = 1; // first guess position of the current tie group
    for (let i = 0; i < counts.length;) {
      let j = i; while (j < counts.length && counts[j] === counts[i]) j++;
      const t = j - i, c = counts[i];
      // The true color is in this group with chance t*c/total, at a random spot pos..pos+t-1.
      const u = new Array(pos + t).fill(0);
      for (let k = pos; k < pos + t; k++) u[k] = 1 / t;
      const next = counts.slice(); next[i]--;
      const rest = countsDist(next.filter((x) => x > 0).sort((a, b) => b - a), memo);
      const part = convolve(u, rest), w = (t * c) / total;
      if (part.length > out.length) out = out.concat(new Array(part.length - out.length).fill(0));
      part.forEach((v, k) => (out[k] += v * w));
      pos += t; i = j;
    }
    memo.set(key, out);
    return out;
  }
  function convolve(a, b) {
    const out = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) {
      if (!a[i]) continue;
      for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
    }
    return out;
  }
  const levelMin = (lv) => lv.slots;
  const levelMax = (lv) => levelDist(lv).length - 1;
  const levelAvg = (lv) => levelDist(lv).reduce((a, v, i) => a + v * i, 0);

  // Cumulative cost to clear levels 1..L, as a running CDF. Built on demand and cached.
  const cum = [{ cdf: [1] }]; // cum[0]: clearing nothing costs 0
  function cumCDF(L) {
    while (cum.length <= L) {
      const n = cum.length;
      const prevCdf = cum[n - 1].cdf;
      const prevPdf = prevCdf.map((v, i) => v - (i ? prevCdf[i - 1] : 0));
      const pdf = convolve(prevPdf, levelDist(level(n)));
      let s = 0; const cdf = pdf.map((v) => (s += v));
      cum.push({ cdf });
    }
    return cum[L].cdf;
  }
  // Chance that B brews clear levels 1..L.
  function chance(L, B) {
    if (L <= 0) return 1;
    const c = cumCDF(L);
    if (B < 0) return 0;
    return B >= c.length - 1 ? 1 : Math.min(1, c[Math.floor(B)]);
  }
  // Brews needed to clear 1..L at a luck level: p = 0.25 lucky, 0.5 typical, 0.75 unlucky, 1 worst.
  function brewsFor(L, p) {
    if (L <= 0) return 0;
    const c = cumCDF(L);
    if (p >= 1) return c.length - 1;
    for (let i = 0; i < c.length; i++) if (c[i] >= p - 1e-12) return i;
    return c.length - 1;
  }
  // Levels cleared with B brews at luck p.
  function levelsCleared(B, p) {
    let L = 0;
    while (brewsFor(L + 1, p) <= B) L++;
    return L;
  }
  function vouchersFor(L) {
    let v = 0;
    for (let n = 1; n <= L; n++) v += level(n).vouchers;
    return v;
  }

  // ---------- cheapest packs for a brew target ----------
  // Every mix of the packs still on sale, sorted by price (ties: more brews first).
  function packCombos(cfg, u) {
    const opts = [];
    // Bonanza paths unlock in order (Free, then $4.99, then $9.99), so the unbought ones are one chain:
    // taking n of them means the next n in order.
    const steps = cfg.popup.filter((p) => p.priceUSD > 0 && !u.popup[p.key]);
    if (steps.length) {
      const cum = [{ price: 0, brews: 0 }];
      steps.forEach((p, i) => cum.push({ price: cum[i].price + p.priceUSD, brews: cum[i].brews + p.brews }));
      opts.push({ kind: "chain", steps, cum, max: steps.length });
    }
    cfg.packs.forEach((p) => {
      const left = packLimit(cfg, p) - (u.bought[p.key] || 0);
      if (left > 0) opts.push({ kind: "pack", key: p.key, max: left, price: p.priceUSD, brews: p.brews });
    });
    const out = [];
    const counts = new Array(opts.length).fill(0);
    (function walk(i, price, b) {
      if (i === opts.length) { out.push({ price: Math.round(price * 100) / 100, brews: b, counts: counts.slice() }); return; }
      for (let n = 0; n <= opts[i].max; n++) {
        counts[i] = n;
        const o = opts[i];
        if (o.kind === "chain") walk(i + 1, price + o.cum[n].price, b + o.cum[n].brews);
        else walk(i + 1, price + n * o.price, b + n * o.brews);
      }
      counts[i] = 0;
    })(0, 0, 0);
    out.sort((a, b) => a.price - b.price || b.brews - a.brews);
    return { opts, combos: out };
  }
  // Cheapest way to get `extra` more brews. null if nothing on sale gives enough.
  function cheapest(pc, extra) {
    if (extra <= 0) return { price: 0, brews: 0, add: [] };
    const c = pc.combos.find((x) => x.brews >= extra);
    if (!c) return null;
    const add = [];
    c.counts.forEach((n, i) => {
      if (n <= 0) return;
      const o = pc.opts[i];
      if (o.kind === "chain") o.steps.slice(0, n).forEach((p) => add.push({ kind: "popup", key: p.key, n: 1, price: p.priceUSD, brews: p.brews }));
      else add.push({ ...o, n });
    });
    return { price: c.price, brews: c.brews, add };
  }
  // Apply a plan to a user state.
  function withPlan(u, plan) {
    const v = { missionsPerDay: u.missionsPerDay, popup: { ...u.popup }, bought: { ...u.bought } };
    if (plan) plan.add.forEach((a) => { if (a.kind === "popup") v.popup[a.key] = true; else v.bought[a.key] = (v.bought[a.key] || 0) + a.n; });
    return v;
  }

  // ---------- shop ----------
  // Vouchers a wishlist costs. cart: { item: purchases }
  function cartVouchers(shop, cart) {
    return shop.reduce((a, s) => a + s.tokens * Math.min((cart && cart[s.item]) || 0, s.limit || Infinity), 0);
  }
  // Fewest orders whose vouchers add up to v.
  function ordersForVouchers(v) {
    let L = 0, got = 0;
    while (got < v) got += level(++L).vouchers;
    return L;
  }
  // Spend vouchers within purchase limits: the wishlist first (as much as fits), then `rest`,
  // then every other item in `order` (best value first) until the vouchers or limits run out.
  function shopSpend(shop, vouchers, cart, rest, order) {
    const out = new Map(), buys = [], got = {};
    let left = vouchers, short = 0;
    const room = (s) => (s.limit || Infinity) - (got[s.item] || 0);
    const add = (s, n, wish) => {
      n = Math.max(0, Math.min(n, room(s), Math.floor(left / s.tokens)));
      if (!n) return 0;
      out.set(s.item, (out.get(s.item) || 0) + n * s.qty);
      left -= n * s.tokens;
      got[s.item] = (got[s.item] || 0) + n;
      buys.push({ ...s, n, wish });
      return n;
    };
    shop.forEach((s) => {
      const want = Math.min((cart && cart[s.item]) || 0, s.limit || Infinity);
      if (want) short += want - add(s, want, true);
    });
    const main = shop.find((s) => s.item === rest);
    if (main) add(main, Infinity, false);
    (order || shop).forEach((s) => add(s, Infinity, false));
    return { items: out, left, buys, short, got };
  }

  // ---------- items ----------
  function milestoneItems(cfg, used) {
    const m = new Map();
    cfg.milestones.forEach((x) => { if (used >= x.brews) m.set(x.item, (m.get(x.item) || 0) + x.qty); });
    return m;
  }
  function packItems(cfg, u) {
    const m = new Map();
    cfg.popup.forEach((p) => { if (u.popup[p.key]) p.items.forEach(([it, q]) => m.set(it, (m.get(it) || 0) + q)); });
    return m;
  }

  // ---------- values (Mira's KS Value Guide) ----------
  const SHEET = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTRHqvowpJsZVEXMTkBAK2orlNrEuHnkpcbK_c_-dA4YNPxhzq95mzzxm3OxVjh33QylX-W1IIWj-c/pub?single=true&output=csv&gid=";
  const VALUES_URL = SHEET + "552825098";
  const SHOPS_URL = SHEET + "1629320599";
  const VALUES_PAGE = "https://mirakingshot.github.io/ks-value-guide/masterlist.html";
  const SHOP_PAGE = "https://mirakingshot.github.io/ks-value-guide/recurring.html?e=Alchemy%20Junction";
  const EVENT_NAME = "Alchemy Junction";
  // Saved 2026-11-17: dollars per item.
  const VALUES_SNAPSHOT = {
    "Gems": { unit: 4.7 / 25000 },
    "Truegold": { unit: 0.0715 },
    "1hr General Speed": { unit: 0.1049 },
    "1h Training Speed": { unit: 0.1049 },
    "3hr General Speed": { unit: 0.3146666667 },
    "5m Training Speed": { unit: 0.0087 },
    "100 XP Enhancement": { unit: 0.1124 },
    "Lucky Hero Gear Chest": { unit: 0.1967 },
    "Forgehammer": { unit: 0.1967 },
    "Governor Gear Mats Chest": { unit: 0.1731 },
    "Charm Guide": { unit: 0.0741 },
    "Charm Design": { unit: 0.0741 },
    "Mythic General Hero Shard": { unit: 0.45 },
  };

  function parseCSV(t) {
    const rows = []; let r = [], c = "", q = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { r.push(c); c = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; r.push(c); rows.push(r); r = []; c = ""; }
      else c += ch;
    }
    if (c || r.length) { r.push(c); rows.push(r); }
    const [h, ...b] = rows.filter((x) => x.some((v) => v.trim()));
    if (!h) return [];
    return b.map((x) => Object.fromEntries(h.map((k, i) => [k.trim().toLowerCase(), (x[i] || "").trim()])));
  }
  const money = (s) => parseFloat(String(s).replace(/[$,\s]/g, ""));

  // Same rule as the masterlist: unit = usd / qty, skipping superseded rows.
  function parseValues(csv) {
    const m = {};
    for (const r of parseCSV(csv)) {
      if (!r.item || /^(true|yes|1|x)$/i.test(r.superseded || "")) continue;
      const qty = money(r.qty), usd = money(r.usd);
      if (qty > 0 && isFinite(usd)) m[r.item] = { unit: usd / qty, source: r.source || "" };
    }
    return m;
  }
  // This event's shop rows from the shops sheet.
  function parseShop(csv) {
    return parseCSV(csv)
      .filter((r) => (r.reoccuring || r.recurring || r.reoccurring || "").trim().toLowerCase() === EVENT_NAME.toLowerCase() && r.item)
      .map((r) => ({ item: r.item, tokens: money(r.tokens), qty: money(r.qty) > 0 ? money(r.qty) : 1, limit: money(r.limit) > 0 ? money(r.limit) : shopLimit(r.item) }))
      .filter((r) => r.tokens > 0);
  }

  function valueItems(items, values) {
    const rows = [], unpriced = [];
    let total = 0;
    for (const [item, qty] of items) {
      if (!qty) continue;
      const v = values[item];
      if (!v) { unpriced.push({ item, qty }); continue; }
      rows.push({ item, qty, unit: v.unit, value: v.unit * qty });
      total += v.unit * qty;
    }
    rows.sort((a, b) => b.value - a.value);
    return { rows, unpriced, total };
  }

  window.AJ = {
    EARLY, LATER, LATER_TENTH, LATER_MIXED, DEFAULTS, SHOP_SNAPSHOT, level, packLimit,
    brews, spendUSD, levelDist, levelMin, levelMax, levelAvg, chance, brewsFor, levelsCleared, vouchersFor,
    packCombos, cheapest, withPlan, shopSpend, shopLimit, cartVouchers, ordersForVouchers, milestoneItems, packItems,
    VALUES_URL, SHOPS_URL, VALUES_PAGE, SHOP_PAGE, VALUES_SNAPSHOT, parseValues, parseShop, valueItems,
  };
})();
