const firstResultKey = "blue-books-first-result-v1";
let sendingResult = false;

async function recordFirstResult(code) {
  if (!["http:", "https:"].includes(location.protocol) || sendingResult) return;
  try {
    let entry = JSON.parse(localStorage.getItem(firstResultKey));
    if (!entry && code) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const id = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
      entry = { id, code };
      localStorage.setItem(firstResultKey, JSON.stringify(entry));
    }
    if (!entry || entry.saved) return;
    sendingResult = true;
    const response = await fetch("/.netlify/functions/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entry.id, code: entry.code }),
      keepalive: true
    });
    if (response.ok) {
      entry.saved = true;
      localStorage.setItem(firstResultKey, JSON.stringify(entry));
    }
  } catch {
    // Preserve the first result locally for the next visit or reconnect.
  } finally {
    sendingResult = false;
  }
}

window.addEventListener("online", () => recordFirstResult());
recordFirstResult();
