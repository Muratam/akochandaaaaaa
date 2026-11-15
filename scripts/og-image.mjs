#!/usr/bin/env node
// Slack・X などのリンクのカードの画像（public/og.png、1200×630 の PNG）を作る。
// アプリの画面を本物のブラウザ（Playwright の chromium）で撮り、sagisawa のダークテーマの帯（印・アプリ名・説明・URL）を重ねる。
//   使い方: npm run build → npx vite preview --port 4173 --strictPort（別の端末）→ node scripts/og-image.mjs http://localhost:4173
//   Playwright はリポジトリの依存に入れていない。PLAYWRIGHT_DIR（既定 ~/.local/share/sagisawa-admin/screenshot、管理者AI のサーバー）の playwright を使う
//   文言を変えたら index.html の og:title・og:description も合わせる
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const CARD = {
  path: "/akochandaaaaa/",
  title: "牌効率チェッカー",
  /** 帯の 2 行目（1 行に収まる長さ。index.html の og:description より短く） */
  subtitle: "一人で麻雀を打ち、打牌ごとに最善と比較して採点",
};
const out = fileURLToPath(new URL("../public/og.png", import.meta.url));
const base = (process.argv[2] ?? "http://localhost:4173").replace(/\/$/, "");

const pwDir = process.env.PLAYWRIGHT_DIR ?? `${process.env.HOME}/.local/share/sagisawa-admin/screenshot`;
process.env.PLAYWRIGHT_BROWSERS_PATH ??= `${pwDir}/browsers`;
const { chromium } = createRequire(`${pwDir}/package.json`)("playwright");

/** アプリの画面を、カードに見せたい状態にする。撮る範囲（1280 幅の画面の座標。幅 1280 の範囲が幅 1200 に縮み、下の 124px は帯で隠れるので、見えるのは上から約 540px）を返す */
async function prepare(page) {
  // 計算（wasm）の準備を待ち、2 巡打った盤面にする（字牌があれば字牌から、無ければツモ切り。候補の表と結果のゲージが出る）
  await page.waitForTimeout(2500);
  const idle = () => page.waitForFunction(() => !document.querySelector(".hand .tile-btn[disabled]"), null, { timeout: 30000 });
  for (let i = 0; i < 2; i++) {
    const honor = page.locator('.hand .tile-btn:not([disabled])[aria-label^="東"], .hand .tile-btn:not([disabled])[aria-label^="南"], .hand .tile-btn:not([disabled])[aria-label^="西"], .hand .tile-btn:not([disabled])[aria-label^="北"], .hand .tile-btn:not([disabled])[aria-label^="白"], .hand .tile-btn:not([disabled])[aria-label^="發"], .hand .tile-btn:not([disabled])[aria-label^="中"]');
    await ((await honor.count()) ? honor.first() : page.locator(".hand .tile-btn:not([disabled])").last()).click();
    await idle();
    await page.waitForTimeout(300);
  }
  await page.mouse.move(0, 0);
  return { x: 0, y: 0, width: 1280, height: 675 };
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const browser = await chromium.launch();
try {
  const app = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
  await app.goto(`${base}${CARD.path}`, { waitUntil: "load" });
  const clip = (await prepare(app)) ?? { x: 0, y: 0, width: 1280, height: 675 };
  const shot = (await app.screenshot({ clip })).toString("base64");

  // 色はポータルのトークン（--bg #0e1419・--bg-side #0a0f13・--line-strong #31414f・--ink #e3eaef・--ink-soft #8d9cab・--accent #47c8e6）
  const card = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await card.setContent(`<!doctype html><meta charset="utf-8"><style>
    body { margin: 0; width: 1200px; height: 630px; overflow: hidden; position: relative; background: #0e1419; font-family: "Noto Sans JP", system-ui, sans-serif; }
    .shot { position: absolute; left: 0; top: 0; width: 1200px; height: auto; }
    .fade { position: absolute; left: 0; right: 0; bottom: 124px; height: 50px; background: linear-gradient(rgba(10,15,19,0), rgba(10,15,19,0.85)); }
    .band { position: absolute; left: 0; right: 0; bottom: 0; height: 124px; box-sizing: border-box; display: flex; align-items: center; gap: 28px; padding: 0 52px; background: #0a0f13; border-top: 1px solid #31414f; }
    .mark { flex: none; display: grid; place-items: center; width: 68px; height: 68px; border: 2px solid #31414f; border-radius: 14px; color: #47c8e6; font-size: 38px; font-weight: 700; }
    .text { min-width: 0; }
    .title { color: #e3eaef; font-size: 42px; font-weight: 700; line-height: 1.2; letter-spacing: 0.01em; }
    .desc { margin-top: 2px; color: #8d9cab; font-size: 22px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .site { flex: none; margin-left: auto; color: #8d9cab; font-size: 22px; }
    .site b { color: #e3eaef; font-weight: 700; }
  </style>
  <img class="shot" src="data:image/png;base64,${shot}">
  <div class="fade"></div>
  <div class="band">
    <div class="mark">鷺</div>
    <div class="text"><div class="title">${esc(CARD.title)}</div><div class="desc">${esc(CARD.subtitle)}</div></div>
    <div class="site"><b>sagisawa</b>.0am.jp${esc(CARD.path)}</div>
  </div>`, { waitUntil: "load" });
  await card.evaluate(() => document.fonts.ready);
  await card.screenshot({ path: out, type: "png" });
  console.log(`og-image: ${out}`);
} finally {
  await browser.close();
}
