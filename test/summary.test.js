// 「前の一手」の要約（src/summary.js）が、最善の打牌と自分の打牌を正しく選ぶかを確認する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { discardSummary } from "../src/summary.js";
import { Tile } from "../src/mahjong.js";

const req = (n) => [{ tile: 0, count: n }];
const result = (turn, cands) => ({ success: true, request: { turn }, response: { result_type: 1, syanten: 1, candidates: cands } });

test("期待値で比較し、その巡の値を使う", () => {
  const r = result(3, [
    { tile: Tile.Manzu1, exp_values: [0, 0, 900], required_tiles: req(4) },
    { tile: Tile.Pinzu9, exp_values: [0, 0, 1200], required_tiles: req(8) },
    null,
  ]);
  assert.deepEqual(discardSummary(r, Tile.Manzu1), { kind: "exp", best_tile: Tile.Pinzu9, best_value: 1200, my_value: 900, same: false });
  assert.equal(discardSummary(r, Tile.Pinzu9).same, true);
});

test("同じ値なら自分の打牌を最善とみなす。赤は普通の 5 として探す", () => {
  const r = result(1, [
    { tile: Tile.Sozu5, exp_values: [500], required_tiles: req(4) },
    { tile: Tile.Ton, exp_values: [500], required_tiles: req(4) },
  ]);
  assert.equal(discardSummary(r, Tile.Ton).same, true);
  assert.equal(discardSummary(r, Tile.AkaSozu5).same, true);
});

test("期待値が無い（4 向聴以上）ときは受入で比較し、候補に無い牌は null", () => {
  const r = result(2, [
    { tile: Tile.Manzu1, required_tiles: req(30) },
    { tile: Tile.Haku, required_tiles: req(40) },
  ]);
  assert.deepEqual(discardSummary(r, Tile.Manzu1), { kind: "req", best_tile: Tile.Haku, best_value: 40, my_value: 30, same: false });
  assert.equal(discardSummary(r, Tile.Pe).my_value, null);
});

test("比較できないときは null", () => {
  assert.equal(discardSummary(null, Tile.Ton), null);
  assert.equal(discardSummary({ success: false, err_msg: "x" }, Tile.Ton), null);
  assert.equal(discardSummary(result(1, []), Tile.Ton), null);
});
