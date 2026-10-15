/* 支付闸门前端片段草稿 — 未挂到 index.html。
   上线时：在 main.js 的 startGeneration 前插入「先付再出片」。
*/
(function (global) {
  var PAY_API = (global.ORBIT_PAY_API || "").replace(/\/$/, "");

  function createPayment() {
    if (!PAY_API) return Promise.reject(new Error("ORBIT_PAY_API not set"));
    return fetch(PAY_API + "/api/pay/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(t || "create pay failed"); });
      return r.json();
    });
  }

  function pollOrder(orderId, opts) {
    opts = opts || {};
    var maxMs = opts.maxMs || 180000;
    var every = opts.everyMs || 2000;
    var start = Date.now();
    return new Promise(function (resolve, reject) {
      function tick() {
        fetch(PAY_API + "/api/orders/" + encodeURIComponent(orderId))
          .then(function (r) { return r.json(); })
          .then(function (o) {
            if (o.status === "paid" && o.generate_token) {
              resolve(o);
              return;
            }
            if (o.status === "failed") {
              reject(new Error(o.error || "order failed"));
              return;
            }
            if (Date.now() - start > maxMs) {
              reject(new Error("等待支付超时"));
              return;
            }
            setTimeout(tick, every);
          })
          .catch(function (e) {
            if (Date.now() - start > maxMs) reject(e);
            else setTimeout(tick, every);
          });
      }
      tick();
    });
  }

  /** 选图后：创单 → 跳转收银台；回站后用 order_id 轮询拿 token。 */
  function startPayThenReturn() {
    return createPayment().then(function (res) {
      try {
        sessionStorage.setItem("wutu_pending_order", res.order_id);
      } catch (e) {}
      if (res.pay_url) {
        window.location.href = res.pay_url;
        return res;
      }
      // PC：调用方可展示 res.url_qrcode
      return res;
    });
  }

  function resumeAfterReturn() {
    var params = new URLSearchParams((location.hash.split("?")[1] || "") + "&" + (location.search || "").replace(/^\?/, ""));
    var oid = params.get("order_id") || sessionStorage.getItem("wutu_pending_order");
    if (!oid) return Promise.resolve(null);
    return pollOrder(oid);
  }

  global.WutuPay = {
    createPayment: createPayment,
    pollOrder: pollOrder,
    startPayThenReturn: startPayThenReturn,
    resumeAfterReturn: resumeAfterReturn,
  };
})(window);
