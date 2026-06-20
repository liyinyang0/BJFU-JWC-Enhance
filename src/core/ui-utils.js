import { PROJECT_URL } from '../config/constants.js';

// 当前活动弹窗的清理函数；弹窗为单例，新建/关闭时用于回收 document 级监听器，防止泄漏
let activeModalCleanup = null;

/**
 * 统一弹窗
 */
export function createUnifiedModal(title, content, type = 'info') {
    // 关闭上一个弹窗并回收其 document 监听器（单例 + 防泄漏）
    if (activeModalCleanup) {
        activeModalCleanup();
        activeModalCleanup = null;
    }
    const existingModal = document.getElementById('bjfuAssistantModal');
    if (existingModal) existingModal.remove();

    const container = document.createElement('div');
    container.id = 'bjfuAssistantModal';

    const themeConfig = {
        warning: { accent: '#FF9500', accentLight: 'rgba(255,149,0,0.12)' },
        success: { accent: '#34C759', accentLight: 'rgba(52,199,89,0.12)' },
        info: { accent: '#007AFF', accentLight: 'rgba(0,122,255,0.12)' }
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

    if (!document.getElementById('bjfuAssistantStyles')) {
        const style = document.createElement('style');
        style.id = 'bjfuAssistantStyles';
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

    const closeBtn = container.querySelector('#closeModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', close);
    }

    return container;
}

/**
 * 拖动功能
 */
export function addDragFunctionality(container) {
    let isDragging = false;
    let mouseStartX, mouseStartY, elemStartX, elemStartY;

    const dragHandle = container.querySelector('#dragHandle');

    function dragStart(e) {
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
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
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const newLeft = elemStartX + (clientX - mouseStartX);
        const newTop = elemStartY + (clientY - mouseStartY);
        container.style.transform = 'none';
        container.style.left = newLeft + 'px';
        container.style.top = newTop + 'px';
        container.style.margin = '0';
    }

    function dragEnd() { isDragging = false; }

    dragHandle.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    dragHandle.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', dragEnd, { passive: false });

    // 返回清理函数：回收挂在 document 上的拖拽监听器，避免反复开关弹窗造成累积泄漏
    return function cleanup() {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', dragEnd);
    };
}
