// data/mock-events.ts
//
// Standalone sample data for the event detail pages under /events/[slug].
// Nothing here touches the ACN API: the live /events listing still comes from
// services/events.ts, and these entries sit alongside it as a design preview of
// what a full event page looks like once the API can relate releases to events.
//
// Shaped on the public information published for RX's BEX Asia and the shows
// that run alongside it, so the copy reads like the real thing rather than
// lorem ipsum. Dates are hard-coded — the "happening now" sample below will
// naturally age into a past event, which is also the simplest way to see the
// countdown's third state.

export interface MockEventRelease {
  id: number;
  headline: string;
  /** ISO form, matching what formatDateTime() in lib/utils accepts. */
  dateTime: string;
  company: string;
  description: string;
  /** Canonical sector_name values from lib/sectors.ts. */
  sectors: string[];
  language: string;
}

export interface MockEventStat {
  label: string;
  value: string;
}

/**
 * Retained but no longer rendered — see the `themes`, `features` and `coLocated`
 * fields on MockEvent. The Programme Themes block is now derived from the
 * releases' industry tags (components/events/event-industries.ts), and the two
 * rail cards were dropped as organiser-maintained content: pavilion lists and
 * what else runs at the venue go stale here and are already on the event site.
 * Kept because they cost nothing and putting either back is a render change.
 */
export interface MockEventTheme {
  title: string;
  body: string;
}

export interface MockEvent {
  /** URL segment: /events/<slug>. */
  slug: string;
  name: string;
  subtitle: string;
  /** Both carry an explicit offset so the countdown is timezone-honest. */
  startDate: string;
  endDate: string;
  /** Display label for the offset above, e.g. "SGT". */
  timezoneLabel: string;
  venue: string;
  city: string;
  country: string;
  organiser: string;
  strategicPartner?: string;
  website: string;
  admission: string;
  openingHours: string[];
  about: string[];
  /** Unrendered — superseded by derived industry tags. See MockEventTheme. */
  themes: MockEventTheme[];
  /** Unrendered — organiser-maintained. See MockEventTheme. */
  features: string[];
  stats: MockEventStat[];
  /** Unrendered — organiser-maintained. See MockEventTheme. */
  coLocated: string[];
  /** Tailwind gradient stops for the hero band. */
  heroGradient: string;
  pressReleases: MockEventRelease[];
}

export const MOCK_EVENTS: MockEvent[] = [
  {
    slug: 'bex-asia-2026',
    name: 'BEX Asia 2026',
    subtitle: 'The Built Environment Exhibition',
    startDate: '2026-09-02T10:00:00+08:00',
    endDate: '2026-09-04T17:00:00+08:00',
    timezoneLabel: 'SGT',
    venue: 'Marina Bay Sands, Sands Expo & Convention Centre',
    city: 'Singapore',
    country: 'Singapore',
    organiser: 'RX (Reed Exhibitions)',
    strategicPartner: 'Building and Construction Authority (BCA), Singapore',
    website: 'https://www.bex-asia.com/',
    admission: 'Free with pre-registration, S$20 on-site',
    openingHours: ['2 - 3 September: 10:00 - 18:00', '4 September: 10:00 - 17:00'],
    about: [
      'BEX Asia brings together the companies and technologies shaping tomorrow’s buildings and cities. Across three days at Marina Bay Sands, the exhibition floor covers the full arc of the built environment, from design and construction through to the systems that keep a building running for the next forty years.',
      'The 2026 edition is organised around what artificial intelligence and robotics are doing on site today rather than what they might do eventually. Alongside the show floor, a programme of expert-led masterclasses, seminars and scheduled one-to-one business matchmaking sessions connects specifiers, developers and solution providers.',
    ],
    themes: [
      {
        title: 'Build with AI',
        body: 'AI-assisted design, clash detection, programme forecasting and building operations, shown in the workflows teams are running now.',
      },
      {
        title: 'Build with Robotics',
        body: 'Site robotics, autonomous survey and prefabrication demonstrations focused on productivity and compressed project timelines.',
      },
      {
        title: 'Sustainability & Waste',
        body: 'Material recovery, embodied carbon accounting and waste management practice across the construction lifecycle.',
      },
    ],
    features: [
      'BuildSG Pavilion',
      'CTx Pavilion',
      'SGBC Seminar Series',
      'Business matchmaking, scheduled one-to-one meetings',
      'Delegation tours tailored to business objectives',
      'Daily networking at Event Square',
    ],
    stats: [
      { label: 'Exhibiting companies', value: '450+' },
      { label: 'Trade visitors expected', value: '13,000' },
      { label: 'Countries represented', value: '40' },
      { label: 'Conference sessions', value: '60+' },
    ],
    coLocated: ['Mostra Convegno Expocomfort Asia 2026', 'Smart Cities & Buildings Asia 2026'],
    heroGradient: 'from-[#0b3d5c] via-[#12658f] to-[#2088c9]',
    pressReleases: [
      {
        id: 900101,
        headline: 'BEX Asia 2026 opens at Marina Bay Sands with 450 exhibitors and a first dedicated robotics hall',
        dateTime: '2026-09-02T10:30:00',
        company: 'RX Global',
        description:
          'The Built Environment Exhibition returned to Marina Bay Sands this morning with its largest floorplan to date, anchored by a dedicated hall for construction robotics and a strategic partnership with the Building and Construction Authority.',
        sectors: ['Trade Shows', 'Construct Engineering', 'Automation [IoT]'],
        language: 'English',
      },
      {
        id: 900102,
        headline: 'BCA unveils updated Green Mark certification roadmap at BEX Asia',
        dateTime: '2026-09-02T14:15:00',
        company: 'Building and Construction Authority',
        description:
          'Singapore’s Building and Construction Authority set out the next phase of its Green Mark scheme at the BEX Asia opening plenary, with revised embodied-carbon thresholds for new non-residential developments.',
        sectors: ['Environment ESG', 'Construct Engineering'],
        language: 'English',
      },
      {
        id: 900103,
        headline: 'Camfil to showcase low-pressure-drop filtration for tropical HVAC loads',
        dateTime: '2026-09-01T09:00:00',
        company: 'Camfil',
        description:
          'Air filtration specialist Camfil will demonstrate a filter range engineered for year-round high-humidity operation, reporting fan-energy reductions across Singapore pilot installations.',
        sectors: ['Engineering', 'Manufacturing'],
        language: 'English',
      },
      {
        id: 900104,
        headline: 'China Railway Construction Corporation signs regional prefabrication agreement at BEX Asia',
        dateTime: '2026-09-03T11:40:00',
        company: 'China Railway Construction Corporation',
        description:
          'CRCC announced a joint venture covering volumetric prefabricated pre-finished construction capacity for Southeast Asian residential projects, signed on the BEX Asia show floor.',
        sectors: ['Construct Engineering', 'Real Estate & REIT'],
        language: 'English',
      },
      {
        id: 900105,
        headline: 'Tru Water brings modular greywater recovery to Southeast Asian developments',
        dateTime: '2026-08-28T08:00:00',
        company: 'Tru Water',
        description:
          'Ahead of BEX Asia, Tru Water detailed a containerised greywater treatment unit aimed at mixed-use developments, positioning it against the cost of retrofitting central plant.',
        sectors: ['Water', 'Environment ESG'],
        language: 'English',
      },
      {
        id: 900106,
        headline: 'JESTAC demonstrates autonomous rebar-tying system for high-rise cores',
        dateTime: '2026-09-03T16:05:00',
        company: 'JESTAC',
        description:
          'The robotics firm ran live demonstrations of a rebar-tying platform it says removes one of the last manual bottlenecks in high-rise core construction.',
        sectors: ['Automation [IoT]', 'Construct Engineering'],
        language: 'English',
      },
    ],
  },

  {
    slug: 'mce-asia-2026',
    name: 'Mostra Convegno Expocomfort Asia 2026',
    subtitle: 'HVAC-R, water and renewable energy for Asia',
    startDate: '2026-09-02T10:00:00+08:00',
    endDate: '2026-09-04T17:00:00+08:00',
    timezoneLabel: 'SGT',
    venue: 'Marina Bay Sands, Sands Expo & Convention Centre',
    city: 'Singapore',
    country: 'Singapore',
    organiser: 'RX (Reed Exhibitions)',
    website: 'https://www.mcexpocomfort-asia.com/',
    admission: 'Free with pre-registration, S$20 on-site',
    openingHours: ['2 - 3 September: 10:00 - 18:00', '4 September: 10:00 - 17:00'],
    about: [
      'Mostra Convegno Expocomfort Asia runs alongside BEX Asia and covers the mechanical side of the building: heating, ventilation, air conditioning and refrigeration, water treatment, and the renewable generation increasingly tied to both.',
      'The Asian edition of the long-running Milan show concentrates on equipment selected for tropical duty cycles, where continuous cooling load, high humidity and regional grid conditions matter more than peak-day headline figures.',
    ],
    themes: [
      {
        title: 'District & Central Cooling',
        body: 'Plant-scale cooling for campuses and mixed-use estates, including thermal storage and heat-recovery integration.',
      },
      {
        title: 'Water & Wastewater',
        body: 'Treatment, recovery and reuse systems for buildings under tightening potable-water constraints.',
      },
      {
        title: 'Renewables & Storage',
        body: 'Rooftop generation, building-integrated photovoltaics and the storage that makes them dispatchable.',
      },
    ],
    features: [
      'Live plant-room demonstrations',
      'Refrigerant transition clinic',
      'Technical seminar theatre',
      'Hosted buyer programme',
    ],
    stats: [
      { label: 'Exhibiting companies', value: '180+' },
      { label: 'Trade visitors expected', value: '6,500' },
      { label: 'Countries represented', value: '28' },
      { label: 'Technical sessions', value: '30+' },
    ],
    coLocated: ['BEX Asia 2026', 'Smart Cities & Buildings Asia 2026'],
    heroGradient: 'from-[#0f3f39] via-[#12695c] to-[#1fa38b]',
    pressReleases: [
      {
        id: 900201,
        headline: 'MCE Asia 2026 to focus on refrigerant transition as regional phase-down accelerates',
        dateTime: '2026-08-26T09:30:00',
        company: 'RX Global',
        description:
          'Organisers said the 2026 edition will devote a dedicated clinic to low-GWP refrigerant conversion, responding to compliance deadlines now landing across ASEAN markets.',
        sectors: ['Engineering', 'Environment ESG'],
        language: 'English',
      },
      {
        id: 900202,
        headline: 'Daikin to present variable-refrigerant systems tuned for tropical part-load operation',
        dateTime: '2026-09-02T11:00:00',
        company: 'Daikin Industries',
        description:
          'The manufacturer will show a VRF range whose control strategy targets the extended part-load hours typical of equatorial climates rather than peak-day performance.',
        sectors: ['Engineering', 'Manufacturing'],
        language: 'English',
      },
      {
        id: 900203,
        headline: 'SP Group outlines district cooling expansion for Singapore’s next precincts',
        dateTime: '2026-09-03T13:20:00',
        company: 'SP Group',
        description:
          'A session at MCE Asia detailed planned district cooling capacity for upcoming precinct developments, with connection economics for early-committing developers.',
        sectors: ['Energy Alternatives', 'Smart Cities'],
        language: 'English',
      },
      {
        id: 900204,
        headline: 'Grundfos launches pump range with embedded flow diagnostics',
        dateTime: '2026-09-04T10:10:00',
        company: 'Grundfos',
        description:
          'The new range reports hydraulic performance drift directly to building management systems, aimed at cutting the manual commissioning burden on large chilled-water loops.',
        sectors: ['Automation [IoT]', 'Engineering'],
        language: 'English',
      },
    ],
  },

  {
    slug: 'sustainable-built-environment-week-2026',
    name: 'Sustainable Built Environment Week Asia 2026',
    subtitle: 'Decarbonising buildings across Southeast Asia',
    startDate: '2026-08-26T09:00:00+08:00',
    endDate: '2026-08-28T18:00:00+08:00',
    timezoneLabel: 'SGT',
    venue: 'Suntec Singapore Convention & Exhibition Centre',
    city: 'Singapore',
    country: 'Singapore',
    organiser: 'Singapore Green Building Council',
    website: 'https://www.sgbc.sg/',
    admission: 'Delegate pass required',
    openingHours: ['26 - 28 August: 09:00 - 18:00'],
    about: [
      'Sustainable Built Environment Week Asia is a conference-first week: three days of technical and policy sessions on how the region’s existing building stock reaches materially lower operational and embodied carbon, and who pays for it.',
      'The programme is deliberately weighted toward retrofit rather than new build, on the argument that most of the buildings standing in 2050 already exist today.',
    ],
    themes: [
      {
        title: 'Deep Retrofit Economics',
        body: 'Financing structures, measured savings and the split-incentive problem in leased commercial stock.',
      },
      {
        title: 'Embodied Carbon',
        body: 'Material selection, disclosure requirements and what procurement can actually specify today.',
      },
      {
        title: 'Grid Interaction',
        body: 'Demand flexibility, on-site storage and how buildings behave as participants rather than loads.',
      },
    ],
    features: [
      'Policy roundtables',
      'Measured-performance case study track',
      'SGBC Awards presentation',
      'Retrofit site visits',
    ],
    stats: [
      { label: 'Delegates', value: '2,400' },
      { label: 'Speakers', value: '120' },
      { label: 'Markets covered', value: '11' },
      { label: 'Sessions', value: '45' },
    ],
    coLocated: [],
    heroGradient: 'from-[#3a2a5c] via-[#5b3f8c] to-[#8b6fc4]',
    pressReleases: [
      {
        id: 900301,
        headline: 'Sustainable Built Environment Week opens with call for mandatory retrofit disclosure',
        dateTime: '2026-08-26T09:45:00',
        company: 'Singapore Green Building Council',
        description:
          'The opening plenary argued that voluntary reporting has taken the region as far as it can, and set out a phased disclosure proposal for commercial landlords.',
        sectors: ['Environment ESG', 'Construct Engineering'],
        language: 'English',
      },
      {
        id: 900302,
        headline: 'CapitaLand reports measured savings across 40-building retrofit programme',
        dateTime: '2026-08-27T11:30:00',
        company: 'CapitaLand Investment',
        description:
          'The developer published metered pre- and post-retrofit consumption for forty assets, alongside the capital cost per unit of avoided energy.',
        sectors: ['Real Estate & REIT', 'Environment ESG'],
        language: 'English',
      },
      {
        id: 900303,
        headline: 'Panel warns embodied-carbon rules risk fragmenting across ASEAN markets',
        dateTime: '2026-08-28T15:00:00',
        company: 'Singapore Green Building Council',
        description:
          'Regulators and suppliers on a closing panel raised the prospect of divergent material-declaration regimes raising compliance cost for regional contractors.',
        sectors: ['Environment ESG', 'Materials & Nanotech'],
        language: 'English',
      },
    ],
  },

  {
    slug: 'bex-asia-2025',
    name: 'BEX Asia 2025',
    subtitle: 'The Built Environment Exhibition',
    startDate: '2025-09-03T10:00:00+08:00',
    endDate: '2025-09-05T17:00:00+08:00',
    timezoneLabel: 'SGT',
    venue: 'Marina Bay Sands, Sands Expo & Convention Centre',
    city: 'Singapore',
    country: 'Singapore',
    organiser: 'RX (Reed Exhibitions)',
    strategicPartner: 'Building and Construction Authority (BCA), Singapore',
    website: 'https://www.bex-asia.com/',
    admission: 'Closed',
    openingHours: ['3 - 4 September: 10:00 - 18:00', '5 September: 10:00 - 17:00'],
    about: [
      'The 2025 edition of BEX Asia ran across three days at Marina Bay Sands, with digital delivery and modular construction as its organising themes. This archived page keeps the show’s press coverage together after the fact.',
    ],
    themes: [
      {
        title: 'Digital Delivery',
        body: 'Common data environments, model-based approvals and the handover of asset information.',
      },
      {
        title: 'Modular Construction',
        body: 'Volumetric prefabrication and the supply chains needed to make it economic at regional scale.',
      },
    ],
    features: ['BuildSG Pavilion', 'Modular construction demonstration zone', 'Seminar theatre'],
    stats: [
      { label: 'Exhibiting companies', value: '390' },
      { label: 'Trade visitors', value: '11,200' },
      { label: 'Countries represented', value: '36' },
      { label: 'Conference sessions', value: '52' },
    ],
    coLocated: ['Mostra Convegno Expocomfort Asia 2025'],
    heroGradient: 'from-[#3d3d3d] via-[#5a5a5a] to-[#8a8a8a]',
    pressReleases: [
      {
        id: 900401,
        headline: 'BEX Asia 2025 closes with 11,200 trade visitors across three days',
        dateTime: '2025-09-05T17:30:00',
        company: 'RX Global',
        description:
          'Organisers reported attendance up on the previous edition, with the modular construction zone drawing the highest dwell time on the floor.',
        sectors: ['Trade Shows', 'Construct Engineering'],
        language: 'English',
      },
      {
        id: 900402,
        headline: 'Modular construction zone signals shift in regional procurement',
        dateTime: '2025-09-04T12:00:00',
        company: 'Building and Construction Authority',
        description:
          'A review session at BEX Asia 2025 noted a rising share of public projects specifying volumetric prefabrication at tender stage.',
        sectors: ['Construct Engineering', 'Manufacturing'],
        language: 'English',
      },
    ],
  },
];

export function getMockEvent(slug: string): MockEvent | undefined {
  return MOCK_EVENTS.find((e) => e.slug === slug);
}

/** Split for the listing: soonest upcoming first, then most recent past. */
export function listMockEvents(nowMs: number): { upcoming: MockEvent[]; past: MockEvent[] } {
  const upcoming: MockEvent[] = [];
  const past: MockEvent[] = [];

  for (const event of MOCK_EVENTS) {
    if (new Date(event.endDate).getTime() >= nowMs) upcoming.push(event);
    else past.push(event);
  }

  upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate));
  past.sort((a, b) => b.startDate.localeCompare(a.startDate));

  return { upcoming, past };
}
