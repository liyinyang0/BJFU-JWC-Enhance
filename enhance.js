// ==UserScript==
// @name         北林教务增强助手 V1 | 支持自动评教
// @namespace    http://tampermonkey.net/
// @version      1.0.0.0
// @description  在合适的地方显示老师说明及课程学分情况，并自动刷新登录状态。同时支持自动评教与批量提交。
// @match        http://newjwxt.bjfu.edu.cn/*
// @match        https://newjwxt.bjfu.edu.cn/*
// @grant        unsafeWindow
// @author       Light (adapted for BFU)
// @license      MIT
// @supportURL   https://github.com/liyinyang0/BJFU-JWC-Enhance
// ==/UserScript==

(() => {
  // src/config/constants.js
  var DEBUG_CONFIG = {
    enabled: true,
    level: 3
  };
  var PROJECT_URL = "https://github.com/liyinyang0/BJFU-JWC-Enhance";

  // src/core/log-panel-ui.js
  var LogPanelUI = {
    container: null,
    body: null,
    initialized: false,
    queue: [],
    _statusQueue: [],
    _statusPlaying: false,
    init() {
      if (this.initialized || !document.body) return;
      const style = document.createElement("style");
      style.textContent = `
            #bjfu-enhance-log {
                position: fixed; bottom: 0; left: 20px; width: 320px;
                background: #fff; border: 1px solid #e2e8f0; border-bottom: none;
                border-radius: 10px 10px 0 0; box-shadow: 0 -2px 15px rgba(0,0,0,0.08);
                z-index: 10001; font-family: 'SFMono-Regular', Consolas, monospace;
                display: flex; flex-direction: column; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            #bjfu-enhance-log.minimized { transform: translateY(calc(100% - 38px)); }
            #bjfu-enhance-log-hd {
                padding: 10px 15px; background: #f7fafc; border-bottom: 1px solid #e2e8f0;
                cursor: pointer; display: flex; align-items: center; justify-content: space-between;
                border-radius: 10px 10px 0 0; user-select: none; gap: 10px;
            }
            #bjfu-enhance-log-hd b { font-size: 13px; color: #2d3748; display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
            #nel-status-text { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; flex: 1; }
            #bjfu-enhance-log-body {
                height: 220px; overflow-y: auto; background: #fdfdfd; font-size: 11px;
                padding: 4px 0; scroll-behavior: smooth;
            }
            .nel-btn { font-size: 11px; color: #718096; background: #edf2f7; padding: 2px 8px; border-radius: 4px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
            .nel-btn:hover { background: #e2e8f0; color: #2d3748; }
            .nel-clear { background: rgba(245, 101, 101, 0.05); color: #c53030; }
            .nel-clear:hover { background: rgba(245, 101, 101, 0.15); color: #c53030; }
            .nel-line { padding: 3px 12px; border-bottom: 1px solid rgba(226, 232, 240, 0.4); display: flex; gap: 8px; align-items: flex-start; }
            .nel-line:hover { background: #f7fafc; }
            .nel-ts { color: #a0aec0; flex-shrink: 0; min-width: 55px; user-select: none; }
            .nel-lvl { font-weight: bold; flex-shrink: 0; min-width: 42px; text-align: center; font-size: 10px; }
            .nel-msg { color: #4a5568; word-break: break-all; flex: 1; line-height: 1.5; }
            .nel-error { border-left: 3px solid #e53e3e; background: rgba(229, 62, 62, 0.02); } .nel-error .nel-lvl { color: #e53e3e; }
            .nel-warn { border-left: 3px solid #dd6b20; background: rgba(221, 107, 32, 0.02); } .nel-warn .nel-lvl { color: #dd6b20; }
            .nel-success { border-left: 3px solid #38a169; background: rgba(56, 161, 105, 0.02); } .nel-success .nel-lvl { color: #38a169; }
            .nel-info { border-left: 3px solid #3182ce; } .nel-info .nel-lvl { color: #3182ce; }
            .nel-debug { border-left: 3px solid #9f7aea; color: #718096; } .nel-debug .nel-lvl { color: #9f7aea; }
        `;
      document.head.appendChild(style);
      this.container = document.createElement("div");
      this.container.id = "bjfu-enhance-log";
      this.container.className = "minimized";
      this.container.innerHTML = `
            <div id="bjfu-enhance-log-hd">
                <b><span id="nel-status-text">北林教务增强助手 V1</span></b>
                <span id="nel-clear-btn" class="nel-btn nel-clear" title="清空日志">清空</span>
                <span id="bjfu-log-toggle" class="nel-btn">展开 ▴</span>
            </div>
            <div id="bjfu-enhance-log-body"></div>
        `;
      document.body.appendChild(this.container);
      this.body = this.container.querySelector("#bjfu-enhance-log-body");
      this.initialized = true;
      this.container.querySelector("#bjfu-enhance-log-hd").onclick = (e) => {
        if (e.target.id === "nel-clear-btn") return;
        const isMin = this.container.classList.toggle("minimized");
        this.container.querySelector("#bjfu-log-toggle").textContent = isMin ? "展开 ▴" : "折叠 ▾";
      };
      this.container.querySelector("#nel-clear-btn").onclick = (e) => {
        e.stopPropagation();
        if (this.body) this.body.innerHTML = "";
        const statusText = this.container.querySelector("#nel-status-text");
        if (statusText) statusText.textContent = "日志已清空";
        this._statusQueue = [];
        this._statusPlaying = false;
      };
      if (this.queue.length > 0) {
        this.queue.forEach((item) => this.add(item.level, item.msg));
        this.queue = [];
      }
    },
    add(level, msg) {
      if (!this.initialized) {
        this.init();
        if (!this.initialized) {
          this.queue.push({ level, msg });
          return;
        }
      }
      if (!this.body) return;
      const labels = { error: "[ERR]", warn: "[WRN]", success: "[OK ]", info: "[INF]", debug: "[DBG]" };
      const lvlLabel = labels[level] || "[INF]";
      const ts = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const line = document.createElement("div");
      line.className = `nel-line nel-${level}`;
      line.innerHTML = `<span class="nel-ts">[${ts}]</span><span class="nel-lvl">${lvlLabel}</span><span class="nel-msg">${this.esc(msg)}</span>`;
      this.body.appendChild(line);
      if (this.body.children.length > 200) this.body.removeChild(this.body.firstChild);
      this.body.scrollTop = this.body.scrollHeight;
      this._statusQueue.push({ msg, level });
      if (!this._statusPlaying) {
        this._playStatusQueue();
      }
    },
    _playStatusQueue() {
      if (this._statusQueue.length === 0) {
        this._statusPlaying = false;
        const statusText2 = this.container && this.container.querySelector("#nel-status-text");
        if (statusText2) {
          statusText2.textContent = "北林教务增强助手 V1";
          statusText2.style.color = "#2d3748";
        }
        return;
      }
      this._statusPlaying = true;
      const { msg, level } = this._statusQueue.shift();
      const statusText = this.container && this.container.querySelector("#nel-status-text");
      if (statusText) {
        const colors = { error: "#e53e3e", warn: "#dd6b20", success: "#38a169", info: "#3182ce", debug: "#718096" };
        statusText.textContent = msg;
        statusText.style.color = colors[level] || "#2d3748";
      }
      setTimeout(() => {
        this._playStatusQueue();
      }, 300);
    },
    esc(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  };

  // src/core/logger.js
  var Logger = {
    LEVELS: { ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4 },
    log(level, message, ...args) {
      if (!DEBUG_CONFIG.enabled || level > DEBUG_CONFIG.level) return;
      const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      const levelNames = ["", "error", "warn", "info", "debug"];
      const lvlName = levelNames[level] || "info";
      console.log(`[${timestamp}] [北林教务助手]`, message, ...args);
      let displayMessage = message;
      if (args.length > 0) {
        const formattedArgs = args.map((arg) => {
          if (typeof arg === "object" && arg !== null) {
            try {
              return JSON.stringify(arg, null, 1).replace(/^{|}$/g, "").replace(/"/g, "").replace(/\n/g, " ");
            } catch (e) {
              return "[Object]";
            }
          }
          return String(arg);
        }).join(" ");
        displayMessage += " " + formattedArgs;
      }
      LogPanelUI.add(lvlName, displayMessage);
    },
    error(message, ...args) {
      this.log(this.LEVELS.ERROR, message, ...args);
    },
    warn(message, ...args) {
      this.log(this.LEVELS.WARN, message, ...args);
    },
    info(message, ...args) {
      this.log(this.LEVELS.INFO, message, ...args);
    },
    debug(message, ...args) {
      this.log(this.LEVELS.DEBUG, message, ...args);
    }
  };

  // src/core/promo-banner.js
  function showPromoBanner() {
    if (document.getElementById("bjfu-promo-line")) return;
    let insertTarget = null;
    let isLoginPage = false;
    const footer = document.getElementById("Footer1_divCopyright");
    if (footer) {
      insertTarget = footer;
    }
    if (!insertTarget) {
      const copyrightLink = document.querySelector('a.copyright[href*="qzdatasoft"]');
      if (copyrightLink && copyrightLink.parentElement && copyrightLink.parentElement.tagName === "TD") {
        insertTarget = copyrightLink.parentElement;
        isLoginPage = true;
      }
    }
    if (!insertTarget) return;
    const promoLine = document.createElement("div");
    promoLine.id = "bjfu-promo-line";
    if (!isLoginPage) {
      promoLine.className = "Nsb_pw";
    }
    promoLine.style.cssText = `
        padding: 8px 20px;
        text-align: center;
        font-size: 12px;
        color: #666;
    `;
    promoLine.innerHTML = `
        <strong>提示：</strong>欢迎使用<strong>北林教务增强助手</strong>。
        此脚本在本地运行，不会上传任何数据。如有问题请访问
        <a href="${PROJECT_URL}" target="_blank"
            style="color: #007bff; text-decoration: none;">GitHub 项目页</a>。
    `;
    insertTarget.parentNode.insertBefore(promoLine, insertTarget);
  }
  function initializePromoBanner() {
    const tryShow = () => {
      if (document.getElementById("bjfu-promo-line")) return true;
      const footer = document.getElementById("Footer1_divCopyright");
      const copyrightLink = document.querySelector('a.copyright[href*="qzdatasoft"]');
      if (footer || copyrightLink && copyrightLink.parentElement) {
        showPromoBanner();
        return true;
      }
      return false;
    };
    const hideUnusedElements = () => {
      const uselessImg = document.querySelector('img[src*="appewm.png"]');
      if (uselessImg) {
        uselessImg.style.display = "none";
      }
    };
    if (tryShow()) {
      hideUnusedElements();
      return;
    }
    const observer = new MutationObserver(() => {
      if (tryShow()) {
        hideUnusedElements();
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 5e3);
  }

  // src/core/ui-utils.js
  var activeModalCleanup = null;
  function createUnifiedModal(title, content, type = "info") {
    if (activeModalCleanup) {
      activeModalCleanup();
      activeModalCleanup = null;
    }
    const existingModal = document.getElementById("bjfuAssistantModal");
    if (existingModal) existingModal.remove();
    const container = document.createElement("div");
    container.id = "bjfuAssistantModal";
    const themeConfig = {
      warning: { accent: "#FF9500", accentLight: "rgba(255,149,0,0.12)" },
      success: { accent: "#34C759", accentLight: "rgba(52,199,89,0.12)" },
      info: { accent: "#007AFF", accentLight: "rgba(0,122,255,0.12)" }
    };
    const theme = themeConfig[type] || themeConfig.info;
    container.style.cssText = `
        position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: #ffffff;
        border: none; border-radius: 20px; padding: 0;
        box-shadow: 0 24px 80px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.08);
        z-index: 10000; min-width: 340px; max-width: 460px;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
        overflow: hidden; animation: bjfuFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    container.innerHTML = `
        <div id="dragHandle" style="padding: 24px 28px 20px 28px; cursor: move;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div style="font-size: 20px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.3px;">
                    ${title}
                </div>
                <button id="closeModalBtn" style="
                    width: 28px; height: 28px; border-radius: 50%;
                    border: none; background: #f5f5f7;
                    cursor: pointer; display: flex; align-items: center;
                    justify-content: center; color: #86868b;
                    font-size: 16px; transition: all 0.15s;
                    margin-left: 16px; flex-shrink: 0;
                ">×</button>
            </div>
            <div style="color: #424245; font-size: 14px; line-height: 1.65; font-weight: 400;">
                ${content}
            </div>
        </div>
        <div style="padding: 16px 28px 22px 28px; background: #f5f5f7; border-top: 1px solid #e5e5ea;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <a href="${PROJECT_URL}" target="_blank"
                    style="color: ${theme.accent}; text-decoration: none; font-weight: 500; font-size: 14px;">
                    查看使用说明
                </a>
            </div>
            <div style="
                padding: 12px 14px;
                background: ${theme.accentLight}; border-radius: 10px;
            ">
                <div style="font-size: 12px; color: #424245; line-height: 1.5;">
                    <strong style="color: ${theme.accent};">免责声明</strong> — 本工具仅供学习交流，数据仅供参考。请以教务处官网信息为准，使用本工具产生的任何后果由用户自行承担。
                </div>
            </div>
        </div>
    `;
    if (!document.getElementById("bjfuAssistantStyles")) {
      const style = document.createElement("style");
      style.id = "bjfuAssistantStyles";
      style.textContent = `
            @keyframes bjfuFadeIn {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
                to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            #closeModalBtn:hover { background: #e8e8ed; color: #1d1d1f; }
        `;
      document.head.appendChild(style);
    }
    const cleanupDrag = addDragFunctionality(container);
    document.body.appendChild(container);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      cleanupDrag();
      container.remove();
      if (activeModalCleanup === close) activeModalCleanup = null;
    };
    activeModalCleanup = close;
    const closeBtn = container.querySelector("#closeModalBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", close);
    }
    return container;
  }
  function addDragFunctionality(container) {
    let isDragging = false;
    let mouseStartX, mouseStartY, elemStartX, elemStartY;
    const dragHandle = container.querySelector("#dragHandle");
    function dragStart(e) {
      const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
      if (e.target === dragHandle || dragHandle.contains(e.target)) {
        const rect = container.getBoundingClientRect();
        elemStartX = rect.left;
        elemStartY = rect.top;
        mouseStartX = clientX;
        mouseStartY = clientY;
        isDragging = true;
        e.preventDefault();
      }
    }
    function drag(e) {
      if (!isDragging) return;
      e.preventDefault();
      const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
      const newLeft = elemStartX + (clientX - mouseStartX);
      const newTop = elemStartY + (clientY - mouseStartY);
      container.style.transform = "none";
      container.style.left = newLeft + "px";
      container.style.top = newTop + "px";
      container.style.margin = "0";
    }
    function dragEnd() {
      isDragging = false;
    }
    dragHandle.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);
    dragHandle.addEventListener("touchstart", dragStart, { passive: false });
    document.addEventListener("touchmove", drag, { passive: false });
    document.addEventListener("touchend", dragEnd, { passive: false });
    return function cleanup() {
      document.removeEventListener("mousemove", drag);
      document.removeEventListener("mouseup", dragEnd);
      document.removeEventListener("touchmove", drag);
      document.removeEventListener("touchend", dragEnd);
    };
  }

  // src/core/page-guard.js
  function checkQiangzhiPage() {
    try {
      const pageTitle = document.title || "";
      if (pageTitle.includes("强智科技教务系统概念版")) {
        Logger.warn("检测到强智科技概念版页面，显示登录引导");
        const content = `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 15px; font-weight: 500; color: #1d1d1f; margin-bottom: 10px;">
                        当前页面无法登录
                    </div>
                    <div style="font-size: 14px; color: #424245; line-height: 1.6;">
                        这是强智科技教务系统概念版，仅供展示，不提供登录功能。请前往以下入口登录教务系统。
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <a href="http://newjwxt.bjfu.edu.cn/" target="_blank" style="
                        display: flex; align-items: center; justify-content: center;
                        background: #007AFF; color: white;
                        padding: 13px 20px; text-decoration: none; border-radius: 12px;
                        font-weight: 500; font-size: 15px; text-align: center;
                        transition: background 0.15s;"
                        onmouseover="this.style.background='#0066d6'" onmouseout="this.style.background='#007AFF'">
                        北林新教务系统
                        <span style="margin-left: 8px; font-size: 11px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 6px;">推荐</span>
                    </a>
                    <a href="http://202.204.121.135/jwxt/Index.htm" target="_blank" style="
                        display: block; background: #f5f5f7; color: #1d1d1f;
                        padding: 13px 20px; text-decoration: none; border-radius: 12px;
                        font-weight: 500; font-size: 15px; text-align: center;
                        border: 1px solid #d2d2d7; transition: background 0.15s;"
                        onmouseover="this.style.background='#e8e8ed'" onmouseout="this.style.background='#f5f5f7'">
                        北林旧教务系统
                    </a>
                </div>
                <div style="margin-top: 18px; padding: 14px; background: #f5f5f7; border-radius: 10px;">
                    <div style="font-size: 13px; color: #424245; line-height: 1.6;">
                        <strong style="color: #1d1d1f;">温馨提示</strong><br>
                        验证码区分大小写，通常为小写字母。如遇登录问题，建议使用教务处入口。
                    </div>
                </div>
            `;
        try {
          createUnifiedModal("北林教务增强助手 V1", content, "warning");
        } catch (e) {
          Logger.error("创建强智科技页面提示弹窗失败:", e);
        }
        return true;
      }
      return false;
    } catch (e) {
      Logger.error("检测强智科技页面失败:", e);
      return false;
    }
  }

  // src/core/credit-stats.js
  function escHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function createCreditSummaryWindow() {
    try {
      const container = document.createElement("div");
      container.id = "creditSummaryWindow";
      container.style.cssText = `
            position: fixed; top: 40px; right: 40px;
            background: #fff; border: 1px solid #e0e0e0; border-radius: 14px;
            padding: 0; box-shadow: 0 8px 32px rgba(0,0,0,0.13);
            z-index: 9999; min-width: 420px; max-width: 520px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
        `;
      container.innerHTML = `
            <div id="creditDragHandle" style="
                background: #f5f6fa; padding: 14px 22px; cursor: move;
                display: flex; justify-content: space-between; align-items: center;
                border-bottom: 1px solid #e0e0e0;">
                <div style="color: #333; font-weight: 600; font-size: 17px; letter-spacing: 1px;">
                    🎓 北林教务增强助手 V1
                </div>
                <span id="creditCloseBtn" style="cursor: pointer; color: #888; font-size: 18px;
                    padding: 2px 8px; border-radius: 4px; transition: background-color 0.2s;">✕</span>
            </div>
            <div style="background: #fff; padding: 18px 22px 10px 22px; max-height: 540px; overflow-y: auto;">
                <div id="creditSummary"></div>
                <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid #e0e0e0;
                    font-size: 13px; color: #888; line-height: 1.6; text-align: left;">
                    <li>对照个人培养方案核实具体修课要求</li>
                    <li>课程信息以教务处官网为准</li>
                    <div style="margin-bottom: 8px;">
                        <span>请查看 <a href="${PROJECT_URL}" target="_blank"
                            style="color: #007bff; text-decoration: none;">增强助手官网</a> 获取使用说明</span>
                    </div>
                </div>
            </div>
        `;
      let isDragging = false;
      let mouseStartX, mouseStartY, elemStartX, elemStartY;
      let cleanupDrag = null;
      const dragHandle = container.querySelector("#creditDragHandle");
      if (dragHandle) {
        const dragStart = (e) => {
          const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
          const clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
          if (e.target === dragHandle || dragHandle.contains(e.target)) {
            const rect = container.getBoundingClientRect();
            elemStartX = rect.left;
            elemStartY = rect.top;
            mouseStartX = clientX;
            mouseStartY = clientY;
            isDragging = true;
            e.preventDefault();
          }
        };
        const drag = (e) => {
          if (!isDragging) return;
          e.preventDefault();
          const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
          const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
          container.style.right = "auto";
          container.style.left = elemStartX + clientX - mouseStartX + "px";
          container.style.top = elemStartY + clientY - mouseStartY + "px";
        };
        const dragEnd = () => {
          isDragging = false;
        };
        dragHandle.addEventListener("mousedown", dragStart);
        document.addEventListener("mousemove", drag);
        document.addEventListener("mouseup", dragEnd);
        dragHandle.addEventListener("touchstart", dragStart, { passive: false });
        document.addEventListener("touchmove", drag, { passive: false });
        document.addEventListener("touchend", dragEnd, { passive: false });
        cleanupDrag = function() {
          document.removeEventListener("mousemove", drag);
          document.removeEventListener("mouseup", dragEnd);
          document.removeEventListener("touchmove", drag);
          document.removeEventListener("touchend", dragEnd);
        };
      }
      document.body.appendChild(container);
      const creditCloseBtn = container.querySelector("#creditCloseBtn");
      if (creditCloseBtn) {
        creditCloseBtn.addEventListener("click", () => {
          if (cleanupDrag) cleanupDrag();
          container.remove();
        });
        creditCloseBtn.addEventListener("mouseenter", () => creditCloseBtn.style.backgroundColor = "#e0e0e0");
        creditCloseBtn.addEventListener("mouseleave", () => creditCloseBtn.style.backgroundColor = "transparent");
      }
      Logger.debug("学分统计弹窗创建完成");
      return container;
    } catch (e) {
      Logger.error("创建学分统计弹窗失败:", e);
      return null;
    }
  }
  function updateCreditSummary() {
    try {
      const creditSummaryDiv = document.getElementById("creditSummary");
      if (!creditSummaryDiv) {
        Logger.warn("未找到学分统计容器");
        return;
      }
      const creditsByType = {};
      const tables = document.querySelectorAll("table");
      tables.forEach((table) => {
        table.querySelectorAll("tr").forEach((row) => {
          const tds = row.querySelectorAll("td");
          if (tds.length < 12) return;
          const credit = parseFloat(tds[5].textContent) || 0;
          const courseType = tds[7].textContent.trim();
          if (courseType) {
            if (!creditsByType[courseType]) creditsByType[courseType] = { credits: 0, count: 0 };
            creditsByType[courseType].credits += credit;
            creditsByType[courseType].count++;
          }
        });
      });
      const totalCreditsByType = Object.values(creditsByType).reduce((s, d) => s + d.credits, 0);
      const totalCountByType = Object.values(creditsByType).reduce((s, d) => s + d.count, 0);
      let summaryHTML = `<div style="border-bottom: 1px solid #e0e0e0; margin-bottom: 12px; padding-bottom: 10px;">`;
      summaryHTML += `<div style="margin-bottom: 8px; font-size: 15px; color: #222; font-weight: 600;">📊 按课程性质统计</div>`;
      summaryHTML += `<div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 6px; background: #f7f7fa; border-radius: 4px; padding: 4px 6px; margin-bottom: 4px;">
            <span style="color: #007bff; font-weight: 600; font-size: 13px;">总计</span>
            <span style="font-weight: 600; color: #007bff; font-size: 13px;">${totalCreditsByType.toFixed(1)} 学分</span>
            <span style="color: #007bff; font-weight: 600; font-size: 13px;">${totalCountByType} 门</span>
        </div><div style="display: grid; gap: 2px;">`;
      const sortedEntries = Object.entries(creditsByType).sort((a, b) => b[1].credits - a[1].credits);
      for (const [type, data] of sortedEntries) {
        summaryHTML += `<div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 6px; padding: 2px 0; align-items: center;">
                <span style="color: #444; font-size: 13px;">${escHtml(type)}</span>
                <span style="color: #333; font-size: 13px;">${data.credits.toFixed(1)} 学分</span>
                <span style="color: #888; font-size: 13px;">${data.count} 门</span>
            </div>`;
      }
      summaryHTML += `</div></div>`;
      creditSummaryDiv.innerHTML = summaryHTML || "暂无数据";
      Logger.debug("学分统计更新完成");
    } catch (e) {
      Logger.error("更新学分统计失败:", e);
      const el = document.getElementById("creditSummary");
      if (el) el.innerHTML = '<div style="color:#dc3545;padding:10px;text-align:center;">❌ 学分统计更新失败</div>';
    }
  }

  // src/core/table-enhancer.js
  function processAllTables() {
    try {
      const tables = document.querySelectorAll("table");
      const isGradePage = window.location.pathname.includes("/jsxsd/kscj/cjcx_list");
      const isSchedulePage = window.location.pathname.includes("xskb_list.do") && document.title.includes("学期理论课表");
      if (isSchedulePage) return;
      let processedTables = 0, processedRows = 0, enhancedCourses = 0;
      tables.forEach((table) => {
        try {
          const rows = table.querySelectorAll("tr");
          processedTables++;
          rows.forEach((row) => {
            try {
              const tds = row.querySelectorAll("td");
              if (tds.length < 3) return;
              processedRows++;
              let courseCodeTd, courseCode;
              if (isGradePage) {
                courseCodeTd = tds[2];
                courseCode = courseCodeTd ? courseCodeTd.textContent.trim() : "";
              } else if (isSchedulePage) {
                courseCodeTd = tds[1];
                courseCode = courseCodeTd ? courseCodeTd.textContent.trim() : "";
              } else {
                courseCodeTd = tds[1];
                if (courseCodeTd) {
                  const br = courseCodeTd.querySelector("br");
                  if (br && br.nextSibling) {
                    courseCode = br.nextSibling.textContent.trim();
                  } else {
                    return;
                  }
                } else return;
              }
              if (!courseCode) return;
              let courseEnhanced = false;
              try {
                if (!isGradePage && !isSchedulePage && courseCodeTd && courseCodeTd.title && !courseCodeTd.querySelector("[data-title-inserted]")) {
                  const titleDiv = document.createElement("div");
                  titleDiv.setAttribute("data-title-inserted", "1");
                  titleDiv.style.color = "#666";
                  titleDiv.style.fontSize = "13px";
                  titleDiv.style.marginTop = "4px";
                  titleDiv.style.fontStyle = "italic";
                  titleDiv.textContent = `📌 老师说明: ${courseCodeTd.title}`;
                  courseCodeTd.appendChild(titleDiv);
                  courseEnhanced = true;
                }
              } catch (e) {
                Logger.warn("添加老师说明时出错:", e);
              }
              if (courseEnhanced) enhancedCourses++;
            } catch (e) {
              Logger.warn("处理表格行时出错:", e);
            }
          });
        } catch (e) {
          Logger.warn("处理表格时出错:", e);
        }
      });
      Logger.info(`表格处理完成: ${processedTables}个表格, ${processedRows}行, 增强${enhancedCourses}门课程`);
      if (isGradePage) updateCreditSummary();
    } catch (e) {
      Logger.error("处理页面表格失败:", e);
    }
  }

  // src/core/session-keeper.js
  function checkLoginErrorAndRefresh() {
    try {
      const pageTitle = document.title || "";
      const pageContent = document.body ? document.body.textContent : "";
      const isLoginError = pageTitle.includes("出错页面") && (pageContent.includes("您登录后过长时间没有操作") || pageContent.includes("您的用户名已经在别处登录") || pageContent.includes("请重新输入帐号，密码后，继续操作"));
      if (isLoginError) {
        Logger.warn("检测到登录超时或重复登录错误页面，正在自动刷新...");
        performLoginRefresh(true);
        return true;
      }
      return false;
    } catch (e) {
      Logger.error("检测登录错误页面失败:", e);
      return false;
    }
  }
  function performLoginRefresh(forceRefresh = false) {
    const currentUrl = window.location.href;
    try {
      let baseUrl;
      if (currentUrl.includes("jsxsd/")) {
        baseUrl = currentUrl.substring(0, currentUrl.indexOf("jsxsd/"));
      } else {
        const urlObj = new URL(currentUrl);
        baseUrl = `${urlObj.protocol}//${urlObj.host}/`;
      }
      const refreshUrl = baseUrl + "jsxsd/pyfa/kcdgxz";
      Logger.info("使用隐藏 iframe 刷新登录状态:", refreshUrl);
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;visibility:hidden;border:none;";
      iframe.src = refreshUrl;
      iframe.onload = () => {
        Logger.info("登录状态刷新请求完成");
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1e3);
      };
      iframe.onerror = () => {
        Logger.warn("登录状态刷新请求失败");
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        if (forceRefresh) Logger.error("登录状态刷新失败，请手动重新点击选课中心 - 课程总库");
      };
      document.body.appendChild(iframe);
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1e4);
    } catch (e) {
      Logger.error("自动刷新登录状态失败:", e);
    }
  }
  function autoRefreshLoginStatus() {
    try {
      const currentUrl = window.location.href;
      if (!currentUrl.includes("jsxsd/framework/xsMain.jsp")) return;
      const lastRefreshKey = "bjfu_last_login_refresh";
      const lastRefreshTime = localStorage.getItem(lastRefreshKey);
      const now = Date.now();
      const refreshInterval = 5 * 60 * 1e3;
      if (lastRefreshTime && now - parseInt(lastRefreshTime) < refreshInterval) {
        Logger.debug("距上次刷新不足5分钟，跳过");
        return;
      }
      localStorage.setItem(lastRefreshKey, now.toString());
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("bjfu_login_refresh");
        bc.postMessage({ type: "refreshing", ts: now });
        bc.close();
      }
      Logger.info("检测到主框架页面，开始刷新登录状态");
      performLoginRefresh(false);
    } catch (e) {
      Logger.error("自动刷新登录状态检查失败:", e);
    }
  }

  // src/core/index.js
  function initializeLogging() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initializeLogging);
      return;
    }
    setTimeout(() => {
      try {
        Logger.info("北林教务增强助手已启动", {
          debug: DEBUG_CONFIG.enabled ? `Level ${DEBUG_CONFIG.level}` : "关闭"
        });
      } catch (e) {
        console.error("初始化日志失败: ", e);
      }
    }, 100);
  }
  function setupMutationObserver() {
    let isProcessing = false;
    const observer = new MutationObserver((mutations) => {
      try {
        if (isProcessing) return;
        const hasRelevantChanges = mutations.some((mutation) => {
          try {
            if (mutation.type !== "childList") return false;
            for (const node of mutation.addedNodes) {
              if (node.nodeType !== Node.ELEMENT_NODE) continue;
              if (node.hasAttribute && node.hasAttribute("data-title-inserted")) {
                return false;
              }
              if (node.tagName === "TABLE" || node.tagName === "TR" || node.tagName === "TD") {
                return true;
              }
            }
            return false;
          } catch (e) {
            Logger.warn("检查页面变化时出错:", e);
            return false;
          }
        });
        if (hasRelevantChanges && !checkQiangzhiPage()) {
          isProcessing = true;
          try {
            processAllTables();
          } catch (e) {
            Logger.error("重新处理表格失败:", e);
          } finally {
            setTimeout(() => {
              isProcessing = false;
            }, 100);
          }
        }
      } catch (e) {
        Logger.error("MutationObserver 回调执行失败:", e);
        isProcessing = false;
      }
    });
    try {
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {
      Logger.error("启动页面变化监听器失败:", e);
    }
  }
  function initCore() {
    "use strict";
    LogPanelUI.init();
    initializeLogging();
    initializePromoBanner();
    if (checkQiangzhiPage()) {
      Logger.info("强智科技页面检测完成，脚本退出");
      return;
    }
    autoRefreshLoginStatus();
    checkLoginErrorAndRefresh();
    Logger.info("开始处理页面");
    if (window.location.pathname.includes("/jsxsd/kscj/cjcx_list")) {
      createCreditSummaryWindow();
    }
    processAllTables();
    setupMutationObserver();
    Logger.info("北林教务增强助手加载成功！");
  }
  window.__BJFU_LOGGER__ = Logger;

  // src/eval/css.js
  function injectCSS() {
    if (document.getElementById("v80-style")) return;
    const style = document.createElement("style");
    style.id = "v80-style";
    style.textContent = `
        #v80-panel {
            position: fixed; top: 20px; right: 20px; width: 490px;
            background: #fff; border-radius: 10px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.10);
            z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex; flex-direction: column; border: 1px solid #e2e8f0;
            max-height: 90vh; overflow: hidden;
            transition: transform 0.25s ease; font-size: 13px; color: #2d3748;
        }
        #v80-panel.wide { width: 640px; }
        #v80-header {
            padding: 11px 14px; background: #f7fafc; border-bottom: 1px solid #e2e8f0;
            cursor: move; display: flex; align-items: center; gap: 8px; user-select: none; flex-shrink: 0;
        }
        #v80-header b { flex: 1; font-size: 14px; color: #2d3748; }
        #v80-action-bar { padding: 10px 14px 8px; border-bottom: 1px solid #edf2f7; background: #fff; flex-shrink: 0; }
        #v80-submit-hint { font-size: 11px; padding: 6px 10px; border-radius: 6px; margin-bottom: 8px; background: #f0fff4; color: #276749; border: 1px solid #c6f6d5; display: none; line-height: 1.6; }
        #v80-submit-hint.visible { display: block; }
        .btn-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 7px; }
        #v80-body { padding: 10px 14px; overflow-y: auto; flex: 1; }

        .entry-card, .ci { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 7px; border: 1px solid #e2e8f0; margin-bottom: 7px; background: #f7fafc; }
        .ci { padding: 8px 10px; margin-bottom: 6px; border-color: #edf2f7; }
        .entry-label, .ci-name { flex: 1; font-weight: 500; color: #2d3748; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ci-teacher { color: #718096; white-space: nowrap; }
        .ci-zpf { color: #276749; font-size: 11px; background: #f0fff4; padding: 1px 7px; border-radius: 8px; border: 1px solid #c6f6d5; white-space: nowrap; }

        .entry-st-done, .st-submitted { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #f0fff4; color: #276749; border: 1px solid #c6f6d5; white-space: nowrap; }
        .entry-st-wait, .st-wait { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #fffaf0; color: #c05621; border: 1px solid #feebc8; white-space: nowrap; }
        .entry-st-run { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #ebf4ff; color: #2b6cb0; border: 1px solid #bee3f8; }
        .st-can-submit { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #fefcbf; color: #744210; border: 1px solid #f6e05e; white-space: nowrap; }
        .st-none { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #edf2f7; color: #718096; border: 1px solid #e2e8f0; white-space: nowrap; }

        .vb { padding: 6px 13px; border-radius: 6px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
        .vb-primary { background: #ebf4ff; color: #2b6cb0; border: 1px solid #bee3f8; }
        .vb-green { background: #f0fff4; color: #276749; border: 1px solid #c6f6d5; }
        .vb-yellow { background: #fefcbf; color: #744210; border: 1px solid #f6e05e; }
        .vb-outline { background: #fff; color: #4a5568; border: 1px solid #cbd5e0; }
        .vb-danger { background: #fff; color: #c53030; border: 1px solid #fed7d7; }
        .vb-mini { padding: 3px 9px; font-size: 11px; }
        .vb:disabled { opacity: 0.45; cursor: not-allowed; }

        .v80-section { flex-shrink: 0; border-top: 1px solid #edf2f7; }
        .v80-sec-hd { padding: 7px 14px; display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; background: #f7fafc; }
        .v80-sec-hd .lbl { font-size: 11px; color: #4a5568; font-weight: 600; flex: 1; }
        .v80-sec-hd .arr { font-size: 13px; color: #a0aec0; }
        .v80-sec-body { display: none; }
        .v80-sec-body.open { display: block; }

        #v80-storage-pre { max-height: 200px; overflow-y: auto; padding: 4px 10px; font-size: 11px; line-height: 1.6; font-family: 'SFMono-Regular', Consolas, monospace; background: #f7fafc; }
        .v80-value-chip { display: inline-block; margin-left: 6px; font-size: 11px; color: #4a5568; }
    `;
    document.head.appendChild(style);
  }

  // src/eval/constants.js
  var KEY_STORE = "bjfu_eval_v1_store";
  var KEY_RUNNING = "bjfu_eval_running";
  var KEY_BUSY = "bjfu_eval_busy";
  var KEY_QUEUE = "bjfu_eval_queue";
  var KEY_CURLIST = "bjfu_eval_curlist";
  var KEY_LOG = "bjfu_eval_log";
  var KEY_SUBQUEUE = "bjfu_eval_subqueue";
  var KEY_SUBRUN = "bjfu_eval_subrun";
  var KEY_SUBBSY = "bjfu_eval_subbsy";
  var PARAM_AUTO = "isAutoEval";
  var PARAM_SUBMIT = "isAutoSubmit";
  var MAX_LOG = 300;

  // src/eval/utils.js
  var esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function qp(url, key) {
    var _a;
    try {
      return new URL(url, location.origin).searchParams.get(key) || "";
    } catch (e) {
      return ((_a = url.match(new RegExp(`[?&]${escapeRegExp(key)}=([^&]+)`))) == null ? void 0 : _a[1]) || "";
    }
  }
  function courseKey(url) {
    const cid = qp(url, "jx02id"), tid = qp(url, "jg0101id");
    return cid && tid ? `${cid}__${tid}` : null;
  }
  function appendParam(url, key, val) {
    return url + (url.includes("?") ? "&" : "?") + encodeURIComponent(key) + "=" + encodeURIComponent(val);
  }
  function withAuto(url, val) {
    return appendParam(url, PARAM_AUTO, val);
  }
  function withSubmit(url) {
    return appendParam(url, PARAM_SUBMIT, "true");
  }
  function roundFloat(n) {
    return Math.round(n * 1e9) / 1e9;
  }
  function safeJsonParse(raw, fallback) {
    try {
      return JSON.parse(raw || fallback);
    } catch (e) {
      const logger = window.__BJFU_LOGGER__;
      if (logger) logger.warn("[评教] localStorage 解析失败，已重置", e);
      else console.warn("[评教] localStorage 解析失败，已重置", e);
      return JSON.parse(fallback);
    }
  }
  function loadStore() {
    return safeJsonParse(localStorage.getItem(KEY_STORE), "{}");
  }
  function saveStore(v) {
    localStorage.setItem(KEY_STORE, JSON.stringify(v));
  }
  function loadQueue() {
    return safeJsonParse(localStorage.getItem(KEY_QUEUE), "[]");
  }
  function saveQueue(q) {
    localStorage.setItem(KEY_QUEUE, JSON.stringify(q));
  }
  function loadSubQueue() {
    return safeJsonParse(localStorage.getItem(KEY_SUBQUEUE), "[]");
  }
  function saveSubQueue(q) {
    localStorage.setItem(KEY_SUBQUEUE, JSON.stringify(q));
  }
  function renderStoragePanel() {
    const el = document.getElementById("v80-storage-pre");
    if (el) el.textContent = JSON.stringify(loadStore(), null, 2);
  }

  // src/eval/panel.js
  function buildPanel(titleHtml, actionBarHtml, bodyHtml) {
    injectCSS();
    const panel = document.createElement("div");
    panel.id = "v80-panel";
    panel.innerHTML = `
        <div id="v80-header">
            <b>${titleHtml}</b>
            <span id="v80-close-btn" style="cursor:pointer;color:#718096;font-size:16px;padding:2px 8px;border-radius:4px;transition:background 0.2s;margin-left:8px;" title="关闭">✕</span>
        </div>
        <div id="v80-action-bar">${actionBarHtml}</div>
        <div id="v80-body">${bodyHtml}</div>
        <div class="v80-section">
            <div class="v80-sec-hd" id="store-hd">
                <span class="lbl">🗄 Storage 原始数据</span>
                <span class="arr" id="store-arr">▾</span>
            </div>
            <div class="v80-sec-body" id="store-body">
                <pre id="v80-storage-pre"></pre>
            </div>
        </div>
    `;
    document.body.appendChild(panel);
    const closeBtn = document.getElementById("v80-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        panel.remove();
      });
      closeBtn.addEventListener("mouseenter", () => closeBtn.style.backgroundColor = "#e2e8f0");
      closeBtn.addEventListener("mouseleave", () => closeBtn.style.backgroundColor = "transparent");
    }
    const storeBody = document.getElementById("store-body"), storeArr = document.getElementById("store-arr");
    document.getElementById("store-hd").onclick = () => {
      storeBody.classList.toggle("open");
      storeArr.textContent = storeBody.classList.contains("open") ? "▴" : "▾";
      if (storeBody.classList.contains("open")) renderStoragePanel();
    };
    let drag = false, mouseStartX = 0, mouseStartY = 0, elemStartX = 0, elemStartY = 0;
    document.getElementById("v80-header").onmousedown = (e) => {
      if (e.target.id === "v80-close-btn") return;
      const rect = panel.getBoundingClientRect();
      elemStartX = rect.left;
      elemStartY = rect.top;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
      drag = true;
    };
    document.onmousemove = (e) => {
      if (!drag) return;
      panel.style.left = elemStartX + e.clientX - mouseStartX + "px";
      panel.style.top = elemStartY + e.clientY - mouseStartY + "px";
      panel.style.right = "auto";
    };
    document.onmouseup = () => {
      drag = false;
    };
    return panel;
  }

  // src/eval/find-page.js
  function initFindPage() {
    function scanEntries() {
      const anchors = document.querySelectorAll('a[href*="xspj_list.do"]');
      const found = [];
      anchors.forEach((a) => {
        const href = a.getAttribute("href");
        const label = a.textContent.trim() || a.title || href;
        const abs = href.startsWith("http") ? href : location.origin + href;
        found.push({ label, url: abs });
      });
      return found;
    }
    buildPanel(
      "🎓 北林教务增强助手 V1",
      `
            <div id="v80-usage" style="font-size:13px;line-height:1.75;padding:14px 16px;border:1px solid #cbd5e0;border-radius:10px;background:#f7fafc;color:#2d3748;box-shadow:0 1px 6px rgba(0,0,0,0.06);">
                <div style="font-weight:800;margin-bottom:8px;font-size:14px;">新手使用指南</div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    <div>① 点击下方任一入口，进入该"类别"的课程列表页。</div>
                    <div>② 在课程列表页，勾选要自动处理的课程（默认全部勾选）。</div>
                    <div>③ 点击"开始评价并保存"，系统会依次打开勾选课程的评价页，自动填分并保存。</div>
                    <div>④ 保存后课程显示"待提交"，点击"提交已评课程"可批量提交。</div>
                    <div>⑤ "是否提交=是"的课程视为已完成，不会再进行任何自动操作。</div>
                    <div style="color:#FF6347;font-weight:700;">重要：用户必须自行点击"确认"弹窗确认！</div>
                    <div style="color:#FF6347;font-weight:700;">出现问题可使用“重置缓存（清除状态）”按钮重置进度</div>
                    <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #cbd5e0;display:flex;align-items:center;">
                        <span style="flex:1;color:#4a5568;font-size:12px;">查看更多使用说明请点击>>>>></span>
                        <a href="${PROJECT_URL}" target="_blank" class="vb vb-outline vb-mini" style="text-decoration:none;">增强助手官网</a>
                    </div>
                </div>
            </div>
        `,
      `<div id="entry-list"></div>`
    );
    (function() {
      const p = document.getElementById("v80-panel");
      if (p) p.classList.add("wide");
    })();
    function renderEntries() {
      const entries = scanEntries(), store = loadStore();
      const curList = localStorage.getItem(KEY_CURLIST) || "";
      const running = localStorage.getItem(KEY_RUNNING) === "true";
      const box = document.getElementById("entry-list");
      if (!box) return;
      box.innerHTML = "";
      entries.forEach((entry) => {
        const pj01 = qp(entry.url, "pj01id");
        const related = Object.values(store).filter((c) => c.url && qp(c.url, "pj01id") === pj01);
        const doneN = related.filter((c) => c.done).length;
        const totalN = related.length;
        const isCur = running && curList && entry.url.includes(qp(curList, "pj01id"));
        const allDone = totalN > 0 && doneN === totalN;
        const card = document.createElement("div");
        card.className = "entry-card";
        card.innerHTML = `<span class="entry-label">${esc(entry.label)}</span>` + (totalN ? `<span class="entry-count">${doneN}/${totalN}</span>` : "") + `<span class="${isCur ? "entry-st-run" : allDone ? "entry-st-done" : "entry-st-wait"}">${isCur ? "▶ 运行中" : allDone ? "✓ 已完成" : "等待中"}</span><button class="vb vb-outline vb-mini entry-enter-btn" data-url="${esc(entry.url)}">进入</button>`;
        box.appendChild(card);
      });
      box.querySelectorAll(".entry-enter-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const url = btn.getAttribute("data-url");
          if (url) window.location.href = url;
        });
      });
    }
    window.addEventListener("storage", () => {
      renderEntries();
    });
    renderEntries();
  }

  // src/eval/log-bridge.js
  function clearLogs() {
    localStorage.removeItem(KEY_LOG);
    renderLogPanel();
  }
  function renderLogPanel() {
  }
  function pushLog(msg, level = "info") {
    const logs = JSON.parse(localStorage.getItem(KEY_LOG) || "[]");
    logs.push({ ts: (/* @__PURE__ */ new Date()).toTimeString().slice(0, 8), msg, level });
    if (logs.length > MAX_LOG) logs.splice(0, logs.length - MAX_LOG);
    localStorage.setItem(KEY_LOG, JSON.stringify(logs));
    renderLogPanel();
    const levelMap = { debug: 4, info: 3, success: 3, warn: 2, error: 1 };
    const loggerLevel = levelMap[level] || 3;
    Logger.log(loggerLevel, `[评教] ${msg}`);
  }
  var logInfo = (m) => pushLog(m, "info");
  var logSuccess = (m) => pushLog(m, "success");
  var logError = (m) => pushLog(m, "error");

  // src/eval/list-page.js
  function initListPage() {
    buildPanel(
      "🎓 北林教务增强助手 V1",
      `
            <div id="v80-submit-hint"></div>
            <div class="btn-row">
                <button id="start-btn" class="vb vb-primary" style="flex:2">开始评价并保存</button>
                <button id="submit-all-btn" class="vb vb-yellow" style="flex:2" disabled>提交已评课程</button>
            </div>
            <div class="btn-row">
                <button id="reset-btn" class="vb vb-outline" style="flex:1">重置缓存（清除状态）</button>
                <button id="clear-log-btn" class="vb vb-danger" style="flex:1">清空日志</button>
            </div>
            <div class="btn-row">
                <a href="${PROJECT_URL}" target="_blank" class="vb vb-outline vb-mini" style="text-decoration:none;flex:1;text-align:center;">🔗 点击前往增强助手官网</a>
            </div>
        `,
      `<div id="course-list"></div>`
    );
    function parseRows() {
      const rows = document.querySelectorAll("#dataList tr:not(:first-child)"), result = [];
      rows.forEach((row) => {
        var _a, _b, _c, _d, _e;
        if (row.cells.length < 8) return;
        const a = row.querySelector('a[href*="JsMod1"]') || row.querySelector('a[href*="openWindow"]');
        if (!a) return;
        const href = a.getAttribute("href");
        const rawUrl = (_a = href.match(/'([^']+)'/)) == null ? void 0 : _a[1];
        if (!rawUrl) return;
        result.push({
          key: courseKey(rawUrl),
          rawUrl,
          name: ((_b = row.cells[2]) == null ? void 0 : _b.innerText.trim()) || "",
          teacher: ((_c = row.cells[3]) == null ? void 0 : _c.innerText.trim()) || "",
          zpf: qp(rawUrl, "zpf"),
          evaluated: ((_d = row.cells[5]) == null ? void 0 : _d.innerText.trim()) === "是",
          submitted: ((_e = row.cells[6]) == null ? void 0 : _e.innerText.trim()) === "是"
        });
      });
      return result;
    }
    function updateSubmitBtn() {
      const btn = document.getElementById("submit-all-btn"), hint = document.getElementById("v80-submit-hint");
      if (!btn) return;
      const store = loadStore();
      const canSubmit = parseRows().filter((c) => {
        const info = store[c.key];
        return (c.evaluated || info && info.done) && !c.submitted && (info ? info.auto !== false : true);
      });
      if (canSubmit.length > 0) {
        btn.disabled = false;
        hint.className = "visible";
        hint.innerHTML = `<b>${canSubmit.length}</b> 门课程可提交（已评价且未提交且选中）：` + canSubmit.map((c) => `<br>　· ${esc(c.name)}`).join("");
      } else {
        btn.disabled = true;
        hint.className = "";
        hint.innerHTML = "";
      }
    }
    function renderList() {
      const store = loadStore(), courses = parseRows(), box = document.getElementById("course-list");
      if (!box) return;
      box.innerHTML = "";
      courses.forEach((c) => {
        if (!store[c.key]) store[c.key] = { auto: true, done: false, name: c.name, teacher: c.teacher, zpf: c.zpf, url: c.rawUrl, pj01id: qp(c.rawUrl, "pj01id") };
        if (c.submitted) store[c.key].done = true;
        const info = store[c.key];
        let stClass, stLabel;
        if (c.submitted) {
          stClass = "st-submitted";
          stLabel = "已提交";
        } else if (info.auto !== false) {
          if (c.evaluated || info.done) {
            stClass = "st-can-submit";
            stLabel = "待提交";
          } else {
            stClass = "st-wait";
            stLabel = "待评价";
          }
        } else {
          stClass = "st-none";
          stLabel = "不操作";
        }
        const el = document.createElement("div");
        el.className = "ci";
        el.innerHTML = `<input type="checkbox" class="course-ck" data-key="${c.key}" ${info.auto ? "checked" : ""} ${c.submitted ? "disabled" : ""}><span class="ci-name" title="${esc(c.name)}">${esc(c.name)}</span><span class="ci-teacher">${esc(c.teacher)}</span>` + (c.zpf ? `<span class="ci-zpf">${esc(c.zpf)}分</span>` : "") + `<span class="${stClass}">${stLabel}</span><button class="vb vb-outline vb-mini course-view-btn" data-url="${esc(c.rawUrl)}">查看</button>`;
        box.appendChild(el);
      });
      document.querySelectorAll(".course-ck").forEach((ck) => {
        ck.onchange = (e) => {
          const k = e.target.getAttribute("data-key");
          store[k].auto = e.target.checked;
          saveStore(store);
          updateSubmitBtn();
          setTimeout(() => renderList(), 0);
        };
      });
      box.querySelectorAll(".course-view-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const url = btn.getAttribute("data-url");
          if (url) window.open(url, "_blank", "width=1200,height=800");
        });
      });
      saveStore(store);
      updateSubmitBtn();
    }
    function execNext() {
      if (localStorage.getItem(KEY_RUNNING) !== "true") return;
      if (localStorage.getItem(KEY_BUSY) === "true") return;
      const store = loadStore(), curPj01 = qp(location.href, "pj01id");
      const pending = Object.keys(store).filter((k) => {
        const c = store[k];
        return c.auto && !c.done && (!curPj01 || qp(c.url, "pj01id") === curPj01);
      });
      if (pending.length > 0) {
        const c = store[pending[0]];
        localStorage.setItem(KEY_BUSY, "true");
        logInfo(`▶ 正在保存：${c.name}`);
        window.open(withAuto(c.url, "true"), "_blank", "width=1200,height=800");
      } else {
        const queue = loadQueue();
        if (queue.length > 0) {
          const next = queue.shift();
          saveQueue(queue);
          localStorage.setItem(KEY_CURLIST, next);
          localStorage.setItem(KEY_BUSY, "false");
          setTimeout(() => {
            location.href = next;
          }, 800);
        } else {
          localStorage.setItem(KEY_RUNNING, "false");
          localStorage.setItem(KEY_BUSY, "false");
          logSuccess("🎉 所有类别评价已全部完成！");
          renderList();
          alert("🎉全部评价已完成！");
        }
      }
    }
    function execNextSubmit() {
      if (localStorage.getItem(KEY_SUBRUN) !== "true") return;
      if (localStorage.getItem(KEY_SUBBSY) === "true") return;
      const queue = loadSubQueue();
      if (queue.length === 0) {
        localStorage.setItem(KEY_SUBRUN, "false");
        localStorage.setItem(KEY_SUBBSY, "false");
        logSuccess("🎉 所有勾选课程提交完毕！");
        setTimeout(() => location.reload(), 800);
        return;
      }
      const nextUrl = queue.shift();
      saveSubQueue(queue);
      localStorage.setItem(KEY_SUBBSY, "true");
      const submitStore = loadStore(), submitKey = courseKey(nextUrl), submitInfo = submitKey ? submitStore[submitKey] : null;
      logInfo(`▶ 正在提交：${submitInfo ? submitInfo.name + "（" + submitInfo.teacher + "）" : nextUrl}`);
      window.open(nextUrl, "_blank", "width=1200,height=800");
    }
    document.getElementById("start-btn").onclick = () => {
      localStorage.setItem(KEY_RUNNING, "true");
      localStorage.setItem(KEY_BUSY, "false");
      renderList();
      execNext();
    };
    document.getElementById("submit-all-btn").onclick = () => {
      const store = loadStore(), toSubmit = parseRows().filter((c) => {
        const info = store[c.key];
        return (c.evaluated || info && info.done) && !c.submitted && (info ? info.auto !== false : true);
      });
      if (toSubmit.length === 0) return;
      if (!confirm(`即将提交以下 ${toSubmit.length} 门课程：
` + toSubmit.map((c) => `· ${c.name}（${c.teacher}）`).join("\n") + "\n\n确认继续？")) return;
      const queue = toSubmit.map((c) => withSubmit(c.rawUrl));
      saveSubQueue(queue);
      localStorage.setItem(KEY_SUBRUN, "true");
      localStorage.setItem(KEY_SUBBSY, "false");
      execNextSubmit();
    };
    document.getElementById("reset-btn").onclick = () => {
      if (confirm("重置所有缓存？")) {
        [KEY_STORE, KEY_RUNNING, KEY_BUSY, KEY_QUEUE, KEY_CURLIST, KEY_SUBQUEUE, KEY_SUBRUN, KEY_SUBBSY].forEach((k) => localStorage.removeItem(k));
        location.reload();
      }
    };
    document.getElementById("clear-log-btn").onclick = () => clearLogs();
    window.addEventListener("storage", (e) => {
      if ([KEY_STORE, KEY_BUSY, KEY_RUNNING].includes(e.key)) {
        renderList();
        if (e.key === KEY_BUSY && e.newValue === "false" && localStorage.getItem(KEY_RUNNING) === "true") setTimeout(execNext, 800);
      }
      if (e.key === KEY_SUBBSY && e.newValue === "false" && localStorage.getItem(KEY_SUBRUN) === "true") setTimeout(execNextSubmit, 800);
    });
    renderList();
    if (localStorage.getItem(KEY_RUNNING) === "true" && localStorage.getItem(KEY_BUSY) !== "true") setTimeout(execNext, 1200);
    if (localStorage.getItem(KEY_SUBRUN) === "true" && localStorage.getItem(KEY_SUBBSY) !== "true") setTimeout(execNextSubmit, 1200);
  }

  // src/eval/scoring.js
  function findPerturbIdx(gkeys, groups) {
    let minDelta = Infinity, perturbIdx = -1;
    gkeys.forEach((k, i) => {
      const opts = groups[k];
      if (opts.length < 2) return;
      const delta = roundFloat(opts[0].score - opts[1].score);
      if (delta < minDelta) {
        minDelta = delta;
        perturbIdx = i;
      }
    });
    return perturbIdx;
  }
  function applyStrategy(strategy, gkeys, groups) {
    const perturbIdx = findPerturbIdx(gkeys, groups);
    let total = 0;
    gkeys.forEach((k, i) => {
      const opts = groups[k], len = opts.length;
      let pick;
      if (strategy === "highest") {
        pick = i === perturbIdx && len >= 2 ? 1 : 0;
      } else if (strategy === "high") {
        pick = len < 2 ? 0 : i === perturbIdx ? 0 : 1;
      } else if (strategy === "mid") {
        const midIdx = Math.floor((len - 1) / 2);
        pick = i === perturbIdx && len >= 2 ? midIdx > 0 ? midIdx - 1 : midIdx + 1 : midIdx;
      } else if (strategy === "low") {
        pick = i === perturbIdx && len >= 2 ? len - 2 : len - 1;
      }
      const chosen = opts[Math.min(pick, len - 1)];
      if (chosen) {
        chosen.el.checked = true;
        total += chosen.score;
      }
    });
    return roundFloat(total);
  }

  // src/eval/edit-page.js
  function initEditPage() {
    const params = new URLSearchParams(location.search);
    const isAutoSave = params.get(PARAM_AUTO) === "true";
    const isAutoSub = params.get(PARAM_SUBMIT) === "true";
    const isManual = !isAutoSave && !isAutoSub;
    function findActionButton(action) {
      const knownIds = action === "save" ? ["bc"] : ["tj"];
      for (const id of knownIds) {
        const el = document.getElementById(id);
        if (el) return el;
      }
      const candidates = document.querySelectorAll('input[type="button"], input[type="submit"], button');
      const textRe = action === "save" ? /保存|存|save/i : /提交|确认|submit/i;
      for (const btn of candidates) {
        const text = (btn.value || btn.textContent || "").trim();
        if (textRe.test(text)) return btn;
      }
      for (const btn of candidates) {
        const onclick = btn.getAttribute("onclick") || "";
        if (action === "save" && /saveData.*['"]0['"]/i.test(onclick)) return btn;
        if (action === "submit" && /saveData.*['"]1['"]/i.test(onclick)) return btn;
      }
      const logger = window.__BJFU_LOGGER__;
      if (logger) {
        const allButtons = Array.from(candidates).map((b) => ({
          tag: b.tagName,
          id: b.id,
          class: b.className,
          value: b.value,
          text: (b.textContent || "").slice(0, 20),
          onclick: (b.getAttribute("onclick") || "").slice(0, 60)
        }));
        logger.warn(`[评教] 未找到${action === "save" ? "保存" : "提交"}按钮，页面按钮列表：`, allButtons);
      }
      return null;
    }
    function collectGroups() {
      const groups = {};
      document.querySelectorAll('input[type="radio"][name^="pj"]').forEach((r) => {
        if (!groups[r.name]) groups[r.name] = [];
        const idx = r.id && r.id.includes("_") ? r.id.split("_")[1] : "";
        if (!idx) return;
        const fzEl = document.getElementsByName(`pj0601fz_${idx}_${r.value}`)[0];
        groups[r.name].push({ el: r, score: fzEl ? parseFloat(fzEl.value) || 0 : 0 });
      });
      const gkeys = Object.keys(groups);
      gkeys.forEach((k) => groups[k].sort((a, b) => b.score - a.score));
      return { gkeys, groups };
    }
    function calcCurrentTotal(gkeys, groups) {
      let total = 0;
      gkeys.forEach((k) => {
        const chosen = groups[k].find((o) => o.el.checked);
        if (chosen) total += chosen.score;
      });
      return roundFloat(total);
    }
    function ensureValueFields() {
      const { gkeys, groups } = collectGroups();
      gkeys.forEach((k) => {
        groups[k].forEach(({ el, score }) => {
          const idx = el.id && el.id.includes("_") ? el.id.split("_")[1] : "";
          if (!idx) return;
          const fzEl = document.getElementsByName(`pj0601fz_${idx}_${el.value}`)[0];
          if (!fzEl) return;
          let next = fzEl.nextElementSibling;
          if (next && next.classList && next.classList.contains("v80-value-chip")) return;
          const chip = document.createElement("span");
          chip.className = "v80-value-chip";
          chip.textContent = `[${score}分]`;
          fzEl.insertAdjacentElement("afterend", chip);
        });
      });
    }
    if (isManual) {
      const initManual = () => {
        injectCSS();
        const { gkeys, groups } = collectGroups();
        if (gkeys.length === 0) return;
        ensureValueFields();
        const bar2 = document.createElement("div");
        bar2.id = "v80-manual-bar";
        bar2.style.cssText = "position:sticky;top:0;left:0;width:100%;z-index:99999;box-sizing:border-box;background:#ebf8ff;border-bottom:2px solid #90cdf4;color:#2c5282;padding:10px 18px;font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.08);";
        bar2.innerHTML = `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <span style="font-weight:700;font-size:13px;">🎓 北林教务增强助手 V1</span>
                <span style="font-size:11px;padding:2px 9px;border-radius:7px;background:#edf2f7;color:#718096;border:1px solid #cbd5e0;">手动模式</span>
                <span style="font-size:12px;color:#4a5568;">快捷填分：</span>
                <button id="v8-fill-highest" class="vb vb-outline vb-mini">最高分</button>
                <button id="v8-fill-high"    class="vb vb-outline vb-mini">中高分</button>
                <button id="v8-fill-mid"     class="vb vb-outline vb-mini">中分</button>
                <button id="v8-fill-low"     class="vb vb-outline vb-mini">低分</button>
                <span id="v8-score-display" style="font-size:18px;font-weight:800;color:#2d3748;padding:4px 10px;border-radius:6px;background:#f7fafc;border:1px solid #e2e8f0;margin-left:4px;">未填写</span>
            </div>
            <div id="v8-manual-hint" style="margin-top:7px;font-size:11px;color:#718096;display:none;">已自动填写，请确认无误后手动点击页面上的「保存」或「提交」按钮。</div>`;
        document.body.prepend(bar2);
        const scoreDisplay = document.getElementById("v8-score-display");
        const manualHint = document.getElementById("v8-manual-hint");
        const refreshScore = () => {
          const { gkeys: gk2, groups: gr2 } = collectGroups();
          const total = calcCurrentTotal(gk2, gr2);
          const answered = gk2.filter((k) => gr2[k].some((o) => o.el.checked)).length;
          scoreDisplay.textContent = answered === 0 ? "未填写" : `总分 ${total} (${answered}/${gk2.length}题)`;
          scoreDisplay.style.color = "#276749";
        };
        const strategies = [
          { id: "v8-fill-highest", s: "highest", label: "最高分" },
          { id: "v8-fill-high", s: "high", label: "中高分" },
          { id: "v8-fill-mid", s: "mid", label: "中分" },
          { id: "v8-fill-low", s: "low", label: "低分" }
        ];
        strategies.forEach(({ id, s, label }) => {
          document.getElementById(id).addEventListener("click", () => {
            const { gkeys: gk2, groups: gr2 } = collectGroups();
            const total = applyStrategy(s, gk2, gr2);
            scoreDisplay.textContent = `当前 ${total} 分（${label}）`;
            scoreDisplay.style.color = "#276749";
            manualHint.style.display = "block";
          });
        });
        document.querySelectorAll('input[type="radio"]').forEach((r) => r.addEventListener("change", refreshScore));
        refreshScore();
      };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(initManual, 300));
      else setTimeout(initManual, 300);
      return;
    }
    injectCSS();
    const bgColor = isAutoSub ? "#f0fff4" : "#ebf8ff";
    const bdColor = isAutoSub ? "#9ae6b4" : "#90cdf4";
    const textColor = isAutoSub ? "#276749" : "#2c5282";
    const modeName = isAutoSub ? "✅ 提交模式" : "💾 保存模式";
    const bar = document.createElement("div");
    bar.style.cssText = `position:sticky;top:0;left:0;width:100%;z-index:99999;box-sizing:border-box;background:${bgColor};color:${textColor};border-bottom:2px solid ${bdColor};box-shadow:0 2px 8px rgba(0,0,0,0.08);font-family:sans-serif;`;
    bar.innerHTML = `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:9px 20px;">
        <span style="font-weight:700;font-size:13px;">🎓 北林教务增强助手 V1</span>
        <span style="font-size:11px;padding:2px 10px;border-radius:8px;background:rgba(255,255,255,0.5);border:1px solid ${bdColor};">${modeName}</span>
        <span id="edit-tag" style="font-size:11px;padding:2px 10px;border-radius:8px;background:rgba(0,0,0,0.06);border:1px solid ${bdColor};">初始化...</span>
        <span id="v8-total-display" style="font-size:17px;font-weight:800;color:${textColor};padding:1px 10px;border-radius:6px;border:1px solid ${bdColor};background:#fff;">总分 0</span>
        <button id="stop-btn" style="margin-left:auto;background:#fff;border:1px solid ${bdColor};padding:4px 12px;border-radius:5px;font-weight:700;cursor:pointer;font-size:12px;">停止</button>
    </div>
    <div style="height:1px;background:${bdColor};opacity:0.4;margin:0 20px;"></div>
    <div id="v8-confirm-attn" style="display:flex;align-items:center;gap:6px;padding:5px 20px 8px;font-size:12px;font-weight:500;color:#2c5282;opacity:0.9;">请确认评分无误后，手动点击浏览器弹出的「确认」按钮</div>`;
    document.body.prepend(bar);
    const tag = document.getElementById("edit-tag");
    const editLog = (msg, level = "info") => {
      tag.textContent = msg;
      pushLog("[edit] " + msg, level);
    };
    let stopped = false;
    document.getElementById("stop-btn").onclick = () => {
      stopped = true;
      editLog("已停止");
      document.getElementById("stop-btn").style.display = "none";
    };
    if (isAutoSub) {
      setTimeout(() => {
        const key = courseKey(location.href), store = loadStore();
        editLog("准备提交...");
        if (stopped) return;
        const { gkeys, groups } = collectGroups();
        const total = calcCurrentTotal(gkeys, groups);
        const totalDisplay = document.getElementById("v8-total-display");
        if (totalDisplay) totalDisplay.textContent = `总分 ${total}`;
        ensureValueFields();
        const doSubmit = () => {
          const tj = findActionButton("submit");
          if (!tj) {
            editLog("未找到提交按钮，请手动提交", "error");
            localStorage.setItem(KEY_SUBBSY, "false");
            setTimeout(() => window.close(), 2e3);
            return;
          }
          if (typeof unsafeWindow.saveData !== "function") {
            editLog("页面提交函数不可用，请手动提交", "error");
            localStorage.setItem(KEY_SUBBSY, "false");
            setTimeout(() => window.close(), 2e3);
            return;
          }
          try {
            unsafeWindow.saveData(tj, "1");
            if (key && store[key]) {
              store[key].done = true;
              saveStore(store);
            }
            editLog("已提交！", "success");
          } catch (err) {
            logError(err.message);
            editLog("提交出错，请手动操作", "error");
          }
          setTimeout(() => {
            localStorage.setItem(KEY_SUBBSY, "false");
            setTimeout(() => window.close(), 300);
          }, 800);
        };
        let tries = 0;
        const poll = setInterval(() => {
          tries++;
          if (findActionButton("submit") || tries > 10) {
            clearInterval(poll);
            doSubmit();
          }
        }, 500);
      }, 800);
    } else {
      setTimeout(() => {
        const key = courseKey(location.href), store = loadStore();
        const { gkeys, groups } = collectGroups();
        ensureValueFields();
        const total = applyStrategy("highest", gkeys, groups);
        document.getElementById("v8-total-display").textContent = `总分 ${total}`;
        if (key && store[key]) {
          store[key].done = true;
          saveStore(store);
        }
        if (stopped) return;
        editLog("填写完成，即将保存");
        setTimeout(() => {
          if (stopped) return;
          const bc = findActionButton("save");
          if (!bc) {
            editLog("未找到保存按钮，请手动保存", "error");
            localStorage.setItem(KEY_BUSY, "false");
            setTimeout(() => window.close(), 2e3);
            return;
          }
          if (typeof unsafeWindow.saveData !== "function") {
            editLog("页面保存函数不可用，请手动保存", "error");
            localStorage.setItem(KEY_BUSY, "false");
            setTimeout(() => window.close(), 2e3);
            return;
          }
          try {
            unsafeWindow.saveData(bc, "0");
          } catch (err) {
            logError(err.message);
          }
          setTimeout(() => {
            localStorage.setItem(KEY_BUSY, "false");
            setTimeout(() => window.close(), 300);
          }, 600);
        }, 1e3);
      }, 800);
    }
  }

  // src/eval/index.js
  function initEval() {
    const href = location.href;
    if (href.includes("xspj_find.do")) {
      initFindPage();
    } else if (href.includes("xspj_list.do")) {
      initListPage();
    } else if (href.includes("xspj_edit.do")) {
      initEditPage();
    }
  }

  // src/course-sort/index.js
  function initCourseSort() {
    var path = window.location.pathname;
    if (!path.includes("/xsxkkc/") && !path.includes("/xsxk/")) return;
    var script = document.createElement("script");
    script.textContent = "(" + function() {
      "use strict";
      var sortedCache = null, fetchingAll = false, lastUrl = "", polling = 0, MAX_POLL = 60;
      function showStatus(msg, bg) {
        var el = document.getElementById("bjfu-sort-badge");
        if (!el) {
          el = document.createElement("div");
          el.id = "bjfu-sort-badge";
          el.style.cssText = "position:fixed;top:10px;right:10px;z-index:100000;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,sans-serif;pointer-events:none;";
          document.body.appendChild(el);
        }
        el.textContent = msg;
        var warn = bg === "#fffaf0";
        el.style.background = bg || "#f0fff4";
        el.style.color = warn ? "#c05621" : "#276749";
        el.style.border = "1px solid " + (warn ? "#feebc8" : "#c6f6d5");
        el.style.opacity = "1";
        clearTimeout(el._timer);
        el._timer = setTimeout(function() {
          el.style.opacity = "0";
        }, 3e3);
      }
      function sortRows(aaData) {
        return aaData.slice().sort(function(a, b) {
          function conflict(row) {
            var c = row.ctsm;
            if (!c) return false;
            var s = String(c).trim();
            return s !== "" && s !== "&nbsp;";
          }
          return conflict(a) - conflict(b);
        });
      }
      function fetchAllData(sSource, aoData, callback) {
        var params = [];
        for (var i = 0; i < aoData.length; i++) {
          params.push({ name: aoData[i].name, value: aoData[i].value });
        }
        var hasLen = false;
        for (var j = 0; j < params.length; j++) {
          if (params[j].name === "iDisplayLength") {
            params[j].value = "9999";
            hasLen = true;
          }
          if (params[j].name === "iDisplayStart") {
            params[j].value = "0";
          }
        }
        if (!hasLen) params.push({ name: "iDisplayLength", value: "9999" });
        var body = params.map(function(p) {
          return encodeURIComponent(p.name) + "=" + encodeURIComponent(p.value);
        }).join("&");
        var xhr = new XMLHttpRequest();
        xhr.open("POST", sSource, true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        xhr.timeout = 15e3;
        xhr.onload = function() {
          try {
            var data = JSON.parse(xhr.responseText);
            if (typeof kxkcHandleData === "function") data = kxkcHandleData(data);
            callback(data && data.aaData ? data.aaData : []);
          } catch (e) {
            callback([]);
          }
        };
        xhr.onerror = function() {
          callback([]);
        };
        xhr.send(body);
      }
      function installSort(dt) {
        var os;
        try {
          os = dt.fnSettings();
        } catch (e) {
          return false;
        }
        if (!os || !os.oFeatures || !os.oFeatures.bServerSide) return false;
        var origFn = os.fnServerData;
        function gpv(arr, name) {
          for (var i = 0; i < arr.length; i++) {
            if (arr[i].name === name) return arr[i].value;
          }
          return null;
        }
        os.fnServerData = function(sSource, aoData, fnCallback) {
          var curUrl = sSource;
          if (sortedCache && curUrl === lastUrl) {
            var start = parseInt(gpv(aoData, "iDisplayStart"), 10) || 0;
            var len = parseInt(gpv(aoData, "iDisplayLength"), 10) || 15;
            var echo = gpv(aoData, "sEcho");
            var page = sortedCache.slice(start, start + len);
            fnCallback({
              sEcho: echo,
              iTotalRecords: sortedCache.length,
              iTotalDisplayRecords: sortedCache.length,
              aaData: page
            });
          } else if (!fetchingAll) {
            sortedCache = null;
            lastUrl = curUrl;
            fetchingAll = true;
            showStatus("正在加载全部课程…", "#fffaf0");
            origFn.call(this, sSource, aoData, fnCallback);
            fetchAllData(sSource, aoData, function(allData) {
              sortedCache = sortRows(allData);
              fetchingAll = false;
              var avail = 0;
              for (var i = 0; i < sortedCache.length; i++) {
                var c = sortedCache[i].ctsm;
                var s = c ? String(c).trim() : "";
                if (!s || s === "&nbsp;") avail++;
              }
              showStatus("已排序：" + avail + " 门可选 ↑   " + (sortedCache.length - avail) + " 门冲突 ↓");
              dt.fnDraw();
            });
          } else {
            origFn.call(this, sSource, aoData, fnCallback);
          }
        };
        return true;
      }
      function tryInstallOnCurrent() {
        if (typeof jQuery === "undefined" || !jQuery.fn.dataTable) return false;
        var dt;
        try {
          dt = jQuery("#dataView").dataTable();
        } catch (e) {
          return false;
        }
        if (!dt || !dt.fnSettings) return false;
        var os = dt.fnSettings();
        if (!os || !os.oFeatures || !os.oFeatures.bServerSide) return false;
        if (os.fnServerData.toString().indexOf("sortedCache") > -1) return true;
        if (installSort(dt)) {
          dt.fnDraw();
          return true;
        }
        return false;
      }
      function pollAndInstall() {
        polling++;
        if (tryInstallOnCurrent()) {
          console.log("[北林教务] 选课排序已安装");
          return;
        }
        if (polling < MAX_POLL) setTimeout(pollAndInstall, 250);
      }
      function startObserver() {
        var target = document.getElementById("mainDiv") || document.querySelector("#dataView") || document.body;
        var observeTarget = document.body;
        if (target && target !== document.body) {
          var p = target.parentNode;
          while (p && p !== document.body) {
            if (p.parentNode === document.body) {
              observeTarget = p;
              break;
            }
            p = p.parentNode;
          }
        }
        var observer = new MutationObserver(function(mutations) {
          for (var i = 0; i < mutations.length; i++) {
            var added = mutations[i].addedNodes;
            for (var j = 0; j < added.length; j++) {
              var node = added[j];
              if (node.nodeType !== 1) continue;
              if (node.id === "dataView" || node.querySelector && node.querySelector("#dataView")) {
                sortedCache = null;
                fetchingAll = false;
                lastUrl = "";
                polling = 0;
                console.log("[北林教务] 检测到表格重建，重新安装排序");
                setTimeout(pollAndInstall, 200);
                return;
              }
            }
          }
        });
        observer.observe(observeTarget, { childList: true, subtree: true });
        console.log("[北林教务] MutationObserver 已启动，监控容器：" + (observeTarget.id || observeTarget.tagName));
      }
      var qkl = window.queryKxkcList;
      if (qkl && !window._bjfu_qkl_hooked) {
        window._bjfu_qkl_hooked = true;
        window.queryKxkcList = function() {
          sortedCache = null;
          fetchingAll = false;
          lastUrl = "";
          polling = 0;
          var ret = qkl.apply(this, arguments);
          setTimeout(pollAndInstall, 200);
          return ret;
        };
        console.log("[北林教务] queryKxkcList 已拦截");
      }
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function() {
          setTimeout(pollAndInstall, 400);
          startObserver();
        });
      } else {
        setTimeout(pollAndInstall, 400);
        startObserver();
      }
    } + ")();";
    if (document.body) {
      document.body.appendChild(script);
    } else {
      document.addEventListener("DOMContentLoaded", function() {
        document.body.appendChild(script);
      });
    }
  }

  // src/captcha/index.js
  function initCaptcha() {
    var captchaImg = document.getElementById("SafeCodeImg");
    if (!captchaImg) return;
    var AUTO_LOGIN = {
      username: "",
      password: "",
      autoLogin: false
    };
    var CAPTCHA_W = 62;
    var CAPTCHA_H = 22;
    var RGB_THRES = 150;
    var CHAR_MAP = {
      "1": "111100111110000111110000111111100111111100111111100111111100111111100111111100111111100111110000001110000001",
      "2": "100000111000000011111111001111111001111111001111110011111000111110011111100111111001111111000000001000000001",
      "3": "100000111000000011111110001111111001111110011110000111110000011111110001111111001111110001100000011100000111",
      "b": "001111111001111111001111111001000011000000001000111000001111100001111100001111100000111000000000001001000011",
      "c": "111111111111111111111111111110000011100000011000111111001111111001111111001111111000111111100000011110000011",
      "m": "111111111111111111111111111001000011000000000000111000001111001001111001001111001001111001001111001001111001",
      "n": "111111111111111111111111111001100001001000000000011100000111100001111100001111100001111100001111100001111100",
      "v": "111111111111111111111111111111111011001110011001110011001110011100100111100100111100100111110001111110001111",
      "x": "111111111111111111111111111001110011001110011100100111110001111110001111110001111100100111001110011001110011",
      "z": "111111111111111111111111111000000011000000011111100111111001111110011111100111111001111111000000011000000011"
    };
    function getLogger() {
      if (window.__BJFU_LOGGER__) return window.__BJFU_LOGGER__;
      return {
        info: function(m) {
          console.log("[北林教务] " + m);
        },
        warn: function(m) {
          console.warn("[北林教务] " + m);
        },
        error: function(m) {
          console.error("[北林教务] " + m);
        },
        debug: function() {
        }
      };
    }
    function binaryImage(ctx) {
      var imageData = ctx.getImageData(0, 0, CAPTCHA_W, CAPTCHA_H).data;
      var imgArr = [];
      for (var x = 0; x < CAPTCHA_W; ++x) {
        for (var y = 0; y < CAPTCHA_H; ++y) {
          if (!imgArr[y]) imgArr[y] = [];
          if (x === 0 || y === 0 || x === CAPTCHA_W - 1 || y === CAPTCHA_H - 1) {
            imgArr[y][x] = 1;
            continue;
          }
          var i = (y * CAPTCHA_W + x) * 4;
          if (imageData[i] < RGB_THRES && imageData[i + 1] < RGB_THRES && imageData[i + 2] < RGB_THRES) {
            imgArr[y][x] = 0;
          } else {
            imgArr[y][x] = 1;
          }
        }
      }
      return imgArr;
    }
    function removeNoise(imgArr) {
      var yCount = imgArr.length;
      var xCount = imgArr[0].length;
      for (var i = 1; i < yCount - 1; ++i) {
        for (var k = 1; k < xCount - 1; ++k) {
          if (imgArr[i][k] === 0) {
            var bgNeighbors = imgArr[i][k - 1] + imgArr[i][k + 1] + imgArr[i - 1][k] + imgArr[i + 1][k];
            if (bgNeighbors > 2) imgArr[i][k] = 1;
          }
        }
      }
      return imgArr;
    }
    function cutChars(imgArr, cutsX, cutsY, n) {
      var result = [];
      for (var i = 0; i < n; ++i) {
        var charImg = [];
        for (var j = cutsY[i][0]; j < cutsY[i][1]; ++j) {
          if (!charImg[j - cutsY[i][0]]) charImg[j - cutsY[i][0]] = [];
          for (var k = cutsX[i][0]; k < cutsX[i][1]; ++k) {
            charImg[j - cutsY[i][0]][k - cutsX[i][0]] = imgArr[j][k];
          }
        }
        result.push(charImg);
      }
      return result;
    }
    function imgToString(imgArr) {
      var s = "";
      imgArr.forEach(function(row) {
        row.forEach(function(v) {
          s += v;
        });
      });
      return s;
    }
    function matchChar(charImg) {
      var maxScore = 0;
      var bestChar = "?";
      var targetStr = imgToString(charImg);
      var totalPixels = targetStr.length;
      for (var ch in CHAR_MAP) {
        var template = CHAR_MAP[ch];
        var score = 0;
        for (var i = 0; i < totalPixels; ++i) {
          if (targetStr[i] === template[i]) ++score;
        }
        if (score > maxScore) {
          maxScore = score;
          bestChar = ch;
        }
      }
      return { char: bestChar, confidence: maxScore / totalPixels };
    }
    function recognize(img) {
      var canvas = document.createElement("canvas");
      canvas.width = CAPTCHA_W;
      canvas.height = CAPTCHA_H;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      var imgArr = binaryImage(ctx);
      imgArr = removeNoise(imgArr);
      var charCutsX = [[4, 13], [14, 23], [24, 33], [34, 43]];
      var charCutsY = [[4, 16], [4, 16], [4, 16], [4, 16]];
      var charImgs = cutChars(imgArr, charCutsX, charCutsY, 4);
      var result = "";
      var confidences = [];
      charImgs.forEach(function(ci) {
        var m = matchChar(ci);
        result += m.char;
        confidences.push(m.confidence);
      });
      var avgConf = confidences.reduce(function(a, b) {
        return a + b;
      }, 0) / confidences.length;
      return { code: result, confidence: avgConf };
    }
    function showToast(msg) {
      var toast = document.createElement("div");
      toast.textContent = msg;
      toast.style.cssText = "position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.72);color:#fff;padding:6px 18px;border-radius:6px;font-size:12px;z-index:100000;font-family:-apple-system,BlinkMacSystemFont,sans-serif;pointer-events:none;opacity:0;transition:opacity 0.3s;";
      document.body.appendChild(toast);
      requestAnimationFrame(function() {
        toast.style.opacity = "1";
        setTimeout(function() {
          toast.style.opacity = "0";
          setTimeout(function() {
            toast.remove();
          }, 350);
        }, 1800);
      });
    }
    function doAutoFill() {
      var img = document.getElementById("SafeCodeImg");
      if (!img || !img.complete || img.naturalWidth === 0) return;
      var logger = getLogger();
      var result = recognize(img);
      var codeInput = document.getElementById("RANDOMCODE");
      if (codeInput) codeInput.value = result.code;
      showToast("北林教务增强助手：验证码识别成功");
      if (AUTO_LOGIN.username) {
        var userInput = document.getElementById("userAccount");
        if (userInput && !userInput.value) userInput.value = AUTO_LOGIN.username;
      }
      if (AUTO_LOGIN.password) {
        var passInput = document.getElementById("userPassword");
        if (passInput && !passInput.value) passInput.value = AUTO_LOGIN.password;
      }
      logger.info("[验证码] 识别结果: " + result.code + " (置信度 " + (result.confidence * 100).toFixed(0) + "%)");
      if (AUTO_LOGIN.autoLogin && AUTO_LOGIN.username && AUTO_LOGIN.password) {
        if (result.confidence > 0.6) {
          logger.info("[验证码] 置信度达标，自动登录...");
          setTimeout(function() {
            var loginBtn = document.getElementById("btnSubmit");
            if (loginBtn) loginBtn.click();
          }, 200);
        } else {
          logger.warn("[验证码] 置信度过低 (" + (result.confidence * 100).toFixed(0) + "%)，跳过自动登录，请手动确认");
        }
      }
    }
    function setupListeners() {
      var img = document.getElementById("SafeCodeImg");
      if (!img) return;
      img.addEventListener("load", function() {
        setTimeout(doAutoFill, 80);
      });
      if (img.complete && img.naturalWidth > 0) {
        setTimeout(doAutoFill, 120);
      } else {
        img.src = img.src;
      }
    }
    function setupRefreshHook() {
      var refreshBtn = document.getElementById("btnTest");
      if (!refreshBtn) return;
      var originalReShow = window.ReShowCode;
      if (originalReShow && !window._bjfu_captcha_hooked) {
        window._bjfu_captcha_hooked = true;
        window.ReShowCode = function() {
          originalReShow.apply(this, arguments);
          var img = document.getElementById("SafeCodeImg");
          if (img) {
            img.addEventListener("load", function handler() {
              setTimeout(doAutoFill, 80);
              img.removeEventListener("load", handler);
            });
          }
        };
      }
      refreshBtn.addEventListener("click", function() {
        setTimeout(function() {
          var img = document.getElementById("SafeCodeImg");
          if (img) {
            img.addEventListener("load", function handler() {
              setTimeout(doAutoFill, 80);
              img.removeEventListener("load", handler);
            });
          }
        }, 50);
      });
    }
    function init() {
      setupListeners();
      setupRefreshHook();
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function() {
        setTimeout(init, 150);
      });
    } else {
      setTimeout(init, 150);
    }
  }

  // src/main.js
  (function() {
    "use strict";
    function runAll() {
      initCore();
      initEval();
      initCourseSort();
      initCaptcha();
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runAll);
    } else {
      runAll();
    }
  })();
})();
