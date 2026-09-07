import React from "react";
import { TestSettings } from "../types";
import { Settings, Sliders, Volume2, X } from "lucide-react";
import { soundManager } from "../utils/audio";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TestSettings;
  onUpdateSettings: (settings: TestSettings) => void;
  darkMode: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  darkMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className={`w-full max-w-md rounded shadow-2xl border overflow-hidden ${
          darkMode
            ? "bg-[#202020] border-[#383838] text-slate-200"
            : "bg-white border-[#c8c8c8] text-slate-800"
        }`}
      >
        {/* Header */}
        <div className="px-3.5 py-2.5 bg-[#0078D7] text-white flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span>Speed Test Settings & Preferences</span>
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
        <div className="p-4 space-y-4 text-xs">
          {/* Download Payload */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="font-semibold text-slate-300">
                Download Test Payload:
              </label>
              <span className="font-mono text-[#0078D7]">
                {settings.downloadSizeMb} MB
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[10, 25, 50, 100].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    soundManager.playClick();
                    onUpdateSettings({ ...settings, downloadSizeMb: size });
                  }}
                  className={`py-1.5 rounded border text-xs font-medium transition-colors ${
                    settings.downloadSizeMb === size
                      ? "bg-[#0078D7] border-[#0078D7] text-white"
                      : darkMode
                      ? "bg-[#282828] border-[#383838] hover:bg-[#333]"
                      : "bg-[#f5f5f5] border-[#d8d8d8] hover:bg-[#eaeaea]"
                  }`}
                >
                  {size} MB
                </button>
              ))}
            </div>
          </div>

          {/* Upload Payload */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="font-semibold text-slate-300">
                Upload Test Payload:
              </label>
              <span className="font-mono text-purple-400">
                {settings.uploadSizeMb} MB
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 20].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    soundManager.playClick();
                    onUpdateSettings({ ...settings, uploadSizeMb: size });
                  }}
                  className={`py-1.5 rounded border text-xs font-medium transition-colors ${
                    settings.uploadSizeMb === size
                      ? "bg-[#8A2BE2] border-[#8A2BE2] text-white"
                      : darkMode
                      ? "bg-[#282828] border-[#383838] hover:bg-[#333]"
                      : "bg-[#f5f5f5] border-[#d8d8d8] hover:bg-[#eaeaea]"
                  }`}
                >
                  {size} MB
                </button>
              ))}
            </div>
          </div>

          {/* Ping Samples Count */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="font-semibold text-slate-300">
                Ping Samples (Jitter Precision):
              </label>
              <span className="font-mono text-emerald-400">
                {settings.pingSamplesCount} pings
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[4, 8, 16, 24].map((count) => (
                <button
                  key={count}
                  onClick={() => {
                    soundManager.playClick();
                    onUpdateSettings({ ...settings, pingSamplesCount: count });
                  }}
                  className={`py-1.5 rounded border text-xs font-medium transition-colors ${
                    settings.pingSamplesCount === count
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : darkMode
                      ? "bg-[#282828] border-[#383838] hover:bg-[#333]"
                      : "bg-[#f5f5f5] border-[#d8d8d8] hover:bg-[#eaeaea]"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Audio toggle */}
          <div className="pt-2 border-t border-inherit flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <div>
                <span className="font-medium text-slate-200 block">
                  Sound Cues
                </span>
                <span className="text-[11px] text-slate-400">
                  Audio tones when tests start, progress, and finish
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableSound}
              onChange={(e) => {
                const next = e.target.checked;
                soundManager.enabled = next;
                if (next) soundManager.playClick();
                onUpdateSettings({ ...settings, enableSound: next });
              }}
              className="w-4 h-4 accent-[#0078D7] rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-inherit flex justify-end bg-black/5 dark:bg-white/5">
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-[#0078D7] text-white rounded text-xs font-semibold hover:bg-[#106EBE]"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
