/* AiroQue Engineering Solutions — v2 */
(function () {
  "use strict";

  var burger = document.querySelector(".burger");
  var nav = document.getElementById("nav");

  function setNavTop() {
    var mast = document.querySelector(".masthead");
    if (mast) document.documentElement.style.setProperty("--navtop", Math.round(mast.getBoundingClientRect().bottom) + "px");
  }
  setNavTop();
  window.addEventListener("resize", setNavTop);
  window.addEventListener("scroll", setNavTop, { passive: true });

  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
      burger.textContent = open ? "Close" : "Menu";
      setNavTop();
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a") && window.innerWidth <= 920) {
        nav.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
        burger.textContent = "Menu";
      }
    });
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = document.querySelectorAll(".rv");
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("on"); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  }

  function wireFormspreeForm(formId, statusId, opts) {
    var form = document.getElementById(formId);
    if (!form) return;
    var status = document.getElementById(statusId);
    var submitBtn = form.querySelector('button[type="submit"]');
    var GENERIC_ERROR = opts.genericError;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var endpoint = form.getAttribute("data-endpoint");
      if (!endpoint) {
        status.setAttribute("data-state", "error");
        status.textContent = "This form is not connected yet. Add your form-handling endpoint to data-endpoint on #" + formId + ", or send the details to the email address listed on this page.";
        status.focus();
        return;
      }
      status.removeAttribute("data-state");
      status.textContent = opts.sendingMessage;
      if (submitBtn) submitBtn.disabled = true;

      fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) {
          // Formspree returns JSON on both success and failure; read it either way
          // so validation errors ("email is required", etc.) can be shown specifically.
          return r.json().catch(function () { return null; }).then(function (data) {
            return { ok: r.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok) {
            form.reset();
            status.setAttribute("data-state", "ok");
            status.textContent = opts.successMessage;
            return;
          }
          var errors = result.data && Array.isArray(result.data.errors) ? result.data.errors : null;
          var msg = GENERIC_ERROR;
          if (errors && errors.length) {
            msg = errors.map(function (er) {
              return er.field ? (er.field + ": " + er.message) : er.message;
            }).join(" ");
          }
          status.setAttribute("data-state", "error");
          status.textContent = msg;
        })
        .catch(function () {
          status.setAttribute("data-state", "error");
          status.textContent = GENERIC_ERROR;
        })
        .then(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  wireFormspreeForm("quote-form", "status", {
    sendingMessage: "Sending your project details\u2026",
    successMessage: "Request received. AiroQue will respond with scope, price and schedule, and can issue an NDA before any technical data is exchanged.",
    genericError: "The request did not go through. Try again, or send your project details to the email address listed on this page."
  });

  wireFormspreeForm("support-form", "support-status", {
    sendingMessage: "Sending your message\u2026",
    successMessage: "Message received. AiroQue customer support will get back to you directly.",
    genericError: "The message did not go through. Try again, or email customer support directly at the address listed on this page."
  });

  /* ---------- site-wide chat assistant (injected) ---------- */
  (function initAiroQueChat() {
    if (document.getElementById("aq-chat-root")) return;

    var FORMSPREE = "https://formspree.io/f/mnpqddwg";
    var SUPPORT_EMAIL = "customer.support@airoque.com";
    var SUPPORT_TEL = "(805) 501-1013";

    var FAQ = {
      "Control Plans": {
        html:
          "<p><strong>Control Plans</strong> document how critical characteristics are controlled across manufacturing operations — methods, frequencies, equipment, and reaction plans.</p>" +
          "<p>Starting rates: from <strong>$750</strong> for a new aerospace Control Plan; complex plans from <strong>$1,500</strong>. Final price depends on characteristic count, operations, and customer formats.</p>" +
          "<p>See <a href=\"/control-plans\">Control Plans</a> or <a href=\"/control-plan-examples\">example Control Plans</a>.</p>"
      },
      "PFMEA": {
        html:
          "<p><strong>PFMEA</strong> (Process FMEA) identifies failure modes, effects, causes, and prevention/detection controls for your process.</p>" +
          "<p>Starting rates: new PFMEA from <strong>$1,500</strong>; revisions from <strong>$750</strong>. PFMEA + Control Plan alignment reviews start at <strong>$1,000</strong>.</p>" +
          "<p>More on <a href=\"/pfmea\">PFMEA development</a> and <a href=\"/pfmea-control-plan-alignment\">alignment</a>.</p>"
      },
      "APQP": {
        html:
          "<p><strong>APQP documentation</strong> packages coordinate Process Flow, PFMEA, Control Plan, and production-readiness documents so they agree before first article.</p>" +
          "<p>Coordinated APQP packages start at <strong>$3,500</strong>. Individual Process Flows start at <strong>$500</strong>.</p>" +
          "<p>Details: <a href=\"/apqp-documentation\">APQP Documentation</a> and <a href=\"/production-readiness\">Production Readiness</a>.</p>"
      },
      "Pricing": {
        html:
          "<p>Published starting rates (fixed quotes after scope review):</p>" +
          "<p>Control Plan from $750 · PFMEA from $1,500 · Alignment from $1,000 · APQP package from $3,500 · Inspection plan from $750 · Work instructions from $500 · Monthly QE support from <strong>$2,500/month</strong>.</p>" +
          "<p>Full table: <a href=\"/pricing\">Pricing</a>. Or leave a message below for a confidential project review — NDA available on request.</p>"
      },
      "Talk to a human": {
        html:
          "<p>Happy to connect you with the AiroQue team.</p>" +
          "<p>Call <a href=\"tel:+18055011013\">" + SUPPORT_TEL + "</a> or email <a href=\"mailto:" + SUPPORT_EMAIL + "\">" + SUPPORT_EMAIL + "</a> (Mon–Fri, 8:00 AM–5:00 PM Pacific).</p>" +
          "<p>You can also leave your name, email, company, and a short message below — we typically respond within one business day.</p>",
        showLead: true
      }
    };

    var CHIP_KEYS = ["Control Plans", "PFMEA", "APQP", "Pricing", "Talk to a human"];

    var root = document.createElement("div");
    root.id = "aq-chat-root";
    root.className = "aq-chat-root";
    root.innerHTML =
      '<button type="button" class="aq-chat-bubble" id="aq-chat-toggle" aria-expanded="false" aria-controls="aq-chat-panel" aria-label="Open AiroQue chat assistant">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2 4v2h12V8H6zm0 4v2h8v-2H6z"/></svg>' +
      "</button>" +
      '<div class="aq-chat-panel" id="aq-chat-panel" role="dialog" aria-modal="true" aria-labelledby="aq-chat-title" hidden>' +
      '<div class="aq-chat-head">' +
      '<div class="aq-chat-mark" aria-hidden="true">AQ</div>' +
      "<div><strong id=\"aq-chat-title\">AiroQue Assistant</strong><span>Aerospace quality · APQP</span></div>" +
      '<button type="button" class="aq-chat-close" id="aq-chat-close" aria-label="Close chat">&times;</button>' +
      "</div>" +
      '<div class="aq-chat-body" id="aq-chat-body" aria-live="polite"></div>' +
      '<div class="aq-chat-foot" id="aq-chat-foot">' +
      '<form class="aq-chat-lead-form" id="aq-chat-lead" novalidate data-endpoint="' + FORMSPREE + '" style="display:none">' +
      '<input type="hidden" name="_subject" value="Chat lead — AiroQue website">' +
      '<input type="hidden" name="source" value="site-chat">' +
      '<div><label for="aq-chat-name">Name <span class="req">*</span></label><input id="aq-chat-name" name="name" type="text" autocomplete="name" required></div>' +
      '<div><label for="aq-chat-email">Email <span class="req">*</span></label><input id="aq-chat-email" name="email" type="email" autocomplete="email" required></div>' +
      '<div><label for="aq-chat-company">Company</label><input id="aq-chat-company" name="company" type="text" autocomplete="organization"></div>' +
      '<div><label for="aq-chat-message">Message <span class="req">*</span></label><textarea id="aq-chat-message" name="message" rows="3" required placeholder="Part, process, or question — no export-controlled data."></textarea></div>' +
      '<div class="aq-chat-lead-actions">' +
      '<button class="btn btn--primary" type="submit">Send to AiroQue</button>' +
      '<button class="btn btn--outline" type="button" id="aq-chat-hide-lead">Hide form</button>' +
      "</div>" +
      '<div class="aq-chat-status" id="aq-chat-status" role="status" tabindex="-1"></div>' +
      '<p class="aq-chat-note">Submitted via the same secure form channel as Contact. Or email ' + SUPPORT_EMAIL + '.</p>' +
      "</form>" +
      '<div id="aq-chat-foot-hint"><button type="button" class="btn btn--outline btn--sm" id="aq-chat-show-lead">Leave a message for follow-up</button>' +
      '<p class="aq-chat-note">' + SUPPORT_TEL + ' · ' + SUPPORT_EMAIL + '</p></div>' +
      "</div></div>";

    document.body.appendChild(root);

    var toggle = document.getElementById("aq-chat-toggle");
    var panel = document.getElementById("aq-chat-panel");
    var closeBtn = document.getElementById("aq-chat-close");
    var body = document.getElementById("aq-chat-body");
    var leadForm = document.getElementById("aq-chat-lead");
    var showLeadBtn = document.getElementById("aq-chat-show-lead");
    var hideLeadBtn = document.getElementById("aq-chat-hide-lead");
    var footHint = document.getElementById("aq-chat-foot-hint");
    var statusEl = document.getElementById("aq-chat-status");
    var lastFocus = null;

    function addMsg(html, who) {
      var el = document.createElement("div");
      el.className = "aq-chat-msg aq-chat-msg--" + who;
      el.innerHTML = html;
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    }

    function addChips() {
      var wrap = document.createElement("div");
      wrap.className = "aq-chat-chips";
      wrap.setAttribute("role", "group");
      wrap.setAttribute("aria-label", "Quick topics");
      CHIP_KEYS.forEach(function (key) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "aq-chat-chip";
        b.textContent = key;
        b.addEventListener("click", function () { handleChip(key); });
        wrap.appendChild(b);
      });
      body.appendChild(wrap);
      body.scrollTop = body.scrollHeight;
    }

    function setLeadVisible(on) {
      leadForm.style.display = on ? "grid" : "none";
      footHint.style.display = on ? "none" : "block";
      if (on) {
        var n = document.getElementById("aq-chat-name");
        if (n) n.focus();
      }
    }

    function handleChip(key) {
      addMsg("<p>" + key + "</p>", "user");
      var entry = FAQ[key];
      if (!entry) return;
      addMsg(entry.html, "bot");
      if (entry.showLead) setLeadVisible(true);
      addChips();
    }

    function openPanel() {
      lastFocus = document.activeElement;
      panel.hidden = false;
      panel.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close AiroQue chat assistant");
      closeBtn.focus();
    }

    function closePanel() {
      panel.classList.remove("is-open");
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open AiroQue chat assistant");
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
      else toggle.focus();
    }

    function isOpen() {
      return panel.classList.contains("is-open");
    }

    toggle.addEventListener("click", function () {
      if (isOpen()) closePanel();
      else openPanel();
    });
    closeBtn.addEventListener("click", closePanel);
    showLeadBtn.addEventListener("click", function () { setLeadVisible(true); });
    hideLeadBtn.addEventListener("click", function () { setLeadVisible(false); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) {
        e.preventDefault();
        closePanel();
      }
    });

    // Welcome
    addMsg(
      "<p>Welcome — I&rsquo;m the <strong>AiroQue assistant</strong>. Ask about Control Plans, PFMEA, APQP packages, pricing, or leave a message for a human follow-up.</p>" +
        "<p>Project information is treated as confidential. NDA available on request.</p>",
      "bot"
    );
    addChips();

    leadForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!leadForm.reportValidity()) return;
      var endpoint = leadForm.getAttribute("data-endpoint") || FORMSPREE;
      var submitBtn = leadForm.querySelector('button[type="submit"]');
      statusEl.removeAttribute("data-state");
      statusEl.textContent = "Sending your message\u2026";
      if (submitBtn) submitBtn.disabled = true;

      var fd = new FormData(leadForm);

      fetch(endpoint, { method: "POST", body: fd, headers: { Accept: "application/json" } })
        .then(function (r) {
          return r.json().catch(function () { return null; }).then(function (data) {
            return { ok: r.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok) {
            leadForm.reset();
            statusEl.setAttribute("data-state", "ok");
            statusEl.textContent = "Received. AiroQue will follow up — typically within one business day.";
            addMsg("<p>Thanks — your message was sent. The team will follow up shortly. You can also call " + SUPPORT_TEL + ".</p>", "bot");
            setLeadVisible(false);
            return;
          }
          var errors = result.data && Array.isArray(result.data.errors) ? result.data.errors : null;
          var msg = "The message did not go through. Try again, or use email below.";
          if (errors && errors.length) {
            msg = errors.map(function (er) {
              return er.field ? er.field + ": " + er.message : er.message;
            }).join(" ");
          }
          statusEl.setAttribute("data-state", "error");
          statusEl.textContent = msg;
          mailtoFallback(fd);
        })
        .catch(function () {
          statusEl.setAttribute("data-state", "error");
          statusEl.textContent = "Network issue. Opening your email client as a fallback\u2026";
          mailtoFallback(fd);
        })
        .then(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });

    function mailtoFallback(fd) {
      var name = (fd.get("name") || "").toString();
      var email = (fd.get("email") || "").toString();
      var company = (fd.get("company") || "").toString();
      var message = (fd.get("message") || "").toString();
      var subject = encodeURIComponent("Chat lead — AiroQue website");
      var bodyTxt = encodeURIComponent(
        "Name: " + name + "\nEmail: " + email + "\nCompany: " + company + "\n\nMessage:\n" + message + "\n"
      );
      window.location.href = "mailto:" + SUPPORT_EMAIL + "?subject=" + subject + "&body=" + bodyTxt;
    }
  })();
})();

