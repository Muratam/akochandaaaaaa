// 一人麻雀の進め方: 牌山・不聴罰符・wasm の結果のまとめ・打牌の採点。
// Calculator.vue から画面に関わらない計算だけを切り出したもの（中身は前の版のまま）。
// test/game.test.js が、前の版を本物のブラウザで打った結果（test/golden.json）と照合する。
import { Tile } from "./mahjong.js";

export class XorShift {
  constructor(s) {
    // Xorshift128 (init seed with Xorshift32)
    s ^= s << 13;
    s ^= 2 >>> 17;
    s ^= s << 5;
    this.x = 123456789 ^ s;
    s ^= s << 13;
    s ^= 2 >>> 17;
    s ^= s << 5;
    this.y = 362436069 ^ s;
    s ^= s << 13;
    s ^= 2 >>> 17;
    s ^= s << 5;
    this.z = 521288629 ^ s;
    s ^= s << 13;
    s ^= 2 >>> 17;
    s ^= s << 5;
    this.w = 88675123 ^ s;
  }
  // 0 ~ 1
  random() {
    let t = this.x ^ (this.x << 11);
    this.x = this.y;
    this.y = this.z;
    this.z = this.w;
    // >>>0 means 'cast to uint32'
    this.w = (this.w ^ (this.w >>> 19) ^ (t ^ (t >>> 8))) >>> 0;
    return this.w / 0x100000000;
  }
}

/// シードから牌山を作る（ドラ表示牌は除く）。
export function makeYama(seed, dora_indicators) {
  const shuffle = ([...array]) => {
    let xorshift = new XorShift(seed);
    for (let i = array.length - 1; i >= 0; i--) {
      const j = Math.floor(xorshift.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // 牌山を作成する。
  let yama = [];
  let max_yama = 34;
  for (let i = 0; i < max_yama; ++i) {
    yama = yama.concat(Array(4).fill(i));
  }
  yama[Tile.Manzu5 * 4] = Tile.AkaManzu5;
  yama[Tile.Pinzu5 * 4] = Tile.AkaPinzu5;
  yama[Tile.Sozu5 * 4] = Tile.AkaSozu5;

  // ドラ表示牌は削除する。
  for (let tile of dora_indicators) {
    let i = yama.indexOf(tile);
    yama.splice(i, 1);
  }

  // 洗牌する。
  return shuffle(yama);
}

/// 他家の聴牌率 x のときの不聴罰符の獲得期待値（文字列。前の版と同じ）
export function tempaiNotenPlusAbs(x) {
  return (
    3 * x * (1 - x) * x * 1000 +
    3 * x * (1 - x) * (1 - x) * 1500 +
    (1 - x) * (1 - x) * (1 - x) * 3000
  ).toFixed(0);
}

/// 他家の聴牌率 x のときの不聴罰符の損失期待値（文字列。前の版と同じ）
export function notenNotenMinusAbs(x) {
  return (
    x * x * x * 3000 +
    3 * x * (1 - x) * x * 1500 +
    3 * x * (1 - x) * (1 - x) * 1000
  ).toFixed(0);
}

export function isAgariStr(str) {
  if (!str) return false;
  return str.startsWith("agari:");
}

/// 通常・七対子・国士無双の 3 通りで wasm に問い合わせる（失敗したものは入れない）。
export function requestAll(process_request, data) {
  let results = [];
  try {
    data.syanten_type = 1;
    results.push(JSON.parse(process_request(JSON.stringify(data))));
  } catch {
    console.log(JSON.stringify(data));
  }
  // 七対子とかは失敗しやすい
  try {
    data.syanten_type = 2;
    let parsed = JSON.parse(process_request(JSON.stringify(data)));
    results.push(parsed);
  } catch {
    console.log(JSON.stringify(data));
  }
  try {
    data.syanten_type = 4;
    let parsed = JSON.parse(process_request(JSON.stringify(data)));
    results.push(parsed);
  } catch {
    console.log(JSON.stringify(data));
  }
  return results;
}

/// 3 通りの結果を 1 つにまとめる。期待値には不聴罰符を足し引きする（results の中身も書き換わる）。
/// 返り値の agari は和了ったとき true（呼ぶ側が結果を保存する）。
export function mergeResults(results, turn, tempai_noten_plus_abs, noten_noten_minus_abs) {
  let agari = false;
  // console.log(results.map((x) => x.response.syanten));
  results.sort((a, b) => {
    return (
      (a.response != undefined ? a.response.syanten : -1) -
      (b.response != undefined ? b.response.syanten : -1)
    );
  });
  let result_data = {
    success: false,
    request: results[0].request,
    response: {
      candidates: [],
      result_type: 1,
      syanten: 100,
      time: 0,
    },
  };
  for (let result of results) {
    if (!result.success) {
      result_data.err_msg = result.err_msg;
      if (isAgariStr(result.err_msg)) {
        result_data.succcess = false;
        agari = true;
        break;
      }
      continue;
    }
    result_data.success = true;
    for (let cand of result.response.candidates) {
      if (!cand) continue;
      if (!cand.exp_values) continue;
      if (!cand.win_probs) continue;
      if (!cand.tenpai_probs) continue;
      for (let i = 0; i < cand.exp_values.length; i++) {
        let cand_exp = cand.exp_values[i];
        let win_prob = cand.win_probs[i];
        let tenpai_prob = cand.tenpai_probs[i];
        let exp_truth =
          cand_exp +
          (tenpai_prob - win_prob) * tempai_noten_plus_abs -
          (1 - tenpai_prob + win_prob) * noten_noten_minus_abs;
        cand.exp_values[i] = exp_truth;
      }
    }
    if (result_data.response.syanten < result.response.syanten) {
      // 新しいやつが弱い場合
      if (result.response.syanten >= 4) continue;
      if (result_data.response.syanten + 1 !== result.response.syanten) {
        continue;
      }
      for (let i = 0; i < result.response.candidates.length; i++) {
        let cand = result.response.candidates[i];
        if (cand.syanten_down) {
          result.response.candidates[i] = null;
        } else {
          result.response.candidates[i].syanten_down = true;
        }
      }
    } else if (result_data.response.syanten > result.response.syanten) {
      if (result_data.response.syanten === 100) {
        result_data.response = result.response;
      } else {
        // 新しいやつが強い場合はソートしているので無い
        console.log("sort failed");
      }
      continue;
    }
    for (let cand of result.response.candidates) {
      if (!cand) continue;
      let found = false;
      for (let i = 0; i < result_data.response.candidates.length; i++) {
        let saved = result_data.response.candidates[i];
        if (saved.tile !== cand.tile) continue;
        found = true;
        // 期待値が大きい方。
        if (!saved.exp_values && cand.exp_values) {
          result_data.response.candidates[i] = cand;
          continue;
        }
        if (!cand.exp_values && saved.exp_values) {
          continue;
        }
        if (cand.exp_values && saved.exp_values) {
          let cand_exp = cand.exp_values[turn - 1];
          let saved_exp = saved.exp_values[turn - 1];
          if (cand_exp > saved_exp) {
            result_data.response.candidates[i] = cand;
          }
          continue;
        }
        // syanten_down: (...)
        if (saved.syanten_down !== cand.syanten_down) {
          if (saved.syanten_down) {
            result_data.response.candidates[i] = cand;
            continue;
          }
        }
        // required_tiles: (...)
        let cand_sum = 0;
        let saved_sum = 0;
        for (let t of saved.required_tiles) {
          saved_sum += t.count;
        }
        for (let t of cand.required_tiles) {
          cand_sum += t.count;
        }
        if (cand_sum >= saved_sum) {
          result_data.response.candidates[i] = cand;
        }
        break;
      }
      if (!found) {
        result_data.response.candidates.push(cand);
        continue;
      }
    }
  }
  return { result: result_data, agari };
}

function unwrapAka(tile) {
  if (tile === Tile.AkaManzu5) {
    return Tile.Manzu5;
  } else if (tile === Tile.AkaPinzu5) {
    return Tile.Pinzu5;
  } else if (tile === Tile.AkaSozu5) {
    return Tile.Sozu5;
  }
  return tile;
}

/// 一手前の結果（pre_result）に照らして、捨てた牌（tile）を採点する。
/// index は打牌した巡目 - 1（打牌の後の巡目 - 2）。
/// 返り値: 最善に対する和了率・聴牌率の比と、この一手で失った期待値。
export function scoreDiscard(pre_result, tile, index) {
  let found = false;
  let no_cands = true;
  let max_exp_value = -100000;
  let max_tenpai_prob = 0;
  let max_win_prob = 0;
  let selected_exp_value = 0;
  let selected_tenpai_prob = 0;
  let selected_win_prob = 0;
  let impl = () => {
    for (let cand of pre_result.response.candidates) {
      if (!cand.exp_values) return;
      if (!cand.tenpai_probs) return;
      if (!cand.win_probs) return;
      no_cands = false;
      let exp_value = cand.exp_values[index];
      let tenpai_prob = cand.tenpai_probs[index];
      let win_prob = cand.win_probs[index];
      max_exp_value = Math.max(max_exp_value, exp_value);
      max_tenpai_prob = Math.max(max_tenpai_prob, tenpai_prob);
      max_win_prob = Math.max(max_win_prob, win_prob);
      if (cand.tile === tile) {
        selected_exp_value = exp_value;
        selected_tenpai_prob = tenpai_prob;
        selected_win_prob = win_prob;
        found = true;
      }
    }
  };
  impl();
  if (!found) {
    tile = unwrapAka(tile);
    impl();
  }
  let agari_rate_rate, tempai_rate_rate, lost;
  if (found) {
    agari_rate_rate = selected_win_prob / max_win_prob;
    tempai_rate_rate = selected_tenpai_prob / max_tenpai_prob;
    if (isNaN(agari_rate_rate)) {
      agari_rate_rate = 1;
    }
    if (isNaN(tempai_rate_rate)) {
      tempai_rate_rate = 1;
    }
    lost = max_exp_value - selected_exp_value;
    if (isNaN(lost)) {
      lost = 0;
    }
  } else {
    let rate = no_cands ? 1 : 0;
    agari_rate_rate = rate;
    tempai_rate_rate = rate;
    lost = no_cands ? 0 : 2000;
  }
  return { agari_rate_rate, tempai_rate_rate, lost };
}
