import React, { useRef, useEffect } from "react";
import { GraphDataPoint, NetworkAdapter } from "../types";
import { Activity, ArrowDown, ArrowUp, Info } from "lucide-react";

interface TaskManagerGraphProps {
  dataPoints: GraphDataPoint[];
  adapter: NetworkAdapter;
  darkMode: boolean;
  currentDownloadMbps: number;
  currentUploadMbps: number;
}

export const TaskManagerGraph: React.FC<TaskManagerGraphProps> = ({
  dataPoints,
  adapter,
  darkMode,
  currentDownloadMbps,
  currentUploadMbps,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Maximum scale calculation (dynamic with min 10 Mbps)
  const maxRecorded = Math.max(
    ...dataPoints.map((d) => Math.max(d.downloadMbps, d.uploadMbps)),
    currentDownloadMbps,
    currentUploadMbps,
    10
  );
  // Round up to clean ceiling (e.g. 10, 25, 50, 100, 250, 500, 1000)
  let scaleMax = 10;
  if (maxRecorded > 500) scaleMax = 1000;
  else if (maxRecorded > 250) scaleMax = 500;
  else if (maxRecorded > 100) scaleMax = 250;
  else if (maxRecorded > 50) scaleMax = 100;
  else if (maxRecorded > 25) scaleMax = 50;
  else if (maxRecorded > 10) scaleMax = 25;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear background - authentic Windows 10 Task Manager dark/light grid
    ctx.fillStyle = darkMode ? "#191919" : "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Draw Gridlines (6 horizontal rows, 10 vertical columns)
    const rows = 5;
    const cols = 10;
    ctx.strokeStyle = darkMode ? "#2b2b2b" : "#ebebeb";
    ctx.lineWidth = 1;

    // Horizontal lines
    for (let i = 0; i <= rows; i++) {
      const y = (height / rows) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical lines
    for (let j = 0; j <= cols; j++) {
      const x = (width / cols) * j;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // If no data, return
    if (dataPoints.length === 0) return;

    // Prepare point coordinates
    // We display the last 60 samples or window width
    const maxSamples = 60;
    const recent = dataPoints.slice(-maxSamples);
    const stepX = width / (maxSamples - 1);

    // Function to draw a throughput line and filled gradient
    const drawSeries = (
      values: number[],
      lineColor: string,
      fillGradientColor: string
    ) => {
      if (values.length === 0) return;

      const points: { x: number; y: number }[] = values.map((val, idx) => {
        const offsetIdx = maxSamples - values.length + idx;
        const x = offsetIdx * stepX;
        const clampedVal = Math.min(val, scaleMax);
        const y = height - (clampedVal / scaleMax) * (height - 8);
        return { x, y };
      });

      // Area under curve
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, fillGradientColor);
      gradient.addColorStop(1, "transparent");

      ctx.beginPath();
      ctx.moveTo(points[0].x, height);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Stroke line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    // Receive (Download) throughput: Windows Blue #0078D7
    const downloadValues = recent.map((d) => d.downloadMbps);
    drawSeries(
      downloadValues,
      "#0078D7",
      darkMode ? "rgba(0, 120, 215, 0.25)" : "rgba(0, 120, 215, 0.12)"
    );

    // Send (Upload) throughput: Violet/Amber #9b59b6
    const uploadValues = recent.map((d) => d.uploadMbps);
    drawSeries(
      uploadValues,
      "#9b59b6",
      darkMode ? "rgba(155, 89, 182, 0.22)" : "rgba(155, 89, 182, 0.10)"
    );
  }, [dataPoints, darkMode, scaleMax, currentDownloadMbps, currentUploadMbps]);

  return (
    <div
      id="taskmanager-graph-container"
      className={`border rounded flex flex-col ${
        darkMode
          ? "bg-[#252525] border-[#383838] text-slate-200"
          : "bg-white border-[#d8d8d8] text-slate-800"
      }`}
    >
      {/* Header bar matching Windows 10 Task Manager */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-inherit gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0078D7]" />
          <span className="font-semibold text-sm">
            {adapter.name} ({adapter.type})
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {adapter.interfaceName}
          </span>
        </div>

        {/* Live Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#0078D7] rounded-sm inline-block" />
            <span className="text-slate-400 flex items-center gap-0.5">
              <ArrowDown className="w-3 h-3 text-[#0078D7]" />
              Receive:
            </span>
            <span className="font-semibold text-[#0078D7]">
              {currentDownloadMbps > 0
                ? `${currentDownloadMbps.toFixed(1)} Mbps`
                : "0 Kbps"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#9b59b6] rounded-sm inline-block" />
            <span className="text-slate-400 flex items-center gap-0.5">
              <ArrowUp className="w-3 h-3 text-[#9b59b6]" />
              Send:
            </span>
            <span className="font-semibold text-[#9b59b6]">
              {currentUploadMbps > 0
                ? `${currentUploadMbps.toFixed(1)} Mbps`
                : "0 Kbps"}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time 60s Canvas */}
      <div className="relative w-full h-44 p-1">
        {/* Scale ceiling indicator (top-right) */}
        <div className="absolute top-2 right-3 z-10 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-300">
          Max: {scaleMax} Mbps
        </div>
        <div className="absolute bottom-2 left-3 z-10 text-[10px] font-mono text-slate-400">
          60 seconds throughput
        </div>

        <canvas
          ref={canvasRef}
          className="w-full h-full rounded cursor-crosshair"
        />
      </div>

      {/* Task Manager Adapter Summary Footer */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-4 gap-2 px-3 py-2 text-xs border-t border-inherit ${
          darkMode ? "bg-[#202020]" : "bg-[#f9f9f9]"
        }`}
      >
        <div>
          <span className="block text-[11px] text-slate-400">Link Speed:</span>
          <span className="font-semibold">{adapter.linkSpeedMbps} Mbps</span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-400">IPv4 Address:</span>
          <span className="font-mono text-[11px]">{adapter.ipv4 || "Unassigned"}</span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-400">Physical (MAC):</span>
          <span className="font-mono text-[11px]">{adapter.mac}</span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-400">Connection State:</span>
          <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {adapter.status}
          </span>
        </div>
      </div>
    </div>
  );
};
