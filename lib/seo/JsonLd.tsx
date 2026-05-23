/**
 * Inline JSON-LD payload for a server component.
 *
 * @example
 *   import { JsonLd } from '@/lib/seo/JsonLd';
 *   import { organizationSchema, websiteSchema } from '@/lib/seo/structuredData';
 *   <JsonLd data={[organizationSchema(settings), websiteSchema(settings)]} />
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(Array.isArray(data) ? data : [data]);
  return (
    <script
      type="application/ld+json"
      // Safe: data is built server-side from typed input, never user-controlled.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
