<template>
  <b-form-group
    label-cols="1"
    content-cols="11"
    :label="label_name"
    label-align="right"
    class="kawa_indicators p-0"
  >
    <TileImage v-for="(tile, i) in kawa_indicators" :key="i" :tile="tile" />
    <TileImage
      v-for="(tile, i) in 17 - kawa_indicators.length"
      :key="i + 'ura'"
      :tile="-1"
      size="sm"
    />
  </b-form-group>
</template>

<script>
import TileImage from "./TileImage.vue";

export default {
  name: "KawaTiles",
  components: {
    TileImage,
  },
  props: {
    kawa_indicators: {
      type: Array,
      required: true,
    },
    label_name: {
      type: String,
      required: true,
    },
  },
};
</script>

<style scoped>
.kawa_indicators {
  flex-wrap: wrap;
}
</style>
