import React, { useState } from "react";
import { Terminal, Copy, Check, Download, ExternalLink, X } from "lucide-react";
import { soundManager } from "../utils/audio";

interface PowerShellModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  customScript?: string;
  onClearCustomScript?: () => void;
}

export const PowerShellModal: React.FC<PowerShellModalProps> = ({
  isOpen,
  onClose,
  darkMode,
  customScript,
  onClearCustomScript,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCustom, setCopiedCustom] = useState(false);

  if (!isOpen) return null;

  const oneLiner = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetAdapter | Where-Object Status -eq 'Up' | Select-Object Name, InterfaceDescription, LinkSpeed, MacAddress | Format-Table -AutoSize; Test-Connection 1.1.1.1 -Count 4"`;

  const copyCommand = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(oneLiner);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCustomScript = () => {
    if (!customScript) return;
    soundManager.playClick();
    navigator.clipboard.writeText(customScript);
    setCopiedCustom(true);
    setTimeout(() => setCopiedCustom(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className={`w-full max-w-xl rounded shadow-2xl border overflow-hidden ${
          darkMode
            ? "bg-[#202020] border-[#383838] text-slate-200"
            : "bg-white border-[#c8c8c8] text-slate-800"
        }`}
      >
        {/* Modal Header */}
        <div className="px-3.5 py-2.5 bg-[#0078D7] text-white flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <span>Windows 10 Native PowerShell Benchmark Tool</span>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="hover:bg-red-600 px-2 py-0.5 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {customScript && (
            <div className="space-y-1.5 p-3 rounded border border-[#0078D7]/40 bg-[#0078D7]/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-semibold text-xs text-sky-300">
                    Gemini AI Generated PowerShell Script:
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyCustomScript}
                    className="flex items-center gap-1 text-[11px] text-sky-300 hover:underline"
                  >
                    {copiedCustom ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Script</span>
                      </>
                    )}
                  </button>
                  {onClearCustomScript && (
                    <button
                      onClick={onClearCustomScript}
                      className="text-[10px] text-slate-400 hover:text-slate-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="p-2.5 rounded bg-black font-mono text-[11px] text-emerald-400 border border-slate-800 overflow-x-auto whitespace-pre-wrap max-h-48 select-all">
                {customScript}
              </div>
            </div>
          )}

          <p className="text-slate-400">
            For hardware-level diagnostics on Windows 10, you can run native Windows PowerShell commands using <code className="text-[#0078D7] font-mono">Get-NetAdapter</code> to benchmark and bind individual physical and virtual network adapters.
          </p>

          {/* Quick One Liner */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-300">
                1-Click Windows 10 PowerShell Command:
              </span>
              <button
                onClick={copyCommand}
                className="flex items-center gap-1 text-[11px] text-[#0078D7] hover:underline"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Command</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2.5 rounded bg-black font-mono text-[11px] text-emerald-400 border border-slate-800 overflow-x-auto select-all">
              {oneLiner}
            </div>
          </div>

          {/* PowerShell Script Download */}
          <div
            className={`p-3 rounded border flex items-center justify-between gap-3 ${
              darkMode ? "bg-[#181818] border-[#333]" : "bg-[#f5f5f5] border-[#e0e0e0]"
            }`}
          >
            <div>
              <span className="font-semibold block text-slate-200">
                Full PowerShell Benchmark Script (.ps1)
              </span>
              <span className="text-slate-400 text-[11px]">
                Iterates through each active network adapter, measures ping, and runs throughput tests.
              </span>
            </div>

            <a
              href="/api/powershell-script"
              download="Test-NetAdapterSpeed.ps1"
              onClick={() => soundManager.playClick()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0078D7] hover:bg-[#106EBE] text-white rounded font-medium text-xs shadow-xs transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .ps1</span>
            </a>
          </div>

          {/* Windows 10 Pro-Tip */}
          <div className="text-[11px] text-slate-400 space-y-1 bg-black/5 dark:bg-white/5 p-2.5 rounded border border-inherit">
            <strong className="text-slate-300 block">How to run in Windows 10:</strong>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Press <kbd className="px-1 py-0.5 rounded bg-slate-700 text-slate-200 text-[10px]">Win + X</kbd> and select <strong>Windows PowerShell</strong></li>
              <li>Paste the command above and press <kbd className="px-1 py-0.5 rounded bg-slate-700 text-slate-200 text-[10px]">Enter</kbd></li>
              <li>View throughput and interface metrics per adapter</li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 border-t border-inherit flex justify-end bg-black/5 dark:bg-white/5">
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className={`px-4 py-1.5 rounded border border-inherit text-xs ${
              darkMode ? "hover:bg-[#333]" : "hover:bg-[#e8e8e8]"
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
