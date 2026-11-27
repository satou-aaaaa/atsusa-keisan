// 暑さ指数けいさんの検査。表と式の検算（日本生気象学会の室内の表を別に書き写したもの・環境省の推定式を別に書いたもの）・
// 問題の作り方（全種類×3000問：選び肢・答えは1つ・答えと2段目が表と式どおり・出典がある）・今日の5問と上級の組み方（3年分）・
// とことんの並び・通しで遊ぶ・まちがい・ヒント・続きから・上級・練習・とことん・まなび帳・実績・カレンダー・あとから・
// 気温と湿度を動かす・物差し・文字の大きさ・言い方（目安であること）・スマホ幅・PWA・引き継ぎ・見やすさを確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";
import { checkSwStall } from "./sw-check.mjs";
import { checkDepth } from "./depth-check.mjs";
import { checkCore } from "./core-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 400) });
const firstClose = async (q) => { if (await q.locator("#howto[open]").count()) await q.click("#howto-ok"); if (await q.evaluate(() => !!(window.Core && Core.coach && Core.coach.active()))) { await q.evaluate(() => { Core.coach.leave(); scrollTo(0, 0); }); await q.waitForTimeout(100); } }; // はじめての練習の吹き出しをやめてホームへ（sync-template の migrateFirstQa が足した）
const G = createRequire(import.meta.url)(path.join(root, "data.js"));

const PINS = "cin3:3:29.75.60:0:1rhch2e,nin36:1:95:2:i1cc1b,nkg28:3:55:1:195q2rs,nhn33:2:55:0:19btjki,nhn25:1:45:1:mg632b,nhn36:0:85:0:hrj4rb,y1954:1:1.2.3:1yh584p,shikinai:1:1.3.0:1260sjm;nin33:2:70:0:1jbgb4y,alert33:0:2.3:j9fmbp,nkg34:1:35:0:hgmiym,nhn33:3:75:1:1g7bc71,shikigai:1:3.1.2:1pq5xtx,nin35:3:80:1:lhcc4,nkg36:1:60:1:1dmyrj3,nhn36:0:85:0:hrj4rb;nhn30:0:45:0:1oschg2,nin33:0:85:0:1cxsd5w,chn3:3:34.90.75:1:1ib2vgf,cin2:3:25.30.75:0:1ib2vgf,hyo:0:0.3.2:nnei8i,nkg36:3:40:2:kb1xg3,nin23:0:40:2:18bemil,nhn36:2:90:0:77smft"; // 過去の日の問題の印（変わったら過去の日の問題が変わった印。種類・言い方・選び肢は足すだけでも変わる）
// ---- 1. 問題の作り方（ブラウザを使わない）----
// 室内用のWBGT簡易推定図 Ver.4（日本生気象学会「日常生活における熱中症予防指針 Ver.4」 https://www.city.bunkyo.lg.jp/documents/2725/ver4.pdf ）。
// data.js とは別に書き写した（2026-11-27 に読んだ。共有フォルダ games/atsusa-keisan-research.md）。行＝気温、列＝湿度 20,25,…,100%
const TBL = {
  40: [28, 29, 30, 31, 32, 33, 34, 34, 35, 36, 36, 37, 38, 38, 39, 39, 40], 39: [27, 28, 29, 30, 31, 32, 33, 33, 34, 35, 35, 36, 37, 37, 38, 38, 39],
  38: [27, 28, 29, 29, 30, 31, 32, 33, 33, 34, 35, 35, 36, 36, 37, 37, 38], 37: [26, 27, 28, 29, 29, 30, 31, 32, 32, 33, 34, 34, 35, 35, 36, 36, 37],
  36: [25, 26, 27, 28, 29, 29, 30, 31, 31, 32, 33, 33, 34, 34, 35, 35, 36], 35: [24, 25, 26, 27, 28, 28, 29, 30, 30, 31, 32, 32, 33, 33, 34, 34, 35],
  34: [24, 25, 25, 26, 27, 28, 28, 29, 30, 30, 31, 31, 32, 32, 33, 34, 34], 33: [23, 24, 25, 25, 26, 27, 27, 28, 29, 29, 30, 30, 31, 31, 32, 33, 33],
  32: [22, 23, 24, 24, 25, 26, 26, 27, 28, 28, 29, 29, 30, 31, 31, 32, 32], 31: [21, 22, 23, 24, 24, 25, 26, 26, 27, 27, 28, 29, 29, 30, 30, 31, 31],
  30: [21, 21, 22, 23, 23, 24, 25, 25, 26, 26, 27, 28, 28, 29, 29, 30, 30], 29: [20, 21, 21, 22, 23, 23, 24, 24, 25, 26, 26, 27, 27, 28, 28, 29, 29],
  28: [19, 20, 21, 21, 22, 22, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28], 27: [18, 19, 20, 20, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27],
  26: [18, 18, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26], 25: [17, 17, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25],
  24: [16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24], 23: [15, 16, 16, 17, 18, 18, 19, 19, 20, 20, 20, 21, 21, 22, 22, 23, 23],
  22: [15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20, 21, 21, 22, 22], 21: [14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 19, 20, 20, 21, 21],
};
const tb = (t, h) => TBL[t][(h - 20) / 5];
// 外の目安：環境省「当サイトで提供する暑さ指数について」 https://www.wbgt.env.go.jp/wbgt_detail.php の推定式（小野ら 2014）。ゲームとは別に書いた
// WBGT = 0.735×Ta + 0.0374×RH + 0.00292×Ta×RH + 7.619×SR − 4.557×SR² − 0.0572×WS − 4.064（風速1m/秒、日かげ SR=0、日なた SR=0.9）
// 日なたの 0.9 kW/m²：気象庁 東京 2025-08-05 12時の全天日射量 3.27 MJ/m²（1時間）÷3.6 ≒ 0.91
const est = (t, h, sr) => 0.735 * t + 0.0374 * h + 0.00292 * t * h + 7.619 * sr - 4.557 * sr * sr - 0.0572 * 1 - 4.064;
const wb = (pl, t, h) => Math.round(pl === "in" ? tb(t, h) : est(t, h, pl === "hn" ? 0.9 : 0));
const stage = (w) => (w >= 31 ? "s4" : w >= 28 ? "s3" : w >= 25 ? "s2" : "s1");
// 決まりの問題の答え（環境省・日本生気象学会の資料）
const FACT = { yoso: "湿度・日射などの熱・気温", alert33: "33", kiken31: "31以上", h100: "気温と同じ", alert35: "35", w07: "湿球温度", sport31: "31以上", tani: "℃で表すが、気温とはちがう", hiza: "日射（日差しや照り返し）", shikigai: "0.7×湿球＋0.2×黒球＋0.1×乾球", shikinai: "0.7×湿球＋0.3×黒球", y1954: "1954年・アメリカ", hyo: "日差しのある屋外", anzen21: "21未満" };
// くらべの種類：[暑いほうの場所, 低いほうの場所, 気温の差]
const CMP = { cin3: ["in", "in", 3], cin2: ["in", "in", 2], ckg3: ["kg", "kg", 3], chn3: ["in", "hn", 3], cin5: ["in", "in", 5], chn3b: ["hn", "hn", 3], ckh5: ["kg", "hn", 5] };
const SRCOK = /^https:\/\/(www\.wbgt\.env\.go\.jp\/|www\.city\.bunkyo\.lg\.jp\/documents\/|www\.data\.jma\.go\.jp\/stats\/)/;
{
  let tbad = [];
  for (let t = 21; t <= 40; t++) for (let h = 20; h <= 100; h += 5) if (G.tableOf(t, h) !== tb(t, h)) tbad.push(`${t}/${h}`);
  check("表の検算：data.js の室内の表が、別に書き写した日本生気象学会の表（気温21〜40℃×湿度20〜100%）と全部同じ・湿度100%は気温と同じ・気温にも湿度にも下がらない", tbad.length === 0 && Object.keys(TBL).every((t) => TBL[t][16] === +t && TBL[t].every((v, i) => !i || v >= TBL[t][i - 1]) && (+t === 21 || TBL[t].every((v, i) => v >= TBL[t - 1][i]))), tbad.slice(0, 5).join(","));
  let mx = 0; for (let t = 21; t <= 40; t++) for (let h = 20; h <= 100; h += 5) mx = Math.max(mx, Math.abs(est(t, h, 0) - tb(t, h)));
  check("式の検算：環境省の推定式（日射0・風1m/秒）は、室内の表と全部の升で1.5以内（日かげの目安が表と合う）", mx <= 1.5, `最大のちがい ${mx.toFixed(2)}`);
  check("式の検算：data.js の式が別に書いた式と同じ（30℃・60% 日かげ約25.4・日なた約28.6、35℃・60% 日なた約33.2）・日なたは日かげより約3.2高い", ["kg", "hn"].every((pl) => [[24, 30], [30, 60], [35, 60], [38, 90]].every(([t, h]) => Math.abs(G.raw(pl, t, h) - est(t, h, pl === "hn" ? 0.9 : 0)) < 1e-9)) && Math.abs(est(30, 60, 0) - 25.43) < 0.01 && Math.abs(est(30, 60, 0.9) - 28.59) < 0.01 && Math.abs(est(35, 60, 0.9) - 33.15) < 0.01 && Math.abs(est(30, 60, 0.9) - est(30, 60, 0) - 3.166) < 0.01);
  check("核の一言：室内で33℃・湿度30%は25（警戒）、30℃・湿度80%は28（厳重警戒）。3度低いのに上", G.wbgt("in", 33, 30) === 25 && G.wbgt("in", 30, 80) === 28 && G.grpOf(25) === "s2" && G.grpOf(28) === "s3" && tb(33, 30) === 25 && tb(30, 80) === 28);
  check("段階の境目（25・28・31）と運動の指針（21・25・28・31）", [[24, "s1"], [25, "s2"], [27, "s2"], [28, "s3"], [30, "s3"], [31, "s4"]].every(([w, g]) => G.grpOf(w) === g) && G.sportOf(31) === "運動は原則中止" && G.sportOf(20) === "ほぼ安全（適宜水分補給）" && G.sportOf(21).startsWith("注意") && Object.keys(G.GROUPS).join() === "s1,s2,s3,s4");
  const bad = {}, seen = {}, N = 3000;
  for (const k of G.KINDS) {
    seen[k.id] = new Set();
    for (let s = 0; s < N; s++) {
      const P = G.make(`${k.id}|qa${s}`), why = [];
      const n = CMP[k.id] ? 3 : k.lv === 0 ? 3 : 4;
      if (P.opts.length !== n || new Set(P.opts).size !== n || !P.opts.includes(P.ans)) why.push(`選び肢が${n}つちがう・答えを含まない`);
      if ([P.q, P.media, P.why, P.key, P.look, ...P.opts].some((x) => typeof x !== "string" || !x || /undefined|NaN|null|\$\{|＠/.test(x))) why.push("中身が空");
      if (/^n(in|kg|hn)\d+$/.test(k.id)) {
        const pl = k.id.slice(1, 3), t = Number(k.id.slice(3)), it = P.items[0], w = wb(pl, t, it.h);
        if (it.pl !== pl || it.t !== t || P.ans !== `暑さ指数 ${w}`) why.push("答えが表・式とちがう");
        if (it.w !== w) why.push("物差しの数が表・式とちがう");
        if (P.grp !== stage(w)) why.push("2段目が表・式とちがう");
        if (!P.q.includes(`気温${t}℃`) || !P.q.includes(`湿度${it.h}%`) || !P.q.includes(G.PLACES[pl].name)) why.push("問いに場所・気温・湿度が無い");
        const ns = P.opts.map((o) => Number(o.replace("暑さ指数 ", ""))).sort((a, b) => a - b);
        if (ns.some((v, i) => i && v - ns[i - 1] !== [4, 3, 2][k.lv]) || ns[0] < 5) why.push("選び肢の間がちがう");
        if (pl === "in" ? it.h < 20 || it.h > 100 : it.h < 30 || it.h > 90) why.push("湿度の幅の外");
      } else if (CMP[k.id]) {
        const [a, b] = P.items, wa = wb(a.pl, a.t, a.h), wbb = wb(b.pl, b.t, b.h), [ph, pc, d] = CMP[k.id];
        const ra = a.pl === "in" ? tb(a.t, a.h) : est(a.t, a.h, a.pl === "hn" ? 0.9 : 0), rb = b.pl === "in" ? tb(b.t, b.h) : est(b.t, b.h, b.pl === "hn" ? 0.9 : 0);
        const exp = wa === wbb && Math.abs(ra - rb) < 0.5 ? "＝ 同じ" : Math.abs(ra - rb) >= (k.lv === 0 ? 2.5 : 1.5) ? (ra > rb ? "Aのほうが高い" : "Bのほうが高い") : "?";
        if (exp === "?") why.push("どちらとも言いにくい組");
        else if (P.ans !== exp) why.push("答えが表・式とちがう");
        if (a.w !== wa || b.w !== wbb) why.push("物差しの数が表・式とちがう");
        if (P.grp !== stage(Math.max(wa, wbb))) why.push("2段目が表・式とちがう");
        const hot = a.t > b.t ? a : b, cool = hot === a ? b : a;
        if (hot.t - cool.t !== d || hot.pl !== ph || cool.pl !== pc) why.push("気温の差・場所がちがう");
        if (exp !== "＝ 同じ" && (ra > rb) !== (a === hot) && !P.why.includes(`${d}度低いのに上`)) why.push("低いのに上の説明が無い");
        if (k.lv === 0 && exp === "＝ 同じ") why.push("やさしいに同じ");
      } else {
        if (FACT[k.id] === undefined) why.push("表に無い種類");
        else if (P.ans !== FACT[k.id]) why.push("答えが資料とちがう");
        if (P.grp) why.push("決まりの問題に2段目がある");
      }
      if (!P.src.length || P.src.some((x) => !Array.isArray(x) || !SRCOK.test(x[1]))) why.push("出典が無い");
      if (JSON.stringify(G.make(`${k.id}|qa${s}`)) !== JSON.stringify(P)) why.push("同じ種で同じ問題にならない");
      seen[k.id].add(G.keyOf(P));
      if (why.length && !bad[k.id]) bad[k.id] = why.join("・") + "：" + P.q + " " + P.opts.join(" / ");
    }
  }
  check(`問題：${G.KINDS.length}種類×${N}問で、選び肢・答えは1つ・答えと2段目が表と式どおり・出典がある`, Object.keys(bad).length === 0, JSON.stringify(bad));
  const total = Object.values(seen).reduce((a, s) => a + s.size, 0), few = G.KINDS.filter((k) => seen[k.id].size < 12).map((k) => `${k.id}:${seen[k.id].size}`);
  check("問題の数：全部で300通り以上・どの種類も12通り以上（好きなだけ遊んでも同じ問題が続かない。game-dev.md F6）", total >= 300 && few.length === 0, `${total}通り ${few.join(",")}`);
  check("問題：種類は39（やさしい10・ふつう15・むずかしい14）", G.KINDS.length === 39 && [0, 1, 2].map((l) => G.kindsOf(l).length).join() === "10,15,14", [0, 1, 2].map((l) => G.kindsOf(l).length).join());
  { const cnt = { A: 0, B: 0, e: 0, low: 0 }; let core = false;
    for (const id of Object.keys(CMP)) for (let i = 0; i < 600; i++) { const P = G.make(`${id}|c${i}`); cnt[P.ans === "＝ 同じ" ? "e" : P.ans[0]]++; if (P.why.includes("低いのに上")) cnt.low++; } core = G.pairs("cin3", "in", "in", 3, 0).some((x) => x.t === 33 && x.hh === 30 && x.hc === 80 && x.c === "cool");
    check("くらべの答え（A・B・同じ）が全部出る・「低いのに上」が3割以上・2段目の4つが全部出る", cnt.A > 300 && cnt.B > 300 && cnt.e > 100 && cnt.low / (600 * 7) > 0.3 && ["s1", "s2", "s3", "s4"].every((g) => G.KINDS.some((k) => Array.from({ length: 300 }, (_, i) => G.make(`${k.id}|g${i}`)).some((P) => P.grp === g))), JSON.stringify(cnt));
    const lo = Array.from({ length: 600 }, (_, i) => G.make(`cin3|k${i}`)).filter((P) => P.why.includes("3度低いのに上")).length;
    check("核の一言：やさしい「室内：3度低いのに上？」で、3度低いほうが上の組が半分ほど出る・33℃30%と30℃80%の組も出る", G.BY.cin3.lv === 0 && lo > 200 && core && Object.keys(FACT).every((id) => G.BY[id]), `${lo}/600 ${core}`); }
  const longWhy = [], longLook = [], longOpt = [];
  for (const k of G.KINDS) { if ([...k.why].length > 100) longWhy.push(k.id); for (let s = 0; s < 200; s++) { const P = G.make(`${k.id}|len${s}`); if ([...P.why].length > 100) longWhy.push(k.id); if ([...P.look].length > 45 || [...P.key].length > 60) longLook.push(k.id); for (const o of [...P.opts, P.q]) if ([...o].length > 60) longOpt.push(`${k.id}:${o}`); } }
  check("説明は100字以内・ヒントは45字・60字以内・1行は60字以内（やさしい日本語。一文を短く）", !longWhy.length && !longLook.length && !longOpt.length, [...new Set(longWhy)].concat([...new Set(longLook)], longOpt.slice(0, 3)).join(","));
  check("出典は環境省・日本生気象学会（文京区の掲載）・気象庁のページだけ", Object.values(G.SRC).every(([, u]) => SRCOK.test(u)));
  check("場面の よい/よくない（暑さ指数よみ）を問わない", !G.KINDS.some((k) => { const all = [k.why, k.look, k.key]; for (let i = 0; i < 100; i++) { const P = G.make(`${k.id}|nz${i}`); all.push(P.q, ...P.opts); } return /よい行動|よくない|正しい行動|してはいけない/.test(all.join()); }));
}
{
  // 今日の5問・上級の組み方（3年分）
  const bad = [], cover = new Set(); let sameAsPrev = 0, prev = "";
  const d0 = Date.parse("2026-11-27");
  for (let i = 0; i < 365 * 3; i++) {
    const d = new Date(d0 + i * 864e5).toISOString().slice(0, 10), dl = G.dailyTags(d), hl = G.hardTags(d);
    const dk = dl.map((t) => t.split("|")[0]), hk = hl.map((t) => t.split("|")[0]);
    if (dl.length !== 5 || new Set(dk).size !== 5 || dk.map((k) => G.BY[k].lv).join() !== "0,0,1,1,2") bad.push(d + " 今日");
    if (hl.length !== 3 || new Set(hk).size !== 3 || hk.some((k) => G.BY[k].lv !== 2) || hk.includes(dk[4])) bad.push(d + " 上級");
    if (JSON.stringify(dl) !== JSON.stringify(G.dailyTags(d))) bad.push(d + " 同じにならない");
    if (dk.join() === prev) sameAsPrev++; prev = dk.join();
    if (i < 60) [...dk, ...hk].forEach((k) => cover.add(k));
  }
  check("今日の5問（やさしい2・ふつう2・むずかしい1、種類は重ねない）と上級（むずかしい3・今日のむずかしいと別）を3年分作れる", bad.length === 0, bad.slice(0, 5).join(","));
  check("2か月のうちに39種類が全部出る・前の日と同じ組の日が少ない", cover.size === 39 && sameAsPrev < 20, `${cover.size}種類・前の日と同じ ${sameAsPrev}日`);
  // 過去の日の問題が変わらない（data.js を直したときの見張り。値は 2026-11-27 に作ったもの）
  // 1問目だけでなく、いくつかの日の5問と上級3問の全部（種類と言い方・選び肢の印）を見る（種類や言い方を足すと、全部の日の問題が変わるため。shigaisen-yomi #1 の CodeRabbit）
  const snap = ["2026-11-27", "2026-11-28", "2027-01-01"].map((d) => [...G.dailyTags(d), ...G.hardTags(d)].map((t) => { const P = G.make(t); return `${P.kind}:${P.v}:${G.seedOf(JSON.stringify([P.q, P.opts, P.ans])).toString(36)}`; }).join(",")).join(";"); // 問いと並べた選び肢と答えの印も見る（選び肢の言葉を替えても気づく。PR #1 の CodeRabbit）
  check("過去の日（2026-11-27・11-28・2027-01-01）の5問と上級3問が作ったときのまま（種類・言い方を足す・並べ替える・消すと変わる）", snap === PINS, snap);
}

// ---- 2. ファイルの中身 ----
const html = readFileSync(path.join(root, "index.html"), "utf8"), gen = readFileSync(path.join(root, "data.js"), "utf8"), readme = readFileSync(path.join(root, "README.md"), "utf8");
// ひな形の写し（<!-- 名前:begin〜end -->）はゲームの言葉ではないので外し、Core.kofi・Core.KOFI は写す前の形にもどして見る（shared-workflows の sync-template が足した）
const gameOwn = (t) => t.replace(/<!-- ([a-z0-9-]+):begin[\s\S]*?<!-- \1:end -->/g, "").split("${Core.KOFI}").join("https://ko-fi.com/satouaaaaa").replace(/Core\.kofi\(("(?:[^"\\]|\\.)*"), ("(?:[^"\\]|\\.)*")\)/g, (m, a, b) => "`<p class=\"note kofi\">" + JSON.parse(a) + "、<a href=\"https://ko-fi.com/satouaaaaa\" target=\"_blank\" rel=\"noopener\">Ko-fi でコーヒー1杯の応援</a>をもらえると、" + JSON.parse(b) + "の励みになります（任意・遊ぶのはずっと無料）。</p>`");
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$/.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない（出典のリンクは押したときに開くだけ）", ext.length === 0 && ![...html.matchAll(/<script[^>]+src="([^"]+)"/g)].some((m) => /^https?:/.test(m[1])), ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習・とことんの種だけ（今日の5問・上級は日付の乱数。data.js には無い）", (html.match(/Math\.random/g) || []).length === 2 && !/Math\.random/.test(gen));
check("乱数は sort の比較の中で引かない（ブラウザで引く回数が変わる）", !/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/.test(html + gen));
{ const inl = html.split("<script>").slice(1).map((x) => x.split("</" + "script>")[0]).join("\n"); // index.html の中の script も見る（nemuri-kotsu#1 で行の途中に // を入れて画面が動かなくなった）
  check("一行の式の途中にコメント // を足さない（行の残りが消える。rosen-hitofude 2026-11-04・nemuri-kotsu#1）", !/;\s*\/\/[^\n]*;\s*\w/.test((gen + "\n" + inl).split("\n").filter((l) => !l.trim().startsWith("//")).join("\n"))); }
check("言い方：「絶対」と言い切らない", !/絶対に安全|絶対に来ない|必ず上陸/.test(gameOwn(html) + gen + readme));
{ const howto = (html.match(/<dialog id="howto"[\s\S]*?<\/dialog>/) || [""])[0], ab = (html.match(/function about\(\)[\s\S]*?\n}/) || [""])[0], dis = (t) => /目安/.test(t) && /日本生気象学会/.test(t) && /環境省/.test(t);
  check("言い方：遊び方・「このゲームについて」・README のどれにも、室内は日本生気象学会の表、外は環境省の式で出した目安であることがある", dis(howto) && dis(ab) && dis(readme), `遊び方 ${dis(howto)}・について ${dis(ab)}・README ${dis(readme)}`); }
check("写し元（津波の速さくらべ・そのまた元の風力階級よみ・星の等級よみ）の言葉が残っていない（game-dev.md A 手順5）", !/津波|水深|tnhy|TSH|tsunami|新幹線|ピューマ|ジェット|100mを|速さくらべ|風力|ノット|海上警報|備考|fry-|FRY|fuuryoku|風の強さ|等級|[1-6]等星|肉眼|天文|astro|パーセク|ベガ|デネブ|tky-|TKY|toukyu|突風|竜巻/.test(gameOwn(html).replace(/<!-- a11y:begin[\s\S]*?a11y:end -->/, "").replace(/<!-- store:begin[\s\S]*?store:end -->/, "") + gen + readme));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ツッコミ|なんでやねん|（うそ）/.test(html + gen));
check("引き継ぎ：transfer.js をゲームの script より前に、このゲームの記録のキー（記録・文字・復習）だけで読む・depth.js も前に読む", /<script src="transfer\.js" data-game="atsusa-keisan" data-keys="akk-v1,akk-fs,akk-depth"><\/script>\s*<script src="depth\.js" data-game="atsusa-keisan" data-key="akk-depth"><\/script>\s*<\/head>/.test(html) && html.indexOf('src="transfer.js"') < html.indexOf('src="data.js"') && /data-hk/.test(html) && existsSync(path.join(root, "transfer.js")));
check("好きなだけ遊べる：チケット・回数の上限・🔒で開くモードを入れない（game-dev.md F1・F2）", !/🎫|チケット|すると開く|🔒/.test(gameOwn(html)) && !/\blife\b|ELIFE/.test(gameOwn(html)));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/atsusa-keisan/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const ogs = readFileSync(path.join(root, "tools/make-og.cjs"), "utf8"), okLine = (ogs.match(/line\("([^"]+)", 1\)/) || [])[1];
  check("共有画像の正解は、このゲームの答えのどれかで、絵の場面（室内 33℃・30% と 30℃・80%）の表の答えと合う（incidents/2026-11-17-og-scene-left-from-copy.md）", Object.values(G.CANS).includes(okLine) && /A：33℃・湿度30%/.test(ogs) && /B：30℃・湿度80%/.test(ogs) && okLine === (G.wbgt("in", 33, 30) > G.wbgt("in", 30, 80) ? G.CANS.a : G.CANS.b), okLine); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8"), mf = readFileSync(path.join(root, "manifest.webmanifest"), "utf8"), desc = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1] || "", how = (html.match(/<dialog id="howto"[\s\S]*?<\/dialog>/) || [""])[0];
  check("手で書く所がこのゲームの言葉（description・遊び方の場面・2段目の名前・ホームの1行目・2段目のまちがいの案内・manifest・感想フォームの例。incidents/2026-11-18-game-copy-hand-written-text.md）", /暑さ指数/.test(desc) && /3度低いのに上/.test(desc) && /室内・日かげ・日なた/.test(how) && /注意・警戒・厳重警戒・危険/.test(how) && /どの段階？/.test(html) && /気温が3度低いのに、上？/.test(html) && /段階の境目は 25・28・31 です/.test(html) && /暑さ指数と段階/.test(mf) && /3度低いのに暑さ指数/.test(fy) && /日なたの数あて/.test(fy)); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームの name が3字以上（2字だとフォームが出ない。shared-workflows incidents/2026-11-05-feedback-form-not-shown.md）", [...((fy.match(/^name:\s*(.+)$/m) || [])[1] || "").trim()].length >= 3);
  check("感想フォームは名前・メールを聞かない", /id: fun/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readme.replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1]);
  check("PWA：sw.js は画面のファイルを全部保存し（引き継ぎの transfer.js・深さの depth.js も）、取り直して保存し、外へ何も送らない", ["./index.html", "./data.js", "./transfer.js", "./depth.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].every((f) => shell.includes(f)) && /cache: "reload"/.test(sw) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  { const st = await checkSwStall(sw); check("PWA：通信が止まっても4秒ほどで保存した画面に切り替わり、少しずつ届く受信は待ち、何も無ければ60秒で返す（shared-workflows template/qa/sw-check.mjs）", st.ok, JSON.stringify(st)); }
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "暑さ指数けいさん" && /暑さ指数/.test(mf.description) && !/津波/.test(mf.description) && mf.icons.length >= 2 && mf.start_url === "./"); }

// ---- 3. ブラウザで遊ぶ ----
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(root, p === "/" ? "index.html" : p);
  if ((f !== root && !f.startsWith(root + path.sep)) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dayBefore = (n) => new Date(Date.parse(TODAY) - n * 864e5).toISOString().slice(0, 10);
async function newPage(w = 390, ctx) {
  const c = ctx || await browser.newContext({ viewport: { width: w, height: 800 } });
  await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(200);
  return p;
}
const closeHow = async (p) => { await firstClose(p); };
const ansIdx = (p) => p.evaluate(() => { const c = __nm.cur(); return c.P.opts.indexOf(c.P.ans); });
const wrongIdx = (p) => p.evaluate(() => { const c = __nm.cur(); return c.P.opts.findIndex((o) => o !== c.P.ans && !c.wrong.includes(o)); });
const mem = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("akk-v1") || "{}"));
// 2段目「当てはまる、いちばん上の目安は？」が出たら、正しい目安を押す
const why = async (p) => { await p.waitForSelector(".verdict, .why button"); if (await p.locator(".verdict").count()) return; await p.click(`.why button[data-g="${await p.evaluate(() => __nm.cur().P.grp)}"]`); };
async function solve(p, { wrong = 0 } = {}) {
  for (let i = 0; i < wrong; i++) await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  await p.click(`.ch[data-j="${await ansIdx(p)}"]`);
  await why(p);
  await p.waitForSelector(".verdict");
}

try {
  // はじめて：遊び方が出る・文字の大きさ
  const p = await newPage();
  check("はじめて開くと遊び方が出る", await p.locator("#core-coach").waitFor({ timeout: 3000 }).then(() => true, () => false));
  { const c = await browser.newContext(); const r = await c.newPage(); await r.goto(url); await r.waitForTimeout(200); let again = 0;
    for (let i = 0; i < 10; i++) { await r.evaluate(() => localStorage.clear()); await r.reload(); await r.waitForTimeout(200); await r.keyboard.press("Escape"); await r.reload(); await r.waitForTimeout(200); again += await r.locator("#howto[open]").count(); }
    check("遊び方を Esc で閉じてすぐ読み直しても出ない（10回）", again === 0);
  { const c = await browser.newContext(); const r = await c.newPage(); const big = []; // 題が h1{flex:1} で縦に伸び（伸びない形と比べて4pxより高ければ失敗）、iPad の縦で大きなすき間が出た（shared-workflows incidents/2026-11-07-title-stretched.md）
    for (const [w, h] of [[820, 1180], [390, 844], [1280, 800]]) { await r.setViewportSize({ width: w, height: h }); await r.goto(url); await r.waitForTimeout(200); await r.keyboard.press("Escape"); await r.waitForTimeout(100);
      const v = await r.evaluate(() => { const e = [...document.querySelectorAll(".title")].find((x) => x.offsetParent); if (!e) return null; const h = e.getBoundingClientRect().height; const f = e.style.flex; e.style.flex = "none"; const n = e.getBoundingClientRect().height; e.style.flex = f; return h - n; });
      if (v === null || v > 4) big.push(`${w}x${h}:${v === null ? "題なし" : "+" + Math.round(v) + "px"}`); }
    check("ホームの題は縦長の画面でも縦に伸びない（820×1180・390×844・1280×800）", big.length === 0, big.join(" ")); await c.close(); }
    await r.evaluate(() => localStorage.clear()); await r.reload(); await r.waitForTimeout(200);
    check("はじめての練習が始まったその場で「見た」が残る", await r.evaluate(() => { return Object.keys(localStorage).some((k) => { try { return JSON.parse(localStorage.getItem(k)).tut === true; } catch { return false; } }); })); await firstClose(r);
    await r.reload(); await r.waitForTimeout(200); check("遊び方を「わかった」で閉じてすぐ読み直しても出ない（その場で残す）", await r.locator("#howto[open]").count() === 0); await c.close(); }
  await firstClose(p);
  check("文字の大きさ：はじめは「大きい」（19px）", await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) === "19px");
  await p.click('.fsrow button[data-fs="3"]');
  await p.reload(); await p.waitForTimeout(150);
  check("文字の大きさ：「とても大きい」にすると開き直しても残る", await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) === "23px" && await p.locator('.fsrow button[data-fs="3"][aria-pressed="true"]').count() === 1);
  await p.click('.fsrow button[data-fs="2"]');
  check("ホームに今日のきほんが出る", (await p.textContent("#tip")).includes("今日のきほん"));

  // 今日の5問：1問目はまちがえる、2問目はヒント2回、ほかはそのまま
  await p.click("#go-d");
  const tags = await p.evaluate(() => __nm.load().runs.d.list);
  check("今日の5問は日付から決まる（data.js の dailyTags と同じ）", JSON.stringify(tags) === JSON.stringify(G.dailyTags(TODAY)));
  check("問題の画面：場面の問いと、押せる行3つか4つ（高さ56px以上）", await p.locator("#card").count() === 1 && (await p.$$eval(".ch", (b) => b.map((x) => x.getBoundingClientRect().height))).every((h) => h >= 56) && await p.locator(".ch").count() === await p.evaluate(() => __nm.cur().P.opts.length) && await p.locator(".ch").count() >= 3 && (await p.textContent("#card .sit")).length > 5);
  check("押せる行には読み上げ用の名前がある", (await p.$$eval(".ch", (t) => t.filter((x) => !x.getAttribute("aria-label")).length)) === 0);
  await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  check("まちがえると ✕ の印と「ちがう」の文字（色だけで分けない）・知らせは role=status", await p.locator(".ch.ng").count() === 1 && (await p.evaluate(() => getComputedStyle(document.querySelector(".ch.ng"), "::after").content)).includes("ちがう") && /✕/.test(await p.textContent("#msg")) && await p.getAttribute("#msg", "role") === "status");
  // 開き直しても、まちがえた選び肢は残る
  await p.reload(); await p.waitForTimeout(150); await p.click("#go-d");
  check("途中で閉じても続きから（同じ問題・まちがえた印のまま）", await p.locator(".ch.ng").count() === 1 && await p.evaluate(() => __nm.cur().i) === 0);
  await solve(p);
  check("正解すると「正解」の判・なぜの説明・出典のリンク・★2（まちがい1回）", await p.locator(".ch.ok").count() === 1 && /正解/.test(await p.evaluate(() => getComputedStyle(document.querySelector(".ch.ok"), "::after").content)) && (await p.textContent(".verdict .why")).length > 20 && await p.locator(".verdict .src a").count() >= 1 && (await p.getAttribute(".verdict .stars", "aria-label")) === "星2つ");
  check("答えのあとに、暑さ指数の物差しが出る（この問題の行に ▶・くらべた相手に ●・境目 25・28・31 とアラート 33・35。色だけで分けない）", await p.evaluate(() => { const P = __nm.cur().P, r = document.querySelector(".verdict #ruler"); if (!P.items) return !r; return !!r && (r.querySelector("li.me .rk") || {}).textContent === "▶" && (P.items.length < 2 || [...r.querySelectorAll("li.vs .rk")].some((x) => x.textContent === "●")) && ["25 ", "28 ", "31 ", "33 ", "35 "].every((t) => r.textContent.includes(t)); }));
  await p.click("#next");
  await p.click("#hint");
  check("ヒント1は見るところを言う（答えは言わない）", (await p.textContent("#hintbox")).includes("💡") && await p.locator(".ch.ng").count() === 0);
  await p.click("#hint");
  check("ヒント2はまちがいを消して2つにしぼり、表の言葉も見せる・ヒントは2回まで", await p.locator(".ch:not(.ng)").count() === 2 && (await p.textContent("#hintbox")).includes(await p.evaluate(() => __nm.cur().P.key)) && await p.locator("#hint:disabled").count() === 1);
  await solve(p);
  check("ヒント2回は★1", (await p.getAttribute(".verdict .stars", "aria-label")) === "星1つ");
  await p.click("#next");
  check("次の問題へ進むと、フォーカスが問題（#card）に移る", await p.evaluate(() => document.activeElement && document.activeElement.id) === "card");
  for (let i = 2; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const s1 = await mem(p);
  check("5問で結果：今日の記録に1問ごとのまちがい（1・2・0・0・0）", JSON.stringify(s1.days[TODAY]?.m) === "[1,2,0,0,0]");
  const share = await p.textContent(".share");
  check("シェアの文に答え・問題を出さない（印だけ）", /第\d+回/.test(share) && /🟢/.test(share) && !G.KINDS.some((k) => share.includes(k.name)) && !/m\/s|km/.test(share), share);
  check("まちがいのある日は Ko-fi の一言を出さない", await p.locator(".kofi").count() === 0);
  check("結果に「あと少しの実績」と、続けて遊ぶ・上級のボタン", await p.locator("#achnext").count() === 1 && await p.locator("#go-e").count() === 1 && await p.locator("#go-h").count() === 1);
  check("まなび帳に解いた種類が載る", Object.keys(s1.dex).length === 5);
  await p.click("#back");
  check("今日を終えたら、ホームは「今日の結果を見る」と上級", (await p.textContent("#go-d")).includes("結果") && await p.locator("#go-h").count() === 1);
  // 上級：ヒントなし・3問
  await p.click("#go-h");
  check("上級はヒントのボタンが無い・3問", await p.locator("#hint").count() === 0 && (await p.evaluate(() => __nm.load().runs.h.list.length)) === 3);
  for (let i = 0; i < 3; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  check("上級の記録は hdays に入る", (await mem(p)).hdays[TODAY]?.m.length === 3);
  // 練習：記録を増やさない
  await p.click("#back"); await p.click("#go-p"); await p.click('.lv button[data-t="2"]');
  const before = await mem(p);
  for (let i = 0; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const after = await mem(p);
  check("練習は今日の記録を増やさない（まなび帳の数はふえる）", JSON.stringify(after.days) === JSON.stringify(before.days) && Object.values(after.dex).reduce((a, b) => a + b) === Object.values(before.dex).reduce((a, b) => a + b) + 5);
  // まなび帳からその手口だけで練習
  await p.click("#back"); await p.click("#go-dex");
  const firstKind = await p.getAttribute(".book button", "data-k");
  await p.click(".book button");
  check("まなび帳の手口を押すと、その手口だけで練習", (await p.evaluate(() => __nm.load().runs.p.list)).every((t) => t.startsWith(firstKind + "|")));
  // とことん：まちがえてもヒントを使っても続き、「ここで降りる」で終わる（game-dev.md F1）
  await p.click("#back"); await p.click("#go-e");
  check("とことんは60問の並びから・ライフ（🌸・🎫）が無い", (await p.evaluate(() => __nm.load().runs.e.list.length)) === 60 && !("life" in await p.evaluate(() => __nm.load().runs.e)) && await p.locator("#quit").count() === 1);
  await solve(p); await p.click("#next"); await solve(p); await p.click("#next");
  await solve(p, { wrong: 1 }); await p.click("#next");
  await p.click("#hint"); await p.click("#hint"); await solve(p); await p.click("#next");
  check("とことんはまちがい・ヒント2回でも終わらない", await p.locator(".ch").count() >= 3 && await p.evaluate(() => __nm.load().runs.e.res.length) === 4);
  await p.click("#hint"); await p.click("#hint");
  await p.evaluate(() => { const c = __nm.cur(); [...document.querySelectorAll(".ch:not(.ng)")].find((b) => c.P.opts[+b.dataset.j] !== c.P.ans).click(); });
  await p.waitForTimeout(50);
  check("ヒント2のあとにまちがいを選ぶと、正解だけが押せる（saibanin-shikumi #1）", await p.locator(".ch.ng").count() === await p.evaluate(() => __nm.cur().P.opts.length) - 1 && await p.locator(".ch:not(.ng)").count() === 1 && await p.evaluate(() => { const c = __nm.cur(); const b = document.querySelector(".ch:not(.ng)"); return !!b && !b.disabled && c.P.opts[+b.dataset.j] === c.P.ans; }));
  await p.reload(); await p.waitForTimeout(200);
  check("とことんは閉じても続きから", (await p.textContent("#go-e")).includes("続きから"));
  await p.click("#go-e");
  {
    // 別のタブでこの回を終えて新しい回を始めていたら、古い画面の「ここで降りる」は新しい回を終えない（funka-level #1 の CodeRabbit）
    const keep0 = await p.evaluate(() => __nm.load().runs.e);
    await p.evaluate(() => __nm.save((s) => { s.runs.e = Object.assign({}, s.runs.e, { id: "other-tab-run", res: [] }); }));
    await p.click("#quit"); await p.waitForTimeout(150);
    check("古い画面の「ここで降りる」は、別のタブで始めた新しい回を終えない", (await p.evaluate(() => __nm.load().runs.e && __nm.load().runs.e.id)) === "other-tab-run");
    await p.evaluate((r) => __nm.save((s) => { s.runs.e = r; }), keep0);
    await p.evaluate(() => __nm.play("e"));
  }
  await p.click("#quit"); await p.waitForTimeout(150);
  check("「ここで降りる」で終わり、一度で正解した数（2問）が自己ベストに残る", (await mem(p)).ebest === 2 && (await p.textContent("#eres")).includes("4問") && !("e" in (await mem(p)).runs && (await mem(p)).runs.e));
  {
    // とことんの並びを何百回作って、1回の中で同じ問題が無い・続けて同じ種類が無い・足しても重ならない
    const r = await p.evaluate(() => { const K = __nm.G, bad = []; for (let n = 0; n < 300; n++) { const l = __nm.endlessList(), more = l.concat(__nm.moreList(l)); const ks = more.map((t) => K.keyOf(K.make(t))); if (new Set(ks).size !== ks.length) bad.push("重なり"); if (more.some((t, i) => i && t.split("|")[0] === more[i - 1].split("|")[0])) bad.push("同じ種類が続く"); if (l.length !== 60 || more.length !== 100) bad.push("数" + l.length + "/" + more.length); } return bad; });
    check("とことんの並び300回：60問＋足した40問で同じ問題も同じ種類の連続も無い（game-dev.md F6）", r.length === 0, r.slice(0, 3).join(","));
  }
  {
    // 引き継ぎコードなどで数の所に文字が入っても、画面に HTML として出さない（2026-11-05 CodeRabbit）
    const q = await newPage(); await closeHow(q);
    await q.evaluate(() => { const s = JSON.parse(localStorage.getItem("akk-v1")) || { v: 1 }; s.ebest = '<img id="xss" src=x>'; s.dex = { e: '"><b id="xss2">' }; s.runs = { e: { mode: "e", id: '"><i id="xss3">', date: "2026-11-07", list: ["nin30|1"], res: [] }, h: { list: "bad", res: [] }, p: { mode: "p", id: "y", date: "2026-11-07", list: ["constructor|1"], res: [] }, d: { mode: "d", id: "z", date: "x", list: ["nin30|1"], res: [] }, "a:2026-11-06": { mode: "a", id: "a1", date: "2026-11-06", list: ["nin30|1"], res: [null] }, "a:2026-11-05": { mode: "a", id: "a2", date: "2026-11-05", list: "bad", res: [] }, "a:2026-11-04": { mode: "a", id: "a3", date: "2026-11-04", list: ["nin30|1", "nin30|2"], res: [{ m: 0 }], cur: { i: 1, tag: "nin30|2", wrong: "x", hints: 0 } } }; s.days = { "2026-11-07": { m: "x" }, bad: { m: [0] }, "2026-02-30": { m: [0] } }; localStorage.setItem("akk-v1", JSON.stringify(s)); });
    await q.reload(); await q.waitForTimeout(250);
    const st = await q.evaluate(() => __nm.load());
    check("記録の形を直す：数の所の文字は0に・形のちがう途中経過と日ごとの記録は捨てる", st.ebest === 0 && st.dex.e === 0 && st.runs.e && !("h" in st.runs) && !("p" in st.runs) && !("d" in st.runs) && !("a:2026-11-06" in st.runs) && !("a:2026-11-05" in st.runs) && st.runs["a:2026-11-04"] && st.runs["a:2026-11-04"].cur === null && Object.keys(st.days).length === 0);
    await q.click("#go-e").catch(() => {}); await q.waitForTimeout(150);
    {
      // 知らない mode や、置き場とちがう mode の途中経過は捨てる（ホームが出なくなるのを防ぐ。2026-11-07 CodeRabbit）
      const z = await newPage(); await closeHow(z);
      await z.evaluate(() => { const s = JSON.parse(localStorage.getItem("akk-v1")) || { v: 1 }; s.v = 1; s.runs = { d: { mode: "x", date: "2026-11-07", list: [], res: [] }, h: { mode: "d", date: "2026-11-07", list: [], res: [] } }; localStorage.setItem("akk-v1", JSON.stringify(s)); });
      await z.reload(); await z.waitForTimeout(200);
      const r = await z.evaluate(() => __nm.load().runs);
      check("知らない mode の途中経過は捨て、ホームが出る", !("d" in r) && !("h" in r) && await z.locator("#go-d").count() === 1);
      // 別のタブで終えたまま記録していない上級の回は、次の回を始める前に記録する
      await z.evaluate(() => { const s = __nm.load(), y = "2026-11-06", G = __nm.G; s.runs.h = { mode: "h", date: y, list: G.hardTags(y), res: [{ m: 0 }, { m: 0 }, { m: 0 }], cur: null, id: "old" }; localStorage.setItem("akk-v1", JSON.stringify(s)); });
      await z.reload(); await z.waitForTimeout(200); await z.evaluate(() => __nm.start("h"));
      check("終えたまま残った前の日の回は、上書きする前に記録する", !!(await mem(z)).hdays["2026-11-06"]);
      // とことんで足せる問題が無くても、くり返し呼んで固まらない
      const ok = await z.evaluate(() => { const s = __nm.load(); s.runs.e = { mode: "e", date: __nm.todayKey(), list: ["nin30|1", "nin33|1"], res: [{ m: 0 }, { m: 0 }], cur: null, id: "e1" }; localStorage.setItem("akk-v1", JSON.stringify(s)); const ml = __nm.setMore(() => []); try { __nm.play("e"); return true; } catch (e) { return String(e); } finally { __nm.setMore(ml); } });
      check("とことんで足せる問題が無くても固まらずに終える", ok === true && await z.locator("#eres").count() === 1, String(ok));
      await z.context().close();
    }
    check("記録の文字を HTML として出さない", await q.locator("#xss, #xss2, #xss3").count() === 0);
    await q.context().close();
  }
  // 実績・このゲームについて
  await p.click("#back"); await p.click("#go-ach");
  check("実績は13個で、腕前・集める・続けるの3つの組", await p.locator(".ach").count() === 13 && await p.locator(".agrp").count() === 3 && await p.locator(".ach.got").count() >= 3);
  check("達成した実績は ✓ の文字も付く（色だけで分けない）", (await p.textContent(".ach.got b")).startsWith("✓"));
  await p.click("#back"); await p.click("#f-about");
  { const ab = await p.textContent("#about");
    check("このゲームについて：屋外・屋内の式・室内の表・推定式と目安であること・核の一言・出典", ab.includes("0.7×湿球温度＋0.2×黒球温度＋0.1×乾球温度") && ab.includes("0.7×湿球温度＋0.3×黒球温度") && ab.includes("0.735×気温") && ab.includes("室内用のWBGT簡易推定図") && ab.includes("目安") && ab.includes("30℃・湿度80%は28") && await p.locator("#about a").count() >= 6); }
  // 気温と湿度を動かす：つまみ・±のボタン・例のボタンで、室内・日かげ・日なたの暑さ指数と段階と物差しが変わる（記録は増やさない）
  await p.click("#back");
  { const before = JSON.stringify(await mem(p)); await p.click("#go-lab");
    const v0 = await p.textContent("#labv"), c0 = await p.textContent("#labcmp");
    check("気温と湿度を動かす：はじめは33℃・湿度30%で室内25（警戒）・3つの場所・物差しが出る", /室内25/.test(c0) && v0.includes("警戒") && await p.locator("#labv div").count() === 3 && await p.locator("#ruler li.me").count() === 1, c0);
    await p.click("#ex2"); const c1 = await p.textContent("#labcmp");
    check("気温と湿度を動かす：例「30℃・湿度80%」で室内28（3度低いのに上）", /気温30℃・湿度80%：室内28/.test(c1), c1);
    await p.click("#tp"); await p.click("#hm"); const c2 = await p.textContent("#labcmp");
    const knob = await p.$("#ltemp"), box = await knob.boundingBox();
    await p.mouse.move(box.x + 4, box.y + box.height / 2); await p.mouse.down(); await p.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2, { steps: 4 }); await p.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 4 }); await p.mouse.up();
    const dragged = await p.evaluate((e) => ({ alive: e.isConnected, v: +e.value }), knob);
    check("気温と湿度を動かす：つまみをドラッグし続けても同じつまみのまま気温が変わり続ける（作り直さない）", dragged.alive && dragged.v >= 33 && (await p.textContent("#labcmp")).includes(`気温${dragged.v}℃`), JSON.stringify(dragged));
    await p.focus("#ltemp"); await p.keyboard.press("End"); await p.focus("#lhum"); await p.keyboard.press("End"); await p.waitForTimeout(50); const c3 = await p.textContent("#labcmp");
    check("気温と湿度を動かす：±とキーボード（End）で変わり、40℃・湿度100%で室内40・日なたはアラートの基準をこえる", /気温31℃・湿度75%：室内29/.test(c2) && /気温40℃・湿度100%：室内40/.test(c3) && c3.includes("特別警戒アラートの基準の数（35）も") && c3.includes("環境省が地域の予測をもとに") && await p.locator("#tp:disabled").count() === 1 && await p.locator("#hp:disabled").count() === 1, `${c2} / ${c3}`);
    check("気温と湿度を動かす：押す所は44px以上・記録を増やさない", (await p.$$eval("#tm, #tp, #hm, #hp, #ltemp, #lhum, #ex1, #ex2", (b) => b.every((x) => Math.round(x.getBoundingClientRect().height) >= 44))) && JSON.stringify(await mem(p)) === before);
    await p.click("#back"); }
  await p.context().close();

  // まちがいなしの日は Ko-fi を1回だけ
  {
    const q = await newPage(); await closeHow(q); await q.click("#go-d");
    for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
    await q.waitForTimeout(150);
    check("全部まちがいなしで初めて終えたときだけ Ko-fi の一言", await q.locator(".kofi").count() === 1 && (await q.textContent(".big")).includes("まちがいなし"));
    await q.click("#back"); await q.click("#go-d");
    check("結果をもう一度見ても Ko-fi は出さない", await q.locator(".kofi").count() === 0);
    await q.context().close();
  }

  // カレンダー・あとから：過去の日の記録を置いて見る。第1回から日がたっていなくても見られるよう、時計を10日進める
  {
    const SHIFT = 10 * 864e5, TODAY = new Date(Date.now() + 9 * 3600e3 + SHIFT).toISOString().slice(0, 10), dayBefore = (n) => new Date(Date.parse(TODAY) - n * 864e5).toISOString().slice(0, 10);
    const cx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    await cx.addInitScript((sh) => { const o = Date.now; Date.now = () => o() + sh; }, SHIFT);
    const q = await newPage(390, cx);
    await q.evaluate(([d2, d3]) => { localStorage.setItem("akk-v1", JSON.stringify({ v: 1, tut: true, days: { [d2]: { m: [0, 0, 0, 0, 0], k: [] }, [d3]: { m: [1, 0, 0, 2, 0], k: [] } }, hdays: {}, adays: {}, dex: {}, runs: {}, kofi: {}, ach: {}, ebest: 0 })); }, [dayBefore(2), dayBefore(3)]);
    await q.reload(); await q.waitForTimeout(150);
    check("ホームの「続けて」は、きのうを休んだら — （休んだ日を責めない）", (await q.textContent(".stats")).includes("—"));
    await q.click("#go-cal");
    const lateList = await q.evaluate(() => __nm.lateDays(__nm.load()));
    const exp = [1, 4, 5, 6, 7].map(dayBefore).filter((d) => d >= "2026-11-07");
    check("カレンダー：取りこぼした過去7日（第1回より後）を押せる", JSON.stringify(lateList) === JSON.stringify(exp), lateList.join(","));
    check("カレンダー：遊んだ日は★の数の文字も付く", (await q.locator(".cal .c.p3").count()) + (await q.locator(".cal .c.p2").count()) + (await q.locator(".cal .c.p1").count()) >= (dayBefore(3).slice(0, 7) === TODAY.slice(0, 7) ? 2 : 0));
    if (lateList.length) {
      const d = lateList[0];
      await q.evaluate((d) => { const b = document.querySelector(`.cal .miss[data-k="${d}"]`); if (b) b.click(); else { const m = document.querySelector(".calnav #prev"); m && m.click(); } }, d);
      if (!(await q.locator(".ch").count())) await q.click(`.cal .miss[data-k="${d}"]`);
      check("あとから：その日の今日の5問と同じ問題", JSON.stringify(await q.evaluate((d) => __nm.load().runs["a:" + d].list, d)) === JSON.stringify(G.dailyTags(d)));
      for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
      await q.waitForTimeout(150);
      const s = await mem(q);
      check("あとからは adays に入り、今日の記録・続けた日には数えない", s.adays[d] && !s.days[d] && (await q.locator(".share").count()) === 0 && (await q.locator(".kofi").count()) === 0);
    } else check("あとから：遊べる日がある", false, "第1回の日から日がたっていない");
    await q.context().close();
  }

  // 終えた回（gone）がある側の保存に失敗し、別のタブが古い回を新しく保存しても、終えた回を戻さない（shindo-yomi PR #1 の CodeRabbit。GameStore の after で落とす）
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const g = await newPage(390, ctx);
    const left = await g.evaluate(() => {
      const r = { mode: "e", date: __nm.todayKey(), list: ["nin30|1", "nin33|1"], res: [{ m: 0 }], cur: null, id: "gone1" };
      const base = __nm.load();
      const a = JSON.parse(JSON.stringify(base)); a.runs.e = null; a.gone = { gone1: 1 }; a.t = 100;
      const b = JSON.parse(JSON.stringify(base)); b.runs.e = r; b.t = 200;
      localStorage.setItem("akk-v1", JSON.stringify(b)); __nm.setMem(JSON.stringify(a));
      try { return __nm.load().runs.e; } finally { __nm.setMem(null); }
    });
    check("終えた回は、別のタブが新しく保存した古い写しから戻さない", !left, JSON.stringify(left));
    await ctx.close();
  }
  // 同じ問題の途中で、保存に失敗した側と保存できた側のまちがいを合わせる（CodeRabbit shindo-yomi#1）
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const g = await newPage(390, ctx);
    const got = await g.evaluate(() => {
      const base = __nm.load(), mk = (w, w2) => ({ mode: "p", date: __nm.todayKey(), list: ["nin30|m1", "nin33|m1"], res: [], cur: { i: 0, tag: "nin30|m1", wrong: w, hints: 0, step: 2, w2 }, id: "mg1" });
      const a = JSON.parse(JSON.stringify(base)); a.runs.p = mk(["暑さ指数 20"], ["s1"]); a.t = 100;
      const b = JSON.parse(JSON.stringify(base)); b.runs.p = mk(["暑さ指数 23"], ["s2"]); b.t = 200;
      localStorage.setItem("akk-v1", JSON.stringify(b)); __nm.setMem(JSON.stringify(a));
      try { return __nm.load().runs.p.cur; } finally { __nm.setMem(null); }
    });
    check("同じ問題の途中なら、保存に失敗した側のまちがい（1段目・2段目）も消さずに合わせる", got && got.wrong.includes("暑さ指数 20") && got.wrong.includes("暑さ指数 23") && got.w2.includes("s1") && got.w2.includes("s2"), JSON.stringify(got));
    const n = await g.evaluate(() => { __nm.save((s) => { s.runs.p = { mode: "p", date: __nm.todayKey(), list: ["nin30|s1", "nin33|s1"], res: [], cur: null, id: "sc1" }; }); __nm.play("p"); __nm.sureCount(true); __nm.sureCount(true); return __nm.load().runs.p.ds; });
    check("「自信あり」の数は1問につき1回だけ（2つのタブで同じ問題を当てても2回足さない）", n && n.n === 1 && n.ok === 1, JSON.stringify(n));
    await ctx.close();
  }

  // 古いタブ：同じ問題を2つのタブで開き、片方で答えたら、もう片方は二重に入れない
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const a = await newPage(390, ctx); await closeHow(a); await a.click("#go-d");
    const b = await ctx.newPage(); b.on("pageerror", (e) => errors.push(e.message)); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await solve(a);
    await b.click(`.ch[data-j="${await ansIdx(b)}"]`);
    await b.waitForTimeout(200);
    const s = await mem(a);
    check("古いタブで同じ問題に答えても二重に数えない", s.runs.d.res.length === 1 && Object.values(s.dex).reduce((x, y) => x + y) === 1);
    // ヒントの数は、別のタブで使った分も減らさない
    await a.click("#next"); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await a.click("#hint"); await a.click("#hint");
    await b.click("#hint");
    check("別のタブで使ったヒントの数を減らさない", (await mem(a)).runs.d.cur.hints === 2);
    // 正解した時も、別のタブで使ったヒントを合わせて★を数える（2026-11-07 CodeRabbit）
    await b.click(`.ch[data-j="${await ansIdx(b)}"]`); await why(b); await b.waitForTimeout(150);
    check("正解の時も別のタブのヒントを合わせて数える（★1）", (await mem(b)).runs.d.res[1].m === 2);
    await ctx.close();
  }

  // 1問を深くする（shared-workflows routines/game-dev.md「1問を深くする」）：自信をかける・2段目「当てはまる、いちばん上の目安は？」・復習
  {
    const q = await newPage(); await closeHow(q);
    await q.evaluate((tags) => __nm.save((s) => { s.runs.p = { mode: "p", date: __nm.todayKey(), list: tags, res: [], cur: null, id: "dp" }; }), ["nin30|dp1", "nin33|dp2", "nkg28|dp3"]);
    await q.evaluate(() => { Depth.runStart(); __nm.play("p"); });
    const sb = await q.$eval("#dp-sure", (b) => [b.getBoundingClientRect().height, b.getAttribute("aria-pressed"), b.textContent]);
    check("自信のボタン：高さ44px以上・はじめは押していない", sb[0] >= 44 && sb[1] === "false", sb.join(","));
    await q.click("#dp-sure");
    check("自信のボタンを押すと ✓ が出る（色だけで分けない）", (await q.getAttribute("#dp-sure", "aria-pressed")) === "true" && (await q.textContent("#dp-sure")).includes("✓"));
    await q.click(`.ch[data-j="${await wrongIdx(q)}"]`);
    check("自信ありでまちがえると、知らせに「思いこみ」と出て、自信は変えられない", (await q.textContent("#msg")).includes("思いこみ") && await q.locator("#dp-sure:disabled").count() === 1);
    check("まちがえたその時に復習へ入る（解き終えずにやめても残る。2026-11-11 CodeRabbit）", await q.evaluate(() => { const d = JSON.parse(localStorage.getItem("akk-depth") || "{}"); return !!(d.rv && d.rv[__nm.cur().tag]); }));
    await q.click(`.ch[data-j="${await ansIdx(q)}"]`);
    check("正解すると、2段目「どの段階？」が4つ出る（押せる所は44px以上）", await q.locator(".why button").count() === 4 && await q.locator(".verdict").count() === 0 && (await q.$$eval(".why button", (b) => b.every((x) => Math.round(x.getBoundingClientRect().height) >= 44))));
    check("2段目の読み上げは、2段目の問いと4つの目安だけ（1段目の選び肢を読まない。funka-level #1 の CodeRabbit）", await q.evaluate(() => { const e = [...document.querySelectorAll("[data-a11y-say]")]; return e.length === 5 && e[0].textContent.includes("どの段階") && e.slice(1).every((x) => x.matches(".why button")); }));
    check("2段目の間は、1段目の選び肢は押せない", await q.evaluate(() => [...document.querySelectorAll(".ch")].every((b) => b.disabled)));
    await q.reload(); await q.waitForTimeout(150); await q.evaluate(() => __nm.play("p"));
    check("2段目の途中で閉じても、2段目から続く", await q.locator(".why button").count() === 4);
    const wg = await q.evaluate(() => Object.keys(__nm.G.GROUPS).find((x) => x !== __nm.cur().P.grp));
    await q.click(`.why button[data-g="${wg}"]`);
    check("2段目でまちがえると ✕ ちがう（破線）・もう一度選べる", await q.locator(".why button.ng").count() === 1 && (await q.textContent("#msg")).includes("✕"));
    check("2段目でまちがえると「境目は 25・28・31」と出る", (await q.textContent("#msg")).includes("25・28・31"));
    await q.click("#hint");
    const ng1 = await q.locator(".why button:disabled").count();
    check("2段目のヒントは、まちがえた目安とは別のちがう目安を消す（★を使って何も消えないことが無い。2026-11-11 CodeRabbit）", ng1 === 2 && await q.locator(".why button:not(:disabled)").count() === 2, ng1);
    await q.reload(); await q.waitForTimeout(150); await q.evaluate(() => __nm.play("p"));
    check("2段目のヒントで消した目安は、閉じて開き直しても消えたまま（ヒントも押せないまま）", await q.locator(".why button:disabled").count() === ng1 && ng1 >= 1 && await q.locator("#hint:disabled").count() === 1 && (await q.textContent("#hintbox")).includes("消しました"));
    await why(q); await q.waitForSelector(".verdict");
    const m0 = await q.evaluate(() => __nm.load().runs.p.res[0].m);
    check("★は1段目と2段目のまちがい・ヒントを合わせて数える（1＋1＋1＝3）", m0 === 3, m0);
    check("正解した画面に、目安と、自信ありでまちがえたことが出る", (await q.textContent(".verdict")).includes(G.GROUPS[G.make("nin30|dp1").grp].name) && (await q.textContent(".verdict")).includes("自信ありでまちがえた"));
    await q.click("#next");
    await q.click(`.ch[data-j="${await ansIdx(q)}"]`); await why(q); await q.click("#next");
    await q.click(`.ch[data-j="${await ansIdx(q)}"]`);
    check("数あての問題は2段目「どの段階？」が出る", await q.locator(".why button").count() === 4);
    await why(q); await q.waitForSelector(".verdict");
    await q.click("#next"); await q.waitForTimeout(150);
    check("終えた直後の結果に「自信ありの当たり」が出る", (await q.textContent("#surestat")).includes("0/1"));
    const dp = await q.evaluate(() => JSON.parse(localStorage.getItem("akk-depth") || "{}"));
    check("まちがえた・ヒントを使った問題だけ復習に入る", Object.keys(dp.rv || {}).join() === "nin30|dp1", Object.keys(dp.rv || {}).join(","));
    await q.evaluate(() => { const d = JSON.parse(localStorage.getItem("akk-depth")); for (const k in d.rv) d.rv[k].due = "2026-01-01"; localStorage.setItem("akk-depth", JSON.stringify(d)); });
    await q.goto(url); await q.waitForTimeout(150);
    check("日の来た復習があると、ホームに「復習 1問」", (await q.textContent("#go-r")).includes("復習 1問"));
    const before = await mem(q);
    await q.click("#go-r");
    check("復習の画面は「復習」と出る・同じ問題", (await q.textContent("header")).includes("復習") && await q.evaluate(() => __nm.cur().tag) === "nin30|dp1");
    await solve(q); await q.click("#next"); await q.waitForTimeout(150);
    const after = await mem(q), dp2 = await q.evaluate(() => JSON.parse(localStorage.getItem("akk-depth")));
    check("復習を終えると結果は「復習」・今日の記録は増えない・シェアは出ない", (await q.textContent("h1")).includes("復習") && JSON.stringify(after.days) === JSON.stringify(before.days) && await q.locator("#share").count() === 0);
    { const r1 = dp2.rv && dp2.rv["nin30|dp1"], d3 = new Date(Date.parse(TODAY + "T00:00:00Z") + 3 * 864e5).toISOString().slice(0, 10);
      check("復習で一度で正解すると、次は3日後へ進む（同じ問題が残り、段は1・期限はちょうど3日後。toukyu-yomi #1 の CodeRabbit）", !!r1 && r1.s === 1 && r1.due === d3, JSON.stringify(r1)); }
    await q.goto(url); await q.waitForTimeout(150);
    check("復習を終えたら、ホームの「復習」は消える", await q.locator("#go-r").count() === 0);
    await q.evaluate(() => { const d = JSON.parse(localStorage.getItem("akk-depth")); d.rv["nai|1"] = { s: 0, due: "2026-01-01", t: 1 }; d.rv["constructor|x"] = { s: 0, due: "2026-01-01", t: 2 }; localStorage.setItem("akk-depth", JSON.stringify(d)); });
    await q.goto(url); await q.waitForTimeout(150);
    check("作り直せない鍵（無い種類・constructor）は復習に数えず、ホームも出る", await q.locator("#go-d").count() === 1 && await q.locator("#go-r").count() === 0);
    // 別のタブで2段目へ進んでいたら、この画面も2段目になる・別のタブで先に進んだ古い画面は復習の段を戻さない（2026-11-11 CodeRabbit）
    { const tq = "nin30|dq1";
      await q.goto(url); await q.waitForTimeout(150);
      await q.evaluate((t) => { __nm.save((s) => { s.runs.p = { mode: "p", date: __nm.todayKey(), list: [t], res: [], cur: null, id: "dq" }; }); __nm.play("p"); }, tq);
      await q.evaluate((t) => __nm.save((s) => { s.runs.p.cur = { i: 0, tag: t, wrong: [], hints: 0, step: 2, w2: [] }; }), tq);
      await q.click("#hint"); await q.waitForTimeout(100);
      check("別のタブで2段目へ進んでいたら、この画面も2段目になる", await q.locator(".why button").count() === 4 && await q.evaluate(() => __nm.cur().step) === 2);
      await q.evaluate((t) => { __nm.save((s) => { s.runs.p.res.push({ m: 0 }); s.runs.p.cur = null; }); const d = JSON.parse(localStorage.getItem("akk-depth")); d.rv[t] = { s: 2, due: "2099-01-01", t: 9 }; localStorage.setItem("akk-depth", JSON.stringify(d)); }, tq);
      await q.click("#hint"); await q.waitForTimeout(50);
      check("別のタブで先に進んだ古い画面でヒントを押しても、復習の段は戻らない", await q.evaluate((t) => JSON.parse(localStorage.getItem("akk-depth")).rv[t].s, tq) === 2);
    }
    // 復習の途中でヒント・まちがいがあって日の来た問題が0になっても、ホームの「復習の続きから」で戻れる（2026-11-11 CodeRabbit）
    { const rk = Object.keys(dp2.rv)[0];
      await q.evaluate((k) => { const d = JSON.parse(localStorage.getItem("akk-depth")); d.rv = { [k]: { s: 0, due: "2026-01-01", t: 3 } }; localStorage.setItem("akk-depth", JSON.stringify(d)); }, rk);
      await q.goto(url); await q.waitForTimeout(150); await q.click("#go-r"); await q.click("#hint");
      await q.evaluate(() => __nm.save((s) => { s.runs.r.date = "2026-01-02"; }));
      await q.goto(url); await q.waitForTimeout(150);
      check("復習の途中でヒントを使って日の来た問題が0になっても・日が替わっても、ホームの「復習の続きから」で戻れる", ((await q.locator("#go-r").count()) ? await q.textContent("#go-r") : "").includes("続きから"));
      if (await q.locator("#go-r").count()) { await q.click("#go-r"); check("復習の続きは同じ問題・使ったヒントはそのまま", await q.evaluate(() => __nm.cur().tag) === rk && await q.evaluate(() => __nm.cur().hints) === 1); }
    }
    await q.context().close();
  }
  // スマホ幅・とても大きい文字でもはみ出さない・押す所は44px以上
  {
    const bad = [], small = [];
    for (const [w, fs] of [[320, 3], [390, 2], [320, 1]]) {
      const q = await newPage(w); await closeHow(q);
      await q.evaluate((fs) => localStorage.setItem("akk-fs", String(fs)), fs); await q.reload(); await q.waitForTimeout(150);
      for (const go of [null, "#go-d", "solve", "#go-cal", "#go-dex", "#go-ach", "#go-e"]) {
        if (go === "solve") { await solve(q); }
        else if (go) { await q.goto(url); await q.waitForTimeout(100); await q.click(go); }
        await q.waitForTimeout(100);
        const ov = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ov > 0) bad.push(`${w}px 文字${fs} ${go || "ホーム"} ${ov}px`);
        small.push(...(await q.$$eval("button:not([disabled]), a[href]", (bs) => bs.filter((b) => b.checkVisibility() && !b.closest(".cal")).filter((b) => Math.round(b.getBoundingClientRect().height) < 44).map((b) => (b.id || b.className || b.textContent).slice(0, 20)))).map((x) => `${w}/${fs}/${go}:${x}`));
      }
      await q.context().close();
    }
    check("幅320px・とても大きい文字でも横にはみ出さない", bad.length === 0, bad.join(" / "));
    check("押せる所は高さ44px以上", small.length === 0, [...new Set(small)].slice(0, 8).join(","));
  }

  // 見やすさの設定を全部入れても、ページの一番下まで動ける（読み上げの class が html に当たって固まった。2026-11-05）
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 700 } });
    await ctx.addInitScript(() => localStorage.setItem("a11y-v1", JSON.stringify({ read: true, cvd: true, calm: true, say: true, ruby: true })));
    const q = await newPage(390, ctx); await closeHow(q);
    const r = await q.evaluate(() => { window.scrollTo(0, 1e5); const f = document.querySelector("footer").getBoundingClientRect(); return [scrollY, Math.round(f.bottom), innerHeight, getComputedStyle(document.documentElement).position]; });
    check("見やすさの設定を全部入れても、いちばん下まで動ける（html が固定されない）", r[0] > 0 && r[1] <= r[2] && r[3] === "static", r.join(","));
    await ctx.close();
  }
  // キーボードだけで遊べる（Tab と Enter）
  {
    const q = await newPage(); await closeHow(q);
    await q.focus("#go-d"); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    const j = await ansIdx(q);
    await q.focus(`.ch[data-j="${j}"]`); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    if (await q.locator(".why button").count()) { await q.focus(`.why button[data-g="${await q.evaluate(() => __nm.cur().P.grp)}"]`); await q.keyboard.press("Enter"); await q.waitForTimeout(100); }
    check("キーボードだけで選んで答えられる（2段目もキーボードで）", await q.locator(".verdict").count() === 1);
    await q.context().close();
  }
} catch (e) { check("ブラウザでの検査が最後まで動く", false, e.stack.split("\n").slice(0, 3).join(" ")); }

// くらべの問題を「読む」で読み上げると、A・B の場所・気温・湿度も読む（絵の中の字だけにしない。PR #1 の CodeRabbit）
{ const q = await newPage(); await closeHow(q);
  await q.evaluate(() => { __nm.save((s) => { s.runs.p = { mode: "p", date: __nm.todayKey(), list: ["cin3|say1"], res: [], cur: null, id: "say" }; }); __nm.play("p"); });
  const say = await q.evaluate(() => { const P = __nm.cur().P, e = document.querySelector("#card .sit[data-a11y-say]"); return [e ? e.textContent : "", P.items.map((x) => `気温${x.t}℃・湿度${x.h}%`)]; });
  check("くらべの問題の読み上げに A・B の場所・気温・湿度が入る", say[0].startsWith("A：") && say[1].every((t) => say[0].includes(t)), say[0]);
  await q.context().close(); }
// 深さの部品（shared-workflows template/qa/depth-check.mjs）
{ const e = await checkDepth(readFileSync(path.join(root, "depth.js"), "utf8")); check("depth.js（自信をかける・復習）の動き", e.length === 0, e.join(" / ")); }
// 2段目の目安：どの種類にもある（5つのどれか）
{ const q = await newPage(); await closeHow(q);
  check("保存に失敗したら、保存できるまで帯（#savewarn）で知らせ続け、保存できたら消す", await q.evaluate(async () => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error("full"); }; __nm.save(() => {}); __nm.save(() => {}); const one = document.querySelectorAll("#savewarn").length === 1 && document.getElementById("savewarn").textContent.includes("保存できませんでした"); await new Promise((r) => setTimeout(r, 1500)); const stay = !!document.getElementById("savewarn"); Storage.prototype.setItem = orig; __nm.save(() => {}); return one && stay && !document.getElementById("savewarn"); }));
  await q.evaluate(() => __nm.start("e")); await q.waitForTimeout(100);
  await q.click(`.ch[data-j="${await ansIdx(q)}"]`); await why(q); await q.waitForSelector(".verdict");
  await q.click("#quit"); await q.waitForTimeout(150);
  check("とことんで正解した直後でも「ここで降りる」が効き、その問題も数える", (await q.textContent("#eres")).includes("1問"), await q.textContent("body"));
  // 保存に失敗したまま「ここで降りる」を押しても、保存してあった途中の回を戻さない（CodeRabbit kumo-namae#1）
  await q.evaluate(() => __nm.start("e")); await q.waitForTimeout(100);
  await q.click(`.ch[data-j="${await ansIdx(q)}"]`); await why(q); await q.waitForSelector(".verdict");
  { const eid = await q.evaluate(() => __nm.load().runs.e.id);
    await q.evaluate(() => { window.__origSet = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error("full"); }; });
    await q.click("#quit"); await q.waitForTimeout(150);
    const back = await q.evaluate(() => { const r = __nm.load().runs.e; return r ? r.id : null; });
    await q.evaluate(() => { Storage.prototype.setItem = window.__origSet; __nm.save(() => {}); });
    check("保存に失敗したまま「ここで降りる」を押しても、終えた回が「とことんの続き」に戻らない", back === null && (await q.evaluate(() => __nm.load().runs.e)) === null, `${eid} → ${back}`); }
  await q.close(); }
{ const q = await newPage(); await closeHow(q);
  await q.evaluate(() => { localStorage.setItem("akk-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, adays: {}, dex: { constructor: 1, toString: 2, nin30: 1 }, runs: {}, kofi: {}, ach: {}, ebest: 0 })); }); await q.reload(); await q.waitForTimeout(150);
  check("記録に constructor などの鍵が入っても、まなび帳と実績の種類に数えない（CodeRabbit funka-level#1）", (await q.textContent("#go-dex")).includes("1/39") && await q.evaluate(() => __nm.tally(__nm.load()).kinds) === 1, await q.textContent("#go-dex"));
  await q.evaluate(() => { localStorage.setItem("akk-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, adays: {}, dex: {}, runs: {}, kofi: {}, ach: {}, ebest: { toString: null } })); }); await q.reload(); await q.waitForTimeout(150);
  check("記録の数の所に数でも文字でもない物（{toString:null}）が入っても、ホームが出る（toppu-yomi #1 の CodeRabbit）", await q.locator("#go-dex").count() === 1);
  await q.evaluate((d) => { localStorage.setItem("akk-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, adays: {}, dex: {}, runs: { p: { mode: "p", date: d, list: ["nin30|w2x"], res: [], cur: { wrong: [], hints: 0, step: 2, w2: [{ toString: null }, "s2"] }, id: "w2x" } }, kofi: {}, ach: {}, ebest: 0 })); }, TODAY); await q.reload(); await q.waitForTimeout(150);
  check("途中の2段目のまちがい w2 に文字でない物（{toString:null}）が入っても、ホームが出る（toukyu-yomi #1 の CodeRabbit）", await q.locator("#go-dex").count() === 1);
  await q.close(); }
{ const bad = G.KINDS.filter((k) => { for (let i = 0; i < 200; i++) { const P = G.make(`${k.id}|g${i}`); if (!k.fact ? !G.GROUPS[P.grp] : P.grp) return true; } return false; }).map((k) => k.id), used = new Set(G.KINDS.flatMap((k) => Array.from({ length: 200 }, (_, i) => G.make(`${k.id}|u${i}`).grp)).filter(Boolean));
  check("2段目「どの段階？」：数あて・くらべの問題はどれも4つのどれかで、4つとも使う。決まりの問題には2段目が無い", bad.length === 0 && Object.keys(G.GROUPS).join() === "s1,s2,s3,s4" && used.size === 4, bad.join(",")); }
// 共通部品 game-core（shared-workflows template/qa/core-check.mjs）：はじめての練習の吹き出し・？遊び方・感想・不具合の帯（PR #1 の CodeRabbit）
// first: false・solve なし：吹き出しの1つ目で「やってみる」を押すと、2つ目（答えたあとの「次へ」）を待つあいだ吹き出しの箱が hidden になるが、
// core-check の「やってみる」を押す輪は箱でなくボタンの hidden だけを見て、見えないボタンを押そうとして30秒で止まる（ひな形の検査の見分けの問題。shared-workflows へ報告した）。
// はじめての案内は、このファイルの「はじめて開くと遊び方が出る」「その場で『見た』が残る」で見る。直ったら first と solve を戻す
try { await checkCore({ browser, url, check, first: false }); } catch (e) { check("game-core の検査が最後まで動く", false, e.message.split("\n")[0]); }
// 引き継ぎコード（shared-workflows template/qa/transfer-check.mjs）
try {
  const sample = { "akk-v1": JSON.stringify({ v: 1, tut: true, days: { "2026-11-13": { m: [0, 1, 0, 0, 2], k: ["nin28", "cin3", "nin30", "alert35", "cin5"] } }, hdays: {}, adays: {}, dex: { nin28: 1, cin3: 1, nin30: 1, alert35: 1, cin5: 1 }, runs: {}, kofi: {}, ach: {}, ebest: 7, t: 1 }), "akk-fs": "3", "akk-depth": JSON.stringify({ v: 1, rv: { "nin30|x1": { s: 1, due: "2026-11-20", t: 5 } } }) }; // 復習の記録も引き継ぐかを見る（CodeRabbit shindo-yomi#1）
  await checkTransfer({ browser, url, game: "atsusa-keisan", sample, check, open: async (pg) => { await firstClose(pg); } });
} catch (e) { check("引き継ぎの検査が最後まで動く", false, e.message.split("\n")[0]); }
await browser.close();
server.close();
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し）
  const { spawnSync } = await import("node:child_process");
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# 暑さ指数けいさん QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
