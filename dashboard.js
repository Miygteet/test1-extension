import { firebaseConfig, FIREBASE_ENDPOINT } from "./firebase-config.js";

const authSection = document.querySelector("#auth-section");
const dashboardSection = document.querySelector("#dashboard-section");
const loadingEl = document.querySelector("#loading");
const signInBtn = document.querySelector("#sign-in-btn");
const signOutBtn = document.querySelector("#sign-out-btn");
const authStatus = document.querySelector("#auth-status");
const groupIdDisplay = document.querySelector("#group-id");
const copyIdBtn = document.querySelector("#copy-id");
const devicesList = document.querySelector("#devices-list");
const noDevices = document.querySelector("#no-devices");
const domainForm = document.querySelector("#domain-form");
const newDomainInput = document.querySelector("#new-domain");
const globalDomains = document.querySelector("#global-domains");
const noDomains = document.querySelector("#no-domains");
const domainStatus = document.querySelector("#domain-status");
const lastUpdated = document.querySelector("#last-updated");

let currentUser = null;
let groupId = null;

function showStatus(message, element = authStatus) {
  element.textContent = message;
  setTimeout(() => { element.textContent = ""; }, 3000);
}

function normalizeDomain(value) {
  return String(value).trim().toLowerCase()
    .replace(/^[a-z]+:\\/\\//, "").split(/[/?#]/, 1)[0]
    .replace(/^\\*\\./, "").replace(/^www\\./, "");
}

async function initAuth() {
  loadingEl.hidden = false;
  try {
    // Initialize Firebase (requires firebase-config.js to be set up)
    const app = firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth(app);

    auth.onAuthStateChanged((user) => {
      currentUser = user;
      if (user) {
        loadingEl.hidden = true;
        authSection.classList.add("hidden");
        dashboardSection.classList.remove("hidden");
        setupDashboard(user);
      } else {
        loadingEl.hidden = true;
        authSection.classList.remove("hidden");
        dashboardSection.classList.add("hidden");
      }
    });

    signInBtn.addEventListener("click", () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider).catch((error) => {
        showStatus("Sign in failed: " + error.message);
      });
    });

    signOutBtn.addEventListener("click", () => {
      auth.signOut();
    });
  } catch (error) {
    loadingEl.hidden = true;
    showStatus("Firebase initialization failed. Check firebase-config.js");
    console.error(error);
  }
}

async function setupDashboard(user) {
  // Generate a group ID from user ID and timestamp
  groupId = user.uid.substring(0, 8) + "_" + Date.now().toString(36).toUpperCase();
  groupIdDisplay.textContent = groupId;

  copyIdBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(groupId).then(() => {
      showStatus("Family Group ID copied!");
    });
  });

  loadDevices();
  loadBlockedDomains();

  domainForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const domain = normalizeDomain(newDomainInput.value);
    if (!domain || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain) || domain.includes("..")) {
      showStatus("Enter a valid domain, such as example.com", domainStatus);
      return;
    }

    try {
      const response = await fetch(FIREBASE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          action: "add-domain",
          domain
        })
      });

      if (response.ok) {
        newDomainInput.value = "";
        showStatus("Domain added! Devices will sync within 5 minutes.", domainStatus);
        loadBlockedDomains();
      } else {
        showStatus("Failed to add domain", domainStatus);
      }
    } catch (error) {
      showStatus("Error: " + error.message, domainStatus);
    }
  });

  setInterval(loadDevices, 10000);
  setInterval(loadBlockedDomains, 10000);
}

async function loadDevices() {
  if (!groupId) return;

  try {
    const response = await fetch(`https://family-manager-api.web.app/devices?groupId=${groupId}`);
    if (!response.ok) throw new Error("Failed to load devices");

    const devices = await response.json();
    devicesList.replaceChildren();
    noDevices.hidden = devices.length > 0;

    for (const device of devices) {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="device-info">
          <strong>${device.name || device.deviceId}</strong>
          <p class="muted">Last synced: ${new Date(device.lastSync || 0).toLocaleString()}</p>
        </div>
      `;
      devicesList.append(li);
    }
  } catch (error) {
    console.error("Error loading devices:", error);
  }
}

async function loadBlockedDomains() {
  if (!groupId) return;

  try {
    const response = await fetch(`https://family-manager-api.web.app/domains?groupId=${groupId}`);
    if (!response.ok) throw new Error("Failed to load domains");

    const data = await response.json();
    globalDomains.replaceChildren();
    noDomains.hidden = data.domains.length > 0;

    for (const domain of data.domains) {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = domain;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => removeDomain(domain));
      li.append(span, removeBtn);
      globalDomains.append(li);
    }

    lastUpdated.textContent = new Date(data.lastUpdated || Date.now()).toLocaleTimeString();
  } catch (error) {
    console.error("Error loading domains:", error);
  }
}

async function removeDomain(domain) {
  if (!groupId || !confirm(`Remove ${domain} from blocked list?`)) return;

  try {
    const response = await fetch(FIREBASE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        action: "remove-domain",
        domain
      })
    });

    if (response.ok) {
      showStatus(`Removed ${domain}`, domainStatus);
      loadBlockedDomains();
    } else {
      showStatus("Failed to remove domain", domainStatus);
    }
  } catch (error) {
    showStatus("Error: " + error.message, domainStatus);
  }
}

initAuth();
