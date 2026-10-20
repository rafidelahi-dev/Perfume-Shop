/** Meta pixel + server-side CAPI CompleteRegistration, deduped by eventId. */
export function fireCompleteRegistration(userData: { email?: string; phone?: string }) {
  const eventId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
  fbq?.("track", "CompleteRegistration", {}, { eventID: eventId });

  fetch("/api/capi/complete-registration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId,
      email: userData.email,
      phone: userData.phone,
      sourceUrl: window.location.href,
    }),
  }).catch(() => {});
}
