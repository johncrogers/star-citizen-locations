// Places and directions. Builds the location tree from catalog.data.js and turns a place's position
// in it into step-by-step directions, adding hand-written steps from directions.data.js.
(function () {
  const places = window.LOCATIONS || [];
  const byId = new Map(places.map((p) => [p.id, p]));
  const children = new Map();
  for (const p of places) {
    if (!p.parent) continue;
    if (!children.has(p.parent)) children.set(p.parent, []);
    children.get(p.parent).push(p);
  }
  const KIND = (window.LOCATIONS_META || {}).kinds || {};
  const curated = window.DIRECTIONS || {};

  // system > planet > moon > place > shop
  function chain(p) {
    const out = [];
    for (let x = p; x; x = byId.get(x.parent)) out.unshift(x);
    return out;
  }
  const isBody = (p) => p && (p.kind === "planet" || p.kind === "moon");
  const bodyOf = (p) => chain(p).reverse().find((x) => x !== p && isBody(x));
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // "Shop · Metro Center, Lorville, Hurston"
  function whereLine(p) {
    const up = chain(p).slice(1, -1).reverse().map((x) => x.name);
    if (p.district) up.unshift(p.district);
    if (p.lagrange && p.near) up.push(`near ${byId.get(p.near)?.name || ""}`);
    return up.join(", ");
  }

  const KEYS = {
    map: "open the map (F2)",
    quantum: "switch to NAV mode (hold B), then hold Left Click to quantum",
    atc: "Left Alt + N",
  };

  // Steps to reach a place that has (or might have) its own quantum marker.
  function travelSteps(p) {
    const steps = [];
    const body = bodyOf(p);
    const system = chain(p)[0];
    const label = p.nickname && p.nickname !== p.name ? `${p.name} (${p.nickname})` : p.name;

    if (p.kind === "system") {
      steps.push(`Travel to ${p.name} through a jump point. The "${p.name} Gateway" stations in neighbouring systems sit next to the jump points.`);
      return steps;
    }
    if (isBody(p)) {
      steps.push(`In ${system.name}, ${KEYS.map}, select ${label} and set it as your route, then ${KEYS.quantum}.`);
      return steps;
    }
    if (p.lagrange) {
      const near = byId.get(p.near);
      steps.push(`${label} sits at ${p.lagrange}${near ? `, out in space near ${near.name}` : ""}. In ${system.name}, ${KEYS.map}, select it, set the route, and ${KEYS.quantum}.`);
    } else if (!body) {
      steps.push(`${label} is in open space in ${system.name}. ${KEYS.map.replace(/^./, (c) => c.toUpperCase())}, select it, set the route, and ${KEYS.quantum}.`);
    } else if (p.kind === "station") {
      steps.push(`${label} is in orbit around ${body.name}. In ${system.name}, ${KEYS.map}, select it, set the route, and ${KEYS.quantum}.`);
    } else if (p.qt) {
      steps.push(`${label} is on ${body.name}. In ${system.name}, ${KEYS.map}, select ${body.name} and set a route to ${label} (the map routes you through ${body.name}'s orbit), then ${KEYS.quantum}.`);
      steps.push(`After the jump, fly down to ${label}.`);
    } else {
      steps.push(`${label} has no quantum marker. Quantum to ${body.name} (${KEYS.map}, select it, ${KEYS.quantum}) and fly the rest of the way.`);
      steps.push(`Close in, use your scanner (Tab, then ping) or the in-flight radar to find it.`);
    }
    return steps;
  }

  function landingStep(p) {
    const flags = p.flags || [];
    if (p.kind === "city" || p.kind === "station" || flags.includes("Landing pads")) {
      return `Request landing (${KEYS.atc}). Air traffic control assigns a hangar or pad. Land, then take the elevator inside.`;
    }
    if (p.kind === "outpost") return "Land on the outpost's pad if it has one, or close by on flat ground.";
    return null;
  }

  // Hand-written step for a district of a place, matching any part of "A / B" districts.
  function districtStep(entry, district) {
    if (!entry || !entry.districts || !district) return null;
    const table = Object.entries(entry.districts).map(([k, v]) => [norm(k), v]);
    const parts = [district, ...district.split("/").map((s) => s.trim())];
    for (const part of parts) {
      const hit = table.find(([k]) => k === norm(part));
      if (hit) return hit[1];
    }
    return null;
  }

  // Directions for any place: [{ text, curated }], plus notes and sources from directions.data.js.
  function directions(p) {
    const steps = [];
    const add = (text, isCurated = false) => text && steps.push({ text, curated: isCurated });
    const notes = [];
    const sources = [];
    const use = (entry) => {
      if (!entry) return;
      (entry.notes || []).forEach((n) => notes.push(n));
      (entry.sources || []).forEach((s) => sources.push(s));
    };

    // Where to quantum: the place itself, or the nearest place above it that you can fly to.
    const host = p.kind === "shop" ? byId.get(p.parent) : p;
    const hostEntry = curated[host.id];

    if (hostEntry && hostEntry.travel) hostEntry.travel.forEach((t) => add(t, true));
    else travelSteps(host).forEach((t) => add(t));
    if (hostEntry && hostEntry.arrive) hostEntry.arrive.forEach((t) => add(t, true));
    else add(landingStep(host));
    use(hostEntry);

    if (p.kind === "shop") {
      const sells = p.sells || [];
      if (sells.length === 1 && sells[0] === "Fuel") {
        add(`Refuel, repair and restock from your hangar or pad: use the ${p.name} option in the ship's landing services (or the terminal in your hangar).`);
      } else {
        const district = p.district || (hostEntry && hostEntry.shops && hostEntry.shops[p.name]) || null;
        const hand = districtStep(hostEntry, district);
        if (hand) add(hand, true);
        else if (district) add(`Inside ${host.name}, head for ${district}. Follow the wayfinding signs; station and city maps are on the wall panels.`);
        else if (host.kind === "station") add(`Inside ${host.name}, look for ${p.name} on the shopping concourse (follow the signs from the elevators).`);
        add(`Find ${p.name}${sells.length ? ` (${sells.join(", ").toLowerCase()})` : ""}.`);
      }
    }
    use(curated[p.id] !== hostEntry ? curated[p.id] : null);
    const unverified = [hostEntry, curated[p.id]].some((e) => e && e.verified === false);
    return { steps, notes, sources: [...new Set(sources)], unverified };
  }

  window.Places = { places, byId, children, chain, bodyOf, whereLine, directions, KIND, curated };
})();
