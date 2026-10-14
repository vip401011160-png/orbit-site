# 污兔福利小站

**路径：** `/workspace/orbit-site/`  
**品牌：** 污兔酱 × 萝卜（公开页零实名）  
**日期：** 2026-10-14

## Live（隐私优先）

- **Primary（对外）：** https://wutu360.surge.sh/  
  - 无邮箱 / GitHub 用户名 / 实名  
  - Surge 账号用 bot 邮箱 `vipvip@mail.grokbot.com`（非主人 Gmail）  
  - Token 仅存 bot store：`secrets/surge-wutu360.env`（勿提交公开仓库）
- **Backup（勿外发）：** https://vip401011160-png.github.io/orbit-site/  
  - GitHub Pages 保留作备份，**URL 含邮箱痕迹，不要填连连 / 不要发 X**  
  - Repo 暂不删除：https://github.com/vip401011160-png/orbit-site

## 内容

- 单页营销站：`index.html` + `styles.css` + `main.js`
- Demo：`demo/orbit-demo.mp4` + `demo/poster.jpg`
- 视觉：奶油底 + 胡萝卜强调色；精美卡片 / Hero 辉光 / 步骤卡（非极简留白）
- 区块：Hero · 亮点条 · 三步 · 价格 · CTA · 声明
- CTA：`#buy` 占位；另链 X `@wutujiang1999`
- CNAME：`wutu360.surge.sh`

## 合规 / 隐私

- [x] HTML 无真实姓名
- [x] 无证件 / 银行卡收集
- [x] 公开品牌仅「污兔酱 × 萝卜」
- [x] 对外主链不暴露 Gmail / vip401011160

## 再发布

```bash
set -a; source /cursor/stores/store-3a113bd5-7954-4f4c-877c-9e90a4dc9511/secrets/surge-wutu360.env; set +a
npx --yes surge /workspace/orbit-site wutu360.surge.sh --token "$SURGE_TOKEN"
```
