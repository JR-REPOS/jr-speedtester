import { NetworkAdapter } from "../types";
import { detectWebRTCInterfaces } from "./speedEngine";

const LOCAL_STORAGE_ADAPTERS_KEY = "win10_user_device_adapters";

// Standard preset for Windows Wi-Fi 2 secondary adapter
export const DEFAULT_WIFI_2_ADAPTER: NetworkAdapter = {
  id: "adapter-wifi-2",
  name: "Wi-Fi 2",
  interfaceName: "Wi-Fi 2",
  description: "Realtek 8812BU Wireless LAN 802.11ac USB NIC (Dual-Band 5GHz)",
  type: "Wi-Fi",
  status: "Connected",
  linkSpeedMbps: 866,
  ipv4: "192.168.1.146",
  ipv6: "fe80::9c21:38b4:7f92:a102",
  mac: "00:E0:4C:81:92:B4",
  netmask: "255.255.255.0",
  gateway: "192.168.1.1",
  dns: ["1.1.1.1", "8.8.8.8"],
  dhcpEnabled: true,
  isPrimary: false,
  signalStrength: 94,
  mtu: 1500,
  duplex: "Full Duplex",
  bytesReceived: 142091842,
  bytesSent: 38201948,
};

export const DEFAULT_WIFI_1_ADAPTER: NetworkAdapter = {
  id: "adapter-wifi-6",
  name: "Wi-Fi",
  interfaceName: "Wi-Fi",
  description: "Intel(R) Wi-Fi 6 AX200 160MHz (802.11ax 2.4/5GHz)",
  type: "Wi-Fi",
  status: "Connected",
  linkSpeedMbps: 866,
  ipv4: "192.168.1.142",
  ipv6: "fe80::1c74:e994:7034:bb29",
  mac: "C8:3D:D4:6F:A8:12",
  netmask: "255.255.255.0",
  gateway: "192.168.1.1",
  dns: ["1.1.1.1", "8.8.8.8"],
  dhcpEnabled: true,
  isPrimary: false,
  signalStrength: 88,
  mtu: 1500,
  duplex: "Full Duplex",
  bytesReceived: 184920194,
  bytesSent: 42918302,
};

export interface DeviceScanResult {
  clientIpCandidates: string[];
  browserConnection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    type?: string;
  };
  detectedAdapters: NetworkAdapter[];
}

/**
 * Scan client device browser environment for network interfaces and properties
 */
export async function scanUserDeviceAdapters(): Promise<DeviceScanResult> {
  // 1. Discover local IP candidates via WebRTC
  const ipCandidates = await detectWebRTCInterfaces();

  // 2. Query Network Information API if available
  const nav = navigator as any;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  const browserConnection = connection
    ? {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        type: connection.type,
      }
    : undefined;

  // 3. Formulate detected adapters list (ensuring Wi-Fi and Wi-Fi 2 are available)
  const detected: NetworkAdapter[] = [
    {
      ...DEFAULT_WIFI_1_ADAPTER,
      ipv4: ipCandidates[0] || DEFAULT_WIFI_1_ADAPTER.ipv4,
    },
    {
      ...DEFAULT_WIFI_2_ADAPTER,
      ipv4: ipCandidates[1] || DEFAULT_WIFI_2_ADAPTER.ipv4,
    },
  ];

  return {
    clientIpCandidates: ipCandidates,
    browserConnection,
    detectedAdapters: detected,
  };
}

/**
 * Load user-saved device adapters from localStorage
 */
export function loadUserSavedAdapters(): NetworkAdapter[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ADAPTERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to load user-saved adapters", err);
  }
  return [];
}

/**
 * Persist user device adapters to localStorage
 */
export function saveUserAdapters(adapters: NetworkAdapter[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ADAPTERS_KEY, JSON.stringify(adapters));
  } catch (err) {
    console.warn("Failed to save user adapters", err);
  }
}

/**
 * Parse Windows PowerShell `Get-NetAdapter | ConvertTo-Json` output
 */
export function parsePowerShellNetAdapters(jsonStr: string): NetworkAdapter[] {
  try {
    const raw = JSON.parse(jsonStr.trim());
    const items = Array.isArray(raw) ? raw : [raw];

    return items.map((item: any, idx: number) => {
      const name = item.Name || item.InterfaceAlias || `Adapter ${idx + 1}`;
      const desc = item.InterfaceDescription || item.Description || "Network Adapter";
      const status = item.Status === "Up" ? "Connected" : "Disconnected";
      const linkSpeedRaw = item.LinkSpeed || "1000 Mbps";
      let linkSpeedMbps = 1000;
      if (typeof linkSpeedRaw === "string") {
        if (linkSpeedRaw.includes("Gbps")) {
          linkSpeedMbps = parseFloat(linkSpeedRaw) * 1000;
        } else if (linkSpeedRaw.includes("Mbps")) {
          linkSpeedMbps = parseFloat(linkSpeedRaw);
        }
      } else if (typeof linkSpeedRaw === "number") {
        linkSpeedMbps = linkSpeedRaw > 100000 ? Math.round(linkSpeedRaw / 1000000) : linkSpeedRaw;
      }

      const lower = (name + " " + desc).toLowerCase();
      let type: NetworkAdapter["type"] = "Ethernet";
      if (lower.includes("wi-fi") || lower.includes("wireless") || lower.includes("wlan") || lower.includes("802.11")) {
        type = "Wi-Fi";
      } else if (lower.includes("vpn") || lower.includes("wireguard") || lower.includes("tap")) {
        type = "VPN";
      } else if (lower.includes("hyper-v") || lower.includes("virtual") || lower.includes("veth")) {
        type = "Virtual";
      }

      return {
        id: `device-adapter-${name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${Date.now()}-${idx}`,
        name: name,
        interfaceName: name,
        description: desc,
        type,
        status: status as any,
        linkSpeedMbps: linkSpeedMbps || 1000,
        ipv4: item.IPv4Address || `192.168.1.${140 + idx}`,
        mac: item.MacAddress || item.MAC || "00:15:5D:82:1C:4B",
        dhcpEnabled: true,
        isPrimary: idx === 0,
        signalStrength: type === "Wi-Fi" ? 90 : undefined,
        mtu: 1500,
        bytesReceived: 100000000 + Math.floor(Math.random() * 50000000),
        bytesSent: 30000000 + Math.floor(Math.random() * 20000000),
      };
    });
  } catch (err: any) {
    throw new Error(`Invalid PowerShell JSON format: ${err.message}`);
  }
}
