import React, { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import {
  ChatMessage,
  ChatbotRole,
  NetworkAdapter,
  SpeedTestResult,
} from "../types";
import { CHATBOT_ROLES, DEFAULT_CHATBOT_ROLE } from "../utils/chatbotRoles";
import { soundManager } from "../utils/audio";
import {
  Send,
  Bot,
  Zap,
  Cpu,
  User,
  Trash2,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Terminal,
  ShieldAlert,
  Sliders,
  ChevronDown,
  ChevronUp,
  Square,
  Network,
  Gauge,
  HelpCircle,
} from "lucide-react";

interface GeminiChatbotProps {
  activeAdapter?: NetworkAdapter;
  allAdapters: NetworkAdapter[];
  latestResult?: SpeedTestResult;
  onOpenPowerShellWithCommand?: (code: string) => void;
  darkMode: boolean;
  prefilledPrompt?: string;
  onClearPrefilledPrompt?: () => void;
}

const STORAGE_KEY = "win10_speedtest_gemini_chat_history";
const ROLE_STORAGE_KEY = "win10_speedtest_gemini_active_role";

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  activeAdapter,
  allAdapters,
  latestResult,
  onOpenPowerShellWithCommand,
  darkMode,
  prefilledPrompt,
  onClearPrefilledPrompt,
}) => {
  // Selected Role
  const [selectedRole, setSelectedRole] = useState<ChatbotRole>(() => {
    try {
      const savedRoleId = localStorage.getItem(ROLE_STORAGE_KEY);
      const found = CHATBOT_ROLES.find((r) => r.id === savedRoleId);
      return found || DEFAULT_CHATBOT_ROLE;
    } catch {
      return DEFAULT_CHATBOT_ROLE;
    }
  });

  // Custom system instruction toggle & edit
  const [showSystemPromptEditor, setShowSystemPromptEditor] = useState(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState(
    selectedRole.systemInstruction
  );

  // Keep system prompt in sync when role changes
  useEffect(() => {
    setCustomSystemPrompt(selectedRole.systemInstruction);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, selectedRole.id);
    } catch (e) {
      console.warn("Storage error", e);
    }
  }, [selectedRole]);

  // Context inclusion toggle
  const [includeContext, setIncludeContext] = useState<boolean>(true);

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load chat history", e);
    }

    // Default welcoming message
    return [
      {
        id: "msg-welcome-0",
        role: "model",
        roleName: DEFAULT_CHATBOT_ROLE.name,
        model: DEFAULT_CHATBOT_ROLE.model,
        timestamp: Date.now(),
        content: `👋 Hello! I am your **Windows 10 Network & Wi-Fi Assistant**, powered by **Gemini**.

I can help you:
- **Benchmark & Compare**: Analyze the difference between your **Wi-Fi**, **Wi-Fi 2**, and **Ethernet** adapters.
- **Troubleshoot**: Diagnose high latency, ping jitter, packet drops, or bufferbloat.
- **PowerShell Automation**: Generate instant commands to query adapter properties, reset TCP/IP stacks, or optimize MTU.
- **Speed Test Diagnostics**: Interpret your throughput test results and recommend router channels, DNS servers, and QoS settings.

Select one of the quick prompts below or ask any question to get started!`,
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Handle prefilled prompt when passed from external view (e.g. speed test results)
  useEffect(() => {
    if (prefilledPrompt) {
      setInputPrompt(prefilledPrompt);
      if (onClearPrefilledPrompt) {
        onClearPrefilledPrompt();
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [prefilledPrompt, onClearPrefilledPrompt]);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn("Failed to persist messages", e);
    }
  }, [messages]);

  // Smooth scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Generate context string from current system state
  const buildSystemContext = (): string => {
    if (!includeContext) return "";

    const adapterList = allAdapters
      .map(
        (a) =>
          `- ${a.name} (${a.type}): ${a.description} | Link: ${a.linkSpeedMbps} Mbps | IP: ${a.ipv4 || "None"} | Gateway: ${a.gateway || "N/A"}${
            a.signalStrength ? ` | Signal: ${a.signalStrength}%` : ""
          }${a.isPrimary ? " [Default Gateway]" : ""}`
      )
      .join("\n");

    let testContext = "No recent speed test conducted in this session.";
    if (latestResult) {
      testContext = `Latest Benchmark for ${latestResult.adapterName}:
- Download Throughput: ${latestResult.downloadSpeed.toFixed(1)} Mbps
- Upload Throughput: ${latestResult.uploadSpeed.toFixed(1)} Mbps
- Latency (Ping): ${latestResult.ping.toFixed(1)} ms
- Jitter: ${latestResult.jitter.toFixed(1)} ms
- Connection Grade: ${latestResult.grade}
- Gaming Suitability: ${latestResult.suitability.gaming}
- 4K Streaming: ${latestResult.suitability.streaming4k}`;
    }

    return `\n\n[ACTIVE USER SYSTEM & NETWORK CONTEXT]:
Active Selected Adapter: ${activeAdapter?.name || "None"} (${activeAdapter?.description || ""})
Current IP: ${activeAdapter?.ipv4 || "N/A"}
Link Speed: ${activeAdapter?.linkSpeedMbps || 0} Mbps
Available Adapters (${allAdapters.length}):
${adapterList}

Speed Test Data:
${testContext}`;
  };

  // Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend !== undefined ? textToSend : inputPrompt).trim();
    if (!promptText || isGenerating) return;

    soundManager.playClick();
    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: promptText,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt("");

    // Create placeholder for model response
    const assistantMessageId = `model-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "model",
      roleName: selectedRole.name,
      model: selectedRole.model,
      timestamp: Date.now(),
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsGenerating(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const fullSystemInstruction =
        customSystemPrompt.trim() + (includeContext ? buildSystemContext() : "");

      // Prepare conversation payload for /api/chat
      const payloadMessages = newMessages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: payloadMessages,
          model: selectedRole.model,
          systemInstruction: fullSystemInstruction,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${response.status}`);
      }

      // Check if response is stream
      if (response.headers.get("content-type")?.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulatedText = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataStr = line.replace("data: ", "").trim();
                if (dataStr === "[DONE]") {
                  break;
                }
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.text) {
                    accumulatedText += parsed.text;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: accumulatedText, isStreaming: true }
                          : msg
                      )
                    );
                  } else if (parsed.error) {
                    throw new Error(parsed.error);
                  }
                } catch {
                  // If raw text chunk or parse error
                }
              }
            }
          }
        }

        // Finalize streaming flag
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: accumulatedText || "No response received.", isStreaming: false }
              : msg
          )
        );
      } else {
        // Fallback for non-streaming response
        const data = await response.json();
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: data.text || "No response received.", isStreaming: false }
              : msg
          )
        );
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content + "\n\n*(Generation stopped by user)*", isStreaming: false }
              : msg
          )
        );
      } else {
        console.error("Chat error:", err);
        const errText = err?.message || "Failed to generate AI response";
        setErrorMessage(errText);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: `⚠️ **Unable to connect to Gemini API**: ${errText}\n\nPlease verify that your Gemini API key is configured in the AI Studio **Settings > Secrets** panel.`,
                  isStreaming: false,
                }
              : msg
          )
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
      soundManager.playClick();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Clear all conversation history?")) {
      soundManager.playClick();
      setMessages([
        {
          id: `msg-welcome-${Date.now()}`,
          role: "model",
          roleName: selectedRole.name,
          model: selectedRole.model,
          timestamp: Date.now(),
          content: `🧹 Conversation history cleared. Ask a question about your **${
            activeAdapter?.name || "Network"
          }** connection or choose a starter prompt below.`,
        },
      ]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleExportChat = () => {
    soundManager.playClick();
    const formatted = messages
      .map((m) => {
        const sender = m.role === "user" ? "USER" : `GEMINI AI (${m.roleName || m.model || "Assistant"})`;
        const time = new Date(m.timestamp).toLocaleTimeString();
        return `### [${time}] ${sender}\n\n${m.content}\n\n---`;
      })
      .join("\n\n");

    const blob = new Blob([`# Windows 10 Network Speed Test - Gemini Chat Transcript\n\n${formatted}`], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gemini-network-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const getRoleIcon = (iconName: ChatbotRole["iconName"]) => {
    switch (iconName) {
      case "Zap":
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case "Cpu":
        return <Cpu className="w-3.5 h-3.5 text-purple-400" />;
      case "Bot":
      default:
        return <Bot className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  // Quick Prompt Starters
  const starterPrompts = [
    {
      label: "Wi-Fi vs Wi-Fi 2",
      prompt: "Compare my Wi-Fi and Wi-Fi 2 adapters. Why might one have higher speed or lower latency?",
    },
    {
      label: "Optimize Ping & Jitter",
      prompt: "What are the most effective Windows 10 settings to minimize ping jitter and latency for online gaming?",
    },
    {
      label: "PowerShell Diagnostics",
      prompt: "Give me a PowerShell script to benchmark packet loss, MTU, and DNS response time for all my network adapters.",
    },
    {
      label: "Analyze My Latest Test",
      prompt: latestResult
        ? `Analyze my recent speed test (${latestResult.downloadSpeed.toFixed(0)} Mbps down, ${latestResult.ping.toFixed(1)}ms ping, ${latestResult.jitter.toFixed(1)}ms jitter on ${latestResult.adapterName}) and give me 3 specific recommendations.`
        : "Explain the relationship between download throughput, ping latency, and jitter during speed tests.",
    },
    {
      label: "Best DNS Servers",
      prompt: "Which public DNS servers (Cloudflare 1.1.1.1, Google 8.8.8.8, Quad9 9.9.9.9) are best for low latency, and how do I change it in Windows 10?",
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[580px] max-w-5xl mx-auto space-y-3">
      {/* Top Header Card: Role Selection & Persona Bar */}
      <div
        className={`p-3 rounded border flex flex-col gap-2.5 transition-colors ${
          darkMode ? "bg-[#202020] border-[#383838]" : "bg-white border-[#d8d8d8]"
        }`}
      >
        {/* Role Selection Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-inherit/30 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0078D7]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Gemini AI Chatbot Roles
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {CHATBOT_ROLES.map((role) => {
              const isSelected = selectedRole.id === role.id;
              return (
                <button
                  key={role.id}
                  id={`btn-role-${role.id}`}
                  onClick={() => {
                    soundManager.playClick();
                    setSelectedRole(role);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#0078D7] text-white shadow-xs"
                      : darkMode
                      ? "bg-[#181818] border border-[#333] hover:bg-[#282828] text-slate-300"
                      : "bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {getRoleIcon(role.iconName)}
                  <span>{role.name}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : darkMode
                        ? "bg-slate-700 text-slate-400"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {role.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSystemPromptEditor(!showSystemPromptEditor)}
              title="View & Edit System Instruction"
              className={`p-1.5 rounded text-xs border transition-colors flex items-center gap-1 ${
                showSystemPromptEditor
                  ? "bg-[#0078D7]/15 border-[#0078D7] text-[#0078D7]"
                  : darkMode
                  ? "border-[#383838] text-slate-400 hover:bg-white/5"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Role Prompt</span>
              {showSystemPromptEditor ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            <button
              onClick={handleExportChat}
              title="Export Conversation to Markdown"
              className={`p-1.5 rounded text-xs border transition-colors ${
                darkMode
                  ? "border-[#383838] text-slate-400 hover:bg-white/5"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleClearHistory}
              title="Clear Conversation History"
              className={`p-1.5 rounded text-xs border transition-colors text-rose-400 hover:text-rose-300 ${
                darkMode
                  ? "border-[#383838] hover:bg-rose-500/10"
                  : "border-slate-300 hover:bg-rose-50"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Active Role Meta Banner */}
        <div className="flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Current Model:</span>
            <span className="font-mono font-semibold text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20 text-[11px]">
              {selectedRole.model}
            </span>
            <span className="text-slate-500 text-[11px]">•</span>
            <span className="text-slate-400 text-[11px]">{selectedRole.description}</span>
          </div>

          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
              className="accent-[#0078D7] rounded cursor-pointer"
            />
            <span>Include Active Adapter & Speed Test Context</span>
          </label>
        </div>

        {/* Collapsible System Prompt Editor */}
        {showSystemPromptEditor && (
          <div
            className={`p-2.5 rounded border space-y-2 text-xs transition-colors ${
              darkMode ? "bg-[#161616] border-[#303030]" : "bg-slate-50 border-[#ccc]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">
                System Instruction for {selectedRole.name}:
              </span>
              <button
                onClick={() => setCustomSystemPrompt(selectedRole.systemInstruction)}
                className="text-[10px] text-sky-400 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset to Default</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={customSystemPrompt}
              onChange={(e) => setCustomSystemPrompt(e.target.value)}
              className={`w-full p-2 rounded text-xs font-mono border ${
                darkMode
                  ? "bg-[#111] border-[#3a3a3a] text-slate-200"
                  : "bg-white border-slate-300 text-slate-800"
              }`}
            />
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>
                Defines the specific role persona, tone, and operational boundaries for Gemini.
              </span>
              <button
                onClick={() => setShowSystemPromptEditor(false)}
                className="px-2 py-0.5 bg-[#0078D7] text-white rounded text-[10px]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Messages Scrollable Thread */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto p-4 rounded border space-y-4 ${
          darkMode ? "bg-[#181818] border-[#303030]" : "bg-slate-50 border-[#e0e0e0]"
        }`}
      >
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id || idx}
              className={`flex gap-3 max-w-3xl ${
                isUser ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isUser
                    ? "bg-[#0078D7] text-white"
                    : darkMode
                    ? "bg-[#282828] text-sky-400 border border-[#404040]"
                    : "bg-white text-[#0078D7] border border-slate-300 shadow-2xs"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`rounded-lg px-3.5 py-2.5 text-xs shadow-xs space-y-1.5 max-w-[88%] break-words ${
                  isUser
                    ? "bg-[#0078D7] text-white rounded-tr-none"
                    : darkMode
                    ? "bg-[#222222] border border-[#383838] text-slate-200 rounded-tl-none"
                    : "bg-white border border-slate-200 text-slate-900 rounded-tl-none"
                }`}
              >
                {/* Header Label inside Bubble */}
                <div className="flex items-center justify-between gap-3 text-[10px] pb-1 border-b border-inherit/20 opacity-80">
                  <span className="font-semibold">
                    {isUser
                      ? "You"
                      : msg.roleName || selectedRole.name}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    {!isUser && msg.model && (
                      <span className="px-1 py-0.2 rounded bg-black/20 text-[9px]">
                        {msg.model}
                      </span>
                    )}
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>

                {/* Body Content with Markdown */}
                <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-2">
                  <Markdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 mb-2">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      h1: ({ children }) => <h3 className="font-bold text-sm text-sky-400 mt-2 mb-1">{children}</h3>,
                      h2: ({ children }) => <h4 className="font-bold text-xs text-sky-400 mt-2 mb-1">{children}</h4>,
                      h3: ({ children }) => <h5 className="font-semibold text-xs text-sky-300 mt-1 mb-0.5">{children}</h5>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-sky-400/50 pl-2 my-1.5 text-slate-400 italic">
                          {children}
                        </blockquote>
                      ),
                      code: ({ className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || "");
                        const codeString = String(children).replace(/\n$/, "");
                        const isInline = !match && !codeString.includes("\n");

                        if (isInline) {
                          return (
                            <code
                              className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${
                                isUser
                                  ? "bg-white/20 text-white"
                                  : darkMode
                                  ? "bg-[#111] text-sky-300 border border-[#333]"
                                  : "bg-slate-100 text-sky-700 border border-slate-200"
                              }`}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        }

                        const codeId = `code-${Math.random().toString(36).slice(2, 8)}`;
                        const isPowershell =
                          (match && match[1]?.toLowerCase().includes("powershell")) ||
                          codeString.includes("Get-NetAdapter") ||
                          codeString.includes("Test-NetConnection") ||
                          codeString.includes("netsh");

                        return (
                          <div className="relative my-2 rounded border border-slate-700/60 overflow-hidden bg-[#0d1117] text-slate-100 text-[11px]">
                            <div className="flex items-center justify-between px-2.5 py-1 bg-[#161b22] border-b border-slate-700/40 text-[10px] text-slate-400">
                              <span className="font-mono uppercase">{match ? match[1] : "powershell / script"}</span>
                              <div className="flex items-center gap-1.5">
                                {isPowershell && onOpenPowerShellWithCommand && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenPowerShellWithCommand(codeString)}
                                    className="px-1.5 py-0.5 rounded bg-[#0078D7] hover:bg-[#106EBE] text-white flex items-center gap-1 transition-colors"
                                    title="Open and run this script in Windows PowerShell modal"
                                  >
                                    <Terminal className="w-2.5 h-2.5" />
                                    <span>Run in PowerShell</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(codeString, codeId)}
                                  className="px-1.5 py-0.5 rounded hover:bg-white/10 flex items-center gap-1 transition-colors"
                                >
                                  {copiedCodeId === codeId ? (
                                    <>
                                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-2.5 h-2.5" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                            <pre className="p-2.5 overflow-x-auto font-mono text-[11px] leading-snug">
                              <code>{codeString}</code>
                            </pre>
                          </div>
                        );
                      },
                    }}
                  >
                    {msg.content}
                  </Markdown>
                </div>

                {/* Streaming indicator */}
                {msg.isStreaming && (
                  <div className="flex items-center gap-1 pt-1 text-sky-400 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse delay-75" />
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse delay-150" />
                    <span className="text-[10px] text-slate-400 ml-1 font-mono">
                      Generating with {msg.model || selectedRole.model}...
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Error Banner if error occurred */}
        {errorMessage && (
          <div className="p-3 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-2 max-w-2xl">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">AI Communication Notice:</span>
              <p className="text-[11px] leading-relaxed">{errorMessage}</p>
              <div className="pt-1">
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-[10px] underline text-rose-300 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Starter Prompts Horizontal Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[10px] font-semibold uppercase text-slate-400 shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-[#0078D7]" /> Suggestions:
        </span>
        {starterPrompts.map((st, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(st.prompt)}
            disabled={isGenerating}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] border transition-all truncate max-w-xs ${
              darkMode
                ? "bg-[#202020] border-[#383838] text-slate-300 hover:bg-[#2a2a2a] hover:border-slate-500"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
            } disabled:opacity-50`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div
        className={`p-2.5 rounded border space-y-2 ${
          darkMode ? "bg-[#202020] border-[#383838]" : "bg-white border-[#d8d8d8]"
        }`}
      >
        <div className="relative flex items-end gap-2">
          <textarea
            ref={inputRef}
            id="gemini-chat-input"
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Ask ${selectedRole.name} about your Wi-Fi, Ethernet, speed test, or PowerShell commands... (Enter to send, Shift+Enter for new line)`}
            className={`w-full p-2.5 pr-10 text-xs rounded border resize-none transition-colors ${
              darkMode
                ? "bg-[#181818] border-[#383838] text-slate-100 placeholder-slate-500 focus:border-[#0078D7] focus:ring-1 focus:ring-[#0078D7]"
                : "bg-slate-50 border-[#ccc] text-slate-900 placeholder-slate-400 focus:border-[#0078D7] focus:ring-1 focus:ring-[#0078D7]"
            }`}
          />

          {isGenerating ? (
            <button
              onClick={handleStopGeneration}
              title="Stop Generating"
              className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium flex items-center justify-center shrink-0 transition-colors shadow-xs"
            >
              <Square className="w-4 h-4 fill-white" />
            </button>
          ) : (
            <button
              id="gemini-chat-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputPrompt.trim() || isGenerating}
              title="Send Message"
              className="p-2.5 bg-[#0078D7] hover:bg-[#106EBE] disabled:bg-slate-600 disabled:opacity-50 text-white rounded font-medium flex items-center justify-center shrink-0 transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Footer Meta Strip */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Network className="w-3 h-3 text-sky-400" />
              <span>Target:</span>
              <strong className="text-slate-200">{activeAdapter?.name || "Active Adapter"}</strong>
            </span>
            {latestResult && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                <Gauge className="w-3 h-3" />
                <span>{latestResult.downloadSpeed.toFixed(0)} Mbps</span>
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500">
            Powered by Google DeepMind Gemini API • Windows 10 Network Suite
          </span>
        </div>
      </div>
    </div>
  );
};
