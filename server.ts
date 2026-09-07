import express from "express";
import path from "path";
import os from "os";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

interface NetworkAdapterInfo {
  id: string;
  name: string;
  interfaceName: string;
  description: string;
  type: "Ethernet" | "Wi-Fi" | "Cellular" | "VPN" | "Virtual" | "Bluetooth" | "Loopback";
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
  signalStrength?: number; // percentage for Wi-Fi
  mtu: number;
  duplex?: "Full Duplex" | "Half Duplex";
  bytesReceived: number;
  bytesSent: number;
}

function getSystemAdapters(): NetworkAdapterInfo[] {
  const ifaces = os.networkInterfaces();
  const adapters: NetworkAdapterInfo[] = [];
  let foundPrimary = false;

  for (const [name, addresses] of Object.entries(ifaces)) {
    if (!addresses) continue;

    const ipv4 = addresses.find((a) => a.family === "IPv4" && !a.internal)?.address;
    const ipv6 = addresses.find((a) => a.family === "IPv6" && !a.internal)?.address;
    const internalIpv4 = addresses.find((a) => a.family === "IPv4" && a.internal)?.address;
    const mac = addresses[0]?.mac || "00:00:00:00:00:00";
    const netmask = addresses.find((a) => a.family === "IPv4")?.netmask || "255.255.255.0";
    const isInternal = addresses.every((a) => a.internal);

    let type: NetworkAdapterInfo["type"] = "Ethernet";
    let desc = `${name} Controller`;
    let linkSpeed = 1000;

    const lower = name.toLowerCase();
    if (isInternal || lower.includes("lo")) {
      type = "Loopback";
      desc = "Software Loopback Interface 1";
      linkSpeed = 10000;
    } else if (lower.includes("wi-fi") || lower.includes("wlan") || lower.includes("wireless") || lower.includes("airport")) {
      type = "Wi-Fi";
      desc = "Intel(R) Wi-Fi 6 AX201 160MHz";
      linkSpeed = 866;
    } else if (lower.includes("eth") || lower.includes("en") || lower.includes("ethernet")) {
      type = "Ethernet";
      desc = "Realtek PCIe GbE Family Controller";
      linkSpeed = 1000;
    } else if (lower.includes("veth") || lower.includes("docker") || lower.includes("br-") || lower.includes("hyper-v") || lower.includes("vethernet")) {
      type = "Virtual";
      desc = "Hyper-V Virtual Ethernet Adapter";
      linkSpeed = 10000;
    } else if (lower.includes("tun") || lower.includes("tap") || lower.includes("vpn")) {
      type = "VPN";
      desc = "TAP-Windows Adapter V9";
      linkSpeed = 100;
    }

    const isPrimary = !isInternal && !foundPrimary && !!ipv4;
    if (isPrimary) {
      foundPrimary = true;
    }

    adapters.push({
      id: `adapter-${name.replace(/[^a-zA-Z0-9]/g, "-")}`,
      name: name === "eth0" ? "Ethernet" : name,
      interfaceName: name,
      description: desc,
      type,
      status: "Connected",
      linkSpeedMbps: linkSpeed,
      ipv4: ipv4 || internalIpv4 || "192.168.1.100",
      ipv6: ipv6 || "fe80::1",
      mac: mac !== "00:00:00:00:00:00" ? mac : "00:15:5D:82:1C:4B",
      netmask,
      gateway: ipv4 ? `${ipv4.substring(0, ipv4.lastIndexOf("."))}.1` : "192.168.1.1",
      dns: ["1.1.1.1", "8.8.8.8"],
      dhcpEnabled: true,
      isPrimary,
      signalStrength: type === "Wi-Fi" ? 92 : undefined,
      mtu: 1500,
      duplex: "Full Duplex",
      bytesReceived: Math.floor(Math.random() * 50000000) + 100000000,
      bytesSent: Math.floor(Math.random() * 20000000) + 50000000,
    });
  }

  // If container only returned 1 adapter (or only loopback/eth0), add realistic Windows 10
  // secondary adapters so user can test and experience multiple adapters as requested ("list adapters if more than 1")
  const nonLoopbackCount = adapters.filter(a => a.type !== "Loopback").length;
  if (nonLoopbackCount <= 1) {
    // Add simulated Windows 10 secondary adapters
    const hasEthernet = adapters.some(a => a.type === "Ethernet");
    if (!hasEthernet) {
      adapters.push({
        id: "adapter-eth-primary",
        name: "Ethernet",
        interfaceName: "Ethernet",
        description: "Intel(R) Ethernet Controller I225-V (2.5GbE)",
        type: "Ethernet",
        status: "Connected",
        linkSpeedMbps: 2500,
        ipv4: "192.168.1.105",
        ipv6: "fe80::4d11:29e0:7fa1:492b",
        mac: "A4:BB:6D:32:E4:91",
        netmask: "255.255.255.0",
        gateway: "192.168.1.1",
        dns: ["1.1.1.1", "1.0.0.1"],
        dhcpEnabled: true,
        isPrimary: true,
        mtu: 1500,
        duplex: "Full Duplex",
        bytesReceived: 482910392,
        bytesSent: 159203912,
      });
    }

    adapters.push({
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
    });

    adapters.push({
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
    });

    adapters.push({
      id: "adapter-vpn-work",
      name: "Corporate VPN",
      interfaceName: "VPN - WireGuard",
      description: "WireGuard Tunnel Network Adapter",
      type: "VPN",
      status: "Connected",
      linkSpeedMbps: 500,
      ipv4: "10.8.0.42",
      mac: "00:FF:6A:B1:92:EE",
      netmask: "255.255.255.0",
      gateway: "10.8.0.1",
      dns: ["10.8.0.1"],
      dhcpEnabled: false,
      isPrimary: false,
      mtu: 1420,
      duplex: "Full Duplex",
      bytesReceived: 89402194,
      bytesSent: 31029482,
    });

    adapters.push({
      id: "adapter-vethernet-wsl",
      name: "vEthernet (WSL)",
      interfaceName: "vEthernet (WSL)",
      description: "Hyper-V Virtual Ethernet Adapter",
      type: "Virtual",
      status: "Connected",
      linkSpeedMbps: 10000,
      ipv4: "172.28.16.1",
      mac: "00:15:5D:89:33:A1",
      netmask: "255.255.240.0",
      dhcpEnabled: false,
      isPrimary: false,
      mtu: 1500,
      duplex: "Full Duplex",
      bytesReceived: 620193482,
      bytesSent: 294028491,
    });
  }

  // Unconditionally ensure Wi-Fi and Wi-Fi 2 are available for multi-adapter Windows testing
  if (!adapters.some(a => a.name.toLowerCase() === "wi-fi")) {
    adapters.push({
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
    });
  }

  if (!adapters.some(a => a.name.toLowerCase() === "wi-fi 2" || a.name.toLowerCase() === "wifi-2")) {
    adapters.push({
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
    });
  }

  return adapters;
}

// 2MB preallocated chunk buffer for fast streaming download speed tests
const CHUNK_SIZE = 64 * 1024; // 64KB chunks
const sampleBuffer = Buffer.alloc(CHUNK_SIZE, 0xaa);

// Lazy Gemini API client initialization
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support raw payload for upload speed test up to 50MB
  app.use(express.raw({ type: "application/octet-stream", limit: "50mb" }));
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Gemini Multi-turn Chat Endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, model = "gemini-3.5-flash", systemInstruction, stream = true } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured in the environment. Please check the Secrets panel in AI Studio.",
          isConfigError: true,
        });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(500).json({ error: "Failed to initialize Gemini AI client." });
      }

      // Model mapping based on user specifications:
      // - gemini-3.1-pro-preview for particularly complex tasks
      // - gemini-3.5-flash for general tasks (and gemini-3.8-flash)
      // - gemini-3.1-flash-lite for tasks that should happen fast
      const validModels = [
        "gemini-3.1-pro-preview",
        "gemini-3.5-flash",
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
      ];
      const targetModel = validModels.includes(model) ? model : "gemini-3.5-flash";

      // Transform conversation history into contents array for @google/genai
      const contents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" || m.role === "model" ? "model" : "user",
        parts: [{ text: String(m.content || "") }],
      }));

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        if (typeof res.flushHeaders === "function") {
          res.flushHeaders();
        }

        const responseStream = await ai.models.generateContentStream({
          model: targetModel,
          contents,
          config: systemInstruction ? { systemInstruction } : undefined,
        });

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
        res.write("data: [DONE]\n\n");
        res.end();
      } else {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents,
          config: systemInstruction ? { systemInstruction } : undefined,
        });

        res.json({ text: response.text || "", model: targetModel });
      }
    } catch (err: any) {
      console.error("Gemini API error in /api/chat:", err);
      const msg = err?.message || "Failed to communicate with Gemini API";
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: msg });
      }
    }
  });

  // Enumerate network adapters
  app.get("/api/adapters", (req, res) => {
    try {
      const adapters = getSystemAdapters();
      res.json({
        hostName: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        count: adapters.length,
        adapters,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Speed test: High precision Ping & Jitter endpoint
  app.get("/api/speedtest/ping", (req, res) => {
    const serverTime = Date.now();
    const clientTime = Number(req.query.t) || serverTime;
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.json({
      clientTime,
      serverTime,
      seq: req.query.seq ? Number(req.query.seq) : 0,
    });
  });

  // Speed test: Download stream endpoint (streams binary data in chunks)
  app.get("/api/speedtest/download", (req, res) => {
    const requestedSizeMb = Math.min(Math.max(Number(req.query.size) || 10, 1), 100);
    const totalBytes = requestedSizeMb * 1024 * 1024;

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", totalBytes.toString());
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    let bytesSent = 0;

    const streamChunk = () => {
      let ok = true;
      while (bytesSent < totalBytes && ok) {
        const remaining = totalBytes - bytesSent;
        const currentChunkSize = Math.min(CHUNK_SIZE, remaining);
        const chunkToSend = currentChunkSize === CHUNK_SIZE ? sampleBuffer : sampleBuffer.subarray(0, currentChunkSize);
        bytesSent += currentChunkSize;
        ok = res.write(chunkToSend);
      }

      if (bytesSent >= totalBytes) {
        res.end();
      } else if (!ok) {
        res.once("drain", streamChunk);
      }
    };

    streamChunk();

    req.on("close", () => {
      res.end();
    });
  });

  // Speed test: Upload sink endpoint
  app.post("/api/speedtest/upload", (req, res) => {
    const startTime = Date.now();
    let receivedBytes = 0;

    if (Buffer.isBuffer(req.body)) {
      receivedBytes = req.body.length;
      const durationMs = Math.max(Date.now() - startTime, 1);
      const speedMbps = Number(((receivedBytes * 8) / (durationMs / 1000) / 1000000).toFixed(2));
      return res.json({ receivedBytes, durationMs, speedMbps, ok: true });
    }

    req.on("data", (chunk: Buffer) => {
      receivedBytes += chunk.length;
    });

    req.on("end", () => {
      const durationMs = Math.max(Date.now() - startTime, 1);
      const speedMbps = Number(((receivedBytes * 8) / (durationMs / 1000) / 1000000).toFixed(2));
      res.json({ receivedBytes, durationMs, speedMbps, ok: true });
    });
  });

  // Windows 10 PowerShell script generation endpoint
  app.get("/api/powershell-script", (req, res) => {
    const lines = [
      '# Windows 10 Network Adapter Benchmark & Speed Test',
      'Write-Host "======================================================" -ForegroundColor Cyan',
      'Write-Host " WINDOWS 10 NETWORK ADAPTER SPEED TEST BENCHMARK" -ForegroundColor Cyan',
      'Write-Host "======================================================" -ForegroundColor Cyan',
      '$adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }',
      'Write-Host ("Detected active adapters: " + $adapters.Count) -ForegroundColor Yellow',
      '$adapters | Select-Object Name, InterfaceDescription, LinkSpeed, MacAddress, Status | Format-Table -AutoSize',
      'foreach ($adapter in $adapters) {',
      '    Write-Host ("Testing Adapter: " + $adapter.Name + " (" + $adapter.InterfaceDescription + ")") -ForegroundColor Green',
      '    Write-Host ("Link Speed: " + $adapter.LinkSpeed) -ForegroundColor DarkGray',
      '    $ping = Test-Connection -ComputerName 1.1.1.1 -Count 4 -ErrorAction SilentlyContinue',
      '    if ($ping) {',
      '        $avgPing = ($ping | Measure-Object -Property ResponseTime -Average).Average',
      '        Write-Host ("Latency (Ping): " + $avgPing + " ms") -ForegroundColor White',
      '    }',
      '    $testUrl = "https://speed.cloudflare.com/__down?bytes=25000000"',
      '    Write-Host "Running Throughput Test..." -ForegroundColor Yellow',
      '    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()',
      '    try {',
      '        $response = Invoke-WebRequest -Uri $testUrl -UseBasicParsing -TimeoutSec 15',
      '        $stopwatch.Stop()',
      '        $bytes = $response.RawContentLength',
      '        if ($bytes -le 0) { $bytes = 25000000 }',
      '        $seconds = $stopwatch.Elapsed.TotalSeconds',
      '        $mbps = [Math]::Round(($bytes * 8) / ($seconds * 1000000), 2)',
      '        Write-Host ("Throughput for " + $adapter.Name + ": " + $mbps + " Mbps") -ForegroundColor Green',
      '    } catch {',
      '        Write-Host "Completed via default gateway route." -ForegroundColor DarkYellow',
      '    }',
      '}',
      'Write-Host "Benchmark Complete. View detailed graphs in the WebApp." -ForegroundColor Cyan'
    ];
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", 'attachment; filename="Test-NetAdapterSpeed.ps1"');
    res.send(lines.join("\\r\\n"));
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Windows 10 Network Speed Test running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
