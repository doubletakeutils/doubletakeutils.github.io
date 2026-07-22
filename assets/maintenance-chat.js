(() => {
  const config = window.MAINTENANCE_CHAT || {};
  const supportEmail = config.email || "support@doubletake.sbs";
  const productName = config.product || document.title || "DoubleTake Utilities";
  const issueTypes = config.issueTypes || [
    "Broken link",
    "Download problem",
    "Page looks wrong",
    "Billing or license",
  ];

  const wrapper = document.createElement("aside");
  wrapper.className = "maintenance-chat";
  wrapper.setAttribute("aria-label", "Website maintenance chat");
  wrapper.innerHTML = `
    <button class="maintenance-chat__toggle" type="button" aria-expanded="false">
      <span class="maintenance-chat__icon" aria-hidden="true">?</span>
      <span>Site help</span>
    </button>
    <section class="maintenance-chat__panel" aria-hidden="true">
      <div class="maintenance-chat__header">
        <div>
          <h2 class="maintenance-chat__title">Website maintenance chat</h2>
          <p class="maintenance-chat__status">Send a page issue to support with useful diagnostics attached.</p>
        </div>
        <button class="maintenance-chat__close" type="button" aria-label="Close maintenance chat">&times;</button>
      </div>
      <form class="maintenance-chat__body">
        <div class="maintenance-chat__bubble">What needs attention on this page?</div>
        <div class="maintenance-chat__chips" aria-label="Issue type"></div>
        <label>
          Your email
          <input name="replyTo" type="email" autocomplete="email" placeholder="you@example.com" />
        </label>
        <label>
          Message
          <textarea name="message" required placeholder="Tell us what happened, what you clicked, or what looks wrong."></textarea>
        </label>
        <div class="maintenance-chat__actions">
          <button class="maintenance-chat__send" type="submit">Send report</button>
          <button class="maintenance-chat__copy" type="button">Copy details</button>
        </div>
        <div class="maintenance-chat__note" role="status" aria-live="polite"></div>
      </form>
    </section>
  `;

  document.body.appendChild(wrapper);

  const toggle = wrapper.querySelector(".maintenance-chat__toggle");
  const close = wrapper.querySelector(".maintenance-chat__close");
  const panel = wrapper.querySelector(".maintenance-chat__panel");
  const form = wrapper.querySelector("form");
  const chips = wrapper.querySelector(".maintenance-chat__chips");
  const note = wrapper.querySelector(".maintenance-chat__note");
  const copy = wrapper.querySelector(".maintenance-chat__copy");
  let selectedType = issueTypes[0] || "Website issue";

  issueTypes.forEach((type, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "maintenance-chat__chip";
    button.textContent = type;
    button.setAttribute("aria-pressed", String(index === 0));
    if (index === 0) button.classList.add("is-active");
    button.addEventListener("click", () => {
      selectedType = type;
      chips.querySelectorAll("button").forEach((chip) => {
        const isActive = chip === button;
        chip.classList.toggle("is-active", isActive);
        chip.setAttribute("aria-pressed", String(isActive));
      });
    });
    chips.appendChild(button);
  });

  function setOpen(isOpen) {
    wrapper.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    panel.setAttribute("aria-hidden", String(!isOpen));
    if (isOpen) form.message.focus();
  }

  function buildReport() {
    const data = new FormData(form);
    const replyTo = String(data.get("replyTo") || "").trim();
    const message = String(data.get("message") || "").trim();
    const lines = [
      `Product: ${productName}`,
      `Issue type: ${selectedType}`,
      `Page: ${window.location.href}`,
      `Title: ${document.title}`,
      `Time: ${new Date().toISOString()}`,
      `Browser: ${navigator.userAgent}`,
      replyTo ? `Reply to: ${replyTo}` : "",
      "",
      "Message:",
      message,
    ].filter((line, index, all) => line || all[index - 1] !== "");

    return {
      subject: `[Website maintenance] ${selectedType} - ${productName}`,
      body: lines.join("\n"),
    };
  }

  toggle.addEventListener("click", () => setOpen(!wrapper.classList.contains("is-open")));
  close.addEventListener("click", () => setOpen(false));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const report = buildReport();
    if (!form.reportValidity()) return;
    const mailto = `mailto:${supportEmail}?subject=${encodeURIComponent(report.subject)}&body=${encodeURIComponent(report.body)}`;
    window.location.href = mailto;
    note.textContent = "Opening your email app with the report ready to send.";
  });

  copy.addEventListener("click", async () => {
    const report = buildReport();
    const text = `${report.subject}\n\n${report.body}`;
    try {
      await navigator.clipboard.writeText(text);
      note.textContent = "Report details copied.";
    } catch {
      form.message.value = `${form.message.value.trim()}\n\n${report.body}`.trim();
      note.textContent = "Clipboard was unavailable, so the details were added to the message.";
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
})();
