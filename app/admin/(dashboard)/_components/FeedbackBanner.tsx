/**
 * Tiny inline status indicator. Used by detail pages right next to a Save
 * button to confirm a write succeeded or surface a server error. Both
 * tones are accessible, screen-reader friendly via role=status, and small
 * enough not to push the layout around.
 */
export function FeedbackBanner({
  kind,
  text,
}: {
  kind: 'ok' | 'error';
  text: string;
}) {
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={
        'text-[11px] ' + (kind === 'ok' ? 'text-gold-tint' : 'text-amber-400')
      }
    >
      {text}
    </p>
  );
}
