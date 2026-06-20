import { DEBUG_CONFIG } from '../config/constants.js';
import { LogPanelUI } from './log-panel-ui.js';
import { Logger } from './logger.js';
import { initializePromoBanner } from './promo-banner.js';
import { checkQiangzhiPage } from './page-guard.js';
import { createCreditSummaryWindow } from './credit-stats.js';
import { processAllTables } from './table-enhancer.js';
import { autoRefreshLoginStatus, checkLoginErrorAndRefresh } from './session-keeper.js';

function initializeLogging() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeLogging);
        return;
    }
    setTimeout(() => {
        try {
            Logger.info('北林教务增强助手已启动', {
                debug: DEBUG_CONFIG.enabled ? `Level ${DEBUG_CONFIG.level}` : '关闭'
            });
        } catch (e) {
            console.error('初始化日志失败: ', e);
        }
    }, 100);
}

function setupMutationObserver() {
    let isProcessing = false;
    const observer = new MutationObserver((mutations) => {
        try {
            if (isProcessing) return;

            const hasRelevantChanges = mutations.some(mutation => {
                try {
                    if (mutation.type !== 'childList') return false;
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== Node.ELEMENT_NODE) continue;
                        if (node.hasAttribute &&
                            node.hasAttribute('data-title-inserted')) {
                            return false;
                        }
                        if (node.tagName === 'TABLE' || node.tagName === 'TR' || node.tagName === 'TD') {
                            return true;
                        }
                    }
                    return false;
                } catch (e) {
                    Logger.warn('检查页面变化时出错:', e);
                    return false;
                }
            });

            if (hasRelevantChanges && !checkQiangzhiPage()) {
                isProcessing = true;
                try {
                    processAllTables();
                } catch (e) {
                    Logger.error('重新处理表格失败:', e);
                } finally {
                    setTimeout(() => { isProcessing = false; }, 100);
                }
            }
        } catch (e) {
            Logger.error('MutationObserver 回调执行失败:', e);
            isProcessing = false;
        }
    });

    try {
        observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {
        Logger.error('启动页面变化监听器失败:', e);
    }
}

export function initCore() {
    'use strict';

    LogPanelUI.init();
    initializeLogging();
    initializePromoBanner();

    if (checkQiangzhiPage()) {
        Logger.info('强智科技页面检测完成，脚本退出');
        return;
    }

    autoRefreshLoginStatus();
    checkLoginErrorAndRefresh();

    Logger.info('开始处理页面');

    if (window.location.pathname.includes('/jsxsd/kscj/cjcx_list')) {
        createCreditSummaryWindow();
    }

    processAllTables();
    setupMutationObserver();

    Logger.info('北林教务增强助手加载成功！');
}

// 暴露 Logger 到全局，供其他模块使用
window.__BJFU_LOGGER__ = Logger;

export { Logger };
