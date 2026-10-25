/** JSON for a <script type="application/ld+json"> body. Escapes "<" so seller-written text can't close the tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\u003c");
}
