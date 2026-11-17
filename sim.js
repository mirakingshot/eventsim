// Fantasy Theater (Kingshot) event simulator — pure logic, no DOM.
// Works in the browser (window.FT) and in Node (module.exports).
//
// Model:
// - Normal run: Floors 1–7. Each exploration costs the current floor's amulets.
//   A failed exploration ("pause") pays `fail` tokens; pity raises the ascent
//   chance 10/30/60/80/100%. An ascent climbs +1/+2/+3 floors.
// - You may claim the current floor's reward at any time (Floor 2+). Claiming
//   ends the run and returns you to Floor 1. Reaching Floor 7 forces a claim
//   and awards 1–5 Fanstars.
// - With 5+ Fanstars, the next run is a Fantasy Fortress run: Floors 1–8 with
//   their own costs, always pushed to Floor 8 (13,000 tokens). It uses up all
//   Fanstars.
(function (root) {
  "use strict";

  const DEFAULTS = {
    floors: [
      { floor: 1, cost: 5, fail: 50, reward: 0 },
      { floor: 2, cost: 8, fail: 80, reward: 140 },
      { floor: 3, cost: 20, fail: 200, reward: 300 },
      { floor: 4, cost: 30, fail: 300, reward: 850 },
      { floor: 5, cost: 60, fail: 600, reward: 1600 },
      { floor: 6, cost: 100, fail: 1000, reward: 3000 },
      { floor: 7, cost: 0, fail: 0, reward: 6800 }, // top: run always ends here
    ],
    fortressFloors: [
      { floor: 1, cost: 3, fail: 30, reward: 0 },
      { floor: 2, cost: 7, fail: 70, reward: 140 },
      { floor: 3, cost: 14, fail: 140, reward: 300 },
      { floor: 4, cost: 20, fail: 200, reward: 850 },
      { floor: 5, cost: 40, fail: 400, reward: 1600 },
      { floor: 6, cost: 70, fail: 700, reward: 3000 },
      { floor: 7, cost: 100, fail: 1000, reward: 6800 },
      { floor: 8, cost: 0, fail: 0, reward: 13000 }, // top
    ],
    // Chance to ascend on the 1st..5th exploration on the same floor (pity).
    ascentByAttempt: [0.1, 0.3, 0.6, 0.8, 1.0],
    // Chance that an ascent is +1 / +2 / +3 floors.
    stepProbs: [0.8, 0.1967, 0.0033],
    // Chance of receiving 1..5 Fanstars on reaching Floor 7.
    fanstarProbs: [0.72, 0.14, 0.08, 0.04, 0.02],
    fanstarsNeeded: 5,
    claimAt: 7, // strategy in normal runs: claim once you reach this floor or higher
    // maxBuys (used by buildPricer) = dailyLimit × days left − boughtToday,
    // computed by the page from the event-days input.
    packs: [
      { name: "Common", price: 4.99, amulets: 60, dailyLimit: 1, boughtToday: 0 },
      { name: "Uncommon", price: 9.99, amulets: 120, dailyLimit: 1, boughtToday: 0 },
      { name: "Rare", price: 19.99, amulets: 240, dailyLimit: 1, boughtToday: 0 },
      { name: "Epic", price: 49.99, amulets: 550, dailyLimit: 1, boughtToday: 0 },
      { name: "Mythic", price: 99.99, amulets: 1000, dailyLimit: 1, boughtToday: 0 },
    ],
    eventDays: 6,
    freeAmuletsPerDay: 40,
  };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(probs, r) {
    let acc = 0;
    for (let i = 0; i < probs.length; i++) {
      acc += probs[i];
      if (r < acc) return i;
    }
    return probs.length - 1;
  }

  function freshState(start) {
    return {
      mode: (start && start.mode) || "normal",
      floor: (start && start.floor) || 1,
      attempt: (start && start.attempt) || 0, // failed explorations on this floor
      fanstars: (start && start.fanstars) || 0,
      fortressRuns: 0,
      topVisits: 0,
    };
  }

  const floorsOf = (s, p) => (s.mode === "fortress" ? p.fortressFloors : p.floors);
  const exploreCost = (s, p) => floorsOf(s, p)[s.floor - 1].cost;
  const claimValue = (s, p) => (s.floor >= 2 ? floorsOf(s, p)[s.floor - 1].reward : 0);

  // Start the next run after a claim.
  function nextRun(s, p) {
    if (s.mode === "fortress") {
      s.mode = "normal";
    } else if (s.fanstars >= p.fanstarsNeeded) {
      s.mode = "fortress";
      s.fanstars = 0;
      s.fortressRuns++;
    }
    s.floor = 1;
    s.attempt = 0;
  }

  // Claim the current floor. Returns tokens gained.
  function claim(s, p) {
    const t = claimValue(s, p);
    nextRun(s, p);
    return t;
  }

  // One exploration. Mutates state; returns [amuletCost, tokensGained].
  function explore(s, p, rng) {
    const fl = floorsOf(s, p);
    const top = fl.length;
    const here = fl[s.floor - 1];
    const cost = here.cost;
    const pity = p.ascentByAttempt;
    const pAsc = pity[Math.min(s.attempt, pity.length - 1)];

    if (rng() >= pAsc) {
      s.attempt++;
      return [cost, here.fail];
    }

    const nf = Math.min(top, s.floor + pick(p.stepProbs, rng()) + 1);
    s.floor = nf;
    s.attempt = 0;
    if (s.mode === "normal" && nf === top) {
      s.fanstars += pick(p.fanstarProbs, rng()) + 1;
      s.topVisits++;
    }
    const claimAt = s.mode === "fortress" ? top : Math.min(p.claimAt, top);
    if (nf >= claimAt) return [cost, claim(s, p)];
    return [cost, 0];
  }

  // Long-run efficiency of a strategy (Monte Carlo): tokens per amulet.
  function efficiency(p, amulets, seed) {
    const rng = mulberry32(seed || 12345);
    const s = freshState();
    let spent = 0,
      tokens = 0;
    while (spent < amulets) {
      const [c, t] = explore(s, p, rng);
      spent += c;
      tokens += t;
    }
    return {
      tokensPerAmulet: tokens / spent,
      fortressPer1kAmulets: (s.fortressRuns / spent) * 1000,
    };
  }

  // Simulate until `need` tokens are gained. Claims early as soon as the
  // current floor's reward would reach the target. Returns amulets per trial.
  function amuletsToReach(p, need, trials, start, seed) {
    const rng = mulberry32(seed || 987654);
    const out = new Float64Array(trials);
    const cap = 5e6; // safety stop
    for (let i = 0; i < trials; i++) {
      const s = freshState(start);
      let spent = 0,
        got = 0;
      while (got < need && spent < cap) {
        if (got + claimValue(s, p) >= need) {
          got += claim(s, p);
          break;
        }
        const [c, t] = explore(s, p, rng);
        spent += c;
        got += t;
      }
      out[i] = spent;
    }
    return out;
  }

  // Spend up to `amulets`, then claim whatever floor you're on.
  // Returns tokens per trial.
  function tokensFromAmulets(p, amulets, trials, start, seed) {
    const rng = mulberry32(seed || 424242);
    const out = new Float64Array(trials);
    for (let i = 0; i < trials; i++) {
      const s = freshState(start);
      let left = amulets,
        got = 0;
      while (left >= exploreCost(s, p)) {
        const [c, t] = explore(s, p, rng);
        left -= c;
        got += t;
      }
      out[i] = got + claimValue(s, p);
    }
    return out;
  }

  // Expected [cost, tokens, P(ends on top floor)] of one run from Floor 1
  // with fresh pity, claiming at `claimAt`.
  function runValue(floors, claimAt, p) {
    const top = floors.length;
    const pity = p.ascentByAttempt;
    const A = pity.length;
    const V = [];
    for (let f = top; f >= 1; f--) {
      V[f] = [];
      for (let a = A - 1; a >= 0; a--) {
        const fl = floors[f - 1];
        const pa = pity[a];
        let c = fl.cost, t = 0, pt = 0;
        for (let s = 0; s < p.stepProbs.length; s++) {
          const nf = Math.min(top, f + s + 1);
          const w = p.stepProbs[s] * pa;
          if (nf >= claimAt) {
            t += w * floors[nf - 1].reward;
            pt += w * (nf === top ? 1 : 0);
          } else {
            const v = V[nf][0];
            c += w * v[0]; t += w * v[1]; pt += w * v[2];
          }
        }
        if (pa < 1) {
          if (a === A - 1) {
            // last pity slot below 100% loops on itself: x = k + (1-pa) x
            const k = 1 / pa;
            V[f][a] = [c * k, (t + (1 - pa) * fl.fail) * k, pt * k];
            continue;
          }
          const nxt = V[f][a + 1];
          c += (1 - pa) * nxt[0];
          t += (1 - pa) * (fl.fail + nxt[1]);
          pt += (1 - pa) * nxt[2];
        }
        V[f][a] = [c, t, pt];
      }
    }
    return V[1][0];
  }

  // Exact long-run tokens per amulet via renewal-reward. A cycle = normal runs
  // until 5 Fanstars, then one Fortress run.
  function exactEfficiency(p) {
    const top = p.floors.length;
    const [rc, rt, rTop] = runValue(p.floors, Math.min(p.claimAt, top), p);
    if (rTop <= 0 || p.fanstarsNeeded <= 0) return { tokensPerAmulet: rt / rc, runCost: rc, runTokens: rt, pTop: rTop };
    const N = p.fanstarsNeeded;
    // m[k] = expected Floor-7 visits to go from k Fanstars to >= N
    const m = new Array(N + p.fanstarProbs.length + 1).fill(0);
    for (let k = N - 1; k >= 0; k--) {
      let v = 1;
      for (let j = 0; j < p.fanstarProbs.length; j++) v += p.fanstarProbs[j] * m[k + j + 1];
      m[k] = v;
    }
    const [fc, ft] = runValue(p.fortressFloors, p.fortressFloors.length, p);
    const runs = m[0] / rTop;
    return {
      tokensPerAmulet: (runs * rt + ft) / (runs * rc + fc),
      runCost: rc, runTokens: rt, pTop: rTop, runsPerFortress: runs, fortressCost: fc, fortressTokens: ft,
    };
  }

  function gcd(a, b) {
    while (b) [a, b] = [b, a % b];
    return a;
  }

  // Min USD to buy at least N amulets, given per-pack purchase caps.
  // Returns a function N -> {cost, amulets, buys, names} (cost = Infinity if impossible).
  function buildPricer(packs, maxAmulets, ignoreLimits) {
    const usable = packs.filter((k) => k.amulets > 0 && k.price >= 0);
    const none = () => ({ cost: Infinity, buys: [] });
    if (!usable.length) { none.maxForBudget = () => ({ cost: 0, amulets: 0, buys: [], names: [] }); none.maxPurchasable = 0; return none; }
    const g = usable.reduce((acc, k) => gcd(acc, Math.round(k.amulets)), 0) || 1;
    const biggest = Math.max(...usable.map((k) => k.amulets));
    const U = Math.ceil((Math.max(0, maxAmulets) + biggest) / g);
    const cents = new Float64Array(U + 1).fill(Infinity);
    cents[0] = 0;

    // Expand bounded counts with binary splitting into 0/1 items.
    const items = [];
    usable.forEach((k, idx) => {
      const w = Math.round(k.amulets) / g;
      const c = Math.round(k.price * 100);
      let n = ignoreLimits ? Math.ceil(U / w) : Math.max(0, Math.floor(k.maxBuys));
      let m = 1;
      while (n > 0) {
        const take = Math.min(m, n);
        items.push({ idx, w: w * take, c: c * take, count: take });
        n -= take;
        m *= 2;
      }
    });
    const choice = new Array(U + 1).fill(null); // linked list of item picks
    for (let it = 0; it < items.length; it++) {
      const { w, c } = items[it];
      for (let u = U; u >= w; u--) {
        const v = cents[u - w] + c;
        if (v < cents[u]) {
          cents[u] = v;
          choice[u] = { it, prev: choice[u - w] };
        }
      }
    }
    // suffix min: cheapest way to get >= u units
    const best = new Float64Array(U + 2).fill(Infinity);
    const bestAt = new Int32Array(U + 2).fill(-1);
    for (let u = U; u >= 0; u--) {
      if (cents[u] <= best[u + 1]) {
        best[u] = cents[u];
        bestAt[u] = u;
      } else {
        best[u] = best[u + 1];
        bestAt[u] = bestAt[u + 1];
      }
    }
    const names = usable.map((k) => k.name);
    function price(N) {
      if (N <= 0) return { cost: 0, amulets: 0, buys: usable.map(() => 0), names };
      const u = Math.ceil(N / g);
      if (u > U || !isFinite(best[u])) return { cost: Infinity, buys: [] };
      const at = bestAt[u];
      const buys = usable.map(() => 0);
      for (let node = choice[at]; node; node = node.prev) {
        const item = items[node.it];
        buys[item.idx] += item.count;
      }
      return { cost: best[u] / 100, amulets: at * g, buys, names };
    }
    // Most amulets purchasable for <= budget dollars.
    price.maxForBudget = function (budget) {
      const lim = Math.round(budget * 100);
      for (let u = U; u >= 0; u--) if (cents[u] <= lim) return price(u * g);
      return price(0);
    };
    price.maxPurchasable = ignoreLimits
      ? Infinity
      : usable.reduce((a, k) => a + k.amulets * Math.max(0, Math.floor(k.maxBuys)), 0);
    return price;
  }

  function stats(arr) {
    const a = Array.from(arr).sort((x, y) => x - y);
    const n = a.length;
    const q = (f) => a[Math.min(n - 1, Math.max(0, Math.ceil(f * n) - 1))];
    const mean = a.reduce((s, v) => s + v, 0) / n;
    return { mean, p10: q(0.1), p25: q(0.25), p50: q(0.5), p75: q(0.75), p90: q(0.9), p95: q(0.95), min: a[0], max: a[n - 1] };
  }

  const FT = {
    DEFAULTS, mulberry32, freshState, explore, claim, claimValue, exploreCost,
    efficiency, exactEfficiency, amuletsToReach, tokensFromAmulets, buildPricer, stats,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = FT;
  else root.FT = FT;
})(typeof window !== "undefined" ? window : globalThis);
