# 前端支付闸门草稿（未上线）

**不要**把本目录直接部署到 Surge，等主人批准后再改 `main.js` / `index.html`。

## 目标流程

1. 选图 → 点「支付 ¥9.9 并生成」
2. `POST {PAY_API}/api/pay/create` → 得 `order_id` + `pay_url` / `url_qrcode`
3. 手机跳转 `pay_url`，或 PC 展示 `url_qrcode`
4. 回跳 `#buy?paid=1&order_id=...` 后轮询 `GET {PAY_API}/api/orders/{id}`
5. 拿到 `generate_token` 后调 HF `/generate`（上线后 HF 须校验 token）
6. 成片下载

## 配置

`pay-config.example.js` → 复制为站点根 `pay-config.js`（上线时）：

```js
window.ORBIT_PAY_API = "https://<你的支付后端公网域>";
window.ORBIT_PRICE_YUAN = "9.9";
```

`ORBIT_API_BASE` 仍指向 HF Space（出片）。
