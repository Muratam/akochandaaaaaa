<template>
  <div>
    <table class="table">
      <tbody>
        <!-- 萬子 -->
        <tr>
          <th class="text-center align-middle text-nowrap">萬子</th>
          <td class="melded_blocks">
            <BlockButton
              v-on:add-block="add_block"
              v-for="tile in ManzuTiles"
              :key="tile"
              :block="create_ankantu(tile)"
              :disabled="is_disabled(create_ankantu(tile))"
            />
          </td>
        </tr>
        <!-- 筒子 -->
        <tr>
          <th class="text-center align-middle text-nowrap">筒子</th>
          <td class="melded_blocks">
            <BlockButton
              v-on:add-block="add_block"
              v-for="tile in PinzuTiles"
              :key="tile"
              :block="create_ankantu(tile)"
              :disabled="is_disabled(create_ankantu(tile))"
            />
          </td>
        </tr>
        <!-- 索子 -->
        <tr>
          <th class="text-center align-middle text-nowrap">索子</th>
          <td class="melded_blocks">
            <BlockButton
              v-on:add-block="add_block"
              v-for="tile in SozuTiles"
              :key="tile"
              :block="create_ankantu(tile)"
              :disabled="is_disabled(create_ankantu(tile))"
            />
          </td>
        </tr>
        <!-- 字牌 -->
        <tr>
          <th class="text-center align-middle text-nowrap">字牌</th>
          <td class="melded_blocks">
            <BlockButton
              v-on:add-block="add_block"
              v-for="tile in ZihaiTiles"
              :key="tile"
              :block="create_ankantu(tile)"
              :disabled="is_disabled(create_ankantu(tile))"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import {
  Tile,
  ManzuTiles,
  PinzuTiles,
  SozuTiles,
  ZihaiTiles,
  MeldType
} from "@/mahjong.js";

import BlockButton from "./BlockButton.vue";

export default {
  name: "AnkantuInput",
  emits: ["add-block"],
  components: {
    BlockButton
  },
  props: {
    tile_counts: {
      type: Array,
      required: true
    },
    n_hand_tiles: {
      type: Number,
      required: true
    }
  },
  data: function() {
    return {
      Tile: Tile,
      ManzuTiles: ManzuTiles,
      PinzuTiles: PinzuTiles,
      SozuTiles: SozuTiles,
      ZihaiTiles: ZihaiTiles
    };
  },
  methods: {
    create_ankantu(tile) {
      let tiles = Array(4).fill(tile);

      return {
        type: MeldType.Ankan,
        tiles: tiles,
        discarded_tile: tiles[0] /* 1個目の牌を鳴いた */,
        from: 3 /* 上家 */
      };
    },

    add_block(block) {
      this.$emit("add-block", block);
    },

    is_disabled(block) {
      return this.n_hand_tiles >= 12 || this.tile_counts[block.tiles[3]] != 4;
    }
  }
};
</script>

<style scoped>
.melded_blocks {
  display: flex;
  flex-wrap: wrap;
}

.melded_blocks > * {
  margin: 5px;
}
</style>
