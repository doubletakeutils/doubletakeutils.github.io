(function () {
  const ENDPOINT = "https://api.doubletake.sbs/metrics/event";
  const body = document.body;
  if (!body) return;

  const pageName = body.dataset.metricsPage || location.pathname.replace(/^\/+|\/+$/g, "") || "home";
  const siteId = body.dataset.metricsSite || "doubletake";
  const sendViewContent = body.dataset.metricsContent === "true";
  const currentPath = location.pathname || "/";
  const currentUrl = location.href;
  const SESSION_ID_KEY = "doubletake-site-session-id-v1";
  const SESSION_FIRST_PAGE_KEY = "doubletake-site-session-first-page-v1";
  const SESSION_LAST_PAGE_KEY = "doubletake-site-session-last-page-v1";
  const SESSION_PAGE_INDEX_KEY = "doubletake-site-session-page-index-v1";
  const VISITOR_ID_KEY = "doubletake-site-visitor-id-v1";
  const SCROLL_KEY_PREFIX = "doubletake-site-scroll-reported-v1:";
  const scrollThresholds = [25, 50, 75, 90];

  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = (crypto && typeof crypto.randomUUID === "function")
      ? crypto.randomUUID()
      : `sid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }

  let visitorId = "";
  try {
    visitorId = localStorage.getItem(VISITOR_ID_KEY) || "";
    if (!visitorId) {
      visitorId = (crypto && typeof crypto.randomUUID === "function")
        ? crypto.randomUUID()
        : `vid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
  } catch {
    visitorId = `vid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  let sessionFirstPage = sessionStorage.getItem(SESSION_FIRST_PAGE_KEY);
  if (!sessionFirstPage) {
    sessionFirstPage = currentPath;
    sessionStorage.setItem(SESSION_FIRST_PAGE_KEY, sessionFirstPage);
  }

  const previousPage = sessionStorage.getItem(SESSION_LAST_PAGE_KEY) || "";
  sessionStorage.setItem(SESSION_LAST_PAGE_KEY, currentPath);

  const sessionPageIndex = (Number(sessionStorage.getItem(SESSION_PAGE_INDEX_KEY) || 0) || 0) + 1;
  sessionStorage.setItem(SESSION_PAGE_INDEX_KEY, String(sessionPageIndex));

  const reportedScroll = new Set();
  const startedAt = Date.now();
  let maxScrollDepth = 0;
  let clickCount = 0;
  let engagementSent = false;

  function getClientContext() {
    const ua = navigator.userAgent || "";
    const data = navigator.userAgentData || null;
    const brands = data && Array.isArray(data.brands) ? data.brands.map((b) => b.brand).filter(Boolean) : [];
    const platform = data && data.platform ? String(data.platform) : "";
    const mobile = data && typeof data.mobile === "boolean" ? data.mobile : /Mobi|Android/i.test(ua);
    let browser = "";
    if (brands.length) {
      browser = brands.join(" ");
    } else if (/Edg\//i.test(ua)) {
      browser = "Edge";
    } else if (/Chrome\//i.test(ua)) {
      browser = "Chrome";
    } else if (/Firefox\//i.test(ua)) {
      browser = "Firefox";
    } else if (/Safari\//i.test(ua)) {
      browser = "Safari";
    } else {
      browser = "Unknown";
    }
    let os = "";
    if (platform) {
      os = platform;
    } else if (/Windows NT/i.test(ua)) {
      os = "Windows";
    } else if (/Mac OS X/i.test(ua)) {
      os = "macOS";
    } else if (/Android/i.test(ua)) {
      os = "Android";
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      os = "iOS";
    } else {
      os = "Unknown";
    }
    return {
      client_browser: browser,
      client_os: os,
      client_device: mobile ? "mobile" : "desktop",
      client_language: navigator.language || "",
      client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      screen_width: window.screen ? window.screen.width : 0,
      screen_height: window.screen ? window.screen.height : 0,
    };
  }

  const basePayload = () => ({
    page_name: pageName,
    site_id: siteId,
    page_path: currentPath,
    page_url: currentUrl,
    page_title: document.title || "",
    referrer: document.referrer || "",
    visitor_id: visitorId,
    session_id: sessionId,
    session_first_page: sessionFirstPage,
    session_page_index: sessionPageIndex,
    previous_page: previousPage,
    ...getClientContext(),
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

  function getScrollDepth() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight || 0);
    const viewport = window.innerHeight || document.documentElement.clientHeight || 0;
    const maxScroll = Math.max(scrollHeight - viewport, 0);
    if (maxScroll <= 0) return 100;
    const depth = Math.round((scrollTop / maxScroll) * 100);
    return Math.max(0, Math.min(100, depth));
  }

  function emitScrollDepth() {
    const depth = getScrollDepth();
    if (depth > maxScrollDepth) maxScrollDepth = depth;
    for (const threshold of scrollThresholds) {
      if (depth >= threshold && !reportedScroll.has(threshold)) {
        reportedScroll.add(threshold);
        emit("scroll_depth", {
          scroll_depth: threshold,
          max_scroll_depth: maxScrollDepth,
        });
      }
    }
  }

  function sendEngagement() {
    if (engagementSent) return;
    engagementSent = true;
    emit("page_engagement", {
      duration_ms: Math.max(0, Date.now() - startedAt),
      click_count: clickCount,
      max_scroll_depth: maxScrollDepth,
    });
  }

  function handleTaggedClick(target) {
    const eventName = target.dataset.metricsEvent;
    if (!eventName) return false;
    emit(eventName, {
      target_name: target.dataset.metricsTarget || target.dataset.metricsName || target.getAttribute("href") || target.textContent.trim().slice(0, 80),
      product: target.dataset.metricsProduct || "",
      target_url: target.getAttribute("href") || "",
      installer_type: target.dataset.metricsInstaller || "",
      download_kind: target.dataset.metricsDownloadKind || "",
      version: target.dataset.metricsVersion || "",
    });
    return true;
  }

  function handleAnchorClick(target) {
    if (!target || !target.getAttribute) return false;
    const href = target.getAttribute("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return false;
    let resolved;
    try {
      resolved = new URL(href, currentUrl);
    } catch {
      return false;
    }
    const sameOrigin = resolved.origin === location.origin;
    const targetName = target.dataset.metricsTarget || target.dataset.metricsName || target.textContent.trim().slice(0, 80) || resolved.pathname;
    if (resolved.protocol === "tel:") {
      emit("phone_click", { target_name: targetName, target_url: resolved.href, link_kind: "phone" });
      return true;
    }
    if (resolved.protocol === "mailto:") {
      emit("email_click", { target_name: targetName, target_url: resolved.href, link_kind: "email" });
      return true;
    }
    emit(sameOrigin ? "internal_nav_click" : "external_link_click", {
      target_name: targetName,
      target_url: resolved.href,
      link_kind: sameOrigin ? "internal" : "external",
      session_id: sessionId,
      session_page_index: sessionPageIndex,
      previous_page: previousPage,
    });
    return true;
  }

  function onReady() {
    emit("page_view", {
      entry_page: sessionFirstPage,
    });
    if (sendViewContent) {
      emit("view_content", {
        entry_page: sessionFirstPage,
      });
    }
    emitScrollDepth();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
  } else {
    onReady();
  }

  document.addEventListener(
    "scroll",
    () => emitScrollDepth(),
    { passive: true }
  );
  window.addEventListener("resize", () => emitScrollDepth(), { passive: true });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "hidden") sendEngagement();
    }
  );
  window.addEventListener("pagehide", sendEngagement);
  window.addEventListener("beforeunload", sendEngagement);
  document.addEventListener(
    "click",
    (ev) => {
      const target = ev.target instanceof Element ? ev.target.closest("[data-metrics-event], a[href]") : null;
      if (!target) return;
      clickCount += 1;
      if (target.matches("[data-metrics-event]")) {
        if (handleTaggedClick(target)) return;
      }
      if (target.matches("a[href]")) {
        handleAnchorClick(target);
      }
    },
    { capture: true }
  );

  window.DoubleTakeMetrics = {
    emit,
  };
})();
