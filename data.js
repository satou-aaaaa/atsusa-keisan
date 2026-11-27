// 暑さ指数けいさんの問題を作る（ブラウザと node の両方で使う）。
// 室内（日差しなし）の暑さ指数は、日本生気象学会「日常生活における熱中症予防指針 Ver.4」の「室内用のWBGT簡易推定図」の表をそのまま使う。
// 外（日かげ・日なた）は、環境省 熱中症予防情報サイトが実況推定値・予測値に使う式（小野ら 2014）で出した目安。
//   WBGT = 0.735×気温 + 0.0374×湿度 + 0.00292×気温×湿度 + 7.619×日射 − 4.557×日射² − 0.0572×風速 − 4.064
//   風速は 1m/秒、日かげは日射 0、日なたは 0.9 kW/m²（気象庁 東京 2025-08-05 12時の全天日射量 3.27 MJ/m² ≒ 0.91 kW/m²）とする。
// 段階は日常生活の指針（25・28・31）。運動の指針（21・25・28・31）とアラート（33・35）は決まりの問題とラボで扱う。
// 要点と引用は共有フォルダ games/atsusa-keisan-research.md（2026-11-27 に読んだ）。
// 扱うのは「数を出す・段階を当てる」だけ。場面の よい/よくない（暑さ指数よみ atsusa-shisu）は問わない。
// 乱数 R は同じ tag ならいつも同じ順で呼ぶ（sort の比較の中では引かない）。同じ tag なら、どの端末でも同じ問題になる。
// KINDS・言い回し・まちがいの選び肢は、足すだけでも過去の日の問題が変わる。公開したあとは変えず、変えるときは qa/run.mjs の PINS を作り直して PR に理由を書く。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];

  // 出典（画面の「なぜ」に出す）
  const SRC = {
    wbgt: ["環境省「暑さ指数(WBGT)について」", "https://www.wbgt.env.go.jp/wbgt.php"],
    obs: ["環境省「暑さ指数の実況と予測について」", "https://www.wbgt.env.go.jp/doc_observation.php"],
    detail: ["環境省「当サイトで提供する暑さ指数について」", "https://www.wbgt.env.go.jp/wbgt_detail.php"],
    alert: ["環境省「熱中症警戒アラート」", "https://www.wbgt.env.go.jp/about_alert.php"],
    salert: ["環境省「熱中症特別警戒アラート」", "https://www.wbgt.env.go.jp/about_special_alert.php"],
    manual: ["環境省「熱中症環境保健マニュアル」", "https://www.wbgt.env.go.jp/pdf/envman/5.pdf"],
    ver4: ["日本生気象学会「日常生活における熱中症予防指針 Ver.4」", "https://www.city.bunkyo.lg.jp/documents/2725/ver4.pdf"],
    jma: ["気象庁「過去の気象データ」東京 2025年8月5日", "https://www.data.jma.go.jp/stats/etrn/view/hourly_s1.php?prec_no=44&block_no=47662&year=2025&month=8&day=5&view="],
  };

  // 室内用のWBGT簡易推定図 Ver.4（日本生気象学会）。行＝気温 21〜40℃、列＝湿度 20,25,…,100%
  const ROWS = {
    40: "28 29 30 31 32 33 34 34 35 36 36 37 38 38 39 39 40",
    39: "27 28 29 30 31 32 33 33 34 35 35 36 37 37 38 38 39",
    38: "27 28 29 29 30 31 32 33 33 34 35 35 36 36 37 37 38",
    37: "26 27 28 29 29 30 31 32 32 33 34 34 35 35 36 36 37",
    36: "25 26 27 28 29 29 30 31 31 32 33 33 34 34 35 35 36",
    35: "24 25 26 27 28 28 29 30 30 31 32 32 33 33 34 34 35",
    34: "24 25 25 26 27 28 28 29 30 30 31 31 32 32 33 34 34",
    33: "23 24 25 25 26 27 27 28 29 29 30 30 31 31 32 33 33",
    32: "22 23 24 24 25 26 26 27 28 28 29 29 30 31 31 32 32",
    31: "21 22 23 24 24 25 26 26 27 27 28 29 29 30 30 31 31",
    30: "21 21 22 23 23 24 25 25 26 26 27 28 28 29 29 30 30",
    29: "20 21 21 22 23 23 24 24 25 26 26 27 27 28 28 29 29",
    28: "19 20 21 21 22 22 23 24 24 25 25 26 26 27 27 28 28",
    27: "18 19 20 20 21 22 22 23 23 24 24 25 25 26 26 27 27",
    26: "18 18 19 20 20 21 21 22 22 23 23 24 24 25 25 26 26",
    25: "17 17 18 19 19 20 20 21 21 22 22 23 23 24 24 25 25",
    24: "16 17 17 18 18 19 19 20 20 21 21 22 22 23 23 24 24",
    23: "15 16 16 17 18 18 19 19 20 20 20 21 21 22 22 23 23",
    22: "15 15 16 16 17 17 18 18 19 19 20 20 20 21 21 22 22",
    21: "14 14 15 15 16 16 17 17 18 18 19 19 19 20 20 21 21",
  };
  const TABLE = {};
  for (const t in ROWS) TABLE[t] = ROWS[t].split(" ").map(Number);
  const tableOf = (t, h) => (TABLE[t] && h >= 20 && h <= 100 && h % 5 === 0 ? TABLE[t][(h - 20) / 5] : NaN);

  // 外の目安：環境省が実況推定値・予測値に使う式（小野ら 2014）。風速 WS=1m/秒
  const WS = 1, SUN = 0.9;
  const ono = (t, h, sr, ws = WS) => 0.735 * t + 0.0374 * h + 0.00292 * t * h + 7.619 * sr - 4.557 * sr * sr - 0.0572 * ws - 4.064;

  // 場所：室内（表）・外の日かげ（日射0）・外の日なた（日射0.9kW/m²）
  const PLACES = {
    in: { id: "in", name: "室内（日差しなし）", short: "室内", icon: "🏠", how: "気温と湿度から読む表" },
    kg: { id: "kg", name: "外の日かげ", short: "日かげ", icon: "🌳", how: "環境省の推定式（日射0）の目安" },
    hn: { id: "hn", name: "外の日なた", short: "日なた", icon: "☀️", how: "環境省の推定式（日射0.9kW/m²）の目安" },
  };
  // 暑さ指数（小数のまま）。室内は表の数、外は式の数
  const raw = (pl, t, h) => (pl === "in" ? tableOf(t, h) : ono(t, h, pl === "hn" ? SUN : 0));
  // 画面に出す暑さ指数（整数。環境省の予測値と同じく小数点以下を四捨五入）
  const wbgt = (pl, t, h) => Math.round(raw(pl, t, h));

  // 2段目「この暑さ指数は、どの段階？」：日常生活の指針（日本生気象学会 Ver.4）。境目は 25・28・31
  const GROUPS = {
    s1: { name: "注意", sub: "25未満", n: "強い生活活動でおこる危険性" },
    s2: { name: "警戒", sub: "25以上28未満", n: "運動や激しい作業をする際は定期的に充分に休息を取り入れる" },
    s3: { name: "厳重警戒", sub: "28以上31未満", n: "外出時は炎天下を避け、室内では室温の上昇に注意する" },
    s4: { name: "危険", sub: "31以上", n: "外出はなるべく避け、涼しい室内に移動する" },
  };
  const grpOf = (w) => (w >= 31 ? "s4" : w >= 28 ? "s3" : w >= 25 ? "s2" : "s1");
  const gwhyOf = (w) => { const g = GROUPS[grpOf(w)]; return `暑さ指数${w}は「${g.name}」（${g.sub}）。${g.n}。`; };
  // 運動の指針（日本スポーツ協会）。境目は 21・25・28・31
  const SPORT = [[31, "運動は原則中止"], [28, "厳重警戒（激しい運動は中止）"], [25, "警戒（積極的に休憩）"], [21, "注意（積極的に水分補給）"], [-99, "ほぼ安全（適宜水分補給）"]];
  const sportOf = (w) => SPORT.find(([b]) => w >= b)[1];

  // part:ri:begin（shared-workflows の template/parts/data/ri.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  // part:ri:end
  // part:shuffle:begin（shared-workflows の template/parts/data/shuffle.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = ri(R, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  // part:shuffle:end
  // part:pickN:begin（shared-workflows の template/parts/data/pickN.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function pickN(R, a, n) { return shuffle(R, a).slice(0, n); }
  // part:pickN:end
  const MEDIA = { kazu: "数あて", kurabe: "くらべ", kihon: "暑さ指数のきほん", shishin: "指針とアラート" };

  // 問題の上の絵：場所の印・温度計・しずく。色だけにせず、気温と湿度を字で書く
  const BG = { in: "#efe6d6", kg: "#dcebd6", hn: "#ffe6b3" };
  function panel(x, w, pl, t, h, tag) {
    const P = PLACES[pl] || { icon: "🌡️" }, fill = Math.max(6, Math.min(52, (t - 15) * 2.2));
    return `<g transform="translate(${x},0)"><rect width="${w}" height="110" fill="${BG[pl] || "#f6e3c8"}"/>${tag ? `<text x="10" y="22" font-size="17" font-weight="900" fill="#3b1f12">${tag}</text>` : ""}`
      + `<text x="${w - 34}" y="28" font-size="22">${P.icon}</text>`
      + `<rect x="${tag ? 14 : 18}" y="32" width="12" height="60" rx="6" fill="#fff" stroke="#3b1f12" stroke-width="2"/><rect x="${tag ? 16 : 20}" y="${90 - fill}" width="8" height="${fill}" rx="4" fill="#c2410c"/><circle cx="${tag ? 20 : 24}" cy="94" r="8" fill="#c2410c" stroke="#3b1f12" stroke-width="2"/>`
      + `<text x="${tag ? 34 : 42}" y="${tag ? 58 : 56}" font-size="${tag ? 16 : 20}" font-weight="900" fill="#3b1f12">気温${t}℃</text>`
      + `<path d="M${tag ? 40 : 48} ${tag ? 72 : 70} q6 8 0 14 q-6 -6 0 -14z" fill="#2563a8"/><text x="${tag ? 52 : 62}" y="${tag ? 86 : 86}" font-size="${tag ? 16 : 20}" font-weight="900" fill="#1e3a5f">湿度${h}%</text></g>`;
  }
  const sceneSvg = (pl, t, h) => `<svg viewBox="0 0 320 110" role="img" aria-label="${PLACES[pl].name}。気温${t}℃、湿度${h}%">${panel(0, 320, pl, t, h)}<text x="300" y="104" text-anchor="end" font-size="13" font-weight="700" fill="#3b1f12">${PLACES[pl].name}</text></svg>`;
  const labSvg = (t, h) => `<svg viewBox="0 0 320 110" role="img" aria-label="気温${t}℃、湿度${h}%">${panel(0, 320, "lab", t, h)}</svg>`;
  const pairSvg = (a, b) => `<svg viewBox="0 0 320 110" role="img" aria-label="A：${PLACES[a.pl].name}、気温${a.t}℃、湿度${a.h}%。B：${PLACES[b.pl].name}、気温${b.t}℃、湿度${b.h}%">${panel(0, 158, a.pl, a.t, a.h, "A")}${panel(162, 158, b.pl, b.t, b.h, "B")}<rect x="158" width="4" height="110" fill="#3b1f12"/></svg>`;

  const HS = (lo, hi) => { const a = []; for (let h = lo; h <= hi; h += 5) a.push(h); return a; };
  const rangeOf = (pl) => (pl === "in" ? { t: [21, 40], h: HS(20, 100) } : { t: [24, 38], h: HS(30, 90) });
  const where = (pl, t, h) => `${PLACES[pl].name}・気温${t}℃・湿度${h}%`;

  // ---- 数あて：場所と気温は種類で決まり、湿度は種で変わる。選び肢は答えから同じ間をあけた数 ----
  const NSIT = [
    (s) => `${s}。暑さ指数はいくつ？`,
    (s) => `${s}。この場所の暑さ指数は？`,
    (s) => `暑さ指数を出そう。${s}。`,
    (s) => `${s}のとき、暑さ指数はどれ？`,
  ];
  const STEP = [4, 3, 2], NOPT = [3, 4, 4];
  function num(pl, t) {
    return (R, lv) => {
      const hs = rangeOf(pl).h, h = hs[ri(R, 0, hs.length - 1)], w = wbgt(pl, t, h), n = NOPT[lv], at = ri(R, 0, n - 1), si = ri(R, 0, NSIT.length - 1);
      const opts = []; for (let j = 0; j < n; j++) opts.push(`暑さ指数 ${w + (j - at) * STEP[lv]}`);
      const ref = pl === "in" ? `同じ気温で湿度100%なら${t}。湿度が10%下がるごとに約1〜1.5下がります。`
        : pl === "kg" ? `同じ気温・湿度の室内（表）では${tableOf(t, h)}。日かげはそれに近い目安です。`
        : `同じ気温・湿度の日かげなら約${wbgt("kg", t, h)}。日なたはそれより約3高い目安です。`;
      const why = `${where(pl, t, h)}の暑さ指数は${pl === "in" ? "" : "約"}${w}（${PLACES[pl].how}）。気温${t}℃とは別の数です。`;
      return { type: "act", media: MEDIA.kazu, q: NSIT[si](where(pl, t, h)), opts, ans: `暑さ指数 ${w}`, grp: grpOf(w), gwhy: gwhyOf(w), why, key: ref, svg: sceneSvg(pl, t, h),
        items: [{ pl, t, h, w, me: true }], v: `${si}:${h}:${at}` };
    };
  }
  const LOOK = { in: "湿度100%なら、暑さ指数は気温と同じ。湿度が下がるほど低くなります。", kg: "日かげは、日差しのない室内の表に近い値です。", hn: "日なたは、同じ気温・湿度の日かげより約3高くなります。" };
  const N = (lv, pl, t) => ({ id: `n${pl}${t}`, lv, col: "kazu", name: `${PLACES[pl].short}・気温${t}℃の暑さ指数`, look: LOOK[pl], key: LOOK[pl], why: "", src: pl === "in" ? ["ver4", "wbgt"] : pl === "kg" ? ["detail", "ver4"] : ["detail", "jma"], make: num(pl, t), pl, t });

  // ---- くらべ：A と B、暑さ指数が高いのは？ 気温が d 度低いほうが、湿度や日差しで上になることがある（核の一言「3度低いのに上」）----
  // 組は前もって全部作り、そこから種で選ぶ。先に答えの形（低いほうが上・高いほうが上・同じ）を同じ割合で選んでから組を選ぶ（「低いのに上」がたまにしか出ないのを防ぐ）。ちがいが小さすぎる組（1.5未満で、整数にしても同じでない）は出さない
  const CANS = { a: "Aのほうが高い", b: "Bのほうが高い", e: "＝ 同じ" };
  const CSIT = ["AとB、暑さ指数が高いのは？", "暑さ指数が上なのは、AとBのどっち？", "AとBの暑さ指数をくらべると？", "熱中症に気をつけたいのは、暑さ指数が高いほう。どっち？"];
  const POOLS = {};
  function pairs(id, plHot, plCool, d, lv) {
    if (POOLS[id + lv]) return POOLS[id + lv];
    const out = [], rh = rangeOf(plHot), rc = rangeOf(plCool), lo = Math.max(rh.t[0], rc.t[0] + d), hi = Math.min(rh.t[1], rc.t[1] + d);
    for (let t = lo; t <= hi; t++) for (const hh of rh.h) for (const hc of rc.h) {
      const x = raw(plHot, t, hh), y = raw(plCool, t - d, hc), wx = Math.round(x), wy = Math.round(y), df = Math.abs(x - y);
      const same = wx === wy && df < 0.5, clear = df >= (lv === 0 ? 2.5 : 1.5);
      if (lv === 0 ? !clear : !(same || clear)) continue;
      out.push({ t, hh, hc, wx, wy, c: same ? "e" : x > y ? "hot" : "cool" });
    }
    return (POOLS[id + lv] = out);
  }
  function cmpq(id, plHot, plCool, d) {
    return (R, lv) => {
      const all = pairs(id, plHot, plCool, d, lv), cls = ["cool", "hot", "e"].filter((c) => all.some((x) => x.c === c)), c0 = cls[ri(R, 0, cls.length - 1)], pool = all.filter((x) => x.c === c0), p = pool[ri(R, 0, pool.length - 1)], flip = ri(R, 0, 1) === 1, si = ri(R, 0, CSIT.length - 1);
      const hot = { pl: plHot, t: p.t, h: p.hh, w: p.wx }, cool = { pl: plCool, t: p.t - d, h: p.hc, w: p.wy }, A = flip ? cool : hot, B = flip ? hot : cool;
      const ans = p.c === "e" ? CANS.e : (p.c === "hot") !== flip ? CANS.a : CANS.b, top = Math.max(p.wx, p.wy);
      const tag = (x) => (x === A ? "A" : "B"), wv = (x) => `${x.pl === "in" ? "" : "約"}${x.w}`;
      const why = `A（${PLACES[A.pl].short}・${A.t}℃・${A.h}%）は${wv(A)}、B（${PLACES[B.pl].short}・${B.t}℃・${B.h}%）は${wv(B)}。`
        + (p.c === "cool" ? `${tag(cool)}は${d}度低いのに上です。` : p.c === "e" ? "気温がちがっても同じです。" : `${tag(hot)}が気温も暑さ指数も上です。`);
      return { type: "act", media: MEDIA.kurabe, q: CSIT[si], say: `A：${where(A.pl, A.t, A.h)}。B：${where(B.pl, B.t, B.h)}。`, opts: [CANS.a, CANS.b, CANS.e], ans, grp: grpOf(top), gwhy: gwhyOf(top), why, svg: pairSvg(A, B),
        items: [{ ...A, tag: "A", me: true }, { ...B, tag: "B", vs: true }], v: `${si}:${p.t}.${p.hh}.${p.hc}:${flip ? 1 : 0}` };
    };
  }
  const CLOOK = "暑さ指数は、気温より湿度を重く数えます（湿球温度が0.7）。";
  const CKEY = "表では、気温1℃で約1、湿度10%で約1〜1.5ちがいます。";
  const C = (id, lv, plHot, plCool, d, name, look = CLOOK, key = CKEY) => ({ id, lv, col: "kurabe", name, look, key, why: "", src: plHot === "in" && plCool === "in" ? ["ver4", "wbgt"] : ["detail", "ver4"], make: cmpq(id, plHot, plCool, d), pl: plHot, d });

  // ---- 決まりの問題 ----
  function fact(sit, ans, ws) {
    return (R, lv) => {
      const si = ri(R, 0, sit.length - 1), ds = pickN(R, ws, lv === 0 ? 2 : 3);
      return { type: "fact", media: "", q: sit[si], opts: shuffle(R, [ans, ...ds]), ans, v: `${si}:${ds.map((d) => ws.indexOf(d)).join(".")}` };
    };
  }
  const F = (id, lv, col, src, name, look, key, why, sit, ans, ws) => ({ id, lv, col, name, look, key, why, src: [src], make: fact(sit, ans, ws), fact: true, fans: ans });

  const KINDS = [
    // ---- やさしい ----
    N(0, "in", 28), N(0, "in", 33), N(0, "in", 36), N(0, "kg", 31), N(0, "hn", 30),
    C("cin3", 0, "in", "in", 3, "室内：3度低いのに上？"),
    F("yoso", 0, "kihon", "wbgt", "暑さ指数の3つの要素", "気温だけではありません。", "暑さ指数は、湿度・日射などの熱・気温の3つを取り入れます。",
      "環境省は、①湿度、②日射・輻射など周辺の熱環境、③気温の3つを取り入れた指標と説明しています。",
      ["暑さ指数が取り入れている3つは？", "暑さ指数（WBGT）は、何を取り入れた数？", "暑さ指数のもとになる3つの要素は？"], "湿度・日射などの熱・気温", ["気温だけ", "気温・風・雲の量", "気圧・雨の量・気温", "風・雨・雲の量"]),
    F("alert33", 0, "shishin", "alert", "熱中症警戒アラートは33", "危険（31以上）より上の数です。", "府県予報区などのどこかで暑さ指数33が予測されると、熱中症警戒アラートが出ます。",
      "環境省は、府県予報区等内のいずれかの地点で日最高の暑さ指数が33（予測値）に達すると予測される場合に出すとしています。",
      ["熱中症警戒アラートが出る暑さ指数は？", "暑さ指数がいくつになりそうだと、熱中症警戒アラート？", "熱中症警戒アラートの目安の数は？"], "33", ["21", "25", "28", "40"]),
    F("kiken31", 0, "shishin", "wbgt", "日常生活の「危険」は31以上", "28は厳重警戒の始まりです。", "日常生活の指針では、暑さ指数31以上が「危険」です。",
      "日常生活の指針（日本生気象学会）では、31以上が危険。高齢者は安静にしていても熱中症になる危険が大きいとされます。",
      ["日常生活の指針で「危険」になる暑さ指数は？", "暑さ指数がいくつから「危険」？", "外出はなるべく避けたい「危険」は、暑さ指数いくつから？"], "31以上", ["21以上", "25以上", "28以上", "40以上"]),
    F("h100", 0, "kihon", "ver4", "室内で湿度100%なら気温と同じ", "表のいちばん右の列です。", "日差しのない室内で湿度100%なら、暑さ指数は気温と同じ数です。",
      "室内用の表では、湿度100%の列は気温と同じ数です（30℃なら30）。湿度が下がるほど低くなります。",
      ["日差しのない室内。湿度100%なら、暑さ指数は？", "室内の表で、湿度100%の暑さ指数は？", "湿度100%の室内。暑さ指数と気温の関係は？"], "気温と同じ", ["気温より10低い", "いつも0", "気温の2倍", "気温より10高い"]),
    // ---- ふつう ----
    N(1, "in", 25), N(1, "in", 30), N(1, "in", 38), N(1, "kg", 28), N(1, "kg", 34), N(1, "hn", 27), N(1, "hn", 33),
    C("cin2", 1, "in", "in", 2, "室内：2度低いのに上？"),
    C("ckg3", 1, "kg", "kg", 3, "日かげ：3度低いのに上？"),
    C("chn3", 1, "in", "hn", 3, "室内と日なた：3度低いのに上？", "日なたは、日差しのぶん高くなります。", "日なたは、同じ気温・湿度の日かげより約3高い目安です。"),
    F("alert35", 1, "shishin", "salert", "特別警戒アラートは35", "警戒アラート（33）より上です。", "熱中症特別警戒アラートは、暑さ指数35がめやすです。",
      "環境省は、都道府県内の全ての地点で翌日の日最高の暑さ指数が35（予測値）に達する場合などに、特別警戒アラートを出すとしています。",
      ["熱中症特別警戒アラートの目安の暑さ指数は？", "特別警戒アラートは、暑さ指数がいくつに達するとき？", "いちばん強い熱中症のアラートの数は？"], "35", ["25", "28", "31", "45"]),
    F("w07", 1, "kihon", "obs", "いちばん重いのは湿球温度（0.7）", "湿度の影響を表す温度です。", "暑さ指数の式では、湿球温度に0.7をかけます。",
      "屋外の式は 0.7×湿球温度＋0.2×黒球温度＋0.1×乾球温度。湿度の影響を表す湿球温度をいちばん重く数えます。",
      ["暑さ指数の式で、いちばん重く数える（0.7倍）のは？", "暑さ指数の式で、0.7をかけるのはどれ？", "暑さ指数にいちばん効くと式で決まっているのは？"], "湿球温度", ["黒球温度", "乾球温度（気温）", "風速", "気圧"]),
    F("sport31", 1, "shishin", "wbgt", "運動は31以上で原則中止", "日常生活の「危険」と同じ境目です。", "運動の指針では、暑さ指数31以上で運動は原則中止です。",
      "運動に関する指針（日本スポーツ協会）では、31以上は「運動は原則中止」。特に子どもは中止すべきとされます。",
      ["運動の指針で「運動は原則中止」になる暑さ指数は？", "暑さ指数がいくつから、運動は原則中止？", "運動に関する指針で、運動をやめる目安は？"], "31以上", ["21以上", "25以上", "28以上", "35以上"]),
    F("tani", 1, "kihon", "wbgt", "単位は℃でも、気温とはちがう", "同じ℃でも、別の数です。", "暑さ指数は℃で表しますが、値は気温とは異なります。",
      "環境省は、単位は気温と同じ摂氏度（℃）でも、その値は気温とは異なると説明しています。",
      ["暑さ指数の単位と値について、正しいのは？", "暑さ指数の「℃」について、正しいのは？", "暑さ指数28と気温28℃。正しいのは？"], "℃で表すが、気温とはちがう", ["気温と同じ数になる", "単位は％", "単位はワット", "単位はメートル"]),
    F("hiza", 1, "kihon", "wbgt", "日なたが高いのは日射のため", "黒球温度で測るものです。", "同じ気温・湿度でも、日射（日差しや照り返し）があると暑さ指数は上がります。",
      "暑さ指数は日射・輻射など周辺の熱環境も取り入れます。日なたでは黒球温度が上がり、暑さ指数も上がります。",
      ["同じ気温・湿度で、日なたの暑さ指数が高いわけは？", "日かげより日なたの暑さ指数が高くなるのは、何のため？", "日なたで暑さ指数を上げているのは？"], "日射（日差しや照り返し）", ["気圧", "雨の量", "時計の時刻", "雲の名前"]),
    // ---- むずかしい ----
    N(2, "in", 23), N(2, "in", 35), N(2, "in", 40), N(2, "kg", 36), N(2, "hn", 25), N(2, "hn", 36),
    C("cin5", 2, "in", "in", 5, "室内：5度低いのに上？"),
    C("chn3b", 2, "hn", "hn", 3, "日なた：3度低いのに上？"),
    C("ckh5", 2, "kg", "hn", 5, "日かげと日なた：5度低いのに上？", "日なたは、日差しのぶん高くなります。", "日なたは、同じ気温・湿度の日かげより約3高い目安です。"),
    F("shikigai", 2, "kihon", "obs", "屋外の式", "0.7・0.2・0.1を足すと1です。", "屋外の暑さ指数＝0.7×湿球温度＋0.2×黒球温度＋0.1×乾球温度。",
      "環境省の屋外の算出式は 0.7×湿球温度＋0.2×黒球温度＋0.1×乾球温度です。",
      ["屋外の暑さ指数の算出式は？", "日差しのある屋外で暑さ指数を出す式は？", "環境省の、屋外の暑さ指数の式は？"], "0.7×湿球＋0.2×黒球＋0.1×乾球", ["0.1×湿球＋0.2×黒球＋0.7×乾球", "0.7×乾球＋0.3×黒球", "0.5×湿球＋0.5×乾球", "0.2×湿球＋0.7×黒球＋0.1×乾球"]),
    F("shikinai", 2, "kihon", "obs", "屋内の式", "乾球温度は入りません。", "屋内の暑さ指数＝0.7×湿球温度＋0.3×黒球温度。",
      "環境省の屋内の算出式は 0.7×湿球温度＋0.3×黒球温度です。日射の無い室内では黒球温度が気温に近くなります。",
      ["屋内の暑さ指数の算出式は？", "日差しのない屋内で暑さ指数を出す式は？", "環境省の、屋内の暑さ指数の式は？"], "0.7×湿球＋0.3×黒球", ["0.3×湿球＋0.7×黒球", "0.7×乾球＋0.3×湿球", "0.5×湿球＋0.5×黒球", "1.0×乾球"]),
    F("y1954", 2, "kihon", "wbgt", "1954年にアメリカで提案", "70年ほど前です。", "暑さ指数（WBGT）は、1954年にアメリカで提案された指標です。",
      "環境省は、暑さ指数は熱中症を予防することを目的として1954年にアメリカで提案された指標と説明しています。",
      ["暑さ指数（WBGT）が提案されたのは？", "暑さ指数はいつ・どこで提案された？", "熱中症を防ぐための暑さ指数。始まりは？"], "1954年・アメリカ", ["2004年・日本", "1904年・イギリス", "1984年・ドイツ", "2020年・フランス"]),
    F("hyo", 2, "kihon", "ver4", "表が使えるのは日差しのない室内だけ", "日射があると、表より高くなります。", "気温と湿度から読む表は、日射のない室内専用です。",
      "日本生気象学会の室内用の表は「日射のない室内専用」で、屋外や、日射や発熱体のある室内では使えません。",
      ["気温と湿度から読む室内用の表。使えないのは？", "室内用の暑さ指数の表を使ってはいけない所は？", "気温と湿度だけで読む表が合わないのは？"], "日差しのある屋外", ["湿度が高い室内", "風の弱い室内", "気温30℃の室内", "夜の室内（日射なし）"]),
    F("anzen21", 2, "shishin", "wbgt", "運動の「ほぼ安全」は21未満", "注意（21〜25）より下です。", "運動の指針では、暑さ指数21未満が「ほぼ安全（適宜水分補給）」です。",
      "運動に関する指針では、21未満は「ほぼ安全」ですが、市民マラソンなどではこの条件でも熱中症が起こることがあります。",
      ["運動の指針で「ほぼ安全」になる暑さ指数は？", "暑さ指数がいくつより下なら、運動は「ほぼ安全」？", "運動に関する指針のいちばん下の段階は？"], "21未満", ["25未満", "28未満", "31未満", "15未満"]),
  ];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);

  // part:seedOf:begin（shared-workflows の template/parts/data/seedOf.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // part:seedOf:end
  // part:rng:begin（shared-workflows の template/parts/data/rng.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // part:rng:end

  // 1問を作る。tag は「種類|種」（例 "nin33|2026-11-27:d0"）。同じ tag ならいつも同じ問題
  function make(tag) {
    const [kind] = String(tag).split("|"), k = Object.prototype.hasOwnProperty.call(BY, kind) ? BY[kind] : null;
    if (!k) return null;
    const p = k.make(rng(seedOf(tag)), k.lv);
    return { tag, kind, lv: k.lv, name: k.name, look: k.look, key: k.key, why: k.why, grp: null, gwhy: "", svg: "", items: null, say: "", ...p, media: p.media || MEDIA[k.col], src: (p.src || k.src).map((s) => SRC[s]) };
  }
  // 同じ問題かどうか：問い・選び肢（並びは問わない）・場面（場所・気温・湿度）が同じなら同じ（とことんで2度出さない。PR #1 の CodeRabbit）
  const keyOf = (P) => `${P.kind}:${P.q}:${P.opts.slice().sort().join("/")}:${(P.items || []).map((x) => `${x.pl}${x.t}-${x.h}`).join(",")}`;

  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }

  const AKK = { KINDS, BY, GROUPS, LV, SRC, MEDIA, PLACES, TABLE, WS, SUN, SPORT, CANS, tableOf, ono, raw, wbgt, grpOf, sportOf, rangeOf, pairs, kindsOf, seedOf, rng, make, keyOf, dailyTags, hardTags, pickN, sceneSvg, pairSvg, labSvg };
  if (typeof module !== "undefined" && module.exports) module.exports = AKK; else root.AKK = AKK;
})(typeof self !== "undefined" ? self : this);
