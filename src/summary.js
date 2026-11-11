// 「前の一手」の 1 行の要約: 最善の打牌と、自分の打牌。表示だけに使い、採点（src/game.js の scoreDiscard）は変えない。
import { Aka2Normal } from "./mahjong.js";

/// pre_result（打つ前の計算の結果）と、捨てた牌（tile）から、最善の打牌と自分の打牌の値を返す。
/// 3 向聴以内は、その巡の期待値（scoreDiscard と同じ値）で比較する。4 向聴以上は期待値が無いので受入の枚数で比較する。
/// 返り値: { kind: "exp" | "req", best_tile, best_value, my_value（候補に無ければ null）, same }。比較できないときは null。
export function discardSummary(pre_result, tile) {
  if (!pre_result || !pre_result.success || !pre_result.response) return null;
  const res = pre_result.response;
  if (res.result_type != 1 || !Array.isArray(res.candidates)) return null;
  const cands = res.candidates.filter(Boolean);
  if (cands.length === 0) return null;
  const index = pre_result.request.turn - 1;
  const hasExp = cands.every((c) => c.exp_values && c.exp_values[index] !== undefined);
  const value = hasExp
    ? (c) => c.exp_values[index]
    : (c) => c.required_tiles.reduce((s, t) => s + t.count, 0);
  let best = cands[0];
  for (const c of cands) if (value(c) > value(best)) best = c;
  let mine = cands.find((c) => c.tile === tile);
  if (!mine) mine = cands.find((c) => c.tile === Aka2Normal(tile));
  // 同じ値の候補が並ぶときは、自分の打牌を最善とみなす
  if (mine && value(mine) === value(best)) best = mine;
  return {
    kind: hasExp ? "exp" : "req",
    best_tile: best.tile,
    best_value: value(best),
    my_value: mine ? value(mine) : null,
    same: mine === best,
  };
}
