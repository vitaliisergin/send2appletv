function $(id) { return document.getElementById(id); }

async function load() {
  const vals = await chrome.storage.sync.get(["haBaseUrl", "haToken", "entityId"]);
  ["haBaseUrl","haToken","entityId"].forEach(k => { if (vals[k]) $(k).value = vals[k]; });
}

async function save() {
  const haBaseUrl = $("haBaseUrl").value.trim();
  const haToken = $("haToken").value.trim();
  const entityId = $("entityId").value.trim();
  await chrome.storage.sync.set({ haBaseUrl, haToken, entityId });
  $("status").textContent = "Saved ✓";
  setTimeout(() => $("status").textContent = "", 1500);
}

document.addEventListener("DOMContentLoaded", () => {
  load().catch(console.error);
  $("save").addEventListener("click", () => { save().catch(console.error); });
});
