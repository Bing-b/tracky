// ============================================================================
// Tracky - Professional DOM Session Recorder & Diagnostic Reporter
// Engineered with Hallmark Design Principles: Tactile, Focused & High-Fidelity
// ============================================================================

(function () {
  if (window.__tracky_injected__) return;
  window.__tracky_injected__ = true;

  console.log("[Tracky] Professional Content Script Initialized.");

  let recorderEnabled = true;
  let isRecording = false;
  let events = [];
  let consoleLogs = [];
  let stopFn = null;
  let container = null;
  let recordingStartTime = 0;
  let timerInterval = null;
  let originalConsole = null;
  let errorHandler = null;
  let rejectionHandler = null;

  // --- SVG Icons (Tactile & Clean) ---
  const ICONS = {
    REC: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>`,
    STOP: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor"/></svg>`,
    EXPORT: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    TRASH: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    PIN: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>`,
    DRAG: `<svg width="16" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.45"><circle cx="8" cy="6" r="1.5" fill="currentColor"/><circle cx="16" cy="6" r="1.5" fill="currentColor"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="12" r="1.5" fill="currentColor"/><circle cx="8" cy="18" r="1.5" fill="currentColor"/><circle cx="16" cy="18" r="1.5" fill="currentColor"/></svg>`,
    LOGO: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="#2563eb"/><path d="M7 9 L7 7 L9 7 M17 9 L17 7 L15 7 M7 15 L7 17 L9 17 M17 15 L17 17 L15 17" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="#ffffff"/><circle cx="12" cy="12" r="1.5" fill="#ef4444"/></svg>`
  };

  // --- Format Seconds to MM:SS ---
  const formatDuration = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // --- Hook Console Logs & Errors (DevTools Grade Diagnostics) ---
  const startDiagnosticHooking = () => {
    consoleLogs = [];

    // Hook window errors
    errorHandler = (event) => {
      if (!isRecording) return;
      const logItem = {
        level: "error",
        message: event.message || "Uncaught Error",
        source: `${event.filename || ""}:${event.lineno || 0}:${event.colno || 0}`,
        stack: event.error ? event.error.stack : null,
        timestamp: Date.now(),
        relTime: Date.now() - recordingStartTime
      };
      consoleLogs.push(logItem);
      if (typeof rrweb !== "undefined" && rrweb.record && rrweb.record.addCustomEvent) {
        rrweb.record.addCustomEvent("tracky:console", logItem);
      }
    };
    window.addEventListener("error", errorHandler);

    // Hook unhandled promise rejections
    rejectionHandler = (event) => {
      if (!isRecording) return;
      const logItem = {
        level: "error",
        message: `Unhandled Promise: ${event.reason?.message || event.reason || "Rejected"}`,
        source: "Promise",
        stack: event.reason?.stack || null,
        timestamp: Date.now(),
        relTime: Date.now() - recordingStartTime
      };
      consoleLogs.push(logItem);
      if (typeof rrweb !== "undefined" && rrweb.record && rrweb.record.addCustomEvent) {
        rrweb.record.addCustomEvent("tracky:console", logItem);
      }
    };
    window.addEventListener("unhandledrejection", rejectionHandler);

    // Intercept console.error & console.warn
    if (!originalConsole) {
      originalConsole = {
        error: console.error,
        warn: console.warn
      };
      console.error = function (...args) {
        if (isRecording) {
          const logItem = {
            level: "error",
            message: args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
            source: "console.error",
            timestamp: Date.now(),
            relTime: Date.now() - recordingStartTime
          };
          consoleLogs.push(logItem);
          if (typeof rrweb !== "undefined" && rrweb.record && rrweb.record.addCustomEvent) {
            rrweb.record.addCustomEvent("tracky:console", logItem);
          }
        }
        originalConsole.error.apply(console, args);
      };

      console.warn = function (...args) {
        if (isRecording) {
          const logItem = {
            level: "warn",
            message: args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
            source: "console.warn",
            timestamp: Date.now(),
            relTime: Date.now() - recordingStartTime
          };
          consoleLogs.push(logItem);
          if (typeof rrweb !== "undefined" && rrweb.record && rrweb.record.addCustomEvent) {
            rrweb.record.addCustomEvent("tracky:console", logItem);
          }
        }
        originalConsole.warn.apply(console, args);
      };
    }
  };

  const stopDiagnosticHooking = () => {
    if (errorHandler) window.removeEventListener("error", errorHandler);
    if (rejectionHandler) window.removeEventListener("unhandledrejection", rejectionHandler);
    if (originalConsole) {
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      originalConsole = null;
    }
  };

  // --- Add Manual Marker/Bookmark ---
  const addMarker = (title = "用户标记关键点") => {
    if (!isRecording) return;
    const marker = {
      level: "marker",
      message: title,
      timestamp: Date.now(),
      relTime: Date.now() - recordingStartTime
    };
    consoleLogs.push(marker);
    if (typeof rrweb !== "undefined" && rrweb.record && rrweb.record.addCustomEvent) {
      rrweb.record.addCustomEvent("tracky:marker", marker);
    }
    showToast("📌 已在时间线标记关键帧");
  };

  // --- Subtle Toast Notification ---
  const showToast = (msg) => {
    const toast = document.createElement("div");
    toast.className = "tracky-toast tracky-ignore";
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "28px",
      right: "28px",
      backgroundColor: "#111827",
      color: "#ffffff",
      padding: "8px 16px",
      borderRadius: "9999px",
      fontSize: "12px",
      fontWeight: "600",
      letterSpacing: "-0.01em",
      boxShadow: "0 10px 25px -4px rgba(0,0,0,0.2), 0 4px 6px -2px rgba(0,0,0,0.1)",
      zIndex: "2147483647",
      pointerEvents: "none",
      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      opacity: "0",
      transform: "translateY(10px)"
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      setTimeout(() => toast.remove(), 250);
    }, 2200);
  };

  // --- Create Hallmark-Styled Floating Console ---
  const createUI = () => {
    if (document.getElementById("tracky-floating-console")) return;

    container = document.createElement("div");
    container.id = "tracky-floating-console";
    container.classList.add("tracky-ignore");

    const savedTop = localStorage.getItem("tracky_ui_top") || "45%";

    // Hallmark Modern-Minimal Glass Pill
    Object.assign(container.style, {
      position: "fixed",
      right: "0px",
      top: savedTop,
      transform: savedTop === "45%" ? "translateY(-50%)" : "none",
      zIndex: "2147483646",
      backgroundColor: "rgba(17, 24, 39, 0.88)",
      backdropFilter: "blur(20px) saturate(190%)",
      webkitBackdropFilter: "blur(20px) saturate(190%)",
      border: "1px solid rgba(255, 255, 255, 0.16)",
      borderRight: "none",
      borderRadius: "20px 0 0 20px",
      padding: "8px 7px 10px 7px",
      boxShadow: "0 12px 32px -4px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "7px",
      width: "46px",
      boxSizing: "border-box",
      userSelect: "none",
      transition: "box-shadow 0.25s, opacity 0.25s",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Plus Jakarta Sans", sans-serif',
      opacity: "0.92"
    });

    container.onmouseenter = () => { container.style.opacity = "1"; };
    container.onmouseleave = () => { container.style.opacity = "0.92"; };

    // 1. Drag Handle
    const dragHandle = document.createElement("div");
    dragHandle.innerHTML = ICONS.DRAG;
    dragHandle.title = "拖拽调整位置";
    Object.assign(dragHandle.style, {
      width: "100%",
      display: "flex",
      justifyContent: "center",
      cursor: "grab",
      paddingTop: "2px",
      paddingBottom: "2px",
      color: "rgba(255, 255, 255, 0.6)"
    });

    // 2. Button Generator (Tactile 8-State Compliant)
    const createBtn = (iconHtml, defaultBg, tooltip) => {
      const btn = document.createElement("button");
      btn.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;">${iconHtml}</span>`;
      btn.title = tooltip;
      Object.assign(btn.style, {
        width: "32px",
        height: "32px",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "10px",
        cursor: "pointer",
        transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        backgroundColor: defaultBg,
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: "0",
        outline: "none",
        position: "relative"
      });

      btn.onmouseenter = () => {
        if (!btn.disabled) {
          btn.style.transform = "translateY(-1px) scale(1.06)";
          btn.style.borderColor = "rgba(255, 255, 255, 0.35)";
        }
      };
      btn.onmouseleave = () => {
        btn.style.transform = "none";
        btn.style.borderColor = "rgba(255, 255, 255, 0.12)";
      };
      btn.onmousedown = () => {
        if (!btn.disabled) btn.style.transform = "translateY(1px) scale(0.96)";
      };
      btn.onmouseup = () => {
        if (!btn.disabled) btn.style.transform = "none";
      };
      return btn;
    };

    const btnStart = createBtn(ICONS.REC, "#2563eb", "开始录制 (Alt+R)");
    const btnPin = createBtn(ICONS.PIN, "rgba(255, 255, 255, 0.12)", "在时间轴标记关键点 (Alt+M)");
    const btnExport = createBtn(ICONS.EXPORT, "rgba(255, 255, 255, 0.08)", "导出完整诊断报告 (Alt+E)");
    const btnTrash = createBtn(ICONS.TRASH, "rgba(255, 255, 255, 0.08)", "清除本次记录");

    btnPin.style.display = "none";
    btnExport.disabled = true;
    btnTrash.disabled = true;

    // 3. Dynamic Digital Timer Pill
    const timerDisplay = document.createElement("div");
    timerDisplay.className = "tracky-timer";
    timerDisplay.textContent = "00:00";
    Object.assign(timerDisplay.style, {
      fontSize: "10px",
      fontWeight: "700",
      fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
      color: "#f87171",
      display: "none",
      letterSpacing: "0.02em",
      padding: "2px 0",
      textAlign: "center",
      textShadow: "0 0 8px rgba(239, 68, 68, 0.4)"
    });

    // 4. Events Counter Badge
    const badge = document.createElement("div");
    Object.assign(badge.style, {
      fontSize: "9px",
      fontWeight: "700",
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      color: "rgba(255, 255, 255, 0.75)",
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      padding: "2px 4px",
      borderRadius: "6px",
      letterSpacing: "0.02em",
      display: "none",
      textAlign: "center",
      border: "1px solid rgba(255, 255, 255, 0.08)"
    });

    container.append(dragHandle, btnStart, timerDisplay, btnPin, btnExport, btnTrash, badge);
    document.body.appendChild(container);

    // --- Vertical-Only Dragging Logic ---
    let isDragging = false;
    let dragOffsetY = 0;

    container.onmousedown = (e) => {
      if (e.target.closest("button")) return;
      isDragging = true;
      dragHandle.style.cursor = "grabbing";
      container.style.cursor = "grabbing";
      container.style.transition = "none";

      const rect = container.getBoundingClientRect();
      dragOffsetY = e.clientY - rect.top;
      container.style.transform = "none";
      container.style.top = rect.top + "px";
      e.preventDefault();
    };

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const y = e.clientY - dragOffsetY;
      const minY = 16;
      const maxY = window.innerHeight - container.offsetHeight - 16;
      const finalY = Math.max(minY, Math.min(y, maxY));
      container.style.top = finalY + "px";
      container.style.right = "0px";
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        dragHandle.style.cursor = "grab";
        container.style.cursor = "default";
        container.style.transition = "box-shadow 0.25s, opacity 0.25s";
        localStorage.setItem("tracky_ui_top", container.style.top);
      }
    });

    // --- Update UI State ---
    const updateUI = () => {
      if (isRecording) {
        btnStart.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;">${ICONS.STOP}</span>`;
        btnStart.style.backgroundColor = "#ef4444";
        btnStart.style.borderColor = "rgba(239, 68, 68, 0.5)";
        btnStart.style.boxShadow = "0 0 16px rgba(239, 68, 68, 0.45)";
        btnStart.title = "停止录制 (Alt+R)";

        timerDisplay.style.display = "block";
        btnPin.style.display = "flex";

        btnExport.disabled = true;
        btnExport.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
        btnExport.style.color = "rgba(255, 255, 255, 0.3)";
        btnExport.style.borderColor = "transparent";

        btnTrash.disabled = true;
        btnTrash.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
        btnTrash.style.color = "rgba(255, 255, 255, 0.3)";
        btnTrash.style.borderColor = "transparent";
      } else {
        btnStart.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;">${ICONS.REC}</span>`;
        btnStart.style.backgroundColor = "#2563eb";
        btnStart.style.borderColor = "rgba(255, 255, 255, 0.15)";
        btnStart.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.35)";
        btnStart.title = "开始录制 (Alt+R)";

        timerDisplay.style.display = "none";
        btnPin.style.display = "none";

        if (events.length > 0) {
          btnExport.disabled = false;
          btnExport.style.backgroundColor = "#059669";
          btnExport.style.color = "#ffffff";
          btnExport.style.borderColor = "rgba(16, 185, 129, 0.4)";
          btnExport.style.boxShadow = "0 4px 12px rgba(5, 150, 105, 0.35)";

          btnTrash.disabled = false;
          btnTrash.style.backgroundColor = "#d97706";
          btnTrash.style.color = "#ffffff";
          btnTrash.style.borderColor = "rgba(245, 158, 11, 0.4)";
          btnTrash.style.boxShadow = "0 4px 12px rgba(217, 119, 6, 0.35)";
        } else {
          btnExport.disabled = true;
          btnExport.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
          btnExport.style.color = "rgba(255, 255, 255, 0.3)";
          btnExport.style.borderColor = "transparent";
          btnExport.style.boxShadow = "none";

          btnTrash.disabled = true;
          btnTrash.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
          btnTrash.style.color = "rgba(255, 255, 255, 0.3)";
          btnTrash.style.borderColor = "transparent";
          btnTrash.style.boxShadow = "none";
        }
      }

      if (events.length > 0) {
        badge.style.display = "block";
        badge.innerText = events.length > 999
          ? (events.length / 1000).toFixed(1) + "k"
          : events.length;
      } else {
        badge.style.display = "none";
      }
    };

    // --- Toggle Record Function ---
    const toggleRecord = () => {
      if (isRecording) {
        // Stop
        isRecording = false;
        clearInterval(timerInterval);
        stopDiagnosticHooking();
        if (stopFn) {
          try { stopFn(); } catch (e) { console.warn(e); }
          stopFn = null;
        }
        updateUI();
        showToast(`录制完成 · 已采集 ${events.length} 个 DOM 事件`);
      } else {
        // Start
        if (events.length > 0) {
          if (!confirm("重新录制将清空此前采集的会话数据。是否继续？")) return;
        }
        if (typeof rrweb === "undefined" || !rrweb.record) {
          return alert("[Tracky] rrweb 引擎尚未就绪，请刷新重试");
        }

        events = [];
        consoleLogs = [];
        recordingStartTime = Date.now();
        isRecording = true;

        startDiagnosticHooking();

        // High-Fidelity Recording Setup
        try {
          stopFn = rrweb.record({
            emit: (e) => events.push(e),
            sampling: {
              mousemove: 25,          // Smooth cursor trajectory
              mouseInteraction: true, // Complete gesture capture
              scroll: 120,            // Smooth scroll tracking
              input: "last",          // Efficient input throttle
              canvas: "all"           // Capture chart canvas animations (AntV G6 / ECharts)
            },
            recordCanvas: true,
            inlineStylesheet: true,   // Capture stylesheets to prevent CORS layout breakage
            collectFonts: true,       // Capture remote fonts to prevent garbled text
            blockClass: "tracky-block",
            ignoreClass: "tracky-ignore",
            maskInputOptions: { password: true },
            checkoutEveryNms: 60000
          });
        } catch (err) {
          console.error("[Tracky] 启动录制异常:", err);
          isRecording = false;
          stopDiagnosticHooking();
          return alert("启动录制失败，请查看控制台日志");
        }

        // Ticking timer
        timerDisplay.textContent = "00:00";
        timerInterval = setInterval(() => {
          const elapsed = Date.now() - recordingStartTime;
          timerDisplay.textContent = formatDuration(elapsed);
        }, 500);

        updateUI();
        showToast("🔴 Tracky 已开始录制 (按 Alt+R 可停止)");
      }
    };

    btnStart.onclick = toggleRecord;
    btnPin.onclick = () => addMarker();

    // --- Export Self-Contained Diagnostic Report ---
    const exportHtmlReport = () => {
      if (events.length < 2) return alert("记录的数据过少，请多在页面上操作几下再导出");
      
      if (isRecording) {
        toggleRecord();
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
      const timeStr = now.toLocaleTimeString("zh-CN", { hour12: false });
      const filename = `tracky_diagnostic_${now.toISOString().replace(/[:.]/g, "-").slice(0, 19)}.html`;

      const serializedEvents = JSON.stringify(events).replace(/</g, "\\u003c");
      const serializedLogs = JSON.stringify(consoleLogs).replace(/</g, "\\u003c");

      // Environment Meta
      const metaInfo = {
        url: window.location.href,
        title: document.title || "Untitled",
        userAgent: navigator.userAgent,
        screen: `${window.screen.width} × ${window.screen.height}`,
        viewport: `${window.innerWidth} × ${window.innerHeight}`,
        eventsCount: events.length,
        errorsCount: consoleLogs.filter(l => l.level === "error").length,
        durationMs: events.length > 0 ? (events[events.length - 1].timestamp - events[0].timestamp) : 0
      };

      // Hallmark 1:1 Professional Diagnostic Report HTML Template
      const reportHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tracky 诊断回放 · ${metaInfo.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/style.css">
  <script src="https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/index.js"></script>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #111827;
      --surface: #1e293b;
      --border: rgba(255, 255, 255, 0.1);
      --border-subtle: rgba(255, 255, 255, 0.06);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --danger: #f87171;
      --warn: #fbbf24;
      --success: #34d399;
      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: var(--bg);
      color: var(--text-main);
      font-family: var(--font-sans);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* TOP WORKSPACE NAV */
    header {
      height: 52px;
      background: rgba(17, 24, 39, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      z-index: 50;
    }

    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #111827;
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .brand-title {
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand-badge {
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--accent);
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 2px 8px;
      border-radius: 9999px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .meta-strip {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 0.78rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .meta-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--success);
    }
    .meta-dot.has-error {
      background: var(--danger);
      box-shadow: 0 0 8px rgba(248, 113, 113, 0.6);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-action {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-action:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.25);
    }

    /* MAIN STAGE */
    .workbench-stage {
      flex: 1;
      width: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      background: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px);
      background-size: 24px 24px;
    }

    .player-mount-container {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
      overflow: auto;
      position: relative;
    }

    /* Professional Player Frame (Zero Distortion, 1:1 Pixel Sharpness) */
    #v {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border);
      overflow: hidden;
      transition: width 0.25s, height 0.25s;
    }

    /* Surgical Polish on rrweb-player without destroying scaling or timeline */
    .rr-player {
      border: none !important;
      background: #ffffff !important;
    }
    .rr-controller {
      background: rgba(17, 24, 39, 0.95) !important;
      backdrop-filter: blur(12px) !important;
      color: #ffffff !important;
      border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
      padding: 6px 16px !important;
      height: 48px !important;
    }
    .rr-timeline__finished {
      background: var(--accent) !important;
    }
    .rr-timeline__handler {
      background: var(--accent) !important;
      border: 2px solid #ffffff !important;
    }

    /* Click Ripple Visualizer */
    .rr-replayer-mouse {
      width: 14px !important;
      height: 14px !important;
      background: rgba(56, 189, 248, 0.85) !important;
      border: 2px solid #ffffff !important;
      border-radius: 50% !important;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.6) !important;
      margin-left: -7px !important;
      margin-top: -7px !important;
      transition: transform 0.05s ease-out !important;
    }

    /* BOTTOM DIAGNOSTIC DRAWER */
    .drawer {
      height: 180px;
      background: var(--card-bg);
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      transition: height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 40;
    }
    .drawer.collapsed {
      height: 38px;
    }

    .drawer-header {
      height: 38px;
      padding: 0 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
      cursor: pointer;
      user-select: none;
      background: rgba(255, 255, 255, 0.02);
    }
    .drawer-tabs {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .drawer-tab {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .drawer-tab.active {
      color: var(--text-main);
    }
    .badge-count {
      padding: 1px 6px;
      border-radius: 9999px;
      font-size: 0.68rem;
      font-family: var(--font-mono);
      font-weight: 700;
    }
    .badge-error { background: rgba(248, 113, 113, 0.2); color: var(--danger); }
    .badge-info { background: rgba(56, 189, 248, 0.2); color: var(--accent); }

    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 12px 20px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .log-row {
      display: flex;
      align-items: baseline;
      gap: 12px;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.02);
      border-left: 3px solid transparent;
      cursor: pointer;
      transition: background 0.15s;
    }
    .log-row:hover { background: rgba(255, 255, 255, 0.06); }
    .log-row.error { border-left-color: var(--danger); color: #fca5a5; }
    .log-row.warn { border-left-color: var(--warn); color: #fde047; }
    .log-row.marker { border-left-color: var(--accent); color: #7dd3fc; }

    .log-time { color: var(--text-muted); font-size: 0.7rem; }
    .log-msg { flex: 1; word-break: break-all; }
  </style>
</head>
<body>

  <!-- TOP HEADER -->
  <header>
    <div class="brand-wrap">
      <div class="brand-logo">${ICONS.LOGO}</div>
      <span class="brand-title">Tracky 录制回放</span>
      <span class="brand-badge">DOM 1:1 诊断</span>
    </div>

    <div class="meta-strip">
      <div class="meta-item">
        <span class="meta-dot ${metaInfo.errorsCount > 0 ? "has-error" : ""}"></span>
        <span>${metaInfo.errorsCount > 0 ? metaInfo.errorsCount + " 项异常" : "运行正常"}</span>
      </div>
      <div class="meta-item">
        <span>视口: ${metaInfo.viewport}</span>
      </div>
      <div class="meta-item">
        <span>时间: ${dateStr} ${timeStr}</span>
      </div>
    </div>

    <div class="header-actions">
      <button class="btn-action" id="btn-toggle-fit" title="切换视口缩放">
        <span>自适应视口</span>
      </button>
      <button class="btn-action" id="btn-export-json" title="导出原始事件流数据">
        <span>导出 JSON</span>
      </button>
    </div>
  </header>

  <!-- WORKBENCH STAGE -->
  <div class="workbench-stage">
    <div class="player-mount-container" id="stage-wrapper">
      <div id="v"></div>
    </div>

    <!-- DIAGNOSTIC DRAWER -->
    <div class="drawer" id="drawer">
      <div class="drawer-header" id="drawer-header">
        <div class="drawer-tabs">
          <div class="drawer-tab active">
            <span>控制台日志与关键帧</span>
            <span class="badge-count ${metaInfo.errorsCount > 0 ? 'badge-error' : 'badge-info'}">
              ${consoleLogs.length}
            </span>
          </div>
        </div>
        <span style="font-size:0.75rem; color:var(--text-muted);">
          点击展开/收起 ⬍
        </span>
      </div>

      <div class="drawer-body" id="log-list">
        <!-- Injected by script -->
      </div>
    </div>
  </div>

  <script>
    const eventsData = ${serializedEvents};
    const logsData = ${serializedLogs};
    let playerInstance = null;
    let isFitMode = true;

    window.onload = () => {
      const metaEvent = eventsData.find(ev => ev.type === 4 && ev.data && ev.data.width);
      const recWidth = metaEvent ? metaEvent.data.width : window.innerWidth;
      const recHeight = metaEvent ? metaEvent.data.height : window.innerHeight;
      const startTime = eventsData[0] ? eventsData[0].timestamp : 0;

      // Populate Console Logs Drawer
      const logContainer = document.getElementById("log-list");
      if (logsData.length === 0) {
        logContainer.innerHTML = '<div style="color:var(--text-muted);padding:8px;">本次录制未捕获到任何控制台报错或用户标记。</div>';
      } else {
        logsData.forEach(item => {
          const row = document.createElement("div");
          row.className = "log-row " + item.level;
          const relSec = ((item.timestamp - startTime) / 1000).toFixed(1);
          row.innerHTML = \`
            <span class="log-time">[+\${relSec}s]</span>
            <span class="log-msg">\${item.message}</span>
            <span style="font-size:0.68rem;opacity:0.6;margin-left:auto;">点击跳转 ➔</span>
          \`;
          row.onclick = () => {
            if (playerInstance && playerInstance.player) {
              const targetTime = Math.max(0, item.timestamp - startTime);
              playerInstance.player.goto(targetTime);
              playerInstance.player.play();
            }
          };
          logContainer.appendChild(row);
        });
      }

      // Drawer Collapse Toggle
      const drawer = document.getElementById("drawer");
      document.getElementById("drawer-header").onclick = () => {
        drawer.classList.toggle("collapsed");
      };

      // Resizing Player with Mathematical Sharpness (No CSS Blur!)
      const renderPlayer = () => {
        const mount = document.getElementById("v");
        const stageWrapper = document.getElementById("stage-wrapper");
        const padding = 48;
        const availW = stageWrapper.clientWidth - padding;
        const availH = stageWrapper.clientHeight - padding - 48;

        let targetW, targetH;
        if (isFitMode) {
          const scale = Math.min(availW / recWidth, availH / recHeight, 1);
          targetW = Math.floor(recWidth * scale);
          targetH = Math.floor(recHeight * scale) + 48;
        } else {
          targetW = recWidth;
          targetH = recHeight + 48;
        }

        mount.style.width = targetW + 'px';
        mount.style.height = targetH + 'px';
        mount.innerHTML = '';

        playerInstance = new rrwebPlayer({
          target: mount,
          props: {
            events: eventsData,
            width: targetW,
            height: targetH,
            autoPlay: true,
            skipInactive: true, // Auto fast-forward dead air!
            speedOption: [1, 1.5, 2, 4, 8],
            UNSAFE_replayCanvas: true
          }
        });
      };

      renderPlayer();
      window.onresize = renderPlayer;

      // Fit mode toggle
      const btnFit = document.getElementById("btn-toggle-fit");
      btnFit.onclick = () => {
        isFitMode = !isFitMode;
        btnFit.textContent = isFitMode ? "自适应视口" : "1:1 原始尺寸";
        renderPlayer();
      };

      // Export Raw JSON
      document.getElementById("btn-export-json").onclick = () => {
        const jsonBlob = new Blob([JSON.stringify(eventsData, null, 2)], { type: "application/json" });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const a = document.createElement("a");
        a.href = jsonUrl;
        a.download = "${filename}".replace(".html", ".json");
        a.click();
        URL.revokeObjectURL(jsonUrl);
      };
    };
  </script>
</body>
</html>`;

      const blob = new Blob([reportHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      showToast(`✅ 诊断报告已导出: ${filename}`);
    };

    btnExport.onclick = exportHtmlReport;

    btnTrash.onclick = () => {
      if (confirm("确认清空当前已采集的所有 DOM 会话数据吗？")) {
        events = [];
        consoleLogs = [];
        clearInterval(timerInterval);
        isRecording = false;
        stopDiagnosticHooking();
        if (stopFn) {
          try { stopFn(); } catch (e) {}
          stopFn = null;
        }
        updateUI();
        showToast("已清空会话数据");
      }
    };

    // Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.altKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        toggleRecord();
      } else if (e.altKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (!isRecording && events.length > 0) {
          exportHtmlReport();
        }
      } else if (e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        if (isRecording) {
          addMarker();
        }
      }
    });
  };

  const removeUI = () => {
    if (isRecording && stopFn) {
      try { stopFn(); } catch (e) {}
      isRecording = false;
      stopDiagnosticHooking();
    }
    clearInterval(timerInterval);
    const existing = document.getElementById("tracky-floating-console");
    if (existing) existing.remove();
    container = null;
  };

  const initRecorder = () => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["enabled"], (result) => {
        recorderEnabled = result.enabled !== false;
        if (recorderEnabled) {
          if (typeof rrweb === "undefined" || !rrweb.record) {
            setTimeout(initRecorder, 300);
            return;
          }
          createUI();
        } else {
          removeUI();
        }
      });
    } else {
      // Standalone mode (Direct demo.html testing or non-extension environment)
      recorderEnabled = true;
      if (typeof rrweb === "undefined" || !rrweb.record) {
        setTimeout(initRecorder, 300);
        return;
      }
      createUI();
    }
  };

  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.enabled) {
        recorderEnabled = changes.enabled.newValue;
        if (recorderEnabled) initRecorder();
        else removeUI();
      }
    });
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    initRecorder();
  } else {
    window.addEventListener("load", initRecorder);
  }
})();
