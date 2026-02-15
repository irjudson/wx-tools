import { ref, onUnmounted, type Ref } from 'vue';
import {
  Chart,
  type ChartConfiguration,
  registerables,
  type ChartOptions,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
Chart.register(...registerables, zoomPlugin);

export interface ChartZoomState {
  min?: number;
  max?: number;
}

export function useChart() {
  const chartInstance = ref<Chart | null>(null);
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const zoomState = ref<ChartZoomState>({});

  const initChart = (config: ChartConfiguration) => {
    if (canvasRef.value) {
      if (chartInstance.value) {
        chartInstance.value.destroy();
      }

      // Add zoom plugin configuration if not present
      if (config.options && !config.options.plugins?.zoom) {
        config.options.plugins = {
          ...config.options.plugins,
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
                modifierKey: 'ctrl',
              },
              pinch: {
                enabled: true,
              },
              mode: 'x',
            },
            pan: {
              enabled: true,
              mode: 'x',
            },
          },
        };
      }

      chartInstance.value = new Chart(canvasRef.value, config);
    }
  };

  const updateChart = (newData: any) => {
    if (chartInstance.value) {
      chartInstance.value.data = newData;
      chartInstance.value.update();
    }
  };

  const resetZoom = () => {
    if (chartInstance.value) {
      chartInstance.value.resetZoom();
      zoomState.value = {};
    }
  };

  const syncZoom = (min: number, max: number) => {
    if (chartInstance.value && chartInstance.value.options.scales?.x) {
      zoomState.value = { min, max };
      chartInstance.value.options.scales.x.min = min;
      chartInstance.value.options.scales.x.max = max;
      chartInstance.value.update('none');
    }
  };

  const getZoomState = (): ChartZoomState => {
    if (chartInstance.value && chartInstance.value.scales?.x) {
      return {
        min: chartInstance.value.scales.x.min,
        max: chartInstance.value.scales.x.max,
      };
    }
    return {};
  };

  onUnmounted(() => {
    if (chartInstance.value) {
      chartInstance.value.destroy();
      chartInstance.value = null;
    }
  });

  return {
    canvasRef,
    chartInstance,
    zoomState,
    initChart,
    updateChart,
    resetZoom,
    syncZoom,
    getZoomState,
  };
}
