// Public reading list for the studio, by topic. Links were checked in October 2026:
// several agency sites had been reorganised, so moved pages point to their current
// address, and pages no longer online point to an Internet Archive copy.

export type LinkStatus = "live" | "moved" | "archived";

export interface Reading {
  title: string;
  publisher: string;
  summary: string;
  url: string;
  status: LinkStatus;
}

export interface ReadingSection {
  topic: string;
  items: Reading[];
}

const HDB = "https://www.hdb.gov.sg";
const archive = (timestamp: string, url: string) => `https://web.archive.org/web/${timestamp}/${url}`;

export const READING_LIST: readonly ReadingSection[] = [
  {
    topic: "The evolution of public housing",
    items: [
      {
        title: "Evolution of Public Housing in Singapore",
        publisher: "Gov.sg",
        summary: "From SIT resettlement to HDB today: home ownership and estate upgrading policies.",
        url: "https://www.gov.sg/explainers/evolution-of-public-housing-in-singapore/",
        status: "live",
      },
      {
        title: "Dwellings: The Evolution Issue (Feb/Mar 2020)",
        publisher: "HDB",
        summary: "Sixty years of HDB homes and where public housing is heading.",
        url: archive("20230131065829", `${HDB}/about-us/news-and-publications/publications/dwellings/housing-a-nation`),
        status: "archived",
      },
    ],
  },
  {
    topic: "Urban design frameworks and town development",
    items: [
      {
        title: "Plan and Design Towns",
        publisher: "HDB",
        summary: "HDB’s planning approach, including the town–neighbourhood–precinct structure. Replaces the former “Town Planning History” page.",
        url: `${HDB}/about-us/our-role/plan-and-design-towns`,
        status: "moved",
      },
      {
        title: "Town Design Guides",
        publisher: "HDB",
        summary: "How design guides set each town’s vision, planning principles and identity.",
        url: `${HDB}/about-us/our-role/plan-and-design-towns/town-design-guides`,
        status: "moved",
      },
      {
        title: "Remaking Our Heartland (ROH)",
        publisher: "HDB",
        summary: "Renewing older towns with new facilities, public spaces and better connections.",
        url: "https://assets.hdb.gov.sg/about-us/hdb_roh4/index.html",
        status: "live",
      },
      {
        title: "Designing for Life Roadmap",
        publisher: "HDB",
        summary: "A 10-year plan built on “Live Well, Live Smart, Live Connected”.",
        url: archive("20240830033042", `${HDB}/about-us/news-and-publications/publications/dwellings/Designing-for-Life`),
        status: "archived",
      },
      {
        title: "Integrated Developments",
        publisher: "HDB",
        summary: "Bringing childcare, healthcare, retail and more together, as at Kampung Admiralty and Oasis Terraces.",
        url: archive(
          "20230130054516",
          `${HDB}/about-us/hdbs-refreshed-roadmap-designing-for-life/ilve-connected/integrated-developments`,
        ),
        status: "archived",
      },
    ],
  },
  {
    topic: "Smart and sustainable estates",
    items: [
      {
        title: "Create Smart and Sustainable Homes",
        publisher: "HDB",
        summary: "Overview of HDB’s work on sustainability and smart technology across estates.",
        url: `${HDB}/about-us/our-role/create-smart-and-sustainable-homes`,
        status: "moved",
      },
      {
        title: "Green Towns Programme",
        publisher: "HDB",
        summary: "A 10-year programme to cut energy use and make towns more liveable with solar, greenery and efficient features.",
        url: `${HDB}/about-us/our-role/create-smart-and-sustainable-homes/green-towns-programme`,
        status: "moved",
      },
      {
        title: "Smart HDB Town",
        publisher: "HDB",
        summary: "Data-driven planning and sensors for estate management and residents’ experience.",
        url: archive("20240814030054", `${HDB}/about-us/our-role/smart-and-sustainable-living/smart-hdb-town-page/`),
        status: "archived",
      },
    ],
  },
  {
    topic: "Demographics and population",
    items: [
      {
        title: "Population Trends 2026",
        publisher: "SingStat",
        summary: "Annual report on fertility, ageing, household size and the resident and non-resident population, with an infographic.",
        url: "https://www.singstat.gov.sg/publication-resources/population-trends-2026",
        status: "moved",
      },
      {
        title: "Population infographics",
        publisher: "SingStat",
        summary: "Population and household data summarised visually.",
        url: archive("20260218123556", "https://www.singstat.gov.sg/modules/infographics/population"),
        status: "archived",
      },
    ],
  },
  {
    topic: "Car parking and car-lite strategies",
    items: [
      {
        title: "Four public housing estates zoned as car-lite areas",
        publisher: "HDB",
        summary: "Estates such as Tengah and Ulu Pandan planned with fewer car parks, more greenery and better walk–cycle–ride links.",
        url: `${HDB}/hdb-pulse/news/2022/four-public-housing-estates-zoned-as-car-lite-areas`,
        status: "moved",
      },
    ],
  },
  {
    topic: "Ageing in place",
    items: [
      {
        title: "Community Care Apartments",
        publisher: "HDB",
        summary: "Senior-friendly flats with care services and shared spaces on site.",
        url: `${HDB}/buying-a-flat/bto-sbf-and-open-booking-of-flats/finding-a-new-flat/types-of-flats/community-care-apartments`,
        status: "moved",
      },
      {
        title: "Silver Upgrading Programme in 26 precincts",
        publisher: "HDB",
        summary: "Precinct upgrades such as therapeutic gardens, fitness trails and rest points for seniors.",
        url: `${HDB}/hdb-pulse/news/2024/silver-upgrading-programme-to-be-rolled-out-in-26-precincts-to-support-ageing-in-place`,
        status: "moved",
      },
    ],
  },
  {
    topic: "Airspace and height control",
    items: [
      {
        title: "Aerial activities",
        publisher: "CAAS",
        summary: "Where kites, drones and balloons are restricted: a useful proxy for areas under tighter aviation height controls.",
        url: "https://www.caas.gov.sg/industry/airspace-management-and-aerial-activities/aerial-activities/",
        status: "moved",
      },
      {
        title: "Obstacle height control",
        publisher: "CAAS",
        summary: "Aviation safety zones and when structures, even cranes, need CAAS approval; key to height limits near airports and airbases.",
        url: "https://www.caas.gov.sg/industry/airspace-management-and-aerial-activities/obstacle-height-control/",
        status: "moved",
      },
    ],
  },
  {
    topic: "Planning challenges",
    items: [
      {
        title: "Building with Care",
        publisher: "HDB",
        summary: "HDB’s evidence-based, consultative approach to complex planning and housing questions.",
        url: archive("20250404031448", `${HDB}/about-us/news-and-publications/publications/dwellings/Building-with-Care`),
        status: "archived",
      },
      {
        title: "Future of Living (Long-Term Plan Review)",
        publisher: "URA",
        summary: "Planning for inclusive, resilient living environments, shaped by public engagement.",
        url: "https://www.ura.gov.sg/land-planning/long-term-plan/public-engagement-journey/themes/future-of-living/",
        status: "moved",
      },
      {
        title: "Liveable Density: A Conversation with Heng Chye Kiang",
        publisher: "Ethos (Civil Service College)",
        summary: "How Singapore balances high density with liveability, and the trade-offs involved.",
        url: "https://knowledge.csc.gov.sg/ethos-issue-24/liveable-density-a-conversation-with-heng-chye-kiang/",
        status: "live",
      },
    ],
  },
  {
    topic: "Other publications",
    items: [
      {
        title: "HDBSpeaks",
        publisher: "HDB",
        summary: "Short articles on HDB policies and schemes, with case examples and infographics.",
        url: archive("20240111061736", `${HDB}/about-us/news-and-publications/publications/hdbspeaks`),
        status: "archived",
      },
      {
        title: "HDB Publications",
        publisher: "HDB",
        summary: "HDB’s books on public housing in Singapore; the online editions are free to read.",
        url: `${HDB}/hdb-pulse/publications/hdb-publications`,
        status: "moved",
      },
      {
        title: "Dwellings",
        publisher: "HDB",
        summary: "HDB’s magazine on how it creates public housing that is uniquely Singapore.",
        url: archive("20250214191936", `${HDB}/about-us/news-and-publications/publications/dwellings`),
        status: "archived",
      },
    ],
  },
];
