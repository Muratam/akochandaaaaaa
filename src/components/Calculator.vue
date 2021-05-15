<template>
  <b-tabs content-class="mt-3" v-model="tabIndex">
    <b-tab title="試す" :title-link-class="linkClass(0)" class="pl-3 pr-3">
      <!-- ボタン -->
      <b-row class="mb-3">
        <b-col>
          <b-overlay :show="is_calculating" rounded="sm">
            <b-button
              class="mr-2"
              variant="primary"
              @click="calculate"
              :disabled="n_hand_tiles < 13 || is_calculating"
              >計算を実行
            </b-button>
            <b-button class="mr-2" variant="primary" @click="clear_hand"
              >手牌を初期化
            </b-button>
            <b-button class="mr-2" variant="primary" @click="clear_all"
              >設定を初期化
            </b-button>
            <b-button class="mr-2" variant="primary" @click="set_random_hand"
              >ランダムの手牌入力
            </b-button>

            <template #overlay>
              <b-icon
                icon="three-dots"
                animation="cylon"
                font-scale="4"
              ></b-icon>
              <p>計算中</p>
            </template>
          </b-overlay>
        </b-col>
      </b-row>
      <!-- 巡目 -->
      <b-form-group
        label-cols="2"
        content-cols="2"
        label="現在の巡目"
        label-for="input-turn"
        label-align="right"
      >
        <b-form-select v-model="turn" id="input-turn" size="sm">
          <b-form-select-option v-for="i in 17" :key="i" :value="i"
            >{{ i }} 巡目</b-form-select-option
          >
        </b-form-select>
      </b-form-group>

      <!-- ドラ -->
      <b-form-group
        label-cols="2"
        content-cols="4"
        label="ドラ表示牌"
        label-for="input-dora-indicators"
        label-align="right"
      >
        <DoraTiles
          v-on:remove-dora="remove_dora"
          :dora_indicators="dora_indicators"
        />
      </b-form-group>
      <!-- Calculator -->
      <b-container fluid class="p-0">
        <!-- 手牌及び副露ブロックの一覧 -->
        <b-row class="mb-3">
          <b-col>
            <HandAndMeldedBlocks
              v-on:remove-tile="remove_tile"
              v-on:remove-block="remove_meld"
              :hand_tiles="hand_tiles"
              :melded_blocks="melded_blocks"
              size="lg"
            />
          </b-col>
        </b-row>

        <!-- 手牌及び副露ブロックの入力欄 -->
        <b-row>
          <b-col>
            <b-tabs v-model="select_tab">
              <b-tab title="手牌" active>
                <HandTileInput
                  v-on:add-tile="add_tile"
                  :tile_counts="tile_counts"
                  :n_hand_tiles="n_hand_tiles"
                />
              </b-tab>
              <b-tab title="ドラ表示牌">
                <p class="m-2">
                  ドラはドラ表示牌で指定するので注意してください。槓ドラも含め、最大5枚まで設定できます。
                </p>
                <HandTileInput
                  v-on:add-tile="add_dora"
                  :tile_counts="tile_counts"
                  :n_dora_tiles="dora_indicators.length"
                />
              </b-tab>
              <b-tab title="明刻子">
                <MinkotuInput
                  v-on:add-block="add_meld"
                  :tile_counts="tile_counts"
                  :n_hand_tiles="n_hand_tiles"
                />
              </b-tab>
              <b-tab title="明順子">
                <MinsyuntuInput
                  v-on:add-block="add_meld"
                  :tile_counts="tile_counts"
                  :n_hand_tiles="n_hand_tiles"
                />
              </b-tab>
              <b-tab title="明槓子">
                <MinkantuInput
                  v-on:add-block="add_meld"
                  :tile_counts="tile_counts"
                  :n_hand_tiles="n_hand_tiles"
                />
              </b-tab>
              <b-tab title="暗槓子">
                <AnkantuInput
                  v-on:add-block="add_meld"
                  :tile_counts="tile_counts"
                  :n_hand_tiles="n_hand_tiles"
                />
              </b-tab>
            </b-tabs>
          </b-col>
        </b-row>
      </b-container>
      <!-- 計算結果 -->
      <Result :result="result" />
    </b-tab>
    <b-tab title="設定" :title-link-class="linkClass(1)" class="pl-3 pr-3">
      <!-- 設定入力欄 -->
      <b-row>
        <b-col>
          <!-- 場風 -->
          <b-form-group
            label-cols="2"
            content-cols="4"
            label="場風"
            label-for="input-bakaze"
            label-align="right"
          >
            <b-form-radio-group
              id="input-bakaze"
              v-model="bakaze"
              :options="input_bakaze_options"
              button-variant="outline-primary"
              size="sm"
              buttons
            ></b-form-radio-group>
          </b-form-group>

          <!-- 自風 -->
          <b-form-group
            label-cols="2"
            content-cols="4"
            label="自風"
            label-for="input-zikaze"
            label-align="right"
          >
            <b-form-radio-group
              id="input-zikaze"
              v-model="zikaze"
              :options="input_zikaze_options"
              button-variant="outline-primary"
              size="sm"
              buttons
            ></b-form-radio-group>

            <b-tooltip
              target="input-zikaze"
              triggers="hover"
              custom-class="custom-tooltip"
              placement="topright"
            >
              東家の場合は親、それ以外の場合は子として点数計算します。
            </b-tooltip>
          </b-form-group>

          <!-- 手牌の種類 -->
          <b-form-group
            label-cols="2"
            content-cols="4"
            label="手牌の種類"
            label-for="input-syanten-type"
            label-align="right"
          >
            <b-form-radio-group
              id="input-syanten-type"
              v-model="syanten_type"
              :options="input_syanten_type_options"
              button-variant="outline-primary"
              size="sm"
              buttons
            ></b-form-radio-group>

            <b-tooltip
              target="input-syanten-type"
              triggers="hover"
              custom-class="custom-tooltip"
              placement="topright"
            >
              手牌の種類を選択します。現在の実装では、「一般手」を選択した場合、七対子は考慮されません。
            </b-tooltip>
          </b-form-group>

          <!-- 考慮する項目 -->
          <b-form-group
            label-cols="2"
            label="考慮する項目"
            label-for="input-flag"
            label-align="right"
          >
            <b-form-checkbox-group
              id="input-flag"
              v-model="flag"
              :options="input_flag_options"
              size="sm"
              switches
            ></b-form-checkbox-group>

            <b-tooltip
              target="input-flag"
              triggers="hover"
              custom-class="custom-tooltip"
              placement="topright"
            >
              <ul>
                <li>
                  向聴戻し:
                  向聴戻しの打牌も計算対象に含めるかどうかを設定します。
                </li>
                <li>
                  手変わり:
                  向聴数が変化しない手変わりも計算対象に含めるかどうかを設定します。
                </li>
                <li>
                  ダブル立直:
                  有効の場合、1巡目で聴牌の場合はダブル立直になります。
                </li>
                <li>
                  一発、海底撈月:
                  有効の場合、一発、海底撈月が点数期待値に考慮されます。
                </li>
                <li>裏ドラ: 有効の場合、裏ドラが点数期待値に考慮されます。</li>
              </ul>
            </b-tooltip>
          </b-form-group>

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
      ここは
      <a href="https://pystyle.info/apps/mahjong-nanikiru-simulator/"
        >https://pystyle.info/apps/mahjong-nanikiru-simulator/</a
      >
      を改変した、一人麻雀の練習ができるサイトです。新子憧のように強くなりましょう。
      <hr />
      <h4>前提条件</h4>
      <ul>
        <li>自摸回数は「18 - 現在の巡目」回です。</li>
        <li>
          4人麻雀では鳴きが入らない場合、東家と南家は最大18回、西家と北家は最大17回自摸れるため、配牌13枚から18回自摸れるものと仮定します。
          例えば、1巡目の場合はすでに1回自摸して手牌が14枚になっているため、あと17回自摸が行えます。
        </li>
        <li>
          副露 (ポン、チー、暗槓、明槓、加槓)
          は考慮しません。ただし、何切るを考える時点で、副露している手牌は設定可能です。
        </li>
        <li>赤牌の自摸は考慮されます。</li>
        <li>積み棒、不聴罰符、立直棒は点数計算に考慮しません。</li>
        <li>東家の場合は親、それ以外の場合は子として点数計算します。</li>
        <li>
          「考慮する項目」で有効の場合、裏ドラ、ダブル立直、一発、海底撈月
          は点数計算に考慮します。
        </li>
        <li>「考慮する項目」で有効の場合、向聴戻し、手変わり は考慮します。</li>
      </ul>
      <hr />
      <h4>結果の解釈について</h4>
      <ul>
        <li>
          点数期待値において、50点未満の差はほぼ同等と考えてよいです。
          例えば、手牌「123m999p789s北北北白發」において、白のほうが裏ドラ表示牌が1枚多いため、白単騎だと5032点、發単騎だと5017点で15点差になります。
          このように、数十点というのは裏ドラ表示牌が1枚多いかどうか程度の差しかありません。
        </li>
        <li>
          他家が存在しないため、ロン和了が存在しません。そのため、幺九牌待ちのほうが和了やすいといったことは考慮されません。
        </li>
        <li>
          他家が存在しないため、副露が存在しません。そのため、役牌や染め手など鳴かないと成立しづらい役の価値が過小評価されます。
          副露を考慮する牌理は
          <b-link
            href="http://yabejp.web.fc2.com/mahjong/tactics.html"
            target="_blank"
            class="text-info"
            >現代麻雀技術論</b-link
          >
          などを参考にルールベースで考えるとよいと思います。
        </li>
        <li>
          「手牌の種類」が「一般手」の場合、七対子の和了が考慮されません。そのため、一般手と七対子の両天秤を見るべき手牌で正着が選ばれない可能性があります。
        </li>
      </ul>
    </b-tab>
  </b-tabs>
</template>

<script>
import {
  sort_tiles,
  Tile,
  DoraHyozi2Dora,
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
import HandTileInput from "@/components/mahjong/HandTileInput.vue";
import MinkotuInput from "@/components/mahjong/MinkotuInput.vue";
import MinsyuntuInput from "@/components/mahjong/MinsyuntuInput.vue";
import MinkantuInput from "@/components/mahjong/MinkantuInput.vue";
import AnkantuInput from "@/components/mahjong/AnkantuInput.vue";
import Result from "./Result.vue";

export default {
  name: "Calculator",
  components: {
    HandAndMeldedBlocks,
    DoraTiles,
    HandTileInput,
    MinkotuInput,
    MinsyuntuInput,
    MinkantuInput,
    AnkantuInput,
    Result,
  },
  data() {
    return {
      // Description
      tabIndex: 0,

      // data
      bakaze: Tile.Ton, // 場風
      zikaze: Tile.Ton, // 自風
      turn: 1, // 現在の巡目
      syanten_type: SyantenType.Normal, // 手牌の種類
      dora_indicators: [Tile.Ton], // ドラ
      flag: [1, 2, 4, 8, 16, 32], // フラグ
      maximize_target: 0,
      hand_tiles: [], // 手牌
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
    tenhoURL: function () {
      return "https://tenhou.net/2/?q=" + Hand2TenhoString(this.hand_tiles);
    },

    tumoProbStr: function () {
      let hand_tiles = this.hand_tiles
        .map((x) => Tile2TumoProbString.get(x))
        .join(",");

      return hand_tiles;
    },

    // 手牌の枚数
    n_hand_tiles: function () {
      return this.hand_tiles.length + this.melded_blocks.length * 3;
    },

    // 各牌の残り枚数
    tile_counts: function () {
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
      this.hand_tiles = [];
      this.melded_blocks = [];
      this.result = null;
    },

    /// 設定を初期化する。
    clear_all() {
      this.clear_hand();
      this.zikaze = Tile.Ton;
      this.bakaze = Tile.Ton;
      this.turn = 3;
      this.syanten_type = 1;
      this.dora_indicators = [Tile.Ton];
      this.flag = [
        1, // 向聴戻し
        2, // 手変わり
        4, // ダブル立直
        8, // 一発
        16, // 海底自摸
        32, // 裏ドラ
      ];
      this.select_tab = 0;
    },

    downloadHMR() {
      let filename = `${Hand2String(this.hand_tiles)}.hmr`;
      let text = "";

      // 1行目: "<巡目> <自摸牌>"
      let tumo_tile = Aka2Normal(this.hand_tiles[this.hand_tiles.length - 1]);
      text += this.turn + " " + tumo_tile + "\n";
      // 2行目: 各牌の残り枚数
      text += this.tile_counts.slice(0, -3).join("") + "\n";
      // 3行目: 手牌の各牌の枚数
      text += this.toTiles34(this.hand_tiles).join("") + "\n";
      // 4行目: ドラ
      let dora_tile = DoraHyozi2Dora[this.dora_indicators[0]];
      text += this.toTiles34([dora_tile]).join("") + "\n";
      // 5行目: 捨牌
      text += Array(18).fill(-1).join("") + "\n";

      let blob = new Blob([text], { type: "text/plain" });
      let link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
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

    /// 牌を手牌から削除する。
    remove_tile(tile) {
      let i = this.hand_tiles.indexOf(tile);
      if (i > -1) this.hand_tiles.splice(i, 1);
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
      let yama = [];
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

      // 先牌する。
      yama = shuffle(yama);

      let hand_tiles = yama.slice(0, 14);
      sort_tiles(hand_tiles);

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
