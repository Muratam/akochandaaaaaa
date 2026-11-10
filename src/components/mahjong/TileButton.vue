<template>
  <button
    type="button"
    class="tile-btn"
    :disabled="disabled"
    :aria-label="label"
    @click="$emit('add-tile', tile)"
  >
    <TileImage :tile="tile" :size="size" />
  </button>
</template>

<script>
import TileImage from "./TileImage.vue";
import { Tile2String } from "@/mahjong.js";

export default {
  name: "TileButton",
  emits: ["add-tile"],
  components: { TileImage },
  props: {
    tile: {
      type: Number,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: "lg",
    },
  },
  computed: {
    label() {
      return `${Tile2String.get(this.tile)}を捨てる`;
    },
  },
};
</script>

<style scoped>
/* 押せる範囲は牌の上下にも広げる（指で押しやすく） */
.tile-btn {
  display: block;
  width: 100%;
  padding: 6px 0 4px;
  margin: 0;
  background: none;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.tile-btn :deep(.tile) {
  width: 100%;
  transition: transform 0.12s ease-out, filter 0.12s;
}
@media (hover: hover) {
  .tile-btn:hover:not(:disabled) :deep(.tile) {
    transform: translateY(-5px);
    filter: drop-shadow(0 4px 0 var(--accent));
  }
}
.tile-btn:active:not(:disabled) :deep(.tile) {
  transform: translateY(-5px);
  filter: drop-shadow(0 4px 0 var(--accent));
}
.tile-btn:focus-visible {
  outline-offset: 0;
}
.tile-btn:disabled {
  cursor: default;
}
.tile-btn:disabled :deep(.tile) {
  filter: brightness(0.7);
}
</style>
