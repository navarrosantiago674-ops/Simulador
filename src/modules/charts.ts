import Chart, { ChartConfiguration } from 'chart.js/auto';

export class ChartManager {
  private costChart: Chart | null = null;
  private parabolaChart: Chart | null = null;
  private costCanvas: HTMLCanvasElement;
  private parabolaCanvas: HTMLCanvasElement;

  constructor(costCanvas: HTMLCanvasElement, parabolaCanvas: HTMLCanvasElement) {
    this.costCanvas = costCanvas;
    this.parabolaCanvas = parabolaCanvas;
    this.initCharts();
  }

  private baseOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: {
          labels: { color: '#a0a8b8', font: { size: 11 } },
        },
        tooltip: {
          backgroundColor: 'rgba(26,29,35,0.95)',
          titleColor: '#e0e4ec',
          bodyColor: '#a0a8b8',
          borderColor: '#3a3f4b',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(58,63,75,0.5)' },
          ticks: { color: '#6a7080', font: { size: 10 } },
        },
        y: {
          grid: { color: 'rgba(58,63,75,0.5)' },
          ticks: { color: '#6a7080', font: { size: 10 } },
        },
      },
    };
  }

  private formatCOPLabel(v: number): string {
    return '$' + Math.round(v).toLocaleString('es-CO') + ' COP';
  }

  private initCharts() {
    // Cost vs Area chart (linear)
    const costConfig: ChartConfiguration = {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Recta de costo',
            data: [],
            showLine: true,
            borderColor: '#4a90d9',
            backgroundColor: 'rgba(74,144,217,0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0,
          },
          {
            label: 'Diseño actual',
            data: [],
            backgroundColor: '#ffcc44',
            borderColor: '#ffcc44',
            pointRadius: 7,
            pointHoverRadius: 9,
            showLine: false,
          },
        ],
      },
      options: {
        ...this.baseOptions(),
        plugins: {
          ...this.baseOptions().plugins,
          tooltip: {
            ...this.baseOptions().plugins.tooltip,
            callbacks: {
              label: (ctx: any) => this.formatCOPLabel(ctx.parsed.y),
            },
          },
        },
        scales: {
          x: {
            ...this.baseOptions().scales.x,
            title: { display: true, text: 'Área (m²)', color: '#a0a8b8' },
          },
          y: {
            ...this.baseOptions().scales.y,
            title: { display: true, text: 'Costo (COP)', color: '#a0a8b8' },
            ticks: {
              ...this.baseOptions().scales.y.ticks,
              callback: (v: any) => '$' + Math.round(v).toLocaleString('es-CO'),
            },
          },
        },
      },
    };
    this.costChart = new Chart(this.costCanvas, costConfig);

    // Parabola chart (quadratic)
    const parabolaConfig: ChartConfiguration = {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Parábola A(x)',
            data: [],
            showLine: true,
            borderColor: '#5cb85c',
            backgroundColor: 'rgba(92,184,92,0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
          },
          {
            label: 'Vértice (óptimo)',
            data: [],
            backgroundColor: '#ffcc44',
            borderColor: '#ffcc44',
            pointRadius: 8,
            pointStyle: 'star',
            showLine: false,
          },
          {
            label: 'Ancho actual',
            data: [],
            backgroundColor: '#e67e22',
            borderColor: '#e67e22',
            pointRadius: 7,
            showLine: false,
          },
        ],
      },
      options: {
        ...this.baseOptions(),
        scales: {
          x: {
            ...this.baseOptions().scales.x,
            title: { display: true, text: 'Ancho (m)', color: '#a0a8b8' },
          },
          y: {
            ...this.baseOptions().scales.y,
            title: { display: true, text: 'Área (m²)', color: '#a0a8b8' },
          },
        },
      },
    };
    this.parabolaChart = new Chart(this.parabolaCanvas, parabolaConfig);
  }

  updateCostChart(
    linePoints: { x: number; y: number }[],
    currentArea: number,
    currentCost: number
  ) {
    if (!this.costChart) return;
    this.costChart.data.datasets[0].data = linePoints as any;
    this.costChart.data.datasets[1].data = [{ x: currentArea, y: currentCost }] as any;
    this.costChart.update('none');
  }

  updateParabolaChart(
    parabolaPoints: { x: number; y: number }[],
    vertex: { x: number; y: number },
    currentPoint: { x: number; y: number }
  ) {
    if (!this.parabolaChart) return;
    this.parabolaChart.data.datasets[0].data = parabolaPoints as any;
    this.parabolaChart.data.datasets[1].data = [vertex] as any;
    this.parabolaChart.data.datasets[2].data = [currentPoint] as any;
    this.parabolaChart.update('none');
  }

  dispose() {
    this.costChart?.destroy();
    this.parabolaChart?.destroy();
  }
}
