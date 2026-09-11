import type { LocationContent } from './types';

/**
 * Bracknell - Band A (about 5 miles from the Ascot office). Added Sep 2026
 * after the customer map showed RG12 / RG42 / RG45 as our densest cluster
 * with no page to match. Copy approved by Paul 11 Sep 2026.
 */
export const bracknell: LocationContent = {
  slug: 'bracknell',
  name: 'Bracknell',
  region: 'Berkshire',
  postcodes: 'RG12, RG42 and RG45',

  metaTitle: 'Sell Gold & Jewellery in Bracknell - Paid in Seconds',
  titleAbsolute: true,
  metaDescription:
    'Sell gold, watches and jewellery twelve minutes from Bracknell. Two stops on the train to Ascot, private appointments, home visits across RG12, RG42 and RG45, same-day payment.',

  heroEyebrow: 'Selling Gold & Jewellery - Bracknell',
  heroTitle: "Bracknell's Closest Private Valuation House, Two Stops Down the Line",
  heroIntro:
    'Bracknell is the nearest large town to our Ascot office: about five miles along the London Road, a twelve-minute drive on a normal day, or two stops on the train from Bracknell station and one from Martins Heron. For Priestwood, Great Hollands, Harmans Water, Binfield, Warfield and Crowthorne we are closer than any dedicated gold and jewellery buyer, and a growing number of our regular clients come from the RG12 and RG42 postcodes.',

  travel: {
    distanceMiles: 5,
    drive:
      "Around twelve minutes: the A329 London Road out past Martins Heron, then the A332 into Ascot. From Crowthorne and Great Hollands, the A322 Bagshot Road and A332 are just as quick. Parking is close to the office on St George's Lane.",
    publicTransport:
      'South Western Railway from Bracknell to Ascot, two stops on the Reading to Waterloo line, around eight minutes. From Martins Heron it is one stop. The office is a seven to ten minute walk from Ascot station.',
  },

  whyHere: [
    {
      title: 'Next door, without the high-street counter',
      body: 'Selling gold from Bracknell has usually meant a counter in the Lexicon or a pawnbroker\'s window. We are a private valuation house twelve minutes away: one specialist, one client, by appointment, with live per-gram rates for metal and current market results for watches and signed pieces. No retail overheads come out of your figure and nobody is watching over your shoulder.',
    },
    {
      title: 'Two generations of Bracknell gold',
      body: 'Bracknell was built as a new town from the 1950s, and the first families to move into Priestwood, Easthampstead, Great Hollands and Wildridings are now passing their jewellery on. Heavy 9ct chains, signet and sovereign rings, wedding bands, and coins bought in the 1970s and 80s arrive with us most weeks, alongside modern 18ct and diamond pieces from the business-park households of Jennett\'s Park, Warfield and Binfield. Both are priced on what they are, not on where they were bought.',
    },
    {
      title: 'Every route covered',
      body: 'Drive over in twelve minutes, have a specialist come to your Bracknell address by appointment, or send smaller pieces by insured post. We also hold private valuation days across Berkshire; current dates are always on the booking page.',
    },
  ],

  neighbourhoods: [
    'Bracknell town centre',
    'Priestwood',
    'Bullbrook',
    'Harmans Water',
    'Martins Heron',
    'Forest Park',
    'Crown Wood',
    'Birch Hill',
    'Hanworth',
    'Great Hollands',
    'Easthampstead',
    'Wildridings',
    "Jennett's Park",
    'Warfield',
    'Whitegrove',
    'Binfield',
    'Crowthorne',
    'Wick Hill',
  ],

  processOptions: [
    {
      icon: 'in-person',
      title: 'Private appointment in Ascot',
      body: 'Twelve minutes by car or two stops on the train. Hallmarks checked and everything weighed in front of you, the figure explained, and payment the same day if you decide to sell.',
    },
    {
      icon: 'collect',
      title: 'Home visit across Bracknell',
      body: 'By appointment across RG12, RG42 and RG45, usually within a few days. Identification on arrival, family welcome at the table, and written acknowledgement before any piece leaves your hand.',
    },
    {
      icon: 'post',
      title: 'Insured postal valuation',
      body: 'Royal Mail Special Delivery from any Bracknell or Crowthorne post office reaches us next working day, tracked and insured up to £20,000. The practical route for a single smaller piece.',
    },
  ],

  commonPieces: {
    title: 'Pieces we frequently value for Bracknell clients',
    body: '9ct and 18ct chains, bracelets and rings from the first Bracknell families, sovereign and half-sovereign rings, wedding and eternity bands, diamond engagement rings from the last twenty years, Rolex Datejust and Submariner, Omega Seamaster and Speedmaster, Tag Heuer and Breitling from the business parks, long-service and retirement watches with engraving, Victorian and mid-century brooches and lockets inherited from Crowthorne and Binfield households, gold coins and small bullion bars, sterling silver, broken and unworn gold, and designer handbags.',
  },

  faqs: [
    {
      question: 'Where can I sell gold in Bracknell?',
      answer:
        'Three routes. For an instant guide figure, put the carat and weight into our gold calculator. For a written estimate, send a few photographs through the valuation form and a specialist replies within one working day. Or book a private appointment at our Ascot office, twelve minutes from Bracknell town centre, where we check the hallmarks, weigh everything in front of you and explain the figure, with no fee and no obligation to sell.',
    },
    {
      question: "Is there a gold buyer near Bracknell that isn't a high-street counter?",
      answer:
        "Yes. We are a private valuation house on St George's Lane in Ascot, five miles from Bracknell, and appointments are one client at a time. Nothing is done at a counter and nothing is done in a hurry. If you would rather not travel, we come to you anywhere in RG12, RG42 or RG45.",
    },
    {
      question: 'How much is 9ct gold worth per gram today?',
      answer:
        'The live rate is on our gold calculator and moves with the market during the day. 9ct is 37.5% pure, so the figure per gram is roughly three eighths of the fine gold price less our margin, which we show rather than hide. The same applies to 14ct, 18ct and 22ct, and to broken gold, which is worth exactly the same per gram as intact gold of the same carat.',
    },
    {
      question: 'Can you come to my home in Bracknell or Crowthorne?',
      answer:
        'Yes, by appointment, usually within a few days. This is the normal route for larger collections, for pieces of significant value, or where an older relative cannot travel. Family members are welcome at the table, everything is weighed and explained there, and you receive written acknowledgement for any piece we take away.',
    },
    {
      question: 'Do you buy broken gold, single earrings and scrap?',
      answer:
        'Every week. Bring the whole tin: we separate what carries value from what does not, at no charge, and price the gold at the live rate for its carat. Odd earrings, snapped chains, dental gold and worn-through rings all count.',
    },
    {
      question: 'Do you buy watches and jewellery as well as gold?',
      answer:
        "Yes. Watches are valued on model, condition and papers rather than metal weight, and a service or retirement engraving is part of the piece's story rather than damage. Diamond and signed jewellery is priced on the stones and the maker, not melted down. Designer handbags with their dust bags and receipts are welcome too.",
    },
    {
      question: 'What do I need to bring?',
      answer:
        'Photo identification (passport or driving licence) and, for larger sales, a recent proof of address, because we buy under UK anti-money-laundering rules. Any boxes, papers, receipts or valuations you have add to the figure for watches and signed pieces. Payment is by bank transfer the same day, or cash for smaller sums.',
    },
  ],

  cta: {
    title: 'Begin your Bracknell valuation',
    body: 'Send a few photographs through the valuation form and a specialist will respond within one working day with a guide figure and the choice of an in-person, home-visit or postal next step. Or simply book an appointment: we are twelve minutes away.',
  },
};
