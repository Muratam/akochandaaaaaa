<template>
  <b-tabs content-class="mt-3" v-model="tabIndex">
    <b-tab title="試す" :title-link-class="linkClass(0)" class="pl-3 pr-3">
      <b-button class="mr-2" variant="primary" @click="set_random_hand"
        >はじめから
      </b-button>
      <br />
      場風：{{ tile2String(bakaze) }} / 自風：{{ tile2String(zikaze) }} /
      現在の巡目： {{ turn }}
      <br />
      河：
      <KawaTiles :kawa_indicators="kawa_indicators" />
      ドラ表示牌：
      <DoraTiles :dora_indicators="dora_indicators" />
      <br />
      <HandAndMeldedBlocks
        v-on:remove-tile="next_tile"
        :hand_tiles="hand_tiles"
        :melded_blocks="melded_blocks"
        size="lg"
      />
      <br />
      <b-row class="mb-3">
        <b-col>
          <b-overlay :show="is_calculating" rounded="sm">
            <template #overlay>
              <b-icon
                icon="three-dots"
                animation="cylon"
                font-scale="4"
              ></b-icon>
              <p>計算中</p>
            </template>
          </b-overlay>
          <hr v-if="!is_calculating" />
          <HandAndMeldedBlocks
            v-if="!is_calculating"
            :hand_tiles="pre_hand_tiles"
            :melded_blocks="[]"
            size="lg"
          />
          <Result v-if="!is_calculating" :result="result" />
        </b-col>
      </b-row>
    </b-tab>
    <b-tab title="設定" :title-link-class="linkClass(1)" class="pl-3 pr-3">
      <!-- 設定入力欄 -->
      <b-row>
        <b-col>
          <!-- 考慮する項目 -->
          <b-form-group
            label-cols="2"
            content-cols="4"
            label="重視する項目"
            label-for="input-maximize-target"
            label-align="right"
          >
            <b-form-radio-group
              id="input-maximize-target"
              v-model="maximize_target"
              :options="input_maximize_target_options"
              button-variant="outline-primary"
              size="sm"
              buttons
            ></b-form-radio-group>

            <b-tooltip
              target="input-maximize-target"
              triggers="hover"
              custom-class="custom-tooltip"
              placement="topright"
            >
              一向聴以上の手牌の場合に、シミュレーション途中の打牌選択の方針を設定します。

              <ul>
                <li>期待値最大化: 期待値が最大となる打牌を選択します。</li>
                <li>
                  和了確率最大化:
                  和了確率が最大となる打牌を選択します。オーラストップなど和了率を重視する場合はこちらを選択してください。
                </li>
              </ul>
            </b-tooltip>
          </b-form-group>
        </b-col>
      </b-row>
    </b-tab>
    <b-tab title="説明" :title-link-class="linkClass(2)" class="pl-3 pr-3">
      <h3><b>あﾞごﾞぢﾞゃﾞんﾞだﾞアﾞアﾞァﾞﾞァﾞアﾞ～～～～～</b></h3>
      <hr />
      <h4>遊び方</h4>
      <ul>
        <li>
          ここは
          <a href="https://pystyle.info/apps/mahjong-nanikiru-simulator/"
            >https://pystyle.info/apps/mahjong-nanikiru-simulator/</a
          >
          を改変した、一人麻雀の練習ができるサイトです。
        </li>
        <li>
          期待値を最大化するように捨て牌を選択していき、どの程度損失があったかを競います。
        </li>
      </ul>

      <hr />
      <h4>考慮される項目</h4>
      <ul>
        <li>一人麻雀であり、ツモ和了のみが考慮されます。</li>
        <li>
          赤牌、裏ドラ、ダブル立直、一発、海底撈月、向聴戻し、手変わり
          を点数計算に考慮します。
        </li>
      </ul>

      <hr />
      <h4>考慮されない項目</h4>
      <ul>
        <li>
          七対子の和了・国士無双での和了は考慮されません。一般手と七対子の両天秤に影響があります。
        </li>
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
      <h4>点数計算</h4>
      <ul>
        <li>自摸回数は「18 - 現在の巡目」回です。</li>
        <li>
          4人麻雀では鳴きが入らない場合、東家と南家は最大18回、西家と北家は最大17回自摸れるため、配牌13枚から18回自摸れるものと仮定します。
          例えば、1巡目の場合はすでに1回自摸して手牌が14枚になっているため、あと17回自摸が行えます。
        </li>
        <li>東家の場合は親、それ以外の場合は子として点数計算します。</li>
      </ul>
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
  Hand2TenhoString,
  Aka2Normal,
  Tile2TumoProbString,
} from "@/mahjong.js";

import HandAndMeldedBlocks from "@/components/mahjong/HandAndMeldedBlocks.vue";
import DoraTiles from "@/components/mahjong/DoraTiles.vue";
import KawaTiles from "@/components/mahjong/KawaTiles.vue";
import Result from "./Result.vue";

// めんどいので雑に(vueバインドしたくない)
let yama = [];
let yama_index = 0;

export default {
  name: "Calculator",
  components: {
    HandAndMeldedBlocks,
    DoraTiles,
    KawaTiles,
    Result,
  },
  data() {
    return {
      // Description
      tabIndex: 0,

      // data
      bakaze: Tile.Ton, // 場風
      zikaze: Tile.Nan, // 自風
      turn: 1, // 現在の巡目
      syanten_type: SyantenType.Normal, // 手牌の種類
      dora_indicators: [], // ドラ
      kawa_indicators: [], // 河
      flag: [1, 2, 4, 8, 16, 32], // フラグ
      maximize_target: 0,
      hand_tiles: [], // 手牌
      pre_hand_tiles: [], // 一手前の手牌
      melded_blocks: [], // 副露ブロックの一覧
      result: null, // 結果
      is_calculating: false,
      select_tab: 0,
      Hand2String: Hand2String,

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
    };
  },

  computed: {
    // 手牌の枚数
    tenhoURL() {
      return "https://tenhou.net/2/?q=" + Hand2TenhoString(this.hand_tiles);
    },
    tumoProbStr() {
      return this.hand_tiles.map((x) => Tile2TumoProbString.get(x)).join(",");
    },
    // 手牌の枚数
    n_hand_tiles() {
      return this.hand_tiles.length + this.melded_blocks.length * 3;
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
  },

  methods: {
    tile2String(tile) {
      return Tile2String.get(tile);
    },
    linkClass(idx) {
      if (this.tabIndex === idx) {
        return "text-dark";
      } else {
        return "text-dark";
      }
    },
    calculate() {
      this.is_calculating = true;
      this.result = null;
      let data = JSON.stringify({
        zikaze: this.zikaze,
        bakaze: this.bakaze,
        turn: this.turn,
        syanten_type: this.syanten_type,
        dora_indicators: this.dora_indicators,
        flag: this.flag.reduce((a, x) => (a += x), 0) + this.maximize_target,
        hand_tiles: this.hand_tiles,
        melded_blocks: this.melded_blocks,
      });
      requestIdleCallback(() => {
        this.result = JSON.parse(window["Module"].process_request(data));
        this.is_calculating = false;
      });
    },

    /// 手牌を初期化する。
    clear_hand() {
      this.hand_tiles.splice(0, this.hand_tiles.length);
      this.pre_hand_tiles.splice(0, this.pre_hand_tiles.length);
      this.melded_blocks.splice(0, this.melded_blocks.length);
      this.dora_indicators.splice(0, this.dora_indicators.length);
      this.kawa_indicators.splice(0, this.kawa_indicators.length);
      this.result = null;
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
      sort_tiles(this.hand_tiles);
    },

    /// 牌を手牌から次のにする
    next_tile(tile) {
      this.pre_hand_tiles.splice(0, this.pre_hand_tiles.length);
      for (let hand of this.hand_tiles) {
        this.pre_hand_tiles.push(hand);
      }
      this.calculate();
      let i = this.hand_tiles.indexOf(tile);
      if (i > -1) this.hand_tiles.splice(i, 1);
      this.kawa_indicators.push(tile);
      this.add_tile(yama[yama_index]);
      yama_index++;
      this.turn++;
      // 18になったらしっぱい
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

    set_random_hand() {
      this.clear_hand();
      const shuffle = ([...array]) => {
        for (let i = array.length - 1; i >= 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      };

      // 牌山を作成する。
      yama = [];
      for (let i = 0; i < 27; ++i) {
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

      let hand_tiles = yama.slice(0, 14);
      sort_tiles(hand_tiles);
      this.add_dora(yama[14]);
      yama_index = 15;
      this.turn = 1;
      this.hand_tiles = hand_tiles;
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
