import React from "react";
import { NetworkAdapter, SpeedTestResult } from "../types";
import { Trophy, CheckCircle, Zap, Shield, Wifi, Server, ArrowRight, Play } from "lucide-react";
import { soundManager } from "../utils/audio";

interface AdapterComparisonProps {
  adapters: NetworkAdapter[];
  results: SpeedTestResult[];
  onTestAdapter: (adapter: NetworkAdapter) => void;
  onBatchTestAll: () => void;
  isTesting: boolean;
  darkMode: boolean;
}

export const AdapterComparison: React.FC<AdapterComparisonProps> = ({
  adapters,
  results,
  onTestAdapter,
  onBatchTestAll,
  isTesting,
  darkMode,
}) => {
  // Find top performers
  const topDownload = [...results].sort((a, b) => b.downloadSpeed - a.downloadSpeed)[0];
  const lowestPing = [...results].sort((a, b) => a.ping - b.ping)[0];
  const topUpload = [...results].sort((a, b) => b.uploadSpeed - a.uploadSpeed)[0];

  return (
    <div className="space-y-4">
      {/* Top Banner with Summary & Batch Test trigger */}
      <div
        className={`p-4 rounded border flex flex-wrap items-center justify-between gap-3 ${
          darkMode
            ? "bg-[#252525] border-[#383838] text-slate-200"
            : "bg-white border-[#d8d8d8] text-slate-800"
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-sm">
              Multi-Adapter Performance Comparison
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Compare throughput, latency, and connection quality across all your network adapters.
          </p>
        </div>

        <button
          disabled={isTesting || adapters.length === 0}
          onClick={() => {
            soundManager.playClick();
            onBatchTestAll();
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0078D7] hover:bg-[#106EBE] active:bg-[#005A9E] disabled:opacity-50 text-white rounded text-xs font-semibold shadow-sm transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Benchmark All {adapters.length} Adapters</span>
        </button>
      </div>

      {/* Top performer highlights if results exist */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            className={`p-3 rounded border ${
              darkMode ? "bg-[#202020] border-[#383838]" : "bg-white border-[#d8d8d8]"
            }`}
          >
            <span className="text-[10px] uppercase font-semibold text-[#0078D7] tracking-wider block">
              Fastest Download
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono">
                {topDownload ? `${topDownload.downloadSpeed.toFixed(1)} Mbps` : "--"}
              </span>
              <span className="text-xs font-medium text-slate-400">
                {topDownload?.adapterName || "--"}
              </span>
            </div>
          </div>

          <div
            className={`p-3 rounded border ${
              darkMode ? "bg-[#202020] border-[#383838]" : "bg-white border-[#d8d8d8]"
            }`}
          >
            <span className="text-[10px] uppercase font-semibold text-emerald-500 tracking-wider block">
              Lowest Latency (Ping)
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono">
                {lowestPing ? `${lowestPing.ping.toFixed(1)} ms` : "--"}
              </span>
              <span className="text-xs font-medium text-slate-400">
                {lowestPing?.adapterName || "--"}
              </span>
            </div>
          </div>

          <div
            className={`p-3 rounded border ${
              darkMode ? "bg-[#202020] border-[#383838]" : "bg-white border-[#d8d8d8]"
            }`}
          >
            <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider block">
              Fastest Upload
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono">
                {topUpload ? `${topUpload.uploadSpeed.toFixed(1)} Mbps` : "--"}
              </span>
              <span className="text-xs font-medium text-slate-400">
                {topUpload?.adapterName || "--"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Matrix Table */}
      <div
        className={`rounded border overflow-hidden ${
          darkMode ? "bg-[#252525] border-[#383838]" : "bg-white border-[#d8d8d8]"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className={`border-b border-inherit font-semibold text-[11px] uppercase tracking-wider ${
                  darkMode ? "bg-[#1d1d1d] text-slate-400" : "bg-[#f5f5f5] text-slate-600"
                }`}
              >
                <th className="py-2.5 px-3">Adapter</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Link Speed</th>
                <th className="py-2.5 px-3">Ping / Jitter</th>
                <th className="py-2.5 px-3">Download</th>
                <th className="py-2.5 px-3">Upload</th>
                <th className="py-2.5 px-3">Grade</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {adapters.map((adapter) => {
                const test = results.find((r) => r.adapterId === adapter.id) || adapter.lastTested;

                return (
                  <tr
                    key={adapter.id}
                    className={`transition-colors ${
                      darkMode ? "hover:bg-[#2e2e2e]" : "hover:bg-[#f9f9f9]"
                    }`}
                  >
                    {/* Name */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{adapter.name}</span>
                        {adapter.isPrimary && (
                          <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-400">
                            Primary
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[180px]">
                        {adapter.description}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-black/10 dark:bg-white/5 border border-inherit">
                        {adapter.type}
                      </span>
                    </td>

                    {/* Link Speed */}
                    <td className="py-3 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {adapter.linkSpeedMbps} Mbps
                    </td>

                    {/* Ping / Jitter */}
                    <td className="py-3 px-3 font-mono">
                      {test ? (
                        <div>
                          <span className="font-semibold text-emerald-500">
                            {test.ping.toFixed(0)} ms
                          </span>
                          <span className="text-slate-400 text-[10px] ml-1">
                            (±{test.jitter.toFixed(1)}ms)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not tested</span>
                      )}
                    </td>

                    {/* Download */}
                    <td className="py-3 px-3 font-mono">
                      {test ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#0078D7]">
                            {test.downloadSpeed.toFixed(1)} Mbps
                          </span>
                          {topDownload?.id === test.id && (
                            <Trophy className="w-3.5 h-3.5 text-amber-400 inline" />
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">--</span>
                      )}
                    </td>

                    {/* Upload */}
                    <td className="py-3 px-3 font-mono">
                      {test ? (
                        <span className="font-bold text-purple-400">
                          {test.uploadSpeed.toFixed(1)} Mbps
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">--</span>
                      )}
                    </td>

                    {/* Grade */}
                    <td className="py-3 px-3">
                      {test ? (
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-xs ${
                            test.grade.startsWith("A")
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : test.grade === "B"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {test.grade}
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <button
                        disabled={isTesting}
                        onClick={() => {
                          soundManager.playClick();
                          onTestAdapter(adapter);
                        }}
                        className="px-2.5 py-1 bg-transparent hover:bg-[#0078D7] hover:text-white border border-[#0078D7] text-[#0078D7] rounded text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {test ? "Retest" : "Test"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
