// Hand-written directions for the main hubs: my research, kept separate from the generated
// catalog. Keyed by place id from catalog.data.js (the id is in the URL when you select a place).
//
// Each entry can have:
//   travel:    steps to fly there (replaces the generated quantum steps, for places they get wrong)
//   arrive:    steps from arriving at the place to its main hub (replaces the generic landing step)
//   districts: { "<district>": "how to get there from the hub" }. A shop whose district (from the
//              catalog, or from `shops` below) matches gets this step.
//   shops:     { "<shop name>": "<district>" } for shops the catalog has no district for
//   notes:     extra tips shown with the directions
//   sources:   where the steps came from
//   verified:  false until I've walked the route in game. The viewer marks unverified steps.
//
// Keybinds are 4.10.2 defaults (same as the ship guides). Check Options → Keybindings in game.
window.DIRECTIONS_META = { patch: "4.10.2", gathered: "2026-10-17" };

window.DIRECTIONS = {
  // ───────────── Stanton ─────────────
  lorville: {
    arrive: [
      "Lorville has a no-fly zone: you can only land at Teasa Spaceport (or on top of Central Tower).",
      "Request landing at Teasa Spaceport (Left Alt + N) and take the hangar elevator to the terminal.",
      "Pass customs into the spaceport. Trains (Lorville Mass Transit) leave from the spaceport station.",
    ],
    districts: {
      "Teasa Spaceport": "It's in the spaceport terminal itself, so no train is needed.",
      "Metro Center": "Take the train from Teasa Spaceport to Metro Center Station in the Workers District. Leavsden Square, L19 Residences, Tammany and Sons and the hospital are a short walk away.",
      "L19 Residences / Metro Center": "Take the train to Metro Center Station, then walk to L19 Residences (El One Nine) on Leavsden Square.",
      "L19": "Take the train to Metro Center Station, then walk to L19 Residences on Leavsden Square.",
      "Maria Pure of Heart": "Take the train to Metro Center Station. Maria Pure of Heart hospital is in the Workers District near Leavsden Square.",
      "Central Business District": "Take the train to Central Station in the Central Business District (the giant Hurston Dynamics tower).",
    },
    shops: {
      "Hurston Dynamics Showcase": "Central Business District",
      "Vantage Rentals": "Teasa Spaceport",
      "Noodle Bar": "L19",
      "Landing Services": "Teasa Spaceport",
    },
    notes: [
      "Ground vehicles spawn at the garages by the six city gates. You also clear customs at the gates.",
      "Everus Harbor, in orbit above Lorville, is quicker for cargo and refuelling.",
    ],
    sources: ["https://starcitizen.tools/Lorville"],
    verified: false,
  },

  area18: {
    arrive: [
      "Request landing at Riker Memorial Spaceport (Left Alt + N): it's the Y-shaped building you see from orbit.",
      "Take the hangar elevator to the spaceport, then ride a Cityflight Transit shuttle into Area18. It drops you in ArcCorp Plaza.",
    ],
    districts: {
      "ArcCorp Plaza": "It's on ArcCorp Plaza, where the shuttle drops you (the IO-North tower is the tall spire).",
      "IO North Tower": "From ArcCorp Plaza, enter the IO-North tower (the tallest spire).",
      "Trade and Development Division": "The TDD office is on ArcCorp Plaza, where the shuttle drops you.",
      "Zone 1": "From ArcCorp Plaza, walk to Zone 1, the small square next to the Adira Falls Apartments.",
      "Zone 2": "From ArcCorp Plaza, walk through to Zone 2, behind the Adira Falls building, across the walkways over the crevasse.",
      "Zone 3": "From ArcCorp Plaza, walk to Zone 3.",
      "Riker Memorial Spaceport": "It's in Riker Memorial Spaceport, so you don't need the shuttle.",
    },
    shops: {
      "Cubby Blast": "Zone 1",
      "Casaba Outlet": "Zone 1",
      "Dumper's Depot": "Zone 2",
      "Astro Armada": "Zone 2",
      "Empire Hospital Pharmacy": "ArcCorp Plaza",
      "IO North Tower": "IO North Tower",
      "Landing Services": "Riker Memorial Spaceport",
    },
    notes: [
      "The hospital (Empire Health Services) and the TDD trade office are on ArcCorp Plaza.",
      "Habs: Adira Falls Apartments in Zone 1.",
      "Baijini Point, in orbit above ArcCorp, has a cargo center for bigger loads.",
    ],
    sources: ["https://starcitizen.tools/Area18"],
    verified: false,
  },

  "new-babbage": {
    arrive: [
      "Request landing at New Babbage Interstellar Spaceport (Left Alt + N) and take the hangar elevator to the spaceport.",
      "Ride the Metroloop (maglev capsules) from the spaceport. One line links the spaceport, The Commons, Tobin Expo Center and the Aspire Grand.",
    ],
    districts: {
      "Commons": "Take the Metroloop from the spaceport to The Commons, the main shopping area under the dome.",
      "Aspire Grand": "Take the Metroloop to the Aspire Grand.",
      "New Babbage Interstellar Spaceport": "It's in the spaceport, so you don't need the Metroloop.",
      "NBIS": "It's in New Babbage Interstellar Spaceport (NBIS), so you don't need the Metroloop.",
    },
    shops: {
      "CenterMass": "Commons",
      "Omega Pro": "Commons",
      "Aparelli": "Commons",
      "Factory Line": "Commons",
      "Garcia's Greens": "Commons",
      "Twyn's Sandwiches": "Commons",
      "Whammer's": "Commons",
      "Landing Services": "New Babbage Interstellar Spaceport",
    },
    notes: ["It's very cold outside the domes. Wear a suit rated for the cold if you leave the city on foot."],
    sources: ["https://starcitizen.tools/New_Babbage"],
    verified: false,
  },

  orison: {
    arrive: [
      "Orison is a set of floating platforms in Crusader's upper atmosphere. Request landing at August Dunlow Spaceport (Left Alt + N).",
      "Take the hangar elevator to the spaceport, then ride the Orison Skyway Shuttle. One line links the spaceport with the Cloudview and Providence platforms.",
    ],
    districts: {
      "Providence Platform": "Take the Skyway Shuttle from the spaceport to Providence Platform.",
      "Providence Surplus": "Take the Skyway Shuttle from the spaceport to Providence Platform.",
      "Cloudview Center": "Take the Skyway Shuttle from the spaceport to Cloudview Center.",
      "August Dunlow Spaceport": "It's in the spaceport, so you don't need the shuttle.",
    },
    shops: {
      "Landing Services": "August Dunlow Spaceport",
    },
    notes: ["Seraphim Station, in orbit around Crusader, is the main trade and cargo stop for Orison."],
    sources: ["https://starcitizen.tools/Orison"],
    verified: false,
  },

  "grim-hex": {
    travel: [
      "Grim HEX is hidden in the asteroid belt around Yela (Crusader's moon). In Stanton, open the map (F2), select Grim HEX and set the route, then switch to NAV mode (hold B) and hold Left Click to quantum. If it doesn't show, quantum to Yela first.",
    ],
    arrive: [
      "Request landing (Left Alt + N), park in the assigned hangar or pad, and take the elevator into the station.",
    ],
    notes: [
      "Outlaw haven: a good place to go if you have a crimestat. Watch out for players camping the approach.",
      "Shops: Skutters (armor and weapons), Dumper's Depot (ship parts), KC Trending, Technotic, Old '38 bar. There's a clinic.",
    ],
    sources: ["https://starcitizen.tools/Grim_HEX"],
    verified: false,
  },

  // ───────────── Nyx ─────────────
  levski: {
    travel: [
      "Levski is dug into Delamar, an asteroid in the Nyx system. Open the map (F2), select Delamar and set a route to Levski, then switch to NAV mode (hold B) and hold Left Click to quantum.",
      "Delamar has no atmosphere: after the jump, fly in to the landing pads around the borehole.",
    ],
    arrive: [
      "Request landing (Left Alt + N): you get one of the outside pads, a hangar, or a docking port on the towers around the borehole.",
      "Take the pad's elevator down into Levski. Only the pads have gravity; outside them you'd be in EVA.",
    ],
    districts: {
      "Grand Barter Bazaar": "From the elevators, go to the Grand Barter Bazaar, where most shops are.",
      "Cargo Deck": "Go to the cargo deck. The commodity terminals are there.",
      "Refinery Deck": "Go to the refinery deck: refinery, mining supplies and mining vehicle rentals.",
    },
    // The wiki says most shops are in the Grand Barter Bazaar, with trading on the cargo deck and
    // mining supplies and rentals on the refinery deck.
    shops: {
      "Cordry's": "Grand Barter Bazaar",
      "Conscientious Objects": "Grand Barter Bazaar",
      "Teach's Ship Shop": "Grand Barter Bazaar",
      "Teach's Item Shop": "Grand Barter Bazaar",
      "Tech Shop": "Grand Barter Bazaar",
      "Hats & More": "Grand Barter Bazaar",
      "Wear & Tear": "Grand Barter Bazaar",
      "Shelf Stable": "Grand Barter Bazaar",
      "Feed The People": "Grand Barter Bazaar",
      "Nyx Nax": "Grand Barter Bazaar",
      "Wake Up": "Grand Barter Bazaar",
      "Near Beer": "Grand Barter Bazaar",
      "Laying Roots": "Grand Barter Bazaar",
      "Pharmacy": "Grand Barter Bazaar",
      "Trade terminal": "Cargo Deck",
      "Cargo Services": "Cargo Deck",
      "Refinement Center": "Refinery Deck",
      "Refinery Ore Sales": "Refinery Deck",
      "Refinery Shop": "Refinery Deck",
      "Tools & Supplies": "Refinery Deck",
      "Teach's Rentals": "Refinery Deck",
    },
    notes: [
      "Cordry's sells armor, Conscientious Objects sells weapons, and Teach's Ship Shop sells ships and components.",
      "Mercy Hospital, Home & Heart (habs), and Liberty Maintenance (repair, refuel) are here too.",
    ],
    sources: ["https://starcitizen.tools/Levski"],
    verified: false,
  },
};
