/**
 * 日志面板 UI 系统
 * 这是一个右下角的悬浮面板，用于实时展示脚本运行状态，取代了侵入式的 Toast 弹窗。
 */
export const LogPanelUI = {
    container: null,
    body: null,
    initialized: false,
    queue: [],
    _statusQueue: [],
    _statusPlaying: false,

    init() {
        if (this.initialized || !document.body) return;

        const style = document.createElement('style');
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

        this.container = document.createElement('div');
        this.container.id = 'bjfu-enhance-log';
        this.container.className = 'minimized';
        this.container.innerHTML = `
            <div id="bjfu-enhance-log-hd">
                <b><span id="nel-status-text">北林教务增强助手 V1</span></b>
                <span id="nel-clear-btn" class="nel-btn nel-clear" title="清空日志">清空</span>
                <span id="bjfu-log-toggle" class="nel-btn">展开 ▴</span>
            </div>
            <div id="bjfu-enhance-log-body"></div>
        `;
        document.body.appendChild(this.container);
        this.body = this.container.querySelector('#bjfu-enhance-log-body');

        this.initialized = true;

        this.container.querySelector('#bjfu-enhance-log-hd').onclick = (e) => {
            if (e.target.id === 'nel-clear-btn') return;
            const isMin = this.container.classList.toggle('minimized');
            this.container.querySelector('#bjfu-log-toggle').textContent = isMin ? '展开 ▴' : '折叠 ▾';
        };

        this.container.querySelector('#nel-clear-btn').onclick = (e) => {
            e.stopPropagation();
            if (this.body) this.body.innerHTML = '';
            const statusText = this.container.querySelector('#nel-status-text');
            if (statusText) statusText.textContent = '日志已清空';
            this._statusQueue = [];
            this._statusPlaying = false;
        };

        if (this.queue.length > 0) {
            this.queue.forEach(item => this.add(item.level, item.msg));
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

        const labels = { error: '[ERR]', warn: '[WRN]', success: '[OK ]', info: '[INF]', debug: '[DBG]' };
        const lvlLabel = labels[level] || '[INF]';
        const ts = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const line = document.createElement('div');
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
            const statusText = this.container && this.container.querySelector('#nel-status-text');
            if (statusText) {
                statusText.textContent = '北林教务增强助手 V1';
                statusText.style.color = '#2d3748';
            }
            return;
        }
        this._statusPlaying = true;
        const { msg, level } = this._statusQueue.shift();
        const statusText = this.container && this.container.querySelector('#nel-status-text');
        if (statusText) {
            const colors = { error: '#e53e3e', warn: '#dd6b20', success: '#38a169', info: '#3182ce', debug: '#718096' };
            statusText.textContent = msg;
            statusText.style.color = colors[level] || '#2d3748';
        }
        setTimeout(() => { this._playStatusQueue(); }, 300);
    },

    esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
};
