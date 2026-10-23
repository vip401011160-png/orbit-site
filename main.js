/* 污兔酱的小窝 — upload → pay ¥9.9 → Gradio generate → download */
(function () {
  var demo = document.querySelector("#demo video");
  if (demo) {
    demo.play().catch(function () {});
  }

  var SPACE_URL = (window.ORBIT_API_BASE || "https://wutujiang-wutu-orbit-api-z1.hf.space").replace(/\/$/, "");
  var PRICE = window.ORBIT_PRICE_YUAN || "9.9";

  var fileInput = document.getElementById("try-file");
  var drop = document.getElementById("try-drop");
  var dropInner = document.getElementById("try-drop-inner");
  var preview = document.getElementById("try-preview");
  var previewImg = document.getElementById("try-preview-img");
  var changeBtn = document.getElementById("try-change");
  var startBtn = document.getElementById("try-start");

  var pickPanel = document.getElementById("try-pick");
  var payPanel = document.getElementById("try-pay");
  var loadingPanel = document.getElementById("try-loading");
  var donePanel = document.getElementById("try-done");
  var failPanel = document.getElementById("try-fail");

  var loadingThumb = document.getElementById("try-loading-thumb");
  var stageLabel = document.getElementById("try-stage-label");
  var progressEl = document.getElementById("try-progress");
  var progressBar = document.getElementById("try-progress-bar");
  var pctEl = document.getElementById("try-pct");

  var doneVideo = document.getElementById("try-done-video");
  var downloadBtn = document.getElementById("try-download");
  var againBtn = document.getElementById("try-again");
  var retryBtn = document.getElementById("try-retry");
  var failAgainBtn = document.getElementById("try-fail-again");
  var failMsg = document.getElementById("try-fail-msg");

  var payQr = document.getElementById("try-pay-qr");
  var payOpen = document.getElementById("try-pay-open");
  var payCancel = document.getElementById("try-pay-cancel");
  var payStatus = document.getElementById("try-pay-status");
  var payLead = document.getElementById("try-pay-lead");

  if (!fileInput || !startBtn || !pickPanel) return;

  var objectUrl = null;
  var selectedFile = null;
  var progressTimer = null;
  var softPct = 0;
  var orderReady = false;
  var videoObjectUrl = null;
  var gradioClientPromise = null;
  var pollAbort = false;
  var pendingOrderId = null;
  var generateToken = null;

  var STAGES = [
    { at: 0, label: "正在锁定主体…" },
    { at: 12, label: "估算景深与构图…" },
    { at: 28, label: "铺开 360° 环绕路径…" },
    { at: 48, label: "渲染环绕帧…" },
    { at: 68, label: "打磨成片细节…" },
    { at: 85, label: "即将完成…" },
    { at: 96, label: "装订下载…" }
  ];

  function showStage(name) {
    pickPanel.classList.toggle("is-hidden", name !== "pick");
    if (payPanel) payPanel.classList.toggle("is-hidden", name !== "pay");
    loadingPanel.classList.toggle("is-hidden", name !== "loading");
    donePanel.classList.toggle("is-hidden", name !== "done");
    if (failPanel) failPanel.classList.toggle("is-hidden", name !== "fail");
    /* Mobile dock: hide during pay/generate so it does not cover stage CTAs */
    document.body.classList.toggle("dock-hidden", name !== "pick");
  }

  function clearObjectUrl() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  }

  function clearVideoUrl() {
    if (videoObjectUrl) {
      URL.revokeObjectURL(videoObjectUrl);
      videoObjectUrl = null;
    }
    if (doneVideo) {
      doneVideo.removeAttribute("src");
      doneVideo.load();
    }
  }

  function setFile(file) {
    if (!file || !file.type || file.type.indexOf("image/") !== 0) return;
    selectedFile = file;
    clearObjectUrl();
    objectUrl = URL.createObjectURL(file);
    previewImg.src = objectUrl;
    loadingThumb.src = objectUrl;
    preview.classList.remove("is-hidden");
    dropInner.style.visibility = "hidden";
    startBtn.disabled = false;
  }

  function stopTimers() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }

  function resetPick() {
    selectedFile = null;
    orderReady = false;
    softPct = 0;
    pollAbort = true;
    pendingOrderId = null;
    generateToken = null;
    clearObjectUrl();
    clearVideoUrl();
    fileInput.value = "";
    preview.classList.add("is-hidden");
    previewImg.removeAttribute("src");
    loadingThumb.removeAttribute("src");
    dropInner.style.visibility = "";
    startBtn.disabled = true;
    stopTimers();
    try {
      sessionStorage.removeItem("wutu_pending_order");
    } catch (e) {}
  }

  function setProgress(pct) {
    var n = Math.max(0, Math.min(100, Math.round(pct)));
    progressBar.style.width = n + "%";
    pctEl.textContent = String(n);
    progressEl.setAttribute("aria-valuenow", String(n));
    for (var i = STAGES.length - 1; i >= 0; i--) {
      if (n >= STAGES[i].at) {
        stageLabel.textContent = STAGES[i].label;
        break;
      }
    }
  }

  function startSoftProgress() {
    softPct = 0;
    orderReady = false;
    setProgress(0);
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = setInterval(function () {
      if (orderReady) return;
      var cap = 92;
      if (softPct >= cap) {
        setProgress(cap);
        return;
      }
      var remain = cap - softPct;
      var step = Math.max(0.25, remain * 0.035 + Math.random() * 0.9);
      softPct = Math.min(cap, softPct + step);
      setProgress(softPct);
    }, 450);
  }

  function finishProgress() {
    orderReady = true;
    stopTimers();
    setProgress(100);
  }

  function showFail(message) {
    stopTimers();
    pollAbort = true;
    if (failMsg) failMsg.textContent = message || "这次没生成成功，换张清晰一点的自拍再试一次吧。";
    showStage("fail");
  }

  function showDone(blobUrl, filename) {
    finishProgress();
    if (doneVideo) {
      doneVideo.src = blobUrl;
      doneVideo.play().catch(function () {});
    }
    if (downloadBtn) {
      downloadBtn.href = blobUrl;
      downloadBtn.setAttribute("download", filename || "wutu-360.mp4");
    }
    setTimeout(function () {
      showStage("done");
    }, 400);
  }

  function loadGradioClient() {
    if (gradioClientPromise) return gradioClientPromise;
    gradioClientPromise = import("https://cdn.jsdelivr.net/npm/@gradio/client/+esm")
      .then(function (mod) {
        return mod.Client;
      })
      .catch(function () {
        return import("https://esm.sh/@gradio/client").then(function (mod) {
          return mod.Client;
        });
      });
    return gradioClientPromise;
  }

  function absUrl(u) {
    if (!u) return null;
    if (/^https?:\/\//i.test(u) || u.indexOf("blob:") === 0 || u.indexOf("data:") === 0) return u;
    if (u.charAt(0) === "/") return SPACE_URL + u;
    if (u.indexOf("gradio_api/") === 0 || u.indexOf("file=") === 0) return SPACE_URL + "/" + u.replace(/^\//, "");
    if (u.indexOf("/tmp/") === 0 || u.indexOf("tmp/") === 0) {
      return SPACE_URL + "/gradio_api/file=" + u;
    }
    return SPACE_URL + "/gradio_api/file=" + u;
  }

  function extractVideoUrl(videoOut) {
    if (!videoOut) return null;
    if (typeof videoOut === "string") return absUrl(videoOut);
    if (videoOut instanceof Blob) return URL.createObjectURL(videoOut);
    if (videoOut.url) return absUrl(videoOut.url);
    if (videoOut.video) {
      if (typeof videoOut.video === "string") return absUrl(videoOut.video);
      if (videoOut.video.url) return absUrl(videoOut.video.url);
      if (videoOut.video.path) return absUrl(videoOut.video.path);
    }
    if (videoOut.path) return absUrl(videoOut.path);
    if (videoOut.data && typeof videoOut.data === "string") return absUrl(videoOut.data);
    return null;
  }

  function runGeneration(token) {
    if (!selectedFile) {
      showFail("请先重新上传照片，再完成生成。");
      return;
    }
    if (!token) {
      showFail("未拿到支付凭证，请重新支付。");
      return;
    }
    showStage("loading");
    startSoftProgress();
    startBtn.disabled = true;

    loadGradioClient()
      .then(function (Client) {
        return Client.connect(SPACE_URL);
      })
      .then(function (client) {
        return client.predict("/generate", {
          image: selectedFile,
          generate_token: token
        });
      })
      .then(function (result) {
        var data = result && result.data ? result.data : result;
        var videoOut = Array.isArray(data) ? data[0] : null;
        var status = Array.isArray(data) ? data[1] : "";
        if (typeof status === "string" && (status.indexOf("请先完成支付") >= 0 || status.indexOf("支付") >= 0) && !videoOut) {
          showFail(status);
          return;
        }
        var url = extractVideoUrl(videoOut);
        if (!url) {
          showFail(typeof status === "string" && status ? status : "成片没排出来，请再试一次。");
          return;
        }
        return fetch(url)
          .then(function (r) {
            if (!r.ok) throw new Error("fetch video");
            return r.blob();
          })
          .then(function (blob) {
            clearVideoUrl();
            videoObjectUrl = URL.createObjectURL(blob);
            var name = "wutu-360-" + (status || Date.now()) + ".mp4";
            if (typeof status === "string" && /^[a-f0-9]{8,}$/i.test(status.trim())) {
              name = "wutu-360-" + status.trim() + ".mp4";
            }
            try {
              sessionStorage.removeItem("wutu_pending_order");
            } catch (e) {}
            showDone(videoObjectUrl, name);
          });
      })
      .catch(function (err) {
        console.warn("orbit generate failed", err);
        showFail("生成服务忙了一下，稍后再试一次就好。");
      });
  }

  function isWeChatUA() {
    return /MicroMessenger/i.test(navigator.userAgent || "");
  }

  function isMobileUA() {
    return /Android|iPhone|iPod|iPad|Mobile|MicroMessenger/i.test(navigator.userAgent || "");
  }

  /** Wire「打开收银台」: WeChat/mobile must same-tab (target=_blank often no-ops). */
  function isHttpUrl(u) {
    return typeof u === "string" && /^https?:\/\//i.test(u);
  }
  function disarmCashierOpen(anchor) {
    if (!anchor) return;
    anchor.setAttribute("href", "javascript:void(0)");
    anchor.setAttribute("target", "_self");
    anchor.removeAttribute("rel");
    anchor.classList.add("is-disabled");
    anchor.onclick = function (ev) {
      ev.preventDefault();
      return false;
    };
  }
  function wireCashierOpen(anchor, payUrl, preferSameTab) {
    if (!anchor) return;
    if (!isHttpUrl(payUrl)) {
      disarmCashierOpen(anchor);
      return;
    }
    anchor.href = payUrl;
    anchor.classList.remove("is-disabled");
    if (preferSameTab) {
      anchor.setAttribute("target", "_self");
      anchor.removeAttribute("rel");
    } else {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    }
    anchor.onclick = function (ev) {
      if (!isHttpUrl(payUrl)) {
        ev.preventDefault();
        return false;
      }
      if (!preferSameTab) return; // let browser open new tab
      ev.preventDefault();
      try {
        window.location.assign(payUrl);
      } catch (e) {
        window.location.href = payUrl;
      }
      return false;
    };
  }

  function showPayCheckout(res) {
    pendingOrderId = res.order_id;
    pollAbort = false;
    try {
      sessionStorage.setItem("wutu_pending_order", res.order_id);
    } catch (e) {}

    var inWeChat = isWeChatUA();
    var onMobile = isMobileUA();
    // WeChat long-press QR is rejected by merchant; hide QR in WeChat + mobile.
    // Desktop non-WeChat may show QR as optional secondary.
    var showQr = !inWeChat && !onMobile && !!(res.url_qrcode);
    var payQrWrap = document.getElementById("try-pay-qr-wrap");
    if (showQr && payQr) {
      payQr.src = res.url_qrcode;
      payQr.classList.remove("is-hidden");
      if (payQrWrap) payQrWrap.classList.remove("is-hidden");
    } else {
      if (payQr) {
        payQr.removeAttribute("src");
        payQr.classList.add("is-hidden");
      }
      if (payQrWrap) payQrWrap.classList.add("is-hidden");
    }

    var sameTab = inWeChat || onMobile;
    if (payOpen) {
      if (res.pay_url) {
        wireCashierOpen(payOpen, res.pay_url, sameTab);
      } else {
        disarmCashierOpen(payOpen);
      }
    }

    if (payStatus) {
      payStatus.textContent = sameTab
        ? "正在打开收银台…若未跳转请点「打开收银台」"
        : "等待支付确认…（请勿关闭本页）";
    }
    if (payLead) {
      if (inWeChat) {
        payLead.textContent =
          "请点「打开收银台」完成支付（同页跳转）。微信内请勿长按页内二维码——本商户不支持长按识别支付。付完回站后自动出片。";
      } else if (onMobile) {
        payLead.textContent =
          "请点「打开收银台」用微信 / 支付宝完成 ¥" + PRICE + " 支付；付完回站后自动出片。";
      } else {
        payLead.textContent =
          "点「打开收银台」完成 ¥" + PRICE + " 支付后将自动开始生成。也可扫下方二维码（仅电脑端可选）。";
      }
    }
    showStage("pay");

    // Auto-open cashier: WeChat/mobile same-tab; desktop may open new tab once.
    if (res.pay_url) {
      if (sameTab) {
        setTimeout(function () {
          try {
            window.location.assign(res.pay_url);
          } catch (e) {
            window.location.href = res.pay_url;
          }
        }, 80);
      }
    }

    if (!window.WutuPay || !window.WutuPay.pollOrder) {
      showFail("支付组件未加载，请刷新页面。");
      return;
    }

    // Desktop keeps polling here; WeChat/mobile resume via return_url + tryResumePaidOrder.
    window.WutuPay
      .pollOrder(res.order_id, { maxMs: 300000, everyMs: 2000 })
      .then(function (order) {
        if (pollAbort) return;
        generateToken = order.generate_token;
        if (payStatus) payStatus.textContent = "已付款，开始生成…";
        runGeneration(generateToken);
      })
      .catch(function (err) {
        if (pollAbort) return;
        console.warn("pay poll", err);
        showFail(err && err.message ? err.message : "等待支付超时，请重新下单。");
      });
  }

  function startPayThenGenerate() {
    if (!selectedFile) return;
    if (!window.WutuPay || !window.ORBIT_PAY_API) {
      showFail("支付通道未配置，请稍后再试。");
      return;
    }
    startBtn.disabled = true;
    pollAbort = false;
    if (payStatus) payStatus.textContent = "正在创建订单…";
    disarmCashierOpen(payOpen);
    showStage("pay");
    var payQrWrap0 = document.getElementById("try-pay-qr-wrap");
    if (payQr) {
      payQr.removeAttribute("src");
      payQr.classList.add("is-hidden");
    }
    if (payQrWrap0) payQrWrap0.classList.add("is-hidden");

    window.WutuPay
      .createPayment()
      .then(function (res) {
        showPayCheckout(res);
      })
      .catch(function (err) {
        console.warn("create pay", err);
        startBtn.disabled = false;
        showFail("创建支付订单失败，请稍后再试。");
      });
  }

  /** Resume after return from cashier (#buy?paid=1&order_id=...). */
  function tryResumePaidOrder() {
    if (!window.WutuPay) return;
    var hash = location.hash || "";
    var q = "";
    if (hash.indexOf("?") >= 0) q = hash.split("?")[1] || "";
    if (location.search) q += (q ? "&" : "") + location.search.replace(/^\?/, "");
    var params = new URLSearchParams(q);
    var paid = params.get("paid");
    var oid = params.get("order_id") || null;
    try {
      if (!oid) oid = sessionStorage.getItem("wutu_pending_order");
    } catch (e) {}
    if (!oid) return;
    if (paid !== "1" && !params.get("order_id")) return;

    pendingOrderId = oid;
    pollAbort = false;
    if (typeof window.setCat === "function") {
      window.setCat("orbit", { updateHash: false, preserveQuery: true });
    }
    showStage("pay");
    if (payStatus) payStatus.textContent = "正在确认支付…";
    if (payLead) payLead.textContent = "已从收银台返回，正在确认付款并准备生成。";

    window.WutuPay
      .pollOrder(oid, { maxMs: 120000, everyMs: 1500 })
      .then(function (order) {
        if (pollAbort) return;
        generateToken = order.generate_token;
        if (!selectedFile) {
          showStage("pick");
          if (startBtn) {
            startBtn.textContent = "已付款 上传照片生成";
            startBtn.disabled = true;
          }
          var once = function () {
            if (!selectedFile || !generateToken) return;
            fileInput.removeEventListener("change", once);
            runGeneration(generateToken);
          };
          // After setFile from change/drop, user may need to click — auto-run when file set:
          var origSet = setFile;
          setFile = function (file) {
            origSet(file);
            if (selectedFile && generateToken) runGeneration(generateToken);
          };
          return;
        }
        runGeneration(generateToken);
      })
      .catch(function (err) {
        if (pollAbort) return;
        showFail(err && err.message ? err.message : "确认支付失败，请重新下单。");
      });
  }

  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) setFile(fileInput.files[0]);
  });

  changeBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });

  ;["dragenter", "dragover"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) {
      e.preventDefault();
      e.stopPropagation();
      drop.classList.add("is-drag");
    });
  });
  ;["dragleave", "drop"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) {
      e.preventDefault();
      e.stopPropagation();
      drop.classList.remove("is-drag");
    });
  });
  drop.addEventListener("drop", function (e) {
    var files = e.dataTransfer && e.dataTransfer.files;
    if (files && files[0]) setFile(files[0]);
  });

  startBtn.addEventListener("click", function () {
    // If already paid (token ready) and file selected, skip pay
    if (generateToken && selectedFile) {
      runGeneration(generateToken);
      return;
    }
    startPayThenGenerate();
  });

  if (payCancel) {
    payCancel.addEventListener("click", function () {
      pollAbort = true;
      startBtn.disabled = false;
      showStage("pick");
      if (payStatus) payStatus.textContent = "";
    });
  }

  function goPick() {
    resetPick();
    if (startBtn) startBtn.textContent = "支付 ¥" + PRICE + " 并生成";
    showStage("pick");
    var buy = document.getElementById("buy");
    if (buy) buy.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (againBtn) againBtn.addEventListener("click", goPick);
  if (failAgainBtn) failAgainBtn.addEventListener("click", goPick);
  if (retryBtn) {
    retryBtn.addEventListener("click", function () {
      if (generateToken && selectedFile) runGeneration(generateToken);
      else if (selectedFile) startPayThenGenerate();
      else goPick();
    });
  }

  disarmCashierOpen(payOpen);

  // After DOM ready: resume paid return
  tryResumePaidOrder();
})();
