/** Same-site paths only: "next" is user-controlled. Browsers read "/\" like "//", so both are refused. */
export function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\") ? raw : "/dashboard";
}
