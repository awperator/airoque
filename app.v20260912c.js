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
    var CHAT_API = (typeof window.AIROQUE_CHAT_API === "string" && window.AIROQUE_CHAT_API) || "/.netlify/functions/chat";

    /* Published starting rates only — never invent prices or certifications. */
    var RATES = {
      controlPlan: { label: "Control Plan", from: "$750", complex: "$1,500", href: "/control-plans" },
      processFlow: { label: "Process Flow Diagram", from: "$500", href: "/process-flow-diagrams" },
      pfmea: { label: "PFMEA", from: "$1,500", rev: "$750", href: "/pfmea" },
      alignment: { label: "PFMEA / Control Plan alignment", from: "$1,000", href: "/pfmea-control-plan-alignment" },
      apqp: { label: "APQP package", from: "$3,500", href: "/apqp-documentation" },
      inspection: { label: "Inspection plan", from: "$750", href: "/inspection-plans" },
      workInstr: { label: "Work instructions", from: "$500", href: "/work-instructions" },
      engChange: { label: "Engineering change impact review", from: "$500", href: "/engineering-change-impact" },
      qms: { label: "Quality-system documentation", from: "$1,500", href: "/quality-system-documentation" },
      monthly: { label: "Monthly QE support", from: "$2,500/mo", href: "/pricing" }
    };

    var FAQ = {
      "Control Plans": {
        html:
          "<p><strong>Control Plans</strong> document how critical characteristics are controlled across manufacturing operations — methods, frequencies, equipment, and reaction plans.</p>" +
          "<p>Starting rates: from <strong>$750</strong> for a new aerospace Control Plan; complex plans from <strong>$1,500</strong>. Fixed quotes follow scope review.</p>" +
          "<p>See <a href=\"/control-plans\">Control Plans</a> or <a href=\"/control-plan-examples\">example Control Plans</a>.</p>"
      },
      "PFMEA": {
        html:
          "<p><strong>PFMEA</strong> (Process FMEA) identifies failure modes, effects, causes, and prevention/detection controls for your process.</p>" +
          "<p>Starting rates: new PFMEA from <strong>$1,500</strong>; revisions from <strong>$750</strong>. Alignment reviews start at <strong>$1,000</strong>.</p>" +
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
          "<p>Published <strong>starting rates</strong> (fixed quotes after scope review):</p>" +
          "<p>Control Plan from $750 (complex $1,500) · Process Flow $500 · PFMEA $1,500 (rev $750) · Alignment $1,000 · APQP package $3,500 · Inspection $750 · Work instructions $500 · Eng. change $500 · QMS docs $1,500 · Monthly from <strong>$2,500/mo</strong>.</p>" +
          "<p>Full table: <a href=\"/pricing\">Pricing</a>. Leave a message below for a confidential project review — NDA available on request.</p>"
      },
      "Talk to a human": {
        html:
          "<p>Happy to connect you with the AiroQue team.</p>" +
          "<p>Email <a href=\"mailto:" + SUPPORT_EMAIL + "\">" + SUPPORT_EMAIL + "</a> or leave your name, email, company, and a short message below — we typically respond within one business day.</p>" +
          "<p>Phone: <a href=\"tel:+18055011013\">" + SUPPORT_TEL + "</a> (Mon–Fri, 8:00 AM–5:00 PM Pacific).</p>",
        showLead: true
      },
      "QMS Pulse": {
        html:
          "<p><strong>AiroQue QMS Pulse</strong> is a SAP-only subscription that watches quality notifications, notifies owners of pending work, and shows backlog aging and cycle time. It is not documentation consulting.</p>" +
          "<p>Starting at <strong>$1,500 / month</strong>. Scales with plants and seats. SAP connect / setup quoted separately.</p>" +
          "<p>To run Pulse you provide: a <strong>dedicated machine</strong> (always-on host), a <strong>dedicated SAP user</strong> that can actively pull new QM12 quality-notification reports, and a <strong>directory of employees and emails</strong> so notices reach the right people.</p>" +
          "<p>Details: <a href=\"/qms-pulse\">QMS Pulse</a>.</p>"
      }
    };

    var CHIP_KEYS = ["Control Plans", "PFMEA", "APQP", "Pricing", "Talk to a human"];

    function esc(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function getSessionId() {
      try {
        var key = "aq_chat_sid";
        var id = localStorage.getItem(key);
        if (!id) {
          id = "aq_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
          localStorage.setItem(key, id);
        }
        return id;
      } catch (e) {
        return "aq_ephemeral_" + Date.now().toString(36);
      }
    }

    var sessionId = getSessionId();
    var history = [];

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
      '<form class="aq-chat-compose" id="aq-chat-compose" autocomplete="off">' +
      '<label class="visually-hidden" for="aq-chat-free">Message</label>' +
      '<input id="aq-chat-free" class="aq-chat-free" type="text" maxlength="1200" placeholder="Ask about services or pricing…" aria-label="Type a message">' +
      '<button type="submit" class="btn btn--primary aq-chat-send" id="aq-chat-send">Send</button>' +
      "</form>" +
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
      '<div id="aq-chat-foot-hint">' +
      '<button type="button" class="btn btn--outline btn--sm" id="aq-chat-show-lead">Leave a message for follow-up</button>' +
      '<p class="aq-chat-note">' + SUPPORT_TEL + ' · ' + SUPPORT_EMAIL + '</p></div>' +
      "</div></div>";

    document.body.appendChild(root);

    var toggle = document.getElementById("aq-chat-toggle");
    var panel = document.getElementById("aq-chat-panel");
    var closeBtn = document.getElementById("aq-chat-close");
    var body = document.getElementById("aq-chat-body");
    var leadForm = document.getElementById("aq-chat-lead");
    var composeForm = document.getElementById("aq-chat-compose");
    var freeInput = document.getElementById("aq-chat-free");
    var sendBtn = document.getElementById("aq-chat-send");
    var showLeadBtn = document.getElementById("aq-chat-show-lead");
    var hideLeadBtn = document.getElementById("aq-chat-hide-lead");
    var footHint = document.getElementById("aq-chat-foot-hint");
    var statusEl = document.getElementById("aq-chat-status");
    var lastFocus = null;
    var busy = false;

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
      composeForm.style.display = on ? "none" : "flex";
      footHint.style.display = on ? "none" : "block";
      if (on) {
        var n = document.getElementById("aq-chat-name");
        if (n) n.focus();
      } else if (freeInput) {
        freeInput.focus();
      }
    }

    function showTyping(on) {
      var existing = document.getElementById("aq-chat-typing");
      if (existing) existing.remove();
      if (!on) return;
      var el = document.createElement("div");
      el.id = "aq-chat-typing";
      el.className = "aq-chat-msg aq-chat-msg--bot aq-chat-typing";
      el.setAttribute("role", "status");
      el.innerHTML = "<p>AiroQue Assistant is preparing a reply…</p>";
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
    }

    function handleChip(key) {
      addMsg("<p>" + esc(key) + "</p>", "user");
      history.push({ role: "user", content: key });
      var entry = FAQ[key];
      if (!entry) return;
      addMsg(entry.html, "bot");
      history.push({ role: "assistant", content: entry.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() });
      if (entry.showLead) setLeadVisible(true);
      addChips();
    }

    /** Client-side grounded KB — works offline; does not claim live LLM. */
    function localGroundedReply(text) {
      var t = text.toLowerCase();
      var showLead = false;
      var html = "";

      function softPark(kind) {
        showLead = false;
        return (
          "<p>Thanks for reaching out. AiroQue focuses on <strong>aerospace manufacturing quality engineering</strong> for production suppliers and primes.</p>" +
          "<p>If you have an aerospace production-readiness or APQP documentation need, leave a short note via the form or email <a href=\"mailto:" + SUPPORT_EMAIL + "\">" + SUPPORT_EMAIL + "</a>. Otherwise, the public pages under <a href=\"/services\">Services</a> and <a href=\"/insights\">Insights</a> may still be useful.</p>"
        );
      }

      if (/\b(itar|ear|export[- ]?control|classified|cui|mil[- ]?spec\s+detail)\b/.test(t)) {
        html =
          "<p>Please do <strong>not</strong> share ITAR, EAR, or other export-controlled technical details in chat.</p>" +
          "<p>For a confidential project review we can put an NDA in place first — leave a non-technical summary via the form, or email <a href=\"mailto:" + SUPPORT_EMAIL + "\">" + SUPPORT_EMAIL + "</a>.</p>";
        showLead = true;
      } else if (/\b(student|homework|thesis|vendor\s+outreach|sales\s+pitch|cold\s+email|non[- ]?aero|automotive\s+only|medical\s+device\s+only)\b/.test(t) &&
                 !/\baerospace|as91|as9145|apqp|control\s*plan|pfmea\b/.test(t)) {
        html = softPark("non-aero");
      } else if (/\b(as9100\s+cert|certif(y|ied|ication)\s+(us|airoque|you)|are you (as9100|iso)\s*certified)\b/.test(t) ||
                 (/\bas9100\b/.test(t) && /\b(cert|accredited|registrar)\b/.test(t))) {
        html =
          "<p>AiroQue provides aerospace quality <strong>documentation and engineering support</strong>. We do <strong>not</strong> certify organizations to AS9100 (or act as a registrar).</p>" +
          "<p>We can help with quality-system documentation that supports your own certification path — see <a href=\"/quality-system-documentation\">Quality-system documentation</a> (starting from <strong>$1,500</strong>).</p>";
      } else if (/\b(nda|non[- ]?disclosure|confidential)\b/.test(t)) {
        html =
          "<p>NDA is available on request before detailed technical information is exchanged. Project information is treated as confidential.</p>" +
          "<p>Leave your contact details below (no export-controlled data), or email <a href=\"mailto:" + SUPPORT_EMAIL + "\">" + SUPPORT_EMAIL + "</a>.</p>";
        showLead = true;
      } else if (/\bqms\s*pulse|\bqm12\b|quality[- ]notifications?/.test(t) ||
                 (/\bpulse\b/.test(t) && !/\bcontrol\s*plan|pfmea\b/.test(t))) {
        html = FAQ["QMS Pulse"].html;
      } else if (/\b(price|pricing|cost|rate|how much|quote|fee)\b/.test(t) &&
                 !/\bcontrol\s*plan|pfmea|apqp|inspection|work\s*instruction|process\s*flow|monthly|alignment|engineering\s*change|qms|quality[- ]system|pulse\b/.test(t)) {
        html = FAQ["Pricing"].html;
        showLead = true;
      } else if (/\bcontrol\s*plan|cp\b/.test(t)) {
        html = FAQ["Control Plans"].html;
      } else if (/\bpfmea|process\s*fmea|fmea\b/.test(t) && /\balign/.test(t)) {
        html =
          "<p><strong>PFMEA ↔ Control Plan alignment</strong> reviews whether identified risks map to production controls.</p>" +
          "<p>Starting rate: from <strong>$1,000</strong>. Fixed quote after scope. Details: <a href=\"/pfmea-control-plan-alignment\">Alignment</a>.</p>";
      } else if (/\bpfmea|process\s*fmea|\bfmea\b/.test(t)) {
        html = FAQ["PFMEA"].html;
      } else if (/\bapqp|ppap|first\s*article|production[- ]readiness\s*package\b/.test(t)) {
        html = FAQ["APQP"].html;
      } else if (/\bprocess\s*flow|pfd\b/.test(t)) {
        html =
          "<p><strong>Process Flow Diagrams</strong> capture the manufacturing sequence as it actually runs.</p>" +
          "<p>Starting rate: from <strong>$500</strong>. See <a href=\"/process-flow-diagrams\">Process Flow Diagrams</a>.</p>";
      } else if (/\binspection\s*plan|incoming\s*inspection|fa[ir]?\b/.test(t)) {
        html =
          "<p><strong>Inspection plans</strong> define how each requirement is verified, by what method, and how often.</p>" +
          "<p>Starting rate: from <strong>$750</strong>. See <a href=\"/inspection-plans\">Inspection Plans</a>.</p>";
      } else if (/\bwork\s*instruction|swi|vwi\b/.test(t)) {
        html =
          "<p><strong>Work instructions</strong> (SWI / VWI) are written for use at the workstation.</p>" +
          "<p>Starting rate: from <strong>$500</strong>. See <a href=\"/work-instructions\">Work Instructions</a>.</p>";
      } else if (/\bengineering\s*change|eci|ecr|ecn|change\s*impact\b/.test(t)) {
        html =
          "<p><strong>Engineering change impact reviews</strong> identify which quality documents a revision affects before it bites production.</p>" +
          "<p>Starting rate: from <strong>$500</strong>. See <a href=\"/engineering-change-impact\">Engineering Change Impact</a>.</p>";
      } else if (/\bquality[- ]system|procedure|document\s*control\b/.test(t) ||
                 (/\bqms\b/.test(t) && !/\bpulse\b/.test(t))) {
        html =
          "<p><strong>Quality-system documentation</strong> support covers procedures, forms, records, and change control for aerospace QMS work.</p>" +
          "<p>Starting rate: from <strong>$1,500</strong>. AiroQue does not certify AS9100. See <a href=\"/quality-system-documentation\">Quality-system documentation</a>.</p>";
      } else if (/\bspecial\s*characteristic|key\s*characteristic|critical\s*feature|flow[- ]?down\b/.test(t)) {
        html =
          "<p><strong>Special characteristics</strong> — identification, flow-down, and control of special, key, and critical features.</p>" +
          "<p>See <a href=\"/special-characteristics\">Special Characteristics</a>. For a scoped quote, leave a message below or email <a href=\"mailto:" + SUPPORT_EMAIL + "\">" + SUPPORT_EMAIL + "</a>.</p>";
        showLead = true;
      } else if (/\breaction\s*plan\b/.test(t)) {
        html =
          "<p><strong>Reaction plans</strong> define what happens when a characteristic goes out of limits — containment, disposition, and restart.</p>" +
          "<p>See <a href=\"/reaction-plans\">Reaction Plans</a>. Often delivered with a Control Plan; leave a message for a scoped quote.</p>";
        showLead = true;
      } else if (/\bproduction[- ]readiness|readiness\s*review\b/.test(t)) {
        html =
          "<p><strong>Production-readiness documentation</strong> checks whether the document set is ready to support the first production run.</p>" +
          "<p>See <a href=\"/production-readiness\">Production Readiness</a>. Coordinated APQP packages start at <strong>$3,500</strong>.</p>";
      } else if (/\bmonthly|retainer|ongoing\s*support|qe\s*support\b/.test(t)) {
        html =
          "<p>Monthly quality engineering support starts at <strong>$2,500/month</strong> (scope-dependent; fixed quote after review).</p>" +
          "<p>See <a href=\"/pricing\">Pricing</a> or leave a message for a confidential discussion — NDA available.</p>";
        showLead = true;
      } else if (/\b(human|someone|team|contact|follow[- ]?up|talk to|speak with|email)\b/.test(t)) {
        html = FAQ["Talk to a human"].html;
        showLead = true;
      } else if (/\b(service|what do you|offer|help with|capabilities)\b/.test(t)) {
        html =
          "<p>AiroQue delivers twelve aerospace quality engineering services — Control Plans, Process Flow, PFMEA, alignment, APQP, inspection plans, special characteristics, reaction plans, work instructions, engineering change impact, production readiness, and quality-system documentation.</p>" +
          "<p>Overview: <a href=\"/services\">Services</a>. Starting rates: <a href=\"/pricing\">Pricing</a>. Ask about a specific deliverable, or leave a message for a scoped quote.</p>";
      } else {
        html =
          "<p>I’m not sure I have a grounded answer for that in the site knowledge base.</p>" +
          "<p>Try a quick topic below, browse <a href=\"/services\">Services</a> / <a href=\"/pricing\">Pricing</a>, or leave a message / email <a href=\"mailto:" + SUPPORT_EMAIL + "\">" + SUPPORT_EMAIL + "</a> — we typically respond within one business day. Please omit export-controlled detail.</p>";
        showLead = true;
      }

      return { html: html, showLead: showLead, mode: "local-grounded" };
    }

    function buildApiPayload(message) {
      /* replyPath: stub channel AiroQue Chat can later POST replies into */
      return {
        sessionId: sessionId,
        message: message,
        pageUrl: location.href,
        history: history.slice(-12),
        replyPath: {
          type: "stub",
          channel: "airoque-chat",
          sessionId: sessionId,
          note: "Reserved for AiroQue Chat live handoff; webhook URL TBD"
        }
      };
    }

    function tryRemoteChat(message) {
      return fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(buildApiPayload(message))
      }).then(function (r) {
        if (!r.ok) throw new Error("chat_http_" + r.status);
        return r.json();
      }).then(function (data) {
        if (!data || typeof data.reply !== "string" || !data.reply.trim()) throw new Error("chat_empty");
        return { html: "<p>" + esc(data.reply).replace(/\n+/g, "</p><p>") + "</p>", showLead: !!data.showLead, mode: data.mode || "remote" };
      });
    }

    function respondToFreeText(raw) {
      var message = String(raw || "").trim();
      if (!message || busy) return;
      busy = true;
      if (sendBtn) sendBtn.disabled = true;
      addMsg("<p>" + esc(message) + "</p>", "user");
      history.push({ role: "user", content: message });
      freeInput.value = "";
      showTyping(true);

      var settled = false;
      function finish(result) {
        if (settled) return;
        settled = true;
        showTyping(false);
        addMsg(result.html, "bot");
        history.push({
          role: "assistant",
          content: result.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
          mode: result.mode || "local-grounded"
        });
        if (result.showLead) setLeadVisible(true);
        addChips();
        busy = false;
        if (sendBtn) sendBtn.disabled = false;
      }

      function failToLocalOrLead(err) {
        /* Prefer local grounded KB so UI is never dead when function is undeployed. */
        try {
          var local = localGroundedReply(message);
          if (local.mode === "local-grounded") {
            /* Optional quiet note only when remote was attempted and failed after timeout/network — keep UX clean: just use local. */
            finish(local);
            return;
          }
        } catch (e2) { /* fall through */ }
        showTyping(false);
        addMsg(
          "<p>Sorry — I couldn’t complete that reply just now.</p>" +
            "<p>Please leave a message below or email <a href=\"mailto:" + SUPPORT_EMAIL + "\">" + SUPPORT_EMAIL + "</a>. We typically respond within one business day.</p>",
          "bot"
        );
        setLeadVisible(true);
        addChips();
        busy = false;
        if (sendBtn) sendBtn.disabled = false;
      }

      /* Try remote briefly; on any failure use local grounded responder (interim path). */
      var remoteTimer = setTimeout(function () {
        /* Abort wait: use local — fetch may still complete later; ignore late result via settled flag */
        failToLocalOrLead(new Error("timeout"));
      }, 2800);

      tryRemoteChat(message)
        .then(function (result) {
          clearTimeout(remoteTimer);
          if (settled) return;
          finish(result);
        })
        .catch(function (err) {
          clearTimeout(remoteTimer);
          failToLocalOrLead(err);
        });
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

    composeForm.addEventListener("submit", function (e) {
      e.preventDefault();
      respondToFreeText(freeInput.value);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) {
        e.preventDefault();
        closePanel();
      }
    });

    addMsg(
      "<p>Welcome — I&rsquo;m the <strong>AiroQue Assistant</strong> (team). Ask about Control Plans, PFMEA, APQP, pricing, or leave a message for follow-up.</p>" +
        "<p>Starting rates only here; fixed quotes after scope. NDA available. Please omit export-controlled detail.</p>",
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
            addMsg("<p>Thanks — your message was sent. The team will follow up shortly. You can also reach " + SUPPORT_EMAIL + ".</p>", "bot");
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
