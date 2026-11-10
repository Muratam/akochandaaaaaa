<template>
  <div class="ako">
    <header class="ako-head">
      <div class="ako-brand">
        <span class="ako-mark" aria-hidden="true">牌</span>
        <h1 class="ako-name">牌効率チェッカー</h1>
      </div>
      <div class="ako-tabs" role="tablist" aria-label="画面">
        <button
          v-for="(title, idx) in tab_titles"
          :key="title"
          :id="'tab-' + idx"
          type="button"
          role="tab"
          class="ako-tab"
          :aria-selected="tab_index === idx ? 'true' : 'false'"
          :aria-controls="'tabpanel-' + idx"
          @click="tab_index = idx"
        >
          {{ title }}
        </button>
      </div>
    </header>

    <!-- 盤面 -->
    <section
      v-show="tab_index === 0"
      id="tabpanel-0"
      class="ako-main board"
      role="tabpanel"
      aria-labelledby="tab-0"
    >
      <div v-if="is_finished" class="panel finish">
        <h2>結果</h2>
        <p class="finish-text">{{ state_info_without_config }}</p>
        <div class="actions">
          <button type="button" class="btn btn-primary" @click="set_random_hand">
            次の盤面へ
          </button>
          <TwitterShare
            :url="state_url"
            hashtags="牌効率チェッカー"
            :title="state_info"
            class="btn"
          >
            つぶやく
          </TwitterShare>
        </div>
      </div>

      <div class="panel score">
        <dl class="table-info">
          <div>
            <dt>ドラ表示</dt>
            <dd class="tiles">
              <TileImage v-for="(tile, i) in dora_indicators" :key="i" :tile="tile" />
            </dd>
          </div>
          <div>
            <dt>場</dt>
            <dd>{{ tile2String(bakaze) }}場</dd>
          </div>
          <div>
            <dt>自風</dt>
            <dd>{{ tile2String(zikaze) }}家</dd>
          </div>
          <span v-if="itte_modoshita" class="chip">一手戻した</span>
        </dl>
        <p class="gauges-cap">最善に対する</p>
        <ul class="gauges">
          <li>
            <div class="gauge-row">
              <span class="gauge-label">期待値損失</span>
              <span class="gauge-value num">-{{ ban.expected_lost_score_abs.toFixed(0) }}点</span>
            </div>
            <div :class="['meter', { 'is-muted': itte_modoshita }]">
              <i
                :style="{
                  width:
                    (Math.max(0, 2000 - ban.expected_lost_score_abs) / 2000) * 100 + '%',
                }"
              ></i>
            </div>
            <p class="gauge-sub">
              この一手<br /><span class="num">-{{ ban.expected_current_lost_score_abs.toFixed(0) }}点</span>
            </p>
          </li>
          <li>
            <div class="gauge-row">
              <span class="gauge-label">和了率</span>
              <span class="gauge-value num">{{ (ban.agari_score_rate * 100).toFixed(0) }}%</span>
            </div>
            <div :class="['meter', { 'is-muted': itte_modoshita }]">
              <i :style="{ width: ban.agari_score_rate * 100 + '%' }"></i>
            </div>
            <p class="gauge-sub">
              この一手<br /><span class="num">x{{ ban.agari_score_rate_rate.toFixed(2) }}</span>
            </p>
          </li>
          <li>
            <div class="gauge-row">
              <span class="gauge-label">聴牌率</span>
              <span class="gauge-value num">{{ (ban.tempai_score_rate * 100).toFixed(0) }}%</span>
            </div>
            <div :class="['meter', { 'is-muted': itte_modoshita }]">
              <i :style="{ width: ban.tempai_score_rate * 100 + '%' }"></i>
            </div>
            <p class="gauge-sub">
              この一手<br /><span class="num">x{{ ban.tempai_score_rate_rate.toFixed(2) }}</span>
            </p>
          </li>
        </ul>
      </div>

      <div v-if="ban.turn <= 1 && !is_finished" class="start">
        <p class="quiet">下の手牌から、捨てる牌を押す。押すたびに最善の打牌と比べて採点する。</p>
        <button type="button" class="btn" @click="set_random_hand">
          別の盤面で遊ぶ！
        </button>
      </div>

      <div v-if="ban.kawa_indicators.length > 0" class="panel">
        <div class="panel-head">
          <h2>河</h2>
          <span class="panel-aside">{{ ban.kawa_indicators.length }}枚</span>
        </div>
        <div class="kawa">
          <TileImage v-for="(tile, i) in ban.kawa_indicators" :key="i" :tile="tile" />
        </div>
      </div>

      <div v-if="ban.turn > 1" class="panel prev">
        <div class="panel-head">
          <h2>前の一手</h2>
          <span class="panel-aside">{{ ban.turn - 1 }}巡目の候補</span>
        </div>
        <div class="prev-move">
          <span class="prev-discard">
            <TileImage
              :tile="
                ban.kawa_indicators.length > 0
                  ? ban.kawa_indicators[ban.kawa_indicators.length - 1]
                  : -1
              "
            />
          </span>
          <span class="prev-arrow" aria-hidden="true">←</span>
          <span class="tiles prev-hand">
            <TileImage v-for="(tile, i) in ban.pre_hand_tiles" :key="i" :tile="tile" />
          </span>
        </div>
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
      </div>

      <!-- 手牌は親指の届く下に置く -->
      <div class="dock" :aria-busy="is_calculating ? 'true' : 'false'">
        <div class="dock-bar">
          <span class="dock-turn"><span class="num">{{ ban.turn }}</span>巡目</span>
          <span v-if="is_calculating" class="dock-state is-busy" role="status">計算中</span>
          <span v-else-if="is_finished" class="dock-state">終局</span>
          <span class="dock-actions">
            <button
              v-if="pre_ban && ban.turn < 18 && !is_agari"
              type="button"
              class="btn btn-quiet btn-small"
              @click="back_hand"
            >
              一手戻す
            </button>
            <button type="button" class="btn btn-quiet btn-small" @click="reset_hand">
              はじめから
            </button>
          </span>
        </div>
        <HandAndMeldedBlocks
          @remove-tile="next_tile"
          :tsumo="ban.tsumo_indicators[ban.tsumo_indicators.length - 1]"
          :hand_tiles="ban.hand_tiles"
          :melded_blocks="melded_blocks"
          :disabled="is_calculating || is_finished"
          size="lg"
        />
      </div>
    </section>

    <!-- メニュー -->
    <section
      v-show="tab_index === 1"
      id="tabpanel-1"
      class="ako-main"
      role="tabpanel"
      aria-labelledby="tab-1"
    >
      <div class="panel">
        <div class="panel-head"><h2>この盤面</h2></div>
        <dl class="kv">
          <div class="kv-wide">
            <dt>配牌</dt>
            <dd class="tiles haipai">
              <TileImage v-for="(tile, i) in haipai_tiles" :key="i" :tile="tile" />
            </dd>
          </div>
          <div>
            <dt>シード</dt>
            <dd class="num">{{ seed }}</dd>
          </div>
          <div>
            <dt>盤面の URL</dt>
            <dd class="copy">
              <button type="button" class="btn btn-small" @click="copy_url">
                共有用 URL をコピー
              </button>
              <span class="fine" role="status">{{ copy_status }}</span>
            </dd>
          </div>
        </dl>
        <div class="actions">
          <button type="button" class="btn btn-primary" @click="set_random_hand">
            別の盤面で遊ぶ！
          </button>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h2>他家の設定</h2></div>
        <label class="range-label" for="tacha-tempai">
          他家の聴牌率
          <span class="num range-value">{{ tacha_tempai_percent }}%</span>
          <span class="fine">（既定 72%）</span>
        </label>
        <input
          id="tacha-tempai"
          type="range"
          class="range"
          v-model="tacha_tempai_percent"
        />
        <dl class="kv kv-compact">
          <div>
            <dt>不聴罰符の獲得期待値</dt>
            <dd class="num">{{ "+" + tempai_noten_plus_abs }}点</dd>
          </div>
          <div>
            <dt>不聴罰符の損失期待値</dt>
            <dd class="num">{{ "-" + noten_noten_minus_abs }}点</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- ログ -->
    <section
      v-show="tab_index === 2"
      id="tabpanel-2"
      class="ako-main"
      role="tabpanel"
      aria-labelledby="tab-2"
    >
      <p class="quiet">直近の結果を 100 件まで、このブラウザに残す。</p>
      <p v-if="banResultLogs.length === 0" class="panel quiet">
        まだ記録がない。18巡目まで打つか和了ると、ここに残る。
      </p>
      <ul class="logs">
        <li v-for="log in banResultLogs" :key="log.date" class="panel log">
          <div class="log-head">
            <time class="fine">{{ new Date(log.date).toLocaleString() }}</time>
            <span v-if="log.itte_modoshita" class="chip">一手戻した</span>
            <span class="log-lost num">-{{ log.expected_lost_score_abs.toFixed(0) }}点</span>
          </div>
          <div class="tiles log-tiles">
            <TileImage
              v-for="(tile, i) in log.hand_tiles"
              :key="i + 'log-hand-' + log.date"
              :tile="tile"
            />
          </div>
          <div :class="['meter', { 'is-muted': log.itte_modoshita }]">
            <i
              :style="{
                width: (Math.max(0, 2000 - log.expected_lost_score_abs) / 2000) * 100 + '%',
              }"
            ></i>
          </div>
          <div class="log-actions">
            <a :href="get_state_url(log.seed)" class="btn btn-small btn-quiet">この盤面をもう一度</a>
            <TwitterShare
              :url="get_state_url(log.seed)"
              hashtags="牌効率チェッカー"
              :title="'期待値損失 -' + log.expected_lost_score_abs + '点の牌効率だったよ！'"
              class="btn btn-small btn-quiet"
            >
              つぶやく
            </TwitterShare>
          </div>
        </li>
      </ul>
    </section>

    <!-- 遊び方 -->
    <section
      v-show="tab_index === 3"
      id="tabpanel-3"
      class="ako-main howto"
      role="tabpanel"
      aria-labelledby="tab-3"
    >
      <div class="panel">
        <div class="panel-head"><h2>牌効率チェッカー</h2></div>
        <ul>
          <li>牌効率のチェックだﾞアﾞアﾞァﾞﾞァﾞアﾞ～～～～～！</li>
          <li>
            ここは
            <a href="https://pystyle.info/apps/mahjong-nanikiru-simulator/"
              >https://pystyle.info/apps/mahjong-nanikiru-simulator/</a
            >
            を改変した、一人麻雀の練習ができるサイトです。（<a
              href="https://github.com/Muratam/akochandaaaaaa"
              >GitHub</a
            >）
          </li>
          <li>
            打牌する度に自動で期待値が計算されます。失った期待値の総和の点数が表示されるので、最高の牌効率を目指しましょう！
          </li>
        </ul>
        <div class="actions">
          <TwitterShare
            :url="state_url_pure"
            hashtags="牌効率チェッカー"
            title="牌効率チェッカーで、牌効率をチェック！"
            class="btn btn-small"
          >
            Twitter で紹介する
          </TwitterShare>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>考慮される項目</h2></div>
        <ul>
          <li>一人麻雀であり、ツモ和了のみが考慮されます。</li>
          <li>赤牌、裏ドラ、海底撈月、向聴戻し、手変わり を点数計算に考慮します。</li>
          <li>東場 / 東家。親の点数で計算します。</li>
          <li>すでに捨てた牌の枚数を考慮します。</li>
          <li>他家の聴牌による不聴罰符を考慮します。</li>
        </ul>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>考慮されない項目</h2></div>
        <ul>
          <li>七対子・国士無双は対応していますが、両天秤は考慮されません。</li>
          <li>副露 (ポン、チー、暗槓、明槓、加槓)は考慮されません。</li>
          <li>積み棒、立直棒は点数計算に考慮しません。</li>
        </ul>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>詳細</h2></div>
        <ul>
          <li>損失期待値のゲージは1000点失うと半分になります。2000点以上失うと空になります。</li>
          <li>
            最善に対する和了率のゲージは打牌ごとに「選択した打牌での和了率/最善の打牌での和了率」が乗算されていきます。
            聴牌率も同様です。
          </li>
          <li>副露が無いので、役牌や染め手など鳴かないと成立しづらい役の価値が過小評価されます。</li>
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
          <li>一手戻すと、ゲージは灰色になり、ログにも「一手戻した」と残ります。</li>
        </ul>
      </div>
    </section>
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
      copy_status: "",
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
    // 18巡目まで打ったか、和了った
    is_finished() {
      return this.ban.turn >= 18 || this.is_agari;
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
      const url = this.state_url;
      Promise.resolve()
        .then(() => navigator.clipboard.writeText(url))
        .then(
        () => {
          this.copy_status = "コピーした。この URL を開くと、誰でも同じ盤面で遊べる。";
        },
        () => {
          this.copy_status = `コピーできなかった。${url} を手で写す。`;
        }
      );
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

<style scoped>
.ako {
  --tile-w: 28px;
  min-height: 100vh;
  min-height: 100dvh;
}

/* ---- 上の帯: 名前と画面の切り替え ---- */
.ako-head {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 980px;
  margin: 0 auto;
  padding: 0 8px 0 16px;
  border-bottom: 1px solid var(--line);
}
.ako-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
}
.ako-mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  color: var(--accent);
  font-weight: 600;
  font-size: 1rem;
  line-height: 1;
}
.ako-name {
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: 0.03em;
}
/* 狭い画面では名前を隠して、印と切り替えを 1 段に（読み上げには残す） */
@media (max-width: 699px) {
  .ako-name {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
.ako-tabs {
  display: flex;
  flex: 1;
  align-self: stretch;
  margin-bottom: -1px;
}
.ako-tab {
  flex: 1;
  min-height: 48px;
  padding: 0 4px;
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ako-tab:hover {
  color: var(--ink);
}
.ako-tab[aria-selected="true"] {
  color: var(--ink);
  font-weight: 600;
  border-bottom-color: var(--accent);
}
@media (min-width: 700px) {
  .ako-head {
    gap: 16px;
    padding: 0 16px;
  }
  .ako-tabs {
    flex: 0 1 auto;
    margin-left: auto;
  }
  .ako-tab {
    flex: none;
    min-height: 56px;
    padding: 0 16px;
  }
}

/* ---- 中身 ---- */
.ako-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 980px;
  margin: 0 auto;
  padding: 14px 16px 32px;
}
.board {
  padding-bottom: 0;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

/* 結果（18巡目か和了で終わったとき） */
.finish {
  border-color: var(--accent);
  box-shadow: inset 3px 0 0 var(--accent);
}
.finish h2 {
  color: var(--accent);
}
.finish-text {
  margin-top: 4px;
  font-size: 1.05rem;
  font-weight: 600;
}

/* 点数の盤: 場の情報とゲージ */
.table-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 18px;
  padding-bottom: 12px;
  margin: 0 -16px 12px;
  padding-inline: 16px;
  border-bottom: 1px solid var(--line);
}
.table-info > div {
  display: flex;
  align-items: center;
  gap: 8px;
}
.table-info dt {
  font-size: 0.78rem;
  color: var(--ink-soft);
}
.table-info dd {
  font-weight: 600;
}
.table-info .chip {
  margin-left: auto;
}
.gauges-cap {
  margin-bottom: 6px;
  font-size: 0.78rem;
  color: var(--ink-soft);
}
.gauges {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.gauge-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 6px;
}
.gauge-label {
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.gauge-value {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.25;
  white-space: nowrap;
}
.gauge-sub {
  margin-top: 5px;
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--ink-faint);
}
.gauge-sub .num {
  color: var(--ink-soft);
}
@media (min-width: 700px) {
  .gauges {
    gap: 28px;
  }
  .gauge-row {
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .gauge-value {
    font-size: 1.35rem;
  }
  .gauge-sub br {
    display: none;
  }
  .gauge-sub .num {
    margin-left: 4px;
  }
}

.start {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  font-size: 0.86rem;
}

/* 河: 6 枚ずつ折り返す（本物の卓と同じ） */
.kawa {
  display: grid;
  grid-template-columns: repeat(6, var(--tile-w));
  gap: 3px 2px;
}

.prev-move {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  --tile-w: 18px;
}
@media (min-width: 700px) {
  .prev-move {
    --tile-w: 22px;
  }
}
.prev-discard {
  --tile-w: 28px;
  padding: 2px;
  border-radius: 4px;
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent);
}
.prev-arrow {
  color: var(--ink-faint);
}
.prev-hand {
  gap: 1px;
}

/* ---- 下の手牌の台（いつも見える） ---- */
.dock {
  position: sticky;
  bottom: 0;
  z-index: 5;
  margin: 4px -16px 0;
  padding: 6px 12px max(10px, env(safe-area-inset-bottom));
  background: var(--bg-side);
  border-top: 1px solid var(--line-strong);
  --hand-max: 46px;
}
.dock-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  padding: 0 4px;
}
.dock-turn {
  font-weight: 600;
  font-size: 0.9rem;
}
.dock-turn .num {
  font-size: 1.15rem;
  margin-right: 2px;
}
.dock-state {
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.dock-state.is-busy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
}
.dock-state.is-busy::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  animation: busy 0.9s ease-in-out infinite alternate;
}
@keyframes busy {
  from {
    opacity: 0.25;
  }
  to {
    opacity: 1;
  }
}
.dock-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}
.dock[aria-busy="true"] :deep(.hand) {
  opacity: 0.6;
}
@media (min-width: 700px) {
  .dock {
    margin-inline: 0;
    padding-inline: 16px;
    border: 1px solid var(--line-strong);
    border-bottom: 0;
    border-radius: var(--radius) var(--radius) 0 0;
  }
}

/* ---- メニュー ---- */
.kv {
  display: grid;
  gap: 12px;
}
.kv > div {
  display: grid;
  grid-template-columns: 7.5em minmax(0, 1fr);
  align-items: center;
  gap: 4px 12px;
}
.kv dt {
  font-size: 0.82rem;
  color: var(--ink-soft);
}
/* 配牌は 14 枚を 1 列に（狭い画面では見出しの下に） */
.kv > .kv-wide {
  grid-template-columns: 1fr;
}
.haipai {
  --tile-w: 22px;
  gap: 1px;
}
@media (min-width: 700px) {
  .kv > .kv-wide {
    grid-template-columns: 7.5em minmax(0, 1fr);
  }
  .haipai {
    --tile-w: 30px;
  }
}
.kv-compact {
  gap: 4px;
  margin-top: 12px;
}
.kv-compact > div {
  grid-template-columns: 11em auto;
}
.copy {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.range-label {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  font-size: 0.86rem;
}
.range-value {
  font-size: 1.2rem;
  color: var(--ink);
}
.range {
  width: 100%;
  max-width: 28rem;
  height: 32px;
  margin: 6px 0 0;
  accent-color: var(--accent);
  cursor: pointer;
}

/* ---- ログ ---- */
.logs {
  display: grid;
  gap: 8px;
}
.log {
  display: grid;
  gap: 8px;
  --tile-w: 22px;
}
.log-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
}
.log-lost {
  margin-left: auto;
  font-size: 1.05rem;
}
.log-tiles {
  gap: 1px;
}
.log-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 -10px -6px;
}
@media (min-width: 700px) {
  .logs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* ---- 遊び方 ---- */
.howto ul {
  display: grid;
  gap: 6px;
  max-width: 44em;
  padding-left: 1.1em;
  list-style: disc;
}
.howto li::marker {
  color: var(--ink-faint);
}
</style>
