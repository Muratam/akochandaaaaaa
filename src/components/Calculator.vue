<template>
  <div class="tabs">
    <ul class="nav nav-tabs" role="tablist">
      <li v-for="(title, idx) in tab_titles" :key="title" class="nav-item" role="presentation">
        <a
          href="#"
          role="tab"
          :class="['nav-link', { active: tab_index === idx }, linkClass(idx)]"
          :aria-selected="tab_index === idx ? 'true' : 'false'"
          @click.prevent="tab_index = idx"
          >{{ title }}</a
        >
      </li>
    </ul>
    <div class="tab-content mt-3">
    <div v-show="tab_index === 0" class="tab-pane active ps-3 pe-3" role="tabpanel">
      <div v-if="ban.turn >= 18 || is_agari">
        <h5><b>リザルト</b></h5>
        <div style="padding: 0em 0em 1em 0em">
          <b>{{ state_info_without_config }} </b>
        </div>
        <div style="padding: 0em 0em 1em 0em">
          <TwitterShare
            :url="state_url"
            hashtags="牌効率チェッカー"
            :title="state_info"
            :class="['Twitter', 'social-button']"
          >
            つぶやく
          </TwitterShare>
          <button type="button" class="btn btn-primary me-2" @click="set_random_hand"
            >次の盤面へ
          </button>
        </div>
        <hr />
      </div>
      <span style="padding: 1.2em 0.4em 1.2em 0.4em"> {{ ban.turn }}巡目 </span>
      <span style="padding: 1.2em 0.4em 1.2em 0.4em">
        ドラ表示
        <TileImage v-for="(tile, i) in dora_indicators" :key="i" :tile="tile" />
      </span>
      <span style="padding: 1.2em 0.4em 1.2em 0.4em">
        {{ tile2String(bakaze) }}場
      </span>
      <span style="padding: 1.2em 0.4em 1.2em 0.4em">
        {{ tile2String(zikaze) }}家
      </span>
      <button type="button" class="btn btn-light me-2" @click="reset_hand"
        >はじめから
      </button>
      <button
        v-if="pre_ban && ban.turn < 18 && !is_agari"
        type="button" class="btn btn-light me-2"
        @click="back_hand"
        >一手戻す
      </button>
      <div class="row mb-3 p-0">
        <div class="col-12">
        <HandAndMeldedBlocks
          @remove-tile="next_tile"
          :tsumo="ban.tsumo_indicators[ban.tsumo_indicators.length - 1]"
          :hand_tiles="ban.hand_tiles"
          :melded_blocks="melded_blocks"
          size="lg"
        />
        </div>
      </div>
      <span style="padding: 1.2em 0.4em 1.2em 0em">
        <TileImage
          v-for="i in Math.min(ban.kawa_indicators.length + 1, 6)"
          :key="i + 'warui-kawa-edayo'"
          :tile="
            ban.kawa_indicators.length < i ? -1 : ban.kawa_indicators[i - 1]
          "
          :sstyle="'width:1.4em; height: auto'"
        />
      </span>
      <span style="padding: 1.2em 0.4em 1.2em 0.4em">
        <TileImage
          v-for="i in Math.min(
            Math.max(0, ban.kawa_indicators.length + 1 - 6),
            6
          )"
          :key="i + 'warui-kawa-edayo2'"
          :tile="
            ban.kawa_indicators.length < i + 6
              ? -1
              : ban.kawa_indicators[i - 1 + 6]
          "
          :sstyle="'width:1.4em; height: auto'"
        />
      </span>
      <span style="padding: 1.2em 0.4em 1.2em 0.4em">
        <TileImage
          v-for="i in Math.min(
            Math.max(0, ban.kawa_indicators.length + 1 - 12),
            6
          )"
          :key="i + 'warui-kawa-edayo3'"
          :tile="
            ban.kawa_indicators.length < i + 12
              ? -1
              : ban.kawa_indicators[i - 1 + 12]
          "
          :sstyle="'width:1.4em; height: auto'"
        />
      </span>
      <div
        class="progress"
        style="max-width: 50em; height: 2em; margin: 0.5em 1em 0.1em 0em"
      >
        <div
          :class="['progress-bar', 'text-body']"
          :style="
            'width:' +
            (Math.max(0, 2000 - ban.expected_lost_score_abs) / 2000) * 100 +
            '%; text-align: left; padding-left: 1em; overflow:visible;' +
            'background-color: ' +
            (itte_modoshita ? '#bbb' : '#5bf')
          "
        >
          最善に対する期待値損失：-{{
            ban.expected_lost_score_abs.toFixed(0)
          }}
          点 (-{{ ban.expected_current_lost_score_abs.toFixed(0) }}
          点)
        </div>
      </div>
      <div
        class="progress"
        style="max-width: 50em; height: 2em; margin: 0.5em 1em 0.1em 0em"
      >
        <div
          :class="['progress-bar', 'text-body']"
          :style="
            'width:' +
            ban.agari_score_rate * 100 +
            '%; text-align: left; padding-left: 1em; overflow:visible;' +
            'background-color: ' +
            (itte_modoshita ? '#bbb' : '#5bf')
          "
        >
          最善に対する和了率：{{ (ban.agari_score_rate * 100).toFixed(0) }} %
          (x{{ ban.agari_score_rate_rate.toFixed(2) }})
        </div>
      </div>
      <div
        class="progress"
        style="max-width: 50em; height: 2em; margin: 0.5em 1em 0.1em 0em"
      >
        <div
          :class="['progress-bar', 'text-body']"
          :style="
            'width:' +
            ban.tempai_score_rate * 100 +
            '%; text-align: left; padding-left: 1em; overflow:visible;' +
            'background-color: ' +
            (itte_modoshita ? '#bbb' : '#5bf')
          "
        >
          最善に対する聴牌率：{{ (ban.tempai_score_rate * 100).toFixed(0) }} %
          (x{{ ban.tempai_score_rate_rate.toFixed(2) }})
        </div>
      </div>
      <div class="calc-overlay-wrap">
        <div v-if="is_calculating" class="calc-overlay">
          <div class="spinner-grow text-secondary" role="status"></div>
          <p>計算中</p>
        </div>
      </div>
      <hr />
      <template v-if="ban.turn > 1">
        <span style="padding: 1.2em 0.4em 1.2em 0.4em">
          <TileImage
            v-if="ban.kawa_indicators.length > 0"
            :tile="ban.kawa_indicators[ban.kawa_indicators.length - 1]"
          />
          <TileImage v-if="ban.kawa_indicators.length <= 0" :tile="-1" />
          ←
          <TileImage
            v-for="(tile, i) in ban.pre_hand_tiles"
            :key="i"
            :tile="tile"
          />
        </span>
        <Result
          :result="ban.pre_result"
          :is_show_graph="false"
          :hand_tiles="ban.pre_hand_tiles"
          :selected_tile="
            ban.kawa_indicators.length > 0
              ? ban.kawa_indicators[ban.kawa_indicators.length - 1]
              : -1
          "
        />
      </template>
      <button
        v-if="ban.turn <= 1"
        type="button" class="btn btn-primary me-2"
        @click="set_random_hand"
        >別の盤面で遊ぶ！
      </button>
    </div>
    <div v-show="tab_index === 1" class="tab-pane active ps-3 pe-3" role="tabpanel">
      <button type="button" class="btn btn-primary me-2" @click="set_random_hand"
        >別の盤面で遊ぶ！
      </button>
      <hr />
      <div class="row mb-3 p-0">
        <legend class="col-1 col-form-label text-end">配牌</legend>
        <div class="col-11">
        <HandAndMeldedBlocks
          :hand_tiles="haipai_tiles"
          :melded_blocks="melded_blocks"
          size="lg"
        />
        </div>
      </div>
      <div class="row mb-3 p-0">
        <legend class="col-1 col-form-label text-end">シード</legend>
        <div class="col-11">
        <legend class="col-form-label">
          {{ seed }}
        </legend>
        </div>
      </div>
      <div class="row mb-3 p-0">
        <legend class="col-1 col-form-label text-end">盤面URL</legend>
        <div class="col-11">
        <legend class="col-form-label">
          <button type="button" class="btn btn-light me-2" @click="copy_url"
            >共有用 URL をコピー
          </button>
        </legend>
        </div>
      </div>
      <div class="row mb-3">
        <legend class="col-1 col-form-label text-end">他家設定</legend>
        <div class="col-11">
        <input
          type="range"
          class="form-range"
          style="max-width: 30em"
          v-model="tacha_tempai_percent"
        />
        聴牌率： {{ tacha_tempai_percent }} % (デフォルト：72 %)<br />
        不聴罰符獲得期待値： {{ "+" + tempai_noten_plus_abs }}点 <br />
        不聴罰符損失期待値： {{ "-" + noten_noten_minus_abs }}点 <br />
        </div>
      </div>
    </div>
    <div v-show="tab_index === 2" class="tab-pane active ps-3 pe-3" role="tabpanel">
      <h5>結果を最大直近100件まで表示します。</h5>
      <div
        class="card"
        v-for="log in banResultLogs"
        :key="log.date"
        style="max-width: 35em; margin-bottom: 0.2em"
      >
        <div
          class="card-body"
          style="padding: 0; margin: 0.4em; line-height: 1.8em"
        >
          <TwitterShare
            :url="get_state_url(log.seed)"
            hashtags="牌効率チェッカー"
            :title="
              '期待値損失 -' +
              log.expected_lost_score_abs +
              '点の牌効率だったよ！'
            "
            :class="['Twitter', 'social-button']"
          >
            つぶやく
          </TwitterShare>
          {{ new Date(log.date).toLocaleString() }}
          <br />
          <a :href="get_state_url(log.seed)">
            {{ get_state_url(log.seed) }}
          </a>
          <br />
          <TileImage
            v-for="(tile, i) in log.hand_tiles"
            :key="i + 'log-hand-' + log.date"
            :tile="tile"
          />
          <div
            class="progress"
            style="max-width: 50em; height: 2em; margin: 0.5em 1em 0em 0em"
          >
            <div
              :class="['progress-bar', 'text-body']"
              :style="
                'width:' +
                (Math.max(0, 2000 - log.expected_lost_score_abs) / 2000) * 100 +
                '%; text-align: left; padding-left: 1em; overflow:visible;' +
                'background-color: ' +
                (log.itte_modoshita ? '#bbb' : '#5bf')
              "
            >
              期待値損失：-{{ log.expected_lost_score_abs.toFixed(0) }} 点
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-show="tab_index === 3" class="tab-pane active ps-3 pe-3" role="tabpanel">
      <h4>牌効率チェッカー</h4>
      <ul>
        <li>牌効率のチェックだﾞアﾞアﾞァﾞﾞァﾞアﾞ～～～～～！</li>
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
          打牌する度に自動で期待値が計算されます。失った期待値の総和の点数が表示されるので、最高の牌効率を目指しましょう！
        </li>
        <li>
          <TwitterShare
            :url="state_url_pure"
            hashtags="牌効率チェッカー"
            title="牌効率チェッカーで、牌効率をチェック！"
            :class="['Twitter', 'social-button']"
          >
            Twitter
          </TwitterShare>
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
        <li>すでに捨てた牌の枚数を考慮します。</li>
        <li>他家の聴牌による不聴罰符を考慮します。</li>
      </ul>

      <hr />
      <h4>考慮されない項目</h4>
      <ul>
        <li>七対子・国士無双は対応していますが、両天秤は考慮されません。</li>
        <li>副露 (ポン、チー、暗槓、明槓、加槓)は考慮されません。</li>
        <li>積み棒、立直棒は点数計算に考慮しません。</li>
      </ul>
      <hr />
      <h4>詳細</h4>
      <ul>
        <li>
          損失期待値のゲージは1000点失うと半分になります。2000点以上失うと空になります。
        </li>
        <li>
          最善に対する和了率のゲージは打牌ごとに「選択した打牌での和了率/最善の打牌での和了率」が乗算されていきます。
          聴牌率も同様です。
        </li>
        <li>
          副露が無いので、役牌や染め手など鳴かないと成立しづらい役の価値が過小評価されます。
        </li>
        <li>
          他家の聴牌による不聴罰符損失があるため、期待値が負になることがあります。
          同様に聴牌していれば期待値は正になることがあります。
        </li>
        <li>
          4向聴以上では計算コストが掛かるため、期待値計算はされません。向聴数が増える捨て牌をした場合一律-2000点と近似して計算します。
        </li>
        <li>
          期待値は立直を考慮して計算されますが、立直操作はできません。そのため和了点数が期待値以下になることがあります。
        </li>
      </ul>
    </div>
    </div>
  </div>
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
import TwitterShare from "./TwitterShare.vue";
import {
  makeYama,
  tempaiNotenPlusAbs,
  notenNotenMinusAbs,
  isAgariStr,
  requestAll,
  mergeResults,
  scoreDiscard,
} from "@/game.js";

// requestIdleCallback 未対応ブラウザ (古い Safari 等) 向けのフォールバック
const requestIdle =
  typeof window.requestIdleCallback === "function"
    ? (cb) => window.requestIdleCallback(cb)
    : (cb) => setTimeout(cb, 1);
// めんどいので雑に(vueバインドしたくない)
let yama = [];
const localstorage_key = "dahaisv3";

export default {
  name: "Calculator",
  components: {
    HandAndMeldedBlocks,
    Result,
    TileImage,
    TwitterShare,
  },
  data() {
    let next_seed = new URL(window.location.href).searchParams.get("q");
    if (!next_seed || isNaN(+next_seed)) {
      next_seed = Math.floor(0x100000000 * Math.random());
    } else {
      next_seed = +next_seed;
    }
    return {
      // Description
      tab_index: 0,
      tab_titles: ["盤面", "メニュー", "ログ", "遊び方"],
      // data
      bakaze: Tile.Ton, // 場風
      zikaze: Tile.Ton, // 自風
      syanten_type: SyantenType.Normal, // 手牌の種類
      flag: [1, 2, 4, 8, 16, 32], // フラグ
      maximize_target: 0,
      haipai_tiles: [], // 配牌
      dora_indicators: [], // ドラ
      melded_blocks: [], // 副露ブロックの一覧
      select_tab: 0,
      Hand2String: Hand2String,
      seed: Math.floor(0x100000000 * Math.random()),
      next_seed: next_seed,
      is_calculating: false,
      storage: [],
      tacha_tempai_percent: 72,
      // BEGIN: 盤面
      ban: {
        expected_lost_score_abs: 0,
        agari_score_rate: 1,
        tempai_score_rate: 1,
        expected_current_lost_score_abs: 0,
        agari_score_rate_rate: 1,
        tempai_score_rate_rate: 1,
        turn: 1, // 現在の巡目
        kawa_indicators: [], // 河
        tsumo_indicators: [], // 自摸牌
        hand_tiles: [], // 手牌
        result: null, // 結果
        pre_hand_tiles: [], // 一手前の手牌
        pre_result: null, // 一手前の結果
      },
      pre_ban: "",
      itte_modoshita: false,
      // END: 現在の状態
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
    n_hand_tiles() {
      return this.ban.hand_tiles.length + this.melded_blocks.length * 3;
    },
    yama_index() {
      return this.ban.turn + 14;
    },
    //
    state_info() {
      return `${this.state_info_without_config}`;
    },
    state_info_without_config() {
      return `最善から${this.ban.expected_lost_score_abs.toFixed(
        0
      )}点失う牌効率で、${this.shanten}`;
    },
    state_url() {
      return this.get_state_url(this.seed);
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
      this.ban.hand_tiles.forEach(minus_tile);
      // 副露ブロックを除く
      this.melded_blocks.forEach((block) => block.tiles.forEach(minus_tile));
      return counts;
    },
    shanten() {
      if (!this.ban.result) return "?向聴";
      if (!this.ban.result.success) {
        if (!this.is_agari) return "?向聴";
        let s = this.ban.result.err_msg;
        let yaku_str = s
          .match(/役:(.+)\d+符/s)[0]
          .replaceAll("\n", "")
          .replace(/\d翻 /g, "")
          .replace("役: ", "")
          .replace(/ \S+$/, "")
          .replace(/ /g, "・")
          .replace("門前清自摸和", "門前ツモ");
        let fuhan = s.match(/\d+符\d+翻/)[0];
        let ten = s.match(/獲得点数: (\d+点)/)[1];
        return `${yaku_str} ${fuhan} ${ten}を和了った！`;
      }
      if (this.ban.result.response.syanten == 0) return "聴牌でした。";
      return this.ban.result.response.syanten + "向聴でした...";
    },
    is_agari() {
      if (!this.ban.result) return false;
      if (
        !this.ban.result.success &&
        this.is_agari_str(this.ban.result.err_msg)
      ) {
        return true;
      }
      return false;
    },
    banResultLogs() {
      // 依存を無駄につける
      let logs;
      if (this.storage) {
        logs = window.localStorage.getItem(localstorage_key);
      } else {
        logs = window.localStorage.getItem(localstorage_key);
      }
      if (!logs) logs = [];
      else logs = JSON.parse(logs);
      logs.sort((a, b) => b.date - a.date);
      logs.splice(100, logs.length);
      return logs;
    },
    tacha_tempai_rate() {
      return this.tacha_tempai_percent / 100;
    },
    tempai_noten_plus_abs() {
      return tempaiNotenPlusAbs(this.tacha_tempai_rate);
    },
    noten_noten_minus_abs() {
      return notenNotenMinusAbs(this.tacha_tempai_rate);
    },
  },

  methods: {
    copy_url() {
      navigator.clipboard.writeText(this.state_url).then(() => {
        alert(
          this.state_url +
            " をコピーしました。\nこのURLを共有すると、誰でもこの盤面を生成できます。"
        );
      });
    },
    get_state_url(seed) {
      return `${this.state_url_pure}?q=${seed}`;
    },
    tile2String(tile) {
      return Tile2String.get(tile);
    },
    is_agari_str(str) {
      return isAgariStr(str);
    },
    linkClass(idx) {
      if (this.tab_index === idx) {
        return "text-dark";
      } else {
        return "text-dark";
      }
    },
    saveCurrentResult() {
      let storage = window.localStorage.getItem(localstorage_key);
      if (!storage) storage = [];
      else storage = JSON.parse(storage);
      let expected_lost_score_abs = this.ban.expected_lost_score_abs;
      let agari_score_rate = Math.floor(100 * this.ban.agari_score_rate);
      let tempai_score_rate = Math.floor(100 * this.ban.tempai_score_rate);

      storage.push({
        seed: this.seed,
        hand_tiles: this.ban.hand_tiles,
        haipai_tiles: this.haipai_tiles,
        date: new Date().getTime(),
        itte_modoshita: this.itte_modoshita,
        expected_lost_score_abs: expected_lost_score_abs,
        agari_score_rate: agari_score_rate,
        tempai_score_rate: tempai_score_rate,
      });
      this.storage = storage;
      window.localStorage.setItem(localstorage_key, JSON.stringify(storage));
    },
    calculate() {
      this.is_calculating = true;
      this.ban.pre_result = this.ban.result;
      this.ban.result = null;
      let data = {
        zikaze: this.zikaze,
        bakaze: this.bakaze,
        turn: Math.min(17, this.ban.turn),
        dora_indicators: this.dora_indicators,
        flag: this.flag.reduce((a, x) => a + x, 0) + this.maximize_target,
        hand_tiles: this.ban.hand_tiles,
        melded_blocks: this.melded_blocks,
        tsumo: this.ban.tsumo_indicators[this.ban.tsumo_indicators.length - 1],
        kawa: this.ban.kawa_indicators,
      };
      let impl = () => {
        if (window["Module"] && window["Module"].process_request) {
          let results = requestAll(
            (json) => window["Module"].process_request(json),
            data
          );
          let { result: result_data, agari } = mergeResults(
            results,
            data.turn,
            this.tempai_noten_plus_abs,
            this.noten_noten_minus_abs
          );
          if (agari) this.saveCurrentResult();
          this.ban.result = result_data;
          this.is_calculating = false;
        } else {
          requestIdle(impl);
        }
      };
      // 次の結果のアニメーションを安定して実行
      setTimeout(() => {
        requestIdle(impl);
      }, 800);
    },

    /// 手牌を初期化する。
    clear_hand() {
      this.ban.hand_tiles.splice(0, this.ban.hand_tiles.length);
      this.ban.pre_hand_tiles.splice(0, this.ban.pre_hand_tiles.length);
      this.melded_blocks.splice(0, this.melded_blocks.length);
      this.dora_indicators.splice(0, this.dora_indicators.length);
      this.ban.kawa_indicators.splice(0, this.ban.kawa_indicators.length);
      this.ban.tsumo_indicators.splice(0, this.ban.tsumo_indicators.length);
      this.ban.result = null;
      this.ban.expected_lost_score_abs = 0;
      this.ban.agari_score_rate_rate = 1;
      this.ban.tempai_score_rate_rate = 1;
      this.ban.agari_score_rate = 1;
      this.ban.tempai_score_rate = 1;
      this.ban.expected_current_lost_score_abs = 0;
    },

    /// 長さ34の配列形式にする。
    toTiles34(tiles) {
      let tiles34 = Array(34).fill(0);
      for (let tile of tiles) tiles34[Aka2Normal(tile)]++;
      return tiles34;
    },

    /// 牌を手牌に追加する。
    add_tile(tile) {
      this.ban.hand_tiles.push(tile);
      this.ban.tsumo_indicators.push(tile);
      sort_tiles(this.ban.hand_tiles);
    },

    /// 牌を手牌から次のにする
    next_tile(tile) {
      if (this.is_calculating) return;
      if (this.ban.turn >= 18 || this.is_agari) {
        return;
      }
      this.pre_ban = JSON.stringify(this.ban);
      this.ban.pre_hand_tiles.splice(0, this.ban.pre_hand_tiles.length);
      for (let hand of this.ban.hand_tiles) {
        this.ban.pre_hand_tiles.push(hand);
      }
      let i = this.ban.hand_tiles.indexOf(tile);
      if (i > -1) this.ban.hand_tiles.splice(i, 1);
      this.ban.kawa_indicators.push(tile);
      this.add_tile(yama[this.yama_index]);
      this.ban.turn++;
      if (this.ban.turn >= 18) {
        this.saveCurrentResult();
      }
      this.calculate();
      if (this.ban.pre_result && this.ban.pre_result.success) {
        let score = scoreDiscard(this.ban.pre_result, tile, this.ban.turn - 2);
        this.ban.agari_score_rate_rate = score.agari_rate_rate;
        this.ban.tempai_score_rate_rate = score.tempai_rate_rate;
        this.ban.expected_current_lost_score_abs = score.lost;
        this.ban.agari_score_rate *= this.ban.agari_score_rate_rate;
        this.ban.tempai_score_rate *= this.ban.tempai_score_rate_rate;
        this.ban.expected_lost_score_abs += this.ban.expected_current_lost_score_abs;
      }
    },

    // 一手戻す
    back_hand() {
      if (!this.pre_ban) return;
      this.ban = JSON.parse(this.pre_ban);
      this.pre_ban = "";
      this.itte_modoshita = true;
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
      yama = makeYama(this.seed, this.dora_indicators);
      this.next_seed = Math.floor(0x100000000 * Math.random());
      this.itte_modoshita = false;

      let hand_tiles = yama.slice(0, 14);
      this.ban.tsumo_indicators.push(yama[0]);
      sort_tiles(hand_tiles);
      this.haipai_tiles.splice(0, this.haipai_tiles.length);
      for (let tile of hand_tiles) {
        this.haipai_tiles.push(tile);
      }
      this.add_dora(yama[14]);
      this.ban.turn = 1;
      this.ban.hand_tiles = hand_tiles;
      this.calculate();
    },
    set_random_hand() {
      this.seed = this.next_seed;
      this.reset_hand();
      history.pushState({}, "", this.state_url);
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
.calc-overlay-wrap {
  position: relative;
}
.calc-overlay {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 10;
}
.social-button {
  text-decoration: none;
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
