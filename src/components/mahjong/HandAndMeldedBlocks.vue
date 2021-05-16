<template>
  <div>
    <div class="hand_tiles" v-if="tsumo === -1">
      <TileButton
        v-on:add-tile="remove_tile"
        v-for="(tile, i) in hand_tiles"
        :key="i"
        :tile="tile"
        size="lg"
      />
    </div>
    <div class="hand_tiles" v-if="tsumo !== -1">
      <TileButton
        v-on:add-tile="remove_tile"
        v-for="(tile, i) in hand_tiles_without_tsumo"
        :key="i"
        :tile="tile"
        size="lg"
      />
      <span style="padding: 0.5em"></span>
      <TileButton v-on:add-tile="remove_tile" :tile="tsumo" size="lg" />
    </div>
  </div>
</template>

<script>
import TileButton from "./TileButton.vue";

export default {
  name: "HandAndMeldedBlocks",
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
      default: "sm",
    },
    tsumo: {
      type: Number,
      default: -1,
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
.hand_tiles {
  display: flex;
  flex-wrap: wrap;
}
</style>
