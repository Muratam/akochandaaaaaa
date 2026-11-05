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

export default {
  name: "LineChart",
  components: { LineChartBase },
  props: {
    chartData: { type: Object, required: true },
    options: { type: Object, default: () => ({}) },
  },
};
</script>
