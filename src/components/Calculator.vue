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
      <!-- 手牌のまとまりは上の帯のすぐ下に置き、その下を候補に充てる（視線を上の 1 か所にまとめる）。
           並びは下に置いていたときの鏡写し: 手牌 → 巡目・ドラ表示・ゲージ → 河。伸びる河をいちばん下にして、手牌の位置を動かさない -->
      <div class="dock" :aria-busy="is_calculating ? 'true' : 'false'">
        <HandAndMeldedBlocks
          @remove-tile="next_tile"
          :tsumo="ban.tsumo_indicators[ban.tsumo_indicators.length - 1]"
          :hand_tiles="ban.hand_tiles"
          :melded_blocks="melded_blocks"
          :disabled="is_calculating || is_finished"
          size="lg"
        />
        <!-- 手牌のすぐ下: 巡目・ドラ表示・場と自風・最善に対するゲージ（手牌を見ながら使う情報を手牌の近くに）。
             「巡目・ドラ表示・場と自風・ボタン」と「ゲージ」の 2 段（PC もスマホと同じ。縦の短い横長の画面だけ 1 行） -->
        <div class="dock-head">
          <div class="dock-bar">
            <span class="dock-turn">
              <span><span class="num">{{ ban.turn }}</span>巡目</span>
              <span v-if="is_calculating" class="dock-state is-busy" role="status">計算中</span>
              <span v-else-if="is_finished" class="dock-state">終局</span>
              <span v-if="itte_modoshita" class="chip">一手戻した</span>
            </span>
            <span class="dock-dora">
              <span class="dock-label">ドラ表示</span>
              <span class="tiles">
                <TileImage v-for="(tile, i) in dora_indicators" :key="i" :tile="tile" />
              </span>
            </span>
            <span class="dock-wind">{{ tile2String(bakaze) }}場 {{ tile2String(zikaze) }}家</span>
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
          <div class="dock-stats">
            <p class="gauges-cap">
              <span>最善に<span class="nobr">対する</span></span>
            </p>
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
                  この一手 <span class="num">-{{ ban.expected_current_lost_score_abs.toFixed(0) }}点</span>
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
                  この一手 <span class="num">x{{ ban.agari_score_rate_rate.toFixed(2) }}</span>
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
                  この一手 <span class="num">x{{ ban.tempai_score_rate_rate.toFixed(2) }}</span>
                </p>
              </li>
            </ul>
          </div>
        </div>
        <!-- 巡目の段のさらに下: 河（1 段分の高さを最初から確保し、2 段目は下へ伸びる。手牌の位置は動かない） -->
        <div class="dock-kawa">
          <span class="dock-label">河<span class="num">{{ ban.kawa_indicators.length }}</span>枚</span>
          <!-- 横に並べて折り返す。高さに上限があり、超えたら枠の中で最新（下）までスクロールする -->
          <div ref="kawa" class="kawa">
            <TileImage v-for="(tile, i) in ban.kawa_indicators" :key="i" :tile="tile" />
          </div>
        </div>
      </div>

      <!-- ページ全体はスクロールしない。上の台より下の高さは全部、前の一手の候補に充てる（場・自風・河は上の台に置く） -->
      <div ref="body" class="board-body">
        <div class="board-cands">
          <div v-if="is_finished" class="panel finish">
            <p class="finish-text"><span class="finish-label">結果</span>{{ state_info_without_config }}</p>
            <div class="actions">
              <button type="button" class="btn btn-primary btn-small" @click="set_random_hand">
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

          <div v-if="ban.turn <= 1 && !is_finished" class="panel start">
            <p class="quiet">
              上の手牌から、捨てる牌を押す。押すたびに最善の打牌と比較して採点し、ここに候補を並べる。
            </p>
            <button type="button" class="btn" @click="set_random_hand">
              別の盤面で遊ぶ！
            </button>
          </div>

          <div v-if="ban.turn > 1" class="panel panel-tight prev">
            <!-- 自分の打牌と最善の打牌の差の 1 行と、候補の表（常に表示する。表はこの欄の中だけでスクロールする） -->
            <div class="prev-line">
              <h2 class="prev-title">
                前の一手<span class="prev-turn">{{ ban.turn - 1 }}巡目</span>
              </h2>
              <span class="prev-pair">
                <span class="prev-who">自分</span>
                <span class="prev-tile is-mine"><TileImage :tile="last_discard" /></span>
                <template v-if="prev_summary && !prev_summary.same">
                  <span class="prev-who">最善</span>
                  <span class="prev-tile"><TileImage :tile="prev_summary.best_tile" /></span>
                </template>
              </span>
              <span :class="['prev-diff', 'num', prev_diff_class]">{{ prev_diff_text }}</span>
            </div>
            <div ref="cands" class="prev-detail">
              <div class="prev-move">
                <span class="prev-discard">
                  <TileImage :tile="last_discard" />
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
                :selected_tile="last_discard"
              />
            </div>
          </div>
        </div>
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
      <p class="quiet">直近の結果を 100 件まで、このブラウザに保存する。</p>
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
import { discardSummary } from "@/summary.js";

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
    // 前の一手で捨てた牌（河の最後）
    last_discard() {
      const kawa = this.ban.kawa_indicators;
      return kawa.length > 0 ? kawa[kawa.length - 1] : -1;
    },
    // 前の一手の要約（最善の打牌と自分の打牌）
    prev_summary() {
      if (this.ban.turn <= 1) return null;
      return discardSummary(this.ban.pre_result, this.last_discard);
    },
    prev_diff_text() {
      const s = this.prev_summary;
      if (!s) return "";
      if (s.kind === "req") {
        if (s.same) return `最善 受入${s.best_value}`;
        return `受入${s.my_value ?? "—"}/${s.best_value}`;
      }
      if (s.same) return "最善";
      return `-${this.ban.expected_current_lost_score_abs.toFixed(0)}点`;
    },
    prev_diff_class() {
      const s = this.prev_summary;
      if (!s) return null;
      return s.same ? "is-good" : "is-bad";
    },
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
          this.copy_status = `コピーできなかった。${url} を手動でコピーしてください。`;
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

    /// 手牌から牌を捨て、次の牌をツモる
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
  watch: {
    // 一手ごとに候補の表を先頭（最善の候補）へ戻す
    "ban.turn"() {
      this.$nextTick(() => {
        if (this.$refs.cands) this.$refs.cands.scrollTop = 0;
      });
    },
    // 河が上限の高さを超えたら、枠の中で最新の牌が見える位置までスクロールする
    "ban.kawa_indicators.length"() {
      this.$nextTick(() => {
        const kawa = this.$refs.kawa;
        if (kawa) kawa.scrollTop = kawa.scrollHeight;
      });
    },
    // 終局したら結果が見えるよう、中の枠を上端へ
    is_finished(v) {
      if (!v) return;
      this.$nextTick(() => {
        if (this.$refs.body) this.$refs.body.scrollTop = 0;
      });
    },
  },
  mounted() {
    this.set_random_hand();
  },
};
</script>

<style scoped>
/*
 * 画面の高さにちょうど収める（ページ全体はスクロールしない）。ポータルの iframe の中では 100dvh が枠の高さになる。
 * 上の帯・手牌の台・中身を縦に並べ、伸びる中身は中身の枠の中だけでスクロールする。手牌の台はいつも同じ位置。
 */
.ako {
  /* 手牌の 1 枚の幅（14 枚が 1 列に収まるよう画面の幅で割る。最大 --hand-max）と、
     手牌以外の牌（ドラ表示・河・前の一手・候補・有効牌・配牌・ログ）の幅＝手牌の 85%（11-14 murata） */
  --hand-max: 46px;
  --hand-w: min(var(--hand-max), calc((100vw - 48px) / 14));
  --sub-w: calc(var(--hand-w) * 0.85);
  --tile-w: var(--sub-w);
  --gutter: 16px;
  /* 中身の列の幅。大きな画面では候補の表の有効牌まで見えるよう広げる */
  --col: 980px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

/* ---- 上の帯: 名前と画面の切り替え ---- */
.ako-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: var(--col);
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
/* 中身の枠: 幅は --col の列（スクロールバーは画面の端に出るよう、余白で列を作る） */
.ako-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 14px max(var(--gutter), calc((100% - var(--col)) / 2 + var(--gutter))) 32px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
/* 盤面: 手牌の台（動かない）と中身（スクロールする）の 2 段 */
.board {
  gap: 0;
  padding: 0;
  overflow: hidden;
}
.board-body {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  /* 上の台より下の高さを全部候補に */
  grid-template-rows: minmax(0, 1fr);
  gap: 10px;
  padding: 10px max(var(--gutter), calc((100% - var(--col)) / 2 + var(--gutter)))
    max(10px, env(safe-area-inset-bottom));
  /* 収まらないときだけの逃げ道（想定した画面の大きさではスクロールせずに収まる） */
  overflow-y: auto;
  overscroll-behavior: contain;
}
.board-cands {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
@media (min-width: 1200px) {
  .ako {
    --col: 1160px;
  }
}
.panel-tight,
.finish {
  padding: 10px 14px 12px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

/* 結果（18巡目か和了で終わったとき）: 候補の上に 1 段で */
.finish {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  margin-bottom: 10px;
  border-color: var(--accent);
  box-shadow: inset 3px 0 0 var(--accent);
}
.finish-label {
  margin-right: 10px;
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 650;
}
.finish-text {
  flex: 1 1 16em;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.45;
}
.finish .actions {
  margin: 0 0 0 auto;
}
.start {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  font-size: 0.86rem;
}

/* 前の一手: 自分と最善の打牌・差の 1 行と、候補の表。欄は右の列（狭い画面では残りの高さ）いっぱいで、表だけ中でスクロールする */
.prev {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  container-type: inline-size;
}
.prev-line {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  min-height: 34px;
}
.prev-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  line-height: 1.25;
  white-space: nowrap;
}
.prev-turn {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--ink-soft);
}
.prev-pair {
  display: flex;
  align-items: center;
  gap: 5px;
}
.prev-who {
  font-size: 0.72rem;
  color: var(--ink-soft);
  white-space: nowrap;
}
.prev-who + .prev-tile {
  margin-right: 3px;
}
.prev-tile {
  padding: 1px;
  border-radius: 3px;
}
.prev-tile.is-mine {
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent);
}
.prev-diff {
  margin-left: auto;
  font-weight: 600;
  white-space: nowrap;
}
.prev-diff.is-good {
  color: var(--ok);
}
.prev-diff.is-bad {
  color: var(--bad);
}
/* 候補の表のスクロール枠（見出しの行は上に留まる） */
.prev-detail {
  flex: 1;
  min-height: 0;
  margin: 8px -14px 0;
  padding: 0 8px;
  border-top: 1px solid var(--line);
  overflow-y: auto;
  overscroll-behavior: contain;
}
/* 捨てる前の手牌: 縦に余裕のある大きな画面だけ */
.prev-move {
  display: none;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 6px;
}
@media (min-width: 760px) and (min-height: 760px) {
  .prev-move {
    display: flex;
  }
}
.prev-discard {
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

/* ---- 上の手牌の台（いつも見える。中身の枠の外なので、中身が伸びても動かない） ---- */
.dock {
  flex: none;
  z-index: 5;
  width: 100%;
  padding: 8px 12px 4px;
  background: var(--bg-side);
  border-bottom: 1px solid var(--line-strong);
}
.dock-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 14px;
  min-height: 34px;
  margin-top: 4px;
  padding: 0 4px;
}
/* スマホの縦（360〜459px）: 巡目・ドラ表示・場と自風・ボタンを 1 行に収めるよう詰める（収まらなければ折り返す） */
@media (max-width: 459px) {
  .dock-bar {
    column-gap: 8px;
  }
  .dock-actions {
    gap: 4px;
  }
  .dock-actions .btn-small {
    padding-inline: 8px;
    font-size: 0.76rem;
  }
}
@media (max-width: 379px) {
  .dock-bar {
    column-gap: 6px;
    padding-inline: 0;
  }
  .dock-dora {
    gap: 4px;
  }
  .dock-wind {
    font-size: 0.8rem;
  }
  .dock-actions .btn-small {
    padding-inline: 6px;
  }
}
/* ドラ表示（手牌の判断に使うので、手牌の近くに） */
.dock-dora {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dock-label {
  font-size: 0.72rem;
  line-height: 1.2;
  color: var(--ink-soft);
  white-space: nowrap;
}
/* 場と自風（ドラ表示の隣） */
.dock-wind {
  font-size: 0.86rem;
  font-weight: 600;
  white-space: nowrap;
}
/* 河: 手牌の下の段のさらに下（台のいちばん下）。見出しを左に、牌は横に並べて折り返す。
   1 段分の高さを最初から確保し、2 段目は下へ伸びる（手牌は動かない）。2 段を超えたら枠の中で最新（下）までスクロールする */
.dock-kawa {
  --kawa-w: var(--sub-w);
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 0 4px 4px;
}
.dock-kawa .dock-label {
  flex: none;
  width: 3.4em;
  line-height: calc(var(--kawa-w) * 90 / 66);
}
.dock-kawa .num {
  margin-left: 2px;
}
.kawa {
  --tile-w: var(--kawa-w);
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  min-height: calc(var(--tile-w) * 90 / 66);
  max-height: calc(var(--tile-w) * 90 / 66 * 2 + 2px);
  overflow-y: auto;
  overscroll-behavior: contain;
}
@media (min-width: 760px) {
  .dock-kawa {
    padding-bottom: 6px;
  }
}
/* 最善に対するゲージ: 見出しの小さな列と、3 つのゲージ */
.dock-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 4px 6px;
}
.gauges-cap {
  flex: none;
  width: 4.2em;
  font-size: 0.7rem;
  line-height: 1.25;
  color: var(--ink-soft);
}
.gauges-cap .nobr {
  white-space: nowrap;
}
.dock-turn .chip {
  align-self: center;
  padding: 0 4px;
  font-weight: 400;
  font-size: 0.64rem;
  line-height: 1.4;
  white-space: nowrap;
}
.gauges {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.gauge-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 3px;
}
.gauge-label {
  font-size: 0.72rem;
  line-height: 1.3;
  color: var(--ink-soft);
  white-space: nowrap;
}
.gauge-value {
  font-size: 1.05rem;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}
.gauge-sub {
  margin-top: 2px;
  font-size: 0.68rem;
  line-height: 1.3;
  white-space: nowrap;
  color: var(--ink-faint);
}
.gauge-sub .num {
  color: var(--ink-soft);
}
.dock .meter {
  height: 5px;
}
.dock-turn {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
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
    width: calc(100% - 2 * var(--gutter));
    max-width: calc(var(--col) - 2 * var(--gutter));
    margin: 0 auto;
    padding-inline: 16px;
    border: 1px solid var(--line-strong);
    border-top: 0;
    border-radius: 0 0 var(--radius) var(--radius);
  }
}
/* 縦の短い横長の画面（スマホの横など）: 手牌の下の段を 1 行に（巡目・ドラ表示 | 最善に対するゲージ | ボタン）。
   候補の欄の高さを減らさないよう、前の巡目の行と同じくらいの高さに収める。
   縦に余裕のある画面は PC もスマホと同じ 2 段（「巡目・ドラ表示・場と自風・ボタン」の下に「最善に対する」のゲージ。T309） */
@media (min-width: 760px) and (max-height: 500px) {
  .dock-head {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 34px;
    margin-top: 4px;
    padding: 0 4px 2px;
  }
  .dock-bar {
    display: contents;
  }
  .dock-turn {
    order: 1;
  }
  .dock-dora,
  .dock-wind {
    order: 2;
  }
  .dock-stats {
    order: 3;
    flex: 1;
    min-width: 0;
    padding: 0;
  }
  .dock-actions {
    order: 4;
  }
  .gauges-cap {
    width: 3.6em;
    font-size: 0.66rem;
    line-height: 1.2;
  }
  /* ゲージは 2 段: 名前と値 / メーターと「この一手」 */
  .gauges li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 8px;
  }
  .gauge-row {
    display: contents;
  }
  .gauge-value {
    line-height: 1.1;
    text-align: right;
  }
  .gauge-sub {
    margin: 0;
    font-size: 0.66rem;
    line-height: 1.2;
    text-align: right;
  }
  .dock .meter {
    height: 4px;
  }
}
/* 縦の短い画面で幅 760〜1023px: 1 行のまま、ゲージの見出しを隠して名前と値が重ならないようにする（読み上げには残す） */
@media (min-width: 760px) and (max-width: 1023px) and (max-height: 500px) {
  .dock-head {
    gap: 10px;
  }
  .gauges-cap {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .gauges {
    gap: 10px;
  }
  .gauge-value {
    font-size: 0.95rem;
  }
}
@media (min-width: 1200px) {
  .gauges {
    gap: 28px;
  }
  .gauge-value {
    font-size: 1.15rem;
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
  gap: 1px;
}
@media (min-width: 700px) {
  .kv > .kv-wide {
    grid-template-columns: 7.5em minmax(0, 1fr);
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

/* ---- 縦の短い画面（スマホの横など）: 上の帯と手牌の台を詰めて、盤と候補に高さを回す ---- */
@media (max-height: 500px) {
  .ako-brand {
    min-height: 30px;
  }
  .ako-tab {
    min-height: 40px;
  }
  .board-body {
    padding-block: 8px;
    gap: 8px;
  }
  /* 手牌以外の牌は手牌の 85%（34px）にすると候補が 2 行しか見えないので、ここだけ前の大きさに近い 18px のまま */
  .ako {
    --hand-max: 40px;
    --sub-w: 18px;
  }
  .dock {
    padding-top: 6px;
    padding-bottom: 0;
  }
  .dock-bar {
    min-height: 30px;
  }
  .dock-bar .btn-small {
    min-height: 28px;
    padding-block: 2px;
  }
  .panel-tight,
  .finish {
    padding: 6px 12px 8px;
  }
  .finish {
    margin-bottom: 8px;
  }
  .dock-head {
    min-height: 30px;
    margin-top: 2px;
    padding-bottom: 0;
  }
  .dock-actions .btn-small {
    min-height: 26px;
    padding-block: 1px;
  }
  .dock-kawa {
    padding-bottom: 4px;
  }
  .prev-line {
    min-height: 28px;
  }
  .prev-detail {
    margin-top: 4px;
  }
}
</style>
