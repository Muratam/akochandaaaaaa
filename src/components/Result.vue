<template>
  <div class="result">
    <!-- 成功時 -->
    <template v-if="result && result.success">
      <!-- 打牌一覧 -->
      <template v-if="!showGraph && !is_show_graph">
        <!-- 1 候補 1 行。欄が狭いときは有効牌の列を隠す（期待値などの数字を優先） -->
        <table :class="['cands', { 'has-exp': hasExp }]">
          <thead>
            <tr>
              <th
                v-for="field in fields"
                :key="field.key"
                scope="col"
                :class="['c-' + field.key, { sortable: field.sortable }]"
                :aria-sort="ariaSort(field)"
              >
                <button
                  v-if="field.sortable"
                  type="button"
                  class="th-btn"
                  @click="onHeaderClick(field)"
                >
                  {{ field.label }}<span class="sort-icon" aria-hidden="true">{{ sortIcon(field) }}</span>
                </button>
                <template v-else>{{ field.label }}</template>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, rowIndex) in sortedItems"
              :key="rowIndex"
              :class="{ 'is-selected': !!cellClass(item, { key: 'tile' }) }"
            >
              <td
                v-for="field in fields"
                :key="field.key"
                :class="'c-' + field.key"
                :data-label="field.key === 'tile' || field.key === 'required_tiles' ? null : field.label"
              >
                <!-- 打牌 -->
                <template v-if="field.key === 'tile'">
                  <TileImage :tile="item.tile" />
                </template>
                <!-- 受入 -->
                <template v-else-if="field.key === 'n_required_tiles'">
                  <span class="num">{{ item.required_tiles.length }}種 {{ item.n_required_tiles }}枚</span>
                  <span v-if="item.syanten_down" class="down">(+1向聴)</span>
                </template>
                <!-- 有効牌 -->
                <template v-else-if="field.key === 'required_tiles'">
                  <span class="tiles eff">
                    <TileImage
                      v-for="(tile, i) in item.required_tiles"
                      :key="i"
                      :tile="tile.tile"
                    />
                  </span>
                </template>
                <template v-else>
                  <span class="num">{{
                    field.formatter ? field.formatter(item[field.key]) : item[field.key]
                  }}</span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </template>

      <!-- グラフ -->
      <template v-if="showGraph">
        <div class="chart">
          <div class="seg" role="radiogroup" aria-label="グラフの値">
            <template v-for="opt in line_options" :key="opt.value">
              <input
                type="radio"
                class="seg-input"
                name="input-line-type"
                :id="'input-line-type-' + opt.value"
                :value="opt.value"
                v-model="line_type"
                autocomplete="off"
              />
              <label class="seg-btn" :for="'input-line-type-' + opt.value">{{ opt.text }}</label>
            </template>
          </div>
          <LineChart :chartData="lineData" :options="lineOptions" />
        </div>
      </template>
      <p v-else-if="is_show_graph" class="alert" role="alert">
        向聴数が大きすぎてグラフを作成できませんでした
      </p>
    </template>

    <!-- 失敗時 -->
    <p v-else-if="result && !result.success" class="alert" role="alert">
      {{ result.err_msg }}
    </p>
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import TileImage from "@/components/mahjong/TileImage.vue";
import { TileOrder, TilePriority, Tile2String } from "@/mahjong.js";
// chart.js はグラフ表示時のみ必要なので遅延ロードする
const LineChart = defineAsyncComponent(() =>
  import("@/components/LineChart.vue")
);

export default {
  name: "Result",

  components: {
    TileImage,
    LineChart,
  },

  data() {
    return {
      // b-table の sort-by / sort-desc 相当のローカル状態
      localSortBy: null,
      localSortDesc: true,
      line_options: [
        {
          value: "exp_values",
          text: "期待値",
        },
        {
          value: "win_probs",
          text: "和了率",
        },
        {
          value: "tenpai_probs",
          text: "聴牌率",
        },
      ],
      line_type: "exp_values",
    };
  },

  methods: {
    onHeaderClick(field) {
      if (!field.sortable) return;
      if (this.localSortBy === field.key) {
        this.localSortDesc = !this.localSortDesc;
      } else {
        this.localSortBy = field.key;
        this.localSortDesc = false;
      }
    },
    ariaSort(field) {
      if (!field.sortable) return null;
      if (this.localSortBy !== field.key) return "none";
      return this.localSortDesc ? "descending" : "ascending";
    },
    sortIcon(field) {
      if (this.localSortBy !== field.key) return "\u21C5";
      return this.localSortDesc ? "\u25BC" : "\u25B2";
    },
    cellClass(item, field) {
      const variant = item._cellVariants && item._cellVariants[field.key];
      return variant ? `table-${variant}` : null;
    },
    sortCompare(aRow, bRow, key) {
      const a = aRow[key];
      const b = bRow[key];

      if (key === "tile") {
        // 牌の場合
        return TileOrder[a] - TileOrder[b];
      }

      if (key === "exp_value") {
        return Math.round(a) != Math.round(b)
          ? a - b
          : TilePriority[bRow["tile"]] - TilePriority[aRow["tile"]];
      }

      if (key === "win_prob") {
        return Math.round(a * 10000) != Math.round(b * 10000)
          ? a - b
          : TilePriority[bRow["tile"]] - TilePriority[aRow["tile"]];
      }

      // デフォルト
      if (
        (typeof a === "number" && typeof b === "number") ||
        (a instanceof Date && b instanceof Date)
      ) {
        return a - b;
      } else {
        return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
          numeric: true,
        });
      }
    },
  },

  computed: {
    hasExp() {
      return this.fields.some((f) => f.key === "exp_value");
    },
    sortedItems() {
      const key = this.localSortBy;
      if (!key) return this.items;
      const desc = this.localSortDesc;
      // 安定ソート (Array.prototype.sort は安定)
      return this.items.slice().sort((a, b) => {
        const v = this.sortCompare(a, b, key);
        return desc ? -v : v;
      });
    },
    showGraph() {
      if (!this.result || !this.result.success) return false;
      let res = this.result.response;
      let ok = res.result_type == 1 && res.syanten <= 3;
      if (!ok) return false;
      return this.is_show_graph;
    },

    lineOptions() {
      if (!this.result || !this.result.success) return {};

      let req = this.result.request;

      let xlabel = this.line_options.find(
        (x) => x.value == this.line_type
      ).text;
      let options = {
        plugins: {
          annotation: {
            annotations: {
              vLine: {
                type: "line",
                scaleID: "x",
                // カテゴリ軸 (1〜17巡目) のインデックス
                value: req.turn - 1,
                borderWidth: 2,
                borderColor: "#f0b445",
                borderDash: [2, 2],
                label: {
                  display: true,
                  position: "start",
                  content: "現在",
                  backgroundColor: "#212d38",
                  color: "#e3eaef",
                },
              },
            },
          },

          tooltip: {
            callbacks: {
              title: function (tooltipItems) {
                return tooltipItems[0].label + "巡目";
              },

              label: function (context) {
                let label = context.dataset.label;

                let value = context.parsed.y;

                if (value <= 1) {
                  value = (value * 100).toFixed(2) + "%";
                } else {
                  value = Math.round(value) + "点";
                }

                return label + ": " + value;
              },
            },
          },

          legend: {
            align: "start",
          },
        },

        animation: false,

        scales: {
          x: {
            title: {
              display: true,
              text: "巡目",
            },
          },
          y: {
            title: {
              display: true,
              text: xlabel,
            },

            ticks: {
              callback: function (x) {
                // 確率は%、期待値は点を末尾に付ける。
                return x <= 1 ? Math.round(x * 100) + "%" : x + "点";
              },
            },
          },
        },
      };

      return options;
    },

    lineData() {
      if (!this.result || !this.result.success)
        return { labels: [], datasets: [] };

      // 暗い面（#141c23）で検証した 8 色を決まった順に使う。9 本目からは目立たない灰色
      let colors = [
        "#3987e5",
        "#d95926",
        "#199e70",
        "#c98500",
        "#d55181",
        "#008300",
        "#9085e9",
        "#e66767",
      ];

      let res = this.result.response;
      let turns = Array.from({ length: 17 }, (_, i) => i + 1);

      let datasets = [];
      for (let [i, candidate] of res.candidates.entries()) {
        datasets.push({
          label: Tile2String.get(candidate.tile),
          data: candidate[this.line_type],
          fill: false,
          tension: 0,
          borderColor: colors[i] ?? "#627281",
          backgroundColor: colors[i] ?? "#627281",
          borderWidth: i < colors.length ? 2 : 1,
          pointRadius: 2,
          // hidden: i >= 5,
        });
      }

      return {
        labels: turns,
        datasets: datasets,
      };
    },

    // 打牌一覧のヘッダー
    fields() {
      if (!this.result || !this.result.success) return [];

      let syanten = this.result.response.syanten;
      let result_type = this.result.response.result_type;

      if (result_type == 1) {
        // 打牌時
        let fields = [
          {
            key: "tile",
            label: "打牌",
            sortable: true,
          },
        ];

        if (syanten <= 3) {
          fields = fields.concat([
            {
              key: "exp_value",
              label: "期待値",
              sortable: true,
              formatter: (x) => Math.floor(x) + "点",
            },
            {
              key: "win_prob",
              label: "和了率",
              sortable: true,
              formatter: (x) => (x * 100).toFixed(2) + "%",
            },
            {
              key: "tenpai_prob",
              label: "聴牌率",
              sortable: true,
              formatter: (x) => (x * 100).toFixed(2) + "%",
            },
          ]);
        }

        fields = fields.concat([
          {
            key: "n_required_tiles",
            label: "受入",
            sortable: true,
          },
          {
            key: "required_tiles",
            label: "有効牌",
            sortable: false,
          },
        ]);

        return fields;
      } else {
        // 自摸時
        let fields = [
          {
            key: "n_required_tiles",
            label: "受入",
            sortable: false,
          },
          {
            key: "required_tiles",
            label: "有効牌",
            sortable: false,
          },
        ];

        return fields;
      }
    },

    // 打牌一覧のコンテンツ
    items() {
      if (!this.result || !this.result.success) return [];

      let sumRequiredTiles = (x) => x.reduce((s, e) => s + e.count, 0);

      let req = this.result.request;
      let res = this.result.response;

      let items = [];
      if (res.result_type == 1) {
        for (let candidate of res.candidates) {
          // 有効牌をソートする。
          let required_tiles = candidate.required_tiles
            .concat()
            .sort((a, b) => TileOrder[a.tile] - TileOrder[b.tile]);

          let item = {};

          // 打牌
          item.tile = candidate.tile;

          // 受入
          item.n_required_tiles = sumRequiredTiles(candidate.required_tiles);

          // 向聴戻し
          item.syanten_down = candidate.syanten_down;
          // 選択した打牌は青く
          if (candidate.tile === this.selected_tile) {
            item._cellVariants = { tile: "info" };
          }
          // 有効牌の一覧
          item.required_tiles = required_tiles;

          if (res.syanten <= 3) {
            // 現状の巡目の期待値
            item.exp_value = candidate.exp_values[req.turn - 1];
            // 現状の巡目の和了率
            item.win_prob = candidate.win_probs[req.turn - 1];
            // 現状の巡目の聴牌率
            item.tenpai_prob = candidate.tenpai_probs[req.turn - 1];
          }

          items.push(item);
        }
      } else {
        let item = {};

        // 受入
        item.n_required_tiles = sumRequiredTiles(res.required_tiles);

        // 有効牌の一覧
        item.required_tiles = res.required_tiles
          .concat()
          .sort((a, b) => TileOrder[a.tile] - TileOrder[b.tile]);

        items.push(item);
      }

      return items;
    },

    // ソート方法
    sortBy() {
      if (!this.result || !this.result.success) return null;

      let req = this.result.request;
      let res = this.result.response;

      if (res.result_type == 1) {
        // 14枚
        if (res.syanten <= 3 && req.flag & 64) {
          // 「3向聴以上、和了率最大化」の場合は和了率が高い順にソートする。
          return "win_prob";
        } else if (res.syanten <= 3 && !(req.flag & 64)) {
          // 「3向聴以上かつ期待値最大化」の場合は期待値が高い順にソートする。
          return "exp_value";
        } else {
          // 「4向聴以上」の場合は受入が多い順にソートする。
          return "n_required_tiles";
        }
      } else {
        // 13枚
        return "";
      }
    },

    // 向聴数
    syanten() {
      if (!this.result || !this.result.success) return "";

      let syanten = this.result.response.syanten;

      return syanten == 0 ? "聴牌" : `${syanten}向聴`;
    },

    // 計算時間
    calcTime() {
      if (!this.result) return "";

      let time = this.result.response.time;

      if (time.toString().length > 6) return (time / 1000000).toFixed(2) + "s";
      else if (time.toString().length > 3)
        return Math.floor(time / 1000) + "ms";
      else return time.toString() + "μs";
    },
  },

  props: ["result", "hand_tiles", "is_show_graph", "selected_tile"],

  watch: {
    sortBy: {
      handler(value) {
        this.localSortBy = value || null;
      },
      immediate: true,
    },
    result: function (result) {
      if (!result || !result.success) return;

      let sumRequiredTiles = (x) => x.reduce((s, e) => s + e.count, 0);

      let req = result.request;
      let res = result.response;

      if (res.result_type != 1) return;

      if (req.flag & 64) this.line_type = "win_probs";
      else this.line_type = "exp_values";

      // 14枚
      if (res.syanten <= 3 && req.flag & 64) {
        // 「3向聴以上、和了率最大化」の場合は和了率が高い順にソートする。
        res.candidates.sort((a, b) =>
          Math.round(a.win_probs[0] * 10000) !=
          Math.round(b.win_probs[0] * 10000)
            ? b.win_probs[0] - a.win_probs[0]
            : TilePriority[a.tile] - TilePriority[b.tile]
        );
      } else if (res.syanten <= 3 && !(req.flag & 64)) {
        // 「3向聴以上かつ期待値最大化」の場合は期待値が高い順にソートする。
        res.candidates.sort((a, b) =>
          Math.round(a.exp_values[0]) != Math.round(b.exp_values[0])
            ? b.exp_values[0] - a.exp_values[0]
            : TilePriority[a.tile] - TilePriority[b.tile]
        );
      } else {
        // 「4向聴以上」の場合は受入が多い順にソートする。
        res.candidates.sort(function (a, b) {
          let a_sum = sumRequiredTiles(a.required_tiles);
          let b_sum = sumRequiredTiles(b.required_tiles);
          return a_sum != b_sum
            ? b_sum - a_sum
            : TilePriority[a.tile] - TilePriority[b.tile];
        });
      }
    },
  },
};
</script>

<style scoped>
.result {
  --tile-w: 30px;
}

/* ---- 候補の表: 1 候補 1 行。見出しはスクロール枠の上に固定する ---- */
.cands {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  line-height: 1.3;
}
.cands th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0 6px;
  background: var(--surface);
  box-shadow: inset 0 -1px 0 var(--line-strong);
  color: var(--ink-soft);
  font-size: 0.74rem;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}
.th-btn {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.th-btn:hover,
th[aria-sort="ascending"] .th-btn,
th[aria-sort="descending"] .th-btn {
  color: var(--ink);
}
.sort-icon {
  font-size: 0.75em;
  opacity: 0.6;
  margin-left: 2px;
}
.cands td {
  padding: 3px 6px;
  border-bottom: 1px solid var(--line);
  vertical-align: middle;
  white-space: nowrap;
}
.cands tbody tr:hover {
  background: var(--surface-2);
}
/* 選んだ打牌の行（ポータルのナビの「いまいる場所」と同じ印） */
.cands tr.is-selected {
  background: var(--accent-soft);
  box-shadow: inset 3px 0 0 var(--accent);
}
.c-tile {
  width: 1%;
  --tile-w: 22px;
}
.down {
  margin-left: 4px;
  font-size: 0.72rem;
  color: var(--warn);
}
.c-required_tiles {
  white-space: normal;
}
.eff {
  --tile-w: 16px;
  gap: 1px;
}
/* 欄が狭い（スマホの縦・横）: 数字の列を優先して、有効牌の列は隠す */
@container (max-width: 559px) {
  .cands.has-exp .c-required_tiles {
    display: none;
  }
  .cands th,
  .cands td {
    padding-inline: 4px;
  }
  .eff {
    --tile-w: 14px;
  }
}
@container (min-width: 560px) {
  .c-tile {
    --tile-w: 24px;
  }
  .eff {
    --tile-w: 18px;
  }
}
/* 縦の短い画面（スマホの横）: 行を詰めて、見える候補を増やす。
   欄が広くても牌は小さいままにする（上の幅の指定を上書きするので、その後ろに置く） */
@media (max-height: 500px) {
  .cands td {
    padding-block: 1px;
  }
  .c-tile {
    --tile-w: 18px;
  }
  .eff {
    --tile-w: 14px;
  }
  .th-btn {
    min-height: 24px;
  }
}

/* ---- グラフ ---- */
.chart {
  max-width: 640px;
}
.seg {
  display: inline-flex;
  margin-bottom: 10px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.seg-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.seg-btn {
  padding: 6px 14px;
  font-size: 0.82rem;
  color: var(--ink-soft);
  cursor: pointer;
}
.seg-btn + .seg-input + .seg-btn {
  border-left: 1px solid var(--line-strong);
}
.seg-input:checked + .seg-btn {
  background: var(--accent-soft);
  color: var(--ink);
}
.seg-input:focus-visible + .seg-btn {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.alert {
  padding: 10px 12px;
  border: 1px solid var(--bad);
  border-radius: var(--radius-sm);
  background: var(--bad-soft);
  color: var(--bad);
  font-size: 0.88rem;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>
