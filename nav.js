// Shared sidebar for Mira's Kingshot event simulators.
// Include with <script src="nav.js"></script> on any page. It draws the left nav,
// the Value Guide tile and a phone menu, and adds the "ksn-on" class to <body>.
//
// To add a simulator, add an entry to PAGES (the home page lists it automatically).
// `children` are views inside one page (matched by URL parameters), so a page like
// Voyage keeps its sub-events together.
(function () {
  "use strict";

  const HOME = { href: "index.html", label: "Home", icon: "home" };

  const PAGES = [
    {
      href: "voyage.html", label: "Voyage", icon: "ship",
      blurb: "Milestones your Compasses reach, the cheapest packs for the next one, and the best way to merge your chests.",
      tags: ["Milestones", "Pack planner", "Chest merging"],
      children: [
        { href: "voyage.html?event=windward", label: "Windward", sub: "Gov Gear", params: { event: "windward" } },
        { href: "voyage.html?event=wavebound", label: "Wavebound", sub: "Charms", params: { event: "wavebound" } },
        { href: "voyage.html?event=light", label: "Light", sub: "Hero Gear", params: { event: "light" }, isDefault: true },
      ],
    },
    // Hidden until its simulation is fixed (the page is still at fantasy-theater.html):
    // {
    //   href: "fantasy-theater.html", label: "Fantasy Theater", icon: "mask",
    //   blurb: "How much you need to spend on Fantasy Amulets to reach a token target, simulated thousands of times.",
    //   tags: ["Spend estimate", "Claim floor"],
    // },
  ];

  const GUIDE = {
    href: "https://mirakingshot.github.io/ks-value-guide/",
    title: "Mira's Master Value Guide",
    text: "All individual item values have been sourced from normal packs and compiled here into a masterlist.",
    cta: "Open the guide",
  };

  const ICONS = {
    home: '<path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z"/>',
    ship: '<path d="M4 15l1.6 4.2a1 1 0 00.9.8h11a1 1 0 00.9-.8L20 15"/><path d="M3 15h18"/><path d="M12 3v12"/><path d="M12 4l6 9h-6"/><path d="M12 7l-4 6h4"/>',
    mask: '<path d="M4 5c3 1.3 5.3 1.3 8 0 2.7 1.3 5 1.3 8 0v6a8 8 0 01-16 0z"/><path d="M8.5 10.5h1.5M14 10.5h1.5"/><path d="M9 14.5c1.8 1.3 4.2 1.3 6 0"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    out: '<path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M18 14v4a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1h4"/>',
  };
  const svg = (k, cls) => `<svg class="${cls || "ksn-ico"}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

  const CSS = `
  :root {
    --ksn-w: 248px; --ksn-bg: #ffffff; --ksn-ink: #2b2b2e; --ksn-muted: #9a9a9f; --ksn-line: #efeee9;
    --ksn-accent: #f06a6a; --ksn-accent-ink: #ffffff; --ksn-soft: #f7f6f2; --ksn-hover: #f9f8f5;
    --ksn-grad: #f06a6a;
  }
  body.ksn-on { padding-left: var(--ksn-w); }
  .ksn {
    position: fixed; inset: 0 auto 0 0; width: var(--ksn-w); z-index: 40;
    display: flex; flex-direction: column; gap: 4px; padding: 26px 18px 18px;
    background: var(--ksn-bg); color: var(--ksn-ink); border-right: 1px solid var(--ksn-line);
    font-family: inherit; overflow-y: auto;
  }
  .ksn a { color: inherit; text-decoration: none; }
  .ksn-brand { display: flex; align-items: center; gap: 10px; padding: 0 10px 24px; }
  .ksn-logo { width: 30px; height: 30px; flex: none; }
  .ksn-brand b { display: block; font-size: 16px; font-weight: 600; letter-spacing: -.01em; line-height: 1.15; }
  .ksn-brand small { display: block; font-size: 11px; color: var(--ksn-muted); }
  .ksn-label { font-size: 11px; color: var(--ksn-muted); padding: 12px 12px 6px; letter-spacing: .02em; }
  .ksn-ico { width: 19px; height: 19px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
  .ksn-item {
    display: flex; align-items: center; gap: 14px; padding: 10px 14px; border-radius: 10px;
    font-size: 14px; font-weight: 500; color: var(--ksn-muted); transition: background .15s, color .15s;
  }
  .ksn-item:hover { background: var(--ksn-hover); color: var(--ksn-ink); }
  .ksn-item { position: relative; }
  .ksn-item.on { background: var(--ksn-soft); color: var(--ksn-ink); font-weight: 600; }
  .ksn-item.on .ksn-ico { color: var(--ksn-accent); }
  .ksn-item.on::before { content: ""; position: absolute; left: -13px; top: 50%; width: 10px; height: 10px; margin-top: -5px; border-radius: 50%; background: var(--ksn-accent); }
  .ksn-subs { list-style: none; margin: 2px 0 8px 23px; padding: 0 0 0 16px; border-left: 1.5px solid var(--ksn-line); }
  .ksn-subs a {
    display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
    padding: 6px 10px; margin: 2px 0; border-radius: 8px; font-size: 13px; color: var(--ksn-muted);
  }
  .ksn-subs a small { font-size: 11px; opacity: .8; }
  .ksn-subs a:hover { background: var(--ksn-hover); color: var(--ksn-ink); }
  .ksn-subs a.on { color: var(--ksn-ink); font-weight: 600; background: var(--ksn-soft); }
  .ksn-subs a::before { content: ""; width: 7px; height: 7px; border-radius: 50%; flex: none; align-self: center; margin-right: -2px; background: #f06a6a; }
  .ksn-subs li:nth-child(2) a::before { background: #74bd4f; }
  .ksn-subs li:nth-child(3) a::before { background: #f2a93b; }
  .ksn-subs a span { margin-right: auto; }
  .ksn-spacer { flex: 1; min-height: 18px; }
  .ksn-brand, .ksn-label, .ksn nav { flex-shrink: 0; }

  /* Value Guide tile — a warm card with hills and a moon, like a balance card */
  .ksn-tile {
    flex-shrink: 0; display: block; position: relative; overflow: hidden; border-radius: 18px;
    padding: 16px 16px 92px; color: var(--ksn-ink);
    background: linear-gradient(170deg, #fffaf2 0%, #fde9cf 100%); border: 1px solid #f6e4cb;
    box-shadow: 0 12px 28px rgba(200, 140, 60, .14); transition: transform .15s, box-shadow .15s;
  }
  .ksn-tile:hover { transform: translateY(-2px); box-shadow: 0 16px 34px rgba(200, 140, 60, .22); }
  .ksn-tile-kicker { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 600; color: #b26c0a; letter-spacing: .04em; text-transform: uppercase; }
  .ksn-tile-kicker .ksn-logo { width: 16px; height: 16px; }
  .ksn-tile-title { font-size: 21px; font-weight: 700; line-height: 1.15; margin: 10px 0 6px; letter-spacing: -.01em; }
  .ksn-tile-title em { font-style: normal; color: var(--ksn-accent); }
  .ksn-tile-text { font-size: 12px; line-height: 1.45; color: var(--ksn-muted); margin-bottom: 12px; }
  .ksn-tile-cta {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px;
    background: var(--ksn-grad); color: #fff; font-size: 12.5px; font-weight: 600;
    box-shadow: 0 8px 18px rgba(240, 106, 106, .3);
  }
  .ksn-tile-cta .ksn-ico { width: 14px; height: 14px; stroke-width: 2.2; }
  .ksn-tile-art { position: absolute; left: 0; right: 0; bottom: 0; height: 84px; pointer-events: none; }
  .ksn-tile-art svg { width: 100%; height: 100%; display: block; }

  .ksn-top { display: none; }
  .ksn-scrim { display: none; }
  @media (max-width: 900px) {
    body.ksn-on { padding-left: 0; }
    .ksn { transform: translateX(-100%); transition: transform .22s ease; box-shadow: 0 0 40px rgba(0, 0, 0, .2); }
    body.ksn-open .ksn { transform: none; }
    body.ksn-open .ksn-scrim { display: block; position: fixed; inset: 0; background: rgba(20, 22, 50, .35); z-index: 39; }
    .ksn-top {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px; position: sticky; top: 0; z-index: 30;
      background: var(--ksn-bg); color: var(--ksn-ink); border-bottom: 1px solid var(--ksn-line);
    }
    .ksn-top b { font-size: 15px; font-weight: 600; }
    .ksn-burger {
      width: 38px; height: 38px; display: grid; place-items: center; border-radius: 10px; padding: 0; box-shadow: none;
      background: var(--ksn-hover); color: var(--ksn-ink); border: 1px solid var(--ksn-line); cursor: pointer;
    }
    .ksn-close { position: absolute; top: 22px; right: 14px; }
  }
  @media (min-width: 901px) { .ksn-close { display: none; } }
  `;

  // Each copy needs its own gradient id: the phone bar's copy is hidden on desktop,
  // and a shared id would point the visible logo at the hidden gradient.
  const LOGO = (id) => `<svg class="ksn-logo" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f06a6a"/><stop offset="1" stop-color="#f2a93b"/></linearGradient></defs><path d="M16 3l11 8-11 18L5 11z" fill="url(#${id})"/><path d="M5 11h22M16 3l-4 8 4 18 4-18z" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/></svg>`;

  // Soft hills and a crescent moon along the bottom of the tile.
  const ART = `<svg viewBox="0 0 212 84" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <path d="M168 14a13 13 0 1 0 10 22 11 11 0 1 1-10-22z" fill="#f2a93b"/>
    <circle cx="140" cy="20" r="1.4" fill="#f2a93b"/><circle cx="196" cy="48" r="1.2" fill="#f2a93b"/><circle cx="120" cy="40" r="1" fill="#f2a93b"/>
    <path d="M0 62c22-14 40-18 62-8s38 10 58-4 46-14 70-2 22 10 22 10v26H0z" fill="#f9d7b0"/>
    <path d="M0 72c26-10 48-8 70 0s44 6 66-4 52-6 76 6v14H0z" fill="#f6c393"/>
    <path d="M0 80c30-6 60-4 92 0s70 2 120-6v14H0z" fill="#f2b07a"/>
  </svg>`;

  const fileOf = (url) => {
    const p = new URL(url, location.href).pathname.split("/").pop();
    return p || "index.html";
  };
  function matches(child) {
    const q = new URLSearchParams(location.search);
    return Object.entries(child.params || {}).every(([k, v]) => q.get(k) === v);
  }

  function itemHTML(p, cur) {
    const on = fileOf(p.href) === cur;
    let subs = "";
    if (p.children && p.children.length) {
      const hit = on ? p.children.find(matches) || p.children.find((c) => c.isDefault) : null;
      subs = `<ul class="ksn-subs">${p.children.map((c) =>
        `<li><a href="${c.href}"${c === hit ? ' class="on" aria-current="page"' : ""}><span>${c.label}</span>${c.sub ? `<small>${c.sub}</small>` : ""}</a></li>`).join("")}</ul>`;
    }
    return `<a class="ksn-item${on ? " on" : ""}" href="${p.href}"${on ? ' aria-current="page"' : ""}>${svg(p.icon)}${p.label}</a>${subs}`;
  }

  function render() {
    const cur = fileOf(location.href);
    return `
      <button type="button" class="ksn-burger ksn-close" aria-label="Close menu">${svg("close")}</button>
      <a class="ksn-brand" href="${HOME.href}">${LOGO("ksnlg-side")}<span><b>Mira's KS</b><small>Event simulators</small></span></a>
      <nav aria-label="Site">${itemHTML(HOME, cur)}</nav>
      <div class="ksn-label">Simulators</div>
      <nav aria-label="Simulators">${PAGES.map((p) => itemHTML(p, cur)).join("")}</nav>
      <div class="ksn-spacer"></div>
      <a class="ksn-tile" href="${GUIDE.href}" target="_blank" rel="noopener">
        <div class="ksn-tile-kicker">${LOGO("ksnlg-tile")}Where values come from</div>
        <div class="ksn-tile-title">Mira's Master <em>Value</em> Guide</div>
        <div class="ksn-tile-text">${GUIDE.text}</div>
        <span class="ksn-tile-cta">${GUIDE.cta} ${svg("out")}</span>
        <div class="ksn-tile-art">${ART}</div>
      </a>`;
  }

  function mount() {
    if (document.getElementById("ksn")) return;
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    const aside = document.createElement("aside");
    aside.className = "ksn"; aside.id = "ksn"; aside.setAttribute("aria-label", "Site");
    aside.innerHTML = render();
    const top = document.createElement("div");
    top.className = "ksn-top";
    top.innerHTML = `<button type="button" class="ksn-burger" aria-label="Open menu" aria-controls="ksn">${svg("menu")}</button>${LOGO("ksnlg-top")}<b>Mira's KS</b>`;
    const scrim = document.createElement("div");
    scrim.className = "ksn-scrim";
    document.body.prepend(scrim);
    document.body.prepend(aside);
    document.body.prepend(top);
    document.body.classList.add("ksn-on");
    const open = (v) => document.body.classList.toggle("ksn-open", v);
    top.querySelector(".ksn-burger").onclick = () => open(true);
    aside.querySelector(".ksn-close").onclick = () => open(false);
    scrim.onclick = () => open(false);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") open(false); });
  }

  window.KSNav = {
    pages: PAGES,
    guide: GUIDE,
    icon: svg,
    // Pages that change their URL without reloading (e.g. switching voyage) call this.
    refresh() {
      const a = document.getElementById("ksn");
      if (!a) return;
      a.innerHTML = render();
      a.querySelector(".ksn-close").onclick = () => document.body.classList.remove("ksn-open");
    },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
