// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題（答え）は入れず、遊び方の例だけ（室内で 33℃・湿度30% と 30℃・湿度80%、暑さ指数が高いのは？）。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const line = (t, ok) => `<div style="position:relative;font-size:30px;font-weight:700;padding:10px ${ok ? "150px" : "20px"} 10px 20px;border-radius:12px;background:#fff;border:${ok ? "5px solid #b91c1c" : "3px solid #3b1f1255"}">${t}${ok ? `<span style="position:absolute;right:16px;top:50%;transform:translateY(-50%) rotate(-8deg);border:4px solid #7f1d1d;color:#7f1d1d;border-radius:8px;padding:0 10px;font-size:28px;font-weight:900">正解</span>` : ""}</div>`;
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:48px 64px;background:#fbf1e2;color:#3b1f12;display:flex;gap:48px;align-items:center">
    <div style="flex:0 0 420px">
      <div style="font-size:30px;color:#7f1d1d;letter-spacing:.06em">気温・湿度・日差しで変わる</div>
      <div style="font-size:84px;font-weight:900;margin-top:8px;line-height:1.15;color:#6b230c">暑さ指数<br><span style="color:#b91c1c">けいさん</span></div>
      <div style="font-size:36px;margin-top:14px">気温が3度低いのに<br>暑さ指数は上</div>
    </div>
    <div style="flex:1;background:#fffaf2;border:4px solid #3b1f12;border-radius:8px;overflow:hidden">
      <div style="font-size:30px;font-weight:700;padding:22px 20px 6px">🏠 室内　A：33℃・湿度30%　B：30℃・湿度80%。暑さ指数が高いのは？</div>
      <div style="display:flex;flex-direction:column;gap:10px;padding:16px">${line("Aのほうが高い")}${line("Bのほうが高い", 1)}${line("＝ 同じ")}</div>
    </div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
