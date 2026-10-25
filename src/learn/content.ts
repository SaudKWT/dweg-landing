/**
 * Every word on the learning page. A step is one stretch of reading paired
 * with one view of the plate: a stop in the learn scene ("rig", "trap"…) or a
 * journey plate ("history:0".."history:2").
 *
 * History on a KOC page must be citable: chapter 01's facts are the ones
 * checked for direction F on 2026-09-28 (./history/history.ts), and every
 * chapter lists its sources. Engineering figures describe the illustrative
 * rig and well in ./gl — never a KOC asset — and the page says so.
 */

export interface Source {
  label: string;
  href: string;
}

export type Figure = "column" | "bits";

export interface Step {
  /** Learn-scene stop id, or "history:<plate>". */
  view: string;
  eyebrow: string;
  title: string;
  body: string[];
  /** Short definitions shown under the body. */
  terms?: [string, string][];
  /** A list shown under the body — a timeline, an order of operations. */
  list?: { label: string; text: string }[];
  figure?: Figure;
}

export interface ChapterDef {
  id: "discovery" | "rig" | "formations" | "fields" | "drilling" | "components";
  numeral: string;
  /** Short name for the chapter bar. */
  name: string;
  /** The chapter's title, set in I's staggered wordmark. */
  wordmark: string[];
  lede: string;
  steps: Step[];
  sources: Source[];
}

/* ------------------------------------------------------------------------ */
/* Sources                                                                   */

const S = {
  kuna1934: { label: "KUNA (2014) — KOC's founding and the 1934 concession", href: "https://www.kuna.net.kw/ArticleDetails.aspx?id=2415466&language=en" },
  bpArchive: {
    label: "BP Archive — Kuwait Oil Company records (archived copy)",
    href: "http://web.archive.org/web/20250111191052/https://archiveshub.jisc.ac.uk/search/archives/7b407c7d-23af-37de-9408-a67f0382dd57",
  },
  worldOil1952: { label: "World Oil, January 1952 — Bahra and Burgan drilling history", href: "https://archive.org/details/sim_world-oil_1952-01_134_1" },
  petEng1938: {
    label: "The Petroleum Engineer, October 1938 — the rigs at Bahra and Burgan",
    href: "https://archive.org/details/sim_petroleum-engineer-international_1938-10_10_1/page/90/mode/1up",
  },
  kunaBurgan: { label: "KUNA — Today in Kuwait's history: Burgan No. 1", href: "https://www.kuna.net.kw/ArticleDetails.aspx?id=3276790&language=en" },
  kocProfile: { label: "KOC Profile (2020)", href: "https://www.kockw.com/sites/EN/Other%20Publications/Corporate/KOC%20Profile%20EN.pdf" },
  kuna1946: { label: "KUNA (2016) — the first export, 30 June 1946", href: "https://www.kuna.net.kw/ArticleDetails.aspx?id=2509366&language=en" },
  kpcHistory: { label: "KPC — Oil history", href: "https://www.kpc.com.kw/OilHistory" },
  oilWeekly1946: {
    label: "The Oil Weekly, 20 May 1946 — the hilltop tanks and offshore berth",
    href: "https://archive.org/details/sim_world-oil_1946-05-20_121_12/page/261/mode/1up",
  },
  geoexproBurgan: { label: "GeoExpro — The Great Burgan field, Kuwait", href: "https://geoexpro.com/the-great-burgan-field-kuwait/" },
  petexRig: {
    label: "PETEX, University of Texas — The Rotary Rig and Its Components",
    href: "https://utw10286.utweb.utexas.edu/images/flippingbooks/rotary_rig_components/files/basic-html/page3.html",
  },
  slbGlossary: { label: "SLB Energy Glossary — drilling terms", href: "https://glossary.slb.com/en/terms/d/drawworks" },
  usgsKuwait: { label: "USGS OFR 94-210 — Crustal Structure of Kuwait (stratigraphic column)", href: "https://pubs.usgs.gov/of/1994/0210/report.pdf" },
  aapgCretaceous: {
    label: "Douban & Al Medhadi (KOC), AAPG 1999 — Cretaceous megasequences of Kuwait",
    href: "https://www.searchanddiscovery.com/abstracts/html/1999/intl/abstracts/1298k.htm",
  },
  jptJurassic: { label: "JPT (2014) — testing and completing Kuwait's HP/HT Jurassic reservoirs", href: "https://jpt.spe.org/challenges-testing-and-completion-hp-ht-reservoir-kuwait" },
  heliyonMinagish: { label: "Aladwani, Heliyon (2022) — the Minagish Formation, Umm Gudair", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9253366/" },
  ogjGas2006: { label: "Oil & Gas Journal, 7 March 2006 — Kuwait's Jurassic gas discoveries", href: "https://www.ogj.com/exploration-development/article/17279736/kuwait-enters-world-of-natural-gas-with-discoveries" },
  lowerFars: { label: "Offshore Technology — Lower Fars heavy oil development", href: "https://www.offshore-technology.com/projects/lower-fars-heavy-oil-development-project/" },
  ogjBits: { label: "Oil & Gas Journal, 20 February 2006 — roller cones vs diamonds", href: "https://www.ogj.com/general-interest/companies/article/17224494/roller-cones-vs-diamonds-a-reversal-of-roles" },
  gemFields: { label: "Global Energy Monitor — Kuwait oil field pages (positions)", href: "https://www.gem.wiki/Raudhatain_Oil_Field_(Kuwait)" },
  outline: { label: "world-geojson — Kuwait outline", href: "https://github.com/georgique/world-geojson" },
} satisfies Record<string, Source>;

/* ------------------------------------------------------------------------ */
/* Chapters                                                                  */

export const CHAPTERS: ChapterDef[] = [
  {
    id: "discovery",
    numeral: "01",
    name: "Discovery",
    wordmark: ["The first", "— wells"],
    lede: "Before there was a rig to learn about, there was a concession, a dry hole and a gusher. Kuwait's oil story runs from 1934 to the first cargo in 1946 — and every well since stands on it.",
    steps: [
      {
        view: "history:0",
        eyebrow: "1934",
        title: "A company and a concession",
        body: [
          "Kuwait Oil Company was incorporated in February 1934, owned equally by the Anglo-Persian Oil Company (now BP) and Gulf Oil.",
          "On 23 December 1934 the Ruler, Sheikh Ahmad Al-Jaber Al-Sabah, granted it a concession to explore for oil across Kuwait, for 75 years.",
        ],
        terms: [["Concession", "The right, granted by a state, to explore for and produce oil in an area for a set term."]],
      },
      {
        view: "history:0",
        eyebrow: "1936 · Bahra No. 1",
        title: "The first well — a dry hole",
        body: [
          "On 30 May 1936 KOC spudded Kuwait's first well at Bahra, north of Kuwait Bay. There was too little water to raise steam, so the rig was a gasoline-powered combination rig.",
          "Bahra No. 1 reached 7,950 ft without commercial oil and was abandoned in 1937. A dry hole is still information: it tells the geologists where the oil is not.",
        ],
        terms: [
          ["Spud", "To start drilling a well."],
          ["Dry hole", "A well that finds no oil or gas worth producing."],
        ],
      },
      {
        view: "history:1",
        eyebrow: "1938 · Burgan No. 1",
        title: "Burgan",
        body: [
          "The rig was moved south, and Burgan No. 1 was spudded on 16 October 1937. In February 1938 it struck oil at about 3,670 ft.",
          "Drilling water was seawater, piped in from the coast. Burgan proved to be the second-largest oil field in the world, and the largest in sandstone. The war halted work in 1942 and the wells were sealed with cement; drilling resumed in 1945.",
        ],
      },
      {
        view: "history:2",
        eyebrow: "1946 · The first cargo",
        title: "Oil leaves Kuwait",
        body: [
          "On 30 June 1946 Sheikh Ahmad Al-Jaber turned a silver wheel, and crude ran from tanks on a hilltop above the coast, through lines laid under the sea, into the tanker British Fusilier. There was no pier yet.",
          "It took 11 hours and 13 minutes to load 10,567 tons. The same year KOC began building Ahmadi, named after Sheikh Ahmad; the company's offices moved there in 1949.",
        ],
      },
      {
        view: "history:2",
        eyebrow: "Since 1946",
        title: "A national company",
        body: ["From the first cargo, the milestones that made KOC the company it is today."],
        list: [
          { label: "1950s", text: "Magwa and Ahmadi are found beside Burgan, then Raudhatain in the north (1955) and Minagish in the west (1959)." },
          { label: "1960", text: "Kuwait is a founder member of OPEC." },
          { label: "1974", text: "The State of Kuwait takes a 60% share of KOC." },
          { label: "1975", text: "Full ownership: KOC becomes wholly Kuwaiti, effective 5 March 1975." },
          { label: "1980", text: "Kuwait Petroleum Corporation is founded, with KOC as its upstream company." },
          { label: "1991", text: "More than 700 wells are set ablaze in the occupation. The last is capped on 6 November 1991, at Burgan." },
          { label: "2006", text: "Jurassic gas is announced in North Kuwait." },
          { label: "2020", text: "Heavy oil flows from the Lower Fars project at Ratqa, in the north." },
        ],
      },
    ],
    sources: [S.kuna1934, S.bpArchive, S.worldOil1952, S.petEng1938, S.kunaBurgan, S.kocProfile, S.kuna1946, S.kpcHistory, S.oilWeekly1946, S.geoexproBurgan, S.ogjGas2006, S.lowerFars],
  },
  {
    id: "rig",
    numeral: "02",
    name: "The rig",
    wordmark: ["The", "— rig"],
    lede: "A drilling rig is a machine for three jobs: turning a string of pipe, lifting it, and pumping fluid down it. Everything on the pad belongs to one of five systems.",
    steps: [
      {
        view: "rig",
        eyebrow: "Five systems",
        title: "Power, hoisting, rotating, circulating, well control",
        body: [
          "Walk onto a land rig and it looks like a hundred machines. It is five systems working together: power to drive everything, hoisting to lift the drill string, rotating to turn it, circulating to pump mud down it and bring the rock cuttings back, and well control to keep the well shut in if the rock pushes back.",
          "The rig on the plate is illustrative, built from typical dimensions: a 142 ft mast standing on a 30 ft substructure, with the drill floor on top.",
        ],
        terms: [
          ["Mast", "The steel tower that carries the hoisting load. A mast folds down to move; a derrick is built in place."],
          ["Substructure", "The base that raises the drill floor high enough for the blowout preventers to fit beneath it."],
        ],
      },
      {
        view: "hoist",
        eyebrow: "System 1 · Hoisting",
        title: "Lifting the string",
        body: [
          "At the top of the mast is the crown block, a set of fixed sheaves. Hanging below it is the travelling block, a set of moving sheaves. Steel drilling line is strung many times between them, so the pull of one line lifts a load many times greater.",
          "One end of the line, the fast line, runs down to the drawworks: a large winch on the drill floor. Reeling it in lifts the string; its brake lowers it under control. The other end, the deadline, is clamped to an anchor.",
        ],
        terms: [
          ["Hook load", "The weight hanging from the travelling block: the drill string, less the buoyancy of the mud around it."],
          ["Weight on bit", "The part of the string's weight let down onto the bit — how hard it is pushed into the rock."],
        ],
      },
      {
        view: "rotate",
        eyebrow: "System 2 · Rotating",
        title: "The top drive",
        body: [
          "The top drive hangs from the travelling block and turns the drill string from the top, with a motor and gearbox. It rides up and down the mast on a torque track, which takes the twisting reaction.",
          "Because it turns the pipe directly, a top drive can drill a whole stand — three joints, about 93 ft — before a connection, and can rotate and pump while pulling out of the hole. Older rigs turn the string with a rotary table in the drill floor and a square kelly.",
        ],
        terms: [["Connection", "Screwing a new joint or stand of pipe onto the string to drill deeper."]],
      },
      {
        view: "circulate",
        eyebrow: "System 3 · Circulating",
        title: "The mud's round trip",
        body: [
          "Drilling fluid — mud — never stops moving. Mud pumps push it up the standpipe, through the rotary hose and the top drive, and down the inside of the drill string. It leaves through nozzles in the bit and climbs back up the annulus, the gap between the string and the hole, carrying the rock cuttings.",
          "At surface it leaves through the flow line to the shale shakers, which screen the cuttings out; hydrocyclones — desanders and desilters — take out the finer solids, and a degasser any gas. The mud settles in the tanks and goes back to the pumps. The blue dots on the plate follow that loop.",
        ],
        terms: [
          ["Mud weight", "The density of the mud. Its column presses on the rock and holds back the fluids in it — the well's first barrier."],
          ["Annulus", "The ring-shaped space between the drill string and the wall of the hole, or the casing."],
        ],
      },
      {
        view: "control",
        eyebrow: "System 4 · Well control",
        title: "The blowout preventer",
        body: [
          "Under the drill floor, on top of the wellhead, sits the blowout preventer stack — the BOP. If formation fluid gets into the well (a kick), the crew closes it and the well is shut in.",
          "An annular preventer at the top closes a rubber element around whatever is in the hole. Ram preventers below close steel rams: pipe rams around the drill pipe, blind or shear rams across an open hole — shear rams cut the pipe to do it. The accumulator stores hydraulic pressure so the BOP can close even if the rig loses power.",
        ],
        terms: [
          ["Kick", "An unplanned flow of formation fluid into the well, because the rock's pressure exceeds the mud's."],
          ["Choke manifold", "Valves that let the crew circulate a kick out against controlled back-pressure."],
        ],
      },
      {
        view: "power",
        eyebrow: "System 5 · Power",
        title: "Engines and generators",
        body: [
          "Diesel engines drive generators, and an electrical system distributes the power to everything: the drawworks, the mud pumps, the top drive, the lights and the camp. The fuel and water tanks sit beside them.",
          "The mud pumps and the drawworks are the biggest users. A large land rig is described by its horsepower — the power its drawworks can deliver.",
        ],
      },
      {
        view: "pipe",
        eyebrow: "Handling pipe",
        title: "From the racks to the floor",
        body: [
          "Joints of pipe wait on the pipe racks. Each is rolled onto the catwalk and pulled up the V-door ramp to the drill floor.",
          "When the string comes out of the hole — a trip, to change a worn bit — it is broken into stands of three joints and racked upright in the mast. The derrickman works up on the racking board, guiding the top of each stand into place.",
        ],
        terms: [["Trip", "Pulling the whole string out of the hole and running it back in."]],
      },
    ],
    sources: [S.petexRig, S.slbGlossary],
  },
  {
    id: "formations",
    numeral: "03",
    name: "Beneath Kuwait",
    wordmark: ["Beneath", "— Kuwait"],
    lede: "Under the desert lie thousands of feet of layered rock. Oil is found where four things line up: a rock that made it, a rock that holds it, a rock that seals it in, and a shape that traps it.",
    steps: [
      {
        view: "descend",
        eyebrow: "Under the pad",
        title: "Rock in layers",
        body: [
          "Below the rig the well passes through layer after layer of sedimentary rock — sand, shale, limestone — each laid down in a different age and setting. Geologists call a mappable layer a formation and give it a name.",
          "Our illustrative well meets the names of Greater Burgan: the Ahmadi Shale, then the Wara sands, the Mauddud limestone and the Burgan sands, where it turns horizontal.",
        ],
        terms: [["Formation", "A body of rock distinct enough to be mapped and named, usually after the place it was first described."]],
      },
      {
        view: "block",
        eyebrow: "The block",
        title: "Layers, folded into a dome",
        body: [
          "The layers were laid down nearly flat across the Arabian platform. Slow movement deep below later bowed them into broad, gentle domes — anticlines.",
          "The block on the plate is a geologist's diagram of one: a slab cut out of the ground, the layers drawn on its faces in the symbols of a geological section. Its height is exaggerated 2.4 times so the gentle fold can be seen at all.",
        ],
        terms: [["Anticline", "A fold of rock layers that arches upward, like an upturned bowl."]],
      },
      {
        view: "trap",
        eyebrow: "The trap",
        title: "What makes an oil field",
        body: [
          "Oil forms in a source rock — fine-grained, rich in organic matter — when burial heats it; in Kuwait the dark Makhul shales below the Minagish and the Jurassic Najmah shale are among them. Oil is lighter than water, so it migrates upward through porous rock until something stops it.",
          "Here the reservoir is sandstone, whose pore spaces hold the oil, and the seal above it is the Ahmadi Shale — the cap rock over the Wara and every reservoir below it at Burgan. Under the arch of the dome the oil gathers at the crest. Below the oil–water contact the same sand holds only water — which is why a well on the crest finds oil, and one down the flank does not.",
        ],
        terms: [
          ["Reservoir", "Rock with enough connected pore space to hold oil and let it flow."],
          ["Seal", "A layer that fluids cannot pass through — shale, anhydrite, salt."],
          ["Oil–water contact", "The depth below which a reservoir holds water instead of oil."],
        ],
      },
      {
        view: "column",
        eyebrow: "The column",
        title: "From the surface down",
        body: [
          "Read top to bottom, the column runs from young sand and gravel at the surface to Jurassic limestone some 15,000 ft down. Near the top, the Kuwait Group and the Dammam limestone are Kuwait's two groundwater aquifers, mostly brackish — and surface casing seals them off.",
          "The great reservoirs are Cretaceous: the Burgan sandstone, the largest, with the Wara sands and Mauddud limestone above it and the Zubair sands and Minagish oolite below. Deeper, sealed under the Hith anhydrite and the Gotnia salt, the Jurassic Najmah, Sargelu and Marrat are tight, fractured limestones holding light oil and gas at high pressure and temperature — and often sour, with hydrogen sulphide.",
        ],
        figure: "column",
      },
    ],
    sources: [S.usgsKuwait, S.aapgCretaceous, S.geoexproBurgan, S.heliyonMinagish, S.jptJurassic],
  },
  {
    id: "fields",
    numeral: "04",
    name: "The fields",
    wordmark: ["The", "— fields"],
    lede: "Kuwait's oil fields are its anticlines, mapped. Most sit in three areas — the north, the west, and Greater Burgan in the south-east.",
    steps: [
      {
        view: "kuwait",
        eyebrow: "Kuwait",
        title: "A map of domes",
        body: [
          "Each raised, contoured shape on the plate is a field: a dome like the one in chapter 03, seen from above. The contours are the same idea as on a topographic map, drawn over the structure instead of the hills.",
          "The map is schematic. The outline is Kuwait's; field positions and sizes are approximate, and only the larger fields are shown.",
        ],
      },
      {
        view: "north",
        eyebrow: "North Kuwait",
        title: "Raudhatain, Sabriyah and their neighbours",
        body: [
          "North of Kuwait Bay lie Raudhatain, found in 1955, and Sabriyah beside it — two large domes producing from the Mauddud limestone and the Burgan and Zubair sands. Bahra, site of the first well, lies to the south.",
          "To the west are Ratqa, where the Lower Fars project steams heavy oil out of shallow sands, and Mutriba. Deep below the north, under the Gotnia seal, lie the Jurassic reservoirs where gas was announced in 2006.",
        ],
      },
      {
        view: "west",
        eyebrow: "West Kuwait",
        title: "Minagish and Umm Gudair",
        body: [
          "In the west, Minagish and Umm Gudair are the largest fields. Minagish, found in 1959, was the first accumulation in the Minagish oolite, a limestone that is the main reservoir of south-west Kuwait. Umm Gudair, near the Saudi border, is two anticlines joined into one dome, with the oolite at about 8,000–9,250 ft.",
          "Abduliyah and Dharif are smaller fields between them and Greater Burgan.",
        ],
      },
      {
        view: "south",
        eyebrow: "South and East Kuwait",
        title: "Greater Burgan",
        body: [
          "Burgan, with Magwa and Ahmadi to its north, makes up Greater Burgan: one asymmetric anticline about 35 by 20 km with three domes — Burgan, some 500 km², Magwa and Ahmadi, found in the early 1950s. It is the field of 1938, and the Burgan sandstone gives the field and the reservoir their name.",
          "It produces from six Cretaceous reservoirs — the Wara, the Mauddud, and the Third and Fourth Sands of the Burgan Formation. One of them, the middle Third Sand, has given more than three-quarters of the field's oil.",
          "South of the border lies the Divided Zone, shared with Saudi Arabia, with fields such as Wafra; it is not shown here.",
        ],
      },
    ],
    sources: [S.geoexproBurgan, S.kpcHistory, S.heliyonMinagish, S.ogjGas2006, S.lowerFars, S.gemFields, S.outline],
  },
  {
    id: "drilling",
    numeral: "05",
    name: "Drilling a well",
    wordmark: ["Drilling", "— a well"],
    lede: "A well is drilled in sections, each a smaller hole than the last and each lined with steel before the next begins. Follow the illustrative well from spud to total depth.",
    steps: [
      {
        view: "spud",
        eyebrow: "Spud · 0–1,600 ft",
        title: "Start at the top",
        body: [
          "The well begins with a conductor — here 20″ pipe set to 250 ft — to hold the loose surface ground open and give the mud a way back to the rig.",
          "The surface hole is drilled next, 17½″, past the groundwater layers. 13⅜″ surface casing is run and cemented, sealing the aquifers off, and the BOP stack is installed on top of it before drilling on.",
        ],
        terms: [["Casing", "Steel pipe run into a drilled hole and cemented in place to line it."]],
      },
      {
        view: "casing",
        eyebrow: "Casing and cement",
        title: "Each string a size smaller",
        body: [
          "Every section is drilled with a bit that fits inside the casing above it, so the hole telescopes down: 26″, 17½″, 12¼″, 8½″. Each casing string ends at a shoe; cement is pumped down inside it and up the annulus behind it.",
          "Once the cement has set, the next bit drills out the shoe and a few feet of new hole, and the crew pressure-tests the rock there to learn how heavy a mud the next section can carry.",
        ],
        terms: [["Shoe", "The reinforced bottom end of a casing string; its depth is the casing setting depth."]],
      },
      {
        view: "directional",
        eyebrow: "Directional drilling",
        title: "Kick off, build, land",
        body: [
          "Few wells go straight down. This one is vertical to the kick-off point at 3,000 ft, then builds angle at 4° per 100 ft, holds a tangent, builds again at 6° per 100 ft, and lands horizontal in the reservoir.",
          "A horizontal lateral — here 3,000 ft — keeps the well inside the oil-bearing sand for far longer than a vertical well could, and lets one surface location reach rock a long way off.",
        ],
        terms: [
          ["MD and TVD", "Measured depth is the length along the hole; true vertical depth is how far down it is. The readout on the plate shows both."],
          ["Dogleg severity", "How sharply the hole curves, in degrees per 100 ft."],
        ],
      },
      {
        view: "build",
        eyebrow: "In the build",
        title: "Torque and drag",
        body: [
          "Through the curve the drill string lies on the low side of the hole. That contact is where friction comes from: torque when the string turns, drag when it moves up or down.",
          "Planning keeps the curves smooth enough that the string can still be turned, pushed and pulled all the way to the end of the lateral.",
        ],
      },
      {
        view: "cuttings",
        eyebrow: "At the bit",
        title: "Keeping the hole clean",
        body: [
          "At the bottom of the string, the bit grinds rock into cuttings and the mud carries them away. In a horizontal hole they tend to settle on the low side into a bed — visible on the plate — so flow rate, mud properties and pipe rotation are all set to keep them moving.",
          "Behind the bit, a rotary steerable tool pushes against the wall to steer, while sensors report the well's direction and the rock around it to the surface.",
        ],
      },
      {
        view: "td",
        eyebrow: "TD · 8,150 ft MD",
        title: "Total depth, and after",
        body: [
          "At total depth the hole is logged — measured for the rock and fluids it crossed — and the final string is run: production casing or a liner across the reservoir.",
          "The well is then completed: production tubing, a packer and, at surface, a Christmas tree of valves. The rig skids or moves to the next well, and the well goes to the production teams.",
        ],
        terms: [["Completion", "The equipment that lets a drilled well produce safely — tubing, packers, the Christmas tree."]],
      },
    ],
    sources: [S.slbGlossary, S.petexRig],
  },
  {
    id: "components",
    numeral: "06",
    name: "The drill string",
    wordmark: ["The drill", "— string"],
    lede: "From the top drive to the bit, the drill string is a column of threaded steel thousands of feet long. Most of it is plain pipe; the last few hundred feet — the bottomhole assembly — do the clever work.",
    steps: [
      {
        view: "dp",
        eyebrow: "Drill pipe",
        title: "Joints and tool joints",
        body: [
          "Drill pipe comes in joints of about 31 ft. Each end has a thick-walled tool joint, threaded pin at one end and box at the other, with a hard-faced band to resist wear against the casing.",
          "Here 5″ pipe turns inside 9⅝″ casing, lying on the low side. Most of the string's length is drill pipe like this.",
        ],
      },
      {
        view: "hwdp",
        eyebrow: "Heavy-weight pipe and the jar",
        title: "The transition",
        body: [
          "Heavy-weight drill pipe sits between the flexible drill pipe and the stiff bottomhole assembly, so stress does not concentrate at one join. In a horizontal well it also adds weight where it can push the bit.",
          "The drilling jar is a tool for getting free: if the string sticks, the jar is set off by pulling or pushing, and delivers a hammer blow along the string.",
        ],
        terms: [["BHA", "Bottomhole assembly: the bit and the tools just above it, up to the drill pipe."]],
      },
      {
        view: "mwd",
        eyebrow: "MWD and LWD",
        title: "Measuring while drilling",
        body: [
          "The MWD tool measures inclination and direction and sends them to the surface as pressure pulses in the mud. It sits in non-magnetic collars so the steel around it does not disturb its compass.",
          "The LWD tool logs the rock as the bit passes — resistivity, gamma ray and more — so the team can steer by the rock itself and keep the well in the best of the reservoir.",
        ],
      },
      {
        view: "rss",
        eyebrow: "Rotary steerable",
        title: "Steering while turning",
        body: [
          "A rotary steerable system steers the well while the whole string rotates. Pads on its body push against the hole wall on one side, and the bit is turned the other way.",
          "Stabilisers — blades of nearly full hole size — hold the assembly centred so that it drills where it is pointed.",
        ],
      },
      {
        view: "bit",
        eyebrow: "The bit",
        title: "Where the rock is cut",
        body: [
          "This is a PDC bit: blades studded with polycrystalline diamond compact cutters — synthetic diamond — which shear the rock like a plane. With no moving parts, PDC bits have taken over much of the footage that roller cones once drilled.",
          "Roller-cone bits — usually three cones on bearings, with steel teeth or tungsten-carbide inserts — crush and gouge the rock instead. They are still chosen for harder rock.",
        ],
        figure: "bits",
      },
    ],
    sources: [S.slbGlossary, S.ogjBits],
  },
];

/* ------------------------------------------------------------------------ */
/* Check yourself                                                            */

export interface Question {
  chapter: ChapterDef["id"];
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export const QUIZ: Question[] = [
  {
    chapter: "discovery",
    q: "Where was Kuwait's first well drilled, and what did it find?",
    options: ["Burgan — oil at 3,670 ft", "Bahra — no commercial oil", "Ahmadi — gas"],
    answer: 1,
    why: "Bahra No. 1, spudded in 1936, was abandoned in 1937 at 7,950 ft as a dry hole. Oil came at Burgan in 1938.",
  },
  {
    chapter: "rig",
    q: "Which part of the rig reels in the drilling line to lift the string?",
    options: ["The crown block", "The drawworks", "The top drive"],
    answer: 1,
    why: "The drawworks is the winch. The crown block's sheaves are fixed at the top of the mast; the top drive turns the string.",
  },
  {
    chapter: "rig",
    q: "What is a well's first barrier against a kick?",
    options: ["The weight of the mud column", "The annular preventer", "The casing shoe"],
    answer: 0,
    why: "The mud's hydrostatic pressure holds back the formation fluids. The BOP is the second barrier, closed when the first fails.",
  },
  {
    chapter: "formations",
    q: "Why does a well on the crest of a dome find oil while one on the flank finds water?",
    options: ["The flank is a different formation", "Oil is lighter than water and gathers at the top", "The crest is shallower, so the oil is warmer"],
    answer: 1,
    why: "Oil rises through the reservoir until the seal stops it, so it collects under the crest. Below the oil–water contact the same rock holds water.",
  },
  {
    chapter: "fields",
    q: "Which fields make up Greater Burgan?",
    options: ["Raudhatain, Sabriyah and Bahra", "Minagish and Umm Gudair", "Burgan, Magwa and Ahmadi"],
    answer: 2,
    why: "Greater Burgan is Burgan with Magwa and Ahmadi. Raudhatain and Sabriyah are in the north, Minagish and Umm Gudair in the west.",
  },
  {
    chapter: "drilling",
    q: "Why does each hole section get smaller?",
    options: ["Smaller bits drill faster", "Each new bit must pass through the casing above", "Deeper rock is harder"],
    answer: 1,
    why: "Casing lines each section, so the next bit has to fit inside it. The well telescopes: 26″, 17½″, 12¼″, 8½″.",
  },
  {
    chapter: "components",
    q: "What does the MWD tool send to the surface, and how?",
    options: ["Rock samples, in the mud", "Inclination and direction, as pressure pulses in the mud", "Video, over a cable"],
    answer: 1,
    why: "Mud-pulse telemetry: the MWD modulates the mud pressure, and sensors on the standpipe decode it.",
  },
];
