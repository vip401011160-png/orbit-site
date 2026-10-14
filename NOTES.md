# 污兔360 宣传官网

**路径：** `/workspace/orbit-site/`  
**品牌：** 污兔酱 × 萝卜（公开页零实名）  
**日期：** 2026-10-14

## 内容

- 单页营销站：`index.html` + `styles.css` + `main.js`
- Demo：`demo/orbit-demo.mp4`（约 1.6MB）+ `demo/poster.jpg`
- 产品：360° 环绕 ¥7–9.9；年金清单 ¥9.9、壁纸包 Coming soon
- CTA：`#buy` 占位（面包多/自助开通后改链接）；另链 X `@wutujiang1999`
- 免责：AI / 不代办 / 不收集证件

## 部署

### A. GitHub Pages（本机已用 gh 登录时可一键）

```bash
cd /workspace/orbit-site
# 若尚未推送，见下方实际执行记录
```

预期 URL：`https://<user>.github.io/orbit-site/` 或仓库 Pages 设置里的地址。

### B. Cloudflare Pages

需 Node ≥ 22 + `wrangler login`（当前 box 为 Node 20，未登录 Cloudflare）。

```bash
npx wrangler pages project create orbit-site
npx wrangler pages deploy /workspace/orbit-site --project-name=orbit-site
```

得到 `https://orbit-site-xxxx.pages.dev` 后可填连连「店铺链接」。

## 合规自检

- [x] HTML 无真实姓名
- [x] 无存款/隐私数字
- [x] 无小红书来源表述

## Live

- **GitHub Pages:** https://vip401011160-png.github.io/orbit-site/
- **Repo:** https://github.com/vip401011160-png/orbit-site
- Cloudflare Pages: blocked on this box (Node 20; wrangler needs ≥22 + login). Optional later after `wrangler login`.

连连「店铺链接」可先填上述 github.io 地址。
