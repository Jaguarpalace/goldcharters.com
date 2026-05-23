import { redirect } from 'next/navigation';

// Contact details live inside site_settings — one canonical editor at /admin/settings.
// We redirect here so admins don't waste a click hunting for two screens.
export default function AdminContactRedirect() {
  redirect('/admin/settings');
}
