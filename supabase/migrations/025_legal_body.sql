-- Make the BODY of legal pages editable, not just the cosmetic copy.
--
-- Original design (migration 021) kept the numbered clauses in
-- version-controlled TSX as a safety against admin typos in legally-
-- reviewed text. In practice the admin found the eyebrow/title/intro
-- override fields confusing — they weren't sure what they affected and
-- couldn't actually change the content they cared about.
--
-- This migration adds a single body_html column. When non-null on a row,
-- the public page renders that HTML in place of the hardcoded JSX body.
-- When null, the hardcoded body is used — first deploy is a no-op.
--
-- Safety:
--   - Body is HTML; admins paste structured content (<h2>, <p>, <ul>).
--   - We use dangerouslySetInnerHTML; the table is admin-write-only via
--     RLS, and the service-role client is the only path that can write.
--     There is no public ingress that would let an attacker plant HTML.
--   - The hardcoded body remains the fallback, so an accidental empty
--     save (or a bad copy/paste) doesn't blank the page — the admin
--     just clears body_html to revert.
--
-- Safe to re-run.

alter table public.legal_pages
  add column if not exists body_html text;
