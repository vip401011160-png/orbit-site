/* 电子资料 · 先付再下载 PDF（product=nenkin | challenge7 …） */
(function () {
  if (!window.WutuPay) return;

  var RETURN_URL = "https://wutu360.surge.sh/#shop?paid=1";
  var SKUS = [
    {
      id: "nenkin",
      priceLabel: "¥9.9",
      defaultFilename: "污兔酱-年金自查清单-v1.pdf",
    },
    {
      id: "challenge7",
      priceLabel: "¥12.9",
      defaultFilename: "污兔酱-搞钱挑战7日清单-v1.pdf",
    },
  ];

  var instances = {};

  function el(id) {
    return document.getElementById(id);
  }

  function isWeChatUA() {
    return /MicroMessenger/i.test(navigator.userAgent || "");
  }

  function isMobileUA() {
    return /Android|iPhone|iPod|iPad|Mobile|MicroMessenger/i.test(
      navigator.userAgent || ""
    );
  }

  function wireCashierOpen(anchor, payUrl, preferSameTab) {
    if (!anchor || !payUrl) return;
    anchor.href = payUrl;
    if (preferSameTab) {
      anchor.setAttribute("target", "_self");
      anchor.removeAttribute("rel");
    } else {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    }
    anchor.onclick = function (ev) {
      if (!preferSameTab) return;
      ev.preventDefault();
      try {
        window.location.assign(payUrl);
      } catch (e) {
        window.location.href = payUrl;
      }
      return false;
    };
  }

  function bindSku(sku) {
    var pid = sku.id;
    var buyBtn = el("shop-" + pid + "-buy");
    if (!buyBtn) return null;

    var state = {
      sku: sku,
      buyBtn: buyBtn,
      checkout: el("shop-" + pid + "-checkout"),
      doneEl: el("shop-" + pid + "-done"),
      failEl: el("shop-" + pid + "-fail"),
      qr: el("shop-" + pid + "-qr"),
      openBtn: el("shop-" + pid + "-open"),
      cancelBtn: el("shop-" + pid + "-cancel"),
      statusEl: el("shop-" + pid + "-status"),
      leadEl: el("shop-" + pid + "-lead"),
      failMsg: el("shop-" + pid + "-fail-msg"),
      dlBtn: el("shop-" + pid + "-dl"),
      retryBtn: el("shop-" + pid + "-retry"),
      qrWrap: el("shop-" + pid + "-qr-wrap"),
      pollAbort: false,
      pendingOrderId: null,
      generateToken: null,
    };

    function showStage(name) {
      state.buyBtn.classList.toggle("is-hidden", name !== "idle");
      if (state.checkout) state.checkout.classList.toggle("is-hidden", name !== "pay");
      if (state.doneEl) state.doneEl.classList.toggle("is-hidden", name !== "done");
      if (state.failEl) state.failEl.classList.toggle("is-hidden", name !== "fail");
    }

    function showFail(msg) {
      state.pollAbort = true;
      if (state.failMsg) state.failMsg.textContent = msg || "出了点问题，请稍后再试。";
      showStage("fail");
    }

    function triggerDownload(blob, filename) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename || sku.defaultFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 2000);
    }

    function doDownload() {
      if (!state.pendingOrderId || !state.generateToken) {
        showFail("缺少支付凭证，请重新下单。");
        return;
      }
      if (!window.WutuPay.downloadPaidFile) {
        showFail("下载组件未就绪。若刚付款，请私信 @wutujiang1999 并附订单号。");
        return;
      }
      if (state.dlBtn) {
        state.dlBtn.disabled = true;
        state.dlBtn.textContent = "准备下载…";
      }
      window.WutuPay
        .downloadPaidFile(state.pendingOrderId, state.generateToken)
        .then(function (res) {
          triggerDownload(res.blob, res.filename);
          if (state.dlBtn) {
            state.dlBtn.disabled = false;
            state.dlBtn.textContent = "再次下载 PDF";
          }
        })
        .catch(function (err) {
          console.warn(pid + " download", err);
          if (state.dlBtn) {
            state.dlBtn.disabled = false;
            state.dlBtn.textContent = "下载 PDF";
          }
          var msg = (err && err.message) || "";
          if (/未知商品|product|404|下载|not found|资料文件/i.test(msg)) {
            showFail(
              "支付已确认，但资料下载通道还在升级。请私信 @wutujiang1999 并说明已付款，我们会发 PDF。"
            );
          } else {
            showFail(msg || "下载失败，请稍后点「再次下载」或私信客服。");
          }
        });
    }

    function onPaid(order) {
      state.generateToken = order.generate_token;
      state.pendingOrderId = order.id || state.pendingOrderId;
      try {
        sessionStorage.setItem("wutu_shop_order", state.pendingOrderId);
        sessionStorage.setItem("wutu_shop_product", pid);
        sessionStorage.setItem("wutu_" + pid + "_order", state.pendingOrderId);
        if (state.generateToken) {
          sessionStorage.setItem("wutu_" + pid + "_token", state.generateToken);
        }
      } catch (e) {}
      showStage("done");
      doDownload();
    }

    function showCheckout(res) {
      state.pendingOrderId = res.order_id;
      state.pollAbort = false;
      try {
        sessionStorage.setItem("wutu_shop_order", res.order_id);
        sessionStorage.setItem("wutu_shop_product", pid);
        sessionStorage.setItem("wutu_" + pid + "_order", res.order_id);
      } catch (e) {}

      var inWeChat = isWeChatUA();
      var onMobile = isMobileUA();
      var showQr = !inWeChat && !onMobile && !!res.url_qrcode;
      if (showQr && state.qr) {
        state.qr.src = res.url_qrcode;
        state.qr.classList.remove("is-hidden");
        if (state.qrWrap) state.qrWrap.classList.remove("is-hidden");
      } else {
        if (state.qr) {
          state.qr.removeAttribute("src");
          state.qr.classList.add("is-hidden");
        }
        if (state.qrWrap) state.qrWrap.classList.add("is-hidden");
      }

      var sameTab = inWeChat || onMobile;
      if (state.openBtn) {
        if (res.pay_url) {
          wireCashierOpen(state.openBtn, res.pay_url, sameTab);
        } else {
          state.openBtn.removeAttribute("href");
          state.openBtn.onclick = null;
        }
      }
      if (state.statusEl) {
        state.statusEl.textContent = sameTab
          ? "正在打开收银台…若未跳转请点「打开收银台」"
          : "等待支付确认…（请勿关闭本页）";
      }
      if (state.leadEl) {
        if (inWeChat) {
          state.leadEl.textContent =
            "请点「打开收银台」完成支付（同页跳转）。微信内请勿长按页内二维码——本商户不支持长按识别支付。付完回站后自动解锁 PDF。";
        } else if (onMobile) {
          state.leadEl.textContent =
            "请点「打开收银台」用微信 / 支付宝完成 " +
            sku.priceLabel +
            " 支付；付完回站后自动解锁 PDF。";
        } else {
          state.leadEl.textContent =
            "点「打开收银台」完成 " +
            sku.priceLabel +
            " 支付后将自动解锁 PDF。也可扫下方二维码（仅电脑端可选）。";
        }
      }
      showStage("pay");

      if (res.pay_url && sameTab) {
        setTimeout(function () {
          try {
            window.location.assign(res.pay_url);
          } catch (e) {
            window.location.href = res.pay_url;
          }
        }, 80);
      }

      window.WutuPay
        .pollOrder(res.order_id, { maxMs: 300000, everyMs: 2000 })
        .then(function (order) {
          if (state.pollAbort) return;
          if (state.statusEl) state.statusEl.textContent = "已付款，准备下载…";
          onPaid(order);
        })
        .catch(function (err) {
          if (state.pollAbort) return;
          showFail(err && err.message ? err.message : "等待支付超时，请重新下单。");
        });
    }

    function startBuy() {
      if (!window.ORBIT_PAY_API) {
        showFail("支付通道未配置，请稍后再试。");
        return;
      }
      state.pollAbort = false;
      state.buyBtn.disabled = true;
      if (state.statusEl) state.statusEl.textContent = "正在创建订单…";
      showStage("pay");
      if (state.qr) {
        state.qr.removeAttribute("src");
        state.qr.classList.add("is-hidden");
      }
      if (state.qrWrap) state.qrWrap.classList.add("is-hidden");

      window.WutuPay
        .createPayment({
          product: pid,
          return_url: RETURN_URL,
          attach: pid,
        })
        .then(function (res) {
          state.buyBtn.disabled = false;
          showCheckout(res);
        })
        .catch(function (err) {
          console.warn(pid + " create pay", err);
          state.buyBtn.disabled = false;
          showFail("创建支付订单失败，请稍后再试。");
        });
    }

    function resetIdle() {
      state.pollAbort = true;
      state.pendingOrderId = null;
      state.generateToken = null;
      state.buyBtn.disabled = false;
      showStage("idle");
    }

    function resumeWithOrder(oid) {
      state.pendingOrderId = oid;
      state.pollAbort = false;
      if (typeof window.setCat === "function") {
        window.setCat("shop", { updateHash: false, preserveQuery: true });
      }
      showStage("pay");
      if (state.statusEl) state.statusEl.textContent = "正在确认支付…";
      if (state.leadEl) {
        state.leadEl.textContent = "已从收银台返回，正在确认付款并准备下载。";
      }
      window.WutuPay
        .pollOrder(oid, { maxMs: 120000, everyMs: 1500 })
        .then(function (order) {
          if (state.pollAbort) return;
          onPaid(order);
        })
        .catch(function (err) {
          if (state.pollAbort) return;
          showFail(err && err.message ? err.message : "确认支付失败，请重新下单。");
        });
    }

    state.buyBtn.addEventListener("click", startBuy);
    if (state.cancelBtn) state.cancelBtn.addEventListener("click", resetIdle);
    if (state.retryBtn) state.retryBtn.addEventListener("click", startBuy);
    if (state.dlBtn) state.dlBtn.addEventListener("click", doDownload);

    state.resumeWithOrder = resumeWithOrder;
    state.showFail = showFail;
    return state;
  }

  SKUS.forEach(function (sku) {
    var inst = bindSku(sku);
    if (inst) instances[sku.id] = inst;
  });

  function tryResume() {
    var hash = location.hash || "";
    var q = "";
    if (hash.indexOf("?") >= 0) q = hash.split("?")[1] || "";
    if (location.search) q += (q ? "&" : "") + location.search.replace(/^\?/, "");
    var params = new URLSearchParams(q);
    var paid = params.get("paid");
    var oid = params.get("order_id") || null;
    var skuHint = params.get("sku") || params.get("product") || null;
    try {
      if (!oid) oid = sessionStorage.getItem("wutu_shop_order");
      if (!skuHint) skuHint = sessionStorage.getItem("wutu_shop_product");
    } catch (e) {}
    if (!oid) return;
    if (paid !== "1" && !params.get("order_id")) return;

    var target = (skuHint && instances[skuHint]) || null;
    if (target) {
      target.resumeWithOrder(oid);
      return;
    }

    // 未知 sku：先拉订单再路由；失败则尝试每个实例的 session key
    window.WutuPay
      .pollOrder(oid, { maxMs: 120000, everyMs: 1500 })
      .then(function (order) {
        var pid = order.product || skuHint;
        var inst = pid && instances[pid];
        if (inst) {
          inst.resumeWithOrder(oid);
        } else if (instances.nenkin) {
          instances.nenkin.resumeWithOrder(oid);
        }
      })
      .catch(function () {
        var fallback = instances.challenge7 || instances.nenkin;
        if (fallback) fallback.resumeWithOrder(oid);
      });
  }

  tryResume();
})();
