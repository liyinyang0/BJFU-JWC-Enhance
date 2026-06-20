import { PROJECT_URL } from '../config/constants.js';

/**
 * 课程推荐提示
 */
export function showPromoBanner() {
    if (document.getElementById('bjfu-promo-line')) return;

    let insertTarget = null;
    let isLoginPage = false;

    const footer = document.getElementById('Footer1_divCopyright');
    if (footer) {
        insertTarget = footer;
    }

    if (!insertTarget) {
        const copyrightLink = document.querySelector('a.copyright[href*="qzdatasoft"]');
        if (copyrightLink && copyrightLink.parentElement && copyrightLink.parentElement.tagName === 'TD') {
            insertTarget = copyrightLink.parentElement;
            isLoginPage = true;
        }
    }

    if (!insertTarget) return;

    const promoLine = document.createElement('div');
    promoLine.id = 'bjfu-promo-line';
    if (!isLoginPage) {
        promoLine.className = 'Nsb_pw';
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

export function initializePromoBanner() {
    const tryShow = () => {
        if (document.getElementById('bjfu-promo-line')) return true;

        const footer = document.getElementById('Footer1_divCopyright');
        const copyrightLink = document.querySelector('a.copyright[href*="qzdatasoft"]');

        if (footer || (copyrightLink && copyrightLink.parentElement)) {
            showPromoBanner();
            return true;
        }
        return false;
    };

    const hideUnusedElements = () => {
        const uselessImg = document.querySelector('img[src*="appewm.png"]');
        if (uselessImg) {
            uselessImg.style.display = 'none';
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

    setTimeout(() => observer.disconnect(), 5000);
}
