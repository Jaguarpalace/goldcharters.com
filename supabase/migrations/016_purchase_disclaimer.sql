-- Add the editable purchase disclaimer text to site_settings.
--
-- Printed on the Purchase Confirmation & Seller's Disclaimer document the
-- customer signs at the moment of sale. Admins can rewrite this from the
-- /admin/settings page; the text below is a sensible UK starting point.
--
-- Plain text only — newlines are preserved when rendered onto the printed
-- document. No HTML, no Markdown.
--
-- Safe to re-run.

alter table public.site_settings
  add column if not exists purchase_disclaimer_text text;

-- Seed the default text into any existing settings row whose disclaimer is
-- still NULL. Idempotent — re-running this migration won't overwrite
-- whatever the admin has edited in the meantime.
update public.site_settings
set purchase_disclaimer_text = $disclaimer$I confirm that:

1. I am the legal owner of the items listed on this document and have full
   authority to sell them. The items are not the subject of any loan,
   charge, lien or other encumbrance, and to the best of my knowledge they
   are not stolen, lost or otherwise the subject of any claim by a third
   party.

2. I have provided valid photographic identification and proof of current
   address, copies of which have been retained by Charters Gold in line
   with the Money Laundering, Terrorist Financing and Transfer of Funds
   (Information on the Payer) Regulations 2017.

3. I have accepted the price stated on this document. The sale is a
   private cash sale between the parties named below and is final and
   binding on completion. No cooling-off period applies.

4. I understand that Charters Gold will retain a record of this
   transaction (including a description of the items, the payment made
   and the identification provided) for the period required by UK law,
   and that this record may be disclosed to law enforcement or regulators
   on lawful request.

5. I confirm that the details recorded above are correct.$disclaimer$
where purchase_disclaimer_text is null;
