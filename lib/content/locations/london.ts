import type { LocationContent } from './types';

export const london: LocationContent = {
  slug: 'london',
  name: 'London',
  region: 'Greater London',
  postcodes: 'W1, SW1, NW1, EC, WC, SW3, SW7, NW8 and surrounding postcodes',

  metaTitle: 'Sell Gold & Jewellery in London — Private Valuations | Charters Gold',
  metaDescription:
    'A discreet alternative to Hatton Garden. Private gold, diamond, watch and handbag valuations for London clients. Insured postal service or private appointments at our Egham office.',

  heroEyebrow: 'Selling Gold & Jewellery — London',
  heroTitle: 'Discreet Valuations for London Clients',
  heroIntro:
    'A private, specialist-led alternative to Hatton Garden and high-street pawnshops. We work directly with London clients — by insured Royal Mail Special Delivery, by appointment at our Egham office, or — for pieces of significant value — at your private address by arrangement.',

  travel: {
    distanceMiles: 20,
    drive:
      'Egham sits at M25 Junction 13 — 35–50 minutes from West London off-peak, longer through morning rush hour. Free parking on site.',
    publicTransport:
      'Direct South Western Railway services from London Waterloo to Egham run every 30 minutes, journey time roughly 35–40 minutes. We are a 4-minute walk from Egham station.',
  },

  whyHere: [
    {
      title: 'A genuine private alternative to Hatton Garden',
      body: 'Hatton Garden remains the trade hub, but it can feel pressured — busy showrooms, walk-in foot traffic, multiple buyers within ten metres of one another. Many of our London clients come to us specifically because the conversation happens in private, with a single specialist, at your pace.',
    },
    {
      title: 'No high-street brand markup on the offer',
      body: "We don't operate a chain of shops or pay rent in Mayfair. That means the figure we offer reflects the piece, the live market and a fair trade margin — not the cost of a Bond Street window.",
    },
    {
      title: 'Discretion suited to estate and inherited pieces',
      body: "Many London valuations follow a bereavement or a probate request. We handle every enquiry with that context in mind — no pressure to decide, no fee for an inspection, and no obligation to sell if the figure isn't right.",
    },
  ],

  neighbourhoods: [
    'Mayfair',
    'Knightsbridge',
    'Belgravia',
    'Chelsea',
    'Kensington',
    'Notting Hill',
    'Holland Park',
    'Marylebone',
    'St John’s Wood',
    'Hampstead',
    'Highgate',
    'Primrose Hill',
    'Westminster',
    'The City',
    'Canary Wharf',
    'Clapham',
    'Wandsworth',
    'Fulham',
  ],

  processOptions: [
    {
      icon: 'post',
      title: 'Insured postal valuation',
      body: 'For pieces up to £20,000 we use Royal Mail Special Delivery — fully insured, signed-for, tracked next-working-day. We provide a free postage label and a step-by-step packing guide. Funds are released the same day we accept your piece.',
    },
    {
      icon: 'in-person',
      title: 'Private appointment in Egham',
      body: 'Direct trains from London Waterloo to Egham (≈35 min) deposit you a 4-minute walk from our office. Appointments are confidential, by name, with one specialist — never a showroom queue.',
    },
    {
      icon: 'collect',
      title: 'Home visit for significant pieces',
      body: 'For collections, single pieces above £20,000, or where a relative is unable to travel, we arrange a private visit at a London address by appointment. Identification on arrival; valuation is given in writing.',
    },
  ],

  commonPieces: {
    title: 'Pieces we frequently value for London clients',
    body: 'Diamond engagement and dress rings, Cartier and Boodles signed jewellery, antique and Art Deco pieces from family estates, Rolex / Patek Philippe / Audemars Piguet watches, signed designer handbags (Hermès, Chanel, Louis Vuitton) and gold sovereigns from inherited collections. We also value scrap gold and broken jewellery — a single sovereign or a single chain is worth as much of our attention as a full collection.',
  },

  faqs: [
    {
      question: 'Is the postal route really safe for a piece worth £15,000?',
      answer:
        'Yes — Royal Mail Special Delivery insures up to £20,000 with tracked, signed-for, next-working-day handling. We provide a packing guide that satisfies the insurance terms. Once the piece is in the system you receive tracking, and we confirm receipt the same morning it arrives.',
    },
    {
      question: 'Do you collect from London?',
      answer:
        'For pieces of significant value, or where a client is unable to travel, we arrange private collection at your London address by appointment. We carry identification and provide written acknowledgement of receipt before the piece leaves.',
    },
    {
      question: 'How does the offer compare to Hatton Garden?',
      answer:
        "We benchmark against trade and consumer auction prices for the same piece, not against high-street retailer margins. Most clients find our figure equals or exceeds Hatton Garden's best offer — and the conversation happens privately rather than in a shared showroom.",
    },
    {
      question: 'What documentation do I need?',
      answer:
        'For high-value items, ideally proof of purchase, valuation certificates, or service records (especially for watches). For inherited pieces, none of that is essential — we are well-versed in valuing pieces without documentation and will guide you through what to bring.',
    },
  ],

  cta: {
    title: 'Begin your private London valuation',
    body: 'Send us a few photographs and a short description through the valuation form, or reach us directly on WhatsApp. A specialist will respond within one working day with a guide figure and next steps.',
  },
};
