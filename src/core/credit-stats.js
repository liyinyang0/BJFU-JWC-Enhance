import { Logger } from './logger.js';
import { PROJECT_URL } from '../config/constants.js';

function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 学分统计悬浮窗
 */
export function createCreditSummaryWindow() {
    try {
        const container = document.createElement('div');
        container.id = 'creditSummaryWindow';
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
        const dragHandle = container.querySelector('#creditDragHandle');

        if (dragHandle) {
            const dragStart = (e) => {
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
            };
            const drag = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
                container.style.right = 'auto';
                container.style.left = (elemStartX + clientX - mouseStartX) + 'px';
                container.style.top = (elemStartY + clientY - mouseStartY) + 'px';
            };
            const dragEnd = () => { isDragging = false; };

            dragHandle.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
            dragHandle.addEventListener('touchstart', dragStart, { passive: false });
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('touchend', dragEnd, { passive: false });

            // 记录清理函数：关闭窗口时回收 document 级监听器，防止泄漏
            cleanupDrag = function () {
                document.removeEventListener('mousemove', drag);
                document.removeEventListener('mouseup', dragEnd);
                document.removeEventListener('touchmove', drag);
                document.removeEventListener('touchend', dragEnd);
            };
        }

        document.body.appendChild(container);

        const creditCloseBtn = container.querySelector('#creditCloseBtn');
        if (creditCloseBtn) {
            creditCloseBtn.addEventListener('click', () => {
                if (cleanupDrag) cleanupDrag();
                container.remove();
            });
            creditCloseBtn.addEventListener('mouseenter', () => creditCloseBtn.style.backgroundColor = '#e0e0e0');
            creditCloseBtn.addEventListener('mouseleave', () => creditCloseBtn.style.backgroundColor = 'transparent');
        }

        Logger.debug('学分统计弹窗创建完成');
        return container;
    } catch (e) {
        Logger.error('创建学分统计弹窗失败:', e);
        return null;
    }
}

/**
 * 学分统计更新
 */
export function updateCreditSummary() {
    try {
        const creditSummaryDiv = document.getElementById('creditSummary');
        if (!creditSummaryDiv) { Logger.warn('未找到学分统计容器'); return; }

        const creditsByType = {};
        const tables = document.querySelectorAll('table');

        tables.forEach(table => {
            table.querySelectorAll('tr').forEach(row => {
                const tds = row.querySelectorAll('td');
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

        creditSummaryDiv.innerHTML = summaryHTML || '暂无数据';
        Logger.debug('学分统计更新完成');
    } catch (e) {
        Logger.error('更新学分统计失败:', e);
        const el = document.getElementById('creditSummary');
        if (el) el.innerHTML = '<div style="color:#dc3545;padding:10px;text-align:center;">❌ 学分统计更新失败</div>';
    }
}
