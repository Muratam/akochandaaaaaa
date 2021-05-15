<template>
  <b-form-group
    label-cols="1"
    content-cols="11"
    label="ドラ表示牌"
    label-align="right"
    class="kawa_indicators p-0"
  >
    <TileImage v-for="(tile, i) in dora_indicators" :key="i" :tile="tile" />
    <TileImage
      v-for="(tile, i) in 5 - dora_indicators.length"
      :key="i + 'ura'"
      :tile="-1"
      size="sm"
    />
  </b-form-group>
</template>

<script>
import TileImage from "./TileImage.vue";

export default {
  name: "DoraTiles",
  components: {
    TileImage,
  },
  props: {
    dora_indicators: {
      type: Array,
      required: true,
    },
  },
};
</script>

<style scoped>
.dora_indicators {
  display: flex;
  flex-wrap: wrap;
}
</style>
