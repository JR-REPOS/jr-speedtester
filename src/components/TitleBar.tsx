import React from "react";
import {
  Network,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Minus,
  Square,
  X,
  Laptop,
} from "lucide-react";
import { soundManager } from "../utils/audio";

interface TitleBarProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeAdapterName?: string;
  adapterCount: number;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  darkMode,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  activeAdapterName,
  adapterCount,
}) => {
  return (
    <header
      id="windows10-titlebar"
      className={`h-9 flex items-center justify-between border-b select-none transition-colors duration-150 text-xs ${
        darkMode
          ? "bg-[#1f1f1f] text-slate-200 border-[#333333]"
          : "bg-[#f3f3f3] text-slate-800 border-[#e1e1e1]"
      }`}
    >
      {/* Left: App icon, Title, Adapter Badge */}
      <div className="flex items-center gap-2 px-3">
        <div className="w-4 h-4 text-[#0078D7] flex items-center justify-center">
          <Network className="w-3.5 h-3.5" />
        </div>
        <span className="font-medium tracking-wide">Network Adapter Speed Test</span>
        <span
          className={`px-1.5 py-0.5 text-[10px] rounded border font-mono ${
            darkMode
              ? "bg-[#2d2d2d] border-[#444] text-slate-300"
              : "bg-white border-[#d1d1d1] text-slate-700"
          }`}
        >
          Win10 x64
        </span>

        {activeAdapterName && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#0078D7] ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Target: {activeAdapterName}</span>
          </span>
        )}

        {adapterCount > 1 && (
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            <Laptop className="w-3 h-3" />
            <span>{adapterCount} Adapters Available</span>
          </span>
        )}
      </div>

      {/* Right: Sound, Theme, Window Controls */}
      <div className="flex items-center h-full">
        {/* Sound toggle */}
        <button
          id="btn-toggle-sound"
          onClick={() => {
            soundManager.playClick();
            onToggleSound();
          }}
          title={soundEnabled ? "Mute audio cues" : "Unmute audio cues"}
          className={`h-full px-2.5 flex items-center justify-center transition-colors ${
            darkMode ? "hover:bg-[#333333]" : "hover:bg-[#e5e5e5]"
          }`}
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-slate-300" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>

        {/* Theme toggle */}
        <button
          id="btn-toggle-theme"
          onClick={() => {
            soundManager.playClick();
            onToggleTheme();
          }}
          title={darkMode ? "Switch to Windows Light Mode" : "Switch to Windows Dark Mode"}
          className={`h-full px-2.5 flex items-center justify-center transition-colors ${
            darkMode ? "hover:bg-[#333333]" : "hover:bg-[#e5e5e5]"
          }`}
        >
          {darkMode ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-700" />
          )}
        </button>

        {/* Windows 10 Native Window Control Buttons */}
        <button
          id="win10-btn-minimize"
          className={`h-full px-3.5 flex items-center justify-center transition-colors ${
            darkMode ? "hover:bg-[#333333]" : "hover:bg-[#e5e5e5]"
          }`}
          title="Minimize"
          onClick={() => soundManager.playClick()}
        >
          <Minus className="w-3 h-3" />
        </button>

        <button
          id="win10-btn-maximize"
          className={`h-full px-3.5 flex items-center justify-center transition-colors ${
            darkMode ? "hover:bg-[#333333]" : "hover:bg-[#e5e5e5]"
          }`}
          title="Maximize"
          onClick={() => soundManager.playClick()}
        >
          <Square className="w-2.5 h-2.5" />
        </button>

        <button
          id="win10-btn-close"
          className="h-full px-4 flex items-center justify-center hover:bg-[#e81123] hover:text-white transition-colors"
          title="Close"
          onClick={() => soundManager.playClick()}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
