// Wishlist tab: everything on my ships, items and ship parts wishlists that I don't own yet, in one
// list, with the shops that sell each thing linked to their place here (so the detail panel gives
// directions). Also "From your wishlists" in a place's detail panel.
//
// It has no data of its own. It loads the dashboard's common.js (from the dashboard link in
// site.js), which reads the other apps' data files and saved choices the same way the dashboard
// does. Nothing loads until the tab is opened: the other apps' data is several MB.
(function () {
  const { places, byId, chain, KIND } = window.Places;
  const SITE = window.SITE || {};
  const siteHref = (id) => ((SITE.links || []).find((l) => l.id === id) || {}).href || null;
  const baseOf = (id) => (siteHref(id) || "").replace(/[^/]*\.html$/, "") || null;
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = (n) => (n == null ? "—" : Math.round(n).toLocaleString("en-US"));
  const plural = (n, one, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;

  const KEY = "sc-locations:wishlist";
  const opts = { by: "thing", system: "", builds: false };
  try { Object.assign(opts, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* storage unavailable */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(opts)); } catch (e) { /* storage unavailable */ } };

  // ── Loading ───────────────────────────────────────────────────────────────
  const load = { status: "idle", step: "", missing: [], data: null };
  const NAMES = { ships: "ships", items: "items", components: "ship parts" };
  function start(onChange) {
    if (load.status !== "idle") return;
    const base = baseOf("dashboard");
    if (!base) { load.status = "failed"; onChange(); return; }
    load.status = "loading";
    const s = document.createElement("script");
    s.src = base + "common.js";
    s.onload = () => {
      window.Dash.loadAll((id) => { load.step = NAMES[id] || id; onChange(); }, ["ships", "items", "components"]).then((res) => {
        load.data = res.data;
        load.missing = res.missing;
        load.status = "ready";
        onChange();
      });
    };
    s.onerror = () => { load.status = "failed"; onChange(); };
    document.head.appendChild(s);
  }

  // ── Shops → places ────────────────────────────────────────────────────────
  // Items and parts know the shop's UEX terminal code. Otherwise (ships, and shops without a code)
  // match "Shop — Place, Place (System)" by name: the shop under those places, or else the most
  // specific of those places (a station whose shop isn't listed separately).
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const byCode = new Map();
  const byName = new Map();
  for (const p of places) {
    for (const c of p.codes || []) byCode.set(c, p);
    for (const n of [p.name, p.nickname]) {
      if (!n) continue;
      if (!byName.has(norm(n))) byName.set(norm(n), []);
      byName.get(norm(n)).push(p);
    }
  }
  const resolved = new Map();
  function placeOf(b) {
    const key = `${b.code || ""}|${b.location}`;
    if (resolved.has(key)) return resolved.get(key);
    let out = (b.code && byCode.get(b.code)) || null;
    const m = !out && String(b.location).match(/^(.*?)\s+—\s+(.*?)\s*\(([^)]+)\)\s*$/);
    if (m) {
      const [, shop, rest, sysRaw] = m;
      const sys = sysRaw.split(">")[0].trim().toLowerCase(); // "Stanton > Pyro Jump Point"
      const parts = rest.split(",").map(norm).filter(Boolean);
      const inSys = (p) => p.system.toLowerCase() === sys;
      let best = 0;
      for (const p of byName.get(norm(shop)) || []) {
        if (p.kind !== "shop" || !inSys(p)) continue;
        const names = new Set(chain(p).flatMap((x) => [norm(x.name), norm(x.nickname)]).concat(norm(p.district)));
        const score = parts.filter((x) => names.has(x)).length;
        if (score > best) { best = score; out = p; }
      }
      for (const part of out ? [] : [...parts, norm(shop)]) {
        out = (byName.get(part) || []).find((p) => inSys(p) && p.kind !== "shop") || null;
        if (out) break;
      }
    }
    resolved.set(key, out);
    return out;
  }

  // ── The list ──────────────────────────────────────────────────────────────
  const KINDS = [
    ["ships", "Ships"],
    ["items", "Personal items"],
    ["parts", "Ship parts"],
    ["builds", "Parts for my saved builds"],
  ];
  const systemOf = (b, p) => (p ? p.system : (String(b.location).match(/\(([^)>]+)/) || [, ""])[1].trim());

  // Everything still wanted, each shop with its place: [{ g, shops: [{ b, p }] }], cheapest first.
  function wanted() {
    if (load.status !== "ready") return [];
    return window.Dash.buildGoals(load.data)
      .filter((g) => opts.builds || g.kind !== "builds")
      .map((g) => ({
        g,
        shops: g.shops.map((b) => ({ b, p: placeOf(b) })).sort((x, y) => x.b.price - y.b.price),
      }));
  }
  const inSystem = (s) => !opts.system || systemOf(s.b, s.p) === opts.system;

  const thingLink = (g) => (g.href ? `<a href="${esc(g.href)}" title="Open in its app">${esc(g.name)}</a>` : esc(g.name));
  const shopLink = (s) => (s.p ? `<a href="#${esc(s.p.id)}" class="place-link" title="Where it is and how to get there">${esc(s.b.location)}</a>` : esc(s.b.location));
  const qty = (g) => (g.qty > 1 ? ` <span class="muted">×${g.qty}</span>` : "");

  function thingRow({ g, shops }) {
    const here = shops.filter(inSystem);
    const cheapest = shops.length ? shops[0].b.price : null;
    const SHOW = 3;
    const shopLi = (s) => `<li>${shopLink(s)} <span class="wl-price">${fmt(s.b.price)}</span>${s.b.price === cheapest && shops.length > 1 ? ` <span class="wl-best">cheapest</span>` : ""}</li>`;
    const where = !shops.length
      ? `<p class="wl-why">${esc(g.why || "Not sold in shops")}</p>`
      : !here.length
        ? `<p class="wl-why">Not sold in ${esc(opts.system)}. ${plural(shops.length, "shop")} elsewhere.</p>`
        : `<ul class="wl-shops">${here.slice(0, SHOW).map(shopLi).join("")}</ul>${here.length > SHOW
          ? `<details class="wl-more"><summary>${plural(here.length - SHOW, "more shop")}</summary><ul class="wl-shops">${here.slice(SHOW).map(shopLi).join("")}</ul></details>` : ""}`;
    return `<li class="wl-row">
      <div class="wl-head"><strong>${thingLink(g)}</strong>${qty(g)}<span class="wl-group">${esc(g.group)}</span>
        <span class="wl-cost">${cheapest == null ? "" : `${fmt(cheapest * g.qty)} <small>aUEC</small>`}</span></div>
      ${where}</li>`;
  }

  function byThing(list) {
    return KINDS.map(([k, label]) => {
      const rows = list.filter((n) => n.g.kind === k)
        .sort((a, b) => a.g.group.localeCompare(b.g.group) || a.g.name.localeCompare(b.g.name));
      if (!rows.length) return "";
      return `<section class="wl-section"><h3>${esc(label)} <span class="muted">${fmt(rows.length)}</span></h3>
        <ul class="wl-list">${rows.map(thingRow).join("")}</ul></section>`;
    }).join("");
  }

  // The city, station or outpost a shop is in (or the place itself, when it isn't a shop).
  const hubOf = (p) => (p.kind === "shop" ? chain(p).reverse().find((x) => x.kind !== "shop") || p : p);

  function byPlace(list) {
    const hubs = new Map(); // hub id -> { hub, rows: [{ n, s }] }
    const nowhere = [];
    for (const n of list) {
      const here = n.shops.filter(inSystem);
      if (!here.length) { nowhere.push(n); continue; }
      for (const s of here) {
        if (!s.p) continue;
        const hub = hubOf(s.p);
        if (!hubs.has(hub.id)) hubs.set(hub.id, { hub, rows: [] });
        hubs.get(hub.id).rows.push({ n, s });
      }
    }
    const cards = [...hubs.values()].map((h) => ({ ...h, things: new Set(h.rows.map((r) => r.n)).size }))
      .sort((a, b) => b.things - a.things || a.hub.name.localeCompare(b.hub.name));
    const card = ({ hub, rows, things }) => {
      const shops = new Map(); // shop label -> rows
      for (const r of rows) {
        const k = r.s.p.id;
        if (!shops.has(k)) shops.set(k, []);
        shops.get(k).push(r);
      }
      const cheapestOf = (n) => n.shops[0].b.price;
      return `<section class="ov-card wl-hub">
        <header><h3><a href="#${esc(hub.id)}">${esc(hub.name)}</a></h3><span class="muted">${esc(KIND[hub.kind] || "")} · ${esc(hub.system)}</span></header>
        <p class="sub">${esc(chain(hub).slice(1, -1).reverse().map((x) => x.name).join(", "))}${chain(hub).length > 2 ? " · " : ""}${plural(things, "thing")} from your lists</p>
        ${[...shops.values()].map((rs) => `<div class="district"><span class="ov-label">${rs[0].s.p === hub ? "Here" : `<a href="#${esc(rs[0].s.p.id)}" class="place-link">${esc(rs[0].s.p.name)}</a>`}</span>
          <ul class="shops">${rs.sort((a, b) => a.n.g.name.localeCompare(b.n.g.name)).map((r) => `<li>${thingLink(r.n.g)}${qty(r.n.g)}
            <span class="wl-price">${fmt(r.s.b.price)}</span>${r.s.b.price === cheapestOf(r.n) ? (r.n.shops.length > 1 ? ` <span class="wl-best">cheapest</span>` : "") : ` <span class="muted" title="Cheapest shop price">(${fmt(cheapestOf(r.n))} elsewhere)</span>`}</li>`).join("")}</ul></div>`).join("")}
      </section>`;
    };
    return `<div class="ov-grid">${cards.map(card).join("")}</div>
      ${nowhere.length ? `<section class="wl-section"><h3>Not sold in shops${opts.system ? ` in ${esc(opts.system)}` : ""} <span class="muted">${fmt(nowhere.length)}</span></h3>
        <ul class="wl-list">${nowhere.map(thingRow).join("")}</ul></section>` : ""}`;
  }

  // ── Tab ───────────────────────────────────────────────────────────────────
  function render(el, onChange) {
    start(onChange);
    if (load.status === "failed") {
      el.innerHTML = `<p class="empty">Couldn't load the wishlists. This tab reads them through the dashboard app, so it needs the dashboard link in the header.</p>`;
      return { count: null };
    }
    if (load.status !== "ready") {
      el.innerHTML = `<p class="empty">Loading your wishlists${load.step ? ` (${esc(load.step)})` : ""}…</p>`;
      return { count: null };
    }
    const list = wanted();
    const sold = list.filter((n) => n.shops.some(inSystem));
    const total = sold.reduce((t, n) => t + n.shops.filter(inSystem)[0].b.price * n.g.qty, 0);
    const dash = siteHref("dashboard");
    const toggle = (k, v, label) => `<button class="chip${opts[k] === v ? " on" : ""}" data-wl="${k}" data-v="${esc(v)}">${esc(label)}</button>`;
    el.innerHTML = `
      <div class="wl-controls">
        <div class="chips">${toggle("by", "thing", "List")}${toggle("by", "place", "By place")}</div>
        <div class="chips">${["", "Stanton", "Pyro", "Nyx"].map((s) => toggle("system", s, s || "All systems")).join("")}</div>
        <label class="fp-flag"><input type="checkbox" data-wl="builds"${opts.builds ? " checked" : ""}> Parts for my saved builds</label>
      </div>
      ${load.missing.length ? `<p class="note">Couldn't load the ${esc(load.missing.map((m) => NAMES[m] || m).join(", "))} wishlist. It's left out.</p>` : ""}
      ${!list.length ? `<p class="empty">Nothing on your wishlists yet. Star ships, items or ship parts in their apps and they'll show up here.</p>` : `
      <p class="wl-summary">${plural(list.length, "thing")} on your wishlists that you don't own yet. ${plural(sold.length, "is", "are")} sold in shops${opts.system ? ` in ${esc(opts.system)}` : ""}, ${fmt(total)} aUEC at the cheapest shop for each.
        ${dash ? `<a href="${esc(dash)}#shop">Fewest stops to buy it all →</a>` : ""}</p>
      ${opts.by === "place" ? byPlace(list) : byThing(list)}
      <p class="note">Prices are crowdsourced (UEX and cstone) and can be out of date. Click a shop for directions. Stars and owned ticks come from the ships, items and ship components apps.</p>`}`;
    return { count: list.length };
  }

  function bind(el, onChange) {
    el.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-wl]");
      if (!b) return;
      opts[b.dataset.wl] = b.dataset.v;
      save();
      onChange();
    });
    el.addEventListener("change", (e) => {
      if (e.target.dataset.wl !== "builds") return;
      opts.builds = e.target.checked;
      save();
      onChange();
    });
  }

  // ── Detail panel: what's sold in this place (or anywhere inside it) from my lists ─────────────
  function detail(p) {
    if (load.status !== "ready" || !p) return "";
    const rows = [];
    for (const n of wanted()) {
      const s = n.shops.find((x) => x.p && chain(x.p).includes(p));
      if (s) rows.push({ n, s });
    }
    if (!rows.length) return "";
    rows.sort((a, b) => a.n.g.name.localeCompare(b.n.g.name));
    const li = ({ n, s }) => `<li>${thingLink(n.g)}${qty(n.g)} <span class="wl-price">${fmt(s.b.price)}</span>${s.p !== p ? ` <span class="muted">at ${shopLink(s)}</span>` : ""}${s.b.price > n.shops[0].b.price ? ` <span class="muted">(${fmt(n.shops[0].b.price)} elsewhere)</span>` : ""}</li>`;
    const html = `<ul class="shops">${rows.map(li).join("")}</ul>`;
    return rows.length > 8
      ? `<details class="contents wl-detail" open><summary>From your wishlists <span class="muted">${rows.length}</span></summary>${html}</details>`
      : `<h3>From your wishlists</h3>${html}`;
  }

  // Coming back from another app's tab picks up stars and ticks made there (buildGoals rereads them).
  const ready = () => load.status === "ready";

  window.Wish = { render, bind, detail, ready };
})();
