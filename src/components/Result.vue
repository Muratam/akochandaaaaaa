<template>
  <b-container fluid class="p-0">
    <!-- 成功時 -->
    <template v-if="result && result.success">
      <b-form-group
        label-cols="0"
        content-cols="12"
        label=""
        label-align="right"
        class="kawa_indicators p-0"
      >
        <HandAndMeldedBlocks
          :hand_tiles="hand_tiles"
          :melded_blocks="[]"
          size="lg"
        />
      </b-form-group>
      <!-- 打牌一覧 -->
      <b-row v-if="!showGraph && !is_show_graph" class="mt-2">
        <b-col>
          <b-table
            :fields="fields"
            :items="items"
            :sort-compare="sortCompare"
            :sort-by.sync="sortBy"
            :sort-desc.sync="sortDesc"
          >
            <!-- 打牌 -->
            <template #cell(tile)="data">
              <TileImage :tile="data.item.tile" />
            </template>
            <!-- 受入 -->
            <template #cell(n_required_tiles)="data">
              {{ data.item.required_tiles.length }}種
              {{ data.item.n_required_tiles }}枚
              <br v-if="data.item.syanten_down" />
              {{ data.item.syanten_down ? "(+1向聴)" : "" }}
            </template>
            <!-- 有効牌 -->
            <template #cell(required_tiles)="data">
              <TileImage
                v-for="(tile, i) in data.item.required_tiles"
                :key="i"
                :tile="tile.tile"
              />
            </template>
          </b-table>
        </b-col>
      </b-row>

      <!-- グラフ -->
      <template v-if="showGraph">
        <div class="chart">
          <b-form-group
            label-cols="0"
            label=""
            label-for="input-line-type"
            label-align="right"
          >
            <b-form-radio-group
              id="input-line-type"
              v-model="line_type"
              :options="line_options"
              button-variant="outline-secondary"
              size="sm"
              buttons
            ></b-form-radio-group>
          </b-form-group>
          <b-row class="mt-2">
            <b-col>
              <LineChart
                :chartData="lineData"
                :options="lineOptions"
              ></LineChart>
            </b-col>
          </b-row>
        </div>
      </template>
      <b-alert v-else-if="is_show_graph" show variant="danger">
        向聴数が大きすぎてグラフを作成できませんでした
      </b-alert>
    </template>

    <!-- 失敗時 -->
    <b-alert v-else-if="result && !result.success" show variant="danger"
      >{{ result.err_msg }}
    </b-alert>
  </b-container>
</template>

<script>
/*eslint-disable */
import HandAndMeldedBlocks from "@/components/mahjong/HandAndMeldedBlocks.vue";
import TileImage from "@/components/mahjong/TileImage.vue";
import { TileOrder, TilePriority, Tile2String } from "@/mahjong.js";
import LineChart from "@/components/LineChart.js";

export default {
  name: "Result",

  components: {
    HandAndMeldedBlocks,
    TileImage,
    LineChart,
  },

  data() {
    return {
      sortDesc: true,
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
    sortCompare(
      aRow,
      bRow,
      key,
      sortDesc,
      formatter,
      compareOptions,
      compareLocale
    ) {
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
        return toString(a).localeCompare(
          toString(b),
          compareLocale,
          compareOptions
        );
      }
    },
  },

  computed: {
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

      let xlabel = this.line_options.find((x) => x.value == this.line_type)
        .text;
      console.log(req.turn);
      let options = {
        annotation: {
          annotations: [
            {
              type: "line",
              id: "vLine",
              mode: "vertical",
              scaleID: "x-axis-0",
              value: req.turn,
              borderWidth: 2,
              borderColor: "darkred",
              borderDash: [2, 2],
              label: {
                enabled: true,
                position: "top",
                content: "現在",
              },
            },
          ],
        },

        tooltips: {
          callbacks: {
            title: function (tooltipItems, data) {
              return tooltipItems[0].xLabel + "巡目";
            },

            label: function (tooltipItem, data) {
              let label = data.datasets[tooltipItem.datasetIndex].label;

              let value = tooltipItem.yLabel;

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

        animation: false,

        scales: {
          xAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: "巡目",
              },
            },
          ],
          yAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: xlabel,
              },

              ticks: {
                callback: function (x) {
                  // 確率は%、期待値は点を末尾に付ける。
                  return x <= 1 ? Math.round(x * 100) + "%" : x + "点";
                },
              },
            },
          ],
        },
      };

      return options;
    },

    lineData() {
      if (!this.result || !this.result.success) return {};

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
          lineTension: 0,
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
</style>
