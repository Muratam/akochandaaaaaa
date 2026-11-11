<template>
  <LineChartBase :data="chartData" :options="options" />
</template>

<script>
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Line as LineChartBase } from "vue-chartjs";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

// ダークテーマ（sagisawa のポータルと同じトークン）: 文字は --ink-soft、目盛り線は --grid
ChartJS.defaults.color = "#8d9cab";
ChartJS.defaults.borderColor = "#1d2832";
ChartJS.defaults.font.family =
  'system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif';
ChartJS.defaults.plugins.tooltip.backgroundColor = "#212d38";
ChartJS.defaults.plugins.tooltip.borderColor = "#31414f";
ChartJS.defaults.plugins.tooltip.borderWidth = 1;
ChartJS.defaults.plugins.tooltip.titleColor = "#e3eaef";
ChartJS.defaults.plugins.tooltip.bodyColor = "#e3eaef";

export default {
  name: "LineChart",
  components: { LineChartBase },
  props: {
    chartData: { type: Object, required: true },
    options: { type: Object, default: () => ({}) },
  },
};
</script>
