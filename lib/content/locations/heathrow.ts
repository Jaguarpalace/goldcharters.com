import type { LocationContent } from './types';

export const heathrow: LocationContent = {
  slug: 'heathrow',
  name: 'Heathrow',
  region: 'West London / South Bucks',
  postcodes: 'TW6, UB, TW3, TW4, TW5 and surrounding airport-corridor postcodes',

  metaTitle: 'Sell Gold & Jewellery near Heathrow - Charters Gold',
  metaDescription:
    'Private valuations for residents and travellers in the Heathrow corridor. Quick same-day appointments at our Egham office, 15 minutes from Terminal 5. Insured postal service for international clients.',

  heroEyebrow: 'Selling Gold & Jewellery - Heathrow',
  heroTitle: 'Private Valuations Minutes from the Airport',
  heroIntro:
    'Our Egham office is 10 miles from Heathrow - typically 15–20 minutes from Terminal 5. We are well used to working with airport-area residents, expatriates moving overseas, returning long-stay travellers and international clients passing through. Same-day appointments where the diary allows.',

  travel: {
    distanceMiles: 10,
    drive:
      'M25 to Junction 13 (Egham) - typically 15–20 minutes from Heathrow Terminal 5, longer from T2 / T3 in heavy traffic. Free parking on site.',
    publicTransport:
      'From Heathrow Central Bus Station, the 441 / 71 / 71B services run toward Staines and Egham. Easier for most clients: short taxi/Uber (≈£20–25) directly to our office.',
  },

  whyHere: [
    {
      title: 'Built around airport-area timing',
      body: 'Whether you’re flying out tomorrow or just landed this morning, we structure appointments around tight diaries. A 30-minute slot is usually enough to assess a piece, agree a figure, and arrange payment the same day.',
    },
    {
      title: 'Used to working with overseas clients',
      body: 'Long-haul travellers, expatriates relocating, and inbound visitors from outside the UK all engage with us regularly. We accept GBP bank transfer, can arrange international payment routes by arrangement, and provide full documentation suitable for HMRC or non-UK tax purposes.',
    },
    {
      title: 'Discreet alternative to airport-area pawnshops',
      body: 'The Heathrow corridor has its share of jewellery shops and pawnbrokers - most operating on retail margins, with public-facing counters. We offer a private alternative: one specialist, one client, no walk-in foot traffic.',
    },
  ],

  neighbourhoods: [
    'Heathrow (TW6)',
    'Hayes',
    'West Drayton',
    'Hatton',
    'Cranford',
    'Harlington',
    'Hounslow',
    'Feltham',
    'Bedfont',
    'Stanwell',
    'Colnbrook',
    'Iver',
    'Datchet',
  ],

  processOptions: [
    {
      icon: 'in-person',
      title: 'Same-day appointment at our Egham office',
      body: 'Where the diary allows, we offer same-day appointments for airport-area clients - especially those on tight travel schedules. 15–20 minutes from Terminal 5 by road.',
    },
    {
      icon: 'collect',
      title: 'Hotel or terminal-area meeting by arrangement',
      body: 'For high-value pieces where a client is in transit, we can meet at a Heathrow-area hotel by prior arrangement. Identification on arrival; written acknowledgement before any piece leaves your hand.',
    },
    {
      icon: 'post',
      title: 'Insured postal valuation',
      body: 'Particularly useful for clients flying out shortly: post the piece on your way, receive the offer while you’re away, accept and receive funds by international or UK bank transfer.',
    },
  ],

  commonPieces: {
    title: 'Pieces we frequently value for Heathrow-area clients',
    body: 'Inherited and family pieces from clients relocating overseas, watches purchased duty-free that are now being released, gold sovereigns and bullion held as portable wealth, international wedding jewellery (Indian 22ct, Middle Eastern 21ct), single high-value pieces brought through customs by international visitors, and standard UK-market pieces from the residential corridor (Hayes, Hounslow, West Drayton).',
  },

  faqs: [
    {
      question: 'I’m flying out tomorrow - can you see me today?',
      answer:
        'Often yes. Same-day appointments are available where the diary allows. WhatsApp or call us with photographs and a rough description, and we’ll confirm a slot within an hour.',
    },
    {
      question: 'Can you pay in a non-GBP currency?',
      answer:
        'Our default is GBP bank transfer the same day we accept your piece. International or non-GBP payment is possible by arrangement, though typically slower and subject to your bank’s FX terms.',
    },
    {
      question: 'I have Indian 22ct gold from my family. Do you buy that?',
      answer:
        'Yes - 22ct, 21ct and 24ct gold are all standard for us. We assay accurately rather than assuming purity, which often produces a higher offer than high-street pawnbrokers who default to a conservative carat assumption.',
    },
    {
      question: 'I’m holding a piece for a relative overseas. Can I act on their behalf?',
      answer:
        'You can - we require photo ID for the person bringing the piece, plus a brief written authority from the owner (an email or signed letter is fine). We provide full documentation of the transaction for the owner’s records.',
    },
  ],

  cta: {
    title: 'Begin your Heathrow-area valuation',
    body: 'WhatsApp is the fastest channel for airport-area clients on tight timing. A specialist will confirm a same-day or next-day slot and a guide figure within an hour.',
  },
};
