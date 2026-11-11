// 計算結果が前の版と同じかを確認する。
// test/golden.json は、UI を作り直す前の版（Calculator.vue に計算があった版）を本物のブラウザで動かし、
// 固定の手で 1 局ずつ打って、各巡の数字を記録したもの。同じ手を src/game.js と wasm で打ち、照合する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { sort_tiles } from "../src/mahjong.js";
import {
  makeYama,
  tempaiNotenPlusAbs,
  notenNotenMinusAbs,
  isAgariStr,
  requestAll,
  mergeResults,
  scoreDiscard,
} from "../src/game.js";
import { loadProcessRequest } from "./wasm.js";

const golden = JSON.parse(fs.readFileSync(new URL("./golden.json", import.meta.url), "utf8"));

// 前の版の既定: 考慮する項目は全部（1+2+4+8+16+32）、期待値最大化、他家の聴牌率 72 %
const FLAG = 63;
const PLUS = tempaiNotenPlusAbs(0.72);
const MINUS = notenNotenMinusAbs(0.72);

function summarize(seed, s, result) {
  const t = Math.min(17, s.turn);
  const cands = result.success
    ? result.response.candidates
        .filter(Boolean)
        .map((c) => ({
          tile: c.tile,
          down: !!c.syanten_down,
          req: c.required_tiles.reduce((a, x) => a + x.count, 0),
          exp: c.exp_values ? c.exp_values[t - 1] : null,
          win: c.win_probs ? c.win_probs[t - 1] : null,
          ten: c.tenpai_probs ? c.tenpai_probs[t - 1] : null,
        }))
        .sort((a, b) => a.tile - b.tile)
    : [];
  const row = {
    seed, turn: s.turn, hand: [...s.hand], kawa: [...s.kawa], dora: [...s.dora],
    lost: s.lost, lost_now: s.lost_now, agari_rate: s.agari_rate, tempai_rate: s.tempai_rate,
    agari_rr: s.agari_rr, tempai_rr: s.tempai_rr,
    success: result.success, syanten: result.response ? result.response.syanten : null, err: result.err_msg ?? null,
    agari: !result.success && isAgariStr(result.err_msg), cands,
  };
  // 記録したときと同じ手: 奇数のシードは期待値が最大の候補、偶数は 3 巡に 1 回だけ手牌の決まった位置
  const withExp = cands.filter((c) => c.exp !== null && s.hand.includes(c.tile));
  if ((seed % 2 === 1 || s.turn % 3 !== 0) && withExp.length) {
    withExp.sort((a, b) => b.exp - a.exp || a.tile - b.tile);
    row.next = withExp[0].tile;
  } else {
    row.next = s.hand[(s.turn * 7 + (seed % 5)) % s.hand.length];
  }
  return row;
}

function play(pr, seed) {
  const yama = makeYama(seed, []);
  const hand = yama.slice(0, 14);
  sort_tiles(hand);
  const s = { turn: 1, hand, kawa: [], dora: [yama[14]], tsumo: [yama[0]], lost: 0, lost_now: 0, agari_rate: 1, tempai_rate: 1, agari_rr: 1, tempai_rr: 1 };
  const calc = () => {
    const data = { zikaze: 27, bakaze: 27, turn: Math.min(17, s.turn), dora_indicators: s.dora, flag: FLAG, hand_tiles: s.hand, melded_blocks: [], tsumo: s.tsumo[s.tsumo.length - 1], kawa: s.kawa };
    return mergeResults(requestAll(pr, data), data.turn, PLUS, MINUS).result;
  };
  let result = calc();
  const rows = [];
  for (;;) {
    const row = summarize(seed, s, result);
    rows.push(row);
    if (row.turn >= 18 || row.agari) break;
    const tile = row.next;
    const pre = result;
    s.hand.splice(s.hand.indexOf(tile), 1);
    s.kawa.push(tile);
    s.hand.push(yama[s.turn + 14]);
    s.tsumo.push(yama[s.turn + 14]);
    sort_tiles(s.hand);
    s.turn++;
    if (pre && pre.success) {
      const sc = scoreDiscard(pre, tile, s.turn - 2);
      s.agari_rr = sc.agari_rate_rate;
      s.tempai_rr = sc.tempai_rate_rate;
      s.lost_now = sc.lost;
      s.agari_rate *= s.agari_rr;
      s.tempai_rate *= s.tempai_rr;
      s.lost += s.lost_now;
    }
    result = calc();
  }
  return rows;
}

test("牌山はシードで決まる（前の版と同じ配牌・ドラ表示）", () => {
  for (const [seed, rows] of Object.entries(golden)) {
    const yama = makeYama(Number(seed), []);
    const hand = yama.slice(0, 14);
    sort_tiles(hand);
    assert.deepEqual(hand, rows[0].hand, `seed ${seed}`);
    assert.deepEqual([yama[14]], rows[0].dora, `seed ${seed}`);
  }
});

test("不聴罰符の期待値（他家の聴牌率 72 %。前の版のメニューの表示と同じ）", () => {
  assert.equal(PLUS, "755");
  assert.equal(MINUS, "1942");
});

test("固定の手で打った各巡の結果が前の版と同じ", { timeout: 600000 }, async () => {
  const pr = await loadProcessRequest();
  for (const [seed, want] of Object.entries(golden)) {
    const got = play(pr, Number(seed));
    // shanten_text は画面の文言なので比較しない
    const strip = (rows) => rows.map((r) => ({ ...r, shanten_text: undefined }));
    assert.deepEqual(strip(got), strip(want), `seed ${seed}`);
  }
});
