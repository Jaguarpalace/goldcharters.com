import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEmailTemplateByKey } from '@/lib/queries/emailTemplates';
import { sampleVariablesFor } from '@/lib/email/renderTemplate';
import { TemplateEditor } from './TemplateEditor';

export const dynamic = 'force-dynamic';

export default async function EditTemplatePage({ params }: { params: { key: string } }) {
  const template = await getEmailTemplateByKey(params.key);
  if (!template) notFound();

  const sampleVariables = await sampleVariablesFor(template.key);

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/email-templates"
          className="text-[10px] uppercase tracking-luxe text-gold-metallic hover:text-gold-bright"
        >
          ← All templates
        </Link>
        <h1 className="font-display text-3xl text-white mt-2 sm:text-4xl">{template.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-warmgrey">
          {template.description ?? 'Edit the subject and HTML body. Use the variable list to insert dynamic values.'}
        </p>
      </header>

      <TemplateEditor template={template} sampleVariables={sampleVariables} />
    </div>
  );
}
