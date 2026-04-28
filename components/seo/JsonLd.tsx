/** Server-safe JSON-LD script for crawlable structured data. */
export function JsonLd(props: { id?: string; data: unknown }) {
  return (
    <script
      id={props.id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(props.data) }}
    />
  );
}
