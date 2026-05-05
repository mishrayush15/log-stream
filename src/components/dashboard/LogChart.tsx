import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface LogChartProps {
  data: { time: string; errors: number; warnings: number }[];
  className?: string;
}

export default function LogChart({ data, className }: LogChartProps) {
  const chartData = useMemo<ChartData<"line">>(() => {
    const labels = data.map((d) => d.time);

    return {
      labels,
      datasets: [
        {
          label: "Errors",
          data: data.map((d) => d.errors),
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.08)",
          pointBackgroundColor: "#ef4444",
          pointBorderColor: "#1e293b",
          pointBorderWidth: 2,
          pointRadius: 3.5,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#ef4444",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          order: 1,
        },
        {
          label: "Warnings",
          data: data.map((d) => d.warnings),
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.06)",
          pointBackgroundColor: "#f59e0b",
          pointBorderColor: "#1e293b",
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5.5,
          pointHoverBackgroundColor: "#f59e0b",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          order: 2,
        },
      ],
    };
  }, [data]);

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0f172a",
          titleColor: "#94a3b8",
          titleFont: { size: 11, weight: "normal" as const },
          bodyColor: "#e2e8f0",
          bodyFont: { size: 12, weight: "bold" as const },
          borderColor: "rgba(100, 116, 139, 0.3)",
          borderWidth: 1,
          padding: { top: 8, bottom: 8, left: 12, right: 12 },
          cornerRadius: 8,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          boxPadding: 4,
          usePointStyle: true,
          callbacks: {
            title: (items) => items[0]?.label ?? "",
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(51, 65, 85, 0.25)", lineWidth: 1 },
          border: { color: "rgba(51, 65, 85, 0.4)" },
          ticks: {
            color: "#64748b",
            font: { size: 10 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10,
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(51, 65, 85, 0.2)", lineWidth: 1 },
          border: { display: false },
          ticks: {
            color: "#64748b",
            font: { size: 10 },
            padding: 8,
            precision: 0,
          },
        },
      },
      elements: {
        line: { capBezierPoints: true },
      },
      animation: {
        duration: 700,
        easing: "easeOutQuart",
      },
    }),
    [],
  );

  return (
    <div className={`rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 flex flex-col ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Issues Timeline
          <span className="text-[11px] text-slate-500 font-normal">(last 60 min)</span>
        </h3>

        {/* Legend */}
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
            Errors
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            Warnings
          </span>
        </div>
      </div>

      {/* Chart.js line chart — fills remaining space */}
      <div className="flex-1 min-h-[14rem]">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
