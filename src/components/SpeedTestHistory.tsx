import React, { useState, useMemo } from "react";
import { SpeedTestResult, NetworkAdapter } from "../types";
import {
  History,
  Download,
  Upload,
  Activity,
  Calendar,
  Layers,
  Trash2,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Filter,
  ArrowUpDown,
  Wifi,
  Server,
  Shield,
  Zap,
} from "lucide-react";
import { soundManager } from "../utils/audio";

interface SpeedTestHistoryProps {
  history: SpeedTestResult[];
  adapters: NetworkAdapter[];
  onRetestAdapter: (adapterId: string) => void;
  onClearHistory: () => void;
  onDeleteRecord: (recordId: string) => void;
  darkMode: boolean;
}

export const SpeedTestHistory: React.FC<SpeedTestHistoryProps> = ({
  history,
  adapters,
  onRetestAdapter,
  onClearHistory,
  onDeleteRecord,
  darkMode,
}) => {
  const [selectedAdapterFilter, setSelectedAdapterFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"timestamp" | "downloadSpeed" | "uploadSpeed" | "ping">("timestamp");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<SpeedTestResult | null>(null);

  // Filter history
  const filteredHistory = useMemo(() => {
    let list = [...history];
    if (selectedAdapterFilter !== "all") {
      list = list.filter((r) => r.adapterId === selectedAdapterFilter || r.adapterName.toLowerCase() === selectedAdapterFilter.toLowerCase());
    }

    list.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [history, selectedAdapterFilter, sortField, sortAsc]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (history.length === 0) {
      return {
        totalTests: 0,
        avgDownload: 0,
        avgUpload: 0,
        avgPing: 0,
        peakDownload: 0,
        peakUpload: 0,
        topAdapter: "--",
      };
    }

    const totalTests = history.length;
    const avgDownload = history.reduce((sum, r) => sum + r.downloadSpeed, 0) / totalTests;
    const avgUpload = history.reduce((sum, r) => sum + r.uploadSpeed, 0) / totalTests;
    const avgPing = history.reduce((sum, r) => sum + r.ping, 0) / totalTests;
    const peakDownload = Math.max(...history.map((r) => r.downloadSpeed));
    const peakUpload = Math.max(...history.map((r) => r.uploadSpeed));

    // Most tested adapter
    const counts: Record<string, number> = {};
    history.forEach((r) => {
      counts[r.adapterName] = (counts[r.adapterName] || 0) + 1;
    });
    const topAdapter = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b), "--");

    return {
      totalTests,
      avgDownload,
      avgUpload,
      avgPing,
      peakDownload,
      peakUpload,
      topAdapter,
    };
  }, [history]);

  // Max speed for graph and relative bars
  const maxSpeedValue = useMemo(() => {
    if (history.length === 0) return 100;
    const highest = Math.max(
      ...history.map((r) => Math.max(r.downloadSpeed, r.uploadSpeed))
    );
    return Math.max(50, Math.ceil(highest * 1.15));
  }, [history]);

  // Export history to CSV file
  const exportToCSV = () => {
    soundManager.playClick();
    if (history.length === 0) return;

    const headers = [
      "Test ID",
      "Date & Time",
      "Adapter Name",
      "Adapter ID",
      "Download Speed (Mbps)",
      "Upload Speed (Mbps)",
      "Latency Ping (ms)",
      "Jitter (ms)",
      "Grade",
    ];

    const rows = history.map((r) => [
      `"${r.id}"`,
      `"${new Date(r.timestamp).toLocaleString()}"`,
      `"${r.adapterName}"`,
      `"${r.adapterId}"`,
      r.downloadSpeed.toFixed(2),
      r.uploadSpeed.toFixed(2),
      r.ping.toFixed(1),
      r.jitter.toFixed(1),
      `"${r.grade}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Windows10_SpeedTest_History_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAdapterIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("wi-fi") || lower.includes("wireless")) {
      return <Wifi className="w-3.5 h-3.5 text-sky-400" />;
    }
    if (lower.includes("vpn")) {
      return <Shield className="w-3.5 h-3.5 text-purple-400" />;
    }
    return <Server className="w-3.5 h-3.5 text-[#0078D7]" />;
  };

  // Chronological list for graph (oldest to newest left-to-right)
  const chronologicalHistory = useMemo(() => {
    return [...history].sort((a, b) => a.timestamp - b.timestamp);
  }, [history]);

  return (
    <div id="speed-test-history-view" className="space-y-4 max-w-5xl mx-auto">
      {/* Top Banner with Summary & Actions */}
      <div
        className={`p-4 rounded border flex flex-wrap items-center justify-between gap-3 ${
          darkMode
            ? "bg-[#252525] border-[#383838] text-slate-200"
            : "bg-white border-[#d8d8d8] text-slate-800"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#0078D7]/15 flex items-center justify-center text-[#0078D7]">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">
                Speed Test History & Performance Trends
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0078D7]/15 text-[#0078D7] border border-[#0078D7]/30">
                {history.length} {history.length === 1 ? "Record" : "Records"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Review saved download speed, upload speed, latency, and adapter records over time.
            </p>
          </div>
        </div>

        {/* Action Controls: Export CSV & Clear */}
        <div className="flex items-center gap-2">
          <button
            id="btn-export-history-csv"
            disabled={history.length === 0}
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border-emerald-500/30"
            title="Export all records as CSV spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-clear-history"
            disabled={history.length === 0}
            onClick={() => {
              if (window.confirm("Are you sure you want to clear all speed test history?")) {
                soundManager.playClick();
                onClearHistory();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              darkMode
                ? "bg-[#2d2d2d] hover:bg-red-950/40 text-red-400 border-[#444] hover:border-red-600/40"
                : "bg-white hover:bg-red-50 text-red-600 border-slate-300 hover:border-red-300"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Tests */}
        <div
          className={`p-3 rounded border ${
            darkMode ? "bg-[#202020] border-[#383838]" : "bg-white border-[#d8d8d8]"
          }`}
        >
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
            Total Tests Run
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-100 dark:text-white">
              {stats.totalTests}
            </span>
            <span className="text-xs text-slate-400 font-medium">sessions</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
            Most tested: {stats.topAdapter}
          </span>
        </div>

        {/* Avg Download */}
        <div
          className={`p-3 rounded border ${
            darkMode ? "bg-[#202020] border-[#383838]" : "bg-white border-[#d8d8d8]"
          }`}
        >
          <span className="text-[10px] uppercase font-semibold text-[#0078D7] tracking-wider block flex items-center gap-1">
            <Download className="w-3 h-3" />
            Avg Download
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-[#0078D7]">
              {stats.avgDownload > 0 ? stats.avgDownload.toFixed(1) : "--"}
            </span>
            <span className="text-xs text-slate-400 font-medium">Mbps</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Peak: {stats.peakDownload > 0 ? `${stats.peakDownload.toFixed(1)} Mbps` : "--"}
          </span>
        </div>

        {/* Avg Upload */}
        <div
          className={`p-3 rounded border ${
            darkMode ? "bg-[#202020] border-[#383838]" : "bg-white border-[#d8d8d8]"
          }`}
        >
          <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider block flex items-center gap-1">
            <Upload className="w-3 h-3" />
            Avg Upload
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-purple-400">
              {stats.avgUpload > 0 ? stats.avgUpload.toFixed(1) : "--"}
            </span>
            <span className="text-xs text-slate-400 font-medium">Mbps</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Peak: {stats.peakUpload > 0 ? `${stats.peakUpload.toFixed(1)} Mbps` : "--"}
          </span>
        </div>

        {/* Avg Ping */}
        <div
          className={`p-3 rounded border ${
            darkMode ? "bg-[#202020] border-[#383838]" : "bg-white border-[#d8d8d8]"
          }`}
        >
          <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider block flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Avg Latency
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {stats.avgPing > 0 ? stats.avgPing.toFixed(1) : "--"}
            </span>
            <span className="text-xs text-slate-400 font-medium">ms</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Fastest: {history.length > 0 ? `${Math.min(...history.map(r => r.ping)).toFixed(1)} ms` : "--"}
          </span>
        </div>
      </div>

      {/* Visual Timeline Performance Graph */}
      <div
        className={`p-4 rounded border ${
          darkMode ? "bg-[#202020] border-[#383838]" : "bg-white border-[#d8d8d8]"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0078D7]" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 dark:text-slate-200">
              Throughput Timeline (Download vs Upload)
            </h4>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0078D7]"></span>
              <span className="text-slate-400">Download (Mbps)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
              <span className="text-slate-400">Upload (Mbps)</span>
            </div>
          </div>
        </div>

        {chronologicalHistory.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
            <History className="w-8 h-8 opacity-30" />
            <span>No historical test results recorded yet. Run a speed test to track performance over time.</span>
          </div>
        ) : (
          <div className="relative">
            {/* SVG Trend Graph */}
            <div className="h-52 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 800 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="dl-history-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0078D7" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#0078D7" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="ul-history-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8A2BE2" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#8A2BE2" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const y = 160 - pct * 140;
                  const speedVal = (pct * maxSpeedValue).toFixed(0);
                  return (
                    <g key={i}>
                      <line
                        x1="45"
                        y1={y}
                        x2="790"
                        y2={y}
                        stroke={darkMode ? "#333333" : "#e5e5e5"}
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x="38"
                        y={y + 3}
                        textAnchor="end"
                        fontSize="9"
                        fill={darkMode ? "#777777" : "#999999"}
                        fontFamily="monospace"
                      >
                        {speedVal}
                      </text>
                    </g>
                  );
                })}

                {/* Coordinates builder */}
                {(() => {
                  const count = chronologicalHistory.length;
                  const paddingX = 55;
                  const availableWidth = 735;
                  const stepX = count > 1 ? availableWidth / (count - 1) : availableWidth / 2;

                  const pointsDown: { x: number; y: number; item: SpeedTestResult }[] = [];
                  const pointsUp: { x: number; y: number; item: SpeedTestResult }[] = [];

                  chronologicalHistory.forEach((r, idx) => {
                    const x = count === 1 ? 400 : paddingX + idx * stepX;
                    const yDown = 160 - (Math.min(r.downloadSpeed, maxSpeedValue) / maxSpeedValue) * 140;
                    const yUp = 160 - (Math.min(r.uploadSpeed, maxSpeedValue) / maxSpeedValue) * 140;
                    pointsDown.push({ x, y: yDown, item: r });
                    pointsUp.push({ x, y: yUp, item: r });
                  });

                  const dPathDown = pointsDown.reduce((acc, p, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
                  const dAreaDown = `${dPathDown} L ${pointsDown[pointsDown.length - 1].x} 160 L ${pointsDown[0].x} 160 Z`;

                  const dPathUp = pointsUp.reduce((acc, p, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
                  const dAreaUp = `${dPathUp} L ${pointsUp[pointsUp.length - 1].x} 160 L ${pointsUp[0].x} 160 Z`;

                  return (
                    <>
                      {/* Download Area & Line */}
                      <path d={dAreaDown} fill="url(#dl-history-gradient)" />
                      <path d={dPathDown} fill="none" stroke="#0078D7" strokeWidth="2.5" strokeLinecap="round" />

                      {/* Upload Area & Line */}
                      <path d={dAreaUp} fill="url(#ul-history-gradient)" />
                      <path d={dPathUp} fill="none" stroke="#8A2BE2" strokeWidth="2.5" strokeLinecap="round" />

                      {/* Data dots */}
                      {pointsDown.map((p, idx) => (
                        <g key={`d-${idx}`}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="4.5"
                            fill="#0078D7"
                            stroke={darkMode ? "#202020" : "#ffffff"}
                            strokeWidth="2"
                            className="cursor-pointer transition-transform hover:scale-150"
                            onMouseEnter={() => setHoveredPoint(p.item)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        </g>
                      ))}

                      {pointsUp.map((p, idx) => (
                        <g key={`u-${idx}`}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="4.5"
                            fill="#8A2BE2"
                            stroke={darkMode ? "#202020" : "#ffffff"}
                            strokeWidth="2"
                            className="cursor-pointer transition-transform hover:scale-150"
                            onMouseEnter={() => setHoveredPoint(p.item)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div
                className={`absolute top-2 right-4 p-2.5 rounded border shadow-lg text-xs font-mono pointer-events-none z-10 ${
                  darkMode ? "bg-[#181818] border-[#444] text-slate-200" : "bg-white border-slate-300 text-slate-800"
                }`}
              >
                <div className="font-semibold text-slate-100 dark:text-white flex items-center gap-1.5">
                  {getAdapterIcon(hoveredPoint.adapterName)}
                  <span>{hoveredPoint.adapterName}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {new Date(hoveredPoint.timestamp).toLocaleString()}
                </div>
                <div className="mt-1.5 space-y-0.5">
                  <div className="text-[#0078D7]">
                    Download: <strong>{hoveredPoint.downloadSpeed.toFixed(1)} Mbps</strong>
                  </div>
                  <div className="text-purple-400">
                    Upload: <strong>{hoveredPoint.uploadSpeed.toFixed(1)} Mbps</strong>
                  </div>
                  <div className="text-emerald-400">
                    Ping: <strong>{hoveredPoint.ping.toFixed(1)} ms</strong> (jitter: {hoveredPoint.jitter.toFixed(1)}ms)
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historical Records List / Table */}
      <div
        className={`rounded border overflow-hidden ${
          darkMode ? "bg-[#252525] border-[#383838]" : "bg-white border-[#d8d8d8]"
        }`}
      >
        {/* Table Filters & Header */}
        <div
          className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 ${
            darkMode ? "border-[#383838] bg-[#222222]" : "border-[#e0e0e0] bg-[#f9f9f9]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300 dark:text-slate-200">
              Filter by Adapter:
            </span>
            <select
              value={selectedAdapterFilter}
              onChange={(e) => {
                soundManager.playClick();
                setSelectedAdapterFilter(e.target.value);
              }}
              className={`text-xs rounded px-2.5 py-1 border cursor-pointer ${
                darkMode ? "bg-[#1c1c1c] border-[#444] text-slate-200" : "bg-white border-[#ccc] text-slate-800"
              }`}
            >
              <option value="all">All Adapters ({history.length})</option>
              {adapters.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px]">Sort by:</span>
            <button
              onClick={() => {
                soundManager.playClick();
                if (sortField === "timestamp") setSortAsc(!sortAsc);
                else {
                  setSortField("timestamp");
                  setSortAsc(false);
                }
              }}
              className={`px-2 py-0.8 rounded text-[11px] font-medium border ${
                sortField === "timestamp"
                  ? "bg-[#0078D7] text-white border-[#0078D7]"
                  : darkMode
                  ? "border-[#444] text-slate-300 hover:bg-[#333]"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Date {sortField === "timestamp" && (sortAsc ? "↑" : "↓")}
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                if (sortField === "downloadSpeed") setSortAsc(!sortAsc);
                else {
                  setSortField("downloadSpeed");
                  setSortAsc(false);
                }
              }}
              className={`px-2 py-0.8 rounded text-[11px] font-medium border ${
                sortField === "downloadSpeed"
                  ? "bg-[#0078D7] text-white border-[#0078D7]"
                  : darkMode
                  ? "border-[#444] text-slate-300 hover:bg-[#333]"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Download {sortField === "downloadSpeed" && (sortAsc ? "↑" : "↓")}
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                if (sortField === "uploadSpeed") setSortAsc(!sortAsc);
                else {
                  setSortField("uploadSpeed");
                  setSortAsc(false);
                }
              }}
              className={`px-2 py-0.8 rounded text-[11px] font-medium border ${
                sortField === "uploadSpeed"
                  ? "bg-[#0078D7] text-white border-[#0078D7]"
                  : darkMode
                  ? "border-[#444] text-slate-300 hover:bg-[#333]"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Upload {sortField === "uploadSpeed" && (sortAsc ? "↑" : "↓")}
            </button>
          </div>
        </div>

        {/* Table Content */}
        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No test records match your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  className={`border-b text-[11px] uppercase font-semibold text-slate-400 ${
                    darkMode ? "border-[#333] bg-[#222]" : "border-[#e5e5e5] bg-[#f7f7f7]"
                  }`}
                >
                  <th className="p-3 pl-4">Date & Time</th>
                  <th className="p-3">Network Adapter</th>
                  <th className="p-3">Download Speed</th>
                  <th className="p-3">Upload Speed</th>
                  <th className="p-3">Ping / Jitter</th>
                  <th className="p-3">Rating</th>
                  <th className="p-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {filteredHistory.map((item) => {
                  const testDate = new Date(item.timestamp);
                  const timeFormatted = testDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const dateFormatted = testDate.toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  // Relative percentage of peak for visual mini-bars
                  const dlBarPct = Math.min(100, Math.round((item.downloadSpeed / maxSpeedValue) * 100));
                  const ulBarPct = Math.min(100, Math.round((item.uploadSpeed / maxSpeedValue) * 100));

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        darkMode ? "hover:bg-[#2c2c2c]" : "hover:bg-[#f5f9ff]"
                      }`}
                    >
                      {/* Date & Time */}
                      <td className="p-3 pl-4">
                        <div className="font-medium text-slate-200 dark:text-slate-100">
                          {dateFormatted}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {timeFormatted}
                        </div>
                      </td>

                      {/* Adapter */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-200 dark:text-slate-100">
                          {getAdapterIcon(item.adapterName)}
                          <span>{item.adapterName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                          {item.adapterInterface || item.adapterId}
                        </div>
                      </td>

                      {/* Download */}
                      <td className="p-3">
                        <div className="flex items-baseline gap-1 font-mono">
                          <span className="font-bold text-sm text-[#0078D7]">
                            {item.downloadSpeed.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400">Mbps</span>
                        </div>
                        {/* Mini bar */}
                        <div className="w-24 h-1.5 bg-black/20 dark:bg-white/10 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-[#0078D7] rounded-full"
                            style={{ width: `${dlBarPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Upload */}
                      <td className="p-3">
                        <div className="flex items-baseline gap-1 font-mono">
                          <span className="font-bold text-sm text-purple-400">
                            {item.uploadSpeed.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400">Mbps</span>
                        </div>
                        {/* Mini bar */}
                        <div className="w-24 h-1.5 bg-black/20 dark:bg-white/10 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-purple-400 rounded-full"
                            style={{ width: `${ulBarPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Ping / Jitter */}
                      <td className="p-3 font-mono">
                        <div className="text-emerald-400 font-medium">
                          {item.ping.toFixed(1)} ms
                        </div>
                        <div className="text-[10px] text-slate-400">
                          jitter: {item.jitter.toFixed(1)} ms
                        </div>
                      </td>

                      {/* Grade */}
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.grade === "A+" || item.grade === "A"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : item.grade === "B"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {item.grade}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              soundManager.playClick();
                              onRetestAdapter(item.adapterId);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-[#0078D7] hover:bg-[#0078D7]/10 transition-colors"
                            title="Retest with this adapter"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              soundManager.playClick();
                              onDeleteRecord(item.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete this record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
