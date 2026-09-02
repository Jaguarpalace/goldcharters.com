import { redirect } from 'next/navigation';
import { requireFullAdminPage } from '@/lib/auth/adminRole';

// Contact details live inside site_settings — one canonical editor at /admin/settings.
// We redirect here so admins don't waste a click hunting for two screens.
export default async function AdminContactRedirect() {
  await requireFullAdminPage();
  redirect('/admin/settings');
}
