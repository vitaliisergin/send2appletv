const BTN_ID = "send-to-atv-btn";
let lastHref = "";

init();

function init() {
  checkAndInject();
  
  document.addEventListener("yt-navigate-finish", () => {
    setTimeout(checkAndInject, 500);
  });
}

function checkAndInject() {
  if (lastHref !== location.href) {
    lastHref = location.href;
    document.getElementById(BTN_ID)?.remove();
  }
  
  if (/^\/watch(\?|$)/.test(location.pathname)) injectIntoWatch();
  else if (/^\/shorts\//.test(location.pathname)) injectIntoShorts();
}


async function injectIntoWatch() {
  if (document.getElementById(BTN_ID)) return;
  
  try {
    const container = await waitFor(() => 
      document.querySelector("ytd-menu-renderer #top-level-buttons-computed")
    );
    
    if (!container) return;

    const shareBtn = findShareRenderer(container);
    const tpl =
      shareBtn?.querySelector("a,button") ||
      container.querySelector("ytd-button-renderer a, ytd-button-renderer button") ||
      container.querySelector("button");

    const btn = buildCleanChip(tpl);
    if (!btn) return;

    if (shareBtn) container.insertBefore(btn, shareBtn.nextSibling);
    else container.appendChild(btn);

    alignSpacing(container, btn, shareBtn || container.querySelector("ytd-button-renderer"));

  } catch (error) {
    console.log('[Send2ATV] Injection failed:', error);
  }
}

async function injectIntoShorts() {
  try {
    const container = await waitFor(() =>
      document.querySelector("ytd-reel-video-renderer #actions") || document.querySelector("#actions")
    );
    if (!container || container.querySelector(`#${BTN_ID}`)) return;

    const tpl =
      container.querySelector("ytd-button-renderer a, ytd-button-renderer button") ||
      container.querySelector("button");

    const btn = buildCleanChip(tpl, /*compact*/ true);
    if (!btn) return;

    container.appendChild(btn);
    alignSpacing(container, btn, container.querySelector("ytd-button-renderer"));

    observeContainer(container, () => !document.getElementById(BTN_ID) && injectIntoShorts());
  } catch {}
}

function buildCleanChip(templateClickable, compact = false) {
  const renderer = templateClickable?.closest?.("ytd-button-renderer") || templateClickable?.closest?.("button");
  if (!renderer) return null;

  const clone = renderer.cloneNode(true);
  clone.id = BTN_ID;

  const action = clone.querySelector("a,button") || clone;

  normalizeYtButtonClasses(action);
  normalizeYtButtonClasses(clone);

  for (const sel of [
    ".yt-spec-button-shape-next__icon",
    ".yt-spec-button-shape-next__button-icon",
    "#button-shape-icon",
    "yt-icon",
    "tp-yt-iron-icon",
    "yt-touch-feedback-shape"
  ]) clone.querySelectorAll(sel).forEach(n => n.remove());

  action.removeAttribute("href");
  action.removeAttribute("target");
  action.removeAttribute("aria-pressed");
  for (const a of ["menu-ui","toggled","is-icon-button","is-paper-button","has-icon"]) {
    clone.removeAttribute(a);
    action.removeAttribute(a);
  }

  const label =
    clone.querySelector(".yt-spec-button-shape-next__button-text-content, yt-formatted-string") || clone;
  label.textContent = "Send to Apple TV";
  label.style.margin = "0";
  label.style.whiteSpace = "nowrap";
  label.style.overflow = "visible";

  normalizeChipLayout(clone, action, compact);

  action.addEventListener("click", async (e) => {
    e.preventDefault();
    action.setAttribute("disabled", "true");
    const cleaned = cleanYouTubeUrl(location.href);
    const ok = await sendToBackground(cleaned);
    flashLabel(label, ok ? "✓ Sent" : "Error");
    action.removeAttribute("disabled");
  }, { capture: true });

  return clone;
}

function normalizeChipLayout(renderer, action, compact) {
  renderer.style.flex = "0 0 auto";
  renderer.style.overflow = "visible";
  renderer.style.minWidth = "fit-content";
  renderer.style.boxSizing = "border-box";

  action.style.display = "inline-flex";
  action.style.alignItems = "center";
  action.style.justifyContent = "center";
  action.style.whiteSpace = "nowrap";
  action.style.overflow = "visible";
  action.style.maxWidth = "none";
  action.style.minWidth = "fit-content";
  action.style.boxSizing = "border-box";

  const padX = compact ? 10 : 12;
  action.style.paddingLeft = padX + "px";
  action.style.paddingRight = padX + "px";

  renderer.style.margin = "0";
  action.style.margin = "0";
}

function normalizeYtButtonClasses(el) {
  if (!el) return;
  const cls = (el.className || "").split(/\s+/).filter(Boolean);
  const filtered = cls.filter(c =>
    !/^yt-spec-button-shape-next--segmented-/.test(c) &&
    !/--icon-button$/.test(c) &&
    !/--icon-leading(?:-trailing)?$/.test(c)
  );
  el.className = Array.from(new Set(filtered)).join(" ");
}

function alignSpacing(container, btnRenderer, refRenderer) {
  try {
    const csContainer = getComputedStyle(container);
    const hasGap = (parseFloat(csContainer.gap) || parseFloat(csContainer.columnGap) || 0) > 0;
    if (hasGap) {
      btnRenderer.style.marginInlineStart = "0";
      btnRenderer.style.marginInlineEnd = "0";
      return;
    }
    const ref = refRenderer || btnRenderer.previousElementSibling || btnRenderer.nextElementSibling;
    const cs = ref ? getComputedStyle(ref) : null;
    let start = (cs && (cs.marginInlineStart || cs.marginLeft)) || "8px";
    let end   = (cs && (cs.marginInlineEnd   || cs.marginRight)) || "8px";
    btnRenderer.style.marginInlineStart = start;
    btnRenderer.style.marginInlineEnd   = end;
  } catch {}
}

function findShareRenderer(container) {
  const candidates = Array.from(container.querySelectorAll("ytd-button-renderer"));
  return candidates.find(el => {
    const a = el.querySelector("a,button");
    const al = (a?.getAttribute("aria-label") || "").toLowerCase();
    return al.includes("share");
  }) || null;
}

function sendToBackground(url) {
  return new Promise(resolve => {
    if (!chrome?.runtime?.sendMessage || !chrome?.runtime?.id) {
      resolve(false);
      return;
    }
    try {
      chrome.runtime.sendMessage({ type: "SEND_TO_ATV", url }, resp => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        resolve(Boolean(resp && resp.ok));
      });
    } catch (e) {
      resolve(false);
    }
  });
}

function flashLabel(labelEl, text) {
  const old = labelEl.textContent;
  labelEl.textContent = text;
  setTimeout(() => (labelEl.textContent = old), 1200);
}

function waitFor(getter, timeoutMs = 5000, intervalMs = 100) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    (function tick() {
      const el = getter();
      if (el) return resolve(el);
      if (Date.now() - t0 > timeoutMs) return reject(new Error("timeout"));
      setTimeout(tick, intervalMs);
    })();
  });
}


function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function cleanYouTubeUrl(u) {
  let url = new URL(u);

  if (url.hostname === "youtu.be") {
    const id = url.pathname.slice(1);
    url = new URL("https://www.youtube.com/watch");
    if (id) url.searchParams.set("v", id);
  }

  if (url.hostname.endsWith("youtube.com") && url.pathname.startsWith("/shorts/")) {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[1] || parts[0];
    url = new URL("https://www.youtube.com/watch");
    if (id) url.searchParams.set("v", id);
  }

  return url.toString();
}
