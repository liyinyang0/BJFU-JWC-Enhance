import { Logger } from './logger.js';

/**
 * 检测登录错误页面并刷新
 */
export function checkLoginErrorAndRefresh() {
    try {
        const pageTitle = document.title || '';
        const pageContent = document.body ? document.body.textContent : '';
        const isLoginError = pageTitle.includes('出错页面') &&
            (pageContent.includes('您登录后过长时间没有操作') ||
                pageContent.includes('您的用户名已经在别处登录') ||
                pageContent.includes('请重新输入帐号，密码后，继续操作'));

        if (isLoginError) {
            Logger.warn('检测到登录超时或重复登录错误页面，正在自动刷新...');
            performLoginRefresh(true);
            return true;
        }
        return false;
    } catch (e) {
        Logger.error('检测登录错误页面失败:', e);
        return false;
    }
}

/**
 * 执行静默登录刷新
 */
export function performLoginRefresh(forceRefresh = false) {
    const currentUrl = window.location.href;
    try {
        let baseUrl;
        if (currentUrl.includes('jsxsd/')) {
            baseUrl = currentUrl.substring(0, currentUrl.indexOf('jsxsd/'));
        } else {
            const urlObj = new URL(currentUrl);
            baseUrl = `${urlObj.protocol}//${urlObj.host}/`;
        }
        const refreshUrl = baseUrl + 'jsxsd/pyfa/kcdgxz';
        Logger.info('使用隐藏 iframe 刷新登录状态:', refreshUrl);

        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;visibility:hidden;border:none;';
        iframe.src = refreshUrl;

        iframe.onload = () => {
            Logger.info('登录状态刷新请求完成');
            setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 1000);
        };
        iframe.onerror = () => {
            Logger.warn('登录状态刷新请求失败');
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            if (forceRefresh) Logger.error('登录状态刷新失败，请手动重新点击选课中心 - 课程总库');
        };

        document.body.appendChild(iframe);
        setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 10000);
    } catch (e) {
        Logger.error('自动刷新登录状态失败:', e);
    }
}

/**
 * 定时自动保活逻辑
 */
export function autoRefreshLoginStatus() {
    try {
        const currentUrl = window.location.href;
        if (!currentUrl.includes('jsxsd/framework/xsMain.jsp')) return;

        const lastRefreshKey = 'bjfu_last_login_refresh';
        const lastRefreshTime = localStorage.getItem(lastRefreshKey);
        const now = Date.now();
        const refreshInterval = 5 * 60 * 1000;

        if (lastRefreshTime && (now - parseInt(lastRefreshTime)) < refreshInterval) {
            Logger.debug('距上次刷新不足5分钟，跳过');
            return;
        }

        localStorage.setItem(lastRefreshKey, now.toString());

        if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('bjfu_login_refresh');
            bc.postMessage({ type: 'refreshing', ts: now });
            bc.close();
        }

        Logger.info('检测到主框架页面，开始刷新登录状态');
        performLoginRefresh(false);
    } catch (e) {
        Logger.error('自动刷新登录状态检查失败:', e);
    }
}
