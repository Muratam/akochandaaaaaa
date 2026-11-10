<template>
  <!-- 手牌（ツモ牌は少し離して右端）。幅に合わせて牌の大きさが決まる -->
  <div class="hand" :class="{ 'has-tsumo': tsumo !== -1 }">
    <TileButton
      v-for="(tile, i) in tsumo === -1 ? hand_tiles : hand_tiles_without_tsumo"
      :key="i"
      :tile="tile"
      :disabled="disabled"
      @add-tile="remove_tile"
    />
    <TileButton
      v-if="tsumo !== -1"
      class="hand-tsumo"
      :tile="tsumo"
      :disabled="disabled"
      @add-tile="remove_tile"
    />
  </div>
</template>

<script>
import TileButton from "./TileButton.vue";

export default {
  name: "HandAndMeldedBlocks",
  emits: ["remove-tile", "remove-block"],
  components: {
    TileButton,
  },
  computed: {
    hand_tiles_without_tsumo() {
      let result = [];
      let removed = false;
      for (let tile of this.hand_tiles) {
        if (!removed && tile === this.tsumo) {
          removed = true;
        } else {
          result.push(tile);
        }
      }
      return result;
    },
  },
  props: {
    hand_tiles: {
      type: Array,
      required: true,
    },
    melded_blocks: {
      type: Array,
      required: true,
    },
    size: {
      type: String,
      default: "lg",
    },
    tsumo: {
      type: Number,
      default: -1,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    remove_tile(tile) {
      this.$emit("remove-tile", tile);
    },

    remove_block(block) {
      this.$emit("remove-block", block);
    },
  },
};
</script>

<style scoped>
/* 14 枚が 1 列に収まるよう、列の幅は画面の幅で割る（最大 --hand-max） */
.hand {
  display: grid;
  grid-template-columns: repeat(14, minmax(0, var(--hand-max, 48px)));
  justify-content: center;
  column-gap: 1px;
}
.hand.has-tsumo {
  grid-template-columns: repeat(13, minmax(0, var(--hand-max, 48px))) minmax(4px, 10px) minmax(0, var(--hand-max, 48px));
}
.hand-tsumo {
  grid-column: 15;
}
</style>
