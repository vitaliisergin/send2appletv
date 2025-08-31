chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "SEND_TO_ATV") return;

  (async () => {
    try {
      const { haBaseUrl, haToken, entityId } = await chrome.storage.sync.get(["haBaseUrl","haToken","entityId"]);

      // Check if Apple TV is powered on
      const stateRes = await fetch(`${haBaseUrl.replace(/\/+$/,"")}/api/states/${entityId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${haToken}`,
          "Content-Type": "application/json"
        }
      });

      if (stateRes.ok) {
        const state = await stateRes.json();
        if (state.state === "off" || state.state === "standby") {
          // Turn on Apple TV
          await fetch(`${haBaseUrl.replace(/\/+$/,"")}/api/services/media_player/turn_on`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${haToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ entity_id: entityId })
          });

          // Wait for Apple TV to turn on
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      const body = {
        entity_id: entityId,
        media_content_type: "url",
        media_content_id: "youtube://" + msg.url
      };

      const res = await fetch(`${haBaseUrl.replace(/\/+$/,"")}/api/services/media_player/play_media`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${haToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      sendResponse({ ok: res.ok, status: res.status });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();

  return true; // async
});

function cleanYouTubeUrl(u) {
  let url = new URL(u);

  if (url.hostname === "youtu.be") {
    const id = url.pathname.slice(1);
    url = new URL("https://www.youtube.com/watch");
    if (id) url.searchParams.set("v", id);
  }

  if (url.hostname.endsWith("youtube.com") && url.pathname.startsWith("/shorts/")) {
    const id = url.pathname.split("/")[2] || url.pathname.split("/")[1];
    url = new URL("https://www.youtube.com/watch");
    if (id) url.searchParams.set("v", id);
  }

  [
    "si", "pp", "feature", "embeds_euri",
    "utm_source", "utm_medium", "utm_campaign", "redir_token"
  ].forEach(p => url.searchParams.delete(p));

  return url.toString();
}