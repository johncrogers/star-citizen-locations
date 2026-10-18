// Locations quick reference. Overview: each system's planets with their city, the station above
// them, Lagrange stations and moons. Search: every place and shop. Detail: directions and contents.
(function () {
  const { places, byId, children, chain, whereLine, directions, KIND } = window.Places;
  const meta = window.LOCATIONS_META || {};
  const SITE = window.SITE || {};
  const siteHref = (id) => ((SITE.links || []).find((l) => l.id === id) || {}).href;
  // Names link to their entry in the glossary app (it finds the entry by name).
  const glossaryHref = ((window.SITE || {}).links || []).find((l) => l.id === "glossary")?.href;
  const lookUp = (name) => (glossaryHref && name ? `<a class="lookup" href="${esc(glossaryHref)}#find/${encodeURIComponent(name)}" title="Look up ${esc(name)} in the glossary">${esc(name)}</a>` : esc(name));
  const LORE_KINDS = ["system", "planet", "moon", "city", "station"];

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = (n) => (n == null ? "—" : n.toLocaleString("en-US"));
  const $ = (id) => document.getElementById(id);
  const kids = (p, ...kinds) => (children.get(p.id) || []).filter((c) => !kinds.length || kinds.includes(c.kind));
  const byName = (a, b) => a.name.localeCompare(b.name);
  const link = (p, text) => `<a href="#${esc(p.id)}" class="place-link">${esc(text || p.name)}</a>`;

  const SYSTEMS = places.filter((p) => p.kind === "system");
  const VIEW_KEY = "sc-locations:view";
  const SYSTEM_KEY = "sc-locations:system";
  const read = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } };

  const state = {
    view: read(VIEW_KEY, "overview"),
    system: read(SYSTEM_KEY, SYSTEMS[0] ? SYSTEMS[0].id : ""),
    query: "",
    kind: "",
    services: new Set(),
    selected: null,
  };

  // ── Search ────────────────────────────────────────────────────────────────
  // Plain words match the name, nickname, district, what's sold, and every place above it.
  // Terms: kind:shop  in:lorville  sells:items  has:clinic  system:pyro
  const haystacks = new Map(
    places.map((p) => [
      p.id,
      [p.name, p.nickname, p.designation, p.district, p.company, KIND[p.kind], ...(p.sells || []), ...(p.services || []), ...(p.flags || []), ...chain(p).map((x) => x.name)]
        .filter(Boolean).join(" ").toLowerCase(),
    ])
  );
  const SERVICE_FILTERS = ["Clinic", "Refuel", "Repair", "Hab / bed", "Refinery", "Trade terminal", "Shops", "Armistice zone"];

  function parse(q) {
    return (q.match(/-?\w+:"[^"]*"|-?"[^"]*"|\S+/g) || []).map((raw) => {
      let t = raw;
      const neg = t.startsWith("-") && t.length > 1;
      if (neg) t = t.slice(1);
      const m = t.match(/^(kind|in|sells|has|system):(.+)$/i);
      const val = (m ? m[2] : t).replace(/^"|"$/g, "").toLowerCase();
      return { raw, neg, key: m ? m[1].toLowerCase() : "text", val };
    }).filter((t) => t.val);
  }
  function test(t, p) {
    let ok;
    if (t.key === "kind") ok = p.kind === t.val || (KIND[p.kind] || "").toLowerCase().includes(t.val);
    else if (t.key === "in") ok = chain(p).slice(0, -1).some((x) => x.id === t.val || x.name.toLowerCase().includes(t.val));
    else if (t.key === "sells") ok = (p.sells || []).some((s) => s.toLowerCase().includes(t.val));
    else if (t.key === "has") ok = [...(p.services || []), ...(p.flags || [])].some((s) => s.toLowerCase().includes(t.val));
    else if (t.key === "system") ok = p.system.toLowerCase() === t.val;
    else ok = haystacks.get(p.id).includes(t.val);
    return t.neg ? !ok : ok;
  }
  const KIND_RANK = { system: 0, planet: 1, moon: 2, city: 3, station: 4, outpost: 5, poi: 6, asteroid: 7, jump: 8, comm: 9, shop: 10 };
  function results() {
    const terms = parse(state.query);
    return places
      .filter((p) =>
        (!state.kind || p.kind === state.kind) &&
        [...state.services].every((s) => [...(p.services || []), ...(p.flags || [])].includes(s)) &&
        terms.every((t) => test(t, p))
      )
      .sort((a, b) => {
        // Exact name matches first, then bigger places before smaller ones.
        const q = terms.filter((t) => t.key === "text" && !t.neg).map((t) => t.val).join(" ");
        const ea = q && a.name.toLowerCase() === q, eb = q && b.name.toLowerCase() === q;
        return eb - ea || KIND_RANK[a.kind] - KIND_RANK[b.kind] || byName(a, b);
      });
  }

  // ── Overview ──────────────────────────────────────────────────────────────
  function bodyCard(planet) {
    const cities = kids(planet, "city").sort(byName);
    const stations = kids(planet, "station").filter((s) => !s.lagrange).sort(byName);
    const lagrange = places.filter((s) => s.near === planet.id).sort(byName);
    const moons = kids(planet, "moon").sort(byName);
    const surface = kids(planet, "outpost", "poi", "comm", "asteroid").length;
    const row = (label, list) => (list.length ? `<div class="ov-row"><dt>${label}</dt><dd>${list.map((p) => link(p, p.nickname && p.kind === "station" && p.lagrange ? p.nickname : p.name)).join(", ")}</dd></div>` : "");
    const moonRows = moons
      .map((m) => {
        const hubs = kids(m, "city", "station").sort(byName);
        const n = kids(m, "outpost", "poi", "comm", "asteroid").length;
        return `<li>${link(m)}${hubs.length ? ` <span class="ov-hubs">· ${hubs.map((h) => link(h)).join(", ")}</span>` : ""}${n ? ` <a class="ov-count" href="?q=${encodeURIComponent(`in:${m.id}`)}" data-search="in:${esc(m.id)}">${n} outposts &amp; sites</a>` : ""}</li>`;
      })
      .join("");
    return `<section class="ov-card">
      <header><h3>${link(planet)}</h3>${planet.designation ? `<span class="muted">${esc(planet.designation)}</span>` : ""}</header>
      <dl class="ov">
        ${row("City", cities)}
        ${row("Station above", stations)}
        ${row("Lagrange", lagrange)}
      </dl>
      ${moons.length ? `<div class="ov-moons"><span class="ov-label">Moons</span><ul>${moonRows}</ul></div>` : ""}
      ${surface ? `<p class="ov-more"><a href="?q=${encodeURIComponent(`in:${planet.id}`)}" data-search="in:${esc(planet.id)}">${surface} outposts &amp; sites on and around ${esc(planet.name)} →</a></p>` : ""}
    </section>`;
  }

  function renderOverview() {
    const sys = byId.get(state.system) || SYSTEMS[0];
    const planets = kids(sys, "planet", "moon").sort((a, b) => (a.designation || a.name).localeCompare(b.designation || b.name, undefined, { numeric: true }));
    // Open-space places that aren't tied to a planet: gateways, free stations, jump points.
    const space = kids(sys, "station", "city", "jump").filter((p) => !p.near).sort(byName);
    $("overview").innerHTML = `
      <div class="ov-systems">${SYSTEMS.map((s) => `<button class="chip${s.id === sys.id ? " on" : ""}" data-system="${esc(s.id)}">${esc(s.name)}</button>`).join("")}
        <a class="ov-sys-link" href="#${esc(sys.id)}">About ${esc(sys.name)}</a></div>
      <div class="ov-grid">${planets.map(bodyCard).join("")}
        ${space.length ? `<section class="ov-card"><header><h3>In open space</h3></header><ul class="ov-list">${space.map((p) => `<li>${link(p)} <span class="muted">${esc(KIND[p.kind])}</span></li>`).join("")}</ul></section>` : ""}
      </div>`;
  }

  // ── List ──────────────────────────────────────────────────────────────────
  function renderSearch() {
    const list = results();
    if (state.selected && !list.some((p) => p.id === state.selected)) state.selected = list.length ? state.selected : null;
    const LIMIT = 300;
    const counts = {};
    places.forEach((p) => (counts[p.kind] = (counts[p.kind] || 0) + 1));
    $("kindChips").innerHTML = ["", ...Object.keys(KIND).filter((k) => counts[k] && k !== "system")]
      .map((k) => `<button class="chip${state.kind === k ? " on" : ""}" data-kind="${k}">${esc(k ? KIND[k] : "All")} <span>${fmt(k ? counts[k] : places.length)}</span></button>`)
      .join("");
    $("serviceFilters").innerHTML = SERVICE_FILTERS.map((s) => `<label class="fp-flag"><input type="checkbox" data-service="${esc(s)}"${state.services.has(s) ? " checked" : ""}> ${esc(s)}</label>`).join("");
    $("list").innerHTML = list.length
      ? list.slice(0, LIMIT).map((p) => `<li class="row${p.id === state.selected ? " active" : ""}">
          <a href="#${esc(p.id)}" class="row-link">
            <div class="row-main"><strong>${esc(p.name)}</strong><span class="sub">${esc(whereLine(p))}</span>
            ${p.sells ? `<span class="row-stats">${esc(p.sells.join(" · "))}</span>` : ""}</div>
            <div class="row-side"><span class="tag kind-${p.kind}">${esc(KIND[p.kind])}</span><span class="sub">${esc(p.system)}</span></div>
          </a></li>`).join("") + (list.length > LIMIT ? `<li class="empty">${fmt(list.length - LIMIT)} more. Narrow the search to see them.</li>` : "")
      : `<li class="empty">No places match.</li>`;
    $("total").innerHTML = `<span>${fmt(list.length)} shown</span>`;
  }

  // ── Detail ────────────────────────────────────────────────────────────────
  function contents(p) {
    const list = children.get(p.id) || [];
    const near = places.filter((s) => s.near === p.id);
    if (!list.length && !near.length) return "";
    const groups = {};
    for (const c of list) (groups[c.kind] = groups[c.kind] || []).push(c);
    const order = ["city", "station", "moon", "outpost", "poi", "asteroid", "comm", "jump"];
    const block = (title, items, item = (c) => `<li>${link(c)}${c.count ? ` <span class="muted">×${c.count}</span>` : ""}</li>`) => {
      if (!items.length) return "";
      items.sort(byName);
      const html = items.map(item).join("");
      return items.length > 14
        ? `<details class="contents"><summary>${esc(title)} <span class="muted">${items.length}</span></summary><ul class="cols">${html}</ul></details>`
        : `<h4>${esc(title)}</h4><ul class="cols">${html}</ul>`;
    };
    const plural = (k) => ({ city: "Cities", poi: "Points of interest" })[k] || KIND[k] + "s";
    let html = order.map((k) => block(plural(k), groups[k] || [])).join("");
    html += block("Lagrange stations nearby", near);
    // Shops grouped by district.
    const shops = groups.shop || [];
    if (shops.length) {
      const byDistrict = {};
      for (const s of shops) (byDistrict[s.district || ""] = byDistrict[s.district || ""] || []).push(s);
      const names = Object.keys(byDistrict).sort((a, b) => (a === "") - (b === "") || a.localeCompare(b));
      html += `<h4>Shops and terminals</h4>` + names.map((d) => `
        <div class="district">${d ? `<span class="ov-label">${esc(d)}</span>` : names.length > 1 ? `<span class="ov-label">Elsewhere</span>` : ""}
        <ul class="shops">${byDistrict[d].sort(byName).map((s) => `<li>${link(s)} <span class="muted">${esc((s.sells || []).join(", "))}</span></li>`).join("")}</ul></div>`).join("");
    }
    return `<h3>What's here</h3>${html}`;
  }

  function soldHere(p) {
    if (p.kind !== "shop") return "";
    const out = [];
    const items = siteHref("items");
    const ships = siteHref("ships");
    const host = byId.get(p.parent);
    if (items && (p.sells || []).includes("Items") && (p.codes || []).length) {
      out.push(`<a href="${esc(items)}?q=${encodeURIComponent(p.codes.map((c) => `code:${c}`).join(" "))}">Items sold here →</a>`);
    }
    if (ships && (p.sells || []).some((s) => /ship/i.test(s))) {
      out.push(`<a href="${esc(ships)}?q=${encodeURIComponent(`loc:"${p.name}" loc:"${host.name}"`)}">Ships sold or rented here →</a>`);
    }
    return out.length ? `<nav class="links">${out.join("")}</nav>` : "";
  }

  // Contracts around the nearest planet, moon or system, in the contracts app (its in: term).
  // Few contracts name a single outpost or station, so smaller places link to their body.
  function contractsHere(p) {
    const href = siteHref("contracts");
    if (!href) return "";
    const around = ["system", "planet", "moon"].includes(p.kind) ? p : window.Places.bodyOf(p) || byId.get(p.near) || chain(p)[0];
    if (!around) return "";
    return `<a href="${esc(href)}?q=${encodeURIComponent(`in:"${around.name}"`)}">Contracts around ${esc(around.name)} →</a>`;
  }

  function renderDetail() {
    const p = byId.get(state.selected);
    if (!p) {
      $("detail").innerHTML = `<p class="empty">Select a place to see how to get there and what's there.</p>`;
      return;
    }
    const crumbs = chain(p).map((x) => (x === p ? `<span>${esc(x.name)}</span>` : link(x))).join(" › ");
    const dir = directions(p);
    const chips = (list, cls) => (list || []).map((s) => `<span class="chip-static ${cls || ""}">${esc(s)}</span>`).join("");
    const kv = [
      p.nickname && ["Also called", p.nickname],
      p.designation && ["Designation", p.designation],
      p.lagrange && ["Lagrange point", `${p.lagrange}${p.near ? ` (near ${byId.get(p.near)?.name})` : ""}`],
      p.district && ["District", p.district],
      p.company && ["Run by", p.company],
      p.pads && ["Landing pads", p.pads],
      p.faction && ["Faction", p.faction],
      p.jurisdiction && ["Jurisdiction", p.jurisdiction],
      p.count && ["Copies", `There are ${p.count} of these here.`],
    ].filter(Boolean);

    $("detail").innerHTML = `
      ${p.image ? `<div class="hero"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></div>` : `<div class="hero-spacer"></div>`}
      <div class="detail-head">
        <div><h2>${esc(p.name)}</h2><p class="sub crumbs">${crumbs}${glossaryHref && LORE_KINDS.includes(p.kind) ? ` · <a href="${esc(glossaryHref)}#find/${encodeURIComponent(p.name)}" title="Lore and game notes">Lore →</a>` : ""}</p></div>
        <div class="badges"><span class="tag kind-${p.kind}">${esc(KIND[p.kind])}</span></div>
      </div>
      ${p.sells ? `<p>Sells: <strong>${esc(p.sells.join(", "))}</strong></p>` : ""}
      ${soldHere(p)}

      <h3>How to get there</h3>
      <ol class="route">${dir.steps.map((s) => `<li${s.curated ? ' class="curated"' : ""}>${esc(s.text)}${s.curated ? ` <span class="hand" title="From directions.data.js">hand-written</span>` : ""}</li>`).join("")}</ol>
      ${dir.unverified ? `<p class="note">Hand-written steps come from the wiki and haven't been checked in game yet.</p>` : ""}
      ${dir.notes.length ? `<ul class="ttk">${dir.notes.map((n) => `<li class="ttk-info"><span class="ttk-icon">i</span>${esc(n)}</li>`).join("")}</ul>` : ""}

      ${p.services || p.flags || p.amenities ? `<h3>Services</h3><div class="chips-static">${chips(p.services)}${chips(p.flags, "flag")}${chips((p.amenities || []).filter((a) => !(p.services || []).includes(a)), "amenity")}</div>` : ""}
      ${kv.length ? `<dl class="kv">${kv.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}

      ${contents(p)}

      ${p.description ? `<h3>About</h3><p class="desc">${esc(p.description)}</p>` : ""}
      <nav class="links">
        ${contractsHere(p)}
        ${p.wiki ? `<a href="${esc(p.wiki)}" target="_blank" rel="noopener">Wiki ↗</a>` : ""}
        ${dir.sources.map((s) => `<a href="${esc(s)}" target="_blank" rel="noopener">Directions source ↗</a>`).join("")}
      </nav>`;
  }

  // ── Wiring ────────────────────────────────────────────────────────────────
  let shownDetail = null;
  function render() {
    $("tabs").innerHTML = [["overview", "Overview"], ["search", "Search"]]
      .map(([k, l]) => `<button class="tab${state.view === k ? " on" : ""}" data-view="${k}">${l}</button>`).join("");
    document.body.dataset.view = state.view;
    if (state.view === "overview") renderOverview();
    else renderSearch();
    renderDetail();
    if (state.selected !== shownDetail) {
      $("detail").scrollTop = 0;
      shownDetail = state.selected;
    }
  }

  function setView(v) {
    state.view = v;
    write(VIEW_KEY, v);
  }
  function setQuery(q) {
    state.query = q;
    $("search").value = q;
    const url = new URL(location.href);
    if (q.trim()) url.searchParams.set("q", q.trim());
    else url.searchParams.delete("q");
    try { history.replaceState(null, "", url); } catch (e) { /* blocked on some file:// pages */ }
  }

  // #<place id>, or #code:<terminal code> (links from the items app).
  function selectFromHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (!h) return;
    const code = h.match(/^code:(.+)$/i);
    const p = code ? places.find((x) => (x.codes || []).includes(code[1].toUpperCase())) : byId.get(h);
    if (!p) return;
    state.selected = p.id;
    if (p.system && byId.get(state.system)?.system !== p.system) {
      const sys = SYSTEMS.find((s) => s.system === p.system);
      if (sys) state.system = sys.id;
    }
  }

  $("meta").textContent = `${fmt(places.length)} places in ${SYSTEMS.map((s) => s.name).join(", ")} · data for patch ${meta.patch || "?"} · gathered ${meta.gathered || "?"}`;
  $("siteLinks").innerHTML = (SITE.links || []).map((l) => `<a href="${esc(l.href)}">${esc(l.label)} →</a>`).join("");

  let typing;
  $("search").addEventListener("input", (e) => {
    clearTimeout(typing);
    typing = setTimeout(() => { setQuery(e.target.value); if (state.view !== "search") setView("search"); render(); }, 120);
  });
  $("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (b) { setView(b.dataset.view); render(); }
  });
  $("overview").addEventListener("click", (e) => {
    const sys = e.target.closest("[data-system]");
    if (sys) { state.system = sys.dataset.system; write(SYSTEM_KEY, state.system); render(); return; }
    const s = e.target.closest("[data-search]");
    if (s) { e.preventDefault(); setQuery(s.dataset.search); state.kind = ""; setView("search"); render(); }
  });
  $("kindChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-kind]");
    if (b) { state.kind = b.dataset.kind; render(); }
  });
  $("serviceFilters").addEventListener("change", (e) => {
    const s = e.target.dataset.service;
    if (!s) return;
    if (e.target.checked) state.services.add(s);
    else state.services.delete(s);
    render();
  });
  window.addEventListener("hashchange", () => { selectFromHash(); render(); });

  const q = new URLSearchParams(location.search).get("q");
  if (q) { setQuery(q); setView("search"); }
  selectFromHash();
  if (!state.selected) {
    // Arriving with a search (e.g. from a shop link in the ships app): open the best match.
    const first = state.view === "search" && state.query ? results()[0] : null;
    const sys = byId.get(state.system);
    state.selected = first ? first.id : sys ? sys.id : null;
  }
  render();
})();
