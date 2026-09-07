export type AdapterType =
  | "Ethernet"
  | "Wi-Fi"
  | "Cellular"
  | "VPN"
  | "Virtual"
  | "Bluetooth"
  | "Loopback";

export interface NetworkAdapter {
  id: string;
  name: string;
  interfaceName: string;
  description: string;
  type: AdapterType;
  status: "Connected" | "Disconnected" | "Disabled";
  linkSpeedMbps: number;
  ipv4?: string;
  ipv6?: string;
  mac: string;
  netmask?: string;
  gateway?: string;
  dns?: string[];
  dhcpEnabled: boolean;
  isPrimary: boolean;
  signalStrength?: number; // 0-100% for Wi-Fi
  mtu: number;
  duplex?: "Full Duplex" | "Half Duplex";
  bytesReceived: number;
  bytesSent: number;
  lastTested?: SpeedTestResult;
}

export type SpeedTestPhase = "idle" | "ping" | "download" | "upload" | "complete" | "error";

export interface PingMetrics {
  currentMs: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  jitterMs: number;
  samples: number[];
}

export interface SpeedMetrics {
  currentMbps: number;
  peakMbps: number;
  averageMbps: number;
  bytesTransferred: number;
  durationSeconds: number;
  progressPercent: number;
}

export interface SpeedTestResult {
  id: string;
  adapterId: string;
  adapterName: string;
  adapterType?: AdapterType;
  adapterInterface?: string;
  timestamp: number;
  ping: number; // ms
  jitter: number; // ms
  downloadSpeed: number; // Mbps
  uploadSpeed: number; // Mbps
  downloadBytes: number;
  uploadBytes: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  suitability: {
    gaming: "Excellent" | "Good" | "Fair" | "Poor";
    streaming4k: "Excellent" | "Good" | "Fair" | "Poor";
    videoCalls: "Excellent" | "Good" | "Fair" | "Poor";
    largeUploads: "Excellent" | "Good" | "Fair" | "Poor";
  };
}

export interface GraphDataPoint {
  timestamp: number;
  downloadMbps: number;
  uploadMbps: number;
}

export interface TestSettings {
  downloadSizeMb: number;
  uploadSizeMb: number;
  parallelStreams: number;
  pingSamplesCount: number;
  enableSound: boolean;
}
