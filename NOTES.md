# 污兔酱的小窝

- Live: https://wutu360.surge.sh/
- Generate API: https://wutujiang-wutu-orbit-api-z1.hf.space (Gradio `/generate` + `generate_token`)
- Pay API: https://wutu-pay-gate.onrender.com
- Config: `api-config.js` → `ORBIT_API_BASE`；`pay-config.js` → `ORBIT_PAY_API`
- Flow: 先付再出片（¥9.9）；HF `REQUIRE_PAY=1`
- Deploy: `set -a; source /cursor/stores/store-3a113bd5-7954-4f4c-877c-9e90a4dc9511/secrets/surge-wutu360.env; set +a && npx --yes surge /workspace/orbit-site wutu360.surge.sh --token "$SURGE_TOKEN"`
- Brand: 污兔酱 × 萝卜 only. No legal name/email/QR on public page.
