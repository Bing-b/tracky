(function () {
    console.log('[Tracky] Content script loaded.');

    let recorderEnabled = true;
    let isRecording = false;
    let events = [];
    let stopFn = null;
    let container = null;

    // --- Icons ---
    const ICON_REC = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`;
    const ICON_STOP = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/></svg>`;
    const ICON_EXPORT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
    const LOGO_SVG_REPLAY = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="#007AFF"/><path d="M12 17V12M12 8H12.01" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="7" stroke="white" stroke-opacity="0.2" stroke-width="1.5"/></svg>`;

    const createUI = () => {
        if (document.getElementById('bug-recorder-console')) return;

        // --- Container (2-Button Vertical Side-Anchored) ---
        container = document.createElement('div');
        container.id = 'bug-recorder-console';
        container.classList.add('rr-ignore');

        const UI_HEIGHT = '84px'; // Fixed height for 2 buttons

        Object.assign(container.style, {
            position: 'fixed', right: '0px', top: '50%', transform: 'translateY(-50%)',
            zIndex: '2147483647',
            backgroundColor: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(24px) saturate(180%)',
            webkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            borderRight: 'none',
            borderRadius: '16px 0 0 16px',
            padding: '8px 6px',
            boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center',
            gap: '8px', height: UI_HEIGHT, width: '42px',
            boxSizing: 'border-box', overflow: 'hidden',
            opacity: '0.8', cursor: 'grab',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            userSelect: 'none', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        });

        const createBtn = (icon, color, active = true) => {
            const btn = document.createElement('button');
            btn.innerHTML = `<span style="display:flex; align-items:center; justify-content:center;">${icon}</span>`;
            Object.assign(btn.style, {
                width: '30px', height: '30px', border: 'none', borderRadius: '10px',
                cursor: 'pointer', transition: 'all 0.2s',
                backgroundColor: color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: active ? '1' : '0.4',
                boxShadow: active ? '0 4px 8px ' + color + '30' : 'none',
                flexShrink: '0'
            });
            btn.onmouseenter = (e) => {
                if (btn.style.opacity === '1') {
                    btn.style.transform = 'scale(1.08)';
                    btn.style.boxShadow = '0 6px 14px ' + color + '50';
                }
                e.stopPropagation();
            };
            btn.onmouseleave = (e) => {
                if (btn.style.opacity === '1') {
                    btn.style.transform = 'scale(1)';
                    btn.style.boxShadow = '0 4px 8px ' + color + '30';
                }
            };
            return btn;
        };

        const btnStart = createBtn(ICON_REC, '#007AFF');
        const btnExport = createBtn(ICON_EXPORT, '#34C759', false);
        btnExport.disabled = true;

        container.append(btnStart, btnExport);
        document.body.appendChild(container);

        // --- Interaction Logic ---
        container.onmouseenter = () => container.style.opacity = '1';
        container.onmouseleave = () => container.style.opacity = '0.8';

        // Vertical-only drag logic (Locked to Right Edge)
        let isDragging = false, dragOffsetY = 0;
        container.onmousedown = (e) => {
            if (e.target.closest('button')) return;
            isDragging = true;
            dragOffsetY = e.clientY - container.getBoundingClientRect().top;
            container.style.cursor = 'grabbing';
            container.style.transition = 'none';
            e.preventDefault();
        };
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const y = e.clientY - dragOffsetY;
            const minY = 10;
            const maxY = window.innerHeight - container.offsetHeight - 10;
            const finalY = Math.max(minY, Math.min(y, maxY));

            container.style.top = finalY + 'px';
            container.style.transform = 'none';
            container.style.bottom = 'auto';
            container.style.right = '0px';
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                container.style.cursor = 'grab';
                container.style.transition = 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
            }
        });

        // --- Pulse effect ---
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes br-pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.4); opacity: 0.6; }
                100% { transform: scale(1); opacity: 1; }
            }
            .br-recording-dot { animation: br-pulse 1.2s infinite ease-in-out; }
        `;
        document.head.appendChild(style);

        const updateUI = () => {
            if (isRecording) {
                btnStart.innerHTML = `<span style="display:flex; align-items:center; justify-content:center;">${ICON_STOP}</span>`;
                btnStart.style.backgroundColor = '#FF3B30';
                btnStart.style.boxShadow = '0 4px 10px rgba(255, 59, 48, 0.3)';
                btnExport.disabled = true;
                btnExport.style.opacity = '0.4';
                btnExport.style.boxShadow = 'none';
            } else {
                btnStart.innerHTML = `<span style="display:flex; align-items:center; justify-content:center;">${ICON_REC}</span>`;
                btnStart.style.backgroundColor = '#007AFF';
                btnStart.style.boxShadow = '0 4px 10px rgba(0, 122, 255, 0.3)';
                if (events.length > 0) {
                    btnExport.disabled = false;
                    btnExport.style.opacity = '1';
                    btnExport.style.boxShadow = '0 4px 10px rgba(52, 199, 89, 0.3)';
                } else {
                    btnExport.disabled = true;
                    btnExport.style.opacity = '0.4';
                    btnExport.style.boxShadow = 'none';
                }
            }
        };

        let uiTimer = null;
        const scheduleUIUpdate = () => {
            if (uiTimer) return;
            uiTimer = setInterval(() => {
                updateUI();
                if (!isRecording) { clearInterval(uiTimer); uiTimer = null; }
            }, 1000);
        };

        const exportHtml = () => {
            if (events.length < 2) return alert('数据不足，请多操作几下页面');
            const now = new Date();
            const dateStr = now.toLocaleDateString();
            const timeStr = now.toLocaleTimeString();
            const filename = `tracky_report_${now.toISOString().replace(/[:.]/g, '-')}.html`;

            const dataStr = JSON.stringify(events).replace(/</g, '\\u003c');

            const LOGO_SVG = LOGO_SVG_REPLAY;

            const template = `<!DOCTYPE html><html><head><meta charset="UTF-8">
            <title>Tracky 记录回放 - ${dateStr} ${timeStr}</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/style.css">
            <script src="https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/index.js"></script>
            <style>
                body { margin:0; background:#f5f5f7; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display:flex; flex-direction:column; height:100vh; overflow:hidden; color:#1d1d1f; }
                .header-bar { width:100%; background:rgba(255,255,255,0.8); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); padding:0 32px; box-sizing:border-box; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(0,0,0,0.06); height:48px; flex-shrink:0; z-index:100; }
                .header-title-wrap { display:flex; align-items:center; gap:12px; }
                .header-title { font-size:16px; font-weight:700; letter-spacing:-0.02em; }
                .header-meta { font-size:12px; color:#86868b; font-weight:500; }
                .player-viewport { flex:1; width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f2f2f7; position:relative; overflow:hidden; padding:20px 40px; box-sizing:border-box; }
                
                /* Invert rrweb-player layout & Apple Style */
                #v { background:#fff; border-radius:10px; box-shadow:0 30px 70px rgba(0,0,0,0.12); overflow:hidden; }
                .rr-player { border:none !important; background:#fff !important; display:flex !important; flex-direction:column-reverse !important; width:100% !important; height:100% !important; }
                .rr-controller { 
                    border-top: none !important; 
                    border-bottom: 1px solid rgba(0,0,0,0.05) !important; 
                    background: #fff !important;
                    padding: 8px 16px !important;
                }
                .rr-timeline { height: 4px !important; }
                .rr-timeline__finished { background: #007AFF !important; }
                .rr-timeline__handler { background: #007AFF !important; border: 2px solid #fff !important; }
                
                /* Surgical cleanup of internal UI */
                .rr-controller__btns > .svelte-19ke1iv:last-child { display: none !important; }
                .rr-controller__btns > .switch { display: none !important; }
                .rr-controller {flex-direction:row-reverse !important; justify-content:center !important; height:40px !important;}
                .rr-timeline {width:50% !important;}
                /* Scale reduction for better fit - User preferred 0.79 */
                /* transform-origin: top ensures we don't bleed into the controller if it's at the top, center keeps it centered */
                .rr-replayer-wrapper { transform: scale(0.79) !important; transform-origin: center center !important; flex: 1 !important; display: flex !important; align-items: center !important; justify-content: center !important; overflow: hidden !important; }

                /* High-visibility Tracky Blue Cursor */
                .rr-replayer-mouse {
                    width: 14px !important;
                    height: 14px !important;
                    background: rgba(0, 122, 255, 0.8) !important;
                    border: 2px solid #fff !important;
                    border-radius: 50% !important;
                    box-shadow: 0 0 10px rgba(0, 122, 255, 0.5) !important;
                    margin-left: -7px !important;
                    margin-top: -7px !important;
                    opacity: 1 !important;
                }
            </style>
            </head><body>
            <div class="header-bar">
                <div class="header-title-wrap">
                    ${LOGO_SVG}
                    <div class="header-title">Tracky 记录回放</div>
                </div>
                <div class="header-meta">${dateStr} ${timeStr}</div>
            </div>
            <div class="player-viewport">
                <div id="v"></div>
            </div>
            <script>
            const e = ${dataStr};
            window.onload = () => {
                const metaEvent = e.find(ev => ev.type === 4 && ev.data && ev.data.width);
                const recWidth = metaEvent ? metaEvent.data.width : window.innerWidth;
                const recHeight = metaEvent ? metaEvent.data.height : window.innerHeight;
                
                const resizePlayer = () => {
                    const margin = 28;
                    const controllerHeight = 40; 
                    const headerHeight = 48;
                    const verticalPadding = 80; // Even larger padding for absolute safety
                    const availableW = window.innerWidth - (margin * 2);
                    const availableH = window.innerHeight - headerHeight - verticalPadding - controllerHeight; 
                    
                    const scale = Math.min(availableW / recWidth, availableH / recHeight, 1);
                    const playerW = Math.floor(recWidth * scale);
                    const playerH = Math.floor(recHeight * scale) + controllerHeight;

                    const mountPoint = document.getElementById("v");
                    mountPoint.style.width = playerW + 'px';
                    mountPoint.style.height = playerH + 'px';
                    mountPoint.innerHTML = '';
                    new rrwebPlayer({ 
                        target: mountPoint, 
                        props: { 
                            events: e, 
                            width: playerW, 
                            height: playerH, 
                            autoPlay: true, 
                            UNSAFE_replayCanvas: true 
                        } 
                    });
                };
                
                resizePlayer();
                window.onresize = resizePlayer;
            };</script></body></html>`;

            const blob = new Blob([template], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
        };

        btnStart.onclick = () => {
            if (isRecording) {
                // Stop
                isRecording = false;
                if (stopFn) stopFn();
                updateUI();
            } else {
                // Start
                try {
                    events = [];
                    isRecording = true;
                    if (typeof rrweb === 'undefined') return alert('rrweb 未就绪');
                    stopFn = rrweb.record({
                        emit: (e) => events.push(e),
                        sampling: { mousemove: 20, mouseInteraction: { MouseUp: true, MouseDown: true, Click: true }, scroll: 150, input: 'all', canvas: 30 },
                        blockClass: 'rr-block', ignoreClass: 'rr-ignore', recordCanvas: true, checkoutEveryNms: 60000,
                    });
                    updateUI();
                    scheduleUIUpdate();
                } catch (err) { console.error(err); }
            }
        };

        btnExport.onclick = () => {
            if (isRecording) { isRecording = false; if (stopFn) stopFn(); }
            exportHtml();
            updateUI();
        };
    };

    const removeUI = () => {
        if (isRecording && stopFn) { stopFn(); isRecording = false; }
        const existing = document.getElementById('bug-recorder-console');
        if (existing) existing.remove();
        container = null;
    };

    const initRecorder = () => {
        chrome.storage.local.get(['enabled'], (result) => {
            recorderEnabled = result.enabled !== false;
            if (recorderEnabled) {
                if (typeof rrweb === 'undefined' || !rrweb.record) {
                    setTimeout(initRecorder, 300);
                    return;
                }
                createUI();
            } else {
                removeUI();
            }
        });
    };

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.enabled) {
            recorderEnabled = changes.enabled.newValue;
            if (recorderEnabled) initRecorder();
            else removeUI();
        }
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') initRecorder();
    else window.addEventListener('load', initRecorder);
})();
