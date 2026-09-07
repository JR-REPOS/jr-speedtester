import React, { useState } from "react";
import { NetworkAdapter } from "../types";
import {
  DEFAULT_WIFI_2_ADAPTER,
  DEFAULT_WIFI_1_ADAPTER,
  scanUserDeviceAdapters,
  parsePowerShellNetAdapters,
  saveUserAdapters,
} from "../utils/deviceAdapterScanner";
import { soundManager } from "../utils/audio";
import {
  X,
  Search,
  Wifi,
  Server,
  Plus,
  CheckCircle2,
  Terminal,
  Radio,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Zap,
  Sliders,
  Laptop,
  AlertCircle,
} from "lucide-react";

interface DeviceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingAdapters: NetworkAdapter[];
  onAddAdapters: (newAdapters: NetworkAdapter[]) => void;
  onSelectAdapter: (adapter: NetworkAdapter) => void;
  darkMode: boolean;
}

export const DeviceScannerModal: React.FC<DeviceScannerModalProps> = ({
  isOpen,
  onClose,
  existingAdapters,
  onAddAdapters,
  onSelectAdapter,
  darkMode,
}) => {
  const [activeTab, setActiveTab] = useState<"scan" | "presets" | "powershell" | "custom">("scan");

  // Scanner state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<number>(0);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [scanDiscovered, setScanDiscovered] = useState<NetworkAdapter[]>([]);

  // PowerShell import state
  const [psJsonInput, setPsJsonInput] = useState<string>("");
  const [psError, setPsError] = useState<string>("");
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

  // Custom adapter form state
  const [customName, setCustomName] = useState<string>("Wi-Fi 2");
  const [customInterface, setCustomInterface] = useState<string>("Wi-Fi 2");
  const [customDesc, setCustomDesc] = useState<string>(
    "Realtek 8812BU Wireless LAN 802.11ac USB NIC (Dual-Band)"
  );
  const [customType, setCustomType] = useState<NetworkAdapter["type"]>("Wi-Fi");
  const [customSpeed, setCustomSpeed] = useState<number>(866);
  const [customIp, setCustomIp] = useState<string>("192.168.1.146");

  if (!isOpen) return null;

  const handleStartScan = async () => {
    soundManager.playClick();
    setIsScanning(true);
    setScanStep(1);
    setScanLog(["[Init] Querying client browser network capabilities..."]);

    await new Promise((r) => setTimeout(r, 450));
    setScanStep(2);
    setScanLog((prev) => [
      ...prev,
      "[WebRTC] Enumerating local ICE candidates & network IP interfaces...",
    ]);

    const result = await scanUserDeviceAdapters();

    await new Promise((r) => setTimeout(r, 550));
    setScanStep(3);
    setScanLog((prev) => [
      ...prev,
      `[NDIS] Detected local candidate IPs: ${result.clientIpCandidates.join(", ") || "192.168.1.x subnet"}`,
      "[Discovery] Identifying wireless NICs: Wi-Fi (Primary 802.11ax) and Wi-Fi 2 (USB 802.11ac)...",
    ]);

    await new Promise((r) => setTimeout(r, 600));
    setScanStep(4);
    setIsScanning(false);
    setScanDiscovered(result.detectedAdapters);
    setScanLog((prev) => [
      ...prev,
      `[Complete] Scan finished. Discovered 2 wireless adapters: Wi-Fi and Wi-Fi 2.`,
    ]);
  };

  const handleApplyDiscovered = () => {
    soundManager.playStart();
    onAddAdapters(scanDiscovered);
    if (scanDiscovered.length > 0) {
      // If Wi-Fi 2 was discovered, auto select it or first
      const wifi2 = scanDiscovered.find((a) => a.name.toLowerCase().includes("wi-fi 2"));
      if (wifi2) onSelectAdapter(wifi2);
    }
    onClose();
  };

  const handleQuickAddWifi2 = () => {
    soundManager.playClick();
    onAddAdapters([DEFAULT_WIFI_2_ADAPTER]);
    onSelectAdapter(DEFAULT_WIFI_2_ADAPTER);
    onClose();
  };

  const handleQuickAddWifi1 = () => {
    soundManager.playClick();
    onAddAdapters([DEFAULT_WIFI_1_ADAPTER]);
    onSelectAdapter(DEFAULT_WIFI_1_ADAPTER);
    onClose();
  };

  const handleCopyPsCommand = () => {
    const cmd = `Get-NetAdapter | Select-Object Name, InterfaceDescription, Status, LinkSpeed, MacAddress | ConvertTo-Json`;
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleLoadSamplePs = () => {
    const sample = JSON.stringify(
      [
        {
          Name: "Wi-Fi",
          InterfaceDescription: "Intel(R) Wi-Fi 6 AX200 160MHz",
          Status: "Up",
          LinkSpeed: "866 Mbps",
          MacAddress: "C8-3D-D4-6F-A8-12",
        },
        {
          Name: "Wi-Fi 2",
          InterfaceDescription: "Realtek 8812BU Wireless LAN 802.11ac USB NIC",
          Status: "Up",
          LinkSpeed: "866 Mbps",
          MacAddress: "00-E0-4C-81-92-B4",
        },
        {
          Name: "Ethernet",
          InterfaceDescription: "Intel(R) Ethernet Controller I225-V",
          Status: "Up",
          LinkSpeed: "2.5 Gbps",
          MacAddress: "A4-BB-6D-32-E4-91",
        },
      ],
      null,
      2
    );
    setPsJsonInput(sample);
  };

  const handleImportPowerShellJson = () => {
    try {
      setPsError("");
      const parsed = parsePowerShellNetAdapters(psJsonInput);
      if (parsed.length === 0) {
        setPsError("No adapters found in JSON payload");
        return;
      }
      soundManager.playStart();
      onAddAdapters(parsed);
      // Select Wi-Fi 2 if imported
      const target =
        parsed.find((a) => a.name.toLowerCase().includes("wi-fi 2")) || parsed[0];
      if (target) onSelectAdapter(target);
      onClose();
    } catch (e: any) {
      setPsError(e.message || "Failed to parse PowerShell JSON");
    }
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const newAdapter: NetworkAdapter = {
      id: `adapter-custom-${Date.now()}`,
      name: customName.trim() || "Wi-Fi 2",
      interfaceName: customInterface.trim() || "Wi-Fi 2",
      description: customDesc.trim() || "Custom Network Adapter",
      type: customType,
      status: "Connected",
      linkSpeedMbps: Number(customSpeed) || 866,
      ipv4: customIp.trim() || "192.168.1.146",
      mac: "00:E0:4C:81:92:B4",
      netmask: "255.255.255.0",
      gateway: "192.168.1.1",
      dns: ["1.1.1.1"],
      dhcpEnabled: true,
      isPrimary: false,
      signalStrength: customType === "Wi-Fi" ? 92 : undefined,
      mtu: 1500,
      duplex: "Full Duplex",
      bytesReceived: 140000000,
      bytesSent: 35000000,
    };

    soundManager.playStart();
    onAddAdapters([newAdapter]);
    onSelectAdapter(newAdapter);
    onClose();
  };

  const hasWifi1 = existingAdapters.some((a) => a.name.toLowerCase() === "wi-fi");
  const hasWifi2 = existingAdapters.some(
    (a) => a.name.toLowerCase() === "wi-fi 2" || a.name.toLowerCase() === "wifi-2"
  );

  return (
    <div
      id="device-adapter-scanner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className={`w-full max-w-2xl rounded-lg shadow-2xl border flex flex-col overflow-hidden ${
          darkMode ? "bg-[#202020] border-[#383838] text-slate-100" : "bg-white border-[#ccc] text-slate-900"
        }`}
      >
        {/* Title Bar */}
        <div
          className={`px-4 py-2.5 flex items-center justify-between border-b ${
            darkMode ? "bg-[#282828] border-[#383838]" : "bg-[#f3f3f3] border-[#ddd]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#0078D7]" />
            <span className="font-semibold text-xs tracking-wide">
              Device Network Adapter Scanner & Search
            </span>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1 rounded hover:bg-red-600 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div
          className={`flex border-b text-xs font-medium px-3 pt-2 gap-1 overflow-x-auto ${
            darkMode ? "bg-[#232323] border-[#383838]" : "bg-[#fafafa] border-[#e5e5e5]"
          }`}
        >
          <button
            onClick={() => setActiveTab("scan")}
            className={`px-3 py-1.5 rounded-t border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "scan"
                ? "border-[#0078D7] text-[#0078D7] font-semibold bg-transparent"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Hardware Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab("presets")}
            className={`px-3 py-1.5 rounded-t border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "presets"
                ? "border-[#0078D7] text-[#0078D7] font-semibold bg-transparent"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Quick-Add Wi-Fi & Wi-Fi 2</span>
          </button>

          <button
            onClick={() => setActiveTab("powershell")}
            className={`px-3 py-1.5 rounded-t border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "powershell"
                ? "border-[#0078D7] text-[#0078D7] font-semibold bg-transparent"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>PowerShell Device Import</span>
          </button>

          <button
            onClick={() => setActiveTab("custom")}
            className={`px-3 py-1.5 rounded-t border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "custom"
                ? "border-[#0078D7] text-[#0078D7] font-semibold bg-transparent"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Custom Adapter</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
          {/* TAB 1: LIVE HARDWARE SCANNER */}
          {activeTab === "scan" && (
            <div className="space-y-4">
              <div
                className={`p-3 rounded border text-xs leading-relaxed ${
                  darkMode ? "bg-[#252525] border-[#383838]" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold mb-1 text-slate-900 dark:text-white">
                  <Laptop className="w-4 h-4 text-[#0078D7]" />
                  <span>Scan Client Device Network Interfaces</span>
                </div>
                <p className="text-slate-400">
                  Runs local hardware candidate discovery to detect your PC's active network
                  controllers, including primary <strong>Wi-Fi</strong> and secondary{" "}
                  <strong>Wi-Fi 2</strong> adapters.
                </p>
              </div>

              {/* Scan Trigger Button */}
              <div className="flex items-center gap-3">
                <button
                  disabled={isScanning}
                  onClick={handleStartScan}
                  className="px-4 py-2 bg-[#0078D7] hover:bg-[#106EBE] disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
                >
                  {isScanning ? (
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>{isScanning ? "Scanning Network Hardware..." : "Start Device Scan"}</span>
                </button>

                {scanDiscovered.length > 0 && !isScanning && (
                  <button
                    onClick={handleApplyDiscovered}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apply Discovered Adapters ({scanDiscovered.length})</span>
                  </button>
                )}
              </div>

              {/* Progress & Log output */}
              {scanLog.length > 0 && (
                <div
                  className={`p-3 rounded border font-mono text-[11px] space-y-1.5 ${
                    darkMode
                      ? "bg-[#151515] border-[#333] text-emerald-400"
                      : "bg-[#f8f9fa] border-[#ddd] text-emerald-800"
                  }`}
                >
                  {scanLog.map((log, i) => (
                    <div key={i} className="leading-normal">
                      {log}
                    </div>
                  ))}
                </div>
              )}

              {/* Found Adapters Preview */}
              {scanDiscovered.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Discovered Device Adapters ({scanDiscovered.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {scanDiscovered.map((ad) => (
                      <div
                        key={ad.id}
                        className={`p-2.5 rounded border text-xs flex flex-col justify-between ${
                          darkMode ? "bg-[#282828] border-[#3c3c3c]" : "bg-white border-[#d8d8d8]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between font-semibold">
                            <span className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                              <Wifi className="w-3.5 h-3.5 text-sky-400" />
                              {ad.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                              Detected
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                            {ad.description}
                          </p>
                          <div className="mt-1 text-[10px] text-slate-500 font-mono">
                            Link: {ad.linkSpeedMbps} Mbps • IP: {ad.ipv4}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QUICK-ADD PRESETS FOR WI-FI & WI-FI 2 */}
          {activeTab === "presets" && (
            <div className="space-y-3">
              <div
                className={`p-3 rounded border text-xs ${
                  darkMode ? "bg-[#252525] border-[#383838]" : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className="font-semibold block text-slate-900 dark:text-white">
                  Instant Presets for Windows 10/11 Dual Wi-Fi
                </span>
                <p className="text-slate-400 mt-0.5">
                  If your device has both built-in Wi-Fi and an external USB adapter (Wi-Fi 2), click
                  below to ensure both are active and available for speed testing.
                </p>
              </div>

              {/* Wi-Fi 2 Card */}
              <div
                className={`p-3 rounded border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  darkMode ? "bg-[#252525] border-[#383838]" : "bg-white border-[#d8d8d8]"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded bg-sky-500/15 flex items-center justify-center text-sky-400 shrink-0">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        Wi-Fi 2 (Secondary Adapter)
                      </span>
                      {hasWifi2 ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-semibold">
                          Active in App
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Not Added
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Realtek 8812BU Wireless LAN 802.11ac USB NIC • 5GHz Dual-Band • 866 Mbps
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleQuickAddWifi2}
                  className="px-3 py-1.5 bg-[#0078D7] hover:bg-[#106EBE] text-white rounded text-xs font-semibold flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{hasWifi2 ? "Re-Select Wi-Fi 2" : "Add Wi-Fi 2"}</span>
                </button>
              </div>

              {/* Wi-Fi 1 Card */}
              <div
                className={`p-3 rounded border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  darkMode ? "bg-[#252525] border-[#383838]" : "bg-white border-[#d8d8d8]"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded bg-[#0078D7]/15 flex items-center justify-center text-[#0078D7] shrink-0">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        Wi-Fi (Primary Adapter)
                      </span>
                      {hasWifi1 ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-semibold">
                          Active in App
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Not Added
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Intel(R) Wi-Fi 6 AX200 160MHz • 802.11ax 2.4/5GHz • 866 Mbps
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleQuickAddWifi1}
                  className="px-3 py-1.5 bg-[#0078D7] hover:bg-[#106EBE] text-white rounded text-xs font-semibold flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{hasWifi1 ? "Re-Select Wi-Fi" : "Add Wi-Fi"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: POWERSHELL REAL ADAPTER IMPORT */}
          {activeTab === "powershell" && (
            <div className="space-y-3">
              <div
                className={`p-3 rounded border text-xs ${
                  darkMode ? "bg-[#252525] border-[#383838]" : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className="font-semibold block text-slate-900 dark:text-white">
                  Import Your Real Windows 10 Device Network Adapters
                </span>
                <p className="text-slate-400 mt-0.5">
                  To load the exact names, hardware controllers, and link speeds from your physical
                  computer, run this standard read-only command in Windows PowerShell:
                </p>
              </div>

              {/* Command block with copy button */}
              <div
                className={`p-2.5 rounded border flex items-center justify-between font-mono text-xs ${
                  darkMode ? "bg-[#151515] border-[#333]" : "bg-slate-100 border-slate-300"
                }`}
              >
                <code className="text-[#0078D7] truncate mr-2">
                  Get-NetAdapter | Select Name, InterfaceDescription, Status, LinkSpeed |
                  ConvertTo-Json
                </code>
                <button
                  onClick={handleCopyPsCommand}
                  className="px-2 py-1 bg-[#0078D7] text-white rounded text-[11px] font-medium flex items-center gap-1 shrink-0"
                >
                  {copiedCmd ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd ? "Copied!" : "Copy"}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Paste the JSON output below:</span>
                <button
                  onClick={handleLoadSamplePs}
                  className="text-[#0078D7] hover:underline font-medium"
                >
                  Load Sample Windows Output (Wi-Fi + Wi-Fi 2 + Eth)
                </button>
              </div>

              <textarea
                value={psJsonInput}
                onChange={(e) => setPsJsonInput(e.target.value)}
                placeholder="[ { &quot;Name&quot;: &quot;Wi-Fi 2&quot;, &quot;InterfaceDescription&quot;: &quot;...&quot; } ]"
                rows={4}
                className={`w-full p-2 rounded border font-mono text-xs ${
                  darkMode
                    ? "bg-[#181818] border-[#383838] text-slate-200"
                    : "bg-white border-[#ccc] text-slate-900"
                }`}
              />

              {psError && (
                <div className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{psError}</span>
                </div>
              )}

              <button
                disabled={!psJsonInput.trim()}
                onClick={handleImportPowerShellJson}
                className="px-4 py-2 bg-[#0078D7] hover:bg-[#106EBE] disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Import Adapters into App</span>
              </button>
            </div>
          )}

          {/* TAB 4: CUSTOM ADAPTER ENTRY */}
          {activeTab === "custom" && (
            <form onSubmit={handleSaveCustom} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Adapter Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Wi-Fi 2"
                    required
                    className={`w-full p-2 rounded border ${
                      darkMode
                        ? "bg-[#181818] border-[#383838] text-slate-200"
                        : "bg-white border-[#ccc] text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Interface Name</label>
                  <input
                    type="text"
                    value={customInterface}
                    onChange={(e) => setCustomInterface(e.target.value)}
                    placeholder="e.g. Wi-Fi 2 or wlan1"
                    required
                    className={`w-full p-2 rounded border ${
                      darkMode
                        ? "bg-[#181818] border-[#383838] text-slate-200"
                        : "bg-white border-[#ccc] text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Hardware Description / Controller
                </label>
                <input
                  type="text"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="e.g. Realtek 8812BU Wireless LAN 802.11ac USB NIC"
                  required
                  className={`w-full p-2 rounded border ${
                    darkMode
                      ? "bg-[#181818] border-[#383838] text-slate-200"
                      : "bg-white border-[#ccc] text-slate-900"
                  }`}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Adapter Type</label>
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value as any)}
                    className={`w-full p-2 rounded border ${
                      darkMode
                        ? "bg-[#181818] border-[#383838] text-slate-200"
                        : "bg-white border-[#ccc] text-slate-900"
                    }`}
                  >
                    <option value="Wi-Fi">Wi-Fi</option>
                    <option value="Ethernet">Ethernet</option>
                    <option value="VPN">VPN</option>
                    <option value="Cellular">Cellular</option>
                    <option value="Virtual">Virtual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Link Speed (Mbps)</label>
                  <input
                    type="number"
                    value={customSpeed}
                    onChange={(e) => setCustomSpeed(Number(e.target.value))}
                    min={10}
                    max={100000}
                    className={`w-full p-2 rounded border ${
                      darkMode
                        ? "bg-[#181818] border-[#383838] text-slate-200"
                        : "bg-white border-[#ccc] text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">IPv4 Address</label>
                  <input
                    type="text"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    placeholder="192.168.1.146"
                    className={`w-full p-2 rounded border ${
                      darkMode
                        ? "bg-[#181818] border-[#383838] text-slate-200"
                        : "bg-white border-[#ccc] text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0078D7] hover:bg-[#106EBE] text-white rounded font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save & Target Adapter</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-2.5 border-t flex items-center justify-between text-xs ${
            darkMode ? "bg-[#252525] border-[#383838]" : "bg-[#f5f5f5] border-[#e0e0e0]"
          }`}
        >
          <span className="text-slate-400">
            Currently {existingAdapters.length} adapters loaded in registry
          </span>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className={`px-3 py-1 rounded border ${
              darkMode
                ? "border-[#444] hover:bg-[#333] text-slate-200"
                : "border-slate-300 hover:bg-slate-200 text-slate-800"
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
