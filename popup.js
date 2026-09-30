const api = globalThis.browser ?? globalThis.chrome;
const enabled = document.querySelector("#enabled");
const count = document.querySelector("#count");
const status = document.querySelector("#status");

function showStatus(message) {
  status.textContent = message;
  setTimeout(() => { status.textContent = ""; }, 2500);
}

async function load() {
  const result = await api.runtime.sendMessage({ type: "get-settings" });
  if (!result?.ok) return;
  enabled.checked = result.settings.enabled;
  count.textContent = `${result.settings.blockedDomains.length} blocked domain(s)`;
}

enabled.addEventListener("change", async () => {
  await api.storage.local.set({ enabled: enabled.checked });
  await api.runtime.sendMessage({ type: "refresh-rules" });
  showStatus(enabled.checked ? "Blocking enabled" : "Blocking paused");
});

document.querySelector("#settings").addEventListener("click", () => {
  api.runtime.openOptionsPage();
});

load().catch(() => showStatus("Unable to load settings"));
