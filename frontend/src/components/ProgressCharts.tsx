import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

type Props = {
  trend: {
    labels: string[];
    adherence: number[];
    pain: number[];
  };
  performance: {
    labels: string[];
    rom: number[];
    form: number[];
    reps: number[];
  };
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const
    },
    title: {
      display: false
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
};

export default function ProgressCharts({ trend, performance }: Props) {
  const lineData = {
    labels: trend.labels,
    datasets: [
      {
        label: "Adherence",
        data: trend.adherence,
        borderColor: "#0ea5e9",
        backgroundColor: "rgba(14, 165, 233, 0.18)",
        fill: true,
        tension: 0.3,
        pointRadius: 4
      },
      {
        label: "Pain",
        data: trend.pain,
        borderColor: "#dc2626",
        backgroundColor: "rgba(220, 38, 38, 0.08)",
        fill: true,
        tension: 0.3,
        pointRadius: 4
      }
    ]
  };

  const barData = {
    labels: performance.labels,
    datasets: [
      {
        label: "ROM",
        data: performance.rom,
        backgroundColor: "#0f766e",
        borderRadius: 8,
        maxBarThickness: 36
      },
      {
        label: "Form",
        data: performance.form,
        backgroundColor: "#14b8a6",
        borderRadius: 8,
        maxBarThickness: 36
      },
      {
        label: "Reps",
        data: performance.reps,
        backgroundColor: "#0ea5e9",
        borderRadius: 8,
        maxBarThickness: 36
      }
    ]
  };

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <p className="label">Adherence & pain trend</p>
        <div className="chart-frame">
          <Line data={lineData} options={chartOptions} />
        </div>
      </div>
      <div className="chart-card">
        <p className="label">Session performance trend</p>
        <div className="chart-frame">
          <Bar data={barData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
