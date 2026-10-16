/* Category chips + hash routing: #orbit/#buy → orbit; #shop/#nenkin/#jpkit/#jpleave → shop */
(function () {
  var body = document.body;
  var chips = document.querySelectorAll(".cat-chip[data-cat]");
  var panels = document.querySelectorAll("[data-cat-panel]");
  var navCta = document.getElementById("nav-cta");
  var dockTitle = document.getElementById("dock-title");
  var dockSub = document.getElementById("dock-sub");
  var dockCta = document.getElementById("dock-cta");
  var catBar = document.getElementById("cat-bar");

  var DOCK = {
    orbit: {
      title: "污兔360",
      sub: "¥9.9 · 先付再出片",
      cta: "上传下单",
      href: "#buy"
    },
    shop: {
      title: "年金清单",
      sub: "¥9.9 · 电子资料",
      cta: "买资料",
      href: "#shop"
    }
  };

  function hashKey() {
    var raw = (location.hash || "").replace(/^#/, "");
    var base = (raw.split("?")[0] || "").toLowerCase();
    return base;
  }

  function catFromHash() {
    var h = hashKey();
    /* shop SKUs: #shop / #nenkin / #jpkit / #jpleave (and paid return query) */
    if (h === "shop" || h === "nenkin" || h === "jpkit" || h === "jpleave") return "shop";
    if (h === "orbit" || h === "buy" || h === "how" || h === "demo" || h === "pricing") return "orbit";
    /* paid return may be #shop?paid=1 or #buy?paid=1 */
    var full = (location.hash || "").toLowerCase();
    if (
      full.indexOf("shop") >= 0 ||
      full.indexOf("nenkin") >= 0 ||
      full.indexOf("jpkit") >= 0 ||
      full.indexOf("jpleave") >= 0
    )
      return "shop";
    if (full.indexOf("buy") >= 0 || full.indexOf("orbit") >= 0) return "orbit";
    return "orbit";
  }

  function syncDock(cat) {
    var d = DOCK[cat] || DOCK.orbit;
    if (dockTitle) dockTitle.textContent = d.title;
    if (dockSub) dockSub.textContent = d.sub;
    if (dockCta) {
      dockCta.textContent = d.cta;
      dockCta.setAttribute("href", d.href);
      dockCta.setAttribute("data-cat-link", cat);
    }
    if (navCta) {
      if (cat === "shop") {
        navCta.textContent = "买资料";
        navCta.setAttribute("href", "#shop");
        navCta.setAttribute("data-cat-link", "shop");
      } else {
        navCta.textContent = "上传下单";
        navCta.setAttribute("href", "#buy");
        navCta.setAttribute("data-cat-link", "orbit");
      }
    }
  }

  function setCat(cat, opts) {
    opts = opts || {};
    if (cat !== "orbit" && cat !== "shop") cat = "orbit";
    body.setAttribute("data-cat", cat);

    chips.forEach(function (chip) {
      var on = chip.getAttribute("data-cat") === cat;
      chip.classList.toggle("is-active", on);
      chip.setAttribute("aria-selected", on ? "true" : "false");
    });

    panels.forEach(function (panel) {
      var on = panel.getAttribute("data-cat-panel") === cat;
      panel.classList.toggle("is-hidden", !on);
      if (on) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });

    /* Entry cards highlight */
    document.querySelectorAll(".price-card--btn[data-cat]").forEach(function (card) {
      card.classList.toggle("is-active-cat", card.getAttribute("data-cat") === cat);
    });

    syncDock(cat);

    if (opts.updateHash) {
      var want = cat === "shop" ? "shop" : opts.hash || "orbit";
      var cur = hashKey();
      /* Preserve query on paid return */
      var q = "";
      var hash = location.hash || "";
      if (hash.indexOf("?") >= 0) q = hash.slice(hash.indexOf("?"));
      if (cur !== want && !(opts.preserveQuery && q)) {
        if (history.replaceState) {
          history.replaceState(null, "", "#" + want + (opts.preserveQuery ? q : ""));
        } else {
          location.hash = want;
        }
      }
    }

    if (opts.scroll) {
      var target =
        opts.scroll === true
          ? document.getElementById(cat === "shop" ? "shop" : "buy")
          : typeof opts.scroll === "string"
            ? document.getElementById(opts.scroll) || document.querySelector(opts.scroll)
            : null;
      if (!target && catBar) target = catBar;
      if (target) {
        setTimeout(function () {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 40);
      }
    }
  }

  window.setCat = setCat;

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var cat = chip.getAttribute("data-cat");
      if (!cat || chip.disabled) return;
      setCat(cat, { updateHash: true, hash: cat === "shop" ? "shop" : "orbit", scroll: true });
    });
  });

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-cat-link]");
    if (!el) return;
    var cat = el.getAttribute("data-cat-link");
    if (!cat) return;
    /* Let hash change; we sync on hashchange + immediately */
    setCat(cat, { updateHash: false });
  });

  /* Price entry cards */
  document.querySelectorAll(".price-card--btn[data-cat]").forEach(function (card) {
    card.addEventListener("click", function () {
      var cat = card.getAttribute("data-cat");
      setCat(cat, {
        updateHash: true,
        hash: cat === "shop" ? "shop" : "buy",
        scroll: cat === "shop" ? "shop" : "buy"
      });
    });
  });

  function applyFromHash(scroll) {
    var cat = catFromHash();
    var h = hashKey();
    var scrollTo = false;
    if (scroll) {
      if (h === "buy" || h === "how" || h === "demo" || h === "nenkin" || h === "shop" || h === "jpkit" || h === "jpleave") scrollTo = h;
      else if (h === "orbit" || h === "pricing") scrollTo = "cat-bar";
    }
    setCat(cat, {
      updateHash: false,
      preserveQuery: true,
      scroll: scrollTo || false
    });
  }

  window.addEventListener("hashchange", function () {
    applyFromHash(true);
  });

  /* Init */
  applyFromHash(true);
})();
