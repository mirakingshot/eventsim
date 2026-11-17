// Windward Voyage / Wavebound Voyage / Voyage of Light (Kingshot) calculator — pure logic, no DOM.
// Works in the browser (window.WV) and in Node (module.exports).
//
// Model (game config 1.14.20):
// - The event lasts 5 days. Every Voyager Team sails nonstop; one voyage takes 8 hours.
//   Each Compass adds 1 hour of sailing. Voyages = floor((teams × 120h + compasses × 1h) / 8h).
// - Teams: #1 free, #2 2,000 gems, #3 10,000 gems, #4 from the Employ Exploration Team Backpack.
// - Every voyage brings back one chest: 90% Common, 10% Premium.
// - Merging: 3 Common → 1 Premium; 3 Premium → 1 Exquisite (75%) or Majestic (25%).
// - Milestones pay out at a total number of voyages.
(function (root) {
  "use strict";

  // Item names
  const ITEMS = {
    101: "Gems",
    100003: "100 Gems",
    200102: "5m General Speedup",
    200103: "1h General Speedup",
    500220: "Mythic General Hero Shard",
    500231: "100 Enhancement XP Part",
    500235: "Mithril",
    500240: "Forgehammer",
    510000: "Governor Gear Materials Chest",
    510001: "Lucky Hero Gear Chest",
    510003: "Random Governor Charm Material Chest",
    510023: "Gear Boost Custom Chest",
    600021: "Satin",
    600022: "Gilded Threads",
    600023: "Artisan's Vision",
    600024: "Charm Design",
    600025: "Charm Guide",
    620001: "100 VIP XP",
    620002: "1,000 VIP XP",
    700020: "Compass",
    700021: "Voyager Team",
  };

  // Chests that open into fixed contents.
  const CONTENTS = {
    510000: [{ id: 600023, qty: 1 }, { id: 600022, qty: 4 }, { id: 600021, qty: 400 }],
  };

  // Chests where you choose one option.
  const PICKS = {
    510023: [{ id: 510001, qty: 10 }, { id: 500240, qty: 10 }, { id: 500231, qty: 20 }, { id: 500235, qty: 1 }],
  };

  const S = (fromDay, toDay, chests, milestones) => ({ fromDay, toDay, chests, milestones });
  const C = (arr) => arr.map(([id, qty]) => ({ id, qty }));
  const M = (arr) => arr.map(([voyages, id, qty]) => ({ voyages, id, qty }));
  const TIERS = [1, 5, 20, 60, 120, 200, 350, 550, 800];
  const ms = (pairs) => M(TIERS.map((v, i) => [v, pairs[i][0], pairs[i][1]]));

  // Voyage of Light milestones. 120 / 200 / 350 / 550 / 800 give 6 / 10 / 15 / 20 / 30 Gear Boost Custom Chests.
  const lightMs = (forge5, forge20) =>
    ms([[510023, 1], [500240, forge5], [500240, forge20], [510023, 2], [510023, 6], [510023, 10], [510023, 15], [510023, 20], [510023, 30]]);

  const EVENTS = [
    {
      key: "windward", name: "Windward Voyage", category: "Governor Gear", colour: "#b8392f",
      sets: [
        S(1, 154, { common: C([[600022, 12], [600021, 800], [200102, 12]]), premium: C([[600022, 30], [600021, 3000], [200103, 3]]), exquisite: C([[510000, 6], [600023, 6], [500220, 2]]), majestic: C([[510000, 18], [600023, 18], [500220, 6]]) },
          ms([[600023, 6], [600023, 12], [600023, 30], [600023, 60], [510000, 40], [510000, 60], [510000, 120], [510000, 150], [510000, 180]])),
        S(155, 224, { common: C([[600022, 14], [600021, 900], [200102, 12]]), premium: C([[600022, 35], [600021, 3500], [200103, 3]]), exquisite: C([[510000, 7], [600023, 8], [500220, 2]]), majestic: C([[510000, 21], [600023, 21], [500220, 6]]) },
          ms([[600023, 7], [600023, 14], [600023, 35], [600023, 70], [510000, 45], [510000, 70], [510000, 140], [510000, 175], [510000, 210]])),
        S(225, 322, { common: C([[600022, 16], [600021, 1050], [200102, 16]]), premium: C([[600022, 41], [600021, 4100], [200103, 4]]), exquisite: C([[510000, 9], [600023, 9], [500220, 2]]), majestic: C([[510000, 27], [600023, 27], [500220, 6]]) },
          ms([[600023, 8], [600023, 16], [600023, 40], [600023, 80], [510000, 50], [510000, 80], [510000, 160], [510000, 200], [510000, 240]])),
        S(323, 448, { common: C([[600022, 20], [600021, 1300], [200102, 20]]), premium: C([[600022, 50], [600021, 5000], [200103, 5]]), exquisite: C([[510000, 11], [600023, 11], [500220, 2]]), majestic: C([[510000, 33], [600023, 33], [500220, 6]]) },
          ms([[600023, 10], [600023, 20], [600023, 50], [600023, 100], [510000, 65], [510000, 100], [510000, 200], [510000, 250], [510000, 300]])),
        S(449, null, { common: C([[600022, 24], [600021, 1600], [200102, 20]]), premium: C([[600022, 60], [600021, 6000], [200103, 5]]), exquisite: C([[510000, 12], [600023, 12], [500220, 2]]), majestic: C([[510000, 36], [600023, 36], [500220, 6]]) },
          ms([[600023, 12], [600023, 24], [600023, 60], [600023, 120], [510000, 80], [510000, 120], [510000, 240], [510000, 300], [510000, 360]])),
      ],
    },
    {
      key: "wavebound", name: "Wavebound Voyage", category: "Governor Charms", colour: "#2f5fa8",
      sets: [
        S(1, 196, { common: C([[600024, 3], [200102, 12], [100003, 2]]), premium: C([[600025, 3], [600024, 6], [200103, 4]]), exquisite: C([[600025, 9], [600024, 9], [500220, 2]]), majestic: C([[600025, 30], [600024, 30], [500220, 6]]) },
          ms([[600025, 5], [600025, 10], [600025, 20], [600024, 40], [600024, 90], [600024, 120], [510003, 80], [510003, 100], [510003, 120]])),
        S(197, 322, { common: C([[600024, 4], [200102, 15], [100003, 2]]), premium: C([[600025, 4], [600024, 8], [200103, 5]]), exquisite: C([[600025, 12], [600024, 12], [500220, 2]]), majestic: C([[600025, 40], [600024, 40], [500220, 6]]) },
          ms([[600025, 7], [600025, 15], [600025, 30], [600024, 60], [600024, 135], [600024, 180], [510003, 120], [510003, 150], [510003, 180]])),
        S(323, 448, { common: C([[600024, 5], [200102, 18], [100003, 2]]), premium: C([[600025, 5], [600024, 10], [200103, 6]]), exquisite: C([[600025, 15], [600024, 15], [500220, 2]]), majestic: C([[600025, 50], [600024, 50], [500220, 6]]) },
          ms([[600025, 9], [600025, 18], [600025, 36], [600024, 72], [600024, 162], [600024, 216], [510003, 144], [510003, 180], [510003, 216]])),
        S(449, null, { common: C([[600024, 6], [200102, 18], [100003, 2]]), premium: C([[600025, 6], [600024, 12], [200103, 6]]), exquisite: C([[600025, 18], [600024, 18], [500220, 2]]), majestic: C([[600025, 60], [600024, 60], [500220, 6]]) },
          ms([[600025, 10], [600025, 20], [600025, 40], [600024, 80], [600024, 180], [600024, 240], [510003, 160], [510003, 200], [510003, 240]])),
      ],
    },
    {
      key: "light", name: "Voyage of Light", category: "Hero Gear", colour: "#b8760d",
      sets: [
        S(1, 154, { common: C([[100003, 5], [500231, 2], [200102, 12]]), premium: C([[510001, 3], [500231, 3], [200103, 3]]), exquisite: C([[500240, 6], [510001, 4], [500220, 2]]), majestic: C([[500240, 18], [510001, 12], [500220, 6]]) }, lightMs(6, 12)),
        S(155, 224, { common: C([[100003, 5], [500231, 3], [200102, 12]]), premium: C([[510001, 4], [500231, 5], [200103, 3]]), exquisite: C([[500240, 9], [510001, 6], [500220, 2]]), majestic: C([[500240, 27], [510001, 18], [500220, 6]]) }, lightMs(9, 18)),
        S(225, 322, { common: C([[100003, 5], [500231, 4], [200102, 16]]), premium: C([[510001, 6], [500231, 6], [200103, 4]]), exquisite: C([[500240, 12], [510001, 8], [500220, 2]]), majestic: C([[500240, 36], [510001, 24], [500220, 6]]) }, lightMs(12, 24)),
        S(323, 448, { common: C([[100003, 5], [500231, 5], [200102, 20]]), premium: C([[510001, 7], [500231, 8], [200103, 5]]), exquisite: C([[500240, 15], [510001, 10], [500220, 2]]), majestic: C([[500240, 45], [510001, 30], [500220, 6]]) }, lightMs(15, 30)),
        S(449, null, { common: C([[100003, 5], [500231, 6], [200102, 20]]), premium: C([[510001, 9], [500231, 9], [200103, 5]]), exquisite: C([[500240, 18], [510001, 12], [500220, 2]]), majestic: C([[500240, 54], [510001, 36], [500220, 6]]) }, lightMs(18, 36)),
      ],
    },
  ];

  const DEFAULTS = {
    eventDays: 5,
    voyageHours: 8,
    hoursPerCompass: 1,
    freeCompassesPerDay: 1,
    teams: [
      { team: 1, cost: "free" },
      { team: 2, cost: "gems", gems: 2000 },
      { team: 3, cost: "gems", gems: 10000 },
      { team: 4, cost: "pack" },
    ],
    odds: { common: 0.9, premium: 0.1, exquisite: 0.75, majestic: 0.25, chestsPerMerge: 3 },
    packs: [
      { key: "common", name: "Common Sails Aloft Pack", priceUSD: 4.99, compasses: 100, limit: 5, extras: [{ id: 620001, qty: 25 }, { id: 101, qty: 2500 }] },
      { key: "uncommon", name: "Uncommon Sails Aloft Pack", priceUSD: 9.99, compasses: 180, limit: 5, extras: [{ id: 620001, qty: 40 }, { id: 101, qty: 5000 }] },
      { key: "rare", name: "Rare Sails Aloft Pack", priceUSD: 19.99, compasses: 320, limit: 5, extras: [{ id: 620001, qty: 60 }, { id: 101, qty: 10000 }] },
      { key: "epic", name: "Epic Sails Aloft Pack", priceUSD: 49.99, compasses: 720, limit: 5, extras: [{ id: 620002, qty: 12 }, { id: 101, qty: 25000 }] },
    ],
    voyagerPack: { name: "Employ Exploration Team Backpack", priceUSD: 4.99, compasses: 60, extras: [{ id: 620001, qty: 25 }, { id: 101, qty: 2500 }] },
  };

  const WAYS = ["open", "mergeCommon", "mergePremium", "mergeAll"];
  const WAY_LABELS = { open: "Open all", mergeCommon: "Merge Common only", mergePremium: "Merge Premium only", mergeAll: "Merge everything", own: "My own merges" };
  const TIER_KEYS = ["common", "premium", "exquisite", "majestic"];

  const itemName = (id) => ITEMS[id] || "Item " + id;
  const eventByKey = (k) => EVENTS.find((e) => e.key === k) || EVENTS[0];
  function setForDay(ev, day) {
    let s = ev.sets[0];
    for (const x of ev.sets) if (x.fromDay <= day) s = x;
    return s;
  }
  const dayLabel = (s) => (s.toDay === null ? `Day ${s.fromDay}+` : `Day ${s.fromDay}–${s.toDay}`);

  const teamHours = (cfg, teams) => teams * cfg.eventDays * 24;
  const voyagerTeamNo = (cfg) => (cfg.teams.find((t) => t.cost === "pack") || cfg.teams[cfg.teams.length - 1]).team;

  // Compasses from every source. state = { teams, banked, bought: {key: n} }
  function compasses(cfg, state) {
    const free = cfg.eventDays * cfg.freeCompassesPerDay;
    const voyager = state.teams >= voyagerTeamNo(cfg) ? cfg.voyagerPack.compasses : 0;
    const packs = cfg.packs.reduce((a, k) => a + k.compasses * (state.bought[k.key] || 0), 0);
    return { free, voyager, banked: state.banked, packs, total: free + voyager + state.banked + packs };
  }

  function voyages(cfg, teams, comp) {
    const hours = teamHours(cfg, teams) + comp * cfg.hoursPerCompass;
    const v = Math.floor(hours / cfg.voyageHours);
    const sailed = Math.floor(teamHours(cfg, teams) / cfg.voyageHours);
    const spare = Math.floor((hours - v * cfg.voyageHours) / cfg.hoursPerCompass);
    return { voyages: v, sailed, fromCompasses: v - sailed, spare };
  }

  function spendUSD(cfg, state) {
    let usd = cfg.packs.reduce((a, k) => a + k.priceUSD * (state.bought[k.key] || 0), 0);
    if (state.teams >= voyagerTeamNo(cfg)) usd += cfg.voyagerPack.priceUSD;
    const teamGems = cfg.teams.filter((t) => t.team <= state.teams && t.cost === "gems").reduce((a, t) => a + (t.gems || 0), 0);
    return { usd, teamGems };
  }

  // Every extra pack combination you can still buy, sorted cheapest first.
  // gain = extra sailing hours ÷ hoursPerCompass (i.e. compass-equivalents).
  function packCombos(cfg, state) {
    const left = cfg.packs.map((k) => Math.max(0, k.limit - (state.bought[k.key] || 0)));
    const cents = cfg.packs.map((k) => Math.round(k.priceUSD * 100));
    const canAddVoyager = state.teams === voyagerTeamNo(cfg) - 1;
    const vp = cfg.voyagerPack;
    const vGain = vp.compasses + teamHours(cfg, 1) / cfg.hoursPerCompass;
    const out = [];
    const counts = new Array(cfg.packs.length).fill(0);
    const rec = (i, c, g) => {
      if (i === cfg.packs.length) {
        out.push({ counts: counts.slice(), voyager: false, cents: c, gain: g });
        if (canAddVoyager) out.push({ counts: counts.slice(), voyager: true, cents: c + Math.round(vp.priceUSD * 100), gain: g + vGain });
        return;
      }
      for (let n = 0; n <= left[i]; n++) {
        counts[i] = n;
        rec(i + 1, c + n * cents[i], g + n * cfg.packs[i].compasses);
      }
      counts[i] = 0;
    };
    rec(0, 0, 0);
    return out.sort((a, b) => a.cents - b.cents || b.gain - a.gain);
  }

  // For each milestone: reached already, or the cheapest extra packs that reach it.
  function milestonePlan(cfg, state, tiers) {
    const total = compasses(cfg, state).total;
    const have = voyages(cfg, state.teams, total).voyages;
    let combos = null;
    return tiers.map((v) => {
      const base = { voyages: v, reached: true, short: 0, compassesNeeded: 0, reachable: true, missing: 0, add: {}, addVoyager: false, usd: 0, spare: 0 };
      if (have >= v) return base;
      const needHours = v * cfg.voyageHours - teamHours(cfg, state.teams) - total * cfg.hoursPerCompass;
      const need = Math.ceil(needHours / cfg.hoursPerCompass);
      combos = combos || packCombos(cfg, state);
      const r = { ...base, reached: false, short: v - have, compassesNeeded: need };
      const hit = combos.find((x) => x.gain >= need);
      if (!hit) return { ...r, reachable: false, missing: need - Math.max(...combos.map((x) => x.gain)) };
      const add = {};
      cfg.packs.forEach((k, i) => { if (hit.counts[i]) add[k.key] = hit.counts[i]; });
      return { ...r, add, addVoyager: hit.voyager, usd: hit.cents / 100, spare: hit.gain - need };
    });
  }

  // Chest split: deterministic expected split, rounded like the original calculator.
  function chestSplit(cfg, n) {
    const t = Math.max(0, Math.floor(n));
    const c = Math.round(cfg.odds.common * t);
    return { common: c, premium: t - c };
  }

  const per = (cfg) => cfg.odds.chestsPerMerge;
  const maxCommonMerges = (cfg, ch) => Math.floor(ch.common / per(cfg));
  const maxPremiumMerges = (cfg, ch, extra) => Math.floor((ch.premium + extra) / per(cfg));

  function mergesFor(cfg, way, ch) {
    switch (way) {
      case "mergeCommon": return { c: maxCommonMerges(cfg, ch), p: 0 };
      case "mergePremium": return { c: 0, p: maxPremiumMerges(cfg, ch, 0) };
      case "mergeAll": { const c = maxCommonMerges(cfg, ch); return { c, p: maxPremiumMerges(cfg, ch, c) }; }
      default: return { c: 0, p: 0 };
    }
  }
  const clampInt = (v, hi) => (Number.isFinite(v) ? Math.min(hi, Math.max(0, Math.floor(v))) : 0);
  function clampMerges(cfg, m, ch) {
    const c = clampInt(m.c, maxCommonMerges(cfg, ch));
    return { c, p: clampInt(m.p, maxPremiumMerges(cfg, ch, c)) };
  }
  // Chests left to open after merging (exquisite/majestic are expected values).
  function afterMerge(cfg, ch, m) {
    const { c, p } = clampMerges(cfg, m, ch);
    const k = per(cfg);
    return { common: ch.common - k * c, premium: ch.premium + c - k * p, exquisite: p * cfg.odds.exquisite, majestic: p * cfg.odds.majestic, merges: { c, p } };
  }

  const add = (map, id, q) => { if (q) map.set(id, (map.get(id) || 0) + q); };

  // Expand chests with fixed contents; choose an option from pick chests if `pick` is given.
  function expand(map, pickChoice) {
    const out = new Map();
    for (const [id, q] of map) {
      const cont = CONTENTS[id];
      const pk = PICKS[id];
      if (cont) cont.forEach((x) => add(out, x.id, x.qty * q));
      else if (pk && pickChoice != null && pk[pickChoice]) add(out, pk[pickChoice].id, pk[pickChoice].qty * q);
      else add(out, id, q);
    }
    return out;
  }

  function chestItems(set, counts, openMaterials) {
    const m = new Map();
    for (const t of TIER_KEYS) for (const x of set.chests[t]) add(m, x.id, x.qty * counts[t]);
    return openMaterials ? expand(m, null) : m;
  }

  function milestoneItems(set, have, pickChoice, openMaterials) {
    const m = new Map();
    for (const x of set.milestones) if (x.voyages <= have) add(m, x.id, x.qty);
    if (!openMaterials) {
      const out = new Map();
      for (const [id, q] of m) {
        const pk = PICKS[id];
        if (pk && pickChoice != null && pk[pickChoice]) add(out, pk[pickChoice].id, pk[pickChoice].qty * q);
        else add(out, id, q);
      }
      return out;
    }
    return expand(m, pickChoice);
  }

  function packItems(cfg, state) {
    const m = new Map();
    cfg.packs.forEach((k) => { const n = state.bought[k.key] || 0; k.extras.forEach((x) => add(m, x.id, x.qty * n)); });
    if (state.teams >= voyagerTeamNo(cfg)) cfg.voyagerPack.extras.forEach((x) => add(m, x.id, x.qty));
    return m;
  }

  // Main items an event's chests give (skips speedups and gems for the comparison table).
  function mainItems(set) {
    const out = [];
    for (const t of TIER_KEYS) for (const x of set.chests[t]) {
      const ids = CONTENTS[x.id] ? CONTENTS[x.id].map((y) => y.id) : [x.id];
      for (const id of ids) if (![100003, 200102, 200103, 101].includes(id) && !out.includes(id)) out.push(id);
    }
    return out;
  }

  // Item totals for each merge strategy.
  function compareWays(cfg, set, ch, own, openMaterials) {
    const rows = WAYS.map((w) => ({ way: w, ...afterMerge(cfg, ch, mergesFor(cfg, w, ch)) }));
    if (own) rows.push({ way: "own", ...afterMerge(cfg, ch, own) });
    rows.forEach((r) => (r.items = chestItems(set, r, openMaterials)));
    return rows;
  }

  // Suggest Common/Premium merge counts for a wanted mix of items.
  // weights: {itemId: weight}; unitOf(id) → value of one item (so different items are comparable).
  // Picks the plan whose weakest item (value ÷ wanted share) is as high as possible, so the haul keeps
  // your proportions while getting as much as it can; ties go to the most total value.
  function suggestMerges(cfg, set, ch, weights, unitOf, openMat) {
    const ids = Object.keys(weights).map(Number).filter((id) => weights[id] > 0);
    if (!ids.length) return null;
    const wsum = ids.reduce((a, id) => a + weights[id], 0);
    const share = ids.map((id) => weights[id] / wsum);
    const tierVal = {};
    for (const t of TIER_KEYS) {
      const one = { common: 0, premium: 0, exquisite: 0, majestic: 0 };
      one[t] = 1;
      const m = chestItems(set, one, openMat);
      tierVal[t] = ids.map((id) => (m.get(id) || 0) * unitOf(id));
    }
    const k = per(cfg);
    const valuesAt = (c, p) => {
      const cnt = { common: ch.common - k * c, premium: ch.premium + c - k * p, exquisite: p * cfg.odds.exquisite, majestic: p * cfg.odds.majestic };
      return ids.map((_, i) => TIER_KEYS.reduce((a, t) => a + cnt[t] * tierVal[t][i], 0));
    };
    let best = null;
    const maxC = maxCommonMerges(cfg, ch);
    for (let c = 0; c <= maxC; c++) {
      const maxP = maxPremiumMerges(cfg, ch, c);
      for (let p = 0; p <= maxP; p++) {
        const v = valuesAt(c, p);
        let min = Infinity, total = 0;
        v.forEach((x, i) => { total += x; const r = x / share[i]; if (r < min) min = r; });
        if (!best || min > best.min + 1e-9 || (Math.abs(min - best.min) <= 1e-9 && total > best.total + 1e-9)) best = { c, p, min, total };
      }
    }
    const got = valuesAt(best.c, best.p);
    const gotSum = got.reduce((a, b) => a + b, 0) || 1;
    return { c: best.c, p: best.p, ids, share, gotShare: got.map((x) => x / gotSum), total: best.total };
  }

  // Binomial 10th–90th percentile range for how many Premium merges land Exquisite.
  function exquisiteRange(cfg, n) {
    const p = cfg.odds.exquisite;
    n = Math.max(0, Math.floor(n));
    if (n === 0) return { low: 0, high: 0 };
    if (n > 200) {
      const mu = n * p, sd = Math.sqrt(n * p * (1 - p)), z = 1.2815515655446004;
      const r = (v) => Math.min(n, Math.max(0, Math.round(v)));
      return { low: r(mu - z * sd), high: r(mu + z * sd) };
    }
    const lp = Math.log(p), lq = Math.log(1 - p);
    const lf = [0];
    for (let i = 1; i <= n; i++) lf.push(lf[i - 1] + Math.log(i));
    let cum = 0, low = n, high = n, gotLow = false;
    for (let k = 0; k <= n; k++) {
      cum += Math.exp(lf[n] - lf[k] - lf[n - k] + k * lp + (n - k) * lq);
      if (!gotLow && cum >= 0.1 - 1e-12) { low = k; gotLow = true; }
      if (cum >= 0.9 - 1e-12) { high = k; break; }
    }
    return { low, high };
  }

  // ---------- regular-pack value (Mira's KS Value Guide masterlist) ----------
  // Live sheet behind https://mirakingshot.github.io/ks-value-guide/masterlist.html
  const VALUES_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTRHqvowpJsZVEXMTkBAK2orlNrEuHnkpcbK_c_-dA4YNPxhzq95mzzxm3OxVjh33QylX-W1IIWj-c/pub?gid=552825098&single=true&output=csv";
  const VALUES_PAGE = "https://mirakingshot.github.io/ks-value-guide/masterlist.html";

  // Game item id → [masterlist name, multiplier]
  const VALUE_MAP = {
    101: ["Gems", 1],
    100003: ["Gems", 100],
    200102: ["1hr General Speed", 1 / 12],
    200103: ["1hr General Speed", 1],
    500220: ["Mythic General Hero Shard", 1],
    500231: ["100 XP Enhancement", 1],
    500235: ["Mithril", 1],
    500240: ["Forgehammer", 1],
    510000: ["Governor Gear Mats Chest", 1],
    510001: ["Lucky Hero Gear Chest", 1],
    600021: ["Satin", 1],
    600022: ["Gilded Threads", 1],
    600023: ["Artisans Vision", 1],
    600024: ["Charm Design", 1],
    600025: ["Charm Guide", 1],
  };

  // Snapshot of the masterlist (2026-11-17), used if the live sheet can't be loaded.
  const VALUES_SNAPSHOT = {
    "Gems": { unit: 4.7 / 25000, source: "Masters Acuity Master Treasure Pack ($50)" },
    "Artisans Vision": { unit: 0.062, source: "Hope Market: Kindling Light Pack ($5)" },
    "Gilded Threads": { unit: 0.0139, source: "Apprentice's Work - Gov Gear: Sublime ($5)" },
    "Satin": { unit: 0.0001, source: "Apprentice's Work - Gov Gear: Sublime ($5)" },
    "Mithril": { unit: 4.53, source: "Gear Imbuement ($5)" },
    "1hr General Speed": { unit: 0.1049, source: "Custom Selection ($5)" },
    "100 XP Enhancement": { unit: 0.1124, source: "Custom Arms ($5)" },
    "Lucky Hero Gear Chest": { unit: 0.1967, source: "Custom Arms ($5)" },
    "Forgehammer": { unit: 0.1967, source: "Custom Arms ($5)" },
    "Charm Design": { unit: 0.0741, source: "Common Wishful Emporium ($5)" },
    "Charm Guide": { unit: 0.0741, source: "Common Wishful Emporium ($5)" },
    "Mythic General Hero Shard": { unit: 0.45, source: "tbh i really dont know" },
    "Governor Gear Mats Chest": { unit: 0.1731, source: "Breakdown: Governor Gear Mats Chest" },
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

  // Dollar value of one of an item, or null if the masterlist doesn't price it.
  // A pick chest is worth its best option.
  function unitValue(id, values) {
    const map = VALUE_MAP[id];
    if (map && values[map[0]]) {
      const v = values[map[0]];
      return { unit: v.unit * map[1], source: v.source, via: map[1] === 1 ? map[0] : `${fmtMult(map[1])} × ${map[0]}` };
    }
    const pk = PICKS[id];
    if (pk) {
      let best = null;
      for (const o of pk) {
        const u = unitValue(o.id, values);
        if (u && (!best || u.unit * o.qty > best.unit)) best = { unit: u.unit * o.qty, source: u.source, via: `best pick: ${o.qty} ${itemName(o.id)}` };
      }
      return best;
    }
    return null;
  }
  function fmtMult(x) { return x >= 1 ? String(x) : "1/" + Math.round(1 / x); }

  // Value a Map(id → qty). Returns priced rows (largest first), unpriced ids and the total.
  function valueItems(items, values) {
    const rows = [], unpriced = [];
    let total = 0;
    for (const [id, qty] of items) {
      if (!qty) continue;
      const u = unitValue(id, values);
      if (!u) { unpriced.push({ id, qty }); continue; }
      const v = u.unit * qty;
      total += v;
      rows.push({ id, qty, unit: u.unit, value: v, source: u.source, via: u.via });
    }
    rows.sort((a, b) => b.value - a.value);
    return { rows, unpriced, total };
  }

  const WV = {
    VALUES_URL, VALUES_PAGE, VALUE_MAP, VALUES_SNAPSHOT, parseValues, unitValue, valueItems,
    ITEMS, CONTENTS, PICKS, EVENTS, DEFAULTS, WAYS, WAY_LABELS, TIER_KEYS,
    itemName, eventByKey, setForDay, dayLabel, voyagerTeamNo, compasses, voyages, spendUSD,
    packCombos, milestonePlan, chestSplit, mergesFor, clampMerges, afterMerge, maxCommonMerges, maxPremiumMerges,
    chestItems, milestoneItems, packItems, mainItems, compareWays, exquisiteRange, suggestMerges,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = WV;
  else root.WV = WV;
})(typeof window !== "undefined" ? window : globalThis);
