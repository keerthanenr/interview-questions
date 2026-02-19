const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST;

export function notifyRoom(room: string, type: string) {
  if (!PARTYKIT_HOST) return;

  const protocol = PARTYKIT_HOST.startsWith("localhost") ? "http" : "https";
  const url = `${protocol}://${PARTYKIT_HOST}/parties/main/${room}`;

  fetch(url, {
    method: "POST",
    body: JSON.stringify({ type }),
  }).catch(() => {
    // Fire-and-forget — don't block the API response
  });
}
