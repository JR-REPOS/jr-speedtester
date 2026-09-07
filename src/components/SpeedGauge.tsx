import React, { useEffect, useState, useRef } from "react";
import { SpeedTestPhase } from "../types";
import { motion, AnimatePresence } from "motion/react";

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
  // Smooth animated digital readout state
  const [animatedDisplaySpeed, setAnimatedDisplaySpeed] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Smoothly interpolate the digital display speed to the latest currentSpeed
  useEffect(() => {
    let current = animatedDisplaySpeed;
    const target = Math.max(0, currentSpeed);

    const step = () => {
      const diff = target - current;
      if (Math.abs(diff) < 0.1) {
        setAnimatedDisplaySpeed(target);
        return;
      }
      // Fluid spring-like ease factor
      current += diff * 0.22;
      setAnimatedDisplaySpeed(current);
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [currentSpeed]);

  // Speed gauge uses a logarithmic/adaptive mapping so 0 to 1000 Mbps looks natural
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
      : phase === "complete"
      ? "#107C41"
      : "#64748b";

  // Arc calculation (Radius 115, center 150, 150)
  const radius = 115;
  const circumference = 2 * Math.PI * radius * (270 / 360);
  const strokeDashoffset = Math.max(
    0,
    circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference
  );

  const ticks = [
    { value: "0", speed: 0 },
    { value: "10", speed: 10 },
    { value: "50", speed: 50 },
    { value: "100", speed: 100 },
    { value: "250", speed: 250 },
    { value: "500", speed: 500 },
    { value: "1G", speed: 1000 },
  ];

  const formattedSpeed =
    phase === "ping"
      ? pingMs !== undefined
        ? pingMs.toFixed(0)
        : "--"
      : animatedDisplaySpeed > 0
      ? animatedDisplaySpeed >= 100
        ? animatedDisplaySpeed.toFixed(0)
        : animatedDisplaySpeed.toFixed(1)
      : "0.0";

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
          <defs>
            <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="3"
                floodColor={strokeColor}
                floodOpacity="0.25"
              />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 68.68 231.32 A 115 115 0 1 1 231.32 231.32"
            fill="none"
            stroke={darkMode ? "#303030" : "#e4e4e4"}
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Active Progress Arc with Framer-Motion transition */}
          <motion.path
            d="M 68.68 231.32 A 115 115 0 1 1 231.32 231.32"
            fill="none"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            animate={{
              strokeDashoffset: isNaN(strokeDashoffset) ? circumference : strokeDashoffset,
              stroke: strokeColor,
            }}
            transition={{
              strokeDashoffset: { duration: 0.25, ease: "easeOut" },
              stroke: { duration: 0.35, ease: "easeInOut" },
            }}
            filter="url(#gauge-glow)"
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
                  stroke={darkMode ? "#555" : "#aaa"}
                  strokeWidth="2"
                />
                <text
                  x={xLabel}
                  y={yLabel}
                  textAnchor="middle"
                  fill={darkMode ? "#888888" : "#666666"}
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="Segoe UI, sans-serif"
                >
                  {tick.value}
                </text>
              </g>
            );
          })}

          {/* Smoothly Animated Needle via Framer-Motion (motion/react) */}
          <motion.g
            animate={{
              rotate: needleAngle,
            }}
            transition={{
              type: "spring",
              stiffness: 85,
              damping: 14,
              mass: 0.5,
            }}
            style={{
              transformOrigin: "150px 150px",
            }}
          >
            {/* Needle Body */}
            <polygon
              points="146,150 154,150 151.5,52 148.5,52"
              fill={strokeColor}
              opacity="0.95"
            />
            {/* Needle Tip Indicator */}
            <circle cx="150" cy="52" r="3.5" fill={strokeColor} />
            <circle cx="150" cy="52" r="1.5" fill="#ffffff" />
          </motion.g>

          {/* Center Hub */}
          <circle
            cx="150"
            cy="150"
            r="16"
            fill={darkMode ? "#222222" : "#ffffff"}
            stroke={strokeColor}
            strokeWidth="3"
          />
          <motion.circle
            cx="150"
            cy="150"
            r="6"
            animate={{ fill: strokeColor }}
            transition={{ duration: 0.3 }}
          />
        </svg>

        {/* Digital Readout inside Gauge with Framer-Motion transitions */}
        <div className="absolute bottom-3 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline gap-1.5">
            {/* Animated Digital Speed Counter */}
            <motion.span
              id="gauge-speed-val"
              key={phase === "ping" ? "ping" : "speed"}
              initial={{ scale: 0.95, opacity: 0.9 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`text-4xl font-bold tracking-tight font-mono ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              {formattedSpeed}
            </motion.span>

            {/* Digital Speed Unit */}
            <motion.span
              animate={{ color: strokeColor }}
              transition={{ duration: 0.2 }}
              className="text-xs font-semibold uppercase tracking-wider"
            >
              {phase === "ping" ? "ms" : "Mbps"}
            </motion.span>
          </div>

          {/* Smooth Phase status indicator badge with AnimatePresence */}
          <div className="mt-1 flex items-center justify-center min-h-[22px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-1.5"
              >
                <motion.span
                  className="w-2 h-2 rounded-full"
                  animate={{
                    backgroundColor: strokeColor,
                    scale: phase === "complete" ? 1 : [1, 1.35, 1],
                  }}
                  transition={{
                    scale: {
                      repeat: phase === "complete" ? 0 : Infinity,
                      duration: 1.2,
                      ease: "easeInOut",
                    },
                    backgroundColor: { duration: 0.3 },
                  }}
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
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Real-time ping/jitter micro-bar */}
          {pingMs !== undefined && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1 flex items-center gap-3 text-[11px] text-slate-400 font-mono"
            >
              <span>
                Ping:{" "}
                <strong className={darkMode ? "text-slate-200" : "text-slate-800"}>
                  {pingMs.toFixed(1)}ms
                </strong>
              </span>
              {jitterMs !== undefined && (
                <span>
                  Jitter:{" "}
                  <strong className={darkMode ? "text-slate-200" : "text-slate-800"}>
                    {jitterMs.toFixed(1)}ms
                  </strong>
                </span>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
