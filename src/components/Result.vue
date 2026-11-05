<template>
  <div class="container-fluid p-0">
    <!-- 成功時 -->
    <template v-if="result && result.success">
      <!-- 打牌一覧 -->
      <div v-if="!showGraph && !is_show_graph" class="row mt-2">
        <div class="col">
          <table class="table b-table">
            <thead>
              <tr>
                <th
                  v-for="field in fields"
                  :key="field.key"
                  :style="field.thStyle"
                  :class="{ sortable: field.sortable }"
                  :aria-sort="ariaSort(field)"
                  @click="onHeaderClick(field)"
                >
                  {{ field.label }}
                  <span v-if="field.sortable" class="sort-icon">{{
                    sortIcon(field)
                  }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, rowIndex) in sortedItems" :key="rowIndex">
                <td
                  v-for="field in fields"
                  :key="field.key"
                  :class="cellClass(item, field)"
                >
                  <!-- 打牌 -->
                  <template v-if="field.key === 'tile'">
                    <TileImage :tile="item.tile" />
                  </template>
                  <!-- 受入 -->
                  <template v-else-if="field.key === 'n_required_tiles'">
                    {{ item.required_tiles.length }}種
                    {{ item.n_required_tiles }}枚
                    <br v-if="item.syanten_down" />
                    {{ item.syanten_down ? "(+1向聴)" : "" }}
                  </template>
                  <!-- 有効牌 -->
                  <template v-else-if="field.key === 'required_tiles'">
                    <TileImage
                      v-for="(tile, i) in item.required_tiles"
                      :key="i"
                      :tile="tile.tile"
                    />
                  </template>
                  <template v-else>
                    {{
                      field.formatter
                        ? field.formatter(item[field.key])
                        : item[field.key]
                    }}
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- グラフ -->
      <template v-if="showGraph">
        <div class="chart">
          <div class="mb-3">
            <div
              id="input-line-type"
              class="btn-group btn-group-sm"
              role="group"
            >
              <template v-for="opt in line_options" :key="opt.value">
                <input
                  type="radio"
                  class="btn-check"
                  name="input-line-type"
                  :id="'input-line-type-' + opt.value"
                  :value="opt.value"
                  v-model="line_type"
                  autocomplete="off"
                />
                <label
                  class="btn btn-outline-secondary"
                  :for="'input-line-type-' + opt.value"
                  >{{ opt.text }}</label
                >
              </template>
            </div>
          </div>
          <div class="row mt-2">
            <div class="col">
              <LineChart :chartData="lineData" :options="lineOptions" />
            </div>
          </div>
        </div>
      </template>
      <div v-else-if="is_show_graph" class="alert alert-danger" role="alert">
        向聴数が大きすぎてグラフを作成できませんでした
      </div>
    </template>

    <!-- 失敗時 -->
    <div
      v-else-if="result && !result.success"
      class="alert alert-danger"
      role="alert"
    >
      {{ result.err_msg }}
    </div>
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
                borderColor: "darkred",
                borderDash: [2, 2],
                label: {
                  display: true,
                  position: "start",
                  content: "現在",
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

      let colors = [
        "#e351d1",
        "#00973d",
        "#646df8",
        "#f1bf4b",
        "#104db2",
        "#ef7310",
        "#d199ff",
        "#7f7400",
        "#c50057",
        "#86d7ab",
        "#a11d28",
        "#705685",
        "#6c4d23",
        "#ffadcc",
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
          borderColor: colors[i],
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
            thStyle: "width: 70px;",
          },
        ];

        if (syanten <= 3) {
          fields = fields.concat([
            {
              key: "exp_value",
              label: "期待値",
              sortable: true,
              thStyle: "width: 100px;",
              formatter: (x) => Math.floor(x) + "点",
            },
            {
              key: "win_prob",
              label: "和了率",
              sortable: true,
              thStyle: "width: 100px;",
              formatter: (x) => (x * 100).toFixed(2) + "%",
            },
            {
              key: "tenpai_prob",
              label: "聴牌率",
              sortable: true,
              thStyle: "width: 100px;",
              formatter: (x) => (x * 100).toFixed(2) + "%",
            },
          ]);
        }

        fields = fields.concat([
          {
            key: "n_required_tiles",
            label: "受入",
            sortable: true,
            thStyle: "width: 110px;",
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
            thStyle: "width: 100px;",
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
.yukohai {
  display: flex;
  flex-wrap: wrap;
}

.chart {
  max-width: 600px;
}

th.sortable {
  cursor: pointer;
  white-space: nowrap;
}

.sort-icon {
  opacity: 0.5;
  font-size: 0.8em;
}
</style>
