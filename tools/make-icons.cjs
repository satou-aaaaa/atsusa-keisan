// アプリのアイコン（icon-192.png・icon-512.png）を作る。焦げ茶の地に、温度計と湿度のしずく（暑さ指数）。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#6b230c"/>
      <circle cx="74" cy="24" r="12" fill="#fbbf24"/>
      <rect x="30" y="16" width="16" height="54" rx="8" fill="#fffaf2"/><rect x="34" y="34" width="8" height="40" rx="4" fill="#ef4444"/><circle cx="38" cy="76" r="12" fill="#ef4444" stroke="#fffaf2" stroke-width="4"/>
      <path d="M70 50 q10 14 0 24 q-10 -10 0 -24z" fill="#7fc4ef"/></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
