-- Branching valuation form: each variant collects different fields, all
-- stored on the same valuation_requests row. We add specific columns
-- (rather than a JSON blob) so admin reporting can filter cleanly.
--
-- Run in Supabase → SQL Editor.

alter table public.valuation_requests
  -- Which branch of the form did the customer fill in?
  add column if not exists form_variant text,
  -- Used by jewellery, watch, handbag branches
  add column if not exists brand text,
  -- Used by watch, handbag branches
  add column if not exists model text,
  -- Used by watch, handbag branches
  add column if not exists condition text,
  -- Jewellery branch
  add column if not exists gemstone text,
  add column if not exists jewellery_type text,
  -- Watch + handbag branches
  add column if not exists box_papers text;

comment on column public.valuation_requests.form_variant is
  'Which branch of the form the customer submitted: metal | jewellery | watch | handbag.';
comment on column public.valuation_requests.brand is
  'Designer / maker brand (Rolex, Hermès, Chanel, etc).';
comment on column public.valuation_requests.model is
  'Specific model (Submariner, Birkin 30, etc).';
comment on column public.valuation_requests.condition is
  'Customer-stated condition (Excellent | Good | Fair | Worn).';
comment on column public.valuation_requests.gemstone is
  'Main gemstone if applicable (Diamond, Sapphire, etc).';
comment on column public.valuation_requests.jewellery_type is
  'Piece type for the jewellery branch (Ring, Necklace, Bracelet, etc).';
comment on column public.valuation_requests.box_papers is
  'Whether the customer has the box, papers or both (All | Box only | Papers only | Neither).';
