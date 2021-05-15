<template>
  <div class="kawa_indicators">
    <TileButton v-for="(tile, i) in kawa_indicators" :key="i" :tile="tile" />
    <TileImage
      v-for="(tile, i) in 17 - kawa_indicators.length"
      :key="i + 'ura'"
      :tile="-1"
      size="sm"
    />
  </div>
</template>

<script>
import TileButton from "./TileButton.vue";
import TileImage from "./TileImage.vue";

export default {
  name: "KawaTiles",
  components: {
    TileButton,
    TileImage,
  },
  props: {
    kawa_indicators: {
      type: Array,
      required: true,
    },
  },
};
</script>

<style scoped>
.kawa_indicators {
  display: flex;
  flex-wrap: wrap;
}
</style>
