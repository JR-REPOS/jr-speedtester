import React from "react";
import { SpeedTestPhase } from "../types";

interface SpeedGaugeProps {
  phase: SpeedTestPhase;
  currentSpeed: number; // in Mbps
  progress: number; // 0 to 100
  pingMs?: number;
  jitterMs?: number;
  darkMode: boolean;
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({
  phase,
  currentSpeed,
  progress,
  pingMs,
  jitterMs,
  darkMode,
}) => {
  // Speed gauge uses a logarithmic/adaptive mapping so 0 to 1000 Mbps looks natural
  // Scale thresholds: 0, 10, 50, 100, 250, 500, 1000
  const speedToAngle = (speed: number): number => {
    const minAngle = -135;
    const maxAngle = 135;
    const totalAngle = maxAngle - minAngle; // 270 deg

    if (speed <= 0) return minAngle;
    if (speed >= 1000) return maxAngle;

    // Log-like curve for natural human perception of network speed
    let normalized = 0;
    if (speed <= 10) {
      normalized = (speed / 10) * 0.2;
    } else if (speed <= 100) {
      normalized = 0.2 + ((speed - 10) / 90) * 0.35;
    } else if (speed <= 500) {
      normalized = 0.55 + ((speed - 100) / 400) * 0.3;
    } else {
      normalized = 0.85 + ((speed - 500) / 500) * 0.15;
    }

    return minAngle + normalized * totalAngle;
  };

  const needleAngle = speedToAngle(currentSpeed);
  const strokeColor =
    phase === "download"
      ? "#0078D7"
      : phase === "upload"
      ? "#8A2BE2"
      : phase === "ping"
      ? "#00BCF2"
      : "#107C41";

  // Arc calculation (Radius 120, center 150, 150)
  const radius = 115;
  const circumference = 2 * Math.PI * radius * (270 / 360);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const ticks = [
    { value: "0", speed: 0 },
    { value: "10", speed: 10 },
    { value: "50", speed: 50 },
    { value: "100", speed: 100 },
    { value: "250", speed: 250 },
    { value: "500", speed: 500 },
    { value: "1G", speed: 1000 },
  ];

  return (
    <div
      id="speed-gauge-container"
      className="relative flex flex-col items-center justify-center select-none py-2"
    >
      <div className="relative w-72 h-64 flex items-center justify-center">
        <svg
          className="w-full h-full overflow-visible"
          viewBox="0 0 300 280"
        >
          {/* Background Arc */}
          <path
            d="M 68.68 231.32 A 115 115 0 1 1 231.32 231.32"
            fill="none"
            stroke={darkMode ? "#333333" : "#e0e0e0"}
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Active Progress Arc */}
          <path
            d="M 68.68 231.32 A 115 115 0 1 1 231.32 231.32"
            fill="none"
            stroke={strokeColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            style={{
              strokeDashoffset: isNaN(strokeDashoffset) ? circumference : strokeDashoffset,
              transition: "stroke-dashoffset 0.15s ease-out, stroke 0.3s ease",
            }}
          />

          {/* Tick marks and labels */}
          {ticks.map((tick) => {
            const angle = speedToAngle(tick.speed);
            const rad = ((angle - 90) * Math.PI) / 180;
            const rInner = 92;
            const rOuter = 100;
            const rLabel = 78;

            const x1 = 150 + rInner * Math.cos(rad);
            const y1 = 150 + rInner * Math.sin(rad);
            const x2 = 150 + rOuter * Math.cos(rad);
            const y2 = 150 + rOuter * Math.sin(rad);
            const xLabel = 150 + rLabel * Math.cos(rad);
            const yLabel = 150 + rLabel * Math.sin(rad) + 4;

            return (
              <g key={tick.value}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={darkMode ? "#666" : "#999"}
                  strokeWidth="2"
                />
                <text
                  x={xLabel}
                  y={yLabel}
                  textAnchor="middle"
                  fill={darkMode ? "#888888" : "#666666"}
                  fontSize="10"
                  fontWeight="500"
                  fontFamily="Segoe UI, sans-serif"
                >
                  {tick.value}
                </text>
              </g>
            );
          })}

          {/* Center Needle */}
          <g
            transform={`rotate(${needleAngle}, 150, 150)`}
            style={{ transition: "transform 0.18s cubic-bezier(0.1, 0.9, 0.2, 1)" }}
          >
            <polygon
              points="146,150 154,150 151,55 149,55"
              fill={strokeColor}
              opacity="0.9"
            />
            <circle cx="150" cy="55" r="3" fill={strokeColor} />
          </g>

          {/* Center Hub */}
          <circle
            cx="150"
            cy="150"
            r="16"
            fill={darkMode ? "#252525" : "#ffffff"}
            stroke={strokeColor}
            strokeWidth="3"
          />
          <circle cx="150" cy="150" r="6" fill={strokeColor} />
        </svg>

        {/* Numeric Speed Display inside Gauge */}
        <div className="absolute bottom-4 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline gap-1">
            <span
              id="gauge-speed-val"
              className={`text-4xl font-bold tracking-tight font-mono ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              {phase === "ping" ? (
                pingMs ? pingMs.toFixed(0) : "--"
              ) : currentSpeed > 0 ? (
                currentSpeed.toFixed(currentSpeed >= 100 ? 0 : 1)
              ) : (
                "0.0"
              )}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {phase === "ping" ? "ms (ping)" : "Mbps"}
            </span>
          </div>

          {/* Phase status indicator badge */}
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: strokeColor }}
            />
            <span
              className={`text-[11px] font-medium tracking-wide uppercase ${
                darkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {phase === "idle" && "Ready to Test"}
              {phase === "ping" && "Testing Latency & Jitter..."}
              {phase === "download" && `Downloading (${progress}%)`}
              {phase === "upload" && `Uploading (${progress}%)`}
              {phase === "complete" && "Speed Test Complete"}
              {phase === "error" && "Test Interrupted"}
            </span>
          </div>

          {/* Real-time ping/jitter micro-bar */}
          {pingMs !== undefined && (
            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400 font-mono">
              <span>Ping: <strong className={darkMode ? "text-slate-200" : "text-slate-800"}>{pingMs.toFixed(1)}ms</strong></span>
              {jitterMs !== undefined && (
                <span>Jitter: <strong className={darkMode ? "text-slate-200" : "text-slate-800"}>{jitterMs.toFixed(1)}ms</strong></span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
