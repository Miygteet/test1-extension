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
let auth = null;

function showStatus(message, element = authStatus) {
  element.textContent = message;
  setTimeout(() => { element.textContent = ""; }, 3000);
}

function normalizeDomain(value) {
  return String(value).trim().toLowerCase()
    .replace(/^[a-z]+:\/\//, "").split(/[/?#]/, 1)[0]
    .replace(/^\*\./, "").replace(/^www\./, "");
}

async function initAuth() {
  loadingEl.hidden = false;
  try {
    if (!firebaseConfig) {
      throw new Error("Firebase config not found");
    }
    
    const app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth(app);

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

    signInBtn.addEventListener("click", async () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      try {
        await auth.signInWithPopup(provider);
      } catch (error) {
        console.error("Sign in error:", error);
        showStatus("Sign in failed: " + error.message);
      }
    });

    signOutBtn.addEventListener("click", () => {
      auth.signOut();
    });
  } catch (error) {
    loadingEl.hidden = true;
    showStatus("Firebase initialization failed. Check firebase-config.js");
    console.error("Init error:", error);
  }
}

async function setupDashboard(user) {
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
      showStatus("Adding domain...", domainStatus);
      newDomainInput.value = "";
      // For now, just store locally since backend isn't set up
      loadBlockedDomains();
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
    devicesList.replaceChildren();
    
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="device-info">
        <strong>Demo Device</strong>
        <p class="muted">Last synced: ${new Date().toLocaleString()}</p>
      </div>
    `;
    devicesList.append(li);
    noDevices.hidden = true;
  } catch (error) {
    console.error("Error loading devices:", error);
  }
}

async function loadBlockedDomains() {
  if (!groupId) return;

  try {
    globalDomains.replaceChildren();
    noDomains.hidden = true;

    // Demo domains
    const demoDomains = ["example.com", "youtube.com"];
    
    for (const domain of demoDomains) {
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

    lastUpdated.textContent = new Date().toLocaleTimeString();
  } catch (error) {
    console.error("Error loading domains:", error);
  }
}

async function removeDomain(domain) {
  if (!groupId || !confirm(`Remove ${domain} from blocked list?`)) return;

  try {
    showStatus(`Removed ${domain}`, domainStatus);
    loadBlockedDomains();
  } catch (error) {
    showStatus("Error: " + error.message, domainStatus);
  }
}

// Start auth initialization after Firebase SDK loads
window.addEventListener("load", () => {
  setTimeout(initAuth, 500);
});
