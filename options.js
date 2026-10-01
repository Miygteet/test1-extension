const api = globalThis.browser ?? globalThis.chrome;
const enabled = document.querySelector("#enabled");
const familyGroupIdInput = document.querySelector("#familyGroupId");
const saveFamilyGroupButton = document.querySelector("#saveFamilyGroup");
const deviceIdElement = document.querySelector("#deviceId");
const setupStatus = document.querySelector("#setupStatus");
const domainInput = document.querySelector("#domain");
const domainList = document.querySelector("#domains");
const empty = document.querySelector("#empty");
const status = document.querySelector("#status");

let settings = {
  enabled: true,
  blockedDomains: [],
  familyGroupId: "",
  deviceId: ""
};

function normalizeDomain(value) {
  return String(value).trim().toLowerCase()
    .replace(/^[a-z]+:\/\//, "").split(/[/?#]/, 1)[0]
    .replace(/^\*\./, "").replace(/^www\./, "");
}

function showStatus(message, element = status) {
  element.textContent = message;
  setTimeout(() => { element.textContent = ""; }, 2500);
}

function render() {
  enabled.checked = settings.enabled;
  familyGroupIdInput.value = settings.familyGroupId || "";
  deviceIdElement.textContent = settings.deviceId || "Unavailable";
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
  try {
    await api.runtime.sendMessage({ type: "refresh-rules" });
  } catch (error) {
    console.warn("The background service worker did not respond:", error);
  }
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

saveFamilyGroupButton.addEventListener("click", async () => {
  const familyGroupId = familyGroupIdInput.value.trim();
  if (!familyGroupId) {
    showStatus("Paste a Family Group ID first", setupStatus);
    return;
  }

  settings.familyGroupId = familyGroupId;
  await save();
  showStatus("Family group saved on this device", setupStatus);
});

api.storage.local.get(settings).then((stored) => {
  settings = { ...settings, ...stored };
  render();
}).catch((error) => {
  showStatus("Unable to load extension settings: " + error.message);
});
