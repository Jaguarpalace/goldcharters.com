-- 032: booking slot on valuation requests.
--
-- Set when an admin moves a request to status='booked' via the calendar
-- modal (date + time picked together). Kept afterwards for history, so the
-- overview calendar can still show past visits once a request advances to
-- Bought / Closed.

alter table valuation_requests
  add column if not exists booked_for timestamptz;

-- The overview calendar queries by booking time; partial index keeps it
-- cheap since most requests never book.
create index if not exists valuation_requests_booked_for_idx
  on valuation_requests (booked_for)
  where booked_for is not null;
