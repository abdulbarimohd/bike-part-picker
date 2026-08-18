// components/JsonLd.tsx
//
// Emits a schema.org JSON-LD block. Server component (no directive, no
// hooks) so the structured data is in the initial HTML for crawlers,
// which is the whole point -- a client-injected script would only be
// seen after hydration.
//
// Every `<` is replaced with its JSON unicode escape (backslash-u003c)
// so a value containing "</script>" cannot close the tag early.
// Standard JSON-LD-in-React practice.

export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
