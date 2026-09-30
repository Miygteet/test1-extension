const api = globalThis.browser ?? globalThis.chrome;
const enabled = document.querySelector("#enabled");
const domainInput = document.querySelector("#domain");
const domainList = document.querySelector("#domains");
const empty = document.querySelector("#empty");
const status = document.querySelector("#status");

let settings = { enabled: true, blockedDomains: [] };

function normalizeDomain(value) {
  return String(value).trim().toLowerCase()
    .replace(/^[a-z]+:\/\//, "").split(/[/?#]/, 1)[0]
    .replace(/^\*\./, "").replace(/^www\./, "");
}

function showStatus(message) {
  status.textContent = message;
  setTimeout(() => { status.textContent = ""; }, 2500);
}

function render() {
  enabled.checked = settings.enabled;
  domainList.replaceChildren();
  empty.hidden = settings.blockedDomains.length > 0;

  for (const domain of settings.blockedDomains) {
    const item = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = domain;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => removeDomain(domain));
    item.append(text, remove);
    domainList.append(item);
  }
}

async function save() {
  await api.storage.local.set(settings);
  await api.runtime.sendMessage({ type: "refresh-rules" });
  render();
}

async function removeDomain(domain) {
  settings.blockedDomains = settings.blockedDomains.filter((item) => item !== domain);
  await save();
  showStatus(`Removed ${domain}`);
}

document.querySelector("#domain-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const domain = normalizeDomain(domainInput.value);
  if (!domain || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain) || domain.includes("..")) {
    showStatus("Enter a valid domain, such as example.com");
    return;
  }
  if (!settings.blockedDomains.includes(domain)) settings.blockedDomains.push(domain);
  domainInput.value = "";
  await save();
  showStatus(`Added ${domain}`);
});

enabled.addEventListener("change", async () => {
  settings.enabled = enabled.checked;
  await save();
  showStatus(settings.enabled ? "Blocking enabled" : "Blocking paused");
});

api.storage.local.get({ enabled: true, blockedDomains: [] }).then((stored) => {
  settings = { ...settings, ...stored };
  render();
});
