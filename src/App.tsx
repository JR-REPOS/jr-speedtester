import React, { useState, useEffect, useRef } from "react";
import {
  NetworkAdapter,
  SpeedTestPhase,
  PingMetrics,
  SpeedMetrics,
  SpeedTestResult,
  GraphDataPoint,
  TestSettings,
} from "./types";
import {
  fetchNetworkAdapters,
  detectWebRTCInterfaces,
  runPingTest,
  runDownloadTest,
  runUploadTest,
  evaluateSpeedTest,
} from "./utils/speedEngine";
import { soundManager } from "./utils/audio";
import { TitleBar } from "./components/TitleBar";
import { SpeedGauge } from "./components/SpeedGauge";
import { TaskManagerGraph } from "./components/TaskManagerGraph";
import { AdapterList } from "./components/AdapterList";
import { AdapterComparison } from "./components/AdapterComparison";
import { PowerShellModal } from "./components/PowerShellModal";
import { SettingsModal } from "./components/SettingsModal";
import {
  Gauge,
  Layers,
  BarChart3,
  Terminal,
  Settings,
  RefreshCw,
  Play,
  Square,
  CheckCircle2,
  Gamepad2,
  Tv,
  Video,
  UploadCloud,
  ChevronRight,
  Wifi,
  Server,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function App() {
  // Theme & Sound state
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Adapters state
  const [adapters, setAdapters] = useState<NetworkAdapter[]>([]);
  const [selectedAdapterId, setSelectedAdapterId] = useState<string>("");
  const [isLoadingAdapters, setIsLoadingAdapters] = useState<boolean>(true);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    "test" | "adapters" | "comparison" | "monitor"
  >("test");

  // Speed test parameters & settings
  const [settings, setSettings] = useState<TestSettings>({
    downloadSizeMb: 25,
    uploadSizeMb: 10,
    parallelStreams: 2,
    pingSamplesCount: 8,
    enableSound: true,
  });

  // Modals state
  const [isPowerShellOpen, setIsPowerShellOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Live Test State
  const [phase, setPhase] = useState<SpeedTestPhase>("idle");
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [gaugeProgress, setGaugeProgress] = useState<number>(0);
  const [pingMetrics, setPingMetrics] = useState<PingMetrics | null>(null);
  const [downloadMetrics, setDownloadMetrics] = useState<SpeedMetrics | null>(null);
  const [uploadMetrics, setUploadMetrics] = useState<SpeedMetrics | null>(null);
  const [activeResult, setActiveResult] = useState<SpeedTestResult | null>(null);
  const [testHistory, setTestHistory] = useState<SpeedTestResult[]>([]);
  const [graphDataPoints, setGraphDataPoints] = useState<GraphDataPoint[]>([]);

  // Abort controller ref
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load adapters on initial mount
  useEffect(() => {
    loadAdapters();
  }, []);

  const loadAdapters = async () => {
    setIsLoadingAdapters(true);
    try {
      const serverAdapters = await fetchNetworkAdapters();
      // Discover client-side WebRTC candidates
      const webRtcIps = await detectWebRTCInterfaces();

      // If WebRTC found an IP matching or enriching an adapter, update it
      const enriched = serverAdapters.map((ad) => {
        if (webRtcIps.length > 0 && !ad.ipv4) {
          return { ...ad, ipv4: webRtcIps[0] };
        }
        return ad;
      });

      setAdapters(enriched);
      // Select primary or first adapter if none selected
      if (enriched.length > 0 && !selectedAdapterId) {
        const primary = enriched.find((a) => a.isPrimary) || enriched[0];
        setSelectedAdapterId(primary.id);
      }
    } catch (err) {
      console.error("Failed to load adapters", err);
    } finally {
      setIsLoadingAdapters(false);
    }
  };

  const activeAdapter =
    adapters.find((a) => a.id === selectedAdapterId) ||
    adapters[0] || {
      id: "default-adapter",
      name: "Network Adapter",
      interfaceName: "eth0",
      description: "Network Interface Controller",
      type: "Ethernet",
      status: "Connected",
      linkSpeedMbps: 1000,
      ipv4: "192.168.1.100",
      mac: "00:11:22:33:44:55",
      dhcpEnabled: true,
      isPrimary: true,
      mtu: 1500,
      bytesReceived: 0,
      bytesSent: 0,
    };

  // Add sample point to Task Manager graph
  const handleThroughputSample = (downMbps: number, upMbps: number) => {
    setGraphDataPoints((prev) => {
      const next = [
        ...prev,
        {
          timestamp: Date.now(),
          downloadMbps: downMbps,
          uploadMbps: upMbps,
        },
      ];
      // Keep up to 60 samples
      return next.slice(-60);
    });
  };

  // Start Speed Test for an adapter
  const startSpeedTest = async (targetAdapter?: NetworkAdapter) => {
    const adapterToTest = targetAdapter || activeAdapter;
    setSelectedAdapterId(adapterToTest.id);

    // Cancel any running test
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    soundManager.playStart();
    setPhase("ping");
    setCurrentSpeed(0);
    setGaugeProgress(0);
    setPingMetrics(null);
    setDownloadMetrics(null);
    setUploadMetrics(null);
    setActiveResult(null);

    try {
      // 1. PING & JITTER PHASE
      const pMetrics = await runPingTest(
        settings.pingSamplesCount,
        (progress) => {
          setPingMetrics(progress);
          setCurrentSpeed(progress.currentMs);
          setGaugeProgress((progress.samples.length / settings.pingSamplesCount) * 100);
        },
        abortCtrl.signal
      );
      setPingMetrics(pMetrics);

      // 2. DOWNLOAD THROUGHPUT PHASE
      setPhase("download");
      setCurrentSpeed(0);
      setGaugeProgress(0);

      const dMetrics = await runDownloadTest(
        settings.downloadSizeMb,
        (progress) => {
          setDownloadMetrics(progress);
          setCurrentSpeed(progress.currentMbps);
          setGaugeProgress(progress.progressPercent);
        },
        (down, up) => handleThroughputSample(down, up),
        abortCtrl.signal
      );
      setDownloadMetrics(dMetrics);

      // 3. UPLOAD THROUGHPUT PHASE
      setPhase("upload");
      setCurrentSpeed(0);
      setGaugeProgress(0);

      const uMetrics = await runUploadTest(
        settings.uploadSizeMb,
        (progress) => {
          setUploadMetrics(progress);
          setCurrentSpeed(progress.currentMbps);
          setGaugeProgress(progress.progressPercent);
        },
        (down, up) => handleThroughputSample(down, up),
        abortCtrl.signal
      );
      setUploadMetrics(uMetrics);

      // 4. FINALIZE & EVALUATE
      setPhase("complete");
      setCurrentSpeed(dMetrics.averageMbps);
      setGaugeProgress(100);
      soundManager.playComplete();

      const evaluation = evaluateSpeedTest(
        pMetrics.avgMs,
        pMetrics.jitterMs,
        dMetrics.averageMbps,
        uMetrics.averageMbps
      );

      const result: SpeedTestResult = {
        id: `test-${Date.now()}`,
        adapterId: adapterToTest.id,
        adapterName: adapterToTest.name,
        timestamp: Date.now(),
        ping: pMetrics.avgMs,
        jitter: pMetrics.jitterMs,
        downloadSpeed: dMetrics.averageMbps,
        uploadSpeed: uMetrics.averageMbps,
        downloadBytes: dMetrics.bytesTransferred,
        uploadBytes: uMetrics.bytesTransferred,
        grade: evaluation.grade,
        suitability: evaluation.suitability,
      };

      setActiveResult(result);
      setTestHistory((prev) => [result, ...prev]);

      // Update adapter's last tested info
      setAdapters((prev) =>
        prev.map((ad) =>
          ad.id === adapterToTest.id ? { ...ad, lastTested: result } : ad
        )
      );
    } catch (err: any) {
      if (err.name === "AbortError") {
        setPhase("idle");
      } else {
        console.error("Test failed:", err);
        setPhase("error");
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const cancelTest = () => {
    if (abortControllerRef.current) {
      soundManager.playClick();
      abortControllerRef.current.abort();
      setPhase("idle");
      setCurrentSpeed(0);
      setGaugeProgress(0);
    }
  };

  // Run sequential benchmark on all adapters
  const runBatchTestAll = async () => {
    for (const ad of adapters) {
      setSelectedAdapterId(ad.id);
      await startSpeedTest(ad);
      await new Promise((r) => setTimeout(r, 1000));
    }
  };

  return (
    <div
      id="windows10-app-root"
      className={`h-screen w-screen flex flex-col select-none overflow-hidden transition-colors duration-150 ${
        darkMode ? "bg-[#191919] text-slate-100" : "bg-[#f0f0f0] text-slate-900"
      }`}
    >
      {/* Windows 10 Title Bar */}
      <TitleBar
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          soundManager.enabled = next;
        }}
        activeAdapterName={activeAdapter?.name}
        adapterCount={adapters.length}
      />

      {/* Main Window Surface */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Windows 10 Navigation Sidebar */}
        <nav
          id="win10-sidebar"
          className={`w-full md:w-56 border-r flex flex-row md:flex-col justify-between shrink-0 ${
            darkMode
              ? "bg-[#202020] border-[#303030]"
              : "bg-[#e9e9e9] border-[#d4d4d4]"
          }`}
        >
          <div className="p-2 space-y-1 w-full flex md:flex-col overflow-x-auto md:overflow-visible">
            {/* Speed Test Tab */}
            <button
              id="nav-tab-speedtest"
              onClick={() => {
                soundManager.playClick();
                setActiveTab("test");
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                activeTab === "test"
                  ? "bg-[#0078D7] text-white shadow-xs"
                  : darkMode
                  ? "hover:bg-[#2b2b2b] text-slate-300"
                  : "hover:bg-[#dfdfdf] text-slate-700"
              }`}
            >
              <Gauge className="w-4 h-4 shrink-0" />
              <span>Speed Test</span>
            </button>

            {/* Network Adapters Tab ("list adapters if more than 1") */}
            <button
              id="nav-tab-adapters"
              onClick={() => {
                soundManager.playClick();
                setActiveTab("adapters");
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                activeTab === "adapters"
                  ? "bg-[#0078D7] text-white shadow-xs"
                  : darkMode
                  ? "hover:bg-[#2b2b2b] text-slate-300"
                  : "hover:bg-[#dfdfdf] text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 shrink-0" />
                <span>Adapters</span>
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  activeTab === "adapters"
                    ? "bg-white/20 text-white"
                    : "bg-[#0078D7]/15 text-[#0078D7]"
                }`}
              >
                {adapters.length}
              </span>
            </button>

            {/* Adapter Comparison Tab */}
            <button
              id="nav-tab-comparison"
              onClick={() => {
                soundManager.playClick();
                setActiveTab("comparison");
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                activeTab === "comparison"
                  ? "bg-[#0078D7] text-white shadow-xs"
                  : darkMode
                  ? "hover:bg-[#2b2b2b] text-slate-300"
                  : "hover:bg-[#dfdfdf] text-slate-700"
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Comparison</span>
            </button>

            {/* Task Manager Monitor Tab */}
            <button
              id="nav-tab-monitor"
              onClick={() => {
                soundManager.playClick();
                setActiveTab("monitor");
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                activeTab === "monitor"
                  ? "bg-[#0078D7] text-white shadow-xs"
                  : darkMode
                  ? "hover:bg-[#2b2b2b] text-slate-300"
                  : "hover:bg-[#dfdfdf] text-slate-700"
              }`}
            >
              <Server className="w-4 h-4 shrink-0" />
              <span>Task Manager</span>
            </button>
          </div>

          {/* Bottom Windows 10 Tools (PowerShell & Settings) */}
          <div className="hidden md:block p-2 border-t border-inherit space-y-1">
            <button
              id="btn-open-powershell"
              onClick={() => {
                soundManager.playClick();
                setIsPowerShellOpen(true);
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                darkMode
                  ? "hover:bg-[#2b2b2b] text-slate-300"
                  : "hover:bg-[#dfdfdf] text-slate-700"
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-[#0078D7]" />
              <span>Win10 PowerShell</span>
            </button>

            <button
              id="btn-open-settings"
              onClick={() => {
                soundManager.playClick();
                setIsSettingsOpen(true);
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                darkMode
                  ? "hover:bg-[#2b2b2b] text-slate-300"
                  : "hover:bg-[#dfdfdf] text-slate-700"
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Settings</span>
            </button>
          </div>
        </nav>

        {/* Center Main Stage */}
        <main
          id="win10-main-stage"
          className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4"
        >
          {/* TAB 1: SPEED TEST VIEW */}
          {activeTab === "test" && (
            <div className="space-y-4 max-w-5xl mx-auto">
              {/* Adapter Selector & Summary Strip */}
              <div
                className={`p-3 rounded border flex flex-wrap items-center justify-between gap-3 ${
                  darkMode
                    ? "bg-[#232323] border-[#363636]"
                    : "bg-white border-[#d8d8d8]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#0078D7]/15 flex items-center justify-center text-[#0078D7]">
                    {activeAdapter.type === "Wi-Fi" ? (
                      <Wifi className="w-4 h-4" />
                    ) : (
                      <Server className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Testing Adapter:
                      </span>
                      {/* Adapter Switcher Dropdown */}
                      <select
                        id="select-target-adapter"
                        value={selectedAdapterId}
                        onChange={(e) => {
                          soundManager.playClick();
                          setSelectedAdapterId(e.target.value);
                        }}
                        className={`text-xs font-semibold rounded px-2 py-1 border cursor-pointer ${
                          darkMode
                            ? "bg-[#1d1d1d] border-[#444] text-slate-100"
                            : "bg-white border-[#ccc] text-slate-900"
                        }`}
                      >
                        {adapters.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} - {a.description} ({a.linkSpeedMbps} Mbps)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400 flex items-center gap-3 font-mono">
                      <span>IP: {activeAdapter.ipv4 || "Waiting for DHCP"}</span>
                      <span>Link: {activeAdapter.linkSpeedMbps} Mbps</span>
                      <span>MAC: {activeAdapter.mac}</span>
                    </div>
                  </div>
                </div>

                {/* Switch to Adapter list if more than 1 */}
                {adapters.length > 1 && (
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setActiveTab("adapters");
                    }}
                    className="text-xs text-[#0078D7] hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>View all {adapters.length} adapters</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Main Speedometer & Action Bar */}
              <div
                className={`p-5 rounded border flex flex-col items-center justify-center relative ${
                  darkMode
                    ? "bg-[#252525] border-[#383838]"
                    : "bg-white border-[#d8d8d8]"
                }`}
              >
                {/* Visual Speedometer */}
                <SpeedGauge
                  phase={phase}
                  currentSpeed={currentSpeed}
                  progress={gaugeProgress}
                  pingMs={pingMetrics?.currentMs}
                  jitterMs={pingMetrics?.jitterMs}
                  darkMode={darkMode}
                />

                {/* Primary Action Button: START / CANCEL */}
                <div className="mt-2 flex items-center gap-3">
                  {phase === "idle" || phase === "complete" || phase === "error" ? (
                    <button
                      id="btn-start-speedtest"
                      onClick={() => startSpeedTest()}
                      className="px-8 py-2.5 bg-[#0078D7] hover:bg-[#106EBE] active:bg-[#005A9E] text-white rounded font-semibold text-sm shadow-md transition-all flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{phase === "complete" ? "TEST AGAIN" : "START SPEED TEST"}</span>
                    </button>
                  ) : (
                    <button
                      id="btn-cancel-speedtest"
                      onClick={cancelTest}
                      className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-sm shadow-md transition-all flex items-center gap-2"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>CANCEL TEST</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Core Metrics Cards (Ping, Jitter, Download, Upload) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Ping Card */}
                <div
                  className={`p-3.5 rounded border ${
                    darkMode
                      ? "bg-[#252525] border-[#383838]"
                      : "bg-white border-[#d8d8d8]"
                  }`}
                >
                  <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider block">
                    Latency (Ping)
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-emerald-500">
                      {pingMetrics ? pingMetrics.avgMs.toFixed(1) : "--"}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">ms</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Min: {pingMetrics ? `${pingMetrics.minMs}ms` : "--"} | Max:{" "}
                    {pingMetrics ? `${pingMetrics.maxMs}ms` : "--"}
                  </span>
                </div>

                {/* Jitter Card */}
                <div
                  className={`p-3.5 rounded border ${
                    darkMode
                      ? "bg-[#252525] border-[#383838]"
                      : "bg-white border-[#d8d8d8]"
                  }`}
                >
                  <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider block">
                    Jitter
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-emerald-400">
                      {pingMetrics ? pingMetrics.jitterMs.toFixed(1) : "--"}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">ms</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Packet variance stability
                  </span>
                </div>

                {/* Download Card */}
                <div
                  className={`p-3.5 rounded border ${
                    darkMode
                      ? "bg-[#252525] border-[#383838]"
                      : "bg-white border-[#d8d8d8]"
                  }`}
                >
                  <span className="text-[11px] uppercase font-semibold text-[#0078D7] tracking-wider block">
                    Download Speed
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-[#0078D7]">
                      {downloadMetrics ? downloadMetrics.averageMbps.toFixed(1) : "--"}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Mbps</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Peak:{" "}
                    {downloadMetrics ? `${downloadMetrics.peakMbps} Mbps` : "--"}
                  </span>
                </div>

                {/* Upload Card */}
                <div
                  className={`p-3.5 rounded border ${
                    darkMode
                      ? "bg-[#252525] border-[#383838]"
                      : "bg-white border-[#d8d8d8]"
                  }`}
                >
                  <span className="text-[11px] uppercase font-semibold text-purple-400 tracking-wider block">
                    Upload Speed
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-purple-400">
                      {uploadMetrics ? uploadMetrics.averageMbps.toFixed(1) : "--"}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Mbps</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Peak:{" "}
                    {uploadMetrics ? `${uploadMetrics.peakMbps} Mbps` : "--"}
                  </span>
                </div>
              </div>

              {/* Task Manager Real-Time Graph */}
              <TaskManagerGraph
                dataPoints={graphDataPoints}
                adapter={activeAdapter}
                darkMode={darkMode}
                currentDownloadMbps={
                  phase === "download" ? currentSpeed : downloadMetrics?.averageMbps || 0
                }
                currentUploadMbps={
                  phase === "upload" ? currentSpeed : uploadMetrics?.averageMbps || 0
                }
              />

              {/* Quality & Suitability Assessment (If complete) */}
              {activeResult && (
                <div
                  className={`p-4 rounded border ${
                    darkMode
                      ? "bg-[#252525] border-[#383838]"
                      : "bg-white border-[#d8d8d8]"
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-inherit">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <h4 className="font-semibold text-sm">
                        Connection Suitability Rating
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Performance Grade: {activeResult.grade}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    <div className="flex items-center gap-2.5 text-xs">
                      <Gamepad2 className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="font-medium block">Online Gaming</span>
                        <span className="text-slate-400 text-[11px]">
                          {activeResult.suitability.gaming}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs">
                      <Tv className="w-4 h-4 text-sky-400" />
                      <div>
                        <span className="font-medium block">4K Streaming</span>
                        <span className="text-slate-400 text-[11px]">
                          {activeResult.suitability.streaming4k}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs">
                      <Video className="w-4 h-4 text-purple-400" />
                      <div>
                        <span className="font-medium block">Video Calls</span>
                        <span className="text-slate-400 text-[11px]">
                          {activeResult.suitability.videoCalls}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs">
                      <UploadCloud className="w-4 h-4 text-indigo-400" />
                      <div>
                        <span className="font-medium block">Cloud Uploads</span>
                        <span className="text-slate-400 text-[11px]">
                          {activeResult.suitability.largeUploads}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NETWORK ADAPTERS VIEW (Core prompt requirement) */}
          {activeTab === "adapters" && (
            <div className="max-w-5xl mx-auto">
              <AdapterList
                adapters={adapters}
                activeAdapterId={selectedAdapterId}
                onSelectAdapter={(ad) => setSelectedAdapterId(ad.id)}
                onStartTest={(ad) => {
                  setActiveTab("test");
                  startSpeedTest(ad);
                }}
                onRefreshAdapters={loadAdapters}
                isTesting={phase !== "idle" && phase !== "complete" && phase !== "error"}
                darkMode={darkMode}
              />
            </div>
          )}

          {/* TAB 3: MULTI-ADAPTER COMPARISON */}
          {activeTab === "comparison" && (
            <div className="max-w-5xl mx-auto">
              <AdapterComparison
                adapters={adapters}
                results={testHistory}
                onTestAdapter={(ad) => {
                  setSelectedAdapterId(ad.id);
                  setActiveTab("test");
                  startSpeedTest(ad);
                }}
                onBatchTestAll={runBatchTestAll}
                isTesting={phase !== "idle" && phase !== "complete" && phase !== "error"}
                darkMode={darkMode}
              />
            </div>
          )}

          {/* TAB 4: TASK MANAGER MONITOR VIEW */}
          {activeTab === "monitor" && (
            <div className="max-w-5xl mx-auto space-y-4">
              <div
                className={`p-3 rounded border flex items-center justify-between gap-3 ${
                  darkMode
                    ? "bg-[#252525] border-[#383838]"
                    : "bg-white border-[#d8d8d8]"
                }`}
              >
                <div>
                  <h3 className="font-semibold text-sm">
                    Windows 10 Task Manager Network Performance
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time 60-second throughput monitor for {activeAdapter.name}.
                  </p>
                </div>

                <select
                  value={selectedAdapterId}
                  onChange={(e) => {
                    soundManager.playClick();
                    setSelectedAdapterId(e.target.value);
                  }}
                  className={`text-xs font-semibold rounded px-2.5 py-1.5 border cursor-pointer ${
                    darkMode
                      ? "bg-[#1d1d1d] border-[#444] text-slate-100"
                      : "bg-white border-[#ccc] text-slate-900"
                  }`}
                >
                  {adapters.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              <TaskManagerGraph
                dataPoints={graphDataPoints}
                adapter={activeAdapter}
                darkMode={darkMode}
                currentDownloadMbps={
                  phase === "download" ? currentSpeed : downloadMetrics?.averageMbps || 0
                }
                currentUploadMbps={
                  phase === "upload" ? currentSpeed : uploadMetrics?.averageMbps || 0
                }
              />
            </div>
          )}
        </main>
      </div>

      {/* Windows 10 Taskbar / Status bar */}
      <footer
        id="win10-statusbar"
        className={`h-6.5 px-3 border-t flex items-center justify-between text-[11px] font-mono select-none ${
          darkMode
            ? "bg-[#1c1c1c] border-[#2c2c2c] text-slate-400"
            : "bg-[#e5e5e5] border-[#d0d0d0] text-slate-600"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Adapter: {activeAdapter.name}</span>
          </span>
          <span>•</span>
          <span>Status: {activeAdapter.status}</span>
          <span>•</span>
          <span>Link: {activeAdapter.linkSpeedMbps} Mbps</span>
        </div>

        <div className="flex items-center gap-3">
          <span>Adapters: {adapters.length}</span>
          <span>•</span>
          <span>Phase: {phase.toUpperCase()}</span>
        </div>
      </footer>

      {/* Modals */}
      <PowerShellModal
        isOpen={isPowerShellOpen}
        onClose={() => setIsPowerShellOpen(false)}
        darkMode={darkMode}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        darkMode={darkMode}
      />
    </div>
  );
}
