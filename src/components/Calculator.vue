<template>
  <b-tabs content-class="mt-3" v-model="tab_index">
    <b-tab title="盤面" :title-link-class="linkClass(0)" class="pl-3 pr-3">
      <div v-if="turn >= 18 || is_agari">
        <h5><b>リザルト</b></h5>
        <div style="padding: 0em 0em 1em 0em">
          <b>{{ state_info_without_config }} </b>
        </div>
        <div style="padding: 0em 0em 1em 0em">
          <ShareNetwork
            key="Twitter"
            network="Twitter"
            :url="state_url"
            hashtags="牌効率チェッカー"
            :title="state_info"
            :class="['Twitter', 'social-button']"
          >
            つぶやく
          </ShareNetwork>
        </div>
        <div>
          <b-button class="mr-2" variant="primary" @click="set_random_hand"
            >次の盤面へ
          </b-button>
        </div>
        <hr />
      </div>
      <span style="padding: 1.2em 0.4em 1.2em 0.4em">
        {{ turn }} / 18 巡目
      </span>
      <span style="padding: 1.2em 0.4em 1.2em 0.4em">
        ドラ表示
        <TileImage v-for="(tile, i) in dora_indicators" :key="i" :tile="tile" />
      </span>
      <span style="padding: 1.2em 0.4em 1.2em 0.4em"> {{ shanten }} </span>
      <span style="padding: 1.2em 0.4em 1.2em 0.4em">
        {{ tile2String(bakaze) }}場
      </span>
      <span style="padding: 1.2em 0.4em 1.2em 0.4em">
        {{ tile2String(zikaze) }}家
      </span>
      <!-- <b-button class="mr-2" variant="light" @click="reset_hand"
        >一手戻す
      </b-button> -->
      <b-button class="mr-2" variant="light" @click="reset_hand"
        >はじめから
      </b-button>
      <b-form-group
        label-cols="0"
        content-cols="12"
        label=""
        label-align="right"
        class="kawa_indicators p-0"
      >
        <HandAndMeldedBlocks
          v-on:remove-tile="next_tile"
          :tsumo="
            tsumo_indicators.length === 0
              ? -1
              : tsumo_indicators[tsumo_indicators.length - 1]
          "
          :hand_tiles="hand_tiles"
          :melded_blocks="melded_blocks"
          size="lg"
        />
      </b-form-group>
      <b> スコア </b>
      <div
        class="progress"
        style="max-width: 50em; height: 1.8em; margin: 0.2em"
      >
        <div
          :class="['progress-bar']"
          :style="
            'width:' +
            (expected_score_rate * 100).toFixed(0) +
            '%; text-align: left; padding-left: 1em'
          "
        >
          期待値：{{ (expected_score_rate * 100).toFixed(0) }} % (x{{
            expected_score_rate_rate.toFixed(2)
          }})
        </div>
      </div>
      <div
        class="progress"
        style="max-width: 50em; height: 1.8em; margin: 0.2em"
      >
        <div
          :class="['progress-bar']"
          :style="
            'width:' +
            (agari_score_rate * 100).toFixed(0) +
            '%; text-align: left; padding-left: 1em'
          "
        >
          和了率：{{ (agari_score_rate * 100).toFixed(0) }} % (x{{
            agari_score_rate_rate.toFixed(2)
          }})
        </div>
      </div>
      <div
        class="progress"
        style="max-width: 50em; height: 1.8em; margin: 0.2em"
      >
        <div
          :class="['progress-bar']"
          :style="
            'width:' +
            (tempai_score_rate * 100).toFixed(0) +
            '%; text-align: left; padding-left: 1em'
          "
        >
          聴牌率：{{ (tempai_score_rate * 100).toFixed(0) }} % (x{{
            tempai_score_rate_rate.toFixed(2)
          }})
        </div>
      </div>
      <b-overlay :show="is_calculating" rounded="sm">
        <template #overlay>
          <b-icon icon="three-dots" animation="cylon" font-scale="4"></b-icon>
          <p>計算中</p>
        </template>
      </b-overlay>
      <template v-if="turn > 1">
        <hr />
        <span style="padding: 1.2em 0.4em 1.2em 0.4em">
          <TileImage
            v-if="kawa_indicators.length > 0"
            :tile="kawa_indicators[kawa_indicators.length - 1]"
          />
          <TileImage v-if="kawa_indicators.length <= 0" :tile="-1" />
          ←
          <TileImage
            v-for="(tile, i) in pre_hand_tiles"
            :key="i"
            :tile="tile"
          />
        </span>
        <Result
          :result="pre_result"
          :is_show_graph="false"
          :hand_tiles="pre_hand_tiles"
          :selected_tile="
            kawa_indicators.length > 0
              ? kawa_indicators[kawa_indicators.length - 1]
              : -1
          "
        />
      </template>
    </b-tab>
    <b-tab title="メニュー" :title-link-class="linkClass(1)" class="pl-3 pr-3">
      <h3 class="p-2">盤面情報</h3>
      <b-form-group
        label-cols="2"
        content-cols="10"
        label="盤面URL"
        label-align="right"
        class="kawa_indicators p-0"
      >
        <legend class="col-form-label">
          <a :href="state_url" target="”_blank”">
            {{ state_url }}
          </a>
        </legend>
      </b-form-group>
      <b-form-group
        label-cols="2"
        content-cols="10"
        label="シード"
        label-align="right"
        class="kawa_indicators p-0"
      >
        <legend class="col-form-label">
          {{ seed }}
        </legend>
      </b-form-group>
      <b-form-group
        label-cols="2"
        content-cols="10"
        label="自摸モード"
        label-align="right"
        class="kawa_indicators p-0"
      >
        <legend class="col-form-label">
          {{ tsumo_mode_options[tsumo_mode]["text"] }}
        </legend>
      </b-form-group>
      <b-form-group
        label-cols="2"
        content-cols="10"
        label="配牌"
        label-align="right"
        class="kawa_indicators p-0"
      >
        <HandAndMeldedBlocks
          :hand_tiles="haipai_tiles"
          :melded_blocks="melded_blocks"
          size="lg"
        />
      </b-form-group>

      <hr />
      <h3 class="p-2">盤面生成</h3>
      <b-form-group
        label-cols="2"
        content-cols="10"
        label="シード"
        label-for="tsumo-seed-target"
        label-align="center"
      >
        <b-form-input
          id="tsumo-seed-target"
          v-model="next_seed"
          style="max-width: 10em"
          size="sm"
        ></b-form-input>

        <b-tooltip
          target="tsumo-seed-target"
          triggers="hover"
          custom-class="custom-tooltip"
          placement="topright"
        >
          次の盤面のシードを設定できます。
          同じシードであれば同じ盤面になります。
        </b-tooltip>
      </b-form-group>
      <b-form-group
        label-cols="2"
        content-cols="10"
        label="自摸モード"
        label-for="tsumo-mode-target"
        label-align="center"
      >
        <b-form-radio-group
          id="tsumo-mode-target"
          v-model="next_tsumo_mode"
          :options="tsumo_mode_options"
          button-variant="outline-primary"
          size="sm"
          buttons
        ></b-form-radio-group>

        <b-tooltip
          target="tsumo-mode-target"
          triggers="hover"
          custom-class="custom-tooltip"
          placement="topright"
        >
          <ul>
            <li>通常モード: 通常の自摸設定です。</li>
            <li>
              字牌自摸らずモード:
              字牌を自摸らなくなります。手がよくなる幸運モードです。(期待値計算では字牌をツモる可能性を考慮して計算されます)
            </li>
          </ul>
        </b-tooltip>
      </b-form-group>
      <b-form-group
        label-cols="2"
        content-cols="10"
        label=""
        label-for="tsumo-mode-target"
        label-align="center"
      >
        <b-button class="mr-2" variant="primary" @click="set_random_hand"
          >盤面生成！
        </b-button>
      </b-form-group>
      <b-overlay :show="is_calculating" rounded="sm">
        <template #overlay>
          <b-icon icon="three-dots" animation="cylon" font-scale="4"></b-icon>
          <p>計算中</p>
        </template>
      </b-overlay>
    </b-tab>
    <b-tab title="遊び方" :title-link-class="linkClass(2)" class="pl-3 pr-3">
      <h4>牌効率チェッカー</h4>
      牌効率のチェックだﾞアﾞアﾞァﾞﾞァﾞアﾞ～～～～～！
      <hr />
      <h4>遊び方</h4>
      <ul>
        <li>
          ここは
          <a href="https://pystyle.info/apps/mahjong-nanikiru-simulator/"
            >https://pystyle.info/apps/mahjong-nanikiru-simulator/</a
          >
          を改変した、一人麻雀の練習ができるサイトです。 (
          <a href="https://github.com/Muratam/akochandaaaaaa">GitHub</a>
          )
        </li>
        <li>
          牌を捨てると期待値・和了率・聴牌率スコアが表示されるので、高いスコアを目指しましょう。
          最後まで期待値ゲージが100%であれば、各打牌時点で期待値が最大となる打牌ができています。
        </li>
        <li>
          速度が気になる場合は<a href="../akochandaaaaa-fast/"
            >メモリ使用高速化版</a
          >を活用ください。メモリを大量に使用するため、環境によっては動作しないことがありますので、
          その場合は<a href="../akochandaaaaa/">通常版</a>を活用ください。
        </li>
        <li>
          <ShareNetwork
            key="Twitter"
            network="Twitter"
            :url="state_url_pure"
            hashtags="牌効率チェッカー"
            title="牌効率チェッカーで、牌効率をチェック！"
            :class="['Twitter', 'social-button']"
          >
            Twitter
          </ShareNetwork>
        </li>
      </ul>

      <hr />
      <h4>考慮される項目</h4>
      <ul>
        <li>一人麻雀であり、ツモ和了のみが考慮されます。</li>
        <li>
          赤牌、裏ドラ、海底撈月、向聴戻し、手変わり を点数計算に考慮します。
        </li>
        <li>東場 / 東家。親の点数で計算します。</li>
      </ul>

      <hr />
      <h4>考慮されない項目</h4>
      <ul>
        <li>
          <b>七対子・国士無双は考慮されません。</b>
        </li>
        <li>実装の都合で、すでに捨てた牌の枚数を考慮しません。</li>
        <li>副露 (ポン、チー、暗槓、明槓、加槓)は考慮されません。</li>
        <li>
          ロン和了は考慮されません。幺九牌待ちのほうが和了やすいといったことは考慮されません。
        </li>
        <li>
          副露が存在しません。役牌や染め手など鳴かないと成立しづらい役の価値が過小評価されます。
        </li>
        <li>積み棒、不聴罰符、立直棒は点数計算に考慮しません。</li>
      </ul>
      <hr />
    </b-tab>
  </b-tabs>
</template>

<script>
import {
  sort_tiles,
  Tile,
  Tile2String,
  Hand2String,
  SyantenType,
  SyantenType2String,
  Aka2Normal,
} from "@/mahjong.js";

import HandAndMeldedBlocks from "@/components/mahjong/HandAndMeldedBlocks.vue";
import TileImage from "@/components/mahjong/TileImage.vue";
import Result from "./Result.vue";

class XorShift {
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
// めんどいので雑に(vueバインドしたくない)
let yama = [];
let yama_index = 0;

export default {
  name: "Calculator",
  components: {
    HandAndMeldedBlocks,
    Result,
    TileImage,
  },
  data() {
    let next_seed = new URL(window.location.href).searchParams.get("q");
    if (!next_seed || isNaN(+next_seed)) {
      next_seed = Math.floor(0x100000000 * Math.random());
    } else {
      next_seed = +next_seed;
    }
    let tsumo_mode = new URL(window.location.href).searchParams.get("c");
    if (!tsumo_mode || isNaN(+tsumo_mode)) {
      tsumo_mode = 0;
    } else {
      tsumo_mode = +tsumo_mode === 0 ? 0 : 1;
    }
    return {
      // Description
      tab_index: 0,
      score_tab_index: 0,

      // data
      bakaze: Tile.Ton, // 場風
      zikaze: Tile.Ton, // 自風
      turn: 1, // 現在の巡目
      syanten_type: SyantenType.Normal, // 手牌の種類
      dora_indicators: [], // ドラ
      kawa_indicators: [], // 河
      tsumo_indicators: [], // 自摸牌
      flag: [1, 2, 4, 8, 16, 32], // フラグ
      maximize_target: 0,
      tsumo_mode: tsumo_mode,
      next_tsumo_mode: tsumo_mode,
      haipai_tiles: [], // 配牌
      hand_tiles: [], // 手牌
      pre_hand_tiles: [], // 一手前の手牌
      melded_blocks: [], // 副露ブロックの一覧
      result: null, // 結果
      pre_result: null, // 一手前の結果
      is_calculating: false,
      select_tab: 0,
      Hand2String: Hand2String,
      seed: Math.floor(0x100000000 * Math.random()),
      next_seed: next_seed,
      // スコア倍率
      expected_score_rate: 1,
      agari_score_rate: 1,
      tempai_score_rate: 1,
      expected_score_rate_rate: 1,
      agari_score_rate_rate: 1,
      tempai_score_rate_rate: 1,
      // オプション
      // 場風
      input_bakaze_options: [
        { value: Tile.Ton, text: Tile2String.get(Tile.Ton) },
        { value: Tile.Nan, text: Tile2String.get(Tile.Nan) },
      ],
      // 自風
      input_zikaze_options: [
        { value: Tile.Ton, text: Tile2String.get(Tile.Ton) },
        { value: Tile.Nan, text: Tile2String.get(Tile.Nan) },
        { value: Tile.Sya, text: Tile2String.get(Tile.Sya) },
        { value: Tile.Pe, text: Tile2String.get(Tile.Pe) },
      ],
      // 手牌の種類
      input_syanten_type_options: [
        {
          value: SyantenType.Normal,
          text: SyantenType2String.get(SyantenType.Normal),
        },
        {
          value: SyantenType.Tiitoi,
          text: SyantenType2String.get(SyantenType.Tiitoi),
        },
        {
          value: SyantenType.Kokusi,
          text: SyantenType2String.get(SyantenType.Kokusi),
        },
      ],
      // 考慮する項目
      input_flag_options: [
        { value: 1, text: "向聴戻し" },
        { value: 2, text: "手変わり" },
        { value: 4, text: "ダブル立直" },
        { value: 8, text: "一発" },
        { value: 16, text: "海底自摸" },
        { value: 32, text: "裏ドラ" },
      ],
      // 重視する項目
      input_maximize_target_options: [
        {
          value: 0,
          text: "期待値最大化",
        },
        {
          value: 64,
          text: "和了確率最大化",
        },
      ],
      // 自摸モード
      tsumo_mode_options: [
        {
          value: 0,
          text: "通常モード",
        },
        {
          value: 1,
          text: "字牌自摸らずモード",
        },
      ],
    };
  },

  computed: {
    // 手牌の枚数
    n_hand_tiles() {
      return this.hand_tiles.length + this.melded_blocks.length * 3;
    },
    //
    state_info() {
      return `期待値 ${(this.expected_score_rate * 100).toFixed(0)} %・和了率${(
        this.agari_score_rate * 100
      ).toFixed(0)} %・聴牌率${(this.tempai_score_rate * 100).toFixed(
        0
      )} % の打牌をして、${this.shanten}！(シード ${this.seed} ・${
        this.tsumo_mode === 0 ? "通常モード" : "字牌自摸らずモード"
      })`;
    },
    state_info_without_config() {
      return `期待値 ${(this.expected_score_rate * 100).toFixed(0)} %・和了率${(
        this.agari_score_rate * 100
      ).toFixed(0)} %・聴牌率${(this.tempai_score_rate * 100).toFixed(
        0
      )} % の打牌をして、${this.shanten}！`;
    },
    state_url() {
      return `${this.state_url_pure}?q=${this.seed}&c=${this.tsumo_mode}`;
    },
    state_url_pure() {
      let url = new URL(window.location.href);
      let pathname = url.pathname.replace(
        "akochandaaaaa-fast",
        "akochandaaaaa"
      );
      return `${url.origin}${pathname}`;
    },
    // 各牌の残り枚数
    tile_counts() {
      // 初期化する。
      let counts = Array(34).fill(4).concat([1, 1, 1]);
      let minus_tile = (tile) => {
        counts[tile] -= 1;
        // 赤ドラの場合は対応する牌も減らす。
        if (tile == Tile.AkaManzu5) counts[Tile.Manzu5] -= 1;
        else if (tile == Tile.AkaPinzu5) counts[Tile.Pinzu5] -= 1;
        else if (tile == Tile.AkaSozu5) counts[Tile.Sozu5] -= 1;
      };
      // ドラ表示牌を除く
      this.dora_indicators.forEach(minus_tile);
      // 手牌を除く
      this.hand_tiles.forEach(minus_tile);
      // 副露ブロックを除く
      this.melded_blocks.forEach((block) => block.tiles.forEach(minus_tile));
      return counts;
    },
    shanten() {
      if (!this.result) return "?向聴";
      if (!this.result.success) {
        if (this.is_agari) return "和了";
        else return "?向聴";
      }
      if (this.result.response.syanten == 0) return "聴牌";
      return this.result.response.syanten + "向聴";
    },
    is_agari() {
      if (!this.result) return false;
      if (!this.result.success && this.result.err_msg === "和了形です。") {
        return true;
      }
      return false;
    },
  },

  methods: {
    unwrap_aka(tile) {
      if (tile === Tile.AkaManzu5) {
        return Tile.Manzu5;
      } else if (tile === Tile.AkaPinzu5) {
        return Tile.Pinzu5;
      } else if (tile === Tile.AkaSozu5) {
        return Tile.Sozu5;
      }
      return tile;
    },
    tile2String(tile) {
      return Tile2String.get(tile);
    },
    linkClass(idx) {
      if (this.tab_index === idx) {
        return "text-dark";
      } else {
        return "text-dark";
      }
    },
    calculate() {
      this.is_calculating = true;
      this.pre_result = this.result;
      this.result = null;
      let data = JSON.stringify({
        zikaze: this.zikaze,
        bakaze: this.bakaze,
        turn: Math.min(17, this.turn),
        syanten_type: this.syanten_type,
        dora_indicators: this.dora_indicators,
        flag: this.flag.reduce((a, x) => (a += x), 0) + this.maximize_target,
        hand_tiles: this.hand_tiles,
        melded_blocks: this.melded_blocks,
      });
      let impl = () => {
        if (window["Module"].process_request) {
          this.result = JSON.parse(window["Module"].process_request(data));
          this.is_calculating = false;
        } else {
          requestIdleCallback(impl);
        }
      };
      requestIdleCallback(impl);
    },

    /// 手牌を初期化する。
    clear_hand() {
      this.hand_tiles.splice(0, this.hand_tiles.length);
      this.pre_hand_tiles.splice(0, this.pre_hand_tiles.length);
      this.melded_blocks.splice(0, this.melded_blocks.length);
      this.dora_indicators.splice(0, this.dora_indicators.length);
      this.kawa_indicators.splice(0, this.kawa_indicators.length);
      this.tsumo_indicators.splice(0, this.tsumo_indicators.length);
      this.result = null;
      this.expected_score_rate = 1;
      this.agari_score_rate = 1;
      this.tempai_score_rate = 1;
      this.expected_score_rate_rate = 1;
      this.agari_score_rate_rate = 1;
      this.tempai_score_rate_rate = 1;
    },

    /// 長さ34の配列形式にする。
    toTiles34(tiles) {
      let tiles34 = Array(34).fill(0);
      for (let tile of tiles) tiles34[Aka2Normal(tile)]++;
      return tiles34;
    },

    /// 牌を手牌に追加する。
    add_tile(tile) {
      this.hand_tiles.push(tile);
      this.tsumo_indicators.push(tile);
      sort_tiles(this.hand_tiles);
    },

    /// 牌を手牌から次のにする
    next_tile(tile) {
      if (this.turn >= 18 || this.is_agari) {
        return;
      }
      this.pre_hand_tiles.splice(0, this.pre_hand_tiles.length);
      for (let hand of this.hand_tiles) {
        this.pre_hand_tiles.push(hand);
      }
      let i = this.hand_tiles.indexOf(tile);
      if (i > -1) this.hand_tiles.splice(i, 1);
      this.kawa_indicators.push(tile);
      this.add_tile(yama[yama_index]);
      yama_index++;
      this.turn++;
      this.calculate();
      if (this.pre_result && this.pre_result.success) {
        let found = false;
        let no_cands = true;
        let max_exp_value = 0;
        let max_tenpai_prob = 0;
        let max_win_prob = 0;
        let selected_exp_value = 0;
        let selected_tenpai_prob = 0;
        let selected_win_prob = 0;
        let impl = () => {
          for (let cand of this.pre_result.response.candidates) {
            if (!cand.exp_values) return;
            if (!cand.tenpai_probs) return;
            if (!cand.win_probs) return;
            no_cands = false;
            let exp_value = cand.exp_values[this.turn];
            let tenpai_prob = cand.tenpai_probs[this.turn];
            let win_prob = cand.win_probs[this.turn];
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
          tile = this.unwrap_aka(tile);
          impl();
        }
        if (found) {
          this.expected_score_rate_rate = selected_exp_value / max_exp_value;
          this.agari_score_rate_rate = selected_win_prob / max_win_prob;
          this.tempai_score_rate_rate = selected_tenpai_prob / max_tenpai_prob;
          if (isNaN(this.expected_score_rate_rate)) {
            this.expected_score_rate_rate = 1;
          }
          if (isNaN(this.agari_score_rate_rate)) {
            this.agari_score_rate_rate = 1;
          }
          if (isNaN(this.tempai_score_rate_rate)) {
            this.tempai_score_rate_rate = 1;
          }
        } else {
          let rate = no_cands ? 1 : 0;
          this.expected_score_rate_rate = rate;
          this.agari_score_rate_rate = rate;
          this.tempai_score_rate_rate = rate;
        }
        this.expected_score_rate *= this.expected_score_rate_rate;
        this.agari_score_rate *= this.agari_score_rate_rate;
        this.tempai_score_rate *= this.tempai_score_rate_rate;
      }
    },

    /// 牌を副露ブロックの一覧に追加する。
    add_meld(block) {
      this.melded_blocks.push(block);
    },

    /// 牌を副露ブロックの一覧から削除する。
    remove_meld(block) {
      let i = this.melded_blocks.findIndex(
        (x) => JSON.stringify(x) == JSON.stringify(block)
      );
      if (i > -1) this.melded_blocks.splice(i, 1);
    },

    /// 牌をドラ表示牌の一覧に追加する。
    add_dora(tile) {
      this.dora_indicators.push(tile);
    },

    /// 牌をドラ表示牌の一覧から削除する。
    remove_dora(tile) {
      let i = this.dora_indicators.indexOf(tile);
      if (i > -1) this.dora_indicators.splice(i, 1);
    },
    reset_hand() {
      this.clear_hand();

      const shuffle = ([...array]) => {
        let xorshift = new XorShift(this.seed);
        for (let i = array.length - 1; i >= 0; i--) {
          const j = Math.floor(xorshift.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      };

      // 牌山を作成する。
      yama = [];
      let max_yama = this.tsumo_mode === 0 ? 34 : 27;
      for (let i = 0; i < max_yama; ++i) {
        yama = yama.concat(Array(4).fill(i));
      }
      yama[Tile.Manzu5 * 4] = Tile.AkaManzu5;
      yama[Tile.Pinzu5 * 4] = Tile.AkaPinzu5;
      yama[Tile.Sozu5 * 4] = Tile.AkaSozu5;

      // ドラ表示牌は削除する。
      for (let tile of this.dora_indicators) {
        let i = yama.indexOf(tile);
        yama.splice(i, 1);
      }

      // 洗牌する。
      yama = shuffle(yama);
      this.next_seed = Math.floor(0x100000000 * Math.random());

      let hand_tiles = yama.slice(0, 14);
      sort_tiles(hand_tiles);
      this.haipai_tiles.splice(0, this.haipai_tiles.length);
      for (let tile of hand_tiles) {
        this.haipai_tiles.push(tile);
      }
      this.add_dora(yama[14]);
      yama_index = 15;
      this.turn = 1;
      this.hand_tiles = hand_tiles;
      this.calculate();
    },
    set_random_hand() {
      this.seed = this.next_seed;
      this.tsumo_mode = this.next_tsumo_mode;
      this.reset_hand();
    },
  },
  mounted() {
    this.set_random_hand();
  },
};
</script>

<style>
.custom-tooltip > .tooltip-inner {
  max-width: 400px;
  text-align: left;
  padding-top: 5px;
}
.social-button {
  font-weight: bold;
  color: white;
  border-radius: 3px;
  margin-right: 10px;
  width: 100px;
  height: 25px;
  text-align: center;
  display: inline-block;
}

.Facebook {
  background-color: #2e4a88;
  box-shadow: 0 4px 0 #1b3d82;
}

.Twitter {
  background-color: #008dde;
  box-shadow: 0 4px 0 #0078bd;
}

.Line {
  background-color: #22cc47;
  box-shadow: 0 4px 0 #14ba5f;
}
</style>
