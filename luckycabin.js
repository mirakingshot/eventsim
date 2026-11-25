// Lucky Cabin (Harvest Celebration) calculator — pure logic, no DOM.
//
// Model (from the in-game rules and "Chances of Rewards"):
// - Every wish costs 1 Wish Voucher and gives 1 Wish Point. Vouchers come from commissions and Lucky Packs.
// - Each wish spins the wheel (odds below). Four slots pay Lucky Marks; the rest pay items.
// - Every 100 Wish Points can be spent on a Sincere Wish: a guaranteed 200–500 Lucky Marks.
// - Wish milestones (total wishes made) pay Lucky Marks.
// - Lucky Marks buy items in the Lucky Shop (open one day longer than the cabin).
(function () {
  "use strict";

  // ---------- event data ----------
  const DEFAULTS = {
    eventDays: 5, // Lucky Cabin, commissions and Lucky Packs
    shopDays: 6, // the Lucky Shop stays open one more day
    startVouchers: 1, // everyone gets 1 Wish Voucher at the start
    dailyFreeVouchers: 1, // 1 free Wish Voucher a day on the Lucky Pack page
    missionVouchers: 20, // Wish Vouchers from missions (commissions), assumed all done
    missionMarks: 20, // free Lucky Marks from missions
    // Wheel: chance per wish, and what it pays.
    wheel: [
      { marks: 500, chance: 0.002 },
      { marks: 400, chance: 0.003 },
      { marks: 300, chance: 0.01 },
      { marks: 200, chance: 0.005 },
      { item: "Governor Gear Mats Chest", qty: 2, chance: 0.1225 },
      { item: "Artisans Vision", qty: 3, chance: 0.1225 },
      { item: "Lv.3 Custom Resource Chest", qty: 1, chance: 0.1225 },
      { item: "Truegold", qty: 4, chance: 0.1225 },
      { item: "Charm Design", qty: 3, chance: 0.1225 },
      { item: "Charm Guide", qty: 3, chance: 0.1225 },
      { item: "Lv.3 Custom Resource Chest", qty: 1, chance: 0.1225 },
      { item: "100 XP Enhancement", qty: 2, chance: 0.1225 },
    ],
    // Sincere Wish (costs 100 Wish Points): always Lucky Marks.
    sincere: [
      { marks: 500, chance: 0.1 },
      { marks: 400, chance: 0.15 },
      { marks: 300, chance: 0.5 },
      { marks: 200, chance: 0.25 },
    ],
    sincereCost: 100,
    // Wish milestones: total wishes made → Lucky Marks.
    milestones: [
      { wishes: 10, marks: 50 },
      { wishes: 30, marks: 50 },
      { wishes: 60, marks: 100 },
      { wishes: 100, marks: 100 },
      { wishes: 150, marks: 200 },
      { wishes: 220, marks: 200 },
      { wishes: 300, marks: 300 },
      { wishes: 500, marks: 500 },
      { wishes: 700, marks: 600 },
      { wishes: 1000, marks: 1000 },
    ],
    // Lucky Packs: bought per day; Lucky Pack 5 three times a day.
    packs: [
      { key: "p1", name: "Lucky Pack 1", priceUSD: 4.99, vouchers: 10, marks: 60, perDay: 1,
        items: [["Gems", 2500], ["100 VIP XP", 25], ["Lv.3 Custom Resource Chest", 20], ["Gray chest (name?)", 1]] },
      { key: "p2", name: "Lucky Pack 2", priceUSD: 9.99, vouchers: 18, marks: 100, perDay: 1,
        items: [["Gems", 5000], ["100 VIP XP", 40], ["Lv.3 Custom Resource Chest", 40], ["Green chest (name?)", 1]] },
      { key: "p3", name: "Lucky Pack 3", priceUSD: 19.99, vouchers: 32, marks: 120, perDay: 1,
        items: [["Gems", 10000], ["Golden Autumn Pouch", 1], ["100 VIP XP", 60], ["Lv.3 Custom Resource Chest", 80]] },
      { key: "p4", name: "Lucky Pack 4", priceUSD: 49.99, vouchers: 75, marks: 200, perDay: 1,
        items: [["Gems", 25000], ["Golden Autumn Pouch", 2], ["1,000 VIP XP", 12], ["Lv.3 Custom Resource Chest", 200]] },
      { key: "p5", name: "Lucky Pack 5", priceUSD: 99.99, vouchers: 130, marks: 300, perDay: 3,
        items: [["Gems", 50000], ["Golden Autumn Pouch", 3], ["1,000 VIP XP", 20], ["Lv.3 Custom Resource Chest", 400]] },
    ],
  };
  const packLimit = (cfg, p) => p.perDay * cfg.eventDays;

  // Lucky Shop: Lucky Marks per purchase, items per purchase, purchase limit.
  // `id` keeps the two 100 XP Enhancement rows apart.
  const SHOP_SNAPSHOT = [
    { id: "xp9", item: "100 XP Enhancement", qty: 9, tokens: 10, limit: 2 * 6, daily: 2 },
    { id: "tg", item: "Truegold", qty: 78, tokens: 80, limit: 25 },
    { id: "shard", item: "Mythic General Hero Shard", qty: 12, tokens: 80, limit: 30 },
    { id: "lucky", item: "Lucky Hero Gear Chest", qty: 28, tokens: 80, limit: 30 },
    { id: "xp48", item: "100 XP Enhancement", qty: 48, tokens: 80, limit: 30 },
    { id: "forge", item: "Forgehammer", qty: 28, tokens: 80, limit: 30 },
    { id: "mithril", item: "Mithril", qty: 1, tokens: 60, limit: 30 },
    { id: "houseshard", item: "Mythic General Decoration Component", qty: 6, tokens: 80, limit: 40 },
    { id: "scroll", item: "General Wonder Blueprint", qty: 3, tokens: 80, limit: 60 },
    { id: "vision", item: "Artisans Vision", qty: 70, tokens: 80, limit: 30 },
    { id: "govchest", item: "Governor Gear Mats Chest", qty: 28, tokens: 80, limit: 30 },
    { id: "design", item: "Charm Design", qty: 60, tokens: 80, limit: 30 },
    { id: "guide", item: "Charm Guide", qty: 60, tokens: 80, limit: 30 },
    { id: "speed1h", item: "1hr General Speed", qty: 60, tokens: 80, limit: 30 },
    { id: "speed5m", item: "5m Training Speed", qty: 35, tokens: 5, limit: 9999 },
  ];

  // ---------- vouchers, wishes, spend ----------
  // u: { bought: {key: n} }. Free vouchers: 1 at the start + 1 a day + missions.
  function vouchers(cfg, u) {
    const packs = cfg.packs.reduce((a, p) => a + p.vouchers * (u.bought[p.key] || 0), 0);
    const start = cfg.startVouchers, daily = cfg.dailyFreeVouchers * cfg.eventDays, missions = cfg.missionVouchers;
    const free = start + daily + missions;
    return { start, daily, missions, free, packs, total: free + packs };
  }
  function packMarks(cfg, u) {
    return cfg.packs.reduce((a, p) => a + p.marks * (u.bought[p.key] || 0), 0);
  }
  function spendUSD(cfg, u) {
    return cfg.packs.reduce((a, p) => a + p.priceUSD * (u.bought[p.key] || 0), 0);
  }
  const sincereCount = (cfg, W) => Math.floor(W / cfg.sincereCost);
  function milestoneMarks(cfg, W) {
    return cfg.milestones.reduce((a, m) => a + (W >= m.wishes ? m.marks : 0), 0);
  }

  // ---------- luck: Lucky Marks from the wheel and Sincere Wishes ----------
  // Marks come in hundreds, so distributions are kept in units of 100 marks.
  // q[luck][W] = marks (in hundreds) that a share of players reach after W wishes.
  // lucky = 75th percentile (more marks than 3 in 4 players get), typical = median,
  // unlucky = 25th percentile, worst = no Lucky Marks from the wheel and 200 from every Sincere Wish.
  function kernel(list) {
    const k = new Array(6).fill(0);
    list.forEach((x) => { if (x.marks) k[x.marks / 100] += x.chance; });
    k[0] = 1 - k.reduce((a, b) => a + b, 0);
    return k;
  }
  function makeLuck(cfg) {
    const wk = kernel(cfg.wheel), sk = kernel(cfg.sincere);
    const q = { lucky: [0], typical: [0], unlucky: [0] };
    let off = 0, p = [1];
    const step = (k) => {
      const out = new Array(p.length + k.length - 1).fill(0);
      for (let i = 0; i < p.length; i++) { if (!p[i]) continue; for (let j = 0; j < k.length; j++) out[i + j] += p[i] * k[j]; }
      // drop the far tails so the arrays stay short
      let a = 0, b = out.length - 1;
      while (a < b && out[a] < 1e-13) a++;
      while (b > a && out[b] < 1e-13) b--;
      off += a; p = out.slice(a, b + 1);
    };
    const quant = (t) => { let s = 0; for (let i = 0; i < p.length; i++) { s += p[i]; if (s >= t - 1e-12) return off + i; } return off + p.length - 1; };
    function build(W) {
      for (let w = q.typical.length; w <= W; w++) {
        step(wk);
        if (w % cfg.sincereCost === 0) step(sk);
        q.lucky.push(quant(0.75)); q.typical.push(quant(0.5)); q.unlucky.push(quant(0.25));
      }
    }
    // Random Lucky Marks (wheel + Sincere Wishes) after W wishes at a luck level.
    return function marksAt(W, luck) {
      if (W <= 0) return 0;
      if (luck === "worst") return 200 * sincereCount(cfg, W);
      build(W);
      return 100 * q[luck][W];
    };
  }
  // Average Lucky Marks per wish from the wheel, and per Sincere Wish.
  const avgMarks = (list) => list.reduce((a, x) => a + (x.marks || 0) * x.chance, 0);

  // Everything you end with: wishes, Lucky Marks by source.
  function run(cfg, u, marksAt, luck) {
    const v = vouchers(cfg, u), W = v.total;
    const pm = packMarks(cfg, u), mm = milestoneMarks(cfg, W), rm = marksAt(W, luck);
    const fm = cfg.missionMarks;
    return { vouchers: v, wishes: W, sincere: sincereCount(cfg, W), freeMarks: fm, packMarks: pm, msMarks: mm, randMarks: rm, marks: fm + pm + mm + rm };
  }

  // ---------- cheapest packs for a Lucky Mark target ----------
  // Every mix of packs still on sale, sorted by price.
  function packCombos(cfg, u) {
    const opts = cfg.packs.map((p) => ({ key: p.key, max: Math.max(0, packLimit(cfg, p) - (u.bought[p.key] || 0)), price: p.priceUSD, vouchers: p.vouchers, marks: p.marks }))
      .filter((o) => o.max > 0);
    const out = [];
    const counts = new Array(opts.length).fill(0);
    (function walk(i, price, v, m) {
      if (i === opts.length) { out.push({ price: Math.round(price * 100) / 100, vouchers: v, marks: m, counts: counts.slice() }); return; }
      for (let n = 0; n <= opts[i].max; n++) { counts[i] = n; walk(i + 1, price + n * opts[i].price, v + n * opts[i].vouchers, m + n * opts[i].marks); }
      counts[i] = 0;
    })(0, 0, 0, 0);
    out.sort((a, b) => a.price - b.price || b.vouchers - a.vouchers);
    return { opts, combos: out };
  }
  // Cheapest extra packs so that Lucky Marks reach `need` at this luck. null if nothing on sale is enough.
  function cheapest(cfg, u, pc, need, marksAt, luck) {
    const base = vouchers(cfg, u).total, baseM = packMarks(cfg, u) + cfg.missionMarks;
    const total = (c) => { const W = base + c.vouchers; return baseM + c.marks + milestoneMarks(cfg, W) + marksAt(W, luck); };
    if (total({ vouchers: 0, marks: 0 }) >= need) return { price: 0, vouchers: 0, add: [] };
    const c = pc.combos.find((x) => total(x) >= need);
    if (!c) return null;
    const add = [];
    c.counts.forEach((n, i) => { if (n > 0) add.push({ ...pc.opts[i], n }); });
    return { price: c.price, vouchers: c.vouchers, marks: c.marks, add };
  }
  function withPlan(u, plan) {
    const v = { bought: { ...u.bought } };
    if (plan) plan.add.forEach((a) => (v.bought[a.key] = (v.bought[a.key] || 0) + a.n));
    return v;
  }

  // ---------- shop ----------
  function cartMarks(shop, cart) {
    return shop.reduce((a, s) => a + s.tokens * Math.min((cart && cart[s.id]) || 0, s.limit), 0);
  }
  // Spend marks within limits: wishlist first, then `rest`, then every other row in `order`.
  function shopSpend(shop, marks, cart, rest, order) {
    const out = new Map(), buys = [], got = {};
    let left = marks, short = 0;
    const add = (s, n, wish) => {
      n = Math.max(0, Math.min(n, s.limit - (got[s.id] || 0), Math.floor(left / s.tokens)));
      if (!n) return 0;
      out.set(s.item, (out.get(s.item) || 0) + n * s.qty);
      left -= n * s.tokens; got[s.id] = (got[s.id] || 0) + n;
      buys.push({ ...s, n, wish });
      return n;
    };
    shop.forEach((s) => { const want = Math.min((cart && cart[s.id]) || 0, s.limit); if (want) short += want - add(s, want, true); });
    const main = shop.find((s) => s.id === rest);
    if (main) add(main, Infinity, false);
    (order || shop).forEach((s) => add(s, Infinity, false));
    return { items: out, left, buys, short, got };
  }

  // ---------- items ----------
  // Low-value items left out of "What you get" (they still show in the wheel odds and pack lists).
  const JUNK_NAMES = new Set(["Lv.3 Custom Resource Chest", "100 VIP XP", "1,000 VIP XP", "Gray chest (name?)", "Green chest (name?)"]);
  const JUNK = { test: (name) => JUNK_NAMES.has(name) };
  // Expected items from W wishes on the wheel.
  function wheelItems(cfg, W) {
    const m = new Map();
    cfg.wheel.forEach((x) => { if (x.item && !JUNK.test(x.item)) m.set(x.item, (m.get(x.item) || 0) + x.qty * x.chance * W); });
    return m;
  }
  function packItems(cfg, u) {
    const m = new Map();
    cfg.packs.forEach((p) => { const n = u.bought[p.key] || 0; if (n) p.items.forEach(([it, q]) => { if (!JUNK.test(it)) m.set(it, (m.get(it) || 0) + q * n); }); });
    return m;
  }

  // ---------- values (Mira's KS Value Guide) ----------
  const SHEET = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTRHqvowpJsZVEXMTkBAK2orlNrEuHnkpcbK_c_-dA4YNPxhzq95mzzxm3OxVjh33QylX-W1IIWj-c/pub?single=true&output=csv&gid=";
  const VALUES_URL = SHEET + "552825098";
  const VALUES_PAGE = "https://mirakingshot.github.io/ks-value-guide/masterlist.html";
  // Saved 2026-11-24: dollars per item.
  const VALUES_SNAPSHOT = {
    "Gems": { unit: 4.7 / 25000 },
    "Truegold": { unit: 0.0715 },
    "1hr General Speed": { unit: 0.1049 },
    "5m Training Speed": { unit: 0.0087 },
    "100 XP Enhancement": { unit: 0.1124 },
    "Lucky Hero Gear Chest": { unit: 0.1967 },
    "Forgehammer": { unit: 0.1967 },
    "Governor Gear Mats Chest": { unit: 0.1731 },
    "Charm Guide": { unit: 0.0741 },
    "Charm Design": { unit: 0.0741 },
    "Mythic General Hero Shard": { unit: 0.45 },
    "Mithril": { unit: 4.53 },
    "Artisans Vision": { unit: 0.062 },
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
  function parseValues(csv) {
    const m = {};
    for (const r of parseCSV(csv)) {
      if (!r.item || /^(true|yes|1|x)$/i.test(r.superseded || "")) continue;
      const qty = money(r.qty), usd = money(r.usd);
      if (qty > 0 && isFinite(usd)) m[r.item] = { unit: usd / qty, source: r.source || "" };
    }
    return m;
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

  window.LC = {
    DEFAULTS, SHOP_SNAPSHOT, packLimit, vouchers, packMarks, spendUSD, sincereCount, milestoneMarks,
    makeLuck, avgMarks, run, packCombos, cheapest, withPlan, cartMarks, shopSpend, wheelItems, packItems,
    VALUES_URL, VALUES_PAGE, VALUES_SNAPSHOT, parseValues, valueItems,
  };
})();
