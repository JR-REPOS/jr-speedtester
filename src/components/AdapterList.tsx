import React, { useState } from "react";
import { NetworkAdapter } from "../types";
import {
  Wifi,
  Radio,
  Shield,
  Layers,
  Server,
  Bluetooth,
  RefreshCw,
  Play,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { soundManager } from "../utils/audio";

interface AdapterListProps {
  adapters: NetworkAdapter[];
  activeAdapterId: string;
  onSelectAdapter: (adapter: NetworkAdapter) => void;
  onStartTest: (adapter: NetworkAdapter) => void;
  onRefreshAdapters: () => void;
  isTesting: boolean;
  darkMode: boolean;
}

export const AdapterList: React.FC<AdapterListProps> = ({
  adapters,
  activeAdapterId,
  onSelectAdapter,
  onStartTest,
  onRefreshAdapters,
  isTesting,
  darkMode,
}) => {
  const [selectedForDetails, setSelectedForDetails] = useState<NetworkAdapter | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const getAdapterIcon = (type: NetworkAdapter["type"], signalStrength?: number) => {
    switch (type) {
      case "Wi-Fi":
        return <Wifi className="w-5 h-5 text-sky-400" />;
      case "Ethernet":
        return <Server className="w-5 h-5 text-[#0078D7]" />;
      case "VPN":
        return <Shield className="w-5 h-5 text-indigo-400" />;
      case "Virtual":
        return <Layers className="w-5 h-5 text-purple-400" />;
      case "Cellular":
        return <Radio className="w-5 h-5 text-emerald-400" />;
      case "Bluetooth":
        return <Bluetooth className="w-5 h-5 text-blue-400" />;
      default:
        return <Server className="w-5 h-5 text-slate-400" />;
    }
  };

  const filteredAdapters = adapters.filter((a) => {
    if (filterType === "all") return true;
    return a.type.toLowerCase() === filterType.toLowerCase();
  });

  return (
    <div id="adapter-list-section" className="space-y-3">
      {/* Header Banner: "list adapters if more than 1" */}
      <div
        className={`p-3 rounded border flex flex-wrap items-center justify-between gap-2 ${
          darkMode
            ? "bg-[#252525] border-[#383838] text-slate-200"
            : "bg-white border-[#d8d8d8] text-slate-800"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#0078D7]/15 flex items-center justify-center text-[#0078D7]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">
                Network Adapters ({adapters.length})
              </h3>
              {adapters.length > 1 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0078D7]/15 text-[#0078D7] border border-[#0078D7]/30">
                  Multiple Detected ({adapters.length})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {adapters.length > 1
                ? "Multiple adapters detected on this device. Select an adapter to test its speed or compare performance."
                : "Single network interface detected. Test throughput and latency."}
            </p>
          </div>
        </div>

        {/* Controls: Filter & Refresh */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center bg-transparent border border-inherit rounded overflow-hidden">
            {["all", "ethernet", "wi-fi", "vpn"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  soundManager.playClick();
                  setFilterType(t);
                }}
                className={`px-2.5 py-1 text-[11px] capitalize transition-colors ${
                  filterType === t
                    ? "bg-[#0078D7] text-white font-medium"
                    : darkMode
                    ? "hover:bg-[#333] text-slate-400"
                    : "hover:bg-[#f0f0f0] text-slate-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            id="btn-refresh-adapters"
            onClick={() => {
              soundManager.playClick();
              onRefreshAdapters();
            }}
            title="Scan for network adapters"
            className={`p-1.5 rounded border border-inherit transition-colors ${
              darkMode ? "hover:bg-[#333333]" : "hover:bg-[#f3f3f3]"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Grid of Adapter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredAdapters.map((adapter) => {
          const isActive = adapter.id === activeAdapterId;
          const hasResult = !!adapter.lastTested;

          return (
            <div
              key={adapter.id}
              id={`adapter-card-${adapter.id}`}
              onClick={() => {
                soundManager.playClick();
                onSelectAdapter(adapter);
              }}
              className={`p-3.5 rounded border transition-all cursor-pointer relative flex flex-col justify-between ${
                isActive
                  ? darkMode
                    ? "bg-[#2b2b2b] border-[#0078D7] ring-1 ring-[#0078D7]/60 shadow-sm"
                    : "bg-[#f5f9ff] border-[#0078D7] ring-1 ring-[#0078D7]/50 shadow-sm"
                  : darkMode
                  ? "bg-[#252525] border-[#383838] hover:border-[#555555]"
                  : "bg-white border-[#d8d8d8] hover:border-[#b0b0b0]"
              }`}
            >
              {/* Top Row: Icon, Name, Badges */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded bg-black/10 dark:bg-white/5 border border-inherit">
                      {getAdapterIcon(adapter.type, adapter.signalStrength)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {adapter.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-500/15 text-slate-400 border border-slate-500/20">
                          {adapter.interfaceName || adapter.id}
                        </span>
                        {adapter.isPrimary && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-medium">
                            Default Gateway
                          </span>
                        )}
                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#0078D7] text-white font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Selected for Test
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {adapter.description}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-1 text-[11px] text-emerald-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-mono">{adapter.status}</span>
                  </div>
                </div>

                {/* Technical specs pills */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div
                    className={`p-1.5 rounded border text-[11px] ${
                      darkMode
                        ? "bg-[#1f1f1f] border-[#333] text-slate-300"
                        : "bg-[#f7f7f7] border-[#e8e8e8] text-slate-700"
                    }`}
                  >
                    <span className="text-slate-400 block text-[9px] uppercase font-sans">
                      Link Speed
                    </span>
                    <span className="font-semibold text-[#0078D7]">
                      {adapter.linkSpeedMbps >= 1000
                        ? `${(adapter.linkSpeedMbps / 1000).toFixed(1)} Gbps`
                        : `${adapter.linkSpeedMbps} Mbps`}
                    </span>
                  </div>

                  <div
                    className={`p-1.5 rounded border text-[11px] ${
                      darkMode
                        ? "bg-[#1f1f1f] border-[#333] text-slate-300"
                        : "bg-[#f7f7f7] border-[#e8e8e8] text-slate-700"
                    }`}
                  >
                    <span className="text-slate-400 block text-[9px] uppercase font-sans">
                      IPv4 Address
                    </span>
                    <span className="truncate block font-mono">
                      {adapter.ipv4 || "DHCP Waiting"}
                    </span>
                  </div>
                </div>

                {/* Additional adapter info */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>MAC: {adapter.mac}</span>
                  {adapter.signalStrength && (
                    <span className="text-sky-400">Signal: {adapter.signalStrength}%</span>
                  )}
                </div>

                {/* Last Tested Results Pill if available */}
                {hasResult && adapter.lastTested && (
                  <div className="mt-2.5 p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
                      <Zap className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{adapter.lastTested.downloadSpeed.toFixed(1)} Mbps Down</span>
                      <span className="text-slate-500">|</span>
                      <span>{adapter.lastTested.ping.toFixed(0)} ms Ping</span>
                    </div>
                    <span className="font-bold text-emerald-500 px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px]">
                      Grade {adapter.lastTested.grade}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="mt-3 pt-2.5 border-t border-inherit flex items-center justify-between gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soundManager.playClick();
                    setSelectedForDetails(adapter);
                  }}
                  className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                    darkMode
                      ? "hover:bg-[#333] text-slate-300"
                      : "hover:bg-[#e8e8e8] text-slate-700"
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3 text-[#0078D7]" />
                  <span>Adapter Properties</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {!isActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        soundManager.playClick();
                        onSelectAdapter(adapter);
                      }}
                      className={`text-xs px-2.5 py-1 rounded font-medium border transition-colors ${
                        darkMode
                          ? "border-[#444] hover:bg-[#333] text-slate-200"
                          : "border-slate-300 hover:bg-slate-100 text-slate-800"
                      }`}
                    >
                      Select Adapter
                    </button>
                  )}
                  <button
                    disabled={isTesting}
                    onClick={(e) => {
                      e.stopPropagation();
                      soundManager.playClick();
                      onSelectAdapter(adapter);
                      onStartTest(adapter);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#0078D7] hover:bg-[#106EBE] active:bg-[#005A9E] disabled:opacity-50 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run Speed Test</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Windows 10 Style "Adapter Properties" Dialog */}
      {selectedForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-md rounded shadow-2xl border overflow-hidden ${
              darkMode
                ? "bg-[#202020] border-[#383838] text-slate-200"
                : "bg-white border-[#c8c8c8] text-slate-800"
            }`}
          >
            {/* Modal Title bar */}
            <div className="px-3 py-2 border-b border-inherit bg-[#0078D7] text-white flex items-center justify-between text-xs font-medium">
              <span>{selectedForDetails.name} Status & Properties</span>
              <button
                onClick={() => {
                  soundManager.playClick();
                  setSelectedForDetails(null);
                }}
                className="hover:bg-red-600 px-2 py-0.5 rounded transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-black/5 dark:bg-white/5 border border-inherit">
                  {getAdapterIcon(selectedForDetails.type)}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {selectedForDetails.name}
                  </h4>
                  <p className="text-slate-400 text-xs">
                    {selectedForDetails.description}
                  </p>
                </div>
              </div>

              <div
                className={`p-3 rounded border font-mono space-y-1.5 text-xs ${
                  darkMode ? "bg-[#181818] border-[#333]" : "bg-[#f5f5f5] border-[#e0e0e0]"
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-slate-400">Adapter Type:</span>
                  <span className="font-semibold">{selectedForDetails.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Physical MAC:</span>
                  <span className="font-semibold">{selectedForDetails.mac}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Link Speed:</span>
                  <span className="font-semibold text-[#0078D7]">
                    {selectedForDetails.linkSpeedMbps} Mbps ({selectedForDetails.duplex || "Full Duplex"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IPv4 Address:</span>
                  <span className="font-semibold">{selectedForDetails.ipv4 || "None"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IPv4 Subnet:</span>
                  <span>{selectedForDetails.netmask || "255.255.255.0"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Default Gateway:</span>
                  <span>{selectedForDetails.gateway || "192.168.1.1"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">DHCP Configured:</span>
                  <span>{selectedForDetails.dhcpEnabled ? "Yes" : "Static"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">MTU:</span>
                  <span>{selectedForDetails.mtu || 1500} bytes</span>
                </div>
              </div>

              {/* Bytes transferred */}
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Received: {(selectedForDetails.bytesReceived / 1024 / 1024).toFixed(1)} MB</span>
                <span>Sent: {(selectedForDetails.bytesSent / 1024 / 1024).toFixed(1)} MB</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-inherit flex justify-end gap-2 bg-black/5 dark:bg-white/5">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setSelectedForDetails(null);
                }}
                className={`px-4 py-1 rounded border border-inherit text-xs ${
                  darkMode ? "hover:bg-[#333]" : "hover:bg-[#e8e8e8]"
                }`}
              >
                Close
              </button>
              <button
                onClick={() => {
                  soundManager.playClick();
                  onSelectAdapter(selectedForDetails);
                  onStartTest(selectedForDetails);
                  setSelectedForDetails(null);
                }}
                className="px-4 py-1 bg-[#0078D7] text-white rounded text-xs font-semibold hover:bg-[#106EBE]"
              >
                Test This Adapter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
