<template>
  <img
    :src="get_src()"
    :alt="alt"
    :class="['tile', ...get_classes()]"
    :style="sstyle"
    width="66"
    height="90"
    draggable="false"
  />
</template>

<script>
import { Tile2String } from "@/mahjong.js";

export default {
  name: "TileImage",
  props: {
    tile: {
      type: Number,
      required: true,
    },
    // lg = 66x90 の画像（既定。高精細の画面でもにじまない）、sm = 32x45
    size: {
      type: String,
      default: "lg",
    },
    type: {
      type: String,
      default: "upright",
    },
    sstyle: {
      type: String,
      default: "",
    },
  },
  computed: {
    alt() {
      return Tile2String.get(this.tile) ?? "";
    },
  },
  methods: {
    get_src() {
      return this.size == "sm"
        ? `./tiles/${this.tile}_small.png`
        : `./tiles/${this.tile}.png`;
    },

    get_classes() {
      if (this.type == "rotate1") return ["rotated"];
      if (this.type == "rotate2") return ["rotated2"];
      return [];
    },
  },
};
</script>

<style scoped>
.rotated {
  transform: rotate(270deg);
}
.rotated2 {
  transform: rotate(270deg) translate(100%);
}
</style>
