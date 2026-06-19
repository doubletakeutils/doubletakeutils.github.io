(function () {
  const ENDPOINT = "https://waspflow-payments.doubletakeutils.workers.dev/metrics/event";
  const body = document.body;
  if (!body) return;

  const pageName = body.dataset.metricsPage || location.pathname.replace(/^\/+|\/+$/g, "") || "home";
  const sendViewContent = body.dataset.metricsContent === "true";
  const basePayload = () => ({
    page_name: pageName,
    page_path: location.pathname || "/",
    page_url: location.href,
    page_title: document.title || "",
    referrer: document.referrer || "",
  });

  function uuid() {
    if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function emit(eventName, extra = {}) {
    const payload = {
      event_name: eventName,
      event_id: uuid(),
      event_time: new Date().toISOString(),
      ...basePayload(),
      ...extra,
    };
    const raw = JSON.stringify(payload);
    const blob = new Blob([raw], { type: "text/plain;charset=UTF-8" });
    if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) return;
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: raw,
      keepalive: true,
      mode: "cors",
    }).catch(() => {});
  }

  function trackElementClick(target) {
    if (!target || !target.matches || !target.matches("[data-metrics-event]")) return;
    const eventName = target.dataset.metricsEvent;
    if (!eventName) return;
    emit(eventName, {
      target_name: target.dataset.metricsTarget || target.dataset.metricsName || target.getAttribute("href") || target.textContent.trim().slice(0, 80),
      product: target.dataset.metricsProduct || "",
      target_url: target.getAttribute("href") || "",
    });
  }

  function onReady() {
    emit("page_view");
    if (sendViewContent) emit("view_content");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
  } else {
    onReady();
  }

  document.addEventListener(
    "click",
    (ev) => {
      const target = ev.target instanceof Element ? ev.target.closest("[data-metrics-event]") : null;
      trackElementClick(target);
    },
    { capture: true }
  );

  window.DoubleTakeMetrics = {
    emit,
  };
})();
